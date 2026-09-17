import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  // Normalize: strip any time component and re-parse at local noon to avoid UTC offset shifting the day
  const clean = String(dateStr).split('T')[0]; // "2026-09-02"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return 'N/A';
  const date = new Date(clean + 'T12:00:00'); // noon local time — never affected by timezone
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  // Handle both "HH:MM" and "HH:MM:SS" formats
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-700',
  rescheduled: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
  processing: 'bg-blue-100 text-blue-800',
  new: 'bg-blue-100 text-blue-800',
  read: 'bg-gray-100 text-gray-700',
  responded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-500',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
};

export const downloadBlob = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const validateIndianMobile = (mobile: string): boolean =>
  /^[6-9]\d{9}$/.test(mobile);

export const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const truncate = (str: string, n: number): string =>
  str.length > n ? `${str.slice(0, n)}…` : str;

export const buildICSCalendarLink = (appointment: {
  appointmentNumber: string;
  patientName: string;
  date: string;
  time: string;
  endTime: string;
  chamberName?: string;
  chamberAddress?: string;
}): string => {
  // Normalize date (strip any ISO timestamp suffix)
  const dateClean = String(appointment.date).split('T')[0].replace(/-/g, '');
  const timeClean = String(appointment.time).slice(0, 5).replace(':', '') + '00';
  const endClean  = String(appointment.endTime).slice(0, 5).replace(':', '') + '00';
  const startDT = `${dateClean}T${timeClean}`;
  const endDT   = `${dateClean}T${endClean}`;
  const location = appointment.chamberName
    ? `${appointment.chamberName}${appointment.chamberAddress ? ', ' + appointment.chamberAddress : ''}`
    : 'Online Consultation';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART:${startDT}`,
    `DTEND:${endDT}`,
    `SUMMARY:Appointment - ${appointment.appointmentNumber}`,
    `DESCRIPTION:Appointment with Dr. Sourav Kumar Mondal\\nPatient: ${appointment.patientName}`,
    `LOCATION:${location}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\n');
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
};
