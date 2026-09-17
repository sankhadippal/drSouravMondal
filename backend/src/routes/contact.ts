import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import { contactLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { sendEmail } from '../utils/email';
import { AuthenticatedRequest } from '../types';

const router = Router();

// POST /api/contact - Public
router.post('/', contactLimiter, [
  body('name').notEmpty().trim().isLength({ max: 150 }).withMessage('Name required'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required'),
  body('message').notEmpty().isLength({ min: 10, max: 2000 }).trim().withMessage('Message (10-2000 chars) required'),
  validate,
], async (req: Request, res: Response) => {
  const { name, mobile, email, message } = req.body;
  try {
    const result = await query(
      `INSERT INTO contact_messages (name, mobile, email, message, status)
       VALUES ($1,$2,$3,$4,'new') RETURNING id`,
      [name, mobile, email || null, message]
    );

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New Contact Message from ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#0f766e;">New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Mobile:</strong> ${mobile}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p><strong>Message:</strong></p>
            <div style="background:#f3f4f6;padding:16px;border-radius:8px;">${message}</div>
          </div>
        `,
      });
    }

    res.status(201).json({ success: true, message: 'Message sent successfully. We will contact you soon.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

// GET /api/contact - Admin
router.get('/', authenticate, authorize('super_admin', 'doctor', 'staff'), async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = status ? [`status = $1`] : [];
  const params: unknown[] = status ? [status] : [];

  try {
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await query(`SELECT COUNT(*) FROM contact_messages ${where}`, params);
    const data = await query(
      `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(count.rows[0].count);
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/contact/:id - Admin update status
router.put('/:id', authenticate, authorize('super_admin', 'doctor', 'staff'), [
  param('id').isUUID(),
  body('status').isIn(['new', 'read', 'responded', 'closed']),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { status, admin_notes } = req.body;
  try {
    const result = await query(
      `UPDATE contact_messages SET status = $1, admin_notes = $2,
        responded_at = CASE WHEN $1 = 'responded' THEN NOW() ELSE responded_at END,
        responded_by = CASE WHEN $1 = 'responded' THEN $3 ELSE responded_by END,
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, admin_notes || null, req.user!.id, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'Message not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
