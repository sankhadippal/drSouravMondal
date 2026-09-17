import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Globe, Stethoscope, CheckCircle, Calendar, MapPin, Video } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { doctorAPI } from '../../services/api';
import { DoctorProfile } from '../../types';

export default function About() {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorAPI.get()
      .then(r => setDoctor(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-24"><LoadingSpinner size="lg" className="mx-auto" text="Loading profile..." /></div>;

  const fallback: DoctorProfile = {
    id: '',
    name: 'Dr. Sourav Kumar Mondal',
    title: 'Dr.',
    qualifications: 'B.H.M.S. (WBUHS)',
    registration_number: '',
    specialization: 'Homoeopathy',
    experience_years: 10,
    biography: 'Dr. Sourav Kumar Mondal is a qualified Homoeopathic physician holding B.H.M.S. from West Bengal University of Health Sciences (WBUHS). Trained under the guidance of Dr. Prasanta Banerji at the P. Banerji Homoeopathic Research Foundation, Elgin Road, Kolkata.',
    expertise: ['Cancer Treatment', 'Brain Tumor', 'Kidney Failure', 'Thalassemia', 'Diabetes', 'Arthritis', 'Brain Stroke', 'Gastric Problems', 'Liver Diseases', 'Skin Diseases'],
    certifications: ['B.H.M.S. - West Bengal University of Health Sciences (WBUHS)', 'Training under Dr. Prasanta Banerji (P. Banerji), Elgin Road, Kolkata'],
    awards: [],
    memberships: [],
    languages: ['Bengali', 'Hindi', 'English'],
    consultation_modes: ['in_person', 'online'],
    is_available_online: true,
    online_consultation_fee: 300,
    mobile: '7810880949',
    whatsapp: '7810880949',
  };
  const doc = doctor || fallback;

  return (
    <>
      <SEOHead
        title="About Dr. Sourav Kumar Mondal - Homoeopathic Physician"
        description="Learn about Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS), trained under Dr. Prasanta Banerji. Specialist in Cancer, Kidney Failure, Diabetes and complex diseases."
        url="/about"
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-16">
        <div className="page-container">
          <div className="max-w-3xl">
            <p className="text-teal-300 font-medium mb-2">About the Doctor</p>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">{doc.name}</h1>
            <p className="text-teal-200 text-lg">{doc.qualifications} • {doc.specialization}</p>
          </div>
        </div>
      </div>

      <div className="page-container py-16">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Photo */}
            <div className="card p-6 text-center">
              <div className="w-40 h-40 rounded-full bg-teal-50 border-4 border-teal-200 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {doc.profile_image ? (
                  <img src={doc.profile_image} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 80 80" className="w-24 h-24 text-teal-300">
                    <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.6" />
                    <path d="M10 72 Q10 50 40 50 Q70 50 70 72" fill="currentColor" opacity="0.4" />
                  </svg>
                )}
              </div>
              <h2 className="font-heading font-bold text-xl text-gray-900">{doc.name}</h2>
              <p className="text-teal-700 font-medium text-sm mt-1">{doc.qualifications}</p>
              <p className="text-gray-500 text-sm">{doc.specialization}</p>
              {doc.registration_number && (
                <p className="text-xs text-gray-400 mt-2">Reg: {doc.registration_number}</p>
              )}
            </div>

            {/* Contact */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
              <div className="space-y-3 text-sm">
                {doc.mobile && (
                  <a href={`tel:+91${doc.mobile}`} className="flex items-center gap-3 text-gray-600 hover:text-teal-700 transition-colors">
                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                    </div>
                    <span>{doc.mobile}</span>
                  </a>
                )}
                {doc.languages && (
                  <div className="flex items-start gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="w-4 h-4 text-teal-600" />
                    </div>
                    <span>{Array.isArray(doc.languages) ? doc.languages.join(', ') : doc.languages}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Link to="/appointment" className="btn-primary w-full justify-center text-sm py-2.5">
                  <Calendar className="w-4 h-4" /> Book Appointment
                </Link>
                <Link to="/online-consultation" className="btn-secondary w-full justify-center text-sm py-2.5">
                  <Video className="w-4 h-4" /> Online Consultation
                </Link>
              </div>
            </div>

            {/* Consultation modes */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Consultation Modes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-teal-600" /> In-Person Chamber Visit
                </div>
                {doc.is_available_online && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-teal-600" /> Online Consultation
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-teal-600" /> Medicine Dispatch Across India
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Biography */}
            {doc.biography && (
              <div className="card p-8">
                <h2 className="font-heading text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-700" /> Professional Biography
                </h2>
                <div className="prose prose-gray max-w-none">
                  {doc.biography.split('\n').map((para, i) => (
                    <p key={i} className="text-gray-600 leading-relaxed mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Expertise */}
            {doc.expertise && Array.isArray(doc.expertise) && doc.expertise.length > 0 && (
              <div className="card p-8">
                <h2 className="font-heading text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-700" /> Areas of Expertise
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {doc.expertise.map((e: string) => (
                    <div key={e} className="flex items-center gap-3 p-3 rounded-lg bg-teal-50">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 font-medium">{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications & Certifications */}
            {doc.certifications && Array.isArray(doc.certifications) && doc.certifications.length > 0 && (
              <div className="card p-8">
                <h2 className="font-heading text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-700" /> Qualifications & Certifications
                </h2>
                <div className="space-y-3">
                  {doc.certifications.map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4 text-teal-700" />
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awards */}
            {doc.awards && Array.isArray(doc.awards) && doc.awards.length > 0 && (
              <div className="card p-8">
                <h2 className="font-heading text-xl font-bold text-gray-900 mb-5">Awards & Recognition</h2>
                <div className="space-y-3">
                  {doc.awards.map((a: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-teal-700 rounded-2xl p-8 text-white text-center">
              <h3 className="font-heading text-2xl font-bold mb-3">Book a Consultation Today</h3>
              <p className="text-teal-200 mb-6">Available for in-person chamber visits and online consultations across India</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/appointment" className="bg-white text-teal-800 hover:bg-teal-50 font-semibold px-8 py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
                  <Calendar className="w-4 h-4" /> Book Appointment
                </Link>
                <Link to="/chambers" className="border-2 border-teal-400 text-teal-200 hover:bg-teal-600 font-semibold px-8 py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
                  <MapPin className="w-4 h-4" /> View Chambers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
