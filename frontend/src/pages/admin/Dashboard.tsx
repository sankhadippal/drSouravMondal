import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Users, CreditCard, TrendingUp, CheckCircle, XCircle,
  Video, Building2, Eye, ArrowUpRight, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { appointmentsAPI, paymentsAPI, visitorsAPI } from '../../services/api';
import { DashboardStats } from '../../types';
import { formatCurrency } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

function StatCard({ icon: Icon, label, value, sub, color = 'teal', to }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub?: string; color?: string; to?: string;
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700', purple: 'bg-purple-50 text-purple-700',
  };
  const card = (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {to && <ArrowUpRight className="w-4 h-4 text-gray-300" />}
      </div>
      <p className="text-2xl font-bold font-heading text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<Record<string, number> | null>(null);
  const [charts, setCharts] = useState<{ appointments_by_day: any[]; appointments_by_status: any[]; appointments_by_type: any[]; revenue_by_month: any[] } | null>(null);
  const [visitorStats, setVisitorStats] = useState<{ stats: any; visits_by_day: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, payRes, chartRes, visRes] = await Promise.allSettled([
        appointmentsAPI.adminStats(),
        paymentsAPI.adminStats(),
        appointmentsAPI.adminCharts(),
        visitorsAPI.getCharts(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (payRes.status === 'fulfilled') setPaymentStats(payRes.value.data.data);
      if (chartRes.status === 'fulfilled') setCharts(chartRes.value.data.data);
      if (visRes.status === 'fulfilled') setVisitorStats(visRes.value.data.data);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const statusPieData = charts?.appointments_by_status?.map(s => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    value: parseInt(s.count),
  })) || [];

  const typePieData = charts?.appointments_by_type?.map(t => ({
    name: t.consultation_type === 'online' ? 'Online' : 'Chamber',
    value: parseInt(t.count),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Last updated: {lastRefresh.toLocaleTimeString('en-IN')}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading && !stats ? (
        <LoadingSpinner size="lg" className="py-20 mx-auto" text="Loading dashboard..." />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Calendar} label="Today's Appointments" value={stats?.today_appointments ?? 0} color="teal" to="/admin/appointments" />
            <StatCard icon={Calendar} label="Upcoming" value={stats?.upcoming_appointments ?? 0} sub="Pending + Confirmed" color="blue" to="/admin/appointments" />
            <StatCard icon={CheckCircle} label="Completed" value={stats?.completed_appointments ?? 0} color="green" />
            <StatCard icon={XCircle} label="Cancelled" value={stats?.cancelled_appointments ?? 0} color="red" />
            <StatCard icon={Video} label="Online Consultations" value={stats?.online_consultations ?? 0} color="purple" />
            <StatCard icon={Building2} label="Chamber Visits" value={stats?.chamber_consultations ?? 0} color="blue" />
            <StatCard icon={Users} label="Total Patients" value={stats?.total_patients ?? 0} color="teal" to="/admin/patients" />
            <StatCard icon={Eye} label="Site Visitors" value={visitorStats?.stats?.total_visits ?? 0} color="amber" to="/admin/visitors" />
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CreditCard} label="Today's Revenue" value={formatCurrency(stats?.today_revenue ?? 0)} color="green" />
            <StatCard icon={TrendingUp} label="Monthly Revenue" value={formatCurrency(stats?.monthly_revenue ?? 0)} color="teal" />
            <StatCard icon={CreditCard} label="Total Revenue" value={formatCurrency(paymentStats?.total_revenue ?? 0)} color="blue" />
            <StatCard icon={TrendingUp} label="Weekly Revenue" value={formatCurrency(paymentStats?.weekly_revenue ?? 0)} color="purple" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Appointments by Day */}
            <div className="lg:col-span-2 card p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Appointments — Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts?.appointments_by_day || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="appointment_date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Appointments']} labelFormatter={l => `Date: ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} fill="url(#colorAppt)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Consultation Type Pie */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Consultation Type</h3>
              {typePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={typePieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {typePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Appointments']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend formatter={v => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue by Month */}
            <div className="lg:col-span-2 card p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Monthly Revenue (₹)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts?.revenue_by_month || []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Pie */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Appointment Status</h3>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Appointments']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
            </div>
          </div>

          {/* Visitors Chart */}
          {(visitorStats?.visits_by_day ?? []).length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Website Visitors — Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={visitorStats!.visits_by_day} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="visits" name="Total Visits" stroke="#f59e0b" strokeWidth={2} fill="url(#colorVis)" dot={false} />
                  <Area type="monotone" dataKey="unique_visitors" name="Unique Visitors" stroke="#0f766e" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { to: '/admin/appointments', label: 'View Appointments', icon: Calendar },
              { to: '/admin/patients', label: 'View Patients', icon: Users },
              { to: '/admin/payments', label: 'View Payments', icon: CreditCard },
              { to: '/admin/messages', label: 'View Messages', icon: Eye },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow group">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                  <Icon className="w-5 h-5 text-teal-700" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700 transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
