import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, authorize('super_admin'), async (_req, res: Response) => {
  try {
    const r = await query(`SELECT id, name, email, mobile, role, is_active, last_login_at, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    res.json({ success: true, data: r.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/', authenticate, authorize('super_admin'), [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['super_admin', 'doctor', 'staff']),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, mobile, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await query(
      `INSERT INTO users (name, email, mobile, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role`,
      [name, email, mobile || null, hash, role]
    );
    await auditFromRequest(req, 'admin_user_created', 'user', r.rows[0].id, `User ${name} (${role}) created`);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ success: false, message: 'Email already exists' }); return; }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('super_admin'), [param('id').isUUID(), validate], async (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, role, is_active } = req.body;
  const updates: string[] = []; const values: unknown[] = []; let i = 1;
  if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
  if (mobile !== undefined) { updates.push(`mobile = $${i++}`); values.push(mobile); }
  if (role !== undefined) { updates.push(`role = $${i++}`); values.push(role); }
  if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(is_active); }
  if (!updates.length) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }
  values.push(req.params.id);
  try {
    const r = await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} AND deleted_at IS NULL RETURNING id, name, email, role, is_active`, values);
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    await auditFromRequest(req, 'admin_user_updated', 'user', req.params.id);
    res.json({ success: true, data: r.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.delete('/:id', authenticate, authorize('super_admin'), [param('id').isUUID(), validate], async (req: AuthenticatedRequest, res: Response) => {
  if (req.params.id === req.user!.id) { res.status(400).json({ success: false, message: 'Cannot delete your own account' }); return; }
  try {
    const r = await query(`UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING name`, [req.params.id]);
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    await auditFromRequest(req, 'admin_user_deleted', 'user', req.params.id, `User ${r.rows[0].name} deleted`);
    res.json({ success: true, message: 'User deactivated' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
