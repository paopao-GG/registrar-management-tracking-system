import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [addOpen, setAddOpen] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('staff');

  const fetchUsers = async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    try {
      await api.post('/users', {
        name: newName,
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      setAddOpen(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('staff');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeactivate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await api.patch(`/users/${id}`, { status: newStatus });
    fetchUsers();
  };

  const handleResetPassword = async (id: string) => {
    const { data } = await api.patch(`/users/${id}/reset-password`);
    setResetResult(data.temporaryPassword);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <Button onClick={() => setAddOpen(true)}>Add Staff</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Username</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.username}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">
                    <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(u._id, u.status)}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(u._id)}
                    >
                      Reset Password
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleAdd}>Create Account</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result */}
      <Dialog open={!!resetResult} onOpenChange={() => setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Temporary password:</p>
          <code className="block bg-muted p-3 rounded text-lg font-mono">{resetResult}</code>
          <p className="text-xs text-muted-foreground">
            Please give this to the staff member. They should change it after logging in.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
