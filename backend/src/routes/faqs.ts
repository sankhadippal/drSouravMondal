import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM faqs WHERE is_active = true AND deleted_at IS NULL ORDER BY sort_order, created_at`);
    res.json({ success: true, data: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/', authenticate, authorize('super_admin', 'doctor'), [
  body('question').notEmpty().trim(),
  body('answer').notEmpty().trim(),
  validate,
], async (req: Request, res: Response) => {
  const { question, answer, category, sort_order } = req.body;
  try {
    const r = await query(
      `INSERT INTO faqs (question, answer, category, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [question, answer, category || 'general', sort_order || 0]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: Request, res: Response) => {
  const fields = ['question', 'answer', 'category', 'sort_order', 'is_active'];
  const updates: string[] = []; const values: unknown[] = []; let i = 1;
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); } }
  if (!updates.length) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }
  values.push(req.params.id);
  try {
    const r = await query(`UPDATE faqs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} AND deleted_at IS NULL RETURNING *`, values);
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'FAQ not found' }); return; }
    res.json({ success: true, data: r.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.delete('/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: Request, res: Response) => {
  try {
    const r = await query(`UPDATE faqs SET deleted_at = NOW(), is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [req.params.id]);
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'FAQ not found' }); return; }
    res.json({ success: true, message: 'FAQ deleted' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
