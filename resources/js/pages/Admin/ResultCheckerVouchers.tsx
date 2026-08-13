import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    checker_type: string;
    display_name: string | null;
}

interface Purchase {
    id: number;
    recipient: string;
    created_at: string;
}

interface Voucher {
    id: number;
    serial: string;
    pin: string;
    code: string | null;
    status: 'available' | 'purchased';
    purchase: Purchase | null;
    created_at: string;
}

interface PaginatedVouchers {
    data: Voucher[];
    links: any[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    auth: { user: { id: number; name: string; email: string; role: string } };
    product: Product;
    vouchers: PaginatedVouchers;
}

export default function ResultCheckerVouchers({ auth, product, vouchers }: Props) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [voucherText, setVoucherText] = useState('');
    const uploadForm = useForm({ vouchers: '' });

    const lineCount = voucherText.split('\n').filter(l => l.trim()).length;
    const availableCount = vouchers.data.filter(v => v.status === 'available').length;
    const purchasedCount = vouchers.data.filter(v => v.status === 'purchased').length;

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        uploadForm.transform(() => ({ vouchers: voucherText }));
        uploadForm.post(route('admin.result-checker-vouchers.upload', product.id), {
            onSuccess: () => { setUploadOpen(false); setVoucherText(''); uploadForm.reset(); },
        });
    };

    const handleDelete = (v: Voucher) => {
        if (!confirm('Delete this voucher?')) return;
        router.delete(route('admin.result-checker-vouchers.delete', v.id));
    };

    return (
        <AdminLayout user={auth.user} header={`Vouchers — ${product.name}`}>
            <Head title={`Vouchers — ${product.name}`} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('admin.result-checker-products.index')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Products
                    </Link>
                    <Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" />Upload Vouchers</Button>
                </div>

                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{product.name}</h2>
                    <Badge variant="outline">{product.checker_type}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total', value: vouchers.total },
                        { label: 'Available (this page)', value: availableCount },
                        { label: 'Purchased (this page)', value: purchasedCount },
                    ].map(s => (
                        <Card key={s.label}>
                            <CardContent className="pt-4">
                                <p className="text-2xl font-bold">{s.value}</p>
                                <p className="text-sm text-muted-foreground">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader><CardTitle>Vouchers</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="p-2">#</th>
                                        <th className="p-2">Serial</th>
                                        <th className="p-2">PIN</th>
                                        <th className="p-2">Code</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Sold To</th>
                                        <th className="p-2">Added</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchers.data.map((v, i) => (
                                        <tr key={v.id} className="border-b hover:bg-muted/30">
                                            <td className="p-2">{(vouchers.current_page - 1) * 50 + i + 1}</td>
                                            <td className="p-2 font-mono text-xs">{v.serial}</td>
                                            <td className="p-2 font-mono font-bold text-blue-600">{v.pin}</td>
                                            <td className="p-2 font-mono text-xs">{v.code ?? '—'}</td>
                                            <td className="p-2">
                                                <Badge className={v.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                                    {v.status}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-xs">
                                                {v.purchase ? (
                                                    <span>{v.purchase.recipient}<br /><span className="text-muted-foreground">{new Date(v.purchase.created_at).toLocaleDateString()}</span></span>
                                                ) : '—'}
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                                            <td className="p-2">
                                                {v.status === 'available' && (
                                                    <button className="text-red-600 text-xs hover:underline" onClick={() => handleDelete(v)}>Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {vouchers.data.length === 0 && (
                                        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No vouchers yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {vouchers.last_page > 1 && (
                            <div className="flex gap-1 mt-4 flex-wrap">
                                {vouchers.links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`px-3 py-1 text-sm rounded border ${link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} disabled:opacity-40`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Upload Vouchers — {product.name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            One voucher per line. Format: <code className="font-mono bg-muted px-1 rounded">serial,pin</code> or <code className="font-mono bg-muted px-1 rounded">serial,pin,code</code>
                        </p>
                        <Textarea
                            rows={12}
                            className="font-mono text-sm"
                            placeholder={"123456789,1234\n987654321,5678,ABCD"}
                            value={voucherText}
                            onChange={e => setVoucherText(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{lineCount} line{lineCount !== 1 ? 's' : ''} entered</p>
                        {uploadForm.errors.vouchers && <p className="text-xs text-red-600">{uploadForm.errors.vouchers}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploadForm.processing || lineCount === 0}>Upload Vouchers</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
