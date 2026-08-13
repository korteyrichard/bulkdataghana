import { Head, usePage, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';

interface Shop {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    primary_color: string;
    products_count: number;
    orders_count: number;
    total_revenue: number;
    available_balance: number;
    total_withdrawn: number;
    created_at: string;
    owner: { id: number; name: string; email: string } | null;
}

interface ShopsProps {
    shops: Shop[];
    auth: any;
}

export default function AdminShops() {
    const { shops, auth } = usePage<ShopsProps>().props;

    const handleToggle = (id: number) => {
        router.patch(route('admin.shops.toggle', id));
    };

    const totalAvailable = shops.reduce((a, s) => a + s.available_balance, 0);
    const totalWithdrawn = shops.reduce((a, s) => a + s.total_withdrawn, 0);

    return (
        <AdminLayout user={auth.user} header={<h2 className="text-2xl font-bold">Shops</h2>}>
            <Head title="Admin — Shops" />
            <div className="max-w-6xl mx-auto p-4 space-y-4">

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Shops',     value: shops.length },
                        { label: 'Active',           value: shops.filter(s => s.is_active).length },
                        { label: 'Total Orders',     value: shops.reduce((a, s) => a + s.orders_count, 0) },
                        { label: 'Total Available',  value: `GHS ${totalAvailable.toFixed(2)}` },
                        { label: 'Total Withdrawn',  value: `GHS ${totalWithdrawn.toFixed(2)}` },
                    ].map(card => (
                        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Shop', 'Owner', 'Products', 'Orders', 'Available', 'Withdrawn', 'Status', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {shops.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500">No shops yet.</td></tr>
                            ) : shops.map(shop => (
                                <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: shop.primary_color }} />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{shop.name}</p>
                                                <a href={route('shop.storefront', shop.slug)} target="_blank"
                                                    className="text-xs text-blue-500 hover:underline">
                                                    /store/{shop.slug}
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{shop.owner?.name ?? '—'}</p>
                                        <p className="text-xs text-gray-500">{shop.owner?.email ?? ''}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{shop.products_count}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{shop.orders_count}</td>
                                    <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">GHS {shop.available_balance.toFixed(2)}</td>
                                    <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap">GHS {shop.total_withdrawn.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shop.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {shop.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(shop.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggle(shop.id)}
                                            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                                shop.is_active
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                        >
                                            {shop.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
