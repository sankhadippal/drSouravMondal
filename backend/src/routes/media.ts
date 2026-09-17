/**
 * Media upload route — handles doctor profile image and other CMS images.
 * All images are stored in /uploads/media/ and their URLs saved to website_settings.
 */
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { auditFromRequest } from '../utils/auditLog';

const router = Router();

const mediaDir = path.join(__dirname, '..', '..', 'uploads', 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP allowed'));
  },
});

// POST /api/media/doctor-image — upload doctor profile photo
router.post('/doctor-image', authenticate, authorize('super_admin', 'doctor'),
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'Image file required' }); return; }
    const imageUrl = `/uploads/media/${req.file.filename}`;
    try {
      // Delete old file if exists
      const old = await query(`SELECT value FROM website_settings WHERE key = 'doctor_image_url'`);
      const oldUrl = old.rows[0]?.value as string;
      if (oldUrl && oldUrl.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', '..', oldUrl);
        fs.unlink(oldPath, () => {});
      }
      // Save new URL to settings
      await query(
        `INSERT INTO website_settings (key, value, category, updated_by)
         VALUES ('doctor_image_url', $1, 'doctor', $2)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
        [imageUrl, req.user!.id]
      );
      // Also update doctor_profiles table
      await query(
        `UPDATE doctor_profiles SET profile_image = $1, updated_at = NOW()`, [imageUrl]
      );
      await auditFromRequest(req, 'doctor_image_updated', 'media', undefined, `Doctor image updated`);
      res.json({ success: true, data: { url: imageUrl }, message: 'Doctor image updated' });
    } catch {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/media/general — upload any CMS image (logo, banner, etc.)
router.post('/general', authenticate, authorize('super_admin', 'doctor'),
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'Image file required' }); return; }
    const { settings_key } = req.body; // optional: save URL to a settings key
    const imageUrl = `/uploads/media/${req.file.filename}`;
    try {
      if (settings_key) {
        await query(
          `INSERT INTO website_settings (key, value, category, updated_by)
           VALUES ($1, $2, 'media', $3)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
          [settings_key, imageUrl, req.user!.id]
        );
      }
      res.json({ success: true, data: { url: imageUrl }, message: 'Image uploaded' });
    } catch {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

export default router;
