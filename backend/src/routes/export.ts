import { Router, Response } from 'express';
import { query, isPg } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const s = val == null ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
}

// GET /api/export/appointments
router.get('/appointments', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req, res: Response) => {
  const { from_date, to_date, status } = req.query as Record<string, string>;
  const conditions = ['1=1'];
  const params: unknown[] = [];
  let i = 1;
  if (from_date) { conditions.push(`a.appointment_date >= $${i++}`); params.push(from_date); }
  if (to_date)   { conditions.push(`a.appointment_date <= $${i++}`); params.push(to_date); }
  if (status)    { conditions.push(`a.status = $${i++}`); params.push(status); }
  try {
    const result = await query(
      `SELECT a.appointment_number, p.name as patient_name, p.age, p.sex, p.mobile, p.email,
              a.consultation_type, c.name as chamber_name, a.appointment_date, a.appointment_time,
              a.consultation_fee, pay.status as payment_status, a.status, a.created_at
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN chambers c ON c.id = a.chamber_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       WHERE ${conditions.join(' AND ')} ORDER BY a.appointment_date DESC`,
      params
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="appointments_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(toCSV(result.rows));
  } catch { res.status(500).json({ success: false, message: 'Export failed' }); }
});

// GET /api/export/patients
router.get('/patients', authenticate, authorize('super_admin', 'doctor'), async (_req, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.age, p.sex, p.mobile, p.email,
              COUNT(a.id) as total_appointments,
              MAX(a.appointment_date) as last_appointment, p.created_at
       FROM patients p LEFT JOIN appointments a ON a.patient_id = p.id
       GROUP BY p.id ORDER BY p.created_at DESC`
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="patients_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(toCSV(result.rows));
  } catch { res.status(500).json({ success: false, message: 'Export failed' }); }
});

// GET /api/export/payments
router.get('/payments', authenticate, authorize('super_admin', 'doctor'), async (req, res: Response) => {
  const { from_date, to_date } = req.query as Record<string, string>;
  const conditions = ['1=1'];
  const params: unknown[] = [];
  let i = 1;
  if (from_date) { conditions.push(`date(pay.created_at) >= $${i++}`); params.push(from_date); }
  if (to_date)   { conditions.push(`date(pay.created_at) <= $${i++}`); params.push(to_date); }
  try {
    const result = await query(
      `SELECT pay.id, a.appointment_number, p.name as patient_name, p.mobile,
              pay.amount, pay.currency, pay.razorpay_order_id, pay.razorpay_payment_id,
              pay.status, pay.paid_at, pay.created_at
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN patients p ON p.id = a.patient_id
       WHERE ${conditions.join(' AND ')} ORDER BY pay.created_at DESC`,
      params
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(toCSV(result.rows));
  } catch { res.status(500).json({ success: false, message: 'Export failed' }); }
});

// GET /api/export/revenue-report
router.get('/revenue-report', authenticate, authorize('super_admin', 'doctor'), async (req, res: Response) => {
  const { from_date, to_date } = req.query as Record<string, string>;
  try {
    const dateFn = isPg() ? "TO_CHAR(pay.paid_at,'YYYY-MM-DD')" : "strftime('%Y-%m-%d', pay.paid_at)";
    const dateFilter1 = isPg() ? "($1::date IS NULL OR pay.paid_at::date >= $1::date)" : "(($1 IS NULL) OR date(pay.paid_at) >= $1)";
    const dateFilter2 = isPg() ? "($2::date IS NULL OR pay.paid_at::date <= $2::date)" : "(($2 IS NULL) OR date(pay.paid_at) <= $2)";
    const result = await query(
      `SELECT ${dateFn} as date,
              COUNT(*) as transactions, SUM(pay.amount) as revenue,
              COUNT(CASE WHEN a.consultation_type='online' THEN 1 END) as online_count,
              COUNT(CASE WHEN a.consultation_type='chamber' THEN 1 END) as chamber_count,
              SUM(CASE WHEN a.consultation_type='online' THEN pay.amount ELSE 0 END) as online_revenue,
              SUM(CASE WHEN a.consultation_type='chamber' THEN pay.amount ELSE 0 END) as chamber_revenue
       FROM payments pay JOIN appointments a ON a.id = pay.appointment_id
       WHERE pay.status = 'paid'
         AND ${dateFilter1}
         AND ${dateFilter2}
       GROUP BY ${dateFn} ORDER BY date DESC`,
      [from_date || null, to_date || null]
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(toCSV(result.rows));
  } catch { res.status(500).json({ success: false, message: 'Export failed' }); }
});

export default router;
