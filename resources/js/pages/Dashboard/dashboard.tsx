import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import NetworkCards from '@/components/NetworkCards';


interface Order {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  network: string;
  expiry: string;
  product_type: 'customer_products' | 'agent_product' | 'dealer_product';
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: string;
  beneficiary_number: string;
  product: {
    name: string;
    price: number;
    network: string;
    expiry: string;
  };
}

interface AlertItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

interface DashboardProps extends PageProps {
  cartCount: number;
  cartItems: CartItem[];
  walletBalance: number;
  orders: Order[];
  totalSales: number;
  todaySales: number;
  pendingOrders: number;
  processingOrders: number;
  products: Product[];
  alerts: AlertItem[];
}

export default function Dashboard({ auth }: DashboardProps) {
  const { cartCount, cartItems, walletBalance: initialWalletBalance, orders, totalSales, todaySales, pendingOrders, processingOrders, products, alerts } = usePage<DashboardProps>().props;

  const [walletBalance, setWalletBalance] = useState(initialWalletBalance ?? 0);
  const [addAmount, setAddAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const visibleAlerts = (alerts || []).filter(a => !dismissedAlerts.includes(a.id));



  // Filter products based on user role
  const filteredProducts = products?.filter(product => {
    if (auth.user.role === 'customer') {
      return product.product_type === 'customer_products';
    } else if (auth.user.role === 'agent') {
      return product.product_type === 'agent_product';
    } else if (auth.user.role === 'dealer') {
      return product.product_type === 'dealer_product';
    } else if (auth.user.role === 'admin') {
      return product.product_type === 'dealer_product';
    }
    return false;
  }) || [];





  const handleRemoveFromCart = (cartId: number) => {
    router.delete(route('remove.from.cart', cartId));
  };



  return (
    <DashboardLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Dashboard</h2>}
    >
      <Head title="Dashboard" />

      {/* Active Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="px-4 sm:px-8 mb-4 space-y-3">
          {visibleAlerts.map(alert => {
            const styles = {
              info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-800 dark:text-blue-200',
              warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 text-yellow-800 dark:text-yellow-200',
              success: 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-800 dark:text-green-200',
              danger: 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-800 dark:text-red-200',
            }[alert.type];
            const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', danger: '🚨' };
            return (
              <div key={alert.id} className={`border-l-4 rounded-lg p-4 flex items-start justify-between ${styles}`}>
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{icons[alert.type]}</span>
                  <div>
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                  className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}



      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="px-4 sm:px-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-300 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{auth.user.name.charAt(0)}</span>
            </div>
            <div className="text-gray-800 dark:text-gray-200">
              <h1 className="text-3xl font-bold">{auth.user.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 font-medium">{auth.user.role.toUpperCase()}</p>
            </div>
            {/* Action Buttons Section */}
            {auth.user.role === 'customer' && (
              <div className="ml-auto">
                <Link
                  href={route('become_an_agent')}
                  className="inline-block px-6 py-2 text-white font-medium rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white hover:-translate-y-0.5 transition-all duration-300"
                >
                  Become An Agent
                </Link>
              </div>
            )}
          </div>
        </div>

       

        {/* Wallet Section */}
        <div className="px-4 sm:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Wallet Balance</p>
                <p className="text-lg sm:text-lg font-bold  text-gray-900 dark:text-gray-100">GHS {walletBalance}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Wallet Top Up</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <input 
                    type="number" 
                    placeholder="Enter Amount" 
                    value={addAmount}
                    onChange={e => setAddAmount(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-full sm:w-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button 
                    onClick={() => {
                      if (!addAmount) return;
                      setIsAdding(true);
                      router.post(route('dashboard.wallet.add'), { amount: addAmount }, {
                        onFinish: () => setIsAdding(false),
                      });
                    }}
                    disabled={!addAmount || isAdding}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50"
                  >
                    {isAdding ? 'Processing...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Main Content Grid */}
        <div className="px-4 sm:px-8 pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Network Cards */}
            <div className="xl:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">Packages</h3>
                <NetworkCards onAddToCart={() => {}} products={filteredProducts} />
              </div>
            </div>

            {/* Right Column - Recent Orders */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">Recent Orders</h3>
                <div className="space-y-3">
                  {orders && orders.length > 0 ? orders.slice(0, 10).map((order, index) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">📦</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">ORDER-{order.id}</p>
                          <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{order.beneficiary_number || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{order.status}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No recent orders</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
            <button
              onClick={() => router.visit('/cart')}
              className="relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-full p-4 shadow-2xl transform hover:scale-110 transition-all duration-300 animate-bounce"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
