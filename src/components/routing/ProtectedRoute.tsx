import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  adminEmail?: string;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  adminEmail
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-infinity-dark-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-infinity-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && adminEmail) {
    if (user.email !== adminEmail) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (requireAdmin && !profile?.is_admin && !adminEmail) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
