import { Head, usePage, useForm, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { PageProps } from '@/types';

interface Withdrawal {
    id: number;
    amount: number;
    withdrawal_type: 'momo' | 'wallet';
    momo_name: string | null;
    momo_network: string | null;
    momo_number: string | null;
    account_number: string | null;
    account_name: string | null;
    bank_name: string | null;
    status: string;
    admin_note: string | null;
    created_at: string;
    user: { id: number; name: string; email: string; phone: string };
}

interface ShopWithdrawalsProps extends PageProps {
    withdrawals: { data: Withdrawal[] };
    withdrawal_limit: string;
    referral_commission: string;
    agent_registration_fee: string;
}

export default function ShopWithdrawals({ auth }: ShopWithdrawalsProps) {
    const { withdrawals, withdrawal_limit, referral_commission, agent_registration_fee } = usePage<ShopWithdrawalsProps>().props;

    const settingsForm = useForm({
        withdrawal_limit,
        referral_commission,
        agent_registration_fee,
    });

    const handleApprove = (id: number) => {
        router.post(route('admin.shop-withdrawals.approve', id));
    };

    const handleReject = (id: number) => {
        const note = prompt('Rejection reason (optional):');
        router.post(route('admin.shop-withdrawals.reject', id), { admin_note: note ?? '' });
    };

    const statusColor = (s: string) =>
        s === 'approved' ? 'bg-green-100 text-green-700' :
        s === 'rejected' ? 'bg-red-100 text-red-700' :
        'bg-yellow-100 text-yellow-700';

    return (
        <AdminLayout user={auth.user}>
            <Head title="Shop Withdrawals" />
            <div className="max-w-6xl mx-auto p-4 space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Shop Withdrawals</h2>

                {/* Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Shop Settings</h3>
                    <form onSubmit={e => { e.preventDefault(); settingsForm.post(route('admin.shop-settings.update')); }}
                        className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Withdrawal Limit (GHS)</label>
                            <input type="number" step="0.01" min="1"
                                value={settingsForm.data.withdrawal_limit}
                                onChange={e => settingsForm.setData('withdrawal_limit', e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 w-36" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Referral Commission (GHS)</label>
                            <input type="number" step="0.01" min="0"
                                value={settingsForm.data.referral_commission}
                                onChange={e => settingsForm.setData('referral_commission', e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 w-36" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Agent Registration Fee (GHS)</label>
                            <input type="number" step="0.01" min="1"
                                value={settingsForm.data.agent_registration_fee}
                                onChange={e => settingsForm.setData('agent_registration_fee', e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 w-36" />
                        </div>
                        <button type="submit" disabled={settingsForm.processing}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            Save Settings
                        </button>
                    </form>
                </div>

                {/* Withdrawals table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['User', 'Amount', 'Type', 'Details', 'Status', 'Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {withdrawals.data.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No withdrawals.</td></tr>
                            ) : withdrawals.data.map(w => (
                                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{w.user.name}</p>
                                        <p className="text-xs text-gray-500">{w.user.email}</p>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">GHS {Number(w.amount).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            w.withdrawal_type === 'momo'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {w.withdrawal_type === 'momo' ? 'MoMo' : 'Wallet'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                                        {w.withdrawal_type === 'momo' ? (
                                            <>
                                                <p className="font-medium">{w.momo_network}</p>
                                                <p>{w.momo_number}</p>
                                                <p>{w.momo_name}</p>
                                            </>
                                        ) : (
                                            <p className="text-gray-400 italic">To wallet balance</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span>
                                        {w.admin_note && <p className="text-xs text-gray-400 mt-0.5">{w.admin_note}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        {w.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApprove(w.id)}
                                                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                                                <button onClick={() => handleReject(w.id)}
                                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                                            </div>
                                        )}
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
