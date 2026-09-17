import nodemailer from 'nodemailer';
import logger from './logger';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Skip email in dev if SMTP not configured
  if (process.env.NODE_ENV !== 'production') {
    const configured = process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com'
      && process.env.SMTP_PASSWORD && process.env.SMTP_PASSWORD !== 'your_app_password';
    if (!configured) {
      logger.debug(`[DEV] Email skipped (SMTP not configured): ${options.subject}`);
      return true;
    }
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Sourav Homoeopathic Clinic'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.warn('Email send failed (configure SMTP credentials to enable):', (error as Error).message?.slice(0, 60));
    return false;
  }
};

export const sendOtpEmail = async (email: string, otp: string, purpose: string): Promise<boolean> => {
  const subject = 'Your OTP - Sourav Homoeopathic Clinic';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
      <div style="background:#0f766e;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Sourav Homoeopathic Clinic</h1>
        <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px;">Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)</p>
      </div>
      <div style="padding:32px;background:#fff;">
        <h2 style="color:#1f2937;font-size:20px;margin-top:0;">Verification OTP</h2>
        <p style="color:#374151;font-size:15px;">Your One-Time Password for ${purpose} is:</p>
        <div style="background:#f0fdfa;border:2px dashed #0f766e;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <span style="font-size:40px;font-weight:bold;color:#0f766e;letter-spacing:12px;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This OTP is valid for <strong>${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>. Do not share this with anyone.</p>
        <p style="color:#6b7280;font-size:13px;">If you did not request this, please ignore this email.</p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
        <p style="margin:0;">© 2025 Sourav Homoeopathic Clinic | Call/WhatsApp: 7810880949</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendAppointmentConfirmationEmail = async (
  email: string,
  data: {
    appointmentNumber: string;
    patientName: string;
    doctorName: string;
    consultationType: string;
    chamberName?: string;
    chamberAddress?: string;
    date: string;
    time: string;
    fee: number;
    paymentId?: string;
  }
): Promise<boolean> => {
  const subject = `Appointment Confirmed - ${data.appointmentNumber} | Sourav Homoeopathic Clinic`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
      <div style="background:#0f766e;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Appointment Confirmed!</h1>
        <p style="color:#ccfbf1;margin:4px 0 0;">Sourav Homoeopathic Clinic</p>
      </div>
      <div style="padding:32px;background:#fff;">
        <div style="background:#f0fdfa;border-left:4px solid #0f766e;padding:16px;border-radius:4px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#374151;">Appointment ID: <strong style="color:#0f766e;">${data.appointmentNumber}</strong></p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Patient Name</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${data.patientName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Doctor</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${data.doctorName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Consultation Type</td><td style="padding:8px 0;color:#1f2937;font-weight:600;text-transform:capitalize;">${data.consultationType}</td></tr>
          ${data.chamberName ? `<tr><td style="padding:8px 0;color:#6b7280;">Chamber</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${data.chamberName}</td></tr>` : ''}
          ${data.chamberAddress ? `<tr><td style="padding:8px 0;color:#6b7280;">Address</td><td style="padding:8px 0;color:#1f2937;">${data.chamberAddress}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${data.date}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${data.time}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Fee Paid</td><td style="padding:8px 0;color:#0f766e;font-weight:700;">₹${data.fee}</td></tr>
          ${data.paymentId ? `<tr><td style="padding:8px 0;color:#6b7280;">Payment Ref</td><td style="padding:8px 0;color:#1f2937;">${data.paymentId}</td></tr>` : ''}
        </table>
        <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;">
          <p style="margin:0;font-size:13px;color:#92400e;">⚠️ <strong>Medical Disclaimer:</strong> This is an appointment confirmation only. Homoeopathic treatment outcomes vary by individual. No guarantees of cure are implied or expressed.</p>
        </div>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
        <p style="margin:0;">Need help? Call/WhatsApp: <strong>7810880949</strong></p>
        <p style="margin:4px 0 0;">© 2025 Sourav Homoeopathic Clinic</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendReminderEmail = async (
  email: string,
  data: { patientName: string; appointmentNumber: string; date: string; time: string; hoursAhead: number }
): Promise<boolean> => {
  const subject = `Appointment Reminder - Tomorrow at ${data.time} | Sourav Homoeopathic Clinic`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f766e;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">Appointment Reminder</h1>
      </div>
      <div style="padding:32px;background:#fff;">
        <p style="font-size:16px;color:#1f2937;">Dear <strong>${data.patientName}</strong>,</p>
        <p style="color:#374151;">This is a reminder that your appointment is scheduled in <strong>${data.hoursAhead} hours</strong>.</p>
        <div style="background:#f0fdfa;border:1px solid #0f766e;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;font-size:14px;"><strong>Appointment:</strong> ${data.appointmentNumber}</p>
          <p style="margin:8px 0 0;font-size:14px;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin:8px 0 0;font-size:14px;"><strong>Time:</strong> ${data.time}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;">For queries, call/WhatsApp: <strong>7810880949</strong></p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};
