import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Phone, Mail, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { BookingFormData } from '../../../types';
import { otpAPI, appointmentsAPI, getErrorMessage } from '../../../services/api';
import { cn } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: (appointmentId: string, appointmentNumber: string) => void;
  onBack: () => void;
}

export default function Step6OTPVerify({ form, updateForm, onNext, onBack }: Props) {
  const [channel, setChannel] = useState<'mobile' | 'email'>('mobile');
  const [otpContact, setOtpContact] = useState(form.patient.mobile || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [stage, setStage] = useState<'choose' | 'enter'>('choose');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const hasMobile = /^[6-9]\d{9}$/.test(form.patient.mobile);
  const hasEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patient.email);

  const handleChannelSelect = (ch: 'mobile' | 'email') => {
    setChannel(ch);
    setOtpContact(ch === 'mobile' ? form.patient.mobile : form.patient.email);
  };

  const clearOtp = useCallback(() => setOtp(['', '', '', '', '', '']), []);

  const sendOtp = async () => {
    if (!otpContact) { toast.error('Please provide a valid contact'); return; }
    setLoading(true);
    setOtpError('');          // clear any previous error immediately
    clearOtp();               // clear previous OTP digits
    try {
      const res = await otpAPI.send(otpContact, channel, 'appointment_booking');
      toast.success(`OTP sent to your ${channel === 'mobile' ? 'mobile number' : 'email address'}`);
      setStage('enter');
      setResendCooldown(120);

      // Dev mode: auto-fill new OTP and auto-verify
      const devOtp = res.data.data?.otp?.toString();
      if (devOtp) {
        const digits = devOtp.split('');
        setOtp(digits);
        toast.success(`[DEV] OTP: ${devOtp}`, { id: 'dev-otp', duration: 30000 });
        // Auto-focus last box
        setTimeout(() => inputRefs.current[5]?.focus(), 100);
      } else {
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setOtpError('');
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft'  && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const verifyAndBook = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setOtpError('');
    try {
      // Step 1: Verify OTP
      await otpAPI.verify(otpContact, channel, otpStr, 'appointment_booking');
      updateForm({ otp_contact: otpContact, otp_channel: channel, otp_verified: true });

      // Step 2: Create appointment
      const apptRes = await appointmentsAPI.create({
        patient: {
          name: form.patient.name,
          age: parseInt(form.patient.age),
          sex: form.patient.sex,
          mobile: form.patient.mobile,
          email: form.patient.email || undefined,
          address: form.patient.address || undefined,
        },
        consultation_type: form.consultation_type,
        chamber_id: form.chamber_id || undefined,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        otp_contact: otpContact,
        otp_channel: channel,
      });

      const { appointmentId, appointmentNumber } = apptRes.data.data;
      toast.success('OTP verified! Proceeding to payment...');
      onNext(appointmentId, appointmentNumber);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      // OTP-specific errors — show inline + allow retry
      if (
        msg.toLowerCase().includes('otp') ||
        msg.toLowerCase().includes('verification') ||
        msg.toLowerCase().includes('no active')
      ) {
        setOtpError(msg);
        clearOtp();
        inputRefs.current[0]?.focus();
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const filled = otp.filter(Boolean).length;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Verify Your Contact</h2>
      <p className="text-gray-500 mb-6">We need to verify your contact before proceeding to payment.</p>

      {/* ── STEP 1: Choose channel ── */}
      {stage === 'choose' && (
        <>
          <div className="space-y-3 mb-6">
            {hasMobile && (
              <button
                onClick={() => handleChannelSelect('mobile')}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  channel === 'mobile' ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', channel === 'mobile' ? 'bg-teal-700' : 'bg-teal-50')}>
                  <Phone className={cn('w-5 h-5', channel === 'mobile' ? 'text-white' : 'text-teal-700')} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">SMS OTP</p>
                  <p className="text-sm text-gray-500">Send OTP to <strong>{form.patient.mobile.slice(0, 5)}*****</strong></p>
                </div>
              </button>
            )}
            {hasEmail && (
              <button
                onClick={() => handleChannelSelect('email')}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  channel === 'email' ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', channel === 'email' ? 'bg-teal-700' : 'bg-teal-50')}>
                  <Mail className={cn('w-5 h-5', channel === 'email' ? 'text-white' : 'text-teal-700')} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email OTP</p>
                  <p className="text-sm text-gray-500">Send OTP to <strong>{form.patient.email}</strong></p>
                </div>
              </button>
            )}
          </div>

          <div className="flex gap-3 justify-between">
            <button onClick={onBack} className="btn-secondary gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={sendOtp} disabled={loading} className="btn-primary gap-2">
              {loading ? 'Sending…' : <><Shield className="w-4 h-4" /> Send OTP</>}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: Enter OTP ── */}
      {stage === 'enter' && (
        <>
          {/* Sent-to banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5 text-center">
            <p className="text-sm text-gray-700">
              OTP sent to <strong className="text-gray-900">
                {channel === 'mobile' ? form.patient.mobile : form.patient.email}
              </strong>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Valid for 10 minutes</p>
          </div>

          {/* OTP error */}
          {otpError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 text-center">
              {otpError}
              <button
                onClick={() => { setOtpError(''); sendOtp(); }}
                className="ml-2 text-red-600 underline text-xs font-medium"
              >
                Request new OTP
              </button>
            </div>
          )}

          {/* 6-digit inputs */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={cn(
                  'w-11 h-14 sm:w-12 sm:h-16 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-white',
                  digit ? 'border-teal-500 text-teal-700' : 'border-gray-300',
                  otpError ? 'border-red-400 animate-pulse' : 'focus:border-teal-600 focus:ring-2 focus:ring-teal-100'
                )}
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {otp.map((d, i) => (
              <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-all', d ? 'bg-teal-600' : 'bg-gray-200')} />
            ))}
          </div>

          {/* Resend */}
          <div className="text-center mb-6">
            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-400">
                Resend OTP in <strong className="text-gray-600">{resendCooldown}s</strong>
              </p>
            ) : (
              <button
                onClick={() => { clearOtp(); sendOtp(); }}
                disabled={loading}
                className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
              </button>
            )}
          </div>

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => { setStage('choose'); clearOtp(); setOtpError(''); }}
              className="btn-secondary gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Change Contact
            </button>
            <button
              onClick={verifyAndBook}
              disabled={loading || filled < 6}
              className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Verifying…'
                : <><CheckCircle className="w-4 h-4" /> Verify &amp; Continue</>
              }
            </button>
          </div>
        </>
      )}
    </div>
  );
}
