import { useEffect, useState } from 'react';
import { MapPin, Phone, IndianRupee, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { BookingFormData, Chamber } from '../../../types';
import { chambersAPI } from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { cn, DAY_NAMES, formatTime } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Location({ form, updateForm, onNext, onBack }: Props) {
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (form.consultation_type === 'chamber') {
      chambersAPI.getAll()
        .then(r => setChambers(r.data.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [form.consultation_type]);

  if (form.consultation_type === 'online') {
    return (
      <div>
        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Online Consultation</h2>
        <p className="text-gray-500 mb-8">Consult from anywhere in India. No chamber visit needed.</p>

        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-6 mb-6 flex items-start gap-4">
          <div className="w-14 h-14 bg-teal-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <Video className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-1">Online Consultation</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              Consult with Dr. Sourav Kumar Mondal from the comfort of your home. 
              Medicines are prepared and dispatched via courier to your address across India.
            </p>
            <p className="text-teal-700 font-bold text-base flex items-center gap-1">
              <IndianRupee className="w-4 h-4" />300 per consultation
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-between">
          <button onClick={onBack} className="btn-secondary gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => { updateForm({ chamber_id: '' }); onNext(); }} className="btn-primary gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Select Chamber</h2>
      <p className="text-gray-500 mb-6">Choose your preferred chamber location.</p>

      {loading ? (
        <LoadingSpinner size="md" className="py-12 mx-auto" text="Loading chambers..." />
      ) : (
        <div className="space-y-4 mb-6">
          {chambers.map(chamber => {
            const availDays = chamber.schedules?.filter(s => s.is_available) || [];
            const isSelected = form.chamber_id === chamber.id;
            return (
              <button
                key={chamber.id}
                onClick={() => updateForm({ chamber_id: chamber.id, appointment_date: '', appointment_time: '', slot_fee: chamber.consultation_fee })}
                className={cn(
                  'w-full text-left p-5 rounded-xl border-2 transition-all',
                  isSelected ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-300 bg-white'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', isSelected ? 'bg-teal-700' : 'bg-teal-50')}>
                    <MapPin className={cn('w-5 h-5', isSelected ? 'text-white' : 'text-teal-700')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{chamber.name}</h3>
                      <span className="text-teal-700 font-bold text-sm whitespace-nowrap">₹{chamber.consultation_fee}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 mb-2">{chamber.address}, {chamber.city}</p>
                    {chamber.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                        <Phone className="w-3 h-3" />{chamber.phone}
                      </p>
                    )}
                    {availDays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {availDays.map(s => (
                          <span key={s.day_of_week} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {DAY_NAMES[s.day_of_week].slice(0, 3)}{s.start_time ? ` ${formatTime(s.start_time)}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 justify-between">
        <button onClick={onBack} className="btn-secondary gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
        <button onClick={onNext} disabled={!form.chamber_id} className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
