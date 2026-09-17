import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';
import rateLimit from 'express-rate-limit';

const router = Router();

const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  },
  message: { success: false, message: 'You can only submit 3 reviews per day.' },
});

// ── GET /api/reviews  — public approved reviews ───────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { featured } = req.query as Record<string, string>;
  try {
    let sql = `SELECT id, patient_name, patient_location, rating, review_text, treatment_for, is_featured, created_at
               FROM patient_reviews WHERE status = 'approved' AND deleted_at IS NULL`;
    if (featured === 'true') sql += ` AND is_featured = true`;
    sql += ` ORDER BY is_featured DESC, created_at DESC LIMIT 50`;
    const r = await query(sql);
    res.json({ success: true, data: r.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── GET /api/reviews/stats  — public stats ────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='approved' AND deleted_at IS NULL) as total,
         ROUND(AVG(rating) FILTER (WHERE status='approved' AND deleted_at IS NULL), 1) as avg_rating,
         COUNT(*) FILTER (WHERE status='approved' AND deleted_at IS NULL AND rating = 5) as five_star
       FROM patient_reviews`
    );
    res.json({ success: true, data: r.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── POST /api/reviews  — public submit ───────────────────────────────────────
router.post('/', reviewLimiter, [
  body('patient_name').notEmpty().trim().isLength({ min: 2, max: 150 }).withMessage('Name required (2–150 chars)'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating 1–5 required'),
  body('review_text').notEmpty().trim().isLength({ min: 20, max: 2000 }).withMessage('Review must be 20–2000 characters'),
  body('patient_location').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('treatment_for').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  validate,
], async (req: Request, res: Response) => {
  const { patient_name, patient_location, rating, review_text, treatment_for } = req.body;

  // Check if reviews are enabled
  const setting = await query(`SELECT value FROM website_settings WHERE key = 'reviews_allow_submit'`);
  if (setting.rows[0]?.value === 'false') {
    res.status(403).json({ success: false, message: 'Review submission is currently disabled.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);

  try {
    await query(
      `INSERT INTO patient_reviews
         (patient_name, patient_location, rating, review_text, treatment_for, ip_hash)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [patient_name, patient_location || null, parseInt(rating), review_text,
       treatment_for || null, ipHash]
    );
    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted and is pending approval.',
    });
  } catch { res.status(500).json({ success: false, message: 'Failed to submit review.' }); }
});

// ── GET /api/reviews/admin  — admin list all ──────────────────────────────────
router.get('/admin', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let i = 1;
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }
  const where = conditions.join(' AND ');
  try {
    const count = await query(`SELECT COUNT(*) as count FROM patient_reviews WHERE ${where}`, params);
    const data  = await query(
      `SELECT * FROM patient_reviews WHERE ${where}
       ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(String(count.rows[0]?.count ?? '0'));
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── PUT /api/reviews/admin/:id  — approve / reject / feature ─────────────────
router.put('/admin/:id', authenticate, authorize('super_admin', 'doctor'),
  [param('id').isUUID(), body('status').optional().isIn(['approved', 'rejected', 'pending']), validate],
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, is_featured, admin_notes } = req.body;
    const updates: string[] = []; const values: unknown[] = []; let i = 1;
    if (status !== undefined) {
      updates.push(`status = $${i++}`); values.push(status);
      if (status === 'approved') {
        updates.push(`approved_by = $${i++}`); values.push(req.user!.id);
        updates.push(`approved_at = NOW()`);
      }
    }
    if (is_featured !== undefined) { updates.push(`is_featured = $${i++}`); values.push(is_featured); }
    if (admin_notes !== undefined) { updates.push(`admin_notes = $${i++}`); values.push(admin_notes); }
    if (!updates.length) { res.status(400).json({ success: false, message: 'Nothing to update' }); return; }
    values.push(req.params.id);
    try {
      const r = await query(
        `UPDATE patient_reviews SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${i} AND deleted_at IS NULL RETURNING *`, values
      );
      if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Review not found' }); return; }
      await auditFromRequest(req, `review_${status || 'updated'}`, 'patient_review', req.params.id);
      res.json({ success: true, data: r.rows[0], message: `Review ${status || 'updated'}` });
    } catch { res.status(500).json({ success: false, message: 'Server error' }); }
  }
);

// ── DELETE /api/reviews/admin/:id  — soft delete ──────────────────────────────
router.delete('/admin/:id', authenticate, authorize('super_admin', 'doctor'),
  [param('id').isUUID(), validate],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const r = await query(
        `UPDATE patient_reviews SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Not found' }); return; }
      await auditFromRequest(req, 'review_deleted', 'patient_review', req.params.id);
      res.json({ success: true, message: 'Review deleted' });
    } catch { res.status(500).json({ success: false, message: 'Server error' }); }
  }
);

export default router;
