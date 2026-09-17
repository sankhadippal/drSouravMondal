import { Router, Request, Response } from 'express';
import { query as dbQuery } from '../config/db';

const router = Router();

// GET /api/availability?chamber_id=&date=
// Returns available time slots for a given chamber and date
router.get('/', async (req: Request, res: Response) => {
  const { date, consultation_type } = req.query as Record<string, string>;
  // Treat "undefined" string (from Axios serialization) as absent
  const chamber_id = req.query.chamber_id && req.query.chamber_id !== 'undefined'
    ? String(req.query.chamber_id) : undefined;

  if (!date) {
    res.status(400).json({ success: false, message: 'Date is required' });
    return;
  }

  // Reject stale SQLite-era chamber IDs
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (chamber_id && !UUID_RE.test(chamber_id)) {
    res.json({ success: true, data: [], message: 'Invalid chamber ID. Please re-select a chamber.' });
    return;
  }

  // Validate date is not in the past
  const requestedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (requestedDate < today) {
    res.status(400).json({ success: false, message: 'Cannot book appointments in the past' });
    return;
  }

  // Check advance booking limit
  const advanceDays = parseInt(
    (await dbQuery(`SELECT value FROM website_settings WHERE key = 'booking_advance_days'`)).rows[0]?.value || '30'
  );
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceDays);
  if (requestedDate > maxDate) {
    res.status(400).json({ success: false, message: `Appointments can only be booked up to ${advanceDays} days in advance` });
    return;
  }

  try {
    // Check if date is blocked
    let blockedQuery = `SELECT id FROM blocked_dates WHERE date = $1 AND (is_all_chambers = true`;
    const blockedParams: unknown[] = [date];
    if (chamber_id) {
      blockedQuery += ` OR chamber_id = $2)`;
      blockedParams.push(chamber_id);
    } else {
      blockedQuery += `)`;
    }
    const blocked = await dbQuery(blockedQuery, blockedParams);
    if (blocked.rows.length > 0) {
      res.json({ success: true, data: [], message: 'No slots available on this date' });
      return;
    }

    // Get day of week (0=Sunday, 6=Saturday)
    const dayOfWeek = requestedDate.getDay();

    let schedule;
    if (consultation_type === 'online' || !chamber_id) {
      // For online consultation, use doctor's online availability
      const docResult = await dbQuery(`SELECT * FROM doctor_profiles LIMIT 1`);
      const doc = docResult.rows[0];
      if (!doc?.is_available_online) {
        res.json({ success: true, data: [], message: 'Online consultation not available' });
        return;
      }
      // Use a default online schedule - 10am-7pm Mon-Sat
      schedule = {
        is_available: dayOfWeek !== 0,
        start_time: '10:00',
        end_time: '19:00',
        break_start: '13:00',
        break_end: '14:00',
        slot_duration_minutes: 15,
        max_patients_per_slot: 1,
        consultation_fee: doc.online_consultation_fee,
      };
    } else {
      const schResult = await dbQuery(
        `SELECT cs.*, c.consultation_fee as chamber_fee
         FROM chamber_schedules cs
         JOIN chambers c ON c.id = cs.chamber_id
         WHERE cs.chamber_id = $1 AND cs.day_of_week = $2`,
        [chamber_id, dayOfWeek]
      );
      schedule = schResult.rows[0];
    }

    if (!schedule || !schedule.is_available) {
      res.json({ success: true, data: [], message: 'No schedule available on this day' });
      return;
    }

    // Get already-booked slots for this date/chamber
    const bookedQuery = consultation_type === 'online' || !chamber_id
      ? `SELECT appointment_time, COUNT(*) as booked_count
         FROM appointments
         WHERE appointment_date = $1 AND consultation_type = 'online'
           AND status NOT IN ('cancelled','rescheduled')
         GROUP BY appointment_time`
      : `SELECT appointment_time, COUNT(*) as booked_count
         FROM appointments
         WHERE appointment_date = $1 AND chamber_id = $2
           AND status NOT IN ('cancelled','rescheduled')
         GROUP BY appointment_time`;

    const bookedParams = consultation_type === 'online' || !chamber_id
      ? [date]
      : [date, chamber_id];

    const booked = await dbQuery(bookedQuery, bookedParams);
    const bookedMap: Record<string, number> = {};
    booked.rows.forEach((row: { appointment_time: string; booked_count: string }) => {
      const t = typeof row.appointment_time === 'string'
        ? row.appointment_time.slice(0, 5)
        : String(row.appointment_time).slice(0, 5);
      bookedMap[t] = parseInt(row.booked_count);
    });

    // Generate slots
    const slots = generateTimeSlots(
      schedule.start_time,
      schedule.end_time,
      schedule.slot_duration_minutes,
      schedule.break_start,
      schedule.break_end,
      bookedMap,
      schedule.max_patients_per_slot,
      requestedDate,
      schedule.consultation_fee || schedule.chamber_fee
    );

    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  breakStart: string | null,
  breakEnd: string | null,
  bookedMap: Record<string, number>,
  maxCapacity: number,
  date: Date,
  fee: number
) {
  const slots = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30; // 30min buffer

  const start = timeToMinutes(startTime.slice(0, 5));
  const end = timeToMinutes(endTime.slice(0, 5));
  const bStart = breakStart ? timeToMinutes(breakStart.slice(0, 5)) : null;
  const bEnd = breakEnd ? timeToMinutes(breakEnd.slice(0, 5)) : null;

  for (let t = start; t + duration <= end; t += duration) {
    const slotStart = minutesToTime(t);
    const slotEnd = minutesToTime(t + duration);

    // Skip break time
    if (bStart !== null && bEnd !== null) {
      if (t >= bStart && t < bEnd) continue;
    }

    // Skip past slots for today
    if (isToday && t < currentMinutes) continue;

    const booked = bookedMap[slotStart] || 0;
    const available = booked < maxCapacity;

    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      is_available: available,
      booked_count: booked,
      max_capacity: maxCapacity,
      fee,
    });
  }

  return slots;
}

