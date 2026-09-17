import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/services - Public
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM services WHERE is_active = true AND deleted_at IS NULL ORDER BY sort_order, created_at`
    );
    res.json({ success: true, data: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/services - Admin
router.post('/', authenticate, authorize('super_admin', 'doctor'), [
  body('name').notEmpty().trim().withMessage('Service name required'),
  body('description').optional().trim(),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, icon, image, consultation_info, sort_order } = req.body;
  try {
    const result = await query(
      `INSERT INTO services (name, description, icon, image, consultation_info, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description || null, icon || null, image || null, consultation_info || null, sort_order || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/services/:id - Admin
router.put('/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: AuthenticatedRequest, res: Response) => {
  const fields = ['name', 'description', 'icon', 'image', 'consultation_info', 'sort_order', 'is_active'];
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }
  values.push(req.params.id);
  try {
    const result = await query(
      `UPDATE services SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'Service not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/services/:id - Admin
router.delete('/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE services SET deleted_at = NOW(), is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING name`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'Service not found' }); return; }
    res.json({ success: true, message: 'Service deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
