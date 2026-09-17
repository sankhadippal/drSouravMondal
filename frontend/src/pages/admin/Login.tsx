import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Database, CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils';
import axios from 'axios';

interface LoginForm { email: string; password: string; }

type BackendStatus = 'checking' | 'ok' | 'no_server' | 'no_db';

function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Step 1: ping /health directly (no proxy rewrite confusion)
      try {
        const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const r = await axios.get(`${base}/health`, { timeout: 5000 });
        if (cancelled) return;

        if (r.data?.success) {
          // Step 2: check DB by hitting /api/settings — 200 means DB ok, 5xx means no DB
          try {
            await axios.get(`${base}/api/settings`, { timeout: 5000 });
            if (!cancelled) setStatus('ok');
          } catch (dbErr: unknown) {
            if (cancelled) return;
            const status = (dbErr as { response?: { status?: number } })?.response?.status;
            if (!status || status >= 500) {
              setStatus('no_db');
            } else {
              // Got a real response (even 4xx) — DB is up
              setStatus('ok');
            }
          }
        }
      } catch {
        if (!cancelled) setStatus('no_server');
      }
    };

    // Small delay so the UI renders before the check fires
    const t = setTimeout(check, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return status;
}

export default function AdminLogin() {
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const isLoading = useAuthStore(s => s.isLoading);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });
  const backendStatus = useBackendStatus();

  const onSubmit = async (data: LoginForm) => {
    setLoginError('');

    // Don't block login if checking is slow — just proceed
    if (backendStatus === 'no_server') {
      setLoginError('Backend server is not running. Open a terminal and run: cd backend && npm run dev');
      return;
    }

    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Login failed';
      if (
        msg.toLowerCase().includes('database not connected') ||
        msg.toLowerCase().includes('econnrefused') ||
        msg.toLowerCase().includes('503')
      ) {
        setLoginError('Database not connected. Please set up PostgreSQL — see instructions below.');
      } else if (
        msg.toLowerCase().includes('invalid credentials') ||
        msg.toLowerCase().includes('unauthorized')
      ) {
        setLoginError('Incorrect email or password. Please try again.');
      } else {
        setLoginError(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 40 40" className="w-8 h-8">
              <path d="M20 6 L20 34 M6 20 L34 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-heading text-xl font-bold text-white">Sourav Homoeopathic Clinic</h1>
          <p className="text-teal-300 text-sm mt-0.5">Admin Panel</p>
        </div>

        {/* Status Banner */}
        {backendStatus === 'checking' && (
          <div className="flex items-center gap-2 bg-white/10 text-teal-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Checking server connection…
          </div>
        )}
        {backendStatus === 'ok' && (
          <div className="flex items-center gap-2 bg-green-500/20 text-green-300 rounded-xl px-4 py-2.5 mb-4 text-sm border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Server &amp; database connected ✓
          </div>
        )}
        {backendStatus === 'no_server' && (
          <div className="bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <WifiOff className="w-4 h-4 flex-shrink-0" /> Backend server not running
            </div>
            <p className="text-red-300 text-xs">Open a terminal and run:</p>
            <code className="block bg-black/30 rounded mt-1 px-3 py-1.5 text-xs font-mono text-green-300">
              cd backend &amp;&amp; npm run dev
            </code>
          </div>
        )}
        {backendStatus === 'no_db' && (
          <div className="bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <Database className="w-4 h-4 flex-shrink-0" /> Database not connected
            </div>
            <p className="text-amber-300 text-xs">
              PostgreSQL is not running. See setup guide below.
            </p>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-5">Sign In</h2>

          {/* Error */}
          {loginError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm leading-snug">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                  })}
                  className={cn('input-field pl-10', errors.email && 'input-error')}
                  placeholder="admin@souravhomoeopathic.com"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  className={cn('input-field pl-10 pr-11', errors.password && 'input-error')}
                  placeholder="Your password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-msg">{errors.password.message}</p>}
            </div>

            {/* Submit — only disabled while actively loading, never blocked by status check */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-base mt-1 disabled:opacity-60"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Credentials hint once DB is confirmed ok */}
          {backendStatus === 'ok' && (
            <div className="mt-4 p-3 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-xs font-semibold text-teal-700 mb-1.5">Default login credentials</p>
              <div className="space-y-0.5">
                <p className="text-xs font-mono text-teal-600 select-all">admin@souravhomoeopathic.com</p>
                <p className="text-xs font-mono text-teal-600 select-all">Admin@12345</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-5">
            Restricted to authorized personnel only.
          </p>
        </div>

        {/* DB Setup Guide */}
        {(backendStatus === 'no_db' || backendStatus === 'no_server') && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-300" /> Database Setup Guide
            </h3>
            <div className="space-y-4 text-xs text-teal-300/90">

              <div>
                <p className="font-semibold text-teal-200 mb-1.5">
                  Option A — Free cloud PostgreSQL (no install)
                </p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Go to <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-white underline">neon.tech</a> → Sign up free → Create project</li>
                  <li>Copy the <strong className="text-white">connection string</strong></li>
                  <li>
                    Open <code className="bg-white/10 px-1 rounded">backend/.env</code>, set:
                    <code className="block bg-black/30 rounded mt-1 px-2 py-1 font-mono text-green-300 leading-relaxed">
                      DATABASE_URL=postgresql://...<br />DB_SSL=true
                    </code>
                  </li>
                  <li>
                    In terminal:
                    <code className="block bg-black/30 rounded mt-1 px-2 py-1 font-mono text-green-300">
                      cd backend && npm run migrate && npm run seed
                    </code>
                  </li>
                  <li>Restart the backend server, then log in above</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-teal-200 mb-1.5">
                  Option B — Install PostgreSQL locally
                </p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>
                    Download from <a href="https://www.postgresql.org/download/windows/" target="_blank" rel="noopener noreferrer" className="text-white underline">postgresql.org/download/windows</a>
                  </li>
                  <li>Install with default settings, set a password (e.g. <code className="bg-white/10 px-1 rounded">postgres</code>)</li>
                  <li>
                    Create database:
                    <code className="block bg-black/30 rounded mt-1 px-2 py-1 font-mono text-green-300">
                      CREATE DATABASE sourav_homoeopathic;
                    </code>
                  </li>
                  <li>
                    Update <code className="bg-white/10 px-1 rounded">backend/.env</code>:
                    <code className="block bg-black/30 rounded mt-1 px-2 py-1 font-mono text-green-300 leading-relaxed">
                      DB_PASSWORD=your_password<br />DB_SSL=false
                    </code>
                  </li>
                  <li>
                    Run migrations:
                    <code className="block bg-black/30 rounded mt-1 px-2 py-1 font-mono text-green-300">
                      cd backend && npm run migrate && npm run seed
                    </code>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
