import { useRef, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { SealMark, Wordmark } from '@/components/ui/seal-mark';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ScrollProgress } from './scroll-progress';
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
  ChevronRight,
} from 'lucide-react';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

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

  const currentPage = navItems.find((item) => item.to === location.pathname);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out of RTAMS?',
      description: 'You will need to sign in again to continue working.',
      confirmText: 'Log out',
    });
    if (ok) logout();
  };

  return (
    <div data-app-shell className="flex h-screen flex-col bg-background">
      {/* Top bar — pages live in the menu so the content can use the full width */}
      <header
        data-print-hide
        className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 md:px-6"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            to={navItems[0].to}
            className="flex items-center gap-2.5 rounded-md px-1 py-0.5 transition-opacity hover:opacity-80"
          >
            <SealMark className="h-7 w-7 text-[0.7rem] ring-offset-card" />
            <Wordmark className="text-base" />
          </Link>

          {currentPage && (
            <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">{currentPage.label}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="mr-1 hidden items-center gap-2.5 sm:flex">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="eyebrow text-[0.6rem]">{user?.role}</div>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary font-mono text-xs font-semibold">
              {initials(user?.name)}
            </span>
          </div>

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        <ScrollProgress target={mainRef} />
      </header>

      {/* Navigation drawer */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--shadow)/0.45)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/70 bg-card shadow-float duration-300 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
            <div className="flex items-start justify-between border-b border-border/70 p-6">
              <div className="flex items-center gap-3">
                <SealMark className="h-10 w-10 text-base ring-offset-card" />
                <div>
                  <DialogPrimitive.Title className="font-display text-xl font-semibold leading-tight tracking-tight">
                    RTAMS
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-xs text-muted-foreground">
                    Bicol University Polangui
                  </DialogPrimitive.Description>
                </div>
              </div>

              <DialogPrimitive.Close
                className="-mr-2 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <nav className="flex-1 space-y-0.5 p-3">
              <p className="eyebrow px-3 pb-2 pt-1">Navigation</p>
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all',
                      active
                        ? 'bg-primary font-medium text-primary-foreground shadow-paper'
                        : 'text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-seal transition-opacity',
                        active ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 border-t border-border/70 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary font-mono text-xs font-semibold">
                {initials(user?.name)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user?.name}</div>
                <div className="eyebrow text-[0.6rem]">{user?.role}</div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Main content */}
      <main ref={mainRef} data-app-main className="flex-1 overflow-auto">
        <div className="print-only mb-4 border-b border-black pb-2">
          <div className="font-display text-lg font-semibold">RTAMS — Bicol University Polangui</div>
          <div className="text-xs">
            {currentPage?.label ?? 'Report'} · Printed {format(new Date(), 'MMMM d, yyyy h:mm a')}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
