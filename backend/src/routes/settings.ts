import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/settings - Public (non-sensitive only)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT key, value, category FROM website_settings
       WHERE category NOT IN ('payment','notification') OR key IN ('currency','online_consultation_fee')
       ORDER BY category, key`
    );
    // Convert to key-value map
    const settings: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/settings/admin - Admin (all settings)
router.get('/admin', authenticate, authorize('super_admin', 'doctor'), async (_req, res: Response) => {
  try {
    const result = await query(`SELECT * FROM website_settings ORDER BY category, key`);
    const settings: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/settings - Admin (bulk update)
router.put('/', authenticate, authorize('super_admin', 'doctor'), async (req: AuthenticatedRequest, res: Response) => {
  const settings = req.body as Record<string, string>;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ success: false, message: 'Settings object required' });
    return;
  }

  // Sensitive keys only super_admin can update
  const sensitiveKeys = ['razorpay_key_id', 'razorpay_key_secret', 'smtp_password', 'sms_api_key'];
  for (const key of sensitiveKeys) {
    if (settings[key] !== undefined && req.user!.role !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admin can update payment/notification credentials' });
      return;
    }
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO website_settings (key, value, category, updated_by, updated_at)
         VALUES ($1, $2, 'general', $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, req.user!.id]
      );
    }
    await auditFromRequest(req, 'settings_updated', 'website_settings', undefined, `${Object.keys(settings).length} settings updated`);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
