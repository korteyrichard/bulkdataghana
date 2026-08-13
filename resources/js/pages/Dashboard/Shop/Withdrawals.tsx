import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, useForm, Link } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Withdrawal {
    id: number;
    amount: number;
    withdrawal_type: 'momo' | 'wallet';
    momo_name: string | null;
    momo_network: string | null;
    momo_number: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_note: string | null;
    created_at: string;
}

interface WithdrawalsProps extends PageProps {
    commission_balance: number;
    withdrawal_limit: number;
    withdrawals: Withdrawal[];
    can_withdraw: boolean;
}

const statusColor = (s: string) =>
    s === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
    s === 'rejected'  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';

export default function Withdrawals({ auth }: WithdrawalsProps) {
    const { commission_balance, withdrawal_limit, withdrawals, can_withdraw } = usePage<WithdrawalsProps>().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        withdrawal_type: 'momo' as 'momo' | 'wallet',
        amount: '',
        momo_name: '',
        momo_network: 'MTN' as 'MTN' | 'Telecel',
        momo_number: '',
    });

    const gross  = parseFloat(data.amount) || 0;
    const fee    = Math.round(gross * 0.02 * 100) / 100;
    const net    = Math.round((gross - fee) * 100) / 100;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shop.withdrawals.request'), { onSuccess: () => reset() });
    };

    const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500';
    const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Withdrawals</h2>}>
            <Head title="Withdrawals" />
            <div className="max-w-3xl mx-auto p-4 space-y-6">
                <Link href={route('shop.dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Shop
                </Link>

                {/* Balance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <p className="text-sm text-gray-500">Commission Balance</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">GHS {commission_balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: GHS {withdrawal_limit}</p>
                </div>

                {/* Request form */}
                {can_withdraw ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                        <div className="px-6 pt-5 pb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Request Withdrawal</h3>

                            {/* Type tabs */}
                            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mb-5 w-fit">
                                {(['momo', 'wallet'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setData('withdrawal_type', type)}
                                        className={`px-5 py-2 text-sm font-medium transition-colors ${
                                            data.withdrawal_type === type
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {type === 'momo' ? 'Mobile Money' : 'Wallet'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
                            {/* Amount — always shown */}
                            <div>
                                <label className={labelCls}>Amount (GHS)</label>
                                <input
                                    type="number" step="0.01" min={withdrawal_limit} max={commission_balance}
                                    value={data.amount} onChange={e => setData('amount', e.target.value)}
                                    className={inputCls} required
                                />
                                {gross > 0 && (
                                    <div className="mt-2 text-xs space-y-0.5 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                        <div className="flex justify-between">
                                            <span>Withdrawal amount</span>
                                            <span>GHS {gross.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-500">
                                            <span>Fee (2%)</span>
                                            <span>- GHS {fee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-200 border-t dark:border-gray-600 pt-1 mt-1">
                                            <span>You will receive</span>
                                            <span>GHS {net.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                            </div>

                            {/* Momo fields */}
                            {data.withdrawal_type === 'momo' && (
                                <>
                                    <div>
                                        <label className={labelCls}>Mobile Money Network</label>
                                        <div className="flex gap-3">
                                            {(['MTN', 'Telecel'] as const).map(net => (
                                                <button
                                                    key={net}
                                                    type="button"
                                                    onClick={() => setData('momo_network', net)}
                                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                        data.momo_network === net
                                                            ? net === 'MTN'
                                                                ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                                                                : 'bg-red-500 border-red-500 text-white'
                                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {net}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.momo_network && <p className="text-red-500 text-xs mt-1">{errors.momo_network}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Account Name</label>
                                        <input
                                            value={data.momo_name} onChange={e => setData('momo_name', e.target.value)}
                                            placeholder="Name on mobile money account"
                                            className={inputCls} required
                                        />
                                        {errors.momo_name && <p className="text-red-500 text-xs mt-1">{errors.momo_name}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Mobile Money Number</label>
                                        <input
                                            value={data.momo_number} onChange={e => setData('momo_number', e.target.value)}
                                            placeholder="e.g. 0241234567"
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            inputMode="numeric"
                                            className={inputCls} required
                                        />
                                        {errors.momo_number && <p className="text-red-500 text-xs mt-1">{errors.momo_number}</p>}
                                    </div>
                                </>
                            )}

                            {/* Wallet type info */}
                            {data.withdrawal_type === 'wallet' && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                                    The amount will be transferred to your main wallet balance after admin approval.
                                </div>
                            )}

                            {errors.message && (
                                <p className="text-red-500 text-sm">{errors.message}</p>
                            )}

                            <button type="submit" disabled={processing}
                                className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                                {processing ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
                        You need at least GHS {withdrawal_limit} in commission balance to request a withdrawal.
                    </div>
                )}

                {/* History */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <div className="px-6 py-4 border-b dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Withdrawal History</h3>
                    </div>
                    {withdrawals.length === 0 ? (
                        <p className="px-6 py-8 text-center text-gray-500 text-sm">No withdrawals yet.</p>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {withdrawals.map(w => (
                                <div key={w.id} className="px-6 py-4 flex items-start justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                GHS {Number(w.amount).toFixed(2)}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                w.withdrawal_type === 'momo'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                            }`}>
                                                {w.withdrawal_type === 'momo' ? 'MoMo' : 'Wallet'}
                                            </span>
                                        </div>
                                        {w.withdrawal_type === 'momo' ? (
                                            <p className="text-xs text-gray-500">{w.momo_network} · {w.momo_number} · {w.momo_name}</p>
                                        ) : (
                                            <p className="text-xs text-gray-500">To wallet balance</p>
                                        )}
                                        {w.admin_note && <p className="text-xs text-gray-400 italic">{w.admin_note}</p>}
                                        <p className="text-xs text-gray-400">{new Date(w.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(w.status)}`}>
                                        {w.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
