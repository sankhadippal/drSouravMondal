import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Star, Trash2, Eye, Award, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewsAPI, getErrorMessage } from '../../services/api';
import { formatDate } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { cn } from '../../utils';

interface Review {
  id: string; patient_name: string; patient_location?: string;
  rating: number; review_text: string; treatment_for?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean; admin_notes?: string; created_at: string;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn('w-3.5 h-3.5', i <= n ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Review | null>(null);
  const [deleteId, setDeleteId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reviewsAPI.adminList({ page: String(page), limit: '20', status: statusFilter || undefined });
      setReviews(r.data.data || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const action = async (id: string, data: Record<string, unknown>, label: string) => {
    setActionLoading(id);
    try {
      await reviewsAPI.adminUpdate(id, data as any);
      toast.success(label);
      setSelected(null);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await reviewsAPI.adminDelete(deleteId); toast.success('Review deleted'); setDeleteId(''); load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setDeleting(false); }
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900 flex items-center gap-2">
            Patient Reviews
            {pendingCount > 0 && !statusFilter && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Approve reviews to show them on the public website</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize',
              statusFilter === s ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
            {s || 'All'} {s === 'pending' && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>Rating</th><th>Review</th><th>Treatment</th><th>Status</th><th>Featured</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && reviews.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  No reviews found
                </td></tr>
              )}
              {reviews.map(r => (
                <tr key={r.id} className={r.status === 'pending' ? 'bg-amber-50/30' : ''}>
                  <td>
                    <p className="font-medium text-gray-900 text-sm">{r.patient_name}</p>
                    {r.patient_location && <p className="text-xs text-gray-400">{r.patient_location}</p>}
                  </td>
                  <td><Stars n={r.rating} /></td>
                  <td className="max-w-[200px]">
                    <p className="text-xs text-gray-600 line-clamp-2">{r.review_text}</p>
                  </td>
                  <td className="text-xs text-gray-500">{r.treatment_for || '—'}</td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    {r.is_featured
                      ? <span className="text-xs bg-amber-100 text-amber-700 badge">⭐ Featured</span>
                      : <span className="text-xs text-gray-400">—</span>
                    }
                  </td>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(r)} title="View" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      {r.status !== 'approved' && (
                        <button onClick={() => action(r.id, { status: 'approved' }, 'Review approved')}
                          disabled={actionLoading === r.id}
                          title="Approve" className="p-1.5 rounded hover:bg-green-50 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button onClick={() => action(r.id, { status: 'rejected' }, 'Review rejected')}
                          disabled={actionLoading === r.id}
                          title="Reject" className="p-1.5 rounded hover:bg-red-50 text-red-500">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setDeleteId(r.id)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Review Detail" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{selected.patient_name}</p>
                {selected.patient_location && <p className="text-sm text-gray-500">{selected.patient_location}</p>}
              </div>
              <Stars n={selected.rating} />
            </div>
            {selected.treatment_for && (
              <div className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full w-fit">
                Treatment: {selected.treatment_for}
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
              "{selected.review_text}"
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Status</p>
                <Badge status={selected.status} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Submitted</p>
                <p className="font-medium text-gray-800">{formatDate(selected.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
              {selected.status !== 'approved' && (
                <button onClick={() => action(selected.id, { status: 'approved' }, 'Review approved')}
                  className="btn-primary text-sm py-2 gap-2 flex-1 justify-center">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              )}
              {selected.status !== 'rejected' && (
                <button onClick={() => action(selected.id, { status: 'rejected' }, 'Review rejected')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold gap-2 flex-1 flex items-center justify-center transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              )}
              <button
                onClick={() => action(selected.id, { is_featured: !selected.is_featured },
                  selected.is_featured ? 'Removed from featured' : 'Added to featured')}
                className="btn-outline text-sm py-2 gap-2 justify-center">
                <Award className="w-4 h-4" />
                {selected.is_featured ? 'Unfeature' : 'Feature'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete}
        loading={deleting} title="Delete Review" message="Permanently remove this review?" confirmLabel="Delete" />
    </div>
  );
}
