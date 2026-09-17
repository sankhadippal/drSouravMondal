import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { auditFromRequest } from '../utils/auditLog';
import { AuthenticatedRequest } from '../types';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password required'),
  validate,
], async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await query(
      `SELECT id, name, email, mobile, password_hash, role, is_active, two_fa_enabled
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update last login
    await query(
      `UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`,
      [(req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress, user.id]
    );

    await auditFromRequest(req as AuthenticatedRequest, 'admin_login', 'user', user.id, `${user.name} logged in`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err: any) {
    // Give a clear message for DB connection failures
    if (err?.code === 'ECONNREFUSED' || err?.message?.includes('connect')) {
      res.status(503).json({ success: false, message: 'Database not connected. Please set up PostgreSQL and run migrations. See README for setup instructions.' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'Refresh token required' });
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const result = await query(
      `SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [payload.id]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }
    const newPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
    res.json({
      success: true,
      data: { accessToken: generateAccessToken(newPayload) },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, email, mobile, role, is_active, two_fa_enabled, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await auditFromRequest(req, 'admin_logout', 'user', req.user!.id, `${req.user!.name} logged out`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
], async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user!.id]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, req.user!.id]);
    await auditFromRequest(req, 'password_changed', 'user', req.user!.id, 'Password changed');
    res.json({ success: true, message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
