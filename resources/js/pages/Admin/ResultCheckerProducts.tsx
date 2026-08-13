import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface ResultCheckerProduct {
    id: number;
    name: string;
    checker_type: string;
    display_name: string | null;
    price: number;
    status: 'active' | 'inactive';
    available_vouchers_count: number;
    total_vouchers_count: number;
}

interface Props {
    auth: { user: { id: number; name: string; email: string; role: string } };
    products: ResultCheckerProduct[];
}

const emptyForm = { name: '', checker_type: 'WASSCE', display_name: '', price: '', status: 'active' as const };

interface FormFieldsProps {
    data: typeof emptyForm;
    errors: Partial<Record<keyof typeof emptyForm, string>>;
    setData: (field: keyof typeof emptyForm, value: string) => void;
    prefix: string;
}

function ProductFormFields({ data, errors, setData, prefix }: FormFieldsProps) {
    return (
        <>
            <div>
                <Label htmlFor={`${prefix}-name`}>Name</Label>
                <Input id={`${prefix}-name`} value={data.name} onChange={e => setData('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
                <Label htmlFor={`${prefix}-type`}>Checker Type</Label>
                <Select value={data.checker_type} onValueChange={v => setData('checker_type', v)}>
                    <SelectTrigger id={`${prefix}-type`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="WASSCE">WASSCE</SelectItem>
                        <SelectItem value="BECE">BECE</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor={`${prefix}-display`}>Display Name (optional)</Label>
                <Input id={`${prefix}-display`} value={data.display_name} onChange={e => setData('display_name', e.target.value)} />
            </div>
            <div>
                <Label htmlFor={`${prefix}-price`}>Price (₵)</Label>
                <Input id={`${prefix}-price`} type="number" step="0.01" value={data.price} onChange={e => setData('price', e.target.value)} />
                {errors.price && <p className="text-xs text-red-600">{errors.price}</p>}
            </div>
            <div>
                <Label htmlFor={`${prefix}-status`}>Status</Label>
                <Select value={data.status} onValueChange={v => setData('status', v)}>
                    <SelectTrigger id={`${prefix}-status`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}

export default function ResultCheckerProducts({ auth, products }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [loadOpen, setLoadOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ResultCheckerProduct | null>(null);
    const [loadingProduct, setLoadingProduct] = useState<ResultCheckerProduct | null>(null);
    const [voucherText, setVoucherText] = useState('');

    const addForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm });
    const uploadForm = useForm({ vouchers: '' });

    const lineCount = voucherText.split('\n').filter(l => l.trim()).length;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('admin.result-checker-products.store'), {
            onSuccess: () => { setAddOpen(false); addForm.reset(); },
        });
    };

    const openEdit = (p: ResultCheckerProduct) => {
        setEditingProduct(p);
        editForm.setData({ name: p.name, checker_type: p.checker_type, display_name: p.display_name ?? '', price: String(p.price), status: p.status });
        setEditOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        editForm.put(route('admin.result-checker-products.update', editingProduct.id), {
            onSuccess: () => setEditOpen(false),
        });
    };

    const handleDelete = (p: ResultCheckerProduct) => {
        if (!confirm(`Delete "${p.name}"?`)) return;
        router.delete(route('admin.result-checker-products.destroy', p.id));
    };

    const openLoad = (p: ResultCheckerProduct) => {
        setLoadingProduct(p);
        setVoucherText('');
        uploadForm.reset();
        setLoadOpen(true);
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loadingProduct) return;
        uploadForm.transform(() => ({ vouchers: voucherText }));
        uploadForm.post(route('admin.result-checker-vouchers.upload', loadingProduct.id), {
            onSuccess: () => { setLoadOpen(false); setVoucherText(''); uploadForm.reset(); },
        });
    };

    return (
        <AdminLayout user={auth.user} header="Result Checker Products">
            <Head title="Result Checker Products" />
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Products ({products.length})</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="p-2">ID</th>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Checker Type</th>
                                        <th className="p-2">Display Name</th>
                                        <th className="p-2">Price (₵)</th>
                                        <th className="p-2">Stock</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id} className="border-b hover:bg-muted/30">
                                            <td className="p-2">{p.id}</td>
                                            <td className="p-2 font-medium">{p.name}</td>
                                            <td className="p-2">{p.checker_type}</td>
                                            <td className="p-2">{p.display_name ?? '—'}</td>
                                            <td className="p-2">₵{Number(p.price).toFixed(2)}</td>
                                            <td className="p-2">
                                                <Badge variant={p.available_vouchers_count > 0 ? 'default' : 'destructive'} className={p.available_vouchers_count > 0 ? 'bg-green-100 text-green-800' : ''}>
                                                    {p.available_vouchers_count} available / {p.total_vouchers_count} total
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex gap-2 flex-wrap">
                                                    <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300" onClick={() => openLoad(p)}>Load Vouchers</Button>
                                                    <Link href={route('admin.result-checker-vouchers.index', p.id)}>
                                                        <Button size="sm" variant="outline">View Stock</Button>
                                                    </Link>
                                                    <button className="text-blue-600 text-sm hover:underline" onClick={() => openEdit(p)}>Edit</button>
                                                    <button className="text-red-600 text-sm hover:underline" onClick={() => handleDelete(p)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No products yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Modal */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <ProductFormFields data={addForm.data} errors={addForm.errors} setData={(f, v) => addForm.setData(f, v)} prefix="add" />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={addForm.processing}>Create</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <ProductFormFields data={editForm.data} errors={editForm.errors} setData={(f, v) => editForm.setData(f, v)} prefix="edit" />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={editForm.processing}>Update</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Load Vouchers Modal */}
            <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Load Vouchers — {loadingProduct?.name}</DialogTitle></DialogHeader>
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
                            <Button type="button" variant="outline" onClick={() => setLoadOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={uploadForm.processing || lineCount === 0}>Upload Vouchers</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
