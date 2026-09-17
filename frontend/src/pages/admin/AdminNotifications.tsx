import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { formatDateTime } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    notificationsAPI.getAll({ page: String(page), limit: '25', status: statusFilter })
      .then(r => { setNotifications(r.data.data || []); setTotal(r.data.total || 0); setTotalPages(r.data.totalPages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Notifications <span className="text-gray-400 font-normal text-base">({total})</span></h1>
      </div>
      <div className="card p-4 flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36">
          <option value="">All</option>
          {['pending', 'sent', 'failed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Type</th><th>Channel</th><th>Recipient</th><th>Patient</th><th>Status</th><th>Scheduled</th><th>Sent At</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && notifications.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No notifications</td></tr>}
              {notifications.map(n => (
                <tr key={n.id}>
                  <td className="text-xs font-medium text-gray-700">{n.type?.replace(/_/g, ' ')}</td>
                  <td><span className="badge bg-gray-100 text-gray-700 text-xs">{n.channel}</span></td>
                  <td className="text-xs text-gray-500 max-w-[160px] truncate">{n.recipient}</td>
                  <td className="text-sm text-gray-700">{n.patient_name || '—'}</td>
                  <td><Badge status={n.status} /></td>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{n.scheduled_at ? formatDateTime(n.scheduled_at) : '—'}</td>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{n.sent_at ? formatDateTime(n.sent_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={25} onPageChange={setPage} /></div>}
      </div>
    </div>
  );
}
