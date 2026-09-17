import { query } from '../config/db';

export const generateAppointmentNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `SHC${year}${month}${day}`;

  const result = await query(
    `SELECT COUNT(*) AS count FROM appointments WHERE appointment_number LIKE $1`,
    [`${prefix}%`]
  );
  const count = parseInt(String(result.rows[0]?.count ?? result.rows[0]?.COUNT ?? '0')) + 1;
  return `${prefix}${String(count).padStart(4, '0')}`;
};
