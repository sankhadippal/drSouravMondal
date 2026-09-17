import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── Helper: attach schedules to chambers (works on both PG and SQLite) ───────
async function attachSchedules(chambers: Record<string, unknown>[]) {
  if (!chambers.length) return chambers;
  const ids = chambers.map(c => c.id as string);
  // Fetch all schedules for these chambers in one query
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const schResult = await query(
    `SELECT * FROM chamber_schedules WHERE chamber_id IN (${placeholders}) ORDER BY day_of_week`,
    ids
  );
  const schedMap: Record<string, unknown[]> = {};
  for (const s of schResult.rows) {
    const cid = s.chamber_id as string;
    if (!schedMap[cid]) schedMap[cid] = [];
    schedMap[cid].push(s);
  }
  return chambers.map(c => ({ ...c, schedules: schedMap[c.id as string] || [] }));
}

// GET /api/chambers - Public
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM chambers WHERE deleted_at IS NULL AND status = 'active' ORDER BY sort_order, created_at`
    );
    const data = await attachSchedules(result.rows);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/chambers/admin/all - Admin (must come before /:id)
router.get('/admin/all', authenticate, authorize('super_admin', 'doctor', 'staff'), async (_req, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM chambers WHERE deleted_at IS NULL ORDER BY sort_order, created_at`
    );
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/chambers/:id - Public
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM chambers WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Chamber not found' });
      return;
    }
    const [chamber] = await attachSchedules([result.rows[0]]);
    res.json({ success: true, data: chamber });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chambers - Admin
router.post('/', authenticate, authorize('super_admin', 'doctor'), [
  body('name').notEmpty().trim().withMessage('Chamber name required'),
  body('address').notEmpty().trim().withMessage('Address required'),
  body('city').notEmpty().trim().withMessage('City required'),
  body('state').notEmpty().trim().withMessage('State required'),
  body('consultation_fee').isFloat({ min: 0 }).withMessage('Valid fee required'),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { name, address, area, city, state, pincode, phone, latitude, longitude, google_maps_url, consultation_fee, status } = req.body;
  try {
    const result = await query(
      `INSERT INTO chambers (name, address, area, city, state, pincode, phone, latitude, longitude, google_maps_url, consultation_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, address, area || null, city, state, pincode || null, phone || null,
       latitude || null, longitude || null, google_maps_url || null, consultation_fee, status || 'active']
    );
    const chamber = result.rows[0];
    await auditFromRequest(req, 'chamber_created', 'chamber', chamber?.id, `Chamber "${name}" created`);
    res.status(201).json({ success: true, data: chamber, message: 'Chamber created successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/chambers/:id - Admin
router.put('/:id', authenticate, authorize('super_admin', 'doctor'), [
  param('id').isUUID(), validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const fields = ['name', 'address', 'area', 'city', 'state', 'pincode', 'phone',
    'latitude', 'longitude', 'google_maps_url', 'consultation_fee', 'status', 'sort_order'];
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${i++}`);
      values.push(req.body[field]);
    }
  }
  if (!updates.length) {
    res.status(400).json({ success: false, message: 'No fields to update' });
    return;
  }
  values.push(req.params.id);
  try {
    const result = await query(
      `UPDATE chambers SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Chamber not found' });
      return;
    }
    await auditFromRequest(req, 'chamber_updated', 'chamber', req.params.id, `Chamber updated`);
    res.json({ success: true, data: result.rows[0], message: 'Chamber updated' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/chambers/:id - Admin (soft delete)
router.delete('/:id', authenticate, authorize('super_admin', 'doctor'), [
  param('id').isUUID(), validate,
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const active = await query(
      `SELECT COUNT(*) as count FROM appointments WHERE chamber_id = $1 AND status IN ('pending','confirmed')`,
      [req.params.id]
    );
    const activeCount = parseInt((active.rows[0]?.count ?? active.rows[0]?.COUNT ?? '0') as string);
    if (activeCount > 0) {
      res.status(409).json({ success: false, message: 'Cannot delete chamber with active appointments.' });
      return;
    }
    const result = await query(
      `UPDATE chambers SET deleted_at = datetime('now'), status = 'inactive' WHERE id = $1 AND deleted_at IS NULL RETURNING name`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Chamber not found' });
      return;
    }
    await auditFromRequest(req, 'chamber_deleted', 'chamber', req.params.id, `Chamber deleted`);
    res.json({ success: true, message: 'Chamber deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
