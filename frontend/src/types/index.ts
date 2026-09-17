// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'doctor' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Doctor ───────────────────────────────────────────────────────────────────
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
  meta_title?: string;
  meta_description?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export interface Service {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  consultation_info?: string;
  sort_order: number;
  is_active: boolean;
}

// ─── Chamber ──────────────────────────────────────────────────────────────────
export interface ChamberSchedule {
  id?: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  break_start?: string;
  break_end?: string;
  slot_duration_minutes: number;
  max_patients_per_slot: number;
  consultation_fee?: number;
}

export interface Chamber {
  id: string;
  name: string;
  address: string;
  area?: string;
  city: string;
  state: string;
  pincode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  consultation_fee: number;
  status: 'active' | 'inactive';
  sort_order: number;
  schedules?: ChamberSchedule[];
  created_at: string;
  updated_at: string;
}

// ─── Blocked Date ─────────────────────────────────────────────────────────────
export interface BlockedDate {
  id: string;
  chamber_id?: string;
  date: string;
  reason: string;
  block_type: 'holiday' | 'personal_leave' | 'conference' | 'emergency' | 'other';
  is_all_chambers: boolean;
  created_at: string;
}

// ─── Availability ─────────────────────────────────────────────────────────────
export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_count: number;
  max_capacity: number;
  fee: number;
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
  total_appointments?: number;
  last_appointment?: string;
  created_at: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────
export type ConsultationType = 'online' | 'chamber';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  patient_name?: string;
  age?: number;
  sex?: string;
  mobile?: string;
  email?: string;
  chamber_id?: string;
  chamber_name?: string;
  chamber_address?: string;
  consultation_type: ConsultationType;
  appointment_date: string;
  appointment_time: string;
  slot_end_time: string;
  consultation_fee: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  meeting_link?: string;
  payment_status?: string;
  paid_amount?: number;
  cancelled_reason?: string;
  created_at: string;
  updated_at: string;
}

// ─── Booking Form ─────────────────────────────────────────────────────────────
export interface BookingFormData {
  consultation_type: ConsultationType | '';
  chamber_id: string;
  appointment_date: string;
  appointment_time: string;
  slot_end_time: string;
  slot_fee: number;
  patient: {
    name: string;
    age: string;
    sex: string;
    mobile: string;
    email: string;
    address: string;
  };
  reason: string;
  notes: string;
  otp_contact: string;
  otp_channel: 'mobile' | 'email';
  otp_verified: boolean;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  appointment_id: string;
  appointment_number?: string;
  patient_name?: string;
  mobile?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paid_at?: string;
  created_at: string;
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

// ─── Contact ──────────────────────────────────────────────────────────────────
export interface ContactMessage {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  message: string;
  status: 'new' | 'read' | 'responded' | 'closed';
  admin_notes?: string;
  created_at: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  today_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  online_consultations: number;
  chamber_consultations: number;
  today_revenue: number;
  monthly_revenue: number;
  total_patients: number;
}

// ─── Visitor Stats ────────────────────────────────────────────────────────────
export interface VisitorStats {
  total_visits: number;
  today_visits: number;
  unique_sessions: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  ip_address?: string;
  created_at: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export type WebsiteSettings = Record<string, string>;

// ─── Admin User ───────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}
