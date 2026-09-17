import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle, Calendar, Clock, MapPin, User, Phone,
  Download, Printer, Home, IndianRupee, Video, Share2
} from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { appointmentsAPI, getErrorMessage } from '../../services/api';
import { formatDate, formatTime, buildICSCalendarLink } from '../../utils';
import toast from 'react-hot-toast';

export default function AppointmentConfirmation() {
  const { appointmentNumber } = useParams<{ appointmentNumber: string }>();
  const [appt, setAppt] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentNumber) { setError('Invalid appointment'); setLoading(false); return; }
    appointmentsAPI.getConfirmation(appointmentNumber)
      .then(r => setAppt(r.data.data))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [appointmentNumber]);

  if (loading) return <div className="py-24"><LoadingSpinner size="lg" className="mx-auto" text="Loading confirmation..." /></div>;
  if (error || !appt) return (
    <div className="py-24 text-center">
      <p className="text-red-600 mb-4">{error || 'Appointment not found'}</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );

  const isPaid = appt.payment_status === 'paid';
  const isOnline = appt.consultation_type === 'online';

  // Build PDF data once — used by both Print and Download buttons
  const pdfData = {
    appointment_number:   appt.appointment_number as string,
    patient_name:         appt.patient_name as string,
    age:                  appt.age as number,
    sex:                  appt.sex as string,
    mobile:               appt.mobile as string,
    consultation_type:    appt.consultation_type as string,
    appointment_date:     String(appt.appointment_date || '').slice(0, 10),
    appointment_time:     String(appt.appointment_time || '').slice(0, 5),
    slot_end_time:        String(appt.slot_end_time || '').slice(0, 5),
    consultation_fee:     appt.consultation_fee as number,
    paid_amount:          appt.paid_amount as number,
    payment_status:       appt.payment_status as string,
    razorpay_payment_id:  appt.razorpay_payment_id as string,
    status:               appt.status as string,
    chamber_name:         appt.chamber_name as string,
    chamber_address:      appt.chamber_address as string,
    chamber_city:         appt.city as string,
    chamber_phone:        appt.chamber_phone as string,
    reason:               appt.reason as string,
  };

  const handlePrintOrDownload = (mode: 'print' | 'download') => {
    try {
      if (mode === 'print') {
        // Use jsPDF autoPrint for a print dialog instead of window.print()
        import('../../utils/pdfReceipt').then(({ generateAppointmentPDF }) => {
          generateAppointmentPDF(pdfData, 'print');
        });
      } else {
        import('../../utils/pdfReceipt').then(({ generateAppointmentPDF }) => {
          generateAppointmentPDF(pdfData, 'download');
          toast.success('PDF downloaded!');
        });
      }
    } catch {
      toast.error('PDF generation failed. Please try again.');
    }
  };

  const icsLink = buildICSCalendarLink({
    appointmentNumber: appt.appointment_number as string,
    patientName: appt.patient_name as string,
    date: appt.appointment_date as string,
    time: appt.appointment_time as string,
    endTime: appt.slot_end_time as string,
    chamberName: appt.chamber_name as string | undefined,
    chamberAddress: appt.chamber_address as string | undefined,
  });

  return (
    <>
      <SEOHead title={`Appointment Confirmed - ${appt.appointment_number}`} />

      <div className="min-h-screen bg-gray-50 py-10">
        <div className="page-container max-w-2xl">

          {/* Success Header */}
          <div className={`rounded-2xl p-8 mb-6 text-center ${isPaid ? 'bg-gradient-to-br from-teal-700 to-teal-900' : 'bg-gradient-to-br from-yellow-500 to-orange-600'} text-white`}>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold mb-2">
              {isPaid ? 'Appointment Confirmed!' : 'Appointment Pending'}
            </h1>
            <p className="text-white/80 mb-4">
              {isPaid ? 'Your appointment has been successfully booked and payment received.' : 'Payment pending for this appointment.'}
            </p>
            <div className="bg-white/20 rounded-xl px-6 py-3 inline-block">
              <p className="text-xs text-white/70">Appointment ID</p>
              <p className="text-xl font-bold tracking-wider">{appt.appointment_number as string}</p>
            </div>
          </div>

          {/* Details Card */}
          <div className="card p-6 mb-5">
            <h2 className="font-semibold text-gray-900 mb-5 text-lg">Appointment Details</h2>
            <div className="space-y-4">
              <DetailRow icon={User} label="Patient Name" value={appt.patient_name as string} />
              <DetailRow icon={Calendar} label="Date" value={formatDate(appt.appointment_date as string)} />
              <DetailRow icon={Clock} label="Time" value={`${formatTime(appt.appointment_time as string)} – ${formatTime(appt.slot_end_time as string)}`} />
              <DetailRow
                icon={isOnline ? Video : MapPin}
                label="Consultation Type"
                value={isOnline ? 'Online Consultation' : 'Chamber Visit'}
              />
              {(!isOnline && Boolean(appt.chamber_name)) && (
                <DetailRow icon={MapPin} label="Chamber" value={`${appt.chamber_name as string}${appt.chamber_address ? `, ${appt.chamber_address as string}` : ''}`} />
              )}
              {(!isOnline && Boolean(appt.chamber_phone)) && (
                <DetailRow icon={Phone} label="Chamber Phone" value={appt.chamber_phone as string} />
              )}
              <DetailRow
                icon={IndianRupee}
                label="Consultation Fee"
                value={`₹${appt.paid_amount || appt.consultation_fee}`}
                valueClass="text-teal-700 font-bold"
              />
              {Boolean(appt.razorpay_payment_id) && (
                <DetailRow icon={CheckCircle} label="Payment Reference" value={appt.razorpay_payment_id as string} valueClass="text-gray-500 text-xs font-mono" />
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-5">
            <p className="text-sm text-teal-800 font-medium mb-1">For any queries regarding your appointment:</p>
            <a href="tel:+917810880949" className="text-teal-700 font-bold text-lg hover:underline">📞 7810880949</a>
            <p className="text-xs text-teal-600 mt-1">Call / WhatsApp available</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
            <button
              onClick={() => handlePrintOrDownload('download')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-200 transition-colors text-sm text-gray-600"
            >
              <Download className="w-5 h-5 text-teal-600" />
              Download PDF
            </button>
            <button
              onClick={() => handlePrintOrDownload('print')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-200 transition-colors text-sm text-gray-600"
            >
              <Printer className="w-5 h-5 text-teal-600" />
              Print Receipt
            </button>
            <a
              href={icsLink}
              download={`appointment-${appt.appointment_number}.ics`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <Calendar className="w-5 h-5 text-gray-500" />
              Add to Calendar
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Appointment Confirmed', text: `Appointment ${appt.appointment_number as string} confirmed with Dr. Sourav Kumar Mondal`, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                }
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <Share2 className="w-5 h-5 text-gray-500" />
              Share
            </button>
            <Link
              to="/"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <Home className="w-5 h-5 text-gray-500" />
              Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ icon: Icon, label, value, valueClass = '' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-teal-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-gray-800 break-words ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
