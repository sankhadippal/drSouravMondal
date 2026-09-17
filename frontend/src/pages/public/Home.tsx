import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Video, MapPin, Phone,
  Clock, Award, Users, ArrowRight, CheckCircle, Stethoscope,
} from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import { doctorAPI, servicesAPI, chambersAPI, settingsAPI } from '../../services/api';
import { DoctorProfile, Service, Chamber } from '../../types';
import { DAY_NAMES } from '../../utils';

import { imgUrl } from '../../utils/imageUrl';

// Default fallback values — overridden by CMS settings from admin panel
const DEFAULT: Record<string, string> = {
  hero_doctor_name:   'Dr. Sourav Kumar Mondal',
  hero_clinic_name:   'Sourav Homoeopathic Clinic',
  hero_tagline:       'Trained under the guidance of Dr. Prasanta Banerji (P. Banerji), Elgin Road, Kolkata. Specialized treatment for Cancer, Brain Tumor, Kidney Failure, Thalassemia, Diabetes, and other complex chronic diseases.',
  hero_badge_text:    'Homoeopathic Physician · B.H.M.S. (WBUHS)',
  hero_phone:         '7810880949',
  hero_online_badge:  'Online Consultation Available',
  hero_cta_primary:   'Book Appointment',
  hero_cta_secondary: 'Online Consultation',
  about_title:        'Expert Homoeopathic Care for Complex Diseases',
  about_body:         'Dr. Sourav Kumar Mondal holds a B.H.M.S. degree from West Bengal University of Health Sciences (WBUHS) and has trained under the renowned Dr. Prasanta Banerji at the P. Banerji Homoeopathic Research Foundation, Elgin Road, Kolkata.',
  about_body2:        'Specializing in the homoeopathic treatment of cancer, brain tumor, kidney failure, thalassemia, diabetes, and other complex chronic conditions, Dr. Mondal offers both in-person consultations and online consultations with medicine dispatch across India.',
  about_highlights:   '["Trained under Dr. Prasanta Banerji (P. Banerji), Kolkata","B.H.M.S. from WBUHS - West Bengal","Online consultations with all-India courier service","4 chamber locations in West Bengal"]',
};

const EXPERTISE = [
  'Cancer Treatment', 'Brain Tumor', 'Kidney Failure', 'Thalassemia',
  'Diabetes (Sugar)', 'Arthritis', 'Brain Stroke', 'Gastric Problems',
  'Liver Diseases', 'Skin Diseases', "Children's Health", 'Gynaecology',
];

const TRUST_STATS = [
  { icon: Users, label: 'Patients Treated', value: '5000+' },
  { icon: Clock, label: 'Years Experience', value: '10+' },
  { icon: MapPin, label: 'Chamber Locations', value: '4' },
  { icon: Award, label: 'Trained Under', value: 'Dr. P. Banerji' },
];

