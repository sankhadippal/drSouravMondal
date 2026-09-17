import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/schedules/:chamberId - Public
router.get('/:chamberId', [param('chamberId').isUUID(), validate], async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM chamber_schedules WHERE chamber_id = $1 ORDER BY day_of_week`,
      [req.params.chamberId]
    );
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/schedules/:chamberId - Admin (bulk upsert all 7 days)
router.put('/:chamberId', authenticate, authorize('super_admin', 'doctor'), [
  param('chamberId').isUUID(),
  body('schedules').isArray({ min: 7, max: 7 }).withMessage('All 7 days required'),
  body('schedules.*.day_of_week').isInt({ min: 0, max: 6 }),
  body('schedules.*.is_available').isBoolean(),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { chamberId } = req.params;
  const { schedules } = req.body;

  // Verify chamber exists
  const chamberCheck = await query(`SELECT id FROM chambers WHERE id = $1 AND deleted_at IS NULL`, [chamberId]);
  if (!chamberCheck.rows[0]) {
    res.status(404).json({ success: false, message: 'Chamber not found' });
    return;
  }

  const client = (await import('../config/db')).getClient;
  const conn = await client();
  try {
    await conn.query('BEGIN');
    const results = [];
    for (const s of schedules) {
      const r = await conn.query(
        `INSERT INTO chamber_schedules 
          (chamber_id, day_of_week, is_available, start_time, end_time, break_start, break_end, slot_duration_minutes, max_patients_per_slot, consultation_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (chamber_id, day_of_week) DO UPDATE SET
          is_available = EXCLUDED.is_available,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          break_start = EXCLUDED.break_start,
          break_end = EXCLUDED.break_end,
          slot_duration_minutes = EXCLUDED.slot_duration_minutes,
          max_patients_per_slot = EXCLUDED.max_patients_per_slot,
          consultation_fee = EXCLUDED.consultation_fee,
          updated_at = NOW()
         RETURNING *`,
        [
          chamberId,
          s.day_of_week,
          s.is_available,
          s.is_available ? s.start_time : null,
          s.is_available ? s.end_time : null,
          s.break_start || null,
          s.break_end || null,
          s.slot_duration_minutes || 15,
          s.max_patients_per_slot || 1,
          s.consultation_fee || null,
        ]
      );
      results.push(r.rows[0]);
    }
    await conn.query('COMMIT');
    await auditFromRequest(req, 'schedule_updated', 'chamber_schedule', chamberId, `Schedule updated for chamber ${chamberId}`);
    res.json({ success: true, data: results, message: 'Schedule updated successfully' });
  } catch (err) {
    await conn.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

export default router;
