import cron from 'node-cron';
import { query } from '../config/db';
import { sendReminderEmail } from '../utils/email';
import { sendSmsReminder } from '../utils/sms';
import logger from '../utils/logger';

// ─── Release expired slot reservations every 5 minutes ───────────────────────
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date().toISOString();
    const result = await query(
      `UPDATE appointments
       SET status = 'cancelled'
       WHERE status = 'pending'
         AND slot_reserved_until < $1
         AND id NOT IN (SELECT appointment_id FROM payments WHERE status IN ('paid','processing'))`,
      [now]
    );
    if (result.rows.length > 0) {
      logger.info(`Released ${result.rows.length} expired slot reservation(s)`);
    }
  } catch (err) {
    logger.error('Cron: slot release failed', err);
  }
});

// ─── Send appointment reminders every 15 minutes ─────────────────────────────
cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date().toISOString();
    const pending = await query(
      `SELECT n.*, p.name as patient_name, p.email, p.mobile,
              a.appointment_number, a.appointment_date, a.appointment_time
       FROM notifications n
       JOIN patients p ON p.id = n.patient_id
       JOIN appointments a ON a.id = n.appointment_id
       WHERE n.status = 'pending'
         AND n.type IN ('reminder_24h','reminder_1h')
         AND n.scheduled_at <= $1
         AND a.status IN ('confirmed','pending')
       LIMIT 20`,
      [now]
    );

    for (const notif of pending.rows) {
      let sent = false;
      const hoursAhead = notif.type === 'reminder_24h' ? 24 : 1;

      if (notif.channel === 'email' && notif.recipient) {
        sent = await sendReminderEmail(notif.recipient, {
          patientName: notif.patient_name as string,
          appointmentNumber: notif.appointment_number as string,
          date: notif.appointment_date as string,
          time: notif.appointment_time as string,
          hoursAhead,
        });
      } else if (notif.channel === 'sms' && notif.mobile) {
        sent = await sendSmsReminder(
          notif.mobile as string,
          notif.patient_name as string,
          notif.appointment_number as string,
          `${notif.appointment_date} ${notif.appointment_time}`
        );
      }

      await query(
        `UPDATE notifications SET status = $1, sent_at = $2 WHERE id = $3`,
        [sent ? 'sent' : 'failed', sent ? new Date().toISOString() : null, notif.id]
      );
    }

    if (pending.rows.length > 0) {
      logger.info(`Processed ${pending.rows.length} reminder notification(s)`);
    }
  } catch (err) {
    logger.error('Cron: reminder send failed', err);
  }
});

// ─── Clean up old OTPs daily at 2am ──────────────────────────────────────────
cron.schedule('0 2 * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await query(`DELETE FROM otp_verifications WHERE expires_at < $1`, [cutoff]);
    logger.info('Cleaned up expired OTP records');
  } catch (err) {
    logger.error('Cron: OTP cleanup failed', err);
  }
});

// ─── Mark no-show appointments daily at 11pm ─────────────────────────────────
cron.schedule('0 23 * * *', async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `UPDATE appointments SET status = 'no_show'
       WHERE status = 'confirmed' AND appointment_date < $1`,
      [today]
    );
    if (result.rows.length > 0) {
      logger.info(`Marked ${result.rows.length} appointment(s) as no-show`);
    }
  } catch (err) {
    logger.error('Cron: no-show marking failed', err);
  }
});

logger.info('✓ Cron jobs initialized');
