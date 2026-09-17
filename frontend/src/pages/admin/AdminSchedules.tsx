import { useEffect, useState, useCallback } from 'react';
import { Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Chamber, ChamberSchedule } from '../../types';
import { chambersAPI, schedulesAPI, getErrorMessage } from '../../services/api';
import { DAY_NAMES } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DEFAULT_SCHEDULES: ChamberSchedule[] = DAY_NAMES.map((_, i) => ({
  day_of_week: i as 0|1|2|3|4|5|6,
  is_available: i > 0 && i < 7,
  start_time: '10:00',
  end_time: '13:00',
  break_start: '',
  break_end: '',
  slot_duration_minutes: 15,
  max_patients_per_slot: 1,
  consultation_fee: undefined,
}));

export default function AdminSchedules() {
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [selectedChamber, setSelectedChamber] = useState('');
  const [schedules, setSchedules] = useState<ChamberSchedule[]>(DEFAULT_SCHEDULES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    chambersAPI.getAllAdmin().then(r => {
      const chs = r.data.data || [];
      setChambers(chs);
      if (chs.length > 0) setSelectedChamber(chs[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChamber) return;
    setLoading(true);
    schedulesAPI.getByChamber(selectedChamber).then(r => {
      const data: ChamberSchedule[] = r.data.data || [];
      const merged = DEFAULT_SCHEDULES.map(d => {
        const existing = data.find(s => s.day_of_week === d.day_of_week);
        return existing ? { ...d, ...existing, start_time: existing.start_time?.slice(0, 5) || d.start_time, end_time: existing.end_time?.slice(0, 5) || d.end_time } : d;
      });
      setSchedules(merged);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedChamber]);

  const updateDay = (dayIdx: number, updates: Partial<ChamberSchedule>) => {
    setSchedules(prev => prev.map((s, i) => i === dayIdx ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    if (!selectedChamber) return;
    setSaving(true);
    try {
      await schedulesAPI.update(selectedChamber, schedules as unknown[]);
      toast.success('Schedule updated successfully');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Chamber Schedules</h1>
        <div className="flex items-center gap-3">
          <select value={selectedChamber} onChange={e => setSelectedChamber(e.target.value)} className="input-field w-56 py-2 text-sm">
            {chambers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving || !selectedChamber} className="btn-primary gap-2 text-sm py-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner size="md" className="py-16 mx-auto" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-32">Day</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Available</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Start Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">End Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Break Start</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Break End</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Slot (min)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Max Patients</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fee Override (₹)</th>
              </tr></thead>
              <tbody>
                {schedules.map((s, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${s.is_available ? '' : 'bg-gray-50 opacity-60'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{DAY_NAMES[s.day_of_week]}</td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={s.is_available} onChange={e => updateDay(i, { is_available: e.target.checked })} className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 peer-checked:bg-teal-600 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </td>
                    {(['start_time','end_time','break_start','break_end'] as const).map(field => (
                      <td key={field} className="px-4 py-3">
                        <input type="time" value={s[field] || ''} disabled={!s.is_available}
                          onChange={e => updateDay(i, { [field]: e.target.value })}
                          className="input-field py-1.5 text-sm w-28 disabled:opacity-40" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <select value={s.slot_duration_minutes} disabled={!s.is_available} onChange={e => updateDay(i, { slot_duration_minutes: parseInt(e.target.value) })} className="input-field py-1.5 text-sm w-20 disabled:opacity-40">
                        {[5,10,15,20,30,45,60].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="1" max="10" value={s.max_patients_per_slot} disabled={!s.is_available}
                        onChange={e => updateDay(i, { max_patients_per_slot: parseInt(e.target.value) || 1 })}
                        className="input-field py-1.5 text-sm w-20 disabled:opacity-40" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={s.consultation_fee || ''} disabled={!s.is_available}
                        onChange={e => updateDay(i, { consultation_fee: parseFloat(e.target.value) || undefined })}
                        className="input-field py-1.5 text-sm w-24 disabled:opacity-40" placeholder="Default" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
