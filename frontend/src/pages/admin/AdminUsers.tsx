import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminUser, UserRole } from '../../types';
import { usersAPI, getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'staff' as UserRole });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const currentUser = useAuthStore(s => s.user);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await usersAPI.getAll(); setUsers(r.data.data || []); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', mobile: '', password: '', role: 'staff' }); setModalOpen(true); };
  const openEdit = (u: AdminUser) => { setEditing(u); setForm({ name: u.name, email: u.email, mobile: u.mobile || '', password: '', role: u.role }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    if (!editing && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      if (editing) { await usersAPI.update(editing.id, { name: form.name, mobile: form.mobile, role: form.role }); toast.success('User updated'); }
      else { await usersAPI.create(form as Record<string, unknown>); toast.success('User created'); }
      setModalOpen(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await usersAPI.delete(deleteId); toast.success('User deactivated'); setDeleteId(''); load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  const roleColors: Record<string, string> = { super_admin: 'bg-purple-100 text-purple-700', doctor: 'bg-teal-100 text-teal-700', staff: 'bg-blue-100 text-blue-700' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">Admin Users</h1>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm py-2"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      {loading ? <LoadingSpinner size="md" className="py-16 mx-auto" /> : (
        <div className="card overflow-hidden">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <td className="font-medium text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">{u.name[0].toUpperCase()}</div>
                    {u.name} {u.id === currentUser?.id && <span className="text-xs text-gray-400">(you)</span>}
                  </td>
                  <td className="text-gray-600 text-sm">{u.email}</td>
                  <td className="text-gray-500 text-sm">{u.mobile || '—'}</td>
                  <td><span className={`badge text-xs ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role.replace('_', ' ')}</span></td>
                  <td><span className={`badge text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-xs text-gray-400">{u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td>
                  <td className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                    {u.id !== currentUser?.id && <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add Admin User'} size="sm">
        <div className="space-y-4">
          <div><label className="label">Full Name <span className="text-red-500">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" /></div>
          {!editing && <div><label className="label">Email <span className="text-red-500">*</span></label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" /></div>}
          <div><label className="label">Mobile</label><input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="input-field" type="tel" /></div>
          {!editing && <div><label className="label">Password <span className="text-red-500">*</span></label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="Min 8 characters" /></div>}
          <div><label className="label">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="input-field">
              <option value="staff">Staff</option>
              <option value="doctor">Doctor</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete} title="Deactivate User" message="This user will be deactivated and lose access to the admin panel." confirmLabel="Deactivate" />
    </div>
  );
}
