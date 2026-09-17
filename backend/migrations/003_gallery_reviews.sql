-- ============================================================
-- Gallery Images & Patient Reviews
-- ============================================================

-- Gallery images (auto-scrolling banner above footer)
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200),
  caption TEXT,
  image_url VARCHAR(600) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gallery_sort   ON gallery_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery_images(is_active);
CREATE TRIGGER update_gallery_updated_at BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Patient reviews (public submit → admin approval → show on site)
CREATE TABLE IF NOT EXISTS patient_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name VARCHAR(150) NOT NULL,
  patient_location VARCHAR(100),
  rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  treatment_for VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  ip_hash VARCHAR(64),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_status   ON patient_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON patient_reviews(is_featured);
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON patient_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional CMS settings for full content control
INSERT INTO website_settings (key, value, category) VALUES
  ('hero_badge_text',           'Homoeopathic Physician · B.H.M.S. (WBUHS)', 'hero'),
  ('hero_doctor_name',          'Dr. Sourav Kumar Mondal', 'hero'),
  ('hero_clinic_name',          'Sourav Homoeopathic Clinic', 'hero'),
  ('hero_tagline',              'Trained under the guidance of Dr. Prasanta Banerji (P. Banerji), Elgin Road, Kolkata. Specialized treatment for Cancer, Brain Tumor, Kidney Failure, Thalassemia, Diabetes, and other complex chronic diseases.', 'hero'),
  ('hero_cta_primary',          'Book Appointment', 'hero'),
  ('hero_cta_secondary',        'Online Consultation', 'hero'),
  ('hero_phone',                '7810880949', 'hero'),
  ('hero_online_badge',         'Online Consultation Available', 'hero'),
  ('about_title',               'Expert Homoeopathic Care for Complex Diseases', 'about'),
  ('about_body',                'Dr. Sourav Kumar Mondal holds a B.H.M.S. degree from West Bengal University of Health Sciences (WBUHS) and has trained under the renowned Dr. Prasanta Banerji at the P. Banerji Homoeopathic Research Foundation, Elgin Road, Kolkata.', 'about'),
  ('about_body2',               'Specializing in the homoeopathic treatment of cancer, brain tumor, kidney failure, thalassemia, diabetes, and other complex chronic conditions, Dr. Mondal offers both in-person consultations and online consultations with medicine dispatch across India.', 'about'),
  ('about_highlights',          '["Trained under Dr. Prasanta Banerji (P. Banerji), Kolkata","B.H.M.S. from WBUHS - West Bengal","Online consultations with all-India courier service","4 chamber locations in West Bengal"]', 'about'),
  ('footer_about_text',         'Expert homoeopathic care for complex and chronic diseases. Trained under Dr. Prasanta Banerji, Elgin Road, Kolkata. Online consultations with medicine dispatch across India.', 'footer'),
  ('footer_phone',              '7810880949', 'footer'),
  ('footer_email',              'drsouravkumarmondal@gmail.com', 'footer'),
  ('footer_copyright',          'Sourav Homoeopathic Clinic. All rights reserved.', 'footer'),
  ('gallery_section_title',     'Our Clinic Gallery', 'gallery'),
  ('gallery_section_subtitle',  'A glimpse of our clinic and happy patients', 'gallery'),
  ('gallery_enabled',           'true', 'gallery'),
  ('reviews_section_title',     'What Our Patients Say', 'reviews'),
  ('reviews_section_subtitle',  'Real experiences from our patients across India', 'reviews'),
  ('reviews_enabled',           'true', 'reviews'),
  ('reviews_allow_submit',      'true', 'reviews'),
  ('doctor_image_url',          '', 'doctor'),
  ('announcement_text',         'Online consultations available. Medicines dispatched via courier across India. Call/WhatsApp: 7810880949', 'general'),
  ('announcement_active',       'true', 'general')
ON CONFLICT (key) DO NOTHING;
