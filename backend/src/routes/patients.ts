import { Router, Response } from 'express';
import { param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/patients - Admin only
router.get('/', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '20', search = '' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const searchParam = `%${search}%`;

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as count FROM patients WHERE name LIKE $1 OR mobile LIKE $1`,
      [searchParam]
    );

    const patientsResult = await query(
      `SELECT * FROM patients
       WHERE name LIKE $1 OR mobile LIKE $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [searchParam, parseInt(limit), offset]
    );

    // Fetch appointment counts for these patients in one query
    const patientIds = patientsResult.rows.map(p => p.id as string);
    let statsMap: Record<string, { total: number; last: string | null }> = {};

    if (patientIds.length > 0) {
      const placeholders = patientIds.map((_, i) => `$${i + 1}`).join(',');
      const statsResult = await query(
        `SELECT patient_id,
                COUNT(id) as total_appointments,
                MAX(appointment_date) as last_appointment
         FROM appointments
         WHERE patient_id IN (${placeholders})
         GROUP BY patient_id`,
        patientIds
      );
      for (const row of statsResult.rows) {
        statsMap[row.patient_id as string] = {
          total: parseInt((row.total_appointments ?? '0') as string),
          last: (row.last_appointment as string) || null,
        };
      }
    }

    const data = patientsResult.rows.map(p => ({
      ...p,
      total_appointments: statsMap[p.id as string]?.total ?? 0,
      last_appointment: statsMap[p.id as string]?.last ?? null,
    }));

    const total = parseInt((countResult.rows[0]?.count ?? '0') as string);
    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/patients/:id - Admin only
router.get('/:id', authenticate, authorize('super_admin', 'doctor', 'staff'), [
  param('id').isUUID(), validate,
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patient = await query(`SELECT * FROM patients WHERE id = $1`, [req.params.id]);
    if (!patient.rows[0]) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    const appointments = await query(
      `SELECT a.*, c.name as chamber_name, pay.status as payment_status, pay.amount as paid_amount
       FROM appointments a
       LEFT JOIN chambers c ON c.id = a.chamber_id
       LEFT JOIN payments pay ON pay.appointment_id = a.id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC`,
      [req.params.id]
    );

    await auditFromRequest(req, 'patient_record_viewed', 'patient', req.params.id, 'Patient record viewed');
    res.json({ success: true, data: { ...patient.rows[0], appointments: appointments.rows } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
