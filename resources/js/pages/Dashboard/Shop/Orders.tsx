import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

interface ShopOrderItem {
    id: number;
    name: string;
    beneficiary_number: string;
    unit_price: number;
    cost_price: number;
}

interface ShopOrder {
    id: number;
    reference: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    commission_amount: number;
    fulfillment_status: string;
    created_at: string;
    items: ShopOrderItem[];
}

interface ShopOrdersProps extends PageProps {
    shop: { name: string };
    orders: { data: ShopOrder[]; current_page: number; last_page: number };
}

export default function ShopOrders({ auth }: ShopOrdersProps) {
    const { shop, orders } = usePage<ShopOrdersProps>().props;

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Shop Orders</h2>}>
            <Head title="Shop Orders" />
            <div className="max-w-5xl mx-auto p-4 space-y-4">
                <Link href={route('shop.dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Shop
                </Link>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Reference', 'Customer', 'Phone', 'Total', 'Commission', 'Status', 'Date'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {orders.data.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No orders yet.</td></tr>
                            ) : orders.data.map((order: ShopOrder) => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{order.reference}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{order.customer_name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.customer_phone}</td>
                                    <td className="px-4 py-3 font-medium">GHS {Number(order.total_amount).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-green-600 font-medium">GHS {Number(order.commission_amount).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            order.fulfillment_status === 'completed' ? 'bg-green-100 text-green-700' :
                                            order.fulfillment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {order.fulfillment_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {orders.last_page > 1 && (
                    <div className="flex items-center justify-center gap-1.5">
                        {Array.from({ length: orders.last_page }, (_, i) => i + 1).map(page => (
                            <Link
                                key={page}
                                href={route('shop.orders', { page })}
                                className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
                                    page === orders.current_page
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {page}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
