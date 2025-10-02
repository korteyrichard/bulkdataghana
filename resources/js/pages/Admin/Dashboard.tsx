import React from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { AdminLayout } from '@/layouts/admin-layout';
import { PageProps, User } from '@/types';

interface Product {
  id: number;
  name: string;
  network: string;
  amount: number;
}

interface Order {
  id: number;
  user: User;
  total_amount: number;
  status: string;
}

interface Transaction {
  id: number;
  user: User;
  amount: number;
  type: string;
}

interface AdminDashboardProps extends PageProps {
  users: User[];
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
  todayUsers: User[];
  todayOrders: Order[];
  todayTransactions: Transaction[];
  jaybartOrderPusherEnabled: boolean;
  codecraftOrderPusherEnabled: boolean;
}

const StatCard = ({ title, value, gradient }: { title: string; value: number | string; gradient: string }) => (
  <div className={`${gradient} p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20`}>
    <h3 className="text-sm font-medium text-white/90">{title}</h3>
    <p className="text-3xl font-bold text-white mt-2">{value}</p>
  </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  products,
  orders,
  transactions,
  todayUsers,
  todayOrders,
  todayTransactions,
  jaybartOrderPusherEnabled,
  codecraftOrderPusherEnabled,
}) => {
  const { auth } = usePage<AdminDashboardProps>().props;

  const toggleJaybartOrderPusher = () => {
    router.post('/admin/toggle-jaybart-order-pusher', {
      enabled: !jaybartOrderPusherEnabled
    });
  };

  const toggleCodecraftOrderPusher = () => {
    router.post('/admin/toggle-codecraft-order-pusher', {
      enabled: !codecraftOrderPusherEnabled
    });
  };

  return (
    <AdminLayout
      user={auth?.user}
      header={<h2 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h2>}
    >
      <Head title="Admin Dashboard" />

      <div className="p-6 space-y-10">
        {/* Summary Section */}
        <section>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Overall Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Users" value={users.length} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
            <StatCard title="Total Products" value={products.length} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <StatCard title="Total Orders" value={orders.length} gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
            <StatCard title="Total Transactions" value={transactions.length} gradient="bg-gradient-to-br from-orange-500 to-orange-600" />
          </div>
        </section>

        {/* Today Section */}
        <section>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Today's Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="New Users Today" value={todayUsers.length} gradient="bg-gradient-to-br from-cyan-500 to-cyan-600" />
            <StatCard title="Orders Today" value={todayOrders.length} gradient="bg-gradient-to-br from-pink-500 to-pink-600" />
            <StatCard title="Transactions Today" value={todayTransactions.length} gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
          </div>
        </section>

        {/* Order Pusher Controls */}
        <section>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">System Controls</h3>
          <div className="space-y-4">
            {/* Jaybart Order Pusher */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-slate-800 dark:text-white">Jaybart Order Pusher</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    {jaybartOrderPusherEnabled ? 'Orders are being pushed to Jaybart API' : 'Jaybart order pushing is disabled'}
                  </p>
                </div>
                <button
                  onClick={toggleJaybartOrderPusher}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    jaybartOrderPusherEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      jaybartOrderPusherEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* CodeCraft Order Pusher */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-slate-800 dark:text-white">CodeCraft Order Pusher</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    {codecraftOrderPusherEnabled ? 'Orders are being pushed to CodeCraft API' : 'CodeCraft order pushing is disabled'}
                  </p>
                </div>
                <button
                  onClick={toggleCodecraftOrderPusher}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    codecraftOrderPusherEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      codecraftOrderPusherEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
