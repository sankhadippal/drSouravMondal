import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, Stethoscope, Building2, CalendarClock, CalendarX,
  Calendar, Users, CreditCard, BarChart2, MessageSquare, Bell, HelpCircle,
  Settings, Shield, FileText, LogOut, Menu, X, ChevronDown, ChevronRight,
  BookOpen, Image, Star, Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/doctor-profile', icon: User, label: 'Doctor Profile' },
  { to: '/admin/services', icon: Stethoscope, label: 'Services' },
  { label: 'Chamber Management', icon: Building2, sub: [
    { to: '/admin/chambers', label: 'Chambers' },
    { to: '/admin/schedules', label: 'Schedules' },
    { to: '/admin/blocked-dates', label: 'Blocked Dates' },
  ]},
  { to: '/admin/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/admin/patients', icon: Users, label: 'Patients' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/visitors', icon: BarChart2, label: 'Visitors' },
  { to: '/admin/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/faqs', icon: HelpCircle, label: 'FAQs' },
  { to: '/admin/blogs', icon: BookOpen, label: 'Blog Posts' },
  { to: '/admin/gallery', icon: Image, label: 'Gallery' },
  { to: '/admin/reviews', icon: Star, label: 'Patient Reviews' },
  { to: '/admin/cms-settings', icon: Sliders, label: 'CMS Settings' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/users', icon: Shield, label: 'Admin Users', roles: ['super_admin'] },
  { to: '/admin/audit-logs', icon: FileText, label: 'Audit Logs', roles: ['super_admin'] },
];

function SidebarItem({ item, collapsed, onNavigate }: { item: typeof NAV_ITEMS[0]; collapsed: boolean; onNavigate: () => void }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (item.sub) return item.sub.some(s => location.pathname.startsWith(s.to));
    return false;
  });

  if (item.sub) {
    const isActive = item.sub.some(s => location.pathname.startsWith(s.to));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
            isActive ? 'text-teal-700 bg-teal-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <><span className="flex-1 text-left">{item.label}</span>{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</>}
        </button>
        {open && !collapsed && (
          <div className="ml-8 mt-1 space-y-1">
            {item.sub.map(s => (
              <NavLink
                key={s.to}
                to={s.to}
                onClick={onNavigate}
                className={({ isActive }) => cn(
                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'text-teal-700 bg-teal-50 font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}
              >
                {s.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to!}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
        isActive ? 'text-teal-700 bg-teal-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      title={collapsed ? item.label : undefined}
    >
      {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/admin/login');
  };

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || !user?.role || item.roles.includes(user.role)
  );

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn('flex flex-col h-full bg-white', mobile ? 'w-72' : sidebarCollapsed ? 'w-16' : 'w-64')}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 40 40" className="w-6 h-6"><path d="M20 6 L20 34 M6 20 L34 20" stroke="white" strokeWidth="5" strokeLinecap="round" /></svg>
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm text-gray-900 leading-tight truncate">Sourav Clinic</p>
            <p className="text-xs text-teal-600">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        {visibleItems.map((item, i) => (
          <SidebarItem key={i} item={item} collapsed={!mobile && sidebarCollapsed} onNavigate={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        {(!sidebarCollapsed || mobile) && user && (
          <div className="px-3 py-2.5 mb-2 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          title={!mobile && sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!sidebarCollapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn('hidden lg:flex flex-col border-r border-gray-200 transition-all duration-300 flex-shrink-0', sidebarCollapsed ? 'w-16' : 'w-64')}>
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 shadow-2xl"><Sidebar mobile /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center gap-3 flex-shrink-0 z-20">
          {/* Mobile hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          {/* Desktop collapse */}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100" aria-label="Toggle sidebar">
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate capitalize">
              {location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
