import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useVisitorTracking } from './hooks/useVisitorTracking';
import LoadingSpinner from './components/ui/LoadingSpinner';

// ─── Public layout & pages ────────────────────────────────────────────────────
import PublicLayout from './components/layout/PublicLayout';
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const Services = lazy(() => import('./pages/public/Services'));
const Chambers = lazy(() => import('./pages/public/Chambers'));
const OnlineConsultation = lazy(() => import('./pages/public/OnlineConsultation'));
const Contact = lazy(() => import('./pages/public/Contact'));
const FAQPage = lazy(() => import('./pages/public/FAQPage'));
const BlogList = lazy(() => import('./pages/public/Blog'));
const BlogPost = lazy(() => import('./pages/public/BlogPost'));
const BookAppointment = lazy(() => import('./pages/booking/BookAppointment'));
const AppointmentConfirmation = lazy(() => import('./pages/booking/AppointmentConfirmation'));
const PrivacyPolicy = lazy(() => import('./pages/public/legal/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./pages/public/legal/TermsConditions'));
const CancellationPolicy = lazy(() => import('./pages/public/legal/CancellationPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// ─── Admin pages ──────────────────────────────────────────────────────────────
import AdminLayout from './components/layout/AdminLayout';
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminDoctorProfile = lazy(() => import('./pages/admin/DoctorProfile'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminChambers = lazy(() => import('./pages/admin/AdminChambers'));
const AdminSchedules = lazy(() => import('./pages/admin/AdminSchedules'));
const AdminBlockedDates = lazy(() => import('./pages/admin/AdminBlockedDates'));
const AdminAppointments = lazy(() => import('./pages/admin/AdminAppointments'));
const AdminPatients = lazy(() => import('./pages/admin/AdminPatients'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminVisitors = lazy(() => import('./pages/admin/AdminVisitors'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminFAQs = lazy(() => import('./pages/admin/AdminFAQs'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminCMSSettings = lazy(() => import('./pages/admin/AdminCMSSettings'));

// ─── Route Tracker ────────────────────────────────────────────────────────────
function RouteTracker() {
  useVisitorTracking();
  return null;
}

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// ─── App Entry ────────────────────────────────────────────────────────────────
function AppContent() {
  const loadUser = useAuthStore(s => s.loadUser);
  useEffect(() => { loadUser(); }, [loadUser]);

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="chambers" element={<Chambers />} />
          <Route path="online-consultation" element={<OnlineConsultation />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="appointment" element={<BookAppointment />} />
          <Route path="appointment/confirmation/:appointmentNumber" element={<AppointmentConfirmation />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-conditions" element={<TermsConditions />} />
          <Route path="cancellation-policy" element={<CancellationPolicy />} />
        </Route>

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Protected Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="doctor-profile" element={<AdminDoctorProfile />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="chambers" element={<AdminChambers />} />
          <Route path="schedules" element={<AdminSchedules />} />
          <Route path="blocked-dates" element={<AdminBlockedDates />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="visitors" element={<AdminVisitors />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="faqs" element={<AdminFAQs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="blogs" element={<AdminBlogs />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="cms-settings" element={<AdminCMSSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <AppContent />
    </BrowserRouter>
  );
}
