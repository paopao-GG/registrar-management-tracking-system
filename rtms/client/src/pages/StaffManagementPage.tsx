import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { NativeSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Copy, KeyRound, Power, UserPlus, Users } from 'lucide-react';
import api from '@/lib/api';

interface User {
  _id: string;
  name: string;
  username: string;
  role: string;
  status: string;
}

export function StaffManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('staff');

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/users', {
        name: newName,
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      setAddOpen(false);
      toast.success('Account created', { description: `${newName} can now sign in as ${newUsername}.` });
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('staff');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (user: User) => {
    const deactivating = user.status === 'active';
    const ok = await confirm({
      title: deactivating ? `Deactivate ${user.name}?` : `Activate ${user.name}?`,
      description: deactivating
        ? 'They will no longer be able to sign in until the account is activated again.'
        : 'They will be able to sign in again with their current password.',
      confirmText: deactivating ? 'Deactivate' : 'Activate',
      tone: deactivating ? 'destructive' : 'default',
    });
    if (!ok) return;

    setBusyId(user._id);
    try {
      await api.patch(`/users/${user._id}`, { status: deactivating ? 'inactive' : 'active' });
      toast.success(deactivating ? 'Account deactivated' : 'Account activated');
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update account');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    const ok = await confirm({
      title: `Reset ${user.name}'s password?`,
      description: 'Their current password will stop working immediately and a temporary one will be generated.',
      confirmText: 'Reset password',
      tone: 'destructive',
    });
    if (!ok) return;

    setBusyId(user._id);
    try {
      const { data } = await api.patch(`/users/${user._id}/reset-password`);
      setCopied(false);
      setResetResult({ name: user.name, password: data.temporaryPassword });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setBusyId(null);
    }
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Staff Management"
        actions={
          <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0 sm:p-2">
          {!loaded ? (
            <TableSkeleton cols={5} rows={4} />
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No staff accounts yet" hint="Add the first staff member to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-2.5 text-left">Name</th>
                    <th className="px-4 py-2.5 text-left">Username</th>
                    <th className="px-4 py-2.5 text-left">Role</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left" data-print-hide>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status === 'active' ? 'success' : 'destructive'} className="capitalize">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {u.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3" data-print-hide>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === u._id}
                            onClick={() => handleDeactivate(u)}
                            className={u.status === 'active' ? 'hover:border-destructive/40 hover:text-destructive' : undefined}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === u._id}
                            onClick={() => handleResetPassword(u)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset Password
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-name" className="text-sm font-medium">Name</label>
              <Input id="new-name" required value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-username" className="text-sm font-medium">Username</label>
              <Input
                id="new-username"
                required
                autoComplete="off"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">Password</label>
              <PasswordInput
                id="new-password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-role" className="text-sm font-medium">Role</label>
              <NativeSelect id="new-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                {creating ? 'Creating…' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result */}
      <Dialog open={!!resetResult} onOpenChange={() => setResetResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              Temporary password for <span className="font-medium text-foreground">{resetResult?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-dashed border-seal/50 bg-seal/5 p-3">
            <code className="flex-1 break-all font-mono text-lg tracking-wider">{resetResult?.password}</code>
            <Button size="sm" variant="outline" onClick={copyPassword} aria-label="Copy temporary password">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Please give this to the staff member. They should change it after logging in.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
