import { Router, Request, Response } from 'express';
import { body, param, query as queryParam } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/blocked-dates - Public (for booking form)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chamber_id, from, to } = req.query;
    let sql = `SELECT * FROM blocked_dates WHERE 1=1`;
    const params: unknown[] = [];
    let i = 1;
    if (chamber_id) {
      sql += ` AND (chamber_id = $${i++} OR is_all_chambers = true)`;
      params.push(chamber_id);
    }
    if (from) { sql += ` AND date >= $${i++}`; params.push(from); }
    if (to) { sql += ` AND date <= $${i++}`; params.push(to); }
    sql += ` ORDER BY date`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/blocked-dates - Admin
router.post('/', authenticate, authorize('super_admin', 'doctor'), [
  body('date').isDate().withMessage('Valid date required'),
  body('reason').notEmpty().withMessage('Reason required'),
  body('block_type').isIn(['holiday', 'personal_leave', 'conference', 'emergency', 'other']).withMessage('Invalid block type'),
  body('is_all_chambers').optional().isBoolean(),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { chamber_id, date, reason, block_type, is_all_chambers } = req.body;
  try {
    const result = await query(
      `INSERT INTO blocked_dates (chamber_id, date, reason, block_type, is_all_chambers, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [chamber_id || null, date, reason, block_type, is_all_chambers || false, req.user!.id]
    );
    await auditFromRequest(req, 'date_blocked', 'blocked_date', result.rows[0].id, `Date ${date} blocked: ${reason}`);
    res.status(201).json({ success: true, data: result.rows[0], message: 'Date blocked successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/blocked-dates/:id - Admin
router.delete('/:id', authenticate, authorize('super_admin', 'doctor'), [
  param('id').isUUID(), validate,
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(`DELETE FROM blocked_dates WHERE id = $1 RETURNING date, reason`, [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Blocked date not found' });
      return;
    }
    await auditFromRequest(req, 'date_unblocked', 'blocked_date', req.params.id, `Date ${result.rows[0].date} unblocked`);
    res.json({ success: true, message: 'Date unblocked successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
