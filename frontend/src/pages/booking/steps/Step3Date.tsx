import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { BookingFormData } from '../../../types';
import { availabilityAPI } from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { cn } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const UUID  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Local-timezone today as YYYY-MM-DD */
const localToday = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

export default function Step3Date({ form, updateForm, onNext, onBack }: Props) {
  const today = localToday();

  const [yr,  setYr]  = useState(() => new Date().getFullYear());
  const [mo,  setMo]  = useState(() => new Date().getMonth());      // 0-based
  const [available, setAvailable] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const fetchCount = useRef(0);   // prevents stale responses overwriting fresh ones

  const monthStr = `${yr}-${String(mo + 1).padStart(2,'0')}`;

  // Determine the real chamber ID to send (validate UUID)
  const chId = form.consultation_type === 'chamber' && form.chamber_id && UUID.test(form.chamber_id)
    ? form.chamber_id
    : undefined;

  const load = () => {
    const n = ++fetchCount.current;
    setLoading(true);
    setFetchError('');

    availabilityAPI.getDates({
      chamber_id: chId,
      month: monthStr,
      consultation_type: form.consultation_type || 'chamber',
    })
      .then(res => {
        if (fetchCount.current !== n) return;   // stale response — ignore
        const dates: string[] = Array.isArray(res.data?.data) ? res.data.data : [];
        setAvailable(dates);
        if (dates.length === 0) {
          setFetchError('No slots available this month. Please try the next month.');
        }
      })
      .catch(() => {
        if (fetchCount.current !== n) return;
        setFetchError('Could not load availability. Please try again.');
        setAvailable([]);
      })
      .finally(() => {
        if (fetchCount.current === n) setLoading(false);
      });
  };

  // Reload whenever month or chamber changes
  useEffect(() => { load(); }, [monthStr, chId, form.consultation_type]); // eslint-disable-line

  const availSet = new Set(available);

  const daysInMonth    = new Date(yr, mo + 1, 0).getDate();
  const firstWeekDay   = new Date(yr, mo, 1).getDay();
  const monthLabel     = new Date(yr, mo).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (mo === 0) { setYr(y => y - 1); setMo(11); }
    else          { setMo(m => m - 1); }
  };
  const nextMonth = () => {
    if (mo === 11) { setYr(y => y + 1); setMo(0); }
    else           { setMo(m => m + 1); }
  };

  const pick = (ds: string) => {
    if (!availSet.has(ds) || ds < today) return;
    updateForm({ appointment_date: ds, appointment_time: '', slot_end_time: '', slot_fee: 0 });
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-1">Select Date</h2>
      <p className="text-gray-500 mb-5 text-sm">Choose your preferred appointment date.</p>

      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4 bg-white">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-teal-700 text-white">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-teal-600 transition-colors" aria-label="Previous">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-semibold text-base">
            <Calendar className="w-4 h-4 text-teal-300" />
            {monthLabel}
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-teal-600 transition-colors" aria-label="Next">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Day-of-week labels ── */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {/* ── Calendar body ── */}
        {loading ? (
          <div className="py-14 flex justify-center">
            <LoadingSpinner size="md" text="Loading availability…" />
          </div>
        ) : (
          <>
            {/* Always render the grid */}
            <div className="grid grid-cols-7 p-2 sm:p-3 gap-1">
              {/* Empty leading cells */}
              {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d   = i + 1;
                const ds  = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const past = ds < today;
                const avail = availSet.has(ds) && !past;
                const sel   = form.appointment_date === ds;
                const isNow = ds === today;

                return (
                  <button
                    key={d}
                    onClick={() => pick(ds)}
                    disabled={!avail}
                    title={avail ? 'Click to select' : past ? 'Past date' : 'Not available'}
                    className={cn(
                      'aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center w-full relative',
                      sel   ? 'bg-teal-700 text-white shadow ring-2 ring-teal-300 ring-offset-1 scale-105 z-10'
                            : avail && isNow ? 'bg-teal-50 text-teal-800 border-2 border-teal-500 font-bold hover:bg-teal-100 cursor-pointer'
                            : avail         ? 'bg-white text-gray-800 border border-gray-200 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 cursor-pointer shadow-sm'
                            :                 'text-gray-300 bg-gray-50 cursor-not-allowed'
                    )}
                  >
                    {d}
                    {avail && !sel && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Error / no-dates message BELOW the grid (not replacing it) */}
            {fetchError && available.length === 0 && (
              <div className="px-4 pb-4 text-center">
                <p className="text-sm text-amber-600 mb-2">{fetchError}</p>
                <button onClick={load} className="text-xs text-teal-700 hover:underline inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Availability summary */}
      {!loading && available.length > 0 && (
        <p className="text-xs text-teal-600 font-medium text-center mb-3">
          {available.length} date{available.length !== 1 ? 's' : ''} available this month
        </p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 justify-center mb-4">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-lg bg-teal-700 inline-block" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-lg bg-white border border-gray-200 shadow-sm inline-block" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-lg bg-gray-50 border border-gray-100 inline-block" /> Unavailable</span>
      </div>

      {/* Selected date pill */}
      {form.appointment_date && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-800 font-medium text-center">
          ✓ &nbsp;
          {new Date(form.appointment_date + 'T12:00:00').toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </div>
      )}

      <div className="flex gap-3 justify-between">
        <button onClick={onBack} className="btn-secondary gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!form.appointment_date}
          className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
