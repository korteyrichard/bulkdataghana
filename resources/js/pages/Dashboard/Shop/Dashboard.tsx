import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState } from 'react';

interface ShopDashboardProps extends PageProps {
    shop: { id: number; name: string; slug: string; description: string; is_active: boolean } | null;
    stats: { total_orders: number; total_commission: number; pending_orders: number } | null;
    commission_balance: number;
    withdrawal_limit: number;
    referral_link: string;
    referral_code: string;
    referred_count: number;
}

function CopyBar({ label, value, href }: { label: string; value: string; href?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {href ? (
                    <a href={href} target="_blank" className="flex-1 text-sm text-blue-600 dark:text-blue-400 truncate hover:underline">{value}</a>
                ) : (
                    <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate">{value}</span>
                )}
                <button
                    onClick={copy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                        copied
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                            : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                    }`}
                >
                    {copied ? (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function ActionCard({
    href, icon, label, value, sublabel, color,
}: {
    href: string; icon: React.ReactNode; label: string; value: string | number; sublabel?: string; color: string;
}) {
    return (
        <Link href={href} className="group bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition-all duration-200 p-5 flex items-center gap-4 hover:-translate-y-0.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
                {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </Link>
    );
}

export default function ShopDashboard({ auth }: ShopDashboardProps) {
    const { shop, stats, commission_balance, withdrawal_limit, referral_link, referral_code, referred_count } =
        usePage<ShopDashboardProps>().props;

    const shopUrl = shop ? `${window.location.origin}/store/${shop.slug}` : '';
    const canWithdraw = commission_balance >= withdrawal_limit;

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">My Shop</h2>}>
            <Head title="My Shop" />

            <div className="max-w-5xl mx-auto space-y-6 p-4">

                {/* No shop yet */}
                {!shop ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-10 text-center">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6M7 13l-1.5-6M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">You don't have a shop yet</h3>
                        <p className="text-sm text-gray-500 mb-6">Create your shop and start selling products to earn commissions.</p>
                        <Link href={route('shop.create')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create My Shop
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Shop header card */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{shop.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shop.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                                            {shop.is_active ? '● Active' : '● Inactive'}
                                        </span>
                                    </div>
                                    {shop.description && <p className="text-sm text-gray-500 mt-1">{shop.description}</p>}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Link href={route('shop.edit')} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </Link>
                                    <Link href={route('shop.products')} className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        Manage Products
                                    </Link>
                                </div>
                            </div>
                            <CopyBar label="Your Shop Link" value={shopUrl} href={shopUrl} />
                        </div>

                        {/* Action cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ActionCard
                                href={route('shop.orders')}
                                label="Total Orders"
                                value={stats?.total_orders ?? 0}
                                sublabel={`${stats?.pending_orders ?? 0} pending`}
                                color="bg-blue-50 dark:bg-blue-900/30"
                                icon={<svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                            />
                            <ActionCard
                                href={route('shop.commissions')}
                                label="Total Commission"
                                value={`GHS ${Number(stats?.total_commission ?? 0).toFixed(2)}`}
                                sublabel="View breakdown"
                                color="bg-green-50 dark:bg-green-900/30"
                                icon={<svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <ActionCard
                                href={route('shop.referrals')}
                                label="Referrals"
                                value={referred_count}
                                sublabel="View all referrals"
                                color="bg-purple-50 dark:bg-purple-900/30"
                                icon={<svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                            />
                            <ActionCard
                                href={route('shop.withdrawals')}
                                label="Commission Balance"
                                value={`GHS ${commission_balance.toFixed(2)}`}
                                sublabel={canWithdraw ? '✓ Ready to withdraw' : `Min. GHS ${withdrawal_limit}`}
                                color={canWithdraw ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-gray-50 dark:bg-gray-700/50'}
                                icon={<svg className={`w-6 h-6 ${canWithdraw ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                            />
                        </div>
                    </>
                )}

                {/* Referral link — always visible */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Referral Program</h4>
                            <p className="text-sm text-gray-500 mt-0.5">Earn commission when someone you refer upgrades to an agent.</p>
                        </div>
                        <Link href={route('shop.referrals')} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                            View all →
                        </Link>
                    </div>
                    <CopyBar label="Your Referral Link" value={referral_link} />
                    <p className="text-xs text-gray-400">
                        Code: <strong className="text-gray-600 dark:text-gray-300">{referral_code}</strong>
                        <span className="mx-2">·</span>
                        {referred_count} referred user{referred_count !== 1 ? 's' : ''}
                    </p>
                </div>

            </div>
        </DashboardLayout>
    );
}
