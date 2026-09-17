import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AuditLog } from '../../types';
import { auditLogsAPI } from '../../services/api';
import { formatDateTime } from '../../utils';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    setLoading(true);
    auditLogsAPI.getAll({ page: String(page), limit: '50', action: actionFilter, from_date: fromDate, to_date: toDate })
      .then(r => { setLogs(r.data.data || []); setTotal(r.data.total || 0); setTotalPages(r.data.totalPages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, actionFilter, fromDate, toDate]);

  const actionColors: Record<string, string> = {
    admin_login: 'bg-blue-100 text-blue-700', admin_logout: 'bg-gray-100 text-gray-600',
    chamber_created: 'bg-teal-100 text-teal-700', chamber_updated: 'bg-teal-100 text-teal-700',
    chamber_deleted: 'bg-red-100 text-red-700', appointment_status_changed: 'bg-amber-100 text-amber-700',
    payment_refunded: 'bg-orange-100 text-orange-700', doctor_profile_updated: 'bg-purple-100 text-purple-700',
    patient_record_viewed: 'bg-blue-100 text-blue-700', settings_updated: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold text-gray-900">Audit Logs <span className="text-gray-400 font-normal text-base">({total})</span></h1>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="input-field pl-9 py-2 text-sm" placeholder="Filter by action..." />
        </div>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36" />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36" />
        <button onClick={() => { setActionFilter(''); setFromDate(''); setToDate(''); }} className="btn-outline text-sm py-2">Clear</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Date & Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Description</th><th>IP</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No audit logs</td></tr>}
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                  <td className="font-medium text-gray-800 text-sm">{l.user_name || 'System'}</td>
                  <td className="text-xs text-gray-500 capitalize">{l.user_role?.replace('_', ' ') || '—'}</td>
                  <td><span className={`badge text-xs ${actionColors[l.action] || 'bg-gray-100 text-gray-600'}`}>{l.action.replace(/_/g, ' ')}</span></td>
                  <td className="text-xs text-gray-500">{l.entity_type ? `${l.entity_type} ${l.entity_id ? '(' + l.entity_id.slice(0, 8) + '...)' : ''}` : '—'}</td>
                  <td className="text-xs text-gray-500 max-w-[200px] truncate">{l.description || '—'}</td>
                  <td className="font-mono text-xs text-gray-400">{l.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={50} onPageChange={setPage} /></div>}
      </div>
    </div>
  );
}
