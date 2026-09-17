import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { PageLoader } from '@/components/ui/page-loader';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff';
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
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
