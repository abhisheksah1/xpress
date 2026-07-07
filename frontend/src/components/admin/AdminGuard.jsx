import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export default function AdminGuard({ children }) {
  const location = useLocation();
  const { user, isStaff, fetchProfile } = useAuthStore();
  const [checking, setChecking] = useState(!user);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setChecking(false);
      return;
    }
    if (!user) {
      fetchProfile()
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [user, fetchProfile]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!localStorage.getItem('accessToken') || !isStaff()) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
