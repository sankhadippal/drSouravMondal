import { Link } from 'react-router-dom';
import { Video, Package, CheckCircle, Clock, Phone, Calendar, ArrowRight } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';

const STEPS = [
  { step: '01', title: 'Book Appointment', desc: 'Select Online Consultation and choose your preferred date and time slot.' },
  { step: '02', title: 'Verify & Pay', desc: 'Verify your mobile/email via OTP and complete secure payment through Razorpay.' },
  { step: '03', title: 'Receive Details', desc: 'Get appointment confirmation with consultation details via email and SMS.' },
  { step: '04', title: 'Consultation', desc: 'Connect with Dr. Mondal at the scheduled time for your consultation.' },
  { step: '05', title: 'Receive Medicine', desc: 'Medicines are prepared and dispatched via courier to your address across India.' },
];

export default function OnlineConsultation() {
  return (
    <>
      <SEOHead
        title="Online Consultation - Dr. Sourav Kumar Mondal"
        description="Book an online homoeopathic consultation with Dr. Sourav Kumar Mondal. Medicine dispatched across India by courier. Available for all complex diseases."
        url="/online-consultation"
      />

      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-16">
        <div className="page-container">
          <div className="max-w-3xl">
            <p className="text-teal-300 font-medium mb-2">Available Across India</p>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Online Consultation</h1>
            <p className="text-teal-200 text-lg leading-relaxed mb-8">
              Receive expert homoeopathic care from anywhere in India. Consult Dr. Sourav Kumar Mondal 
              online and get your medicines delivered to your doorstep.
            </p>
            <Link to="/appointment?type=online" className="bg-white text-teal-800 hover:bg-teal-50 font-bold px-8 py-4 rounded-xl inline-flex items-center gap-2 text-lg transition-colors shadow-lg">
              <Calendar className="w-5 h-5" /> Book Online Consultation
            </Link>
          </div>
        </div>
      </div>

      <div className="page-container py-16">
        {/* How it works */}
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">How It Works</h2>
          <p className="text-gray-500">Simple 5-step process to get started with your online consultation</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {STEPS.map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 bg-teal-700 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4 shadow-lg">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="card p-8">
            <h3 className="font-heading text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-teal-600" /> Benefits
            </h3>
            <ul className="space-y-3">
              {[
                'Consult from the comfort of your home',
                'Available across India — no travel needed',
                'Medicines dispatched via courier',
                'Secure and private consultation',
                'Follow-up support available',
                'Expert homoeopathic care for complex diseases',
              ].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-8">
            <h3 className="font-heading text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600" /> Medicine Dispatch
            </h3>
            <ul className="space-y-3">
              {[
                'Homoeopathic medicines prepared fresh',
                'Dispatched via reliable courier services',
                'Available to all Indian states',
                'Tracking details shared via SMS/email',
                'Proper packaging to ensure quality',
                'Follow-up consultations for dosage guidance',
              ].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                  <Package className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-teal-700 rounded-2xl p-10 text-white text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-teal-300" />
          <h3 className="font-heading text-2xl font-bold mb-3">Start Your Consultation Today</h3>
          <p className="text-teal-200 mb-6 max-w-lg mx-auto">
            Book your online appointment now. Secure payment, OTP verification, and expert care — all from your home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/appointment?type=online" className="bg-white text-teal-800 hover:bg-teal-50 font-semibold px-8 py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" /> Book Online Appointment
            </Link>
            <a href="https://wa.me/917810880949" target="_blank" rel="noopener noreferrer"
              className="border-2 border-teal-400 text-teal-200 hover:bg-teal-600 font-semibold px-8 py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-colors">
              <Phone className="w-4 h-4" /> WhatsApp: 7810880949
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
