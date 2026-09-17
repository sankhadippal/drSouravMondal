import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FAQ } from '../../types';
import { faqsAPI, getErrorMessage } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EMPTY = { question: '', answer: '', category: 'general', sort_order: 0, is_active: true };
const CATS = ['general', 'booking', 'online', 'fees', 'chambers'];

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [form, setForm] = useState<Partial<FAQ>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await faqsAPI.getAll(); setFaqs(r.data.data || []); }
    catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, sort_order: faqs.length }); setModalOpen(true); };
  const openEdit = (f: FAQ) => { setEditing(f); setForm({ ...f }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer are required'); return; }
    setSaving(true);
    try {
      if (editing) { await faqsAPI.update(editing.id, form as Record<string, unknown>); toast.success('FAQ updated'); }
      else { await faqsAPI.create(form as { question: string; answer: string; category?: string; sort_order?: number }); toast.success('FAQ created'); }
      setModalOpen(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await faqsAPI.delete(deleteId); toast.success('FAQ deleted'); setDeleteId(''); load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">FAQs</h1>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm py-2"><Plus className="w-4 h-4" /> Add FAQ</button>
      </div>

      {loading ? <LoadingSpinner size="md" className="py-16 mx-auto" /> : (
        <div className="space-y-3">
          {faqs.length === 0 && <div className="card p-12 text-center text-gray-400">No FAQs added yet</div>}
          {faqs.map((f, i) => (
            <div key={f.id} className={`card p-5 ${!f.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-teal-100 text-teal-700 badge">{f.category}</span>
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                  </div>
                  <p className="font-medium text-gray-900 mb-2">{f.question}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.answer}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit FAQ' : 'Add FAQ'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Question <span className="text-red-500">*</span></label>
            <input value={form.question || ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Answer <span className="text-red-500">*</span></label>
            <textarea value={form.answer || ''} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} className="input-field resize-none" rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select value={form.category || 'general'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} className="input-field" min="0" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete} title="Delete FAQ" message="Remove this FAQ?" confirmLabel="Delete" />
    </div>
  );
}
