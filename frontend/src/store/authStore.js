import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client.js';
import {
  hasStaffPermission,
  isAdminUser,
  isSuperAdminUser,
} from '../utils/adminPermissions.js';
import { getDeviceMeta } from '../utils/adminDevice.js';

const STAFF_ROLES = ['super_admin', 'admin', 'staff'];

const applySession = (set, user, accessToken) => {
  localStorage.setItem('accessToken', accessToken);
  set({ user, accessToken });
  return user;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      isStaff: () => STAFF_ROLES.includes(get().user?.role),
      isAdmin: () => isAdminUser(get().user),
      isSuperAdmin: () => isSuperAdminUser(get().user),
      hasPermission: (permission) => hasStaffPermission(get().user, permission),

      login: async (email, password, { trustDevice = true } = {}) => {
        const device = getDeviceMeta();
        const { data } = await api.post('/auth/login', {
          email,
          password,
          trustDevice,
          ...device,
        });
        const payload = data.data;

        if (payload?.requiresOtp) {
          return {
            requiresOtp: true,
            challengeId: payload.challengeId,
            emailHint: payload.emailHint,
            deviceLabel: payload.deviceLabel,
            expiresInSeconds: payload.expiresInSeconds,
          };
        }

        return applySession(set, payload.user, payload.accessToken);
      },

      verifyAdminOtp: async ({ challengeId, otp, trustDevice = true }) => {
        const device = getDeviceMeta();
        const { data } = await api.post('/auth/verify-admin-otp', {
          challengeId,
          otp,
          trustDevice,
          deviceFingerprint: device.deviceFingerprint,
        });
        const payload = data.data;
        return applySession(set, payload.user, payload.accessToken);
      },

      resendAdminOtp: async (challengeId) => {
        const device = getDeviceMeta();
        const { data } = await api.post('/auth/resend-admin-otp', {
          challengeId,
          deviceFingerprint: device.deviceFingerprint,
        });
        return data.data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          /* ignore */
        }
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },

      fetchProfile: async () => {
        const { data } = await api.get('/auth/me');
        set({ user: data.data });
        return data.data;
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'koseli-auth', partialize: (s) => ({ user: s.user }) }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-cleared', () => {
    useAuthStore.setState({ user: null, accessToken: null });
  });
}
