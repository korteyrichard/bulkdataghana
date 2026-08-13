import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState } from 'react';

interface CommissionLog {
    id: number;
    amount: number;
    type: 'shop_order' | 'referral';
    description: string;
    created_at: string;
}

interface CommissionsProps extends PageProps {
    logs: { data: CommissionLog[]; current_page: number; last_page: number; total: number };
    totals: { shop_order: number; referral: number; total: number };
    commission_balance: number;
}

export default function Commissions({ auth }: CommissionsProps) {
    const { logs, totals, commission_balance } = usePage<CommissionsProps>().props;
    const [filter, setFilter] = useState<'all' | 'shop_order' | 'referral'>('all');

    const filtered = filter === 'all' ? logs.data : logs.data.filter(l => l.type === filter);

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Commissions</h2>}>
            <Head title="Commissions" />
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                <Link href={route('shop.dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Shop
                </Link>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            label: 'Available Balance',
                            value: `GHS ${commission_balance.toFixed(2)}`,
                            sub: 'Ready to withdraw',
                            color: 'bg-green-50 dark:bg-green-900/30',
                            text: 'text-green-600 dark:text-green-400',
                        },
                        {
                            label: 'From Shop Orders',
                            value: `GHS ${Number(totals.shop_order).toFixed(2)}`,
                            sub: 'All time',
                            color: 'bg-blue-50 dark:bg-blue-900/30',
                            text: 'text-blue-600 dark:text-blue-400',
                        },
                        {
                            label: 'From Referrals',
                            value: `GHS ${Number(totals.referral).toFixed(2)}`,
                            sub: 'All time',
                            color: 'bg-purple-50 dark:bg-purple-900/30',
                            text: 'text-purple-600 dark:text-purple-400',
                        },
                    ].map(s => (
                        <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Withdraw CTA */}
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow px-5 py-4">
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Earned</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">GHS {Number(totals.total).toFixed(2)}</p>
                    </div>
                    <Link href={route('shop.withdrawals')} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Withdraw
                    </Link>
                </div>

                {/* Filter tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <div className="flex border-b dark:border-gray-700">
                        {(['all', 'shop_order', 'referral'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-5 py-3 text-sm font-medium transition-colors ${
                                    filter === tab
                                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {tab === 'all' ? 'All' : tab === 'shop_order' ? 'Shop Orders' : 'Referrals'}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No commission records yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map(log => (
                                <div key={log.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            log.type === 'referral'
                                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                                : 'bg-blue-100 dark:bg-blue-900/40'
                                        }`}>
                                            {log.type === 'referral' ? (
                                                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                    log.type === 'referral'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                                }`}>
                                                    {log.type === 'referral' ? 'Referral' : 'Shop Order'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-base font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                                        +GHS {Number(log.amount).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t dark:border-gray-700">
                            {Array.from({ length: logs.last_page }, (_, i) => i + 1).map(page => (
                                <Link
                                    key={page}
                                    href={route('shop.commissions', { page })}
                                    className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
                                        page === logs.current_page
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
            </div>
        </DashboardLayout>
    );
}
