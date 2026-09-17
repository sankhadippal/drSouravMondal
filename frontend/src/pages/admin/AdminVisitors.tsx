import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, Users, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { visitorsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function AdminVisitors() {
  const [data, setData] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([visitorsAPI.getAll(), visitorsAPI.getCharts()])
      .then(([vRes, cRes]) => { setData(vRes.data.data); setCharts(cRes.data.data); })
      .catch(() => toast.error('Failed to load visitor data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20 mx-auto" />;

  const stats = data?.stats || {};
  const deviceData = charts?.by_device?.map((d: any) => ({ name: d.device_type || 'unknown', value: parseInt(d.count) })) || [];

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold text-gray-900">Website Visitors</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Visits', value: stats.total_visits || 0, icon: Eye },
          { label: "Today's Visits", value: stats.today_visits || 0, icon: Eye },
          { label: 'Unique Sessions', value: stats.unique_sessions || 0, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5 text-center">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-3"><Icon className="w-5 h-5 text-teal-700" /></div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Visits — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts?.visits_by_day || []} margin={{ left: -15, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={v => `Date: ${v}`} />
              <Bar dataKey="visits" fill="#0f766e" radius={[3,3,0,0]} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Device Type</h3>
          {deviceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deviceData} cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {deviceData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Visits']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {deviceData.map((d: any, i: number) => (
              <div key={d.name} className="flex items-center gap-1 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Pages */}
      {data?.top_pages?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Pages</h3>
          <div className="space-y-2">
            {data.top_pages.map((p: any) => {
              const pct = Math.round((parseInt(p.visits) / (stats.total_visits || 1)) * 100);
              return (
                <div key={p.page_path} className="flex items-center gap-3">
                  <p className="text-sm text-gray-700 w-40 truncate font-mono">{p.page_path}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-teal-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-sm font-medium text-gray-800 w-12 text-right">{p.visits}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <strong>Privacy Notice:</strong> Visitor IP addresses are stored in hashed form only. No personally identifiable information is collected without consent.
      </div>
    </div>
  );
}
