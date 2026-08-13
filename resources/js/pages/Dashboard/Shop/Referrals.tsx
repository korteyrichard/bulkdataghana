import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState } from 'react';

interface ReferralLog {
    id: number;
    status: 'registered' | 'converted';
    commission_earned: number;
    converted_at: string | null;
    created_at: string;
    referred: { id: number; name: string; email: string; created_at: string };
}

interface ReferralsProps extends PageProps {
    referrals: { data: ReferralLog[]; current_page: number; last_page: number; total: number };
    stats: { total: number; converted: number; earned: number };
    referral_link: string;
    referral_code: string;
    referral_commission: number;
}

function CopyBar({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate">{value}</span>
            <button
                onClick={copy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                    copied
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                }`}
            >
                {copied ? (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                )}
            </button>
        </div>
    );
}

export default function Referrals({ auth }: ReferralsProps) {
    const { referrals, stats, referral_link, referral_code, referral_commission } = usePage<ReferralsProps>().props;
    const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Referrals</h2>}>
            <Head title="Referrals" />
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                <Link href={route('shop.dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Shop
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Referred</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
                        <p className="text-xs text-gray-400 mt-0.5">All time sign-ups</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Converted to Agent</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.converted}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{conversionRate}%</span>
                        </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl shadow p-5">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Commission Earned</p>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">GHS {Number(stats.earned).toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">GHS {referral_commission} per conversion</p>
                    </div>
                </div>

                {/* Referral link card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Your Referral Link</h4>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Share this link. Earn <strong className="text-purple-600">GHS {referral_commission}</strong> when someone you refer upgrades to an agent.
                            </p>
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg font-mono flex-shrink-0 ml-4">
                            {referral_code}
                        </span>
                    </div>
                    <CopyBar value={referral_link} />
                </div>

                {/* Referrals list */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Referred Users</h4>
                        <span className="text-xs text-gray-400">{referrals.total} total</span>
                    </div>

                    {referrals.data.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No referrals yet.</p>
                            <p className="text-gray-400 text-xs mt-1">Share your referral link to get started.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {referrals.data.map(ref => (
                                <div key={ref.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-sm font-bold">{ref.referred.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ref.referred.name}</p>
                                            <p className="text-xs text-gray-400">{ref.referred.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {ref.status === 'converted' ? (
                                            <div className="text-right">
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    Agent
                                                </span>
                                                <p className="text-xs text-green-600 font-medium mt-0.5">+GHS {Number(ref.commission_earned).toFixed(2)}</p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 font-medium">
                                                    Registered
                                                </span>
                                                <p className="text-xs text-gray-400 mt-0.5">Not yet agent</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 w-20 text-right">
                                            {new Date(ref.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {referrals.last_page > 1 && (
                        <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t dark:border-gray-700">
                            {Array.from({ length: referrals.last_page }, (_, i) => i + 1).map(page => (
                                <Link
                                    key={page}
                                    href={route('shop.referrals', { page })}
                                    className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
                                        page === referrals.current_page
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
