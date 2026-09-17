import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { SealMark } from '@/components/ui/seal-mark';
import { Sun, Moon, AlertCircle, ArrowRight, ClipboardCheck, PenLine, BarChart3 } from 'lucide-react';

const highlights = [
  { icon: ClipboardCheck, text: 'Track every document request from intake to release' },
  { icon: PenLine, text: 'Capture student signatures on the counter tablet' },
  { icon: BarChart3, text: 'Report staff accomplishments by day, month, or term' },
];

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      const savedUser = JSON.parse(localStorage.getItem('rtams_user') || '{}');
      navigate(savedUser.role === 'admin' ? '/admin' : '/staff');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Institutional panel */}
      <aside className="relative hidden overflow-hidden bg-[hsl(222_60%_14%)] text-[hsl(40_30%_94%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 36px)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border-[40px] border-[hsl(38_80%_48%/0.14)]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(38_80%_48%/0.1)] blur-3xl"
        />

        <div className="relative flex items-center gap-3 animate-fade-up">
          <SealMark className="h-11 w-11 bg-[hsl(40_30%_94%)] text-base text-[hsl(222_60%_14%)] ring-offset-[hsl(222_60%_14%)]" />
          <div>
            <p className="font-display text-xl font-semibold leading-none">RTAMS</p>
            <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
              Office of the Registrar
            </p>
          </div>
        </div>

        <div className="relative max-w-lg space-y-8">
          <h1
            className="font-display text-5xl font-medium leading-[1.05] animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            Every record,
            <br />
            <em className="font-normal text-[hsl(38_80%_62%)]">accounted for.</em>
          </h1>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm opacity-85 animate-fade-up"
                style={{ animationDelay: `${160 + i * 70}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[0.65rem] uppercase tracking-[0.2em] opacity-60">
          Bicol University Polangui
        </p>
      </aside>

      {/* Sign-in form */}
      <main className="paper-texture relative flex items-center justify-center p-6 sm:p-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
          className="absolute right-4 top-4"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="w-full max-w-sm page-enter">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <SealMark className="h-10 w-10 text-base" />
            <div>
              <p className="font-display text-xl font-semibold leading-none">RTAMS</p>
              <p className="mt-1 text-xs text-muted-foreground">Bicol University Polangui</p>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <p className="eyebrow">Staff sign-in</p>
            <h2 className="font-display text-3xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Registrar Task Accomplishment Monitoring System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
                aria-invalid={!!error || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                aria-invalid={!!error || undefined}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
              )}
            </Button>
            <p className="border-t border-border/70 pt-4 text-center text-xs text-muted-foreground">
              Forgot your password? Contact the Registrar for a reset.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
