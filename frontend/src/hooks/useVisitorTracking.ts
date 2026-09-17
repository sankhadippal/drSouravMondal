import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { visitorsAPI } from '../services/api';

const SESSION_KEY = 'shc_session_id';
const VISITOR_KEY = 'shc_is_returning';

const generateSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
};

const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Other';
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    // Skip admin paths
    if (location.pathname.startsWith('/admin')) return;

    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    const isReturning = !!localStorage.getItem(VISITOR_KEY);
    if (!isReturning) localStorage.setItem(VISITOR_KEY, '1');

    const trackData = {
      session_id: sessionId,
      page_path: location.pathname,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      is_new_visitor: !isReturning,
    };

    // Fire and forget
    visitorsAPI.track(trackData).catch(() => {});
  }, [location.pathname]);
};
