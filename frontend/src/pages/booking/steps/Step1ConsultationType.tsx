import { Video, MapPin, ChevronRight } from 'lucide-react';
import { BookingFormData, ConsultationType } from '../../../types';
import { cn } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: () => void;
}

const OPTIONS = [
  {
    type: 'online' as ConsultationType,
    icon: Video,
    title: 'Online Consultation',
    desc: 'Consult from home via video/call. Medicines dispatched via courier across India.',
    badge: 'Available Pan-India',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    type: 'chamber' as ConsultationType,
    icon: MapPin,
    title: 'Chamber Visit',
    desc: 'In-person consultation at one of our chamber locations in West Bengal.',
    badge: '4 Locations',
    badgeColor: 'bg-teal-100 text-teal-700',
  },
];

export default function Step1ConsultationType({ form, updateForm, onNext }: Props) {
  const handleSelect = (type: ConsultationType) => {
    updateForm({ consultation_type: type, chamber_id: '', appointment_date: '', appointment_time: '' });
    onNext();
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Choose Consultation Type</h2>
        <p className="text-gray-500">Select how you would like to consult with Dr. Sourav Kumar Mondal.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {OPTIONS.map(({ type, icon: Icon, title, desc, badge, badgeColor }) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            className={cn(
              'text-left p-6 rounded-2xl border-2 transition-all duration-200 group hover:shadow-card-hover hover:-translate-y-0.5',
              form.consultation_type === type
                ? 'border-teal-600 bg-teal-50'
                : 'border-gray-200 bg-white hover:border-teal-300'
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-colors',
              form.consultation_type === type ? 'bg-teal-700' : 'bg-teal-50 group-hover:bg-teal-100'
            )}>
              <Icon className={cn('w-7 h-7', form.consultation_type === type ? 'text-white' : 'text-teal-700')} />
            </div>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', badgeColor)}>{badge}</span>
            <h3 className="font-semibold text-gray-900 text-lg mt-3 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{desc}</p>
            <div className="flex items-center gap-1 text-teal-700 text-sm font-medium">
              Select <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        All consultations require OTP verification and secure payment via Razorpay.
      </p>
    </div>
  );
}
