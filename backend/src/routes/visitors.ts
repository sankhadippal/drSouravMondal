import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// POST /api/visitors/track - Called from frontend (privacy-conscious)
router.post('/track', async (req: Request, res: Response) => {
  const { session_id, page_path, referrer, device_type, browser, os, is_new_visitor } = req.body;
  if (!session_id || !page_path) {
    res.status(400).json({ success: false, message: 'Required fields missing' });
    return;
  }

  // Hash IP for privacy
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
  const ipHash = crypto.createHash('sha256').update(ip + (process.env.JWT_SECRET || 'salt')).digest('hex').slice(0, 16);

  try {
    await query(
      `INSERT INTO website_visitors (session_id, ip_hash, page_path, referrer, device_type, browser, os, is_new_visitor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        session_id,
        ipHash,
        page_path.slice(0, 500),
        referrer ? referrer.slice(0, 1000) : null,
        device_type || 'unknown',
        browser ? browser.slice(0, 100) : null,
        os ? os.slice(0, 100) : null,
        is_new_visitor !== false,
      ]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Tracking failed' });
  }
});

// GET /api/visitors - Admin
router.get('/', authenticate, authorize('super_admin', 'doctor'), async (req: Request, res: Response) => {
  const { page = '1', limit = '50', from_date, to_date } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, todayCount, uniqueSessions, topPages, deviceStats, refStats] = await Promise.all([
      query(`SELECT COUNT(*) FROM website_visitors`),
      query(`SELECT COUNT(*) as count FROM website_visitors WHERE date(created_at) = $1`, [today]),
      query(`SELECT COUNT(DISTINCT session_id) FROM website_visitors`),
      query(`SELECT page_path, COUNT(*) as visits FROM website_visitors GROUP BY page_path ORDER BY visits DESC LIMIT 10`),
      query(`SELECT device_type, COUNT(*) as count FROM website_visitors GROUP BY device_type`),
      query(`SELECT referrer, COUNT(*) as count FROM website_visitors WHERE referrer IS NOT NULL GROUP BY referrer ORDER BY count DESC LIMIT 10`),
    ]);

    // Recent visits with pagination
    let dateFilter = '';
    const params: unknown[] = [];
    let i = 1;
    if (from_date) { dateFilter += ` AND date(created_at) >= $${i++}`; params.push(from_date); }
    if (to_date) { dateFilter += ` AND date(created_at) <= $${i++}`; params.push(to_date); }

    const recentVisits = await query(
      `SELECT * FROM website_visitors WHERE 1=1${dateFilter} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_visits: parseInt(total.rows[0].count),
          today_visits: parseInt(todayCount.rows[0].count),
          unique_sessions: parseInt(uniqueSessions.rows[0].count),
        },
        top_pages: topPages.rows,
        device_stats: deviceStats.rows,
        referrer_stats: refStats.rows,
        recent_visits: recentVisits.rows,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/visitors/charts - Admin
router.get('/charts', authenticate, authorize('super_admin', 'doctor'), async (_req, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [byDay, byDevice] = await Promise.all([
      query(
        `SELECT date(created_at) as date, COUNT(*) as visits, COUNT(DISTINCT session_id) as unique_visitors
         FROM website_visitors WHERE date(created_at) >= $1
         GROUP BY date(created_at) ORDER BY date`,
        [thirtyDaysAgo]
      ),
      query(`SELECT device_type, COUNT(*) as count FROM website_visitors GROUP BY device_type`),
    ]);
    res.json({ success: true, data: { visits_by_day: byDay.rows, by_device: byDevice.rows } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
