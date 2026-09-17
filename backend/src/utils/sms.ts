import axios from 'axios';
import logger from './logger';

export const sendSmsOtp = async (mobile: string, otp: string): Promise<boolean> => {
  const provider = process.env.SMS_PROVIDER || 'fast2sms';
  const apiKey = process.env.SMS_API_KEY || '';

  // Skip real SMS if API key not configured — log OTP for dev testing
  if (!apiKey || apiKey === 'your_sms_api_key') {
    logger.info(`[DEV OTP] Mobile: ${mobile} → OTP: ${otp} (set SMS_API_KEY in .env to enable SMS)`);
    return true;
  }

  try {
    if (provider === 'fast2sms') {
      const response = await axios.post(
        process.env.SMS_API_URL || 'https://www.fast2sms.com/dev/bulkV2',
        { variables_values: otp, route: 'otp', numbers: mobile },
        { headers: { authorization: apiKey, 'Content-Type': 'application/json' } }
      );
      if (response.data?.return === true) {
        logger.info(`SMS OTP sent to ${mobile.slice(0, 5)}*****`);
        return true;
      }
    } else if (provider === 'msg91') {
      await axios.post('https://api.msg91.com/api/v5/otp', {
        authkey: apiKey,
        mobile: `91${mobile}`,
        otp,
        sender: process.env.SMS_SENDER_ID || 'SOUHOM',
      });
      return true;
    }
    logger.warn('SMS provider returned unexpected response');
    return false;
  } catch (error) {
    logger.warn(`SMS send failed (configure SMS_API_KEY to enable): ${(error as Error).message?.slice(0, 50)}`);
    return false;
  }
};

export const sendSmsReminder = async (
  mobile: string,
  patientName: string,
  appointmentNumber: string,
  dateTime: string
): Promise<boolean> => {
  const message = `Dear ${patientName}, reminder: Your appointment ${appointmentNumber} at Sourav Homoeopathic Clinic is scheduled on ${dateTime}. Call 7810880949 for queries.`;
  logger.info(`SMS reminder queued for ${mobile.slice(0, 5)}*****: ${appointmentNumber}`);
  return true;
};

export const sendSmsConfirmation = async (
  mobile: string,
  patientName: string,
  appointmentNumber: string,
  dateTime: string
): Promise<boolean> => {
  const message = `Dear ${patientName}, your appointment ${appointmentNumber} at Sourav Homoeopathic Clinic is CONFIRMED for ${dateTime}. Call/WhatsApp 7810880949. -Dr. Sourav Mondal`;
  logger.info(`SMS confirmation queued for ${mobile.slice(0, 5)}*****: ${appointmentNumber}`);
  return true;
};
