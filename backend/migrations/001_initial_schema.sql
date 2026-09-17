-- ============================================================
-- Sourav Homoeopathic Clinic - Complete Database Schema
-- PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS (Admin / Doctor / Staff) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(15) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin','doctor','staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_secret VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(50),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ─── DOCTOR PROFILE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL DEFAULT 'Dr. Sourav Kumar Mondal',
  title VARCHAR(100) NOT NULL DEFAULT 'Dr.',
  qualifications VARCHAR(500) NOT NULL DEFAULT 'B.H.M.S. (WBUHS)',
  registration_number VARCHAR(100),
  specialization VARCHAR(255) NOT NULL DEFAULT 'Homoeopathy',
  experience_years INTEGER NOT NULL DEFAULT 0,
  biography TEXT,
  expertise JSONB NOT NULL DEFAULT '[]',
  certifications JSONB NOT NULL DEFAULT '[]',
  awards JSONB NOT NULL DEFAULT '[]',
  memberships JSONB NOT NULL DEFAULT '[]',
  languages JSONB NOT NULL DEFAULT '["Bengali","Hindi","English"]',
  consultation_modes JSONB NOT NULL DEFAULT '["in_person","online"]',
  profile_image VARCHAR(500),
  email VARCHAR(255),
  mobile VARCHAR(15),
  whatsapp VARCHAR(15),
  social_links JSONB NOT NULL DEFAULT '{}',
  is_available_online BOOLEAN NOT NULL DEFAULT TRUE,
  online_consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SERVICES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  image VARCHAR(500),
  consultation_info TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_services_sort_order ON services(sort_order);
CREATE INDEX idx_services_is_active ON services(is_active);

-- ─── CHAMBERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chambers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  area VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL DEFAULT 'West Bengal',
  pincode VARCHAR(10),
  phone VARCHAR(15),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  google_maps_url TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chambers_status ON chambers(status);
CREATE INDEX idx_chambers_deleted_at ON chambers(deleted_at);

-- ─── CHAMBER SCHEDULES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chamber_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamber_id UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  break_start TIME,
  break_end TIME,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
  max_patients_per_slot INTEGER NOT NULL DEFAULT 1,
  consultation_fee NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chamber_id, day_of_week)
);
CREATE INDEX idx_chamber_schedules_chamber_id ON chamber_schedules(chamber_id);
CREATE INDEX idx_chamber_schedules_day ON chamber_schedules(day_of_week);

-- ─── BLOCKED DATES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamber_id UUID REFERENCES chambers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason VARCHAR(500),
  block_type VARCHAR(30) NOT NULL DEFAULT 'other'
    CHECK (block_type IN ('holiday','personal_leave','conference','emergency','other')),
  is_all_chambers BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blocked_dates_date ON blocked_dates(date);
CREATE INDEX idx_blocked_dates_chamber_id ON blocked_dates(chamber_id);

-- ─── PATIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 0 AND 150),
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('male','female','other')),
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patients_mobile ON patients(mobile);
CREATE INDEX idx_patients_email ON patients(email);

-- ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_number VARCHAR(20) UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  chamber_id UUID REFERENCES chambers(id) ON DELETE SET NULL,
  consultation_type VARCHAR(20) NOT NULL CHECK (consultation_type IN ('online','chamber')),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  slot_end_time TIME NOT NULL,
  consultation_fee NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','completed','cancelled','no_show','rescheduled')),
  reason TEXT,
  notes TEXT,
  meeting_link TEXT,
  rescheduled_from UUID REFERENCES appointments(id) ON DELETE SET NULL,
  cancelled_reason TEXT,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  slot_reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_chamber_id ON appointments(chamber_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_consultation_type ON appointments(consultation_type);
CREATE INDEX idx_appointments_number ON appointments(appointment_number);
-- Prevent double booking at DB level
CREATE UNIQUE INDEX idx_appointments_no_double_book
  ON appointments(chamber_id, appointment_date, appointment_time)
  WHERE status NOT IN ('cancelled','rescheduled') AND chamber_id IS NOT NULL;

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  razorpay_order_id VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100) UNIQUE,
  razorpay_signature VARCHAR(500),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed','refunded','cancelled')),
  payment_method VARCHAR(50),
  gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);

-- ─── REFUNDS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  razorpay_refund_id VARCHAR(100) UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','failed')),
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);

-- ─── OTP VERIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact VARCHAR(255) NOT NULL,
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('mobile','email')),
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(30) NOT NULL
    CHECK (purpose IN ('appointment_booking','contact_verification','admin_2fa')),
  attempts INTEGER NOT NULL DEFAULT 0,
  resend_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_contact ON otp_verifications(contact);
CREATE INDEX idx_otp_expires_at ON otp_verifications(expires_at);
CREATE INDEX idx_otp_purpose ON otp_verifications(purpose);

-- ─── WEBSITE VISITORS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) NOT NULL,
  ip_hash VARCHAR(100),
  page_path VARCHAR(500),
  referrer VARCHAR(1000),
  device_type VARCHAR(20) CHECK (device_type IN ('mobile','tablet','desktop','unknown')),
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  is_new_visitor BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_visitors_session ON website_visitors(session_id);
CREATE INDEX idx_visitors_created_at ON website_visitors(created_at);
CREATE INDEX idx_visitors_page_path ON website_visitors(page_path);

-- ─── CONTACT MESSAGES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','read','responded','closed')),
  admin_notes TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('booking_confirmed','payment_received','reminder_24h','reminder_1h',
                    'appointment_cancelled','appointment_rescheduled','general')),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_appointment_id ON notifications(appointment_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);

-- ─── FAQs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_faqs_sort_order ON faqs(sort_order);

-- ─── WEBSITE SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_website_settings_category ON website_settings(category);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(150),
  user_role VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  description TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ─── APPOINTMENT HISTORY ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appt_history_appointment_id ON appointment_history(appointment_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chambers_updated_at BEFORE UPDATE ON chambers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chamber_schedules_updated_at BEFORE UPDATE ON chamber_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
