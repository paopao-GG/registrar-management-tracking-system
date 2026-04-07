import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff';
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const redirect = user.role === 'admin' ? '/admin' : '/staff';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
