import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { StaffDashboard } from '@/pages/StaffDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { ReportsPage } from '@/pages/ReportsPage';
import { StaffManagementPage } from '@/pages/StaffManagementPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { AdminStudentsPage } from '@/pages/AdminStudentsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Staff routes */}
            <Route
              element={
                <ProtectedRoute requiredRole="staff">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/staff" element={<StaffDashboard />} />
            </Route>

            {/* Admin routes */}
            <Route
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<AdminStudentsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/staff-management" element={<StaffManagementPage />} />
              <Route path="/admin/audit-log" element={<AuditLogPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
