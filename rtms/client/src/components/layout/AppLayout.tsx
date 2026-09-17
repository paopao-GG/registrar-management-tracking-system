import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAuth } from '@/lib/auth';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useActivityHeartbeat } from '@/hooks/useActivityHeartbeat';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Users,
  ScrollText,
  Sun,
  Moon,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  useInactivityTimeout(logout);
  useActivityHeartbeat(!!user);

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

  const currentPage = navItems.find((item) => item.to === location.pathname);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar — pages live in the menu so the content can use the full width */}
      <header className="z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-card px-3 shadow-sm md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <span className="text-sm font-bold tracking-tight">RTAMS</span>

          {currentPage && (
            <span className="truncate text-sm text-muted-foreground">
              / {currentPage.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user?.name}
          </span>

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Navigation drawer */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/50 bg-card shadow-lg focus:outline-none">
            <div className="flex items-start justify-between border-b border-border/50 p-6">
              <div>
                <DialogPrimitive.Title className="text-lg font-bold tracking-tight">
                  RTAMS
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  Bicol University Polangui
                </DialogPrimitive.Description>
              </div>

              <DialogPrimitive.Close
                className="rounded-sm opacity-70 hover:opacity-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
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

            <div className="border-t border-border/50 p-4">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs capitalize text-muted-foreground">{user?.role}</div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
