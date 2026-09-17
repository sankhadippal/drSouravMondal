import { useState, useEffect } from 'react';
import { ChevronLeft, CreditCard, Shield, Lock, IndianRupee, CheckCircle, AlertCircle, Beaker } from 'lucide-react';
import toast from 'react-hot-toast';
import { BookingFormData } from '../../../types';
import { paymentsAPI, getErrorMessage } from '../../../services/api';
import { formatTime } from '../../../utils';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string;
  order_id: string; prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>; theme: { color: string };
  handler: (r: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}
interface RazorpayInstance { open(): void; }
interface RazorpayResponse {
  razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
}

interface Props {
  form: BookingFormData;
  appointmentId: string;
  appointmentNumber: string;
  onConfirmed: (apptId: string, apptNumber: string) => void;
  onBack: () => void;
}

export default function Step7Payment({ form, appointmentId, appointmentNumber, onConfirmed, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [razorpayConfigured, setRazorpayConfigured] = useState<boolean | null>(null);

  // Check if Razorpay is configured by making a test order request
  useEffect(() => {
    if (!appointmentId) return;
    paymentsAPI.createOrder(appointmentId)
      .then(() => setRazorpayConfigured(true))
      .catch((err) => {
        const msg = err?.response?.data?.message || '';
        if (msg.includes('not configured') || msg.includes('503')) {
          setRazorpayConfigured(false);
        } else {
          setRazorpayConfigured(true); // other error, assume configured
        }
      });
  }, [appointmentId]);

  const formattedDate = form.appointment_date
    ? new Date(form.appointment_date + 'T12:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  // ── Demo payment (when Razorpay not configured) ───────────────────────────
  const handleDemoPayment = async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      // Call a backend endpoint that confirms appointment without payment
      await paymentsAPI.demoConfirm(appointmentId);
      toast.success('Demo payment successful! Appointment confirmed.');
      onConfirmed(appointmentId, appointmentNumber);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Real Razorpay payment ─────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!appointmentId) { toast.error('Appointment not found. Please restart booking.'); return; }
    setLoading(true);
    try {
      const orderRes = await paymentsAPI.createOrder(appointmentId);
      const { orderId, amount, currency, key, patientName, email, mobile } = orderRes.data.data;

      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please refresh the page.');
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key, amount, currency,
        name: 'Sourav Homoeopathic Clinic',
        description: `Appointment ${appointmentNumber} — Dr. Sourav Kumar Mondal`,
        order_id: orderId,
        prefill: { name: patientName, email: email || '', contact: mobile || '' },
        notes: { appointment_number: appointmentNumber },
        theme: { color: '#0f766e' },
        handler: async (response: RazorpayResponse) => {
          try {
            await paymentsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              appointment_id: appointmentId,
            });
            toast.success('Payment successful! Appointment confirmed.');
            onConfirmed(appointmentId, appointmentNumber);
          } catch {
            toast.error('Payment verification failed. Please contact support with your appointment number.');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled. Your slot is reserved for 30 minutes.');
            setLoading(false);
          },
        },
      });
      rzp.open();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Complete Payment</h2>
      <p className="text-gray-500 mb-5">Review your appointment and proceed to payment.</p>

      {/* Razorpay not configured banner */}
      {razorpayConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Razorpay not configured (dev mode)</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Add real Razorpay test keys to <code className="bg-amber-100 px-1 rounded">backend/.env</code>:
              <br />
              <code className="text-amber-800 font-mono">RAZORPAY_KEY_ID=rzp_test_...</code>
              <br />
              <code className="text-amber-800 font-mono">RAZORPAY_KEY_SECRET=your_secret</code>
              <br />
              <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer"
                className="text-teal-700 underline text-xs">Get free test keys at dashboard.razorpay.com →</a>
            </p>
          </div>
        </div>
      )}

      {/* Appointment Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-teal-600" /> Appointment Summary
        </h3>
        <div className="space-y-2.5 text-sm">
          {[
            ['Appointment ID', <span key="id" className="font-semibold text-teal-700">{appointmentNumber}</span>],
            ['Patient',        form.patient.name],
            ['Doctor',         'Dr. Sourav Kumar Mondal'],
            ['Consultation',   <span key="ct" className="capitalize">{form.consultation_type}</span>],
            ['Date',           formattedDate],
            ['Time',           `${formatTime(form.appointment_time)} – ${formatTime(form.slot_end_time)}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between items-center">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Consultation Fee</span>
            <span className="text-xl font-bold text-teal-700 flex items-center gap-0.5">
              <IndianRupee className="w-5 h-5" />{form.slot_fee}
            </span>
          </div>
        </div>
      </div>

      {/* Security badges (only when Razorpay configured) */}
      {razorpayConfigured !== false && (
        <div className="flex flex-wrap gap-3 justify-center mb-5">
          {[
            { icon: Shield, label: 'Secure Payment', sub: 'Razorpay encrypted' },
            { icon: Lock,   label: 'SSL Protected',  sub: '256-bit' },
            { icon: CreditCard, label: 'UPI / Cards / NetBanking', sub: 'All accepted' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mb-5">
        {razorpayConfigured === false
          ? 'In production, payments are processed securely through Razorpay.'
          : 'Your slot is reserved for 30 minutes. Appointment confirmed only after successful payment.'
        }
      </p>

      <div className="flex gap-3 justify-between">
        <button onClick={onBack} disabled={loading} className="btn-secondary gap-2 disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {razorpayConfigured === false ? (
          /* Demo mode button */
          <button
            onClick={handleDemoPayment}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-base"
          >
            {loading ? 'Processing…' : (
              <><Beaker className="w-5 h-5" /> Demo Pay ₹{form.slot_fee}</>
            )}
          </button>
        ) : (
          /* Real Razorpay button */
          <button
            onClick={handlePayment}
            disabled={loading || razorpayConfigured === null}
            className="btn-primary gap-2 px-8 text-base py-3.5 disabled:opacity-50"
          >
            {loading || razorpayConfigured === null
              ? 'Loading…'
              : <><CreditCard className="w-5 h-5" /> Pay ₹{form.slot_fee}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
