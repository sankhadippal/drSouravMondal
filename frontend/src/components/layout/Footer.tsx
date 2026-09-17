import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';

export default function Footer() {
  const year = new Date().getFullYear();
  const [s, setS] = useState<Record<string, string>>({});

  useEffect(() => {
    settingsAPI.getPublic().then(r => setS(r.data.data || {})).catch(() => {});
  }, []);

  const clinicName   = s.site_name        || 'Sourav Homoeopathic Clinic';
  const aboutText    = s.footer_about_text || 'Expert homoeopathic care for complex and chronic diseases. Trained under Dr. Prasanta Banerji, Elgin Road, Kolkata. Online consultations with medicine dispatch across India.';
  const phone        = s.footer_phone      || s.hero_phone || '7810880949';
  const email        = s.footer_email      || s.contact_email || 'drsouravkumarmondal@gmail.com';
  const copyright    = s.footer_copyright  || `${clinicName}. All rights reserved.`;

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="page-container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <path d="M20 6 L20 34 M6 20 L34 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="font-heading font-bold text-white text-lg leading-tight">{clinicName}</div>
                <div className="text-xs text-teal-400">Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4 text-gray-400 max-w-sm">
              {aboutText}
            </p>
            <div className="space-y-2 text-sm">
              <a href={`tel:+91${phone}`} className="flex items-center gap-2 hover:text-teal-400 transition-colors">
                <Phone className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span>{phone} (Call / WhatsApp)</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-teal-400 transition-colors min-w-0">
                <Mail className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span className="break-all text-sm">{email}</span>
              </a>
            </div>
          </div>

          {/* Chambers */}
          <div>
            <h3 className="font-semibold text-white mb-4">Chambers</h3>
            <ul className="space-y-3 text-sm">
              {[
                { name: 'Kolkata (Dhakuria)', area: 'Kolkata, West Bengal' },
                { name: 'Mechogram', area: 'West Bengal' },
                { name: 'Debra', area: 'West Bengal' },
                { name: 'Fuleswar', area: 'West Bengal' },
              ].map(c => (
                <li key={c.name} className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-gray-200">{c.name}</div>
                    <div className="text-gray-500 text-xs">{c.area}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[
                { to: '/about', label: 'About Doctor' },
                { to: '/services', label: 'Our Services' },
                { to: '/chambers', label: 'Chamber Locations' },
                { to: '/online-consultation', label: 'Online Consultation' },
                { to: '/appointment', label: 'Book Appointment' },
                { to: '/faq', label: 'FAQs' },
                { to: '/blog', label: 'Health Blog' },
                { to: '/contact', label: 'Contact Us' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-teal-400 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="page-container py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {year} {copyright}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/privacy-policy" className="hover:text-teal-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms-conditions" className="hover:text-teal-400 transition-colors">Terms & Conditions</Link>
            <Link to="/cancellation-policy" className="hover:text-teal-400 transition-colors">Cancellation Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
