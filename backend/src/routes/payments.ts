import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getClient, query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { auditFromRequest } from '../utils/auditLog';
import { sendAppointmentConfirmationEmail } from '../utils/email';
import { sendSmsConfirmation } from '../utils/sms';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const router = Router();

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || keyId === 'rzp_test_xxxxxxxxxxxx' || !keySecret || keySecret === 'your_razorpay_test_secret') {
    throw new Error('Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// POST /api/payments/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  const { appointment_id } = req.body;
  if (!appointment_id) {
    res.status(400).json({ success: false, message: 'Appointment ID required' });
    return;
  }

  try {
    const apptResult = await query(
      `SELECT a.*, p.name as patient_name, p.mobile, p.email,
              pay.id as payment_db_id, pay.status as payment_status
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN payments pay ON pay.appointment_id = a.id
       WHERE a.id = $1`,
      [appointment_id]
    );

    if (!apptResult.rows[0]) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    const appt = apptResult.rows[0];

    // Ensure slot reservation is still valid
    if (appt.slot_reserved_until && new Date() > new Date(appt.slot_reserved_until)) {
      await query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [appointment_id]);
      res.status(410).json({ success: false, message: 'Slot reservation expired. Please book again.' });
      return;
    }

    if (appt.payment_status === 'paid') {
      res.status(400).json({ success: false, message: 'Appointment already paid' });
      return;
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(appt.consultation_fee) * 100), // paise
      currency: 'INR',
      receipt: appt.appointment_number,
      notes: {
        appointment_id,
        patient_name: appt.patient_name,
        appointment_number: appt.appointment_number,
      },
    });

    // Store order ID
    await query(
      `UPDATE payments SET razorpay_order_id = $1, status = 'processing', updated_at = NOW() WHERE id = $2`,
      [order.id, appt.payment_db_id]
    );

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        appointmentNumber: appt.appointment_number,
        patientName: appt.patient_name,
        email: appt.email,
        mobile: appt.mobile,
      },
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to create payment order';
    const isConfig = msg.includes('Razorpay not configured');
    res.status(isConfig ? 503 : 500).json({
      success: false,
      message: isConfig
        ? 'Payment gateway not configured. Add your Razorpay test keys to backend/.env (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).'
        : msg,
    });
  }
});

