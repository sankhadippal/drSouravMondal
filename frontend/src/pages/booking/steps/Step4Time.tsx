import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { BookingFormData, TimeSlot } from '../../../types';
import { availabilityAPI } from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { cn, formatTime } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Time({ form, updateForm, onNext, onBack }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!form.appointment_date) return;
    setLoading(true);
    setError('');
    availabilityAPI.getSlots({
      chamber_id: form.chamber_id || undefined,
      date: form.appointment_date,
      consultation_type: form.consultation_type,
    })
      .then(r => {
        setSlots(r.data.data || []);
        if (!r.data.data?.length) setError('No available slots for this date. Please select another date.');
      })
      .catch(() => setError('Failed to load slots. Please try again.'))
      .finally(() => setLoading(false));
  }, [form.appointment_date, form.chamber_id, form.consultation_type]);

  const availableSlots = slots.filter(s => s.is_available);
  const formattedDate = form.appointment_date
    ? new Date(form.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Select Time Slot</h2>
      <p className="text-gray-500 mb-1">Available slots for <strong className="text-gray-700">{formattedDate}</strong></p>

      {loading ? (
        <div className="py-16"><LoadingSpinner size="md" className="mx-auto" text="Loading available slots..." /></div>
      ) : error ? (
        <div className="py-10 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
          <button onClick={onBack} className="btn-outline mt-4 text-sm">Go Back & Select Another Date</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-teal-700 font-medium mb-5">{availableSlots.length} slots available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
            {slots.map(slot => {
              const isSelected = form.appointment_time === slot.start_time;
              return (
                <button
                  key={slot.start_time}
                  onClick={() => {
                    if (!slot.is_available) return;
                    updateForm({
                      appointment_time: slot.start_time,
                      slot_end_time: slot.end_time,
                      slot_fee: slot.fee,
                    });
                  }}
                  disabled={!slot.is_available}
                  className={cn(
                    'px-2 py-2 rounded-lg text-xs sm:text-sm font-medium text-center transition-all border',
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-700 shadow-md scale-105'
                      : slot.is_available
                        ? 'bg-white text-gray-800 border-gray-200 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700'
                        : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                  )}
                >
                  {formatTime(slot.start_time)}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-6">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-teal-700" /> Selected</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded border border-gray-200 bg-white" /> Available</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-gray-50 border border-gray-100" /> Booked</div>
          </div>
        </>
      )}

      {form.appointment_time && !error && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-teal-800">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Selected: {formatTime(form.appointment_time)} – {formatTime(form.slot_end_time)}</span>
            </div>
            <span className="text-teal-700 font-bold">₹{form.slot_fee}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-between">
        <button onClick={onBack} className="btn-secondary gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
        <button onClick={onNext} disabled={!form.appointment_time} className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
