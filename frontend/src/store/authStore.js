import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client.js';
import {
  hasStaffPermission,
  isAdminUser,
  isSuperAdminUser,
} from '../utils/adminPermissions.js';

const STAFF_ROLES = ['super_admin', 'admin', 'staff'];

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      isStaff: () => STAFF_ROLES.includes(get().user?.role),
      isAdmin: () => isAdminUser(get().user),
      isSuperAdmin: () => isSuperAdminUser(get().user),
      hasPermission: (permission) => hasStaffPermission(get().user, permission),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const { user, accessToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken });
        return user;
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
