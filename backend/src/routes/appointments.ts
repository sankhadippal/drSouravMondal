import { Router, Request, Response } from 'express';
import { body, param, query as qv } from 'express-validator';
import { getClient, query, isPg } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { bookingLimiter } from '../middleware/rateLimiter';
import { auditFromRequest } from '../utils/auditLog';
import { generateAppointmentNumber } from '../utils/appointmentNumber';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

const router = Router();

// POST /api/appointments - Create (public, after OTP verify)
router.post('/', bookingLimiter, [
  body('patient.name').notEmpty().trim().withMessage('Patient name required'),
  body('patient.age').isInt({ min: 0, max: 150 }).withMessage('Valid age required'),
  body('patient.sex').isIn(['male', 'female', 'other']).withMessage('Sex required'),
  body('patient.mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile required'),
  body('patient.email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email required'),
  body('consultation_type').isIn(['online', 'chamber']).withMessage('Consultation type required'),
  body('appointment_date').isDate().withMessage('Valid date required'),
  body('appointment_time').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required'),
  body('otp_contact').notEmpty().withMessage('OTP contact required'),
  body('otp_channel').isIn(['mobile', 'email']).withMessage('OTP channel required'),
  validate,
], async (req: Request, res: Response) => {
  const { patient, consultation_type, chamber_id, appointment_date, appointment_time, reason, notes, otp_contact, otp_channel } = req.body;

  // ── UUID guard: reject stale SQLite-era IDs immediately ───────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (consultation_type === 'chamber' && chamber_id && !UUID_RE.test(chamber_id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid chamber ID. Please go back and re-select a chamber — your session data was outdated.',
    });
    return;
  }

  // OTP was verified in the previous step — just confirm contact was provided
  // The actual OTP verification happened via /api/otp/verify before this call
  if (!otp_contact || !otp_channel) {
    res.status(400).json({ success: false, message: 'OTP contact required' });
    return;
  }
  // Secondary check: look for any OTP (verified or recent) for this contact in last 2 hours
  const otpCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const otpResult = await query(
    `SELECT id FROM otp_verifications
     WHERE contact = $1 AND purpose = 'appointment_booking'
       AND created_at > $2
     ORDER BY created_at DESC LIMIT 1`,
    [otp_contact, otpCutoff]
  );
  if (!otpResult.rows[0]) {
    res.status(400).json({ success: false, message: 'Session expired. Please verify your OTP again.' });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Validate chamber_id is a proper UUID if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (consultation_type === 'chamber' && chamber_id && !uuidRegex.test(chamber_id)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Invalid chamber ID. Please go back and select a chamber again.',
      });
      return;
    }

    // Re-check slot availability with lock
    if (consultation_type === 'chamber' && chamber_id) {
      const conflict = await client.query(
        `SELECT id FROM appointments
         WHERE chamber_id = $1 AND appointment_date = $2 AND appointment_time = $3
           AND status NOT IN ('cancelled','rescheduled')
         FOR UPDATE`,
        [chamber_id, appointment_date, appointment_time]
      );
      if (conflict.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ success: false, message: 'This slot has just been booked. Please select another slot.' });
        return;
      }
    }

    // Get fee
    let fee = 0;
    // Compute day-of-week in JS (0=Sun...6=Sat) — avoids EXTRACT(DOW) compatibility issue
    const dayOfWeek = new Date(appointment_date + 'T00:00:00').getDay();
    if (consultation_type === 'chamber' && chamber_id) {
      const schedResult = await client.query(
        `SELECT COALESCE(cs.consultation_fee, c.consultation_fee) as fee
         FROM chamber_schedules cs
         JOIN chambers c ON c.id = cs.chamber_id
         WHERE cs.chamber_id = $1 AND cs.day_of_week = $2`,
        [chamber_id, dayOfWeek]
      );
      fee = parseFloat(schedResult.rows[0]?.fee || 300);
    } else {
      const docResult = await client.query(`SELECT online_consultation_fee FROM doctor_profiles LIMIT 1`);
      fee = parseFloat(docResult.rows[0]?.online_consultation_fee || 300);
    }

    // Get slot duration for end time
    let slotDuration = 15;
    if (consultation_type === 'chamber' && chamber_id) {
      const dur = await client.query(
        `SELECT slot_duration_minutes FROM chamber_schedules WHERE chamber_id = $1 AND day_of_week = $2`,
        [chamber_id, dayOfWeek]
      );
      slotDuration = dur.rows[0]?.slot_duration_minutes || 15;
    }

    const [h, m] = appointment_time.split(':').map(Number);
    const endMinutes = h * 60 + m + slotDuration;
    const slotEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Upsert patient
    let patientId: string;
    const existingPatient = await client.query(
      `SELECT id FROM patients WHERE mobile = $1`, [patient.mobile]
    );
    if (existingPatient.rows[0]) {
      patientId = existingPatient.rows[0].id;
      await client.query(
        `UPDATE patients SET name=$1, age=$2, sex=$3, email=$4, address=$5, updated_at=NOW() WHERE id=$6`,
        [patient.name, patient.age, patient.sex, patient.email || null, patient.address || null, patientId]
      );
    } else {
      const newPatient = await client.query(
        `INSERT INTO patients (name, age, sex, mobile, email, address) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [patient.name, patient.age, patient.sex, patient.mobile, patient.email || null, patient.address || null]
      );
      patientId = newPatient.rows[0].id;
    }

    // Create appointment
    const appointmentNumber = await generateAppointmentNumber();
    const slotReservedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const appointmentResult = await client.query(
      `INSERT INTO appointments
        (appointment_number, patient_id, chamber_id, consultation_type, appointment_date, appointment_time,
         slot_end_time, consultation_fee, status, reason, notes, otp_verified, slot_reserved_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,true,$11)
       RETURNING *`,
      [
        appointmentNumber, patientId, chamber_id || null, consultation_type,
        appointment_date, appointment_time, slotEndTime, fee,
        reason || null, notes || null, slotReservedUntil,
      ]
    );

    // Create pending payment
    await client.query(
      `INSERT INTO payments (appointment_id, amount, currency, status)
       VALUES ($1,$2,'INR','pending')`,
      [appointmentResult.rows[0].id, fee]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        appointmentId: appointmentResult.rows[0].id,
        appointmentNumber,
        fee,
        consultationType: consultation_type,
      },
      message: 'Appointment reserved. Please complete payment.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('Appointment creation error:', { message: err?.message, code: err?.code, detail: err?.detail });
    res.status(500).json({ success: false, message: err?.message || 'Failed to create appointment. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /api/appointments/confirm/:appointmentNumber - Public confirmation view
router.get('/confirm/:appointmentNumber', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, p.name as patient_name, p.age, p.sex, p.mobile, p.email,
              c.name as chamber_name, c.address as chamber_address, c.city, c.phone as chamber_phone,
              pay.status as payment_status, pay.razorpay_payment_id, pay.amount as paid_amount, pay.paid_at
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN chambers c ON c.id = a.chamber_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       WHERE a.appointment_number = $1`,
      [req.params.appointmentNumber]
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }
    // Redact sensitive fields for public view and format dates
    const appt = result.rows[0];
    appt.mobile = String(appt.mobile || '').slice(0, 5) + '*****';

    // Normalize appointment_date to YYYY-MM-DD
    // PostgreSQL DATE columns return a JS Date object via the pg driver
    if (appt.appointment_date) {
      const d = appt.appointment_date;
      if (d instanceof Date) {
        // Use UTC to avoid timezone shifting (DATE has no time component)
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        appt.appointment_date = `${y}-${m}-${day}`;
      } else {
        // Already a string — just take YYYY-MM-DD part
        appt.appointment_date = String(d).slice(0, 10);
      }
    }

    // Normalize TIME columns to HH:MM
    for (const field of ['appointment_time', 'slot_end_time']) {
      if (appt[field]) {
        appt[field] = String(appt[field]).slice(0, 5);
      }
    }
    res.json({ success: true, data: appt });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/appointments/admin - Admin list with pagination/filter
router.get('/admin', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req: Request, res: Response) => {
  const {
    page = '1', limit = '20', search = '', status, consultation_type,
    chamber_id, from_date, to_date, sort = 'appointment_date', order = 'DESC',
  } = req.query as Record<string, string>;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`(p.name ILIKE $${i} OR a.appointment_number ILIKE $${i} OR p.mobile ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (status) { conditions.push(`a.status = $${i++}`); params.push(status); }
  if (consultation_type) { conditions.push(`a.consultation_type = $${i++}`); params.push(consultation_type); }
  if (chamber_id) { conditions.push(`a.chamber_id = $${i++}`); params.push(chamber_id); }
  if (from_date) { conditions.push(`a.appointment_date >= $${i++}`); params.push(from_date); }
  if (to_date) { conditions.push(`a.appointment_date <= $${i++}`); params.push(to_date); }

  const whereClause = conditions.join(' AND ');
  const validSorts: Record<string, string> = {
    appointment_date: 'a.appointment_date',
    created_at: 'a.created_at',
    status: 'a.status',
    patient_name: 'p.name',
  };
  const sortCol = validSorts[sort] || 'a.appointment_date';
  const sortDir = order === 'ASC' ? 'ASC' : 'DESC';

  try {
    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE ${whereClause}`,
      params
    );

    const dataResult = await query(
      `SELECT a.*, p.name as patient_name, p.age, p.sex, p.mobile, p.email,
              c.name as chamber_name, pay.status as payment_status, pay.amount as paid_amount
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN chambers c ON c.id = a.chamber_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       WHERE ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    const total = parseInt(countResult.rows[0].count);
    res.json({
      success: true,
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/admin/:id - Admin single view
// NOTE: must stay AFTER all /admin/stats, /admin/calendar, /admin/charts routes
router.get('/admin/:id([0-9a-f-]{36})', authenticate, authorize('super_admin', 'doctor', 'staff'), [
  param('id').isUUID(), validate,
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, p.name as patient_name, p.age, p.sex, p.mobile, p.email, p.address as patient_address,
              c.name as chamber_name, c.address as chamber_address, c.city, c.phone as chamber_phone,
              pay.status as payment_status, pay.razorpay_order_id, pay.razorpay_payment_id, pay.amount as paid_amount, pay.paid_at
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN chambers c ON c.id = a.chamber_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }
    await auditFromRequest(req, 'appointment_viewed', 'appointment', req.params.id);
    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/appointments/admin/:id - Update status
router.put('/admin/:id([0-9a-f-]{36})', authenticate, authorize('super_admin', 'doctor', 'staff'), [
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled']),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { status, cancelled_reason, meeting_link, notes } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT status FROM appointments WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    const updates: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (status) { updates.push(`status = $${i++}`); vals.push(status); }
    if (cancelled_reason) { updates.push(`cancelled_reason = $${i++}`); vals.push(cancelled_reason); }
    if (status === 'cancelled') { updates.push(`cancelled_by = $${i++}`); vals.push(req.user!.id); }
    if (meeting_link) { updates.push(`meeting_link = $${i++}`); vals.push(meeting_link); }
    if (notes) { updates.push(`notes = $${i++}`); vals.push(notes); }

    vals.push(req.params.id);
    const result = await client.query(
      `UPDATE appointments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      vals
    );

    // Record history
    await client.query(
      `INSERT INTO appointment_history (appointment_id, old_status, new_status, changed_by, notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, current.rows[0].status, status || current.rows[0].status, req.user!.id, cancelled_reason || null]
    );

    await client.query('COMMIT');
    await auditFromRequest(req, 'appointment_status_changed', 'appointment', req.params.id,
      `Status: ${current.rows[0].status} → ${status}`);
    res.json({ success: true, data: result.rows[0], message: 'Appointment updated' });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/appointments/admin/stats/dashboard
router.get('/admin/stats/dashboard', authenticate, authorize('super_admin', 'doctor', 'staff'), async (_req, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';

    const [todayAppts, upcomingAppts, completedAppts, cancelledAppts, onlineAppts, chamberAppts, todayRevenue, monthRevenue, totalPatients] = await Promise.all([
      query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1`, [today]),
      query(`SELECT COUNT(*) FROM appointments WHERE appointment_date >= $1 AND status IN ('pending','confirmed')`, [today]),
      query(`SELECT COUNT(*) FROM appointments WHERE status = 'completed'`),
      query(`SELECT COUNT(*) FROM appointments WHERE status = 'cancelled'`),
      query(`SELECT COUNT(*) FROM appointments WHERE consultation_type = 'online'`),
      query(`SELECT COUNT(*) FROM appointments WHERE consultation_type = 'chamber'`),
      query(`SELECT COALESCE(SUM(amount),0) as revenue FROM payments WHERE status = 'paid' AND date(paid_at) = $1`, [today]),
      query(`SELECT COALESCE(SUM(amount),0) as revenue FROM payments WHERE status = 'paid' AND paid_at >= $1`, [monthStart]),
      query(`SELECT COUNT(*) FROM patients`),
    ]);

    res.json({
      success: true,
      data: {
        today_appointments: parseInt(todayAppts.rows[0].count),
        upcoming_appointments: parseInt(upcomingAppts.rows[0].count),
        completed_appointments: parseInt(completedAppts.rows[0].count),
        cancelled_appointments: parseInt(cancelledAppts.rows[0].count),
        online_consultations: parseInt(onlineAppts.rows[0].count),
        chamber_consultations: parseInt(chamberAppts.rows[0].count),
        today_revenue: parseFloat(todayRevenue.rows[0].revenue),
        monthly_revenue: parseFloat(monthRevenue.rows[0].revenue),
        total_patients: parseInt(totalPatients.rows[0].count),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/admin/calendar
router.get('/admin/calendar', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  try {
    const result = await query(
      `SELECT a.id, a.appointment_number, a.appointment_date, a.appointment_time, a.status,
              a.consultation_type, p.name as patient_name, c.name as chamber_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN chambers c ON c.id = a.chamber_id
       WHERE a.appointment_date >= $1 AND a.appointment_date <= $2
       ORDER BY a.appointment_date, a.appointment_time`,
      [from || new Date().toISOString().split('T')[0], to || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]]
    );
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/admin/charts
router.get('/admin/charts', authenticate, authorize('super_admin', 'doctor'), async (_req, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const monthFn = isPg() ? "TO_CHAR(paid_at,'YYYY-MM')" : "strftime('%Y-%m', paid_at)";
    const monthGroup = isPg() ? "TO_CHAR(paid_at,'YYYY-MM')" : "strftime('%Y-%m', paid_at)";

    const [byDay, byStatus, byType, revenueByMonth] = await Promise.all([
      query(
        `SELECT appointment_date AS appointment_date, COUNT(*) AS count
         FROM appointments WHERE appointment_date >= $1
         GROUP BY appointment_date ORDER BY appointment_date`,
        [thirtyDaysAgo]
      ),
      query(`SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`),
      query(`SELECT consultation_type, COUNT(*) AS count FROM appointments GROUP BY consultation_type`),
      query(
        `SELECT ${monthFn} AS month, SUM(amount) AS revenue
         FROM payments WHERE status='paid' AND paid_at >= $1
         GROUP BY ${monthGroup} ORDER BY month`,
        [twelveMonthsAgo]
      ),
    ]);
    res.json({
      success: true,
      data: {
        appointments_by_day: byDay.rows,
        appointments_by_status: byStatus.rows,
        appointments_by_type: byType.rows,
        revenue_by_month: revenueByMonth.rows,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
