import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Service } from '../../types';
import { servicesAPI, getErrorMessage } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { cn } from '../../utils';

const EMPTY = { name: '', description: '', icon: '', consultation_info: '', sort_order: 0, is_active: true };

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<Partial<Service>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await servicesAPI.getAll();
      setServices(r.data.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, sort_order: services.length }); setModalOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ ...s }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Service name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await servicesAPI.update(editing.id, form as Record<string, unknown>); toast.success('Service updated'); }
      else { await servicesAPI.create(form as Record<string, unknown>); toast.success('Service created'); }
      setModalOpen(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s: Service) => {
    try {
      await servicesAPI.update(s.id, { is_active: !s.is_active });
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    try { await servicesAPI.delete(deleteId); toast.success('Service deleted'); setDeleteId(''); load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">Services</h1>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm py-2"><Plus className="w-4 h-4" /> Add Service</button>
      </div>

      {loading ? <LoadingSpinner size="md" className="py-16 mx-auto" /> : (
        <div className="card overflow-hidden">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {services.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No services added yet</td></tr>}
              {services.map((s, i) => (
                <tr key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <td className="text-gray-400">{i + 1}</td>
                  <td className="font-medium text-gray-900">{s.name}</td>
                  <td className="text-gray-500 max-w-xs truncate text-xs">{s.description}</td>
                  <td>
                    <button onClick={() => toggleActive(s)} className={`badge cursor-pointer ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Service' : 'Add Service'} size="md">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label><input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" /></div>
          <div><label className="label">Description</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field resize-none" rows={3} /></div>
          <div><label className="label">Icon (name)</label><input value={form.icon || ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="input-field" placeholder="e.g. stethoscope" /></div>
          <div><label className="label">Consultation Info</label><textarea value={form.consultation_info || ''} onChange={e => setForm(f => ({ ...f, consultation_info: e.target.value }))} className="input-field resize-none" rows={2} /></div>
          <div><label className="label">Sort Order</label><input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} className="input-field" min="0" /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete} title="Delete Service" message="Remove this service? This cannot be undone." confirmLabel="Delete" />
    </div>
  );
}