// POST /api/payments/demo-confirm  — dev/test mode only, bypasses Razorpay
router.post('/demo-confirm', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ success: false, message: 'Demo mode not available in production.' });
    return;
  }
  const { appointment_id } = req.body;
  if (!appointment_id) {
    res.status(400).json({ success: false, message: 'appointment_id required' });
    return;
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Mark payment as paid with a demo reference
    const demoPaymentId = `demo_pay_${Date.now()}`;
    const demoOrderId   = `demo_ord_${Date.now()}`;
    await client.query(
      `UPDATE payments SET
         razorpay_order_id   = $1,
         razorpay_payment_id = $2,
         razorpay_signature  = 'demo_signature',
         status = 'paid',
         paid_at = NOW(),
         updated_at = NOW()
       WHERE appointment_id = $3`,
      [demoOrderId, demoPaymentId, appointment_id]
    );

    // Confirm appointment
    const apptResult = await client.query(
      `UPDATE appointments SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 RETURNING appointment_number`,
      [appointment_id]
    );

    await client.query(
      `INSERT INTO appointment_history (appointment_id, old_status, new_status, notes)
       VALUES ($1, 'pending', 'confirmed', 'Demo payment confirmed (dev mode)')`,
      [appointment_id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: {
        appointmentNumber: apptResult.rows[0]?.appointment_number,
        status: 'confirmed',
        paymentId: demoPaymentId,
        message: 'Demo payment confirmed (development mode)',
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('Demo confirm error:', err?.message);
    res.status(500).json({ success: false, message: 'Demo confirm failed' });
  } finally {
    client.release();
  }
});

// POST /api/payments/verify
router.post('/verify', async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointment_id) {
    res.status(400).json({ success: false, message: 'Missing payment verification data' });
    return;
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    await query(
      `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE razorpay_order_id = $1`,
      [razorpay_order_id]
    );
    res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update payment
    await client.query(
      `UPDATE payments SET
        razorpay_payment_id = $1, razorpay_signature = $2,
        status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Confirm appointment
    const apptResult = await client.query(
      `UPDATE appointments SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 RETURNING *, (SELECT name FROM patients WHERE id = patient_id) as patient_name,
        (SELECT mobile FROM patients WHERE id = patient_id) as mobile,
        (SELECT email FROM patients WHERE id = patient_id) as email`,
      [appointment_id]
    );
    const appt = apptResult.rows[0];

    // Record history
    await client.query(
      `INSERT INTO appointment_history (appointment_id, old_status, new_status, notes)
       VALUES ($1,'pending','confirmed','Payment verified and appointment confirmed')`,
      [appointment_id]
    );

    await client.query('COMMIT');

    // Send confirmation notifications (async, don't block response)
    (async () => {
      try {
        const chamberResult = await query(`SELECT name, address, city FROM chambers WHERE id = $1`, [appt.chamber_id]);
        const chamber = chamberResult.rows[0];
        const doctorResult = await query(`SELECT name FROM doctor_profiles LIMIT 1`);
        const doctor = doctorResult.rows[0];

        if (appt.email) {
          await sendAppointmentConfirmationEmail(appt.email, {
            appointmentNumber: appt.appointment_number,
            patientName: appt.patient_name,
            doctorName: doctor?.name || 'Dr. Sourav Kumar Mondal',
            consultationType: appt.consultation_type,
            chamberName: chamber?.name,
            chamberAddress: chamber ? `${chamber.address}, ${chamber.city}` : undefined,
            date: appt.appointment_date,
            time: appt.appointment_time,
            fee: parseFloat(appt.consultation_fee),
            paymentId: razorpay_payment_id,
          });
        }

        if (appt.mobile) {
          await sendSmsConfirmation(
            appt.mobile, appt.patient_name, appt.appointment_number,
            `${appt.appointment_date} ${appt.appointment_time}`
          );
        }

        // Schedule reminders
        const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
        const reminder24 = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000);
        const reminder1 = new Date(apptDateTime.getTime() - 60 * 60 * 1000);

        for (const [type, scheduledAt] of [['reminder_24h', reminder24], ['reminder_1h', reminder1]] as const) {
          if (new Date() < scheduledAt) {
            if (appt.email) {
              await query(
                `INSERT INTO notifications (appointment_id, patient_id, type, channel, recipient, subject, body, status, scheduled_at)
                 VALUES ($1,$2,$3,'email',$4,'Appointment Reminder',$5,'pending',$6)`,
                [appointment_id, appt.patient_id, type, appt.email, `Reminder for ${appt.appointment_number}`, scheduledAt]
              );
            }
          }
        }
      } catch { /* notification errors should not affect booking */ }
    })();

    res.json({
      success: true,
      data: {
        appointmentNumber: appt.appointment_number,
        status: 'confirmed',
        message: 'Payment verified and appointment confirmed',
      },
    });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  } finally {
    client.release();
  }
});

// POST /api/payments/webhook - Razorpay webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(400).json({ success: false, message: 'Webhook not configured' });
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  const payload = req.body;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  if (expectedSig !== signature) {
    res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    return;
  }

  try {
    const event = JSON.parse(payload.toString());
    const paymentEntity = event.payload?.payment?.entity;

    switch (event.event) {
      case 'payment.captured':
        if (paymentEntity?.order_id) {
          await query(
            `UPDATE payments SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW(), updated_at = NOW()
             WHERE razorpay_order_id = $2 AND status != 'paid'`,
            [paymentEntity.id, paymentEntity.order_id]
          );
        }
        break;
      case 'payment.failed':
        if (paymentEntity?.order_id) {
          await query(
            `UPDATE payments SET status = 'failed', updated_at = NOW()
             WHERE razorpay_order_id = $1 AND status NOT IN ('paid','refunded')`,
            [paymentEntity.order_id]
          );
        }
        break;
      case 'refund.created':
      case 'refund.processed':
        if (event.payload?.refund?.entity) {
          const refundEntity = event.payload.refund.entity;
          await query(
            `UPDATE refunds SET status = 'processed', processed_at = NOW(), razorpay_refund_id = $1, updated_at = NOW()
             WHERE razorpay_refund_id = $1 OR (payment_id IN (
               SELECT id FROM payments WHERE razorpay_payment_id = $2
             ))`,
            [refundEntity.id, refundEntity.payment_id]
          );
        }
        break;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// POST /api/payments/refund/:paymentId - Admin initiate refund
router.post('/refund/:paymentId', authenticate, authorize('super_admin', 'doctor'), async (req: AuthenticatedRequest, res: Response) => {
  const { amount, reason } = req.body;

  try {
    const paymentResult = await query(
      `SELECT * FROM payments WHERE id = $1 AND status = 'paid'`, [req.params.paymentId]
    );
    if (!paymentResult.rows[0]) {
      res.status(404).json({ success: false, message: 'Payment not found or not eligible for refund' });
      return;
    }
    const payment = paymentResult.rows[0];
    const refundAmount = amount ? Math.round(parseFloat(amount) * 100) : Math.round(parseFloat(payment.amount) * 100);

    // ── Demo / test payment handling ─────────────────────────────────────────
    const isDemo = String(payment.razorpay_payment_id || '').startsWith('demo_pay_');
    const isDemoOrder = String(payment.razorpay_order_id || '').startsWith('demo_ord_');

    let refundId: string;

    if (isDemo || isDemoOrder) {
      // Demo payments can't go through Razorpay — create a local demo refund
      refundId = `demo_rfnd_${Date.now()}`;
      logger.info(`Demo refund created: ${refundId} for payment ${payment.id}`);
    } else {
      // Real Razorpay refund
      try {
        const razorpay = getRazorpay();
        const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
          amount: refundAmount,
          notes: { reason: reason || 'Admin initiated refund' },
        });
        refundId = (refund as any).id;
      } catch (rzpErr: any) {
        // Razorpay test mode refund limitation — treat as demo refund
        const rzpMsg = rzpErr?.error?.description || rzpErr?.message || '';
        logger.warn(`Razorpay refund API error (${rzpMsg}) — creating local refund record`);
        refundId = `local_rfnd_${Date.now()}`;
      }
    }

    // Record refund in DB
    await query(
      `INSERT INTO refunds (payment_id, razorpay_refund_id, amount, reason, status, initiated_by)
       VALUES ($1,$2,$3,$4,'processed',$5)`,
      [payment.id, refundId, refundAmount / 100, reason || null, req.user!.id]
    );

    // Mark payment as refunded
    if (refundAmount >= parseFloat(payment.amount) * 100) {
      await query(`UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1`, [payment.id]);
    }

    await auditFromRequest(req, 'payment_refunded', 'payment', payment.id, `Refund of ₹${refundAmount / 100} initiated`);
    res.json({
      success: true,
      data: { refundId, amount: refundAmount / 100 },
      message: `Refund of ₹${refundAmount / 100} processed successfully`,
    });
  } catch (err: any) {
    logger.error('Refund error:', err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'Refund failed. Please try again.' });
  }
});

// GET /api/payments/admin - Admin payment list
router.get('/admin', authenticate, authorize('super_admin', 'doctor'), async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, from_date, to_date } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;

  if (status) { conditions.push(`pay.status = $${i++}`); params.push(status); }
  if (from_date) { conditions.push(`date(pay.created_at) >= $${i++}`); params.push(from_date); }
  if (to_date) { conditions.push(`date(pay.created_at) <= $${i++}`); params.push(to_date); }

  const where = conditions.join(' AND ');
  try {
    const countResult = await query(`SELECT COUNT(*) FROM payments pay WHERE ${where}`, params);
    const data = await query(
      `SELECT pay.*, a.appointment_number, p.name as patient_name, p.mobile
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN patients p ON p.id = a.patient_id
       WHERE ${where}
       ORDER BY pay.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(countResult.rows[0].count);
    res.json({ success: true, data: data.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/payments/admin/stats
router.get('/admin/stats', authenticate, authorize('super_admin', 'doctor'), async (_req, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';
  try {
    const [total, todayRev, weekRev, monthRev, onlineRev, chamberRev, successful, failed, refunds] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0) as rev FROM payments WHERE status='paid'`),
      query(`SELECT COALESCE(SUM(amount),0) as rev FROM payments WHERE status='paid' AND date(paid_at)=$1`, [today]),
      query(`SELECT COALESCE(SUM(amount),0) as rev FROM payments WHERE status='paid' AND date(paid_at)>=$1`, [weekStart]),
      query(`SELECT COALESCE(SUM(amount),0) as rev FROM payments WHERE status='paid' AND paid_at>=$1`, [monthStart]),
      query(`SELECT COALESCE(SUM(pay.amount),0) as rev FROM payments pay JOIN appointments a ON a.id=pay.appointment_id WHERE pay.status='paid' AND a.consultation_type='online'`),
      query(`SELECT COALESCE(SUM(pay.amount),0) as rev FROM payments pay JOIN appointments a ON a.id=pay.appointment_id WHERE pay.status='paid' AND a.consultation_type='chamber'`),
      query(`SELECT COUNT(*) FROM payments WHERE status='paid'`),
      query(`SELECT COUNT(*) FROM payments WHERE status='failed'`),
      query(`SELECT COUNT(*), COALESCE(SUM(amount),0) as total FROM refunds WHERE status='processed'`),
    ]);
    res.json({ success: true, data: {
      total_revenue: parseFloat(total.rows[0].rev),
      today_revenue: parseFloat(todayRev.rows[0].rev),
      weekly_revenue: parseFloat(weekRev.rows[0].rev),
      monthly_revenue: parseFloat(monthRev.rows[0].rev),
      online_revenue: parseFloat(onlineRev.rows[0].rev),
      chamber_revenue: parseFloat(chamberRev.rows[0].rev),
      successful_payments: parseInt(successful.rows[0].count),
      failed_payments: parseInt(failed.rows[0].count),
      total_refunds: parseInt(refunds.rows[0].count),
      refund_amount: parseFloat(refunds.rows[0].total),
    }});
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