export default function Home() {
  const [doctor,   setDoctor]   = useState<DoctorProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [cms,      setCms]      = useState<Record<string, string>>({ ...DEFAULT });

  useEffect(() => {
    doctorAPI.get().then(r => setDoctor(r.data.data)).catch(() => {});
    servicesAPI.getAll().then(r => setServices(r.data.data?.slice(0, 6) || [])).catch(() => {});
    chambersAPI.getAll().then(r => setChambers(r.data.data?.slice(0, 4) || [])).catch(() => {});
    settingsAPI.getPublic().then(r => {
      const s = r.data.data as Record<string, string>;
      setCms(prev => ({ ...prev, ...s }));
    }).catch(() => {});
  }, []);

  // CMS-controlled values with defaults
  const c = (key: string) => cms[key] || DEFAULT[key] || '';
  const doctorName    = c('hero_doctor_name');
  const clinicName    = c('hero_clinic_name');
  const heroPhone     = c('hero_phone');
  const onlineBadge   = c('hero_online_badge');

  let highlights: string[] = [];
  try { highlights = JSON.parse(c('about_highlights')); } catch { highlights = []; }

  // Doctor image: settings key > doctor profile > placeholder
  const rawImgUrl    = cms.doctor_image_url || doctor?.profile_image || '';
  const doctorImgSrc = rawImgUrl ? imgUrl(rawImgUrl) : '';

  return (
    <>
      <SEOHead
        title={`${doctorName} | ${clinicName}`}
        description={c('hero_tagline').slice(0, 160)}
        url="/"
      />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-teal-800 text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-teal-800/30 rounded-bl-[100px] hidden lg:block" />

        <div className="page-container relative py-14 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="order-2 lg:order-1 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-teal-700/50 border border-teal-600/50 rounded-full px-4 py-1.5 text-sm text-teal-200 mb-5">
                <Stethoscope className="w-4 h-4 flex-shrink-0" />
                <span>{c('hero_badge_text')}</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3">
                {doctorName}
              </h1>

              <p className="text-teal-200 text-base sm:text-lg mb-2 font-medium">{clinicName}</p>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed max-w-lg">{c('hero_tagline')}</p>

              {/* Expertise pills */}
              <div className="flex flex-wrap gap-2 mb-7">
                {EXPERTISE.slice(0, 6).map(e => (
                  <span key={e} className="text-xs px-3 py-1 rounded-full bg-teal-800/60 border border-teal-700/50 text-teal-200">
                    {e}
                  </span>
                ))}
                <span className="text-xs px-3 py-1 rounded-full bg-teal-800/60 border border-teal-700/50 text-teal-200">
                  +6 more
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-7">
                <Link to="/appointment" className="btn-primary bg-white text-teal-800 hover:bg-teal-50 text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 justify-center">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  {c('hero_cta_primary')}
                </Link>
                <Link to="/online-consultation" className="btn-secondary border-teal-400 text-teal-200 hover:bg-teal-800 text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 justify-center">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  {c('hero_cta_secondary')}
                </Link>
                <Link to="/chambers" className="flex items-center justify-center gap-2 px-5 py-3 text-teal-200 hover:text-white text-sm font-medium transition-colors">
                  <MapPin className="w-4 h-4" /> Visit Chamber
                </Link>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 bg-teal-800/40 border border-teal-700/40 rounded-xl px-5 py-3 w-fit">
                <Phone className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-teal-400 font-medium">Call / WhatsApp</p>
                  <a href={`tel:+91${heroPhone}`} className="text-white font-bold text-lg hover:text-teal-300 transition-colors">
                    {heroPhone}
                  </a>
                </div>
              </div>
            </div>

            {/* Right — Doctor photo */}
            <div className="order-1 lg:order-2 flex flex-col items-center lg:items-end gap-5">
              <div className="relative w-full max-w-xs">
                <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-teal-800/50 border-2 border-teal-600/30 shadow-2xl flex items-center justify-center">
                  {doctorImgSrc ? (
                    <img src={doctorImgSrc} alt={doctorName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="flex flex-col items-center text-teal-400 p-6">
                      <div className="w-28 h-28 rounded-full bg-teal-700/50 border-2 border-teal-500/50 flex items-center justify-center mb-4">
                        <svg viewBox="0 0 80 80" className="w-18 h-18 text-teal-300">
                          <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.6" />
                          <path d="M10 72 Q10 50 40 50 Q70 50 70 72" fill="currentColor" opacity="0.4" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-center">{doctorName}</p>
                      <p className="text-xs text-teal-500">B.H.M.S. (WBUHS)</p>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-3 right-3 bg-white rounded-xl px-3 py-2 shadow-lg">
                  <p className="text-xs text-gray-500">Trained Under</p>
                  <p className="text-xs sm:text-sm font-bold text-teal-800">Dr. P. Banerji</p>
                </div>
              </div>

              <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-3 text-center">
                <div className="flex items-center gap-2 text-green-400 font-medium text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow flex-shrink-0" />
                  {onlineBadge}
                </div>
                <p className="text-xs text-green-300/70 mt-1">Medicine dispatched across India</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust Stats ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="page-container py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {TRUST_STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-teal-700" />
                </div>
                <div className="text-2xl font-bold font-heading text-gray-900">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-14 bg-teal-50/40">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-teal-700 font-semibold text-sm uppercase tracking-wider mb-3">About the Doctor</p>
              <h2 className="section-title mb-4">{c('about_title')}</h2>
              <p className="text-gray-600 leading-relaxed mb-4">{c('about_body')}</p>
              <p className="text-gray-600 leading-relaxed mb-6">{c('about_body2')}</p>
              <div className="space-y-3 mb-8">
                {highlights.map((item: string) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/about" className="btn-primary inline-flex">
                Learn More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPERTISE.map(e => (
                <div key={e} className="bg-white rounded-xl px-4 py-3.5 shadow-card border border-gray-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 font-medium">{e}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Preview ── */}
      {services.length > 0 && (
        <section className="py-14 bg-white">
          <div className="page-container">
            <div className="text-center mb-10">
              <p className="text-teal-700 font-semibold text-sm uppercase tracking-wider mb-3">What We Treat</p>
              <h2 className="section-title">Our Specializations</h2>
              <p className="section-subtitle mx-auto">Homoeopathic treatment for a wide range of chronic and complex conditions</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {services.map(service => (
                <div key={service.id} className="card-hover p-6 group">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                    <Stethoscope className="w-6 h-6 text-teal-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{service.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link to="/services" className="btn-outline text-base px-8 py-3">
                View All Services <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Chambers Preview ── */}
      {chambers.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="page-container">
            <div className="text-center mb-10">
              <p className="text-teal-700 font-semibold text-sm uppercase tracking-wider mb-3">Visit Us</p>
              <h2 className="section-title">Chamber Locations</h2>
              <p className="section-subtitle mx-auto">Conveniently located across West Bengal</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {chambers.map(chamber => (
                <div key={chamber.id} className="card-hover p-5">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5 text-teal-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{chamber.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{chamber.area || chamber.address}, {chamber.city}</p>
                  {chamber.schedules && chamber.schedules.filter(s => s.is_available).length > 0 && (
                    <p className="text-xs text-teal-600 font-medium">
                      {chamber.schedules.filter(s => s.is_available).map(s => DAY_NAMES[s.day_of_week].slice(0, 3)).join(', ')}
                    </p>
                  )}
                  <p className="text-teal-700 font-bold mt-2">₹{chamber.consultation_fee}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link to="/chambers" className="btn-outline text-base px-8 py-3">
                View All Chambers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Online Consultation CTA ── */}
      <section className="py-14 bg-teal-700 text-white">
        <div className="page-container text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-teal-300" />
          <h2 className="section-title text-white mb-4">Online Consultation Available</h2>
          <p className="text-teal-200 max-w-xl mx-auto mb-8 leading-relaxed">
            Can't visit in person? Book an online consultation. Medicines are dispatched via courier across India.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/online-consultation" className="bg-white text-teal-800 hover:bg-teal-50 font-semibold px-8 py-3.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
              <Video className="w-5 h-5" />
              Book Online Consultation
            </Link>
            <a href={`https://wa.me/91${heroPhone}`} target="_blank" rel="noopener noreferrer"
              className="border-2 border-teal-400 text-teal-200 hover:bg-teal-600 font-semibold px-8 py-3.5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
              <Phone className="w-5 h-5" />
              WhatsApp: {heroPhone}
            </a>
          </div>
        </div>
      </section>

    </>
  );
}
