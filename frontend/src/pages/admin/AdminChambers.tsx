import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, MapPin, Phone, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { Chamber } from '../../types';
import { chambersAPI, getErrorMessage } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EMPTY: Partial<Chamber> = {
  name: '', address: '', area: '', city: '', state: 'West Bengal',
  pincode: '', phone: '', latitude: undefined, longitude: undefined,
  google_maps_url: '', consultation_fee: 300, status: 'active',
};

// ── Field component defined OUTSIDE the parent component ──────────────────────
// This is critical — if defined inside, React recreates the component type on
// every render (each keystroke), unmounting/remounting the input and losing focus.
interface FieldProps {
  label: string;
  name: keyof Chamber;
  type?: string;
  required?: boolean;
  form: Partial<Chamber>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Chamber>>>;
  placeholder?: string;
}

function Field({ label, name, type = 'text', required, form, setForm, placeholder }: FieldProps) {
  const rawValue = form[name];
  const value = rawValue === undefined || rawValue === null ? '' : String(rawValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = type === 'number'
      ? (e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)
      : e.target.value;
    setForm(f => ({ ...f, [name]: val }));
  };

  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        className="input-field"
        placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
      />
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminChambers() {
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Chamber | null>(null);
  const [form, setForm]         = useState<Partial<Chamber>>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await chambersAPI.getAllAdmin();
      setChambers(r.data.data || []);
    } catch {
      toast.error('Failed to load chambers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit   = (c: Chamber) => { setEditing(c); setForm({ ...c }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city) {
      toast.error('Name, address and city are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await chambersAPI.update(editing.id, form as Record<string, unknown>);
        toast.success('Chamber updated');
      } else {
        await chambersAPI.create(form as Record<string, unknown>);
        toast.success('Chamber created');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await chambersAPI.delete(deleteId);
      toast.success('Chamber deleted');
      setDeleteId('');
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  // Shared props passed to every Field — avoids repeating form+setForm inline
  const fp = { form, setForm };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">Chambers</h1>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm py-2">
          <Plus className="w-4 h-4" /> Add Chamber
        </button>
      </div>

      {loading ? (
        <LoadingSpinner size="md" className="py-16 mx-auto" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {chambers.map(c => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <Badge status={c.status} className="text-xs mt-0.5" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{c.address}, {c.city}, {c.state}
              </p>
              {c.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />{c.phone}
                </p>
              )}
              <p className="text-teal-700 font-bold text-sm mt-2 flex items-center gap-0.5">
                <IndianRupee className="w-3.5 h-3.5" />{c.consultation_fee}
              </p>
            </div>
          ))}
          {chambers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">No chambers added yet.</div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Chamber' : 'Add Chamber'} size="lg">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field {...fp} label="Chamber Name"        name="name"             required placeholder="e.g. Kolkata Chamber" />
          <Field {...fp} label="Phone"               name="phone"                      placeholder="10-digit mobile" />
          <div className="sm:col-span-2">
            <Field {...fp} label="Full Address"      name="address"          required placeholder="Street address" />
          </div>
          <Field {...fp} label="Area / Locality"     name="area"                       placeholder="e.g. Dhakuria" />
          <Field {...fp} label="City"                name="city"             required placeholder="e.g. Kolkata" />
          <Field {...fp} label="State"               name="state"                      placeholder="e.g. West Bengal" />
          <Field {...fp} label="PIN Code"            name="pincode"                    placeholder="6-digit PIN" />
          <Field {...fp} label="Consultation Fee (₹)" name="consultation_fee" required type="number" placeholder="300" />
          <Field {...fp} label="Latitude"            name="latitude"         type="number" placeholder="22.5050" />
          <Field {...fp} label="Longitude"           name="longitude"        type="number" placeholder="88.3656" />
          <div className="sm:col-span-2">
            <Field {...fp} label="Google Maps URL"   name="google_maps_url"            placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={form.status || 'active'}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              className="input-field"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2.5">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2.5">
            {saving ? 'Saving...' : (editing ? 'Update Chamber' : 'Create Chamber')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Chamber"
        message="Are you sure? This will permanently remove the chamber. Any related schedules will also be removed."
        confirmLabel="Delete"
      />
    </div>
  );
}
