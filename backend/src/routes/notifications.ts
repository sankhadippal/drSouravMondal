import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('super_admin', 'doctor'), async (req, res: Response) => {
  const { page = '1', limit = '20', status, type } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;
  if (status) { conditions.push(`n.status = $${i++}`); params.push(status); }
  if (type) { conditions.push(`n.type = $${i++}`); params.push(type); }
  const where = conditions.join(' AND ');
  try {
    const count = await query(`SELECT COUNT(*) FROM notifications n WHERE ${where}`, params);
    const data = await query(
      `SELECT n.*, p.name as patient_name FROM notifications n
       LEFT JOIN patients p ON p.id = n.patient_id
       WHERE ${where} ORDER BY n.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );
    const total = parseInt(count.rows[0].count);
    res.json({ success: true, data: data.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
