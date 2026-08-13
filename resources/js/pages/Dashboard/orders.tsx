import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage } from '@inertiajs/react';

interface Product {
  id: number;
  name: string;
  price: number;
  size?: string;
  pivot: { quantity: number; price: number; beneficiary_number?: string };
}

interface Order {
  id: number;
  source: 'direct' | 'shop';
  reference: string | null;
  total: number;
  status: string;
  created_at: string;
  network?: string;
  beneficiary_number?: string;
  customer_email?: string | null;
  products: Product[];
}

interface OrdersPageProps {
  orders: Order[];
  auth: any;
  totalSales: number;
  todaySales: number;
  pendingOrders: number;
  processingOrders: number;
  [key: string]: any;
}

export default function OrdersPage() {
  const { orders, auth, totalSales, todaySales, pendingOrders, processingOrders } = usePage<OrdersPageProps>().props;
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [networkFilter, setNetworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');

  const networks = Array.from(new Set(orders.map(o => o.network).filter(Boolean)));
  const statuses = Array.from(new Set(orders.map(o => o.status).filter(Boolean)));

  const filteredOrders = orders.filter(order => {
    const matchesNetwork = !networkFilter || order.network === networkFilter;
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesOrderId = !orderIdSearch || order.id.toString().includes(orderIdSearch);
    const orderBeneficiary = order.products[0]?.pivot?.beneficiary_number || order.beneficiary_number || '';
    const matchesBeneficiary = !beneficiarySearch || orderBeneficiary.toLowerCase().includes(beneficiarySearch.toLowerCase());
    return matchesNetwork && matchesStatus && matchesOrderId && matchesBeneficiary;
  });

  // Use source+id as unique key to avoid collisions between direct and shop orders
  const orderKey = (order: Order) => `${order.source}-${order.id}`;

  const getNetworkBadgeColor = (network?: string) => {
    if (!network) return 'bg-gray-200 text-gray-700';
    if (network.toLowerCase() === 'telecel') return 'bg-red-200 text-red-700';
    if (network.toLowerCase() === 'mtn') return 'bg-yellow-200 text-yellow-700';
    if (['bigtime', 'ishare', 'at data', 'at (big'].some(n => network.toLowerCase().includes(n))) return 'bg-blue-200 text-blue-700';
    return 'bg-purple-200 text-purple-700';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-200 text-green-700';
      case 'pending':   return 'bg-orange-200 text-orange-700';
      case 'failed':    return 'bg-red-200 text-red-700';
      case 'processing': return 'bg-blue-200 text-blue-700';
      default:          return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <DashboardLayout
      user={auth?.user}
      header={
        <h2 className="font-bold text-2xl text-gray-800 dark:text-gray-200 leading-tight flex items-center gap-2">
          <span className="inline-block w-2 h-6 bg-blue-600 rounded mr-2"></span>My Orders
        </h2>
      }
    >
      <Head title="Orders" />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Sales</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">GHS {totalSales}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Sales</p>
              <p className="text-xl font-bold text-green-600">GHS {todaySales}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Orders</p>
              <p className="text-xl font-bold text-orange-600">{pendingOrders}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Processing Orders</p>
              <p className="text-xl font-bold text-blue-600">{processingOrders}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">

            {/* Filters */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Order ID:</label>
                  <input type="text" placeholder="Enter order ID..." className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={orderIdSearch} onChange={e => setOrderIdSearch(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Beneficiary:</label>
                  <input type="text" placeholder="Enter beneficiary number..." className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={beneficiarySearch} onChange={e => setBeneficiarySearch(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Network:</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}>
                    <option value="">All Networks</option>
                    {networks.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status:</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">No orders found</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your filters or place your first order</div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                  <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Order ID</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Network</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Beneficiary</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Total</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredOrders.map(order => (
                        <React.Fragment key={orderKey(order)}>
                          <tr className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === orderKey(order) ? null : orderKey(order))}>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">#{order.id}</div>
                              {order.source === 'shop' && order.customer_email && (
                                <div className="text-xs text-gray-400 truncate max-w-[120px]">{order.customer_email}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <div className="text-sm text-gray-700 dark:text-gray-200">{new Date(order.created_at).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.source === 'shop' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                {order.source === 'shop' ? 'Shop' : 'Direct'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getNetworkBadgeColor(order.network)}`}>{order.network || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeColor(order.status)}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                              <div className="text-sm text-gray-700 dark:text-gray-200">{order.products[0]?.pivot?.beneficiary_number || order.beneficiary_number || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-400 dark:border-gray-600">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">GHS {order.total.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-700 dark:text-gray-200">{order.products[0]?.size || '-'}</div>
                            </td>
                          </tr>
                          {expandedOrder === orderKey(order) && (
                            <tr>
                              <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Order Information</h4>
                                    <div className="space-y-1 text-sm">
                                      <div><span className="text-gray-500">Order ID:</span> <span className="font-medium">#{order.id}</span></div>
                                      <div><span className="text-gray-500">Type:</span> <span className="font-medium">{order.source === 'shop' ? 'Shop Order' : 'Direct Order'}</span></div>
                                      {order.source === 'shop' && order.customer_email && (
                                        <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{order.customer_email}</span></div>
                                      )}
                                      <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadgeColor(order.status)}`}>{order.status}</span></div>
                                      <div><span className="text-gray-500">Total:</span> <span className="font-bold">GHS {order.total.toLocaleString()}</span></div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Products Ordered</h4>
                                    <div className="space-y-2">
                                      {order.products.map(product => (
                                        <div key={product.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <div className="text-sm font-medium">{product.name}{product.size ? ` (${product.size})` : ''}</div>
                                              {product.pivot.beneficiary_number && (
                                                <div className="text-xs text-gray-500">Beneficiary: {product.pivot.beneficiary_number}</div>
                                              )}
                                            </div>
                                            <div className="text-sm font-bold">GHS {product.pivot.price.toLocaleString()}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Table */}
                <div className="lg:hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-r border-gray-400 dark:border-gray-600">Order</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-r border-gray-400 dark:border-gray-600">Network</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase border-r border-gray-400 dark:border-gray-600">Status</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredOrders.map(order => (
                        <React.Fragment key={orderKey(order)}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                            <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">#{order.id}</div>
                              <span className={`text-xs font-medium ${order.source === 'shop' ? 'text-purple-600' : 'text-gray-500'}`}>{order.source === 'shop' ? 'Shop' : 'Direct'}</span>
                              <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                            </td>
                            <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getNetworkBadgeColor(order.network)}`}>{order.network || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadgeColor(order.status)}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">GHS {order.total.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{order.products[0]?.size || '-'}</div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
