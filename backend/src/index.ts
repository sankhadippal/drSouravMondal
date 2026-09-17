import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './utils/logger';

// Route imports
import authRoutes from './routes/auth';
import doctorRoutes from './routes/doctor';
import chambersRoutes from './routes/chambers';
import schedulesRoutes from './routes/schedules';
import blockedDatesRoutes from './routes/blockedDates';
import servicesRoutes from './routes/services';
import otpRoutes from './routes/otp';
import availabilityRoutes from './routes/availability';
import appointmentsRoutes from './routes/appointments';
import patientsRoutes from './routes/patients';
import paymentsRoutes from './routes/payments';
import visitorsRoutes from './routes/visitors';
import contactRoutes from './routes/contact';
import notificationsRoutes from './routes/notifications';
import faqsRoutes from './routes/faqs';
import settingsRoutes from './routes/settings';
import auditLogsRoutes from './routes/auditLogs';
import usersRoutes from './routes/users';
import exportRoutes from './routes/export';
import blogRoutes from './routes/blogs';
import galleryRoutes from './routes/gallery';
import reviewsRoutes from './routes/reviews';
import mediaRoutes from './routes/media';

// Cron jobs
import './services/cronJobs';

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'checkout.razorpay.com', 'maps.googleapis.com'],
      frameSrc: ["'self'", 'maps.googleapis.com'],
      connectSrc: ["'self'", 'api.razorpay.com'],
      imgSrc: ["'self'", 'data:', 'blob:', '*'],
    },
  },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Raw body for Razorpay webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Sourav Homoeopathic API is running', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/chambers', chambersRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/blocked-dates', blockedDatesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/media', mediaRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000');
app.listen(PORT, () => {
  logger.info(`✓ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
