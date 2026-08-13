import React, { useState, useMemo } from 'react';
import { AdminLayout } from '../../layouts/admin-layout';
import { Head, usePage, router } from '@inertiajs/react';
import Pagination from '@/components/pagination';

interface User {
  name: string;
  email: string;
}

interface Order {
  user: User;
}

interface Transaction {
  id: number;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  type: string;
  balance_before: number | null;
  balance_after: number | null;
  user?: User;
  order?: Order;
}

interface PaginatedTransactions {
  data: Transaction[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
}

interface AdminTransactionsPageProps {
  transactions: PaginatedTransactions;
  auth: any;
  filterType: string;
  [key: string]: any;
}

const typeLabels: Record<string, string> = {
  topup: 'Wallet Top Up',
  order: 'Order Purchase',
  agent_fee: 'Agent Fee',
  refund: 'Refund',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
};

const typeColors: Record<string, string> = {
  topup: 'bg-green-100 text-green-800',
  order: 'bg-blue-100 text-blue-800',
  agent_fee: 'bg-purple-100 text-purple-800',
  refund: 'bg-yellow-100 text-yellow-800',
  wallet_credit: 'bg-emerald-100 text-emerald-800',
  wallet_debit: 'bg-red-100 text-red-800',
};

export default function AdminTransactions() {
  const { transactions, auth, filterType: initialFilterType } = usePage<AdminTransactionsPageProps>().props;
  const [filterType, setFilterType] = useState(initialFilterType);
  const [filterUsername, setFilterUsername] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = e.target.value;
    setFilterType(newFilter);
    router.get(route('admin.transactions'), { type: newFilter, page: String(transactions.current_page) }, { preserveState: true, replace: true });
  };

  const filtered = useMemo(() => {
    return transactions.data.filter(t => {
      const name = t.user?.name || t.order?.user?.name || '';
      if (filterUsername && !name.toLowerCase().includes(filterUsername.toLowerCase())) return false;
      if (filterDate && !t.created_at.startsWith(filterDate)) return false;
      return true;
    });
  }, [transactions.data, filterUsername, filterDate]);

  return (
    <AdminLayout user={auth?.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Admin Transactions</h2>}>
      <Head title="Admin Transactions" />
      <div className="py-8 max-w-7xl mx-auto px-4">
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Filter by Type</label>
            <select
              className="border rounded px-3 py-2 w-48 dark:bg-gray-800 dark:text-white dark:border-gray-600"
              value={filterType}
              onChange={handleTypeChange}
            >
              <option value="">All Types</option>
              <option value="topup">Wallet Top Ups</option>
              <option value="order">Order Purchases</option>
              <option value="agent_fee">Agent Fees</option>
              <option value="refund">Refunds</option>
              <option value="wallet_credit">Wallet Credits</option>
              <option value="wallet_debit">Wallet Debits</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Filter by Username</label>
            <input
              type="text"
              placeholder="Enter username..."
              value={filterUsername}
              onChange={e => setFilterUsername(e.target.value)}
              className="border rounded px-3 py-2 w-48 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Filter by Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="border rounded px-3 py-2 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
          </div>
          {(filterUsername || filterDate) && (
            <button
              onClick={() => { setFilterUsername(''); setFilterDate(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div>No transactions found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Before</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-4 py-3 font-bold">{transaction.id}</td>
                    <td className="px-4 py-3 text-sm">{transaction.user?.name || transaction.order?.user?.name}</td>
                    <td className="px-4 py-3 text-sm">${transaction.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[transaction.type] || 'bg-gray-100 text-gray-800'}`}>{typeLabels[transaction.type] || transaction.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{transaction.balance_before != null ? `GHS ${Number(transaction.balance_before).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{transaction.balance_after != null ? `GHS ${Number(transaction.balance_after).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(transaction.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <Pagination data={transactions} />
      </div>
    </AdminLayout>
  );
}