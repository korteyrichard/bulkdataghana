import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import React, { useState } from 'react';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  created_at: string;
}

interface TransactionsPageProps extends PageProps {
  transactions?: Transaction[];
  todayTopUps: number;
  todaySales: number;
  filterType: string;
}

const typeLabels: Record<string, string> = {
  topup: 'Wallet Top Up',
  order: 'Order Purchase',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
  refund: 'Refund',
};

const typeColors: Record<string, string> = {
  topup: 'bg-green-100 text-green-800',
  order: 'bg-blue-100 text-blue-800',
  wallet_credit: 'bg-emerald-100 text-emerald-800',
  wallet_debit: 'bg-red-100 text-red-800',
  refund: 'bg-yellow-100 text-yellow-800',
};

export default function Transactions({ auth }: TransactionsPageProps) {
  const { transactions = [], todayTopUps, todaySales, filterType } = usePage<TransactionsPageProps>().props;
  const [filter, setFilter] = useState<string>(filterType || 'all');

  const filteredTransactions =
    filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    const url = new URL(window.location.href);
    if (newFilter === 'all') {
      url.searchParams.delete('type');
    } else {
      url.searchParams.set('type', newFilter);
    }
    window.history.pushState({}, '', url.toString());
  };

  return (
    <DashboardLayout
      user={auth.user}
      header={
        <h2 className="font-bold text-2xl text-gray-800 dark:text-gray-200 leading-tight flex items-center gap-2">
          <span className="inline-block w-2 h-6 bg-blue-600 rounded mr-2"></span>Transactions
        </h2>
      }
    >
      <Head title="Transactions" />

      <div className="py-12 bg-gradient-to-br from-cyan-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
          
          {/* Stats Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Top Ups</p>
                <p className="text-2xl font-bold text-green-600">GHS {todayTopUps}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Sales</p>
                <p className="text-2xl font-bold text-cyan-600">GHS {todaySales}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800">

            {/* Filter Buttons */}
            <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {[
                  { value: 'all', label: 'All', color: 'blue' },
                  { value: 'topup', label: 'Wallet Top Ups', color: 'green' },
                  { value: 'order', label: 'Order Purchases', color: 'blue' },
                  { value: 'wallet_credit', label: 'Wallet Credit', color: 'emerald' },
                  { value: 'wallet_debit', label: 'Wallet Debit', color: 'red' },
                  { value: 'refund', label: 'Refunds', color: 'yellow' },
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 border ${
                      filter === value
                        ? `bg-${color}-600 text-white border-${color}-600`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-opacity-75'
                    }`}
                    onClick={() => handleFilterChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Bal. Before</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Bal. After</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-400 dark:divide-gray-600">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500 text-lg">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-cyan-50 dark:hover:bg-gray-800 transition-all">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200 font-medium text-sm border-r border-gray-400 dark:border-gray-600">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[t.type] || 'bg-gray-200 text-gray-700'}`}>
                            {typeLabels[t.type] || t.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm border-r border-gray-400 dark:border-gray-600">
                          {t.balance_before != null ? `GHS ${Number(t.balance_before).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm border-r border-gray-400 dark:border-gray-600">
                          {t.balance_after != null ? `GHS ${Number(t.balance_after).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                          GHS {t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Table */}
            <div className="sm:hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Type</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-400 dark:divide-gray-600">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-cyan-50 dark:hover:bg-gray-800 transition-all">
                        <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            {new Date(t.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t.balance_before != null ? `GHS ${Number(t.balance_before).toFixed(2)}` : '-'} → {t.balance_after != null ? `GHS ${Number(t.balance_after).toFixed(2)}` : '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${typeColors[t.type] || 'bg-gray-200 text-gray-700'}`}>
                            {typeLabels[t.type] || t.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            GHS {t.amount.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
