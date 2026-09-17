import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import SEOHead from '../../components/ui/SEOHead';
import { contactAPI, getErrorMessage } from '../../services/api';

interface ContactForm { name: string; mobile: string; email: string; message: string; }

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactForm>();

  const onSubmit = async (data: ContactForm) => {
    setLoading(true);
    try {
      await contactAPI.send(data);
      toast.success('Message sent! We will contact you soon.');
      setSent(true);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Us - Sourav Homoeopathic Clinic"
        description="Contact Dr. Sourav Kumar Mondal at 7810880949. Chambers in Kolkata, Mechogram, Debra and Fuleswar. Online consultations available."
        url="/contact"
      />

      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-16">
        <div className="page-container">
          <p className="text-teal-300 font-medium mb-2">Get in Touch</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">Contact Us</h1>
          <p className="text-teal-200">Reach out for appointments, queries or to learn more about our treatments.</p>
        </div>
      </div>

      <div className="page-container py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-8">Contact Information</h2>
            <div className="space-y-5 mb-8">
              <a href="tel:+917810880949" className="flex items-start gap-4 p-5 card-hover group">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                  <Phone className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Phone / WhatsApp</p>
                  <p className="text-teal-700 font-bold text-lg">7810880949</p>
                  <p className="text-xs text-gray-500 mt-1">Call or WhatsApp for appointments and queries</p>
                </div>
              </a>

              <a href="mailto:drsouravkumarmondal@gmail.com" className="flex items-start gap-4 p-5 card-hover group">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                  <Mail className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-teal-700">drsouravkumarmondal@gmail.com</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-5 card">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Chamber Locations</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>Kolkata (Dhakuria), West Bengal</li>
                    <li>Mechogram, West Bengal</li>
                    <li>Debra, West Bengal</li>
                    <li>Fuleswar, West Bengal</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 card">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Consultation Hours</p>
                  <p className="text-sm text-gray-600">Varies by chamber location. Online consultations available Mon–Sat.</p>
                  <p className="text-sm text-teal-700 font-medium mt-1">Book online for exact slot availability.</p>
                </div>
              </div>
            </div>

            <a href="https://wa.me/917810880949" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-6 py-3.5 rounded-xl font-semibold transition-colors shadow-md w-full justify-center">
              <MessageCircle className="w-5 h-5" />
              Chat on WhatsApp
            </a>
          </div>

          {/* Contact Form */}
          <div className="card p-8">
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>

            {sent ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm">We will contact you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="btn-outline mt-4 text-sm">Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label className="label">Full Name <span className="text-red-500">*</span></label>
                  <input
                    {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                    className={`input-field ${errors.name ? 'input-error' : ''}`}
                    placeholder="Your full name"
                  />
                  {errors.name && <p className="error-msg">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    {...register('mobile', { required: 'Mobile required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit Indian mobile number' } })}
                    className={`input-field ${errors.mobile ? 'input-error' : ''}`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    type="tel"
                  />
                  {errors.mobile && <p className="error-msg">{errors.mobile.message}</p>}
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <input
                    {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter valid email' } })}
                    className={`input-field ${errors.email ? 'input-error' : ''}`}
                    placeholder="your@email.com"
                    type="email"
                  />
                  {errors.email && <p className="error-msg">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="label">Message <span className="text-red-500">*</span></label>
                  <textarea
                    {...register('message', { required: 'Message is required', minLength: { value: 10, message: 'Min 10 characters' } })}
                    className={`input-field resize-none ${errors.message ? 'input-error' : ''}`}
                    rows={5}
                    placeholder="Describe your condition or query..."
                  />
                  {errors.message && <p className="error-msg">{errors.message.message}</p>}
                </div>

                <p className="text-xs text-gray-400">Your information is kept strictly confidential and used only to respond to your query.</p>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                  {loading ? 'Sending...' : (<><Send className="w-4 h-4" /> Send Message</>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
