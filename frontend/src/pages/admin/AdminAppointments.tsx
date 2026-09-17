import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Download, Eye, X, CheckCircle, XCircle, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Appointment } from '../../types';
import { appointmentsAPI, exportAPI, getErrorMessage } from '../../services/api';
import { formatDate, formatTime, statusColors, downloadBlob } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'];

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await appointmentsAPI.adminList({ page, limit: 20, search, status, consultation_type: consultationType, from_date: fromDate, to_date: toDate });
      setAppointments(r.data.data || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [page, search, status, consultationType, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const viewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await appointmentsAPI.adminGet(id);
      setSelectedAppt(r.data.data);
      setNewStatus(r.data.data.status);
    } catch { toast.error('Failed to load details'); }
    finally { setDetailLoading(false); }
  };

  const updateStatus = async () => {
    if (!selectedAppt || !newStatus) return;
    setUpdatingId(selectedAppt.id);
    try {
      await appointmentsAPI.adminUpdate(selectedAppt.id, { status: newStatus, cancelled_reason: cancelReason || undefined });
      toast.success('Status updated');
      setSelectedAppt(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setUpdatingId(''); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportAPI.appointments({ from_date: fromDate, to_date: toDate, status });
      downloadBlob(r.data as Blob, `appointments_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const resetFilters = () => { setSearch(''); setStatus(''); setConsultationType(''); setFromDate(''); setToDate(''); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Appointments <span className="text-gray-400 font-normal text-base">({total})</span></h1>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline gap-1.5 text-sm py-2"><RefreshCw className="w-4 h-4" />Refresh</button>
          <button onClick={handleExport} disabled={exporting} className="btn-outline gap-1.5 text-sm py-2"><Download className="w-4 h-4" />{exporting ? 'Exporting...' : 'Export CSV'}</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9 py-2 text-sm" placeholder="Search patient, ID..." />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field py-2 text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select value={consultationType} onChange={e => { setConsultationType(e.target.value); setPage(1); }} className="input-field py-2 text-sm">
          <option value="">All Types</option>
          <option value="online">Online</option>
          <option value="chamber">Chamber</option>
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm" placeholder="From" />
        <div className="flex gap-2">
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm flex-1" placeholder="To" />
          <button onClick={resetFilters} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs" title="Clear filters"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Appt. ID</th><th>Patient</th><th>Mobile</th><th>Type</th><th>Chamber</th><th>Date</th><th>Time</th><th>Fee</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && appointments.length === 0 && <tr><td colSpan={11} className="text-center py-12 text-gray-400">No appointments found</td></tr>}
              {appointments.map(a => (
                <tr key={a.id}>
                  <td className="font-mono text-xs text-teal-700 font-semibold">{a.appointment_number}</td>
                  <td><p className="font-medium text-gray-900 text-sm">{a.patient_name}</p><p className="text-xs text-gray-400">{a.age}y · {a.sex}</p></td>
                  <td className="text-gray-600 text-sm">{a.mobile}</td>
                  <td><span className={`badge text-xs ${a.consultation_type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>{a.consultation_type}</span></td>
                  <td className="text-gray-500 text-xs max-w-[120px] truncate">{a.chamber_name || '—'}</td>
                  <td className="text-sm text-gray-700 whitespace-nowrap">{formatDate(a.appointment_date)}</td>
                  <td className="text-sm text-gray-700 whitespace-nowrap">{formatTime(a.appointment_time)}</td>
                  <td className="font-semibold text-teal-700 text-sm">₹{a.consultation_fee}</td>
                  <td><Badge status={a.payment_status || 'pending'} /></td>
                  <td><Badge status={a.status} /></td>
                  <td><button onClick={() => viewDetail(a.id)} className="p-1.5 rounded hover:bg-teal-50 text-teal-600"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} /></div>}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedAppt} onClose={() => setSelectedAppt(null)} title={`Appointment — ${selectedAppt?.appointment_number}`} size="lg">
        {detailLoading ? <LoadingSpinner size="md" className="py-8 mx-auto" /> : selectedAppt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Patient', selectedAppt.patient_name], ['Age/Sex', `${selectedAppt.age}y · ${selectedAppt.sex}`],
                ['Mobile', selectedAppt.mobile], ['Email', selectedAppt.email || '—'],
                ['Type', selectedAppt.consultation_type], ['Chamber', selectedAppt.chamber_name || 'Online'],
                ['Date', formatDate(selectedAppt.appointment_date)], ['Time', formatTime(selectedAppt.appointment_time)],
                ['Fee', `₹${selectedAppt.consultation_fee}`], ['Payment', selectedAppt.payment_status || 'pending'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {selectedAppt.reason && <div className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-xs text-gray-400">Reason</p><p className="mt-0.5 text-gray-700">{selectedAppt.reason}</p></div>}

            <div className="border-t border-gray-100 pt-4">
              <label className="label">Update Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input-field mb-3 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              {newStatus === 'cancelled' && (
                <><label className="label">Cancellation Reason</label>
                <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="input-field text-sm mb-3" placeholder="Reason for cancellation" /></>
              )}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setSelectedAppt(null)} className="btn-secondary text-sm py-2">Close</button>
                <button onClick={updateStatus} disabled={!!updatingId} className="btn-primary text-sm py-2">{updatingId ? 'Updating...' : 'Update Status'}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
