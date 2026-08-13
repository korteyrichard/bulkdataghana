import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Alert {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface AlertsPageProps extends PageProps {
  alerts: Alert[];
}

const emptyForm = { title: '', message: '', type: 'info' as const, is_active: true, starts_at: '', expires_at: '' };

export default function Alerts() {
  const { auth, alerts } = usePage<AlertsPageProps>().props;
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, starts_at: form.starts_at || null, expires_at: form.expires_at || null };
    if (editingId) {
      router.put(route('admin.alerts.update', editingId), data, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    } else {
      router.post(route('admin.alerts.store'), data, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openEdit = (alert: Alert) => {
    setForm({
      title: alert.title,
      message: alert.message,
      type: alert.type,
      is_active: alert.is_active,
      starts_at: alert.starts_at?.slice(0, 16) || '',
      expires_at: alert.expires_at?.slice(0, 16) || '',
    });
    setEditingId(alert.id);
    setDialogOpen(true);
  };

  const typeColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <AdminLayout user={auth?.user} header={<h2 className="text-3xl font-bold text-gray-800 dark:text-white">Alerts Management</h2>}>
      <Head title="Alerts Management" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{alerts.length} alert(s)</p>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>Create Alert</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                <Textarea placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="danger">Danger</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Starts at (optional)</label>
                    <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Expires at (optional)</label>
                    <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full">{editingId ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[alert.type]}`}>{alert.type}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => router.post(route('admin.alerts.toggle', alert.id))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alert.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alert.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <Button variant="outline" size="sm" onClick={() => openEdit(alert)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm('Delete this alert?')) router.delete(route('admin.alerts.delete', alert.id)); }}>Delete</Button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No alerts yet. Create one to get started.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
