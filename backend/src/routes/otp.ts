import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { query } from '../config/db';
import { generateOtp, hashOtp, verifyOtp, getOtpExpiry } from '../utils/otp';
import { sendOtpEmail } from '../utils/email';
import { sendSmsOtp } from '../utils/sms';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';

const router = Router();

const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
const RESEND_COOLDOWN = parseInt(process.env.OTP_RESEND_COOLDOWN_MINUTES || '2');

// POST /api/otp/send
router.post('/send', otpSendLimiter, [
  body('contact').notEmpty().withMessage('Contact (mobile or email) required'),
  body('channel').isIn(['mobile', 'email']).withMessage('Channel must be mobile or email'),
  body('purpose').isIn(['appointment_booking', 'contact_verification', 'admin_2fa']).withMessage('Invalid purpose'),
  validate,
], async (req: Request, res: Response) => {
  const { contact, channel, purpose } = req.body;

  // Validate contact format
  if (channel === 'mobile' && !/^[6-9]\d{9}$/.test(contact)) {
    res.status(400).json({ success: false, message: 'Invalid Indian mobile number' });
    return;
  }
  if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    res.status(400).json({ success: false, message: 'Invalid email address' });
    return;
  }

  try {
    // Check resend cooldown
    const cooldownTime = new Date(Date.now() - RESEND_COOLDOWN * 60 * 1000).toISOString();
    const recent = await query(
      `SELECT id, resend_count, created_at FROM otp_verifications
       WHERE contact = $1 AND channel = $2 AND purpose = $3
         AND created_at > $4
         AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [contact, channel, purpose, cooldownTime]
    );

    if (recent.rows[0]) {
      const secondsLeft = Math.ceil(
        (RESEND_COOLDOWN * 60) - (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000
      );
      res.status(429).json({
        success: false,
        message: `Please wait ${secondsLeft} seconds before requesting a new OTP`,
      });
      return;
    }

    // Invalidate old OTPs for same contact/purpose
    await query(
      `UPDATE otp_verifications SET is_verified = true WHERE contact = $1 AND purpose = $2 AND is_verified = false`,
      [contact, purpose]
    );

    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp);
    const expiresAt = getOtpExpiry();

    await query(
      `INSERT INTO otp_verifications (contact, channel, otp_hash, purpose, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [contact, channel, otpHash, purpose, expiresAt]
    );

    let sent = false;
    if (channel === 'email') {
      sent = await sendOtpEmail(contact, otp, purpose.replace('_', ' '));
    } else {
      sent = await sendSmsOtp(contact, otp);
    }

    // In development, return OTP in response for testing
    const devData = process.env.NODE_ENV === 'development' ? { otp } : {};

    res.json({
      success: true,
      message: `OTP sent to your ${channel === 'email' ? 'email address' : 'mobile number'}`,
      data: {
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
        ...devData,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/otp/verify
router.post('/verify', otpVerifyLimiter, [
  body('contact').notEmpty(),
  body('channel').isIn(['mobile', 'email']),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Invalid OTP'),
  body('purpose').isIn(['appointment_booking', 'contact_verification', 'admin_2fa']),
  validate,
], async (req: Request, res: Response) => {
  const { contact, channel, otp, purpose } = req.body;

  try {
    // Get latest unverified OTP
    const result = await query(
      `SELECT id, otp_hash, attempts, expires_at FROM otp_verifications
       WHERE contact = $1 AND channel = $2 AND purpose = $3
         AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [contact, channel, purpose]
    );

    if (!result.rows[0]) {
      res.status(400).json({ success: false, message: 'No active OTP found. Please request a new OTP.' });
      return;
    }

    const record = result.rows[0];

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      await query(`UPDATE otp_verifications SET is_verified = true WHERE id = $1`, [record.id]);
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Check max attempts
    if (record.attempts >= MAX_ATTEMPTS) {
      await query(`UPDATE otp_verifications SET is_verified = true WHERE id = $1`, [record.id]);
      res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
      return;
    }

    const isValid = await verifyOtp(otp, record.otp_hash);

    if (!isValid) {
      await query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
      return;
    }

    // Mark as verified — leave is_verified = true so appointment creation check works.
    // The appointment route also checks is_verified = true with a time window.
    await query(`UPDATE otp_verifications SET is_verified = true WHERE id = $1`, [record.id]);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: { verified: true, contact, channel },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

export default router;
