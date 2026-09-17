import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { ContactMessage } from '../../types';
import { contactAPI, getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await contactAPI.adminList({ page: String(page), limit: '20', status: statusFilter });
      setMessages(r.data.data || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openMessage = (m: ContactMessage) => {
    setSelected(m);
    setNewStatus(m.status);
    setAdminNotes(m.admin_notes || '');
    // Auto mark as read
    if (m.status === 'new') {
      contactAPI.adminUpdate(m.id, { status: 'read' }).then(() => load()).catch(() => {});
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await contactAPI.adminUpdate(selected.id, { status: newStatus, admin_notes: adminNotes });
      toast.success('Message updated');
      setSelected(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setUpdating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Contact Messages <span className="text-gray-400 font-normal text-base">({total})</span></h1>
      </div>

      <div className="card p-4 flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36">
          <option value="">All</option>
          {['new', 'read', 'responded', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className="btn-outline text-sm py-2">Clear</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Message</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && messages.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No messages</td></tr>}
              {messages.map(m => (
                <tr key={m.id} className={m.status === 'new' ? 'bg-blue-50/30' : ''}>
                  <td className="font-medium text-gray-900">{m.name}{m.status === 'new' && <span className="ml-1.5 w-2 h-2 bg-blue-500 rounded-full inline-block" />}</td>
                  <td>{m.mobile}</td>
                  <td className="text-gray-500 text-xs">{m.email || '—'}</td>
                  <td className="max-w-xs truncate text-gray-600 text-xs">{m.message}</td>
                  <td><Badge status={m.status} /></td>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                  <td><button onClick={() => openMessage(m)} className="p-1.5 rounded hover:bg-teal-50 text-teal-600"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} /></div>}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Contact Message" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Name', selected.name], ['Mobile', selected.mobile], ['Email', selected.email || '—'], ['Date', formatDateTime(selected.created_at)]].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-800 mt-0.5">{v}</p></div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Message</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input-field text-sm">
                {['new', 'read', 'responded', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Admin Notes</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="input-field resize-none text-sm" rows={3} placeholder="Internal notes..." />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="btn-secondary text-sm py-2">Close</button>
              <button onClick={handleUpdate} disabled={updating} className="btn-primary text-sm py-2">{updating ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
