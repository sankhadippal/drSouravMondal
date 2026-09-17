import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import { BookingFormData, ConsultationType } from '../../types';
import { cn } from '../../utils';

// Step components
import Step1ConsultationType from './steps/Step1ConsultationType';
import Step2Location from './steps/Step2Location';
import Step3Date from './steps/Step3Date';
import Step4Time from './steps/Step4Time';
import Step5PatientInfo from './steps/Step5PatientInfo';
import Step6OTPVerify from './steps/Step6OTPVerify';
import Step7Payment from './steps/Step7Payment';

const STEPS = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Date' },
  { id: 4, label: 'Time' },
  { id: 5, label: 'Patient' },
  { id: 6, label: 'Verify' },
  { id: 7, label: 'Pay' },
];

const INITIAL_FORM: BookingFormData = {
  consultation_type: '',
  chamber_id: '',
  appointment_date: '',
  appointment_time: '',
  slot_end_time: '',
  slot_fee: 0,
  patient: { name: '', age: '', sex: '', mobile: '', email: '', address: '' },
  reason: '',
  notes: '',
  otp_contact: '',
  otp_channel: 'mobile',
  otp_verified: false,
};

// ─── Responsive Progress Bar ─────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Mobile: compact number + label only for current step */}
        <div className="flex sm:hidden items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-teal-700">
            Step {step} of {STEPS.length}: {STEPS[step - 1]?.label}
          </span>
          <span className="text-xs text-gray-400">
            {Math.round(((step - 1) / (STEPS.length - 1)) * 100)}%
          </span>
        </div>
        {/* Mobile: full-width progress bar */}
        <div className="sm:hidden h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Tablet/Desktop: step dots with labels */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {STEPS.map((s, i) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                    isCompleted ? 'bg-teal-700 text-white' :
                    isCurrent   ? 'bg-teal-700 text-white ring-4 ring-teal-100' :
                                  'bg-gray-100 text-gray-400'
                  )}>
                    {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <span className={cn(
                    'text-xs whitespace-nowrap leading-none',
                    isCurrent   ? 'text-teal-700 font-semibold' :
                    isCompleted ? 'text-teal-500' :
                                  'text-gray-400'
                  )}>
                    {s.label}
                  </span>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1.5 mt-[-10px] transition-colors duration-300',
                    step > s.id ? 'bg-teal-500' : 'bg-gray-200'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingFormData>(() => {
    const type = searchParams.get('type') as ConsultationType | null;
    const chamberParam = searchParams.get('chamber') || '';
    // Validate it's a real UUID — discard old SQLite-style IDs like 'ch-00-0000-...'
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chamberParam);
    const chamber = isValidUUID ? chamberParam : '';
    return { ...INITIAL_FORM, consultation_type: type || '', chamber_id: chamber };
  });
  const [appointmentId, setAppointmentId] = useState('');
  const [appointmentNumber, setAppointmentNumber] = useState('');

  // Auto-advance if type pre-selected from URL
  useEffect(() => {
    const type = searchParams.get('type');
    if (type && (type === 'online' || type === 'chamber') && step === 1) {
      setForm(f => ({ ...f, consultation_type: type as ConsultationType }));
      setStep(2);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = useCallback((updates: Partial<BookingFormData>) => {
    setForm(f => ({ ...f, ...updates }));
  }, []);

  const goNext = () => {
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (step === 1) return;
    if (step === 3) updateForm({ appointment_date: '', appointment_time: '', slot_end_time: '', slot_fee: 0 });
    if (step === 4) updateForm({ appointment_time: '', slot_end_time: '', slot_fee: 0 });
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmed = (apptId: string, apptNumber: string) => {
    setAppointmentId(apptId);
    setAppointmentNumber(apptNumber);
    navigate(`/appointment/confirmation/${apptNumber}`);
  };

  const stepProps = { form, updateForm, onNext: goNext, onBack: goBack };

  return (
    <>
      <SEOHead title="Book Appointment - Sourav Homoeopathic Clinic" url="/appointment" />

      {/* Page Header */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-1">Book Appointment</h1>
          <p className="text-teal-200 text-sm">Dr. Sourav Kumar Mondal • Sourav Homoeopathic Clinic</p>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar step={step} />

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-8 animate-fade-in overflow-hidden">
          {step === 1 && <Step1ConsultationType {...stepProps} />}
          {step === 2 && <Step2Location {...stepProps} />}
          {step === 3 && <Step3Date {...stepProps} />}
          {step === 4 && <Step4Time {...stepProps} />}
          {step === 5 && <Step5PatientInfo {...stepProps} />}
          {step === 6 && (
            <Step6OTPVerify
              {...stepProps}
              onNext={(apptId, apptNum) => {
                setAppointmentId(apptId);
                setAppointmentNumber(apptNum);
                goNext();
              }}
            />
          )}
          {step === 7 && (
            <Step7Payment
              form={form}
              appointmentId={appointmentId}
              appointmentNumber={appointmentNumber}
              onConfirmed={handleConfirmed}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </>
  );
}
