import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Patient, Appointment } from '../../types';
import { patientsAPI, exportAPI, getErrorMessage } from '../../services/api';
import { formatDate, downloadBlob } from '../../utils';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<(Patient & { appointments?: Appointment[] }) | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await patientsAPI.getAll({ page, limit: 20, search });
      setPatients(r.data.data || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const viewPatient = async (id: string) => {
    try {
      const r = await patientsAPI.getById(id);
      setSelected(r.data.data);
    } catch { toast.error('Failed to load patient details'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportAPI.patients();
      downloadBlob(r.data as Blob, `patients_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Patients <span className="text-gray-400 font-normal text-base">({total})</span></h1>
        <button onClick={handleExport} disabled={exporting} className="btn-outline gap-1.5 text-sm py-2"><Download className="w-4 h-4" />{exporting ? 'Exporting...' : 'Export CSV'}</button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9 py-2 text-sm" placeholder="Search name, mobile, email..." />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Mobile</th><th>Email</th><th>Total Appts</th><th>Last Visit</th><th>Action</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && patients.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No patients found</td></tr>}
              {patients.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-900">{p.name}</td>
                  <td>{p.age}</td>
                  <td className="capitalize">{p.sex}</td>
                  <td className="font-mono text-sm">{p.mobile}</td>
                  <td className="text-gray-500 text-sm">{p.email || '—'}</td>
                  <td className="text-center"><span className="bg-teal-100 text-teal-700 badge">{p.total_appointments || 0}</span></td>
                  <td className="text-sm text-gray-500">{p.last_appointment ? formatDate(p.last_appointment) : '—'}</td>
                  <td><button onClick={() => viewPatient(p.id)} className="p-1.5 rounded hover:bg-teal-50 text-teal-600"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} /></div>}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[['Name', selected.name], ['Age', String(selected.age)], ['Sex', selected.sex], ['Mobile', selected.mobile], ['Email', selected.email || '—'], ['Address', selected.address || '—'], ['Registered', formatDate(selected.created_at)]].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-800 mt-0.5 capitalize">{v}</p></div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Appointment History</h3>
              <div className="overflow-x-auto">
                <table className="admin-table text-sm">
                  <thead><tr><th>Appt. ID</th><th>Date</th><th>Type</th><th>Chamber</th><th>Fee</th><th>Payment</th><th>Status</th></tr></thead>
                  <tbody>
                    {(selected.appointments || []).map((a: Appointment) => (
                      <tr key={a.id}>
                        <td className="font-mono text-xs">{a.appointment_number}</td>
                        <td className="whitespace-nowrap">{formatDate(a.appointment_date)}</td>
                        <td><span className={`badge text-xs ${a.consultation_type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>{a.consultation_type}</span></td>
                        <td className="text-gray-500">{a.chamber_name || '—'}</td>
                        <td>₹{a.consultation_fee}</td>
                        <td><Badge status={a.payment_status || 'pending'} /></td>
                        <td><Badge status={a.status} /></td>
                      </tr>
                    ))}
                    {(!selected.appointments || selected.appointments.length === 0) && <tr><td colSpan={7} className="text-center py-6 text-gray-400">No appointments</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
