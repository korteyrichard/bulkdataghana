import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Checker {
    serial: string;
    pin: string;
    code: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Product {
    id: number;
    name: string;
    checker_type: string;
}

interface Order {
    id: number;
    user: User;
    product: Product;
    checker_type: string;
    recipient: string;
    quantity: number;
    total_amount: number;
    client_reference: string | null;
    status: 'COMPLETED' | 'FAILED' | 'PENDING';
    checkers: Checker[];
    created_at: string;
}

interface PaginatedOrders {
    data: Order[];
    links: any[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    auth: { user: { id: number; name: string; email: string; role: string } };
    orders: PaginatedOrders;
    search: string | null;
}

export default function ResultCheckerOrders({ auth, orders, search }: Props) {
    const [searchVal, setSearchVal] = useState(search ?? '');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('admin.result-checker-orders.index'), { search: searchVal }, { preserveState: true });
    };

    const handleClear = () => {
        setSearchVal('');
        router.get(route('admin.result-checker-orders.index'), {}, { preserveState: true });
    };

    const typeBadge = (type: string) => {
        if (type === 'WASSCE') return 'bg-blue-100 text-blue-800';
        if (type === 'BECE') return 'bg-green-100 text-green-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <AdminLayout user={auth.user} header="Result Checker Orders">
            <Head title="Result Checker Orders" />
            <div className="space-y-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        placeholder="Search by name, phone, reference..."
                        value={searchVal}
                        onChange={e => setSearchVal(e.target.value)}
                        className="max-w-sm"
                    />
                    <Button type="submit">Search</Button>
                    {search && <Button type="button" variant="outline" onClick={handleClear}>Clear</Button>}
                </form>

                <Card>
                    <CardHeader><CardTitle>Orders ({orders.total})</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="p-2">#</th>
                                        <th className="p-2">Customer</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Recipient</th>
                                        <th className="p-2">Qty</th>
                                        <th className="p-2">Total (₵)</th>
                                        <th className="p-2">Reference</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Date</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.data.map(order => (
                                        <React.Fragment key={order.id}>
                                            <tr className="border-b hover:bg-muted/30">
                                                <td className="p-2">{order.id}</td>
                                                <td className="p-2">
                                                    <p className="font-medium">{order.user?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                                                </td>
                                                <td className="p-2">
                                                    <Badge className={typeBadge(order.checker_type)}>{order.checker_type}</Badge>
                                                </td>
                                                <td className="p-2">{order.recipient}</td>
                                                <td className="p-2">{order.quantity}</td>
                                                <td className="p-2">₵{Number(order.total_amount).toFixed(2)}</td>
                                                <td className="p-2 font-mono text-xs">{order.client_reference ?? '—'}</td>
                                                <td className="p-2">
                                                    <Badge className={order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                        {order.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-2 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td className="p-2">
                                                    <button
                                                        className="text-blue-600 text-xs hover:underline whitespace-nowrap"
                                                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                                                    >
                                                        {expandedId === order.id ? '▲ Hide' : '▼ View Cards'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedId === order.id && (
                                                <tr className="bg-muted/20">
                                                    <td colSpan={10} className="p-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                            {order.checkers?.map((c, i) => (
                                                                <div key={i} className="border rounded p-3 bg-white dark:bg-gray-800 text-xs space-y-1">
                                                                    <p><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{c.serial}</span></p>
                                                                    <p><span className="text-muted-foreground">PIN:</span> <span className="font-mono font-bold bg-blue-50 dark:bg-blue-900/30 px-1 rounded text-blue-700 dark:text-blue-300">{c.pin}</span></p>
                                                                    <p><span className="text-muted-foreground">Code:</span> <span className="font-mono">{c.code}</span></p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {orders.data.length === 0 && (
                                        <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {orders.last_page > 1 && (
                            <div className="flex gap-1 mt-4 flex-wrap">
                                {orders.links.map((link, i) => (
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
        </AdminLayout>
    );
}
