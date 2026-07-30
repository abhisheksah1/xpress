import { useCallback, useEffect, useRef } from 'react';
import { refreshAccessToken } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

const DEFAULT_IDLE_MINUTES = 10;
/** Refresh access token while active, before the typical 15m JWT expiry. */
const ACTIVE_REFRESH_MS = 8 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

/**
 * Admin session policy:
 * - While the user is active, keep the access token refreshed so they are not logged out mid-work.
 * - After `idleMinutes` with no activity, log out automatically (default 10 minutes).
 */
export default function useAdminSessionKeepAlive({ idleMinutes = DEFAULT_IDLE_MINUTES } = {}) {
  const logout = useAuthStore((s) => s.logout);
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(0);
  const loggingOutRef = useRef(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, markActivity, { passive: true });
    });
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, markActivity);
      });
    };
  }, [markActivity]);

  useEffect(() => {
    const idleMs = Math.max(1, Number(idleMinutes) || DEFAULT_IDLE_MINUTES) * 60 * 1000;

    const forceIdleLogout = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await logout();
      } catch {
        /* ignore */
      }
      localStorage.removeItem('accessToken');
      useAuthStore.setState({ user: null, accessToken: null });
      window.location.href = '/admin/login?reason=idle';
    };

    const tick = async () => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= idleMs) {
        await forceIdleLogout();
        return;
      }

      // Still active — refresh token periodically so the 15m JWT does not expire mid-session
      if (now - lastRefreshRef.current >= ACTIVE_REFRESH_MS) {
        try {
          await refreshAccessToken();
          lastRefreshRef.current = now;
        } catch {
          /* interceptor / next request will handle hard failures */
        }
      }
    };

    const intervalId = window.setInterval(tick, 30 * 1000);
    // Initial keep-alive shortly after mount
    const bootId = window.setTimeout(() => {
      refreshAccessToken()
        .then(() => {
          lastRefreshRef.current = Date.now();
        })
        .catch(() => {});
    }, 5 * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(bootId);
    };
  }, [idleMinutes, logout]);
}
