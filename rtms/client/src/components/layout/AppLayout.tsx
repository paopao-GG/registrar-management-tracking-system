import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, FileText, Users, ScrollText } from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  useInactivityTimeout(logout);

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/reports', label: 'Reports', icon: FileText },
        { to: '/admin/staff-management', label: 'Staff', icon: Users },
        { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
      ]
    : [{ to: '/staff', label: 'Dashboard', icon: LayoutDashboard }];

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-muted/40 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold">RTMS</h1>
          <p className="text-xs text-muted-foreground">Bicol University Polangui</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                location.pathname === item.to
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
          <Button variant="ghost" size="sm" className="w-full mt-2 justify-start" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
