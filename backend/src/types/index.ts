import { Request } from 'express';

// ─── User / Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'doctor' | 'staff';

export interface User {
  id: string;
  email: string;
  mobile?: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  two_fa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

// ─── Doctor Profile ───────────────────────────────────────────────────────────
export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  qualifications: string;
  registration_number: string;
  specialization: string;
  experience_years: number;
  biography: string;
  expertise: string[];
  certifications: string[];
  awards: string[];
  memberships: string[];
  languages: string[];
  consultation_modes: string[];
  profile_image?: string;
  email?: string;
  mobile?: string;
  whatsapp?: string;
  social_links?: Record<string, string>;
  is_available_online: boolean;
  online_consultation_fee: number;
  created_at: Date;
  updated_at: Date;
}

// ─── Chamber ──────────────────────────────────────────────────────────────────
export interface Chamber {
  id: string;
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  consultation_fee: number;
  status: 'active' | 'inactive';
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ─── Chamber Schedule ─────────────────────────────────────────────────────────
export interface ChamberSchedule {
  id: string;
  chamber_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  break_start?: string;
  break_end?: string;
  slot_duration_minutes: number;
  max_patients_per_slot: number;
  consultation_fee?: number;
  created_at: Date;
  updated_at: Date;
}

// ─── Blocked Date ─────────────────────────────────────────────────────────────
export interface BlockedDate {
  id: string;
  chamber_id?: string;
  date: string;
  reason: string;
  block_type: 'holiday' | 'personal_leave' | 'conference' | 'emergency' | 'other';
  is_all_chambers: boolean;
  created_by: string;
  created_at: Date;
}

// ─── Patient ──────────────────────────────────────────────────────────────────
export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  mobile: string;
  email?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Appointment ──────────────────────────────────────────────────────────────
export type ConsultationType = 'online' | 'chamber';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  chamber_id?: string;
  consultation_type: ConsultationType;
  appointment_date: string;
  appointment_time: string;
  slot_end_time: string;
  consultation_fee: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  meeting_link?: string;
  rescheduled_from?: string;
  cancelled_reason?: string;
  cancelled_by?: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  appointment_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export type OtpPurpose = 'appointment_booking' | 'contact_verification' | 'admin_2fa';
export type OtpChannel = 'mobile' | 'email';

export interface OtpVerification {
  id: string;
  contact: string;
  channel: OtpChannel;
  otp_hash: string;
  purpose: OtpPurpose;
  attempts: number;
  resend_count: number;
  is_verified: boolean;
  expires_at: Date;
  created_at: Date;
}

// ─── Slot ─────────────────────────────────────────────────────────────────────
export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_count: number;
  max_capacity: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface WebsiteSetting {
  key: string;
  value: string;
  category: string;
  description?: string;
  updated_at: Date;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}
