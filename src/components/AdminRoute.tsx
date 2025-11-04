// src/components/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ADMIN_USER_ID } from '../lib/constants';

const AdminRoute = () => {
  const { user } = useAuthStore();

  // Redirect non-admins to the home page
  if (user?.id !== ADMIN_USER_ID) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
