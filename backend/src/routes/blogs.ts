import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── Multer setup for blog cover images ───────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'blog');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `blog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

// ─── Slug generator ────────────────────────────────────────────────────────────
const slugify = (text: string): string =>
  text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) + '-' + Date.now().toString(36);

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

// GET /api/blogs — published posts
router.get('/', async (req: Request, res: Response) => {
  const { page = '1', limit = '9', tag } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [`status = 'published'`, `deleted_at IS NULL`];
  const params: unknown[] = [];
  let i = 1;
  if (tag) {
    conditions.push(`tags @> $${i++}::jsonb`);
    params.push(JSON.stringify([tag]));
  }
  const where = conditions.join(' AND ');

  try {
    const count = await query(`SELECT COUNT(*) as count FROM blog_posts WHERE ${where}`, params);
    const data  = await query(
      `SELECT id, title, slug, excerpt, cover_image, tags, author_name, published_at, view_count, created_at
       FROM blog_posts WHERE ${where}
       ORDER BY published_at DESC NULLS LAST
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(String(count.rows[0]?.count ?? '0'));
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/blogs/:slug — single published post (increment view count)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
      [req.params.slug]
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    // Increment view count asynchronously
    query(`UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1`, [result.rows[0].id]).catch(() => {});
    res.json({ success: true, data: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// GET /api/blogs/admin/list — all posts (any status)
router.get('/admin/list', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let i = 1;
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }
  const where = conditions.join(' AND ');
  try {
    const count = await query(`SELECT COUNT(*) as count FROM blog_posts WHERE ${where}`, params);
    const data  = await query(
      `SELECT id, title, slug, status, cover_image, author_name, published_at, view_count, created_at
       FROM blog_posts WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(String(count.rows[0]?.count ?? '0'));
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/blogs/admin/:id — single post for editing
router.get('/admin/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: Request, res: Response) => {
  try {
    const r = await query(`SELECT * FROM blog_posts WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
    res.json({ success: true, data: r.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/blogs — create new post (with optional cover image)
router.post('/', authenticate, authorize('super_admin', 'doctor'),
  upload.single('cover_image'),
  [
    body('title').notEmpty().trim().isLength({ max: 300 }).withMessage('Title required'),
    body('content').notEmpty().withMessage('Content required'),
    body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status'),
    validate,
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const { title, excerpt, content, tags, status, meta_title, meta_description } = req.body;
    const coverImage = req.file ? `/uploads/blog/${req.file.filename}` : null;
    const slug = slugify(title);
    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    try {
      const r = await query(
        `INSERT INTO blog_posts
           (title, slug, excerpt, content, cover_image, tags, status, author_id, author_name, published_at, meta_title, meta_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [title, slug, excerpt || null, content, coverImage, JSON.stringify(parsedTags),
         status || 'draft', req.user!.id, req.user!.name, publishedAt, meta_title || null, meta_description || null]
      );
      await auditFromRequest(req, 'blog_post_created', 'blog_post', r.rows[0].id, `Blog: "${title}"`);
      res.status(201).json({ success: true, data: r.rows[0], message: 'Post created' });
    } catch (err: any) {
      // Clean up uploaded file if DB insert fails
      if (req.file) fs.unlink(req.file.path, () => {});
      if (err.code === '23505') {
        res.status(409).json({ success: false, message: 'A post with this title already exists' });
      } else {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  }
);

// PUT /api/blogs/:id — update post (with optional new cover image)
router.put('/:id', authenticate, authorize('super_admin', 'doctor'),
  upload.single('cover_image'),
  [param('id').isUUID(), validate],
  async (req: AuthenticatedRequest, res: Response) => {
    const { title, excerpt, content, tags, status, meta_title, meta_description } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (title !== undefined)            { updates.push(`title = $${i++}`); values.push(title); }
    if (excerpt !== undefined)          { updates.push(`excerpt = $${i++}`); values.push(excerpt || null); }
    if (content !== undefined)          { updates.push(`content = $${i++}`); values.push(content); }
    if (meta_title !== undefined)       { updates.push(`meta_title = $${i++}`); values.push(meta_title || null); }
    if (meta_description !== undefined) { updates.push(`meta_description = $${i++}`); values.push(meta_description || null); }
    if (tags !== undefined) {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      updates.push(`tags = $${i++}`); values.push(JSON.stringify(parsedTags));
    }
    if (req.file) {
      updates.push(`cover_image = $${i++}`);
      values.push(`/uploads/blog/${req.file.filename}`);
    }
    if (status !== undefined) {
      updates.push(`status = $${i++}`); values.push(status);
      if (status === 'published') {
        updates.push(`published_at = COALESCE(published_at, NOW())`);
      }
    }

    if (!updates.length) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }
    values.push(req.params.id);

    try {
      const r = await query(
        `UPDATE blog_posts SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
        values
      );
      if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
      await auditFromRequest(req, 'blog_post_updated', 'blog_post', req.params.id);
      res.json({ success: true, data: r.rows[0], message: 'Post updated' });
    } catch {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /api/blogs/:id — soft delete
router.delete('/:id', authenticate, authorize('super_admin', 'doctor'), [param('id').isUUID(), validate], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await query(
      `UPDATE blog_posts SET deleted_at = NOW(), status = 'draft' WHERE id = $1 AND deleted_at IS NULL RETURNING title`,
      [req.params.id]
    );
    if (!r.rows[0]) { res.status(404).json({ success: false, message: 'Post not found' }); return; }
    await auditFromRequest(req, 'blog_post_deleted', 'blog_post', req.params.id, `Blog deleted: "${r.rows[0].title}"`);
    res.json({ success: true, message: 'Post deleted' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