// GET /api/availability/dates?chamber_id=&month=YYYY-MM
// Returns available dates in a month
router.get('/dates', async (req: Request, res: Response) => {
  const { month, consultation_type } = req.query as Record<string, string>;
  // Treat "undefined" string as absent
  const chamber_id = req.query.chamber_id && req.query.chamber_id !== 'undefined'
    ? String(req.query.chamber_id) : undefined;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ success: false, message: 'Month in YYYY-MM format required' });
    return;
  }

  // Reject stale SQLite-era chamber IDs
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (chamber_id && !UUID_RE.test(chamber_id)) {
    res.json({ success: true, data: [] });
    return;
  }

  try {
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const advanceDays = parseInt(
      (await dbQuery(`SELECT value FROM website_settings WHERE key = 'booking_advance_days'`)).rows[0]?.value || '30'
    );
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + advanceDays);

    // Get schedules for this chamber
    let availableDays: Set<number> = new Set();
    if (consultation_type === 'online' || !chamber_id) {
      // Mon-Sat available for online
      availableDays = new Set([1, 2, 3, 4, 5, 6]);
    } else {
      const schedResult = await dbQuery(
        `SELECT day_of_week FROM chamber_schedules WHERE chamber_id = $1 AND is_available = true`,
        [chamber_id]
      );
      schedResult.rows.forEach((r: { day_of_week: number }) => availableDays.add(r.day_of_week));
    }

    // Get blocked dates for this month
    let blockedQuery = `SELECT date FROM blocked_dates WHERE date >= $1 AND date <= $2 AND (is_all_chambers = true`;
    const bp: unknown[] = [`${year}-${String(mon).padStart(2, '0')}-01`, `${year}-${String(mon).padStart(2, '0')}-${daysInMonth}`];
    if (chamber_id) {
      blockedQuery += ` OR chamber_id = $3)`;
      bp.push(chamber_id);
    } else {
      blockedQuery += `)`;
    }
    const blockedResult = await dbQuery(blockedQuery, bp);
    const blockedSet = new Set(blockedResult.rows.map((r: Record<string, unknown>) => r.date as string));

    const available: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, mon - 1, d);
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      if (date < today) continue;
      if (date > maxDate) continue;
      if (!availableDays.has(date.getDay())) continue;
      if (blockedSet.has(dateStr)) continue;

      available.push(dateStr);
    }

    res.json({ success: true, data: available });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
