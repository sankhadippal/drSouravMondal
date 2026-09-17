import { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, TrendingUp, CreditCard, XCircle, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Payment } from '../../types';
import { paymentsAPI, exportAPI, getErrorMessage } from '../../services/api';
import { formatDateTime, formatCurrency, downloadBlob } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refundModal, setRefundModal] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        paymentsAPI.adminList({ page: String(page), limit: '25', status: statusFilter, from_date: fromDate, to_date: toDate }),
        paymentsAPI.adminStats(),
      ]);
      setPayments(pRes.data.data || []);
      setTotal(pRes.data.total || 0);
      setTotalPages(pRes.data.totalPages || 1);
      setStats(sRes.data.data);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, statusFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportAPI.payments({ from_date: fromDate, to_date: toDate });
      downloadBlob(r.data as Blob, `payments_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefunding(true);
    try {
      await paymentsAPI.refund(refundModal.id, refundAmount ? parseFloat(refundAmount) : undefined, refundReason);
      toast.success('Refund initiated successfully');
      setRefundModal(null);
      setRefundAmount('');
      setRefundReason('');
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setRefunding(false); }
  };

  const StatCard = ({ label, value, icon: Icon, color = 'teal' }: { label: string; value: string; icon: React.ComponentType<{className?: string}>; color?: string }) => {
    const c: Record<string, string> = { teal: 'bg-teal-50 text-teal-700', green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700', red: 'bg-red-50 text-red-700', orange: 'bg-orange-50 text-orange-700' };
    return (
      <div className="card p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c[color]}`}><Icon className="w-5 h-5" /></div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Payments</h1>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline gap-1.5 text-sm py-2"><RefreshCw className="w-4 h-4" />Refresh</button>
          <button onClick={handleExport} disabled={exporting} className="btn-outline gap-1.5 text-sm py-2"><Download className="w-4 h-4" />{exporting ? 'Exporting...' : 'Export CSV'}</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Revenue" value={formatCurrency(stats.total_revenue || 0)} icon={TrendingUp} color="teal" />
          <StatCard label="Today" value={formatCurrency(stats.today_revenue || 0)} icon={CreditCard} color="green" />
          <StatCard label="Weekly" value={formatCurrency(stats.weekly_revenue || 0)} icon={TrendingUp} color="blue" />
          <StatCard label="Monthly" value={formatCurrency(stats.monthly_revenue || 0)} icon={TrendingUp} color="teal" />
          <StatCard label="Successful" value={String(stats.successful_payments || 0)} icon={CreditCard} color="green" />
          <StatCard label="Refunds" value={String(stats.total_refunds || 0)} icon={RotateCcw} color="orange" />
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36">
          <option value="">All Status</option>
          {['pending', 'paid', 'failed', 'refunded', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-40" />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-40" />
        <button onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); setPage(1); }} className="btn-outline text-sm py-2">Clear</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Appt. Number</th><th>Patient</th><th>Amount</th><th>Razorpay Order</th><th>Razorpay Payment</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No payments found</td></tr>}
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-teal-700 font-semibold">{p.appointment_number}</td>
                  <td><p className="font-medium text-sm text-gray-900">{p.patient_name}</p><p className="text-xs text-gray-400">{p.mobile}</p></td>
                  <td className="font-bold text-teal-700">₹{p.amount}</td>
                  <td className="font-mono text-xs text-gray-500 max-w-[140px] truncate">{p.razorpay_order_id || '—'}</td>
                  <td className="font-mono text-xs text-gray-500 max-w-[140px] truncate">{p.razorpay_payment_id || '—'}</td>
                  <td><Badge status={p.status} /></td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(p.paid_at || p.created_at)}</td>
                  <td>
                    {p.status === 'paid' && (
                      <button onClick={() => { setRefundModal(p); setRefundAmount(String(p.amount)); }} className="p-1.5 rounded hover:bg-orange-50 text-orange-600 text-xs flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={25} onPageChange={setPage} /></div>}
      </div>

      {/* Refund Modal */}
      <Modal isOpen={!!refundModal} onClose={() => setRefundModal(null)} title="Initiate Refund" size="sm">
        {refundModal && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p>Initiating refund for payment <strong>{refundModal.razorpay_payment_id}</strong></p>
              <p className="mt-1">Original amount: <strong>₹{refundModal.amount}</strong></p>
            </div>
            <div>
              <label className="label">Refund Amount (₹)</label>
              <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="input-field" min="1" max={refundModal.amount} />
              <p className="text-xs text-gray-400 mt-1">Leave as full amount for complete refund</p>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} className="input-field resize-none" rows={3} placeholder="Reason for refund..." />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button onClick={() => setRefundModal(null)} className="btn-secondary text-sm py-2">Cancel</button>
              <button onClick={handleRefund} disabled={refunding} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {refunding ? 'Processing...' : 'Initiate Refund'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
