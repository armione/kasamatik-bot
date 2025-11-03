// src/components/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AdminRoute = () => {
  const { profileRole } = useAuthStore();

  // Redirect non-admins/moderators to the home page
  if (profileRole !== 'admin' && profileRole !== 'moderator') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;