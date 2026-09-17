import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor – attach access token ────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor – auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If backend says to clear token (e.g. stale SQLite ID in JWT), force logout immediately
    if (error.response?.status === 401 && error.response?.data?.clearToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      isRefreshing = false;
      window.location.href = '/admin/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Helper to extract error message ─────────────────────────────────────────
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Something went wrong';
  }
  return 'Something went wrong';
};

export default api;

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// ─── Doctor API ───────────────────────────────────────────────────────────────
export const doctorAPI = {
  get: () => api.get('/doctor'),
  update: (data: Record<string, unknown>) => api.put('/doctor', data),
};

// ─── Chambers API ─────────────────────────────────────────────────────────────
export const chambersAPI = {
  getAll: () => api.get('/chambers'),
  getAllAdmin: () => api.get('/chambers/admin/all'),
  getById: (id: string) => api.get(`/chambers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/chambers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/chambers/${id}`, data),
  delete: (id: string) => api.delete(`/chambers/${id}`),
};

// ─── Schedules API ────────────────────────────────────────────────────────────
export const schedulesAPI = {
  getByChamber: (chamberId: string) => api.get(`/schedules/${chamberId}`),
  update: (chamberId: string, schedules: unknown[]) => api.put(`/schedules/${chamberId}`, { schedules }),
};

// ─── Blocked Dates API ────────────────────────────────────────────────────────
export const blockedDatesAPI = {
  getAll: (params?: Record<string, string>) => api.get('/blocked-dates', { params }),
  create: (data: Record<string, unknown>) => api.post('/blocked-dates', data),
  delete: (id: string) => api.delete(`/blocked-dates/${id}`),
};

// ─── Services API ─────────────────────────────────────────────────────────────
export const servicesAPI = {
  getAll: () => api.get('/services'),
  create: (data: Record<string, unknown>) => api.post('/services', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

// ─── OTP API ──────────────────────────────────────────────────────────────────
export const otpAPI = {
  send: (contact: string, channel: 'mobile' | 'email', purpose: string) =>
    api.post('/otp/send', { contact, channel, purpose }),
  verify: (contact: string, channel: 'mobile' | 'email', otp: string, purpose: string) =>
    api.post('/otp/verify', { contact, channel, otp, purpose }),
};

// ─── Availability API ─────────────────────────────────────────────────────────
export const availabilityAPI = {
  getSlots: (params: { chamber_id?: string; date: string; consultation_type?: string }) => {
    // Remove undefined/empty values so Axios never sends "?chamber_id=undefined"
    const clean: Record<string, string> = { date: params.date };
    if (params.chamber_id && params.chamber_id !== 'undefined') clean.chamber_id = params.chamber_id;
    if (params.consultation_type) clean.consultation_type = params.consultation_type;
    return api.get('/availability', { params: clean });
  },
  getDates: (params: { chamber_id?: string; month: string; consultation_type?: string }) => {
    const clean: Record<string, string> = { month: params.month };
    if (params.chamber_id && params.chamber_id !== 'undefined') clean.chamber_id = params.chamber_id;
    if (params.consultation_type) clean.consultation_type = params.consultation_type;
    return api.get('/availability/dates', { params: clean });
  },
};

// ─── Appointments API ─────────────────────────────────────────────────────────
export const appointmentsAPI = {
  create: (data: Record<string, unknown>) => api.post('/appointments', data),
  getConfirmation: (appointmentNumber: string) => api.get(`/appointments/confirm/${appointmentNumber}`),
  adminList: (params?: Record<string, string | number>) => api.get('/appointments/admin', { params }),
  adminGet: (id: string) => api.get(`/appointments/admin/${id}`),
  adminUpdate: (id: string, data: Record<string, unknown>) => api.put(`/appointments/admin/${id}`, data),
  adminStats: () => api.get('/appointments/admin/stats/dashboard'),
  adminCalendar: (from: string, to: string) => api.get('/appointments/admin/calendar', { params: { from, to } }),
  adminCharts: () => api.get('/appointments/admin/charts'),
};

// ─── Payments API ─────────────────────────────────────────────────────────────
export const paymentsAPI = {
  createOrder: (appointment_id: string) => api.post('/payments/create-order', { appointment_id }),
  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; appointment_id: string }) =>
    api.post('/payments/verify', data),
  demoConfirm: (appointment_id: string) => api.post('/payments/demo-confirm', { appointment_id }),
  adminList: (params?: Record<string, string>) => api.get('/payments/admin', { params }),
  adminStats: () => api.get('/payments/admin/stats'),
  refund: (paymentId: string, amount?: number, reason?: string) =>
    api.post(`/payments/refund/${paymentId}`, { amount, reason }),
};

