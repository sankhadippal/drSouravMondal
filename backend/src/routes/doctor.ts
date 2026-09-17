import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/doctor - Public
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM doctor_profiles LIMIT 1`);
    if (!result.rows[0]) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/doctor - Admin only
router.put('/', authenticate, authorize('super_admin', 'doctor'), [
  body('name').optional().isLength({ max: 150 }).trim(),
  body('qualifications').optional().isLength({ max: 500 }).trim(),
  body('experience_years').optional().isInt({ min: 0 }),
  body('online_consultation_fee').optional().isFloat({ min: 0 }),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const fields = [
    'name', 'title', 'qualifications', 'registration_number', 'specialization',
    'experience_years', 'biography', 'expertise', 'certifications', 'awards',
    'memberships', 'languages', 'consultation_modes', 'email', 'mobile', 'whatsapp',
    'social_links', 'is_available_online', 'online_consultation_fee', 'profile_image',
    'meta_title', 'meta_description',
  ];
  const jsonFields = ['expertise', 'certifications', 'awards', 'memberships', 'languages', 'consultation_modes', 'social_links'];

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      let value = req.body[field];
      if (jsonFields.includes(field) && typeof value !== 'string') {
        value = JSON.stringify(value);
      }
      updates.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, message: 'No fields to update' });
    return;
  }

  try {
    const existing = await query(`SELECT id FROM doctor_profiles LIMIT 1`);
    let result;
    if (existing.rows.length === 0) {
      result = await query(`INSERT INTO doctor_profiles (name) VALUES ('Dr. Sourav Kumar Mondal') RETURNING id`);
    }
    const profileId = existing.rows[0]?.id || result?.rows[0].id;

    const updateResult = await query(
      `UPDATE doctor_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      [...values, profileId]
    );

    await auditFromRequest(req, 'doctor_profile_updated', 'doctor_profile', profileId, 'Doctor profile updated');
    res.json({ success: true, data: updateResult.rows[0], message: 'Profile updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
