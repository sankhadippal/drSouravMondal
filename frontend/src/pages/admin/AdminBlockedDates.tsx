import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, CalendarX } from 'lucide-react';
import toast from 'react-hot-toast';
import { BlockedDate, Chamber } from '../../types';
import { blockedDatesAPI, chambersAPI, getErrorMessage } from '../../services/api';
import { formatDate } from '../../utils';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const BLOCK_TYPES = ['holiday', 'personal_leave', 'conference', 'emergency', 'other'];

export default function AdminBlockedDates() {
  const [dates, setDates] = useState<BlockedDate[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ date: '', reason: '', block_type: 'holiday', chamber_id: '', is_all_chambers: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, cRes] = await Promise.all([blockedDatesAPI.getAll(), chambersAPI.getAllAdmin()]);
      setDates(dRes.data.data || []);
      setChambers(cRes.data.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.date || !form.reason) { toast.error('Date and reason are required'); return; }
    setSaving(true);
    try {
      await blockedDatesAPI.create({ ...form, chamber_id: form.is_all_chambers ? undefined : form.chamber_id || undefined });
      toast.success('Date blocked');
      setModalOpen(false);
      setForm({ date: '', reason: '', block_type: 'holiday', chamber_id: '', is_all_chambers: true });
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await blockedDatesAPI.delete(deleteId);
      toast.success('Date unblocked');
      setDeleteId('');
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setDeleting(false); }
  };

  const typeColors: Record<string, string> = {
    holiday: 'bg-blue-100 text-blue-700', personal_leave: 'bg-purple-100 text-purple-700',
    conference: 'bg-amber-100 text-amber-700', emergency: 'bg-red-100 text-red-700', other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">Blocked Dates</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary gap-2 text-sm py-2"><Plus className="w-4 h-4" /> Block Date</button>
      </div>

      {loading ? <LoadingSpinner size="md" className="py-16 mx-auto" /> : (
        <div className="card overflow-hidden">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Chamber</th><th>Action</th></tr></thead>
            <tbody>
              {dates.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No blocked dates</td></tr>}
              {dates.map(d => (
                <tr key={d.id}>
                  <td className="font-medium text-gray-900">{formatDate(d.date)}</td>
                  <td><span className={`badge ${typeColors[d.block_type] || 'bg-gray-100 text-gray-700'}`}>{d.block_type.replace('_', ' ')}</span></td>
                  <td className="max-w-xs truncate">{d.reason}</td>
                  <td className="text-gray-500 text-xs">{d.is_all_chambers ? 'All Chambers' : chambers.find(c => c.id === d.chamber_id)?.name || 'Specific'}</td>
                  <td><button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Block a Date" size="sm">
        <div className="space-y-4">
          <div><label className="label">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" /></div>
          <div><label className="label">Block Type</label>
            <select value={form.block_type} onChange={e => setForm(f => ({ ...f, block_type: e.target.value }))} className="input-field">
              {BLOCK_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select></div>
          <div><label className="label">Reason <span className="text-red-500">*</span></label>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field" placeholder="e.g. Public holiday" /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="allChambers" checked={form.is_all_chambers} onChange={e => setForm(f => ({ ...f, is_all_chambers: e.target.checked }))} className="w-4 h-4 accent-teal-600" />
            <label htmlFor="allChambers" className="text-sm text-gray-700">Block for all chambers</label>
          </div>
          {!form.is_all_chambers && (
            <div><label className="label">Chamber</label>
              <select value={form.chamber_id} onChange={e => setForm(f => ({ ...f, chamber_id: e.target.value }))} className="input-field">
                <option value="">Select chamber</option>
                {chambers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Saving...' : 'Block Date'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete} loading={deleting}
        title="Unblock Date" message="Remove this date block? The date will become available for booking again." confirmLabel="Unblock" confirmVariant="warning" />
    </div>
  );
}