// ─── Visitors API ─────────────────────────────────────────────────────────────
export const visitorsAPI = {
  track: (data: Record<string, unknown>) => api.post('/visitors/track', data),
  getAll: (params?: Record<string, string>) => api.get('/visitors', { params }),
  getCharts: () => api.get('/visitors/charts'),
};

// ─── Contact API ──────────────────────────────────────────────────────────────
export const contactAPI = {
  send: (data: { name: string; mobile: string; email?: string; message: string }) =>
    api.post('/contact', data),
  adminList: (params?: Record<string, string>) => api.get('/contact', { params }),
  adminUpdate: (id: string, data: { status: string; admin_notes?: string }) =>
    api.put(`/contact/${id}`, data),
};

// ─── FAQs API ─────────────────────────────────────────────────────────────────
export const faqsAPI = {
  getAll: () => api.get('/faqs'),
  create: (data: { question: string; answer: string; category?: string; sort_order?: number }) =>
    api.post('/faqs', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/faqs/${id}`, data),
  delete: (id: string) => api.delete(`/faqs/${id}`),
};

// ─── Settings API ─────────────────────────────────────────────────────────────
export const settingsAPI = {
  getPublic: () => api.get('/settings'),
  getAdmin: () => api.get('/settings/admin'),
  update: (settings: Record<string, string>) => api.put('/settings', settings),
};

// ─── Audit Logs API ───────────────────────────────────────────────────────────
export const auditLogsAPI = {
  getAll: (params?: Record<string, string>) => api.get('/audit-logs', { params }),
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params?: Record<string, string>) => api.get('/notifications', { params }),
};

// ─── Export API ───────────────────────────────────────────────────────────────
export const exportAPI = {
  appointments: (params?: Record<string, string>) =>
    api.get('/export/appointments', { params, responseType: 'blob' }),
  patients: () => api.get('/export/patients', { responseType: 'blob' }),
  payments: (params?: Record<string, string>) =>
    api.get('/export/payments', { params, responseType: 'blob' }),
  revenueReport: (params?: Record<string, string>) =>
    api.get('/export/revenue-report', { params, responseType: 'blob' }),
};

// ─── Blog API ─────────────────────────────────────────────────────────────────
export const blogsAPI = {
  getAll: (params?: { page?: string; limit?: string; tag?: string }) =>
    api.get('/blogs', { params }),
  getBySlug: (slug: string) => api.get(`/blogs/${slug}`),
  adminList: (params?: { page?: string; limit?: string; status?: string }) =>
    api.get('/blogs/admin/list', { params }),
  adminGet: (id: string) => api.get(`/blogs/admin/${id}`),
  create: (formData: FormData) =>
    api.post('/blogs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, formData: FormData) =>
    api.put(`/blogs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/blogs/${id}`),
};

// ─── Gallery API ──────────────────────────────────────────────────────────────
export const galleryAPI = {
  getAll: () => api.get('/gallery'),
  getAdmin: () => api.get('/gallery/admin'),
  upload: (formData: FormData) =>
    api.post('/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/gallery/${id}`, data),
  reorder: (order: { id: string; sort_order: number }[]) =>
    api.put('/gallery/reorder/bulk', { order }),
  delete: (id: string) => api.delete(`/gallery/${id}`),
};

// ─── Reviews API ──────────────────────────────────────────────────────────────
export const reviewsAPI = {
  getAll: (params?: { featured?: string }) => api.get('/reviews', { params }),
  getStats: () => api.get('/reviews/stats'),
  submit: (data: { patient_name: string; rating: number; review_text: string; patient_location?: string; treatment_for?: string }) =>
    api.post('/reviews', data),
  adminList: (params?: { page?: string; limit?: string; status?: string }) =>
    api.get('/reviews/admin', { params }),
  adminUpdate: (id: string, data: { status?: string; is_featured?: boolean; admin_notes?: string }) =>
    api.put(`/reviews/admin/${id}`, data),
  adminDelete: (id: string) => api.delete(`/reviews/admin/${id}`),
};

// ─── Media API ────────────────────────────────────────────────────────────────
export const mediaAPI = {
  uploadDoctorImage: (formData: FormData) =>
    api.post('/media/doctor-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadGeneral: (formData: FormData) =>
    api.post('/media/general', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const patientsAPI = {
  getAll: (params?: Record<string, string | number>) => api.get('/patients', { params }),
  getById: (id: string) => api.get(`/patients/${id}`),
};
