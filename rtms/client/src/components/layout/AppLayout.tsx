import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, FileText, Users, ScrollText, Sun, Moon, GraduationCap } from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  useInactivityTimeout(logout);

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/reports', label: 'Reports', icon: FileText },
        { to: '/admin/staff-management', label: 'Staff', icon: Users },
        { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
      ]
    : [{ to: '/staff', label: 'Dashboard', icon: LayoutDashboard }];

  const ThemeToggle = () => (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-64 flex-col bg-card shadow-md border-r border-border/50">
        <div className="p-6 border-b border-border/50">
          <h1 className="text-lg font-bold tracking-tight">RTAMS</h1>
          <p className="text-xs text-muted-foreground">Bicol University Polangui</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all',
                location.pathname === item.to
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </div>
            <ThemeToggle />
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2 justify-start" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile top header — both staff and admin */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border/50 shadow-sm flex items-center justify-between px-4">
        <div>
          <span className="text-sm font-bold tracking-tight">RTAMS</span>
          {!isAdmin && <span className="text-xs text-muted-foreground ml-2">{user?.name}</span>}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!isAdmin && (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className={cn('flex-1 overflow-auto pt-14 md:pt-0', isAdmin && 'pb-16 md:pb-0')}>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar — admin mobile only */}
      {isAdmin && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 shadow-lg flex">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
          {/* Logout item for admin mobile */}
          <button
            onClick={logout}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs text-muted-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="leading-none">Logout</span>
          </button>
        </nav>
      )}
    </div>
  );
}
