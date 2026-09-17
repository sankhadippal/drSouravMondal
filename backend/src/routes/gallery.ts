import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── Upload setup ─────────────────────────────────────────────────────────────
const galleryDir = path.join(__dirname, '..', '..', 'uploads', 'gallery');
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, galleryDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Images only (JPEG, PNG, WebP, GIF)'));
  },
});

// ── GET /api/gallery  — public ────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT id, title, caption, image_url, sort_order
       FROM gallery_images
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY sort_order, created_at`
    );
    res.json({ success: true, data: r.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── GET /api/gallery/admin  — admin all ───────────────────────────────────────
router.get('/admin', authenticate, authorize('super_admin', 'doctor', 'staff'), async (_req, res: Response) => {
  try {
    const r = await query(
      `SELECT * FROM gallery_images WHERE deleted_at IS NULL ORDER BY sort_order, created_at`
    );
    res.json({ success: true, data: r.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── POST /api/gallery  — upload image ─────────────────────────────────────────
router.post('/', authenticate, authorize('super_admin', 'doctor'),
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'Image required' }); return; }
    const { title, caption, sort_order } = req.body;
    const imageUrl = `/uploads/gallery/${req.file.filename}`;
    try {
      const r = await query(
        `INSERT INTO gallery_images (title, caption, image_url, sort_order, uploaded_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title || null, caption || null, imageUrl,
         sort_order ? parseInt(sort_order) : 0, req.user!.id]
      );
      await auditFromRequest(req, 'gallery_image_uploaded', 'gallery_image', r.rows[0].id, `Gallery image uploaded`);
      res.status(201).json({ success: true, data: r.rows[0], message: 'Image uploaded' });
    } catch {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── PUT /api/gallery/:id  — update meta / toggle active ───────────────────────
router.put('/:id', authenticate, authorize('super_admin', 'doctor'),
  [param('id').isUUID(), validate],
  async (req: AuthenticatedRequest, res: Response) => {
    const { title, caption, sort_order, is_active } = req.body;
    const updates: string[] = []; const values: unknown[] = []; let i = 1;
    if (title !== undefined)      { updates.push(`title = $${i++}`);      values.push(title); }
    if (caption !== undefined)    { updates.push(`caption = $${i++}`);    values.push(caption); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${i++}`); values.push(parseInt(sort_order)); }
    if (is_active !== undefined)  { updates.push(`is_active = $${i++}`);  values.push(is_active); }
    if (!updates.length) { res.status(400).json({ success: false, message: 'Nothing to update' }); return; }
    values.push(req.params.id);
    try {
      const r = await query(
        `UPDATE gallery_images SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${i} AND deleted_at IS NULL RETURNING *`, values
      );
      if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Not found' }); return; }
      res.json({ success: true, data: r.rows[0] });
    } catch { res.status(500).json({ success: false, message: 'Server error' }); }
  }
);

// ── PUT /api/gallery/reorder  — bulk sort_order update ───────────────────────
router.put('/reorder/bulk', authenticate, authorize('super_admin', 'doctor'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { order } = req.body as { order: { id: string; sort_order: number }[] };
    if (!Array.isArray(order)) { res.status(400).json({ success: false, message: 'order array required' }); return; }
    try {
      for (const item of order) {
        await query(`UPDATE gallery_images SET sort_order = $1 WHERE id = $2`, [item.sort_order, item.id]);
      }
      res.json({ success: true, message: 'Order updated' });
    } catch { res.status(500).json({ success: false, message: 'Server error' }); }
  }
);

// ── DELETE /api/gallery/:id  — soft delete ────────────────────────────────────
router.delete('/:id', authenticate, authorize('super_admin', 'doctor'),
  [param('id').isUUID(), validate],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const r = await query(
        `UPDATE gallery_images SET deleted_at = NOW(), is_active = false
         WHERE id = $1 AND deleted_at IS NULL RETURNING image_url`, [req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Not found' }); return; }
      await auditFromRequest(req, 'gallery_image_deleted', 'gallery_image', req.params.id);
      res.json({ success: true, message: 'Image deleted' });
    } catch { res.status(500).json({ success: false, message: 'Server error' }); }
  }
);

export default router;
