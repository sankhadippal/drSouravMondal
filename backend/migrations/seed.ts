import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sourav_homoeopathic',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create super admin
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const hash = await bcrypt.hash(adminPassword, 12);
    const adminResult = await client.query(`
      INSERT INTO users (name, email, mobile, password_hash, role)
      VALUES ('Dr. Sourav Kumar Mondal', $1, '7810880949', $2, 'super_admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id
    `, [process.env.ADMIN_EMAIL || 'admin@souravhomoeopathic.com', hash]);

    const adminId = adminResult.rows[0].id;

    // Create doctor profile
    await client.query(`
      INSERT INTO doctor_profiles (
        user_id, name, title, qualifications, registration_number,
        specialization, experience_years, biography, expertise,
        certifications, languages, consultation_modes,
        mobile, whatsapp, email, is_available_online, online_consultation_fee
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT DO NOTHING
    `, [
      adminId,
      'Dr. Sourav Kumar Mondal',
      'Dr.',
      'B.H.M.S. (WBUHS)',
      '',
      'Homoeopathy',
      10,
      'Dr. Sourav Kumar Mondal is a qualified Homoeopathic physician holding B.H.M.S. from West Bengal University of Health Sciences (WBUHS). He has trained under the guidance of the renowned Dr. Prasanta Banerji at the P. Banerji Homoeopathic Research Foundation, Elgin Road, Kolkata. Dr. Mondal specializes in the treatment of complex and chronic diseases including cancer, brain tumor, kidney failure, thalassemia, diabetes, arthritis, brain stroke, and various other conditions. He offers both in-person chamber consultations and online consultations with medicine dispatch across India.',
      JSON.stringify(['Cancer Treatment', 'Brain Tumor', 'Kidney Failure', 'Thalassemia', 'Diabetes (Sugar)', 'Arthritis', 'Brain Stroke', 'Gastric Problems', 'Liver Diseases', 'Skin Diseases', 'Children\'s Health', 'Obstetrics & Gynaecology', 'Complex & Chronic Diseases', 'Confidential Health Issues']),
      JSON.stringify(['B.H.M.S. - West Bengal University of Health Sciences (WBUHS)', 'Training under Dr. Prasanta Banerji (P. Banerji), Elgin Road, Kolkata']),
      JSON.stringify(['Bengali', 'Hindi', 'English']),
      JSON.stringify(['in_person', 'online']),
      '7810880949',
      '7810880949',
      'drsouravkumarmondal@gmail.com',
      true,
      300.00,
    ]);

    // Create chambers
    const chamberIds: string[] = [];

    const chambersData = [
      {
        name: 'Kolkata Chamber (Dhakuria)',
        address: 'Dhakuria',
        area: 'Dhakuria',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700031',
        phone: '7810880949',
        lat: 22.5050,
        lng: 88.3656,
        fee: 400.00,
      },
      {
        name: 'Mechogram Chamber',
        address: 'Mechogram',
        area: 'Mechogram',
        city: 'Mechogram',
        state: 'West Bengal',
        pincode: '',
        phone: '7810880949',
        lat: null,
        lng: null,
        fee: 300.00,
      },
      {
        name: 'Debra Chamber',
        address: 'Debra',
        area: 'Debra',
        city: 'Debra',
        state: 'West Bengal',
        pincode: '721124',
        phone: '7810880949',
        lat: null,
        lng: null,
        fee: 300.00,
      },
      {
        name: 'Fuleswar Chamber',
        address: 'Fuleswar',
        area: 'Fuleswar',
        city: 'Fuleswar',
        state: 'West Bengal',
        pincode: '',
        phone: '7810880949',
        lat: null,
        lng: null,
        fee: 300.00,
      },
    ];

    for (const ch of chambersData) {
      const r = await client.query(`
        INSERT INTO chambers (name, address, area, city, state, pincode, phone, latitude, longitude, consultation_fee, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [ch.name, ch.address, ch.area, ch.city, ch.state, ch.pincode, ch.phone, ch.lat, ch.lng, ch.fee]);
      if (r.rows.length > 0) chamberIds.push(r.rows[0].id);
    }

    // Create default schedules for first chamber
    if (chamberIds.length > 0) {
      const defaultSchedules = [
        { day: 1, avail: true, start: '10:00', end: '13:00' },
        { day: 2, avail: true, start: '17:00', end: '20:00' },
        { day: 3, avail: true, start: '10:00', end: '13:00' },
        { day: 4, avail: true, start: '17:00', end: '20:00' },
        { day: 5, avail: true, start: '10:00', end: '13:00' },
        { day: 6, avail: true, start: '10:00', end: '14:00' },
        { day: 0, avail: false, start: null, end: null },
      ];
      for (const s of defaultSchedules) {
        await client.query(`
          INSERT INTO chamber_schedules (chamber_id, day_of_week, is_available, start_time, end_time, slot_duration_minutes, max_patients_per_slot)
          VALUES ($1,$2,$3,$4,$5,15,1)
          ON CONFLICT (chamber_id, day_of_week) DO NOTHING
        `, [chamberIds[0], s.day, s.avail, s.start, s.end]);
      }
    }

    // Default FAQs
    const faqs = [
      { q: 'How can I book an appointment?', a: 'You can book an appointment online through our website by clicking "Book Appointment". Select your consultation type, choose a date and time slot, fill in your details, verify your mobile/email via OTP, and complete the payment.', cat: 'booking' },
      { q: 'How does online consultation work?', a: 'For online consultation, select "Online Consultation" while booking. After successful payment, you will receive consultation details. Dr. Mondal will connect with you at the scheduled time. Medicines are dispatched via courier across India.', cat: 'online' },
      { q: 'What is the consultation fee?', a: 'Consultation fees vary by chamber and consultation type. Online consultation fees and chamber-specific fees are displayed during the booking process. Please check the Chambers page for detailed fee information.', cat: 'fees' },
      { q: 'Where are the chambers located?', a: 'Dr. Mondal\'s chambers are located in Kolkata (Dhakuria), Mechogram, Debra, and Fuleswar in West Bengal. Full addresses and directions are available on the Chambers page.', cat: 'general' },
      { q: 'How can I cancel my appointment?', a: 'To cancel an appointment, please contact us at 7810880949 as soon as possible. Cancellations made well in advance may be eligible for a refund as per our cancellation policy.', cat: 'booking' },
      { q: 'Can I reschedule my appointment?', a: 'Yes, appointments can be rescheduled subject to availability. Please contact us at least 24 hours before your scheduled appointment. Rescheduling is subject to our rescheduling policy.', cat: 'booking' },
      { q: 'Are medicines available for online patients?', a: 'Yes. For online consultations, homoeopathic medicines are dispatched through courier to locations across India. Courier charges may apply depending on location.', cat: 'online' },
      { q: 'What conditions does Dr. Mondal treat?', a: 'Dr. Mondal specializes in treatment of cancer, brain tumor, kidney failure, thalassemia, diabetes, arthritis, brain stroke, gastric problems, liver diseases, skin diseases, and other complex chronic conditions using homoeopathic medicine.', cat: 'general' },
    ];

    for (let i = 0; i < faqs.length; i++) {
      await client.query(`
        INSERT INTO faqs (question, answer, category, sort_order, is_active)
        VALUES ($1,$2,$3,$4,true) ON CONFLICT DO NOTHING
      `, [faqs[i].q, faqs[i].a, faqs[i].cat, i]);
    }

    // Default website settings
    const settings = [
      ['site_name', 'Sourav Homoeopathic Clinic', 'general'],
      ['site_tagline', 'Expert Homoeopathic Care for Complex Diseases', 'general'],
      ['contact_phone', '7810880949', 'general'],
      ['contact_whatsapp', '7810880949', 'general'],
      ['contact_email', 'drsouravkumarmondal@gmail.com', 'general'],
      ['contact_address', 'Kolkata (Dhakuria), West Bengal', 'general'],
      ['default_slot_duration', '15', 'appointment'],
      ['booking_advance_days', '30', 'appointment'],
      ['cancellation_policy', 'Appointments can be cancelled up to 24 hours before the scheduled time for a full refund. No refunds for cancellations within 24 hours.', 'appointment'],
      ['currency', 'INR', 'payment'],
      ['online_consultation_fee', '300', 'payment'],
      ['reminder_24h_enabled', 'true', 'notification'],
      ['reminder_1h_enabled', 'true', 'notification'],
      ['meta_title', 'Dr. Sourav Kumar Mondal - Homoeopathic Physician | Sourav Homoeopathic Clinic', 'seo'],
      ['meta_description', 'Expert Homoeopathic treatment for Cancer, Diabetes, Kidney Failure, Brain Tumor & more. Online consultations available. Medicine dispatched across India. Call 7810880949.', 'seo'],
      ['announcement_text', 'Online consultations available. Medicines dispatched via courier across India. Call/WhatsApp: 7810880949', 'general'],
      ['announcement_active', 'true', 'general'],
    ];

    for (const [key, value, category] of settings) {
      await client.query(`
        INSERT INTO website_settings (key, value, category)
        VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value = $2
      `, [key, value, category]);
    }

    // Default services
    const services = [
      { name: 'Cancer Treatment', desc: 'Homoeopathic treatment for various types of cancer under the guidance of protocols developed with Dr. Prasanta Banerji.', icon: 'shield-plus' },
      { name: 'Brain Tumor', desc: 'Specialized homoeopathic care for brain tumor patients with focus on quality of life improvement.', icon: 'brain' },
      { name: 'Kidney Failure', desc: 'Homoeopathic management of kidney diseases and chronic kidney failure to slow progression and improve function.', icon: 'activity' },
      { name: 'Thalassemia', desc: 'Supportive homoeopathic treatment for thalassemia patients to manage symptoms and improve quality of life.', icon: 'droplets' },
      { name: 'Diabetes (Sugar)', desc: 'Holistic management of Type 1 and Type 2 diabetes through individualized homoeopathic treatment.', icon: 'thermometer' },
      { name: 'Arthritis', desc: 'Effective homoeopathic remedies for all types of arthritis including rheumatoid and osteoarthritis.', icon: 'bone' },
      { name: 'Brain Stroke', desc: 'Post-stroke rehabilitation support and recovery assistance through homoeopathic treatment.', icon: 'zap' },
      { name: 'Gastric Problems', desc: 'Treatment of gastritis, GERD, IBS, and other gastrointestinal disorders.', icon: 'circle-dot' },
      { name: 'Liver Diseases', desc: 'Homoeopathic care for liver conditions including fatty liver, hepatitis, and cirrhosis support.', icon: 'heart-pulse' },
      { name: 'Skin Diseases', desc: 'Treatment of chronic skin conditions including eczema, psoriasis, urticaria, and fungal infections.', icon: 'scan-face' },
      { name: "Children's Health", desc: 'Gentle and effective homoeopathic treatment for pediatric conditions and childhood diseases.', icon: 'baby' },
      { name: 'Obstetrics & Gynaecology', desc: 'Homoeopathic care for women including pregnancy support, PCOS, menstrual disorders, and menopausal issues.', icon: 'heart' },
    ];

    for (let i = 0; i < services.length; i++) {
      await client.query(`
        INSERT INTO services (name, description, icon, sort_order, is_active)
        VALUES ($1,$2,$3,$4,true) ON CONFLICT DO NOTHING
      `, [services[i].name, services[i].desc, services[i].icon, i]);
    }

    await client.query('COMMIT');
    console.log('✓ Database seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
