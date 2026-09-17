import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// ─── General API limiter ──────────────────────────────────────────────────────
// Dev: 5000 req / 15 min  |  Production: configurable via env
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: isDev ? 5000 : parseInt(process.env.RATE_LIMIT_MAX || '300'),
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin routes in dev mode entirely
    if (isDev && req.path.startsWith('/admin')) return true;
    return false;
  },
});

// ─── Auth limiter (login attempts) ────────────────────────────────────────────
// Dev: 50 attempts / 15 min  |  Production: 10 attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

// ─── OTP send limiter ─────────────────────────────────────────────────────────
// Dev: 50 per contact / 10 min  |  Production: 5
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 50 : parseInt(process.env.OTP_RATE_LIMIT_MAX || '5'),
  keyGenerator: (req) => req.body?.contact || req.ip || '',
  message: { success: false, message: 'Too many OTP requests. Please wait before requesting another OTP.' },
});

// ─── OTP verify limiter ───────────────────────────────────────────────────────
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyGenerator: (req) => req.body?.contact || req.ip || '',
  message: { success: false, message: 'Too many verification attempts. Please try again later.' },
});

// ─── Contact form limiter ─────────────────────────────────────────────────────
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 5,
  message: { success: false, message: 'Too many contact form submissions. Please try again in an hour.' },
});

// ─── Booking limiter ──────────────────────────────────────────────────────────
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { success: false, message: 'Too many booking attempts. Please try again later.' },
});
