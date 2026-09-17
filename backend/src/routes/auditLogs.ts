import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('super_admin'), async (req, res: Response) => {
  const { page = '1', limit = '50', user_id, action, from_date, to_date } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;
  if (user_id) { conditions.push(`al.user_id = $${i++}`); params.push(user_id); }
  if (action) { conditions.push(`al.action ILIKE $${i++}`); params.push(`%${action}%`); }
  if (from_date) { conditions.push(`date(al.created_at) >= $${i++}`); params.push(from_date); }
  if (to_date) { conditions.push(`date(al.created_at) <= $${i++}`); params.push(to_date); }

  const where = conditions.join(' AND ');
  try {
    const count = await query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params);
    const data = await query(
      `SELECT al.* FROM audit_logs al WHERE ${where} ORDER BY al.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(count.rows[0].count);
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
