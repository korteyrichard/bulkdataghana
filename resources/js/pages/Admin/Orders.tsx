import React, { useState } from 'react';
import { AdminLayout } from '../../layouts/admin-layout';
import { Head, usePage, router } from '@inertiajs/react';
import Pagination from '@/components/pagination';

interface Product {
  id: number;
  name: string;
  price: number;
  size?: string;
  pivot: {
    quantity: number;
    price: number;
    beneficiary_number?: string;
  };
}

interface Order {
  id: number;
  source: 'direct' | 'shop';
  reference: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  created_at: string;
  network?: string;
  beneficiary_number?: string;
  api_status?: string | null;
  products: Product[];
  user: { id: number; name: string; email: string } | null;
}

interface PaginatedOrders {
  data: Order[];
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

interface AdminOrdersPageProps {
  orders: PaginatedOrders;
  auth: any;
  filterNetwork: string;
  filterStatus: string;
  searchOrderId: string;
  searchBeneficiaryNumber: string;
  filterEmail: string;
  filterUsername: string;
  filterDate: string;
  dailyTotalSales: number;
  [key: string]: any;
}

export default function AdminOrders() {
  const {
    orders,
    auth,
    filterNetwork: initialNetworkFilter,
    filterStatus: initialStatusFilter,
    searchOrderId: initialSearchOrderId,
    searchBeneficiaryNumber: initialSearchBeneficiaryNumber,
    filterEmail: initialEmail,
    filterUsername: initialUsername,
    filterDate: initialDate,
    dailyTotalSales,
  } = usePage<AdminOrdersPageProps>().props;

  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [networkFilter, setNetworkFilter] = useState(initialNetworkFilter);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchOrderId, setSearchOrderId] = useState(initialSearchOrderId);
  const [searchBeneficiaryNumber, setSearchBeneficiaryNumber] = useState(initialSearchBeneficiaryNumber);
  const [emailFilter, setEmailFilter] = useState(initialEmail);
  const [usernameFilter, setUsernameFilter] = useState(initialUsername);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');

  const getOrderKey = (order: Order) => `${order.source}_${order.id}`;

  const networks = Array.from(new Set((orders?.data || []).map(o => o.network).filter(Boolean)));

  const handleFilterChange = (filterName: string, value: string) => {
    const network = filterName === 'network' ? value : networkFilter;
    const status = filterName === 'status' ? value : statusFilter;
    const orderId = filterName === 'order_id' ? value : searchOrderId;
    const beneficiaryNumber = filterName === 'beneficiary_number' ? value : searchBeneficiaryNumber;
    const email = filterName === 'email' ? value : emailFilter;
    const username = filterName === 'username' ? value : usernameFilter;
    const date = filterName === 'date' ? value : dateFilter;

    const newFilters: Record<string, string> = {};
    if (network) newFilters.network = network;
    if (status) newFilters.status = status;
    if (orderId) newFilters.order_id = orderId;
    if (beneficiaryNumber) newFilters.beneficiary_number = beneficiaryNumber;
    if (email) newFilters.email = email;
    if (username) newFilters.username = username;
    if (date) newFilters.date = date;
    newFilters.page = String(orders.current_page);

    setNetworkFilter(network);
    setStatusFilter(status);
    setSearchOrderId(orderId);
    setSearchBeneficiaryNumber(beneficiaryNumber);
    setEmailFilter(email);
    setUsernameFilter(username);
    setDateFilter(date);
    router.get(route('admin.orders'), newFilters, { preserveState: true, replace: true });
  };

  const handleExpand = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getNetworkColor = (network?: string) => {
    if (!network) return 'bg-gray-200 text-gray-700';
    const map: Record<string, string> = {
      telecel: 'bg-red-100 text-red-700',
      mtn: 'bg-yellow-100 text-yellow-800',
      bigtime: 'bg-blue-100 text-blue-700',
      ishare: 'bg-blue-100 text-blue-700',
      'at data (instant)': 'bg-blue-100 text-blue-700',
      'at (big packages)': 'bg-blue-100 text-blue-700',
    };
    return map[network.toLowerCase()] || 'bg-gray-200 text-gray-700';
  };

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'disabled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDeleteOrder = (orderId: number) => {
    if (confirm('Are you sure you want to delete this order?')) {
      router.delete(route('admin.orders.delete', orderId), {
        onSuccess: () => router.reload(),
        onError: () => alert('Failed to delete order.'),
      });
    }
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    if (order.source === 'shop') {
      router.put(route('admin.shop-orders.updateStatus', order.id), { status: newStatus }, {
        onSuccess: () => router.reload(),
        onError: () => alert('Failed to update order status.'),
      });
    } else {
      router.put(route('admin.orders.updateStatus', order.id), { status: newStatus }, {
        onSuccess: () => router.reload(),
        onError: () => alert('Failed to update order status.'),
      });
    }
  };

  const handleSelectOrder = (order: Order) => {
    const key = getOrderKey(order);
    setSelectedOrders(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.data.length
        ? []
        : orders.data.map(getOrderKey)
    );
  };

  const handleBulkStatusUpdate = () => {
    if (selectedOrders.length === 0 || !bulkStatus) return;

    const selectedItems = orders.data.filter(o => selectedOrders.includes(getOrderKey(o)));
    const orderEntries = selectedItems.map(o => ({ id: o.id, source: o.source }));
    
    router.put(route('admin.orders.bulkUpdateStatus'), {
      orders: orderEntries,
      status: bulkStatus,
    }, {
      onSuccess: () => {
        setSelectedOrders([]);
        setBulkStatus('');
        router.reload();
      },
      onError: () => alert('Failed to update order statuses.'),
    });
  };

  return (
    <AdminLayout
      user={auth?.user}
      header={<h2 className="text-3xl font-bold text-gray-800 dark:text-white">Orders</h2>}
    >
      <Head title="Admin Orders" />
      <div className="max-w-6xl mx-auto py-10 px-2 sm:px-4">
        {/* Daily Sales Summary */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20 mb-6">
          <h3 className="text-lg font-semibold text-white/90 mb-2">Today's Sales Summary</h3>
          <p className="text-3xl font-bold text-white">GHS {dailyTotalSales || '0.00'}</p>
        </div>
        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-800 dark:to-indigo-700 border border-indigo-200 dark:border-indigo-600 rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {selectedOrders.length} order(s) selected
              </span>
              <div className="flex gap-2">
                <select
                  className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-sm"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="">Change status to...</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Fetch fresh CSRF token
                      const response = await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
                      
                      const form = document.createElement('form');
                      form.method = 'POST';
                      form.action = route('admin.orders.export');
                      form.style.display = 'none';
                      
                      const csrfInput = document.createElement('input');
                      csrfInput.type = 'hidden';
                      csrfInput.name = '_token';
                      csrfInput.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                      form.appendChild(csrfInput);
                      
                      selectedOrders.forEach(orderId => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'order_ids[]';
                        input.value = orderId.toString();
                        form.appendChild(input);
                      });
                      
                      document.body.appendChild(form);
                      form.submit();
                      document.body.removeChild(form);
                    } catch (error) {
                      alert('Failed to export orders. Please try again.');
                    }
                  }}
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search by Order ID</label>
            <input
              type="text"
              placeholder="Enter order ID..."
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={searchOrderId}
              onChange={(e) => handleFilterChange('order_id', e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search by Beneficiary Number</label>
            <input
              type="text"
              placeholder="Enter beneficiary number..."
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={searchBeneficiaryNumber}
              onChange={(e) => handleFilterChange('beneficiary_number', e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Network</label>
            <select
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={networkFilter}
              onChange={(e) => handleFilterChange('network', e.target.value)}
            >
              <option value="">--select network--</option>
              {networks.map(network => (
                <option key={network} value={network}>{network}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status</label>
            <select
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">--select status--</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Email</label>
            <input
              type="text"
              placeholder="Enter email..."
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={emailFilter}
              onChange={(e) => handleFilterChange('email', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Username</label>
            <input
              type="text"
              placeholder="Enter username..."
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={usernameFilter}
              onChange={(e) => handleFilterChange('username', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date</label>
            <input
              type="date"
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:ring focus:ring-blue-500 text-sm"
              value={dateFilter}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>
        </div>

        {/* Orders Table */}
        {orders.data.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-6 rounded-xl text-center shadow-md">
            No orders found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="min-w-[600px] w-full text-sm text-left text-gray-700 dark:text-gray-300">
              <thead className="uppercase text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 sm:px-5 py-3 sm:py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.data.length && orders.data.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Order #</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">User</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Date</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Network</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Status</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">API Status</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4">Total</th>
                  <th className="px-3 sm:px-5 py-3 sm:py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition">
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(getOrderKey(order))}
                          onChange={() => handleSelectOrder(order)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="font-semibold">{order.id}</div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${order.source === 'shop' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {order.source === 'shop' ? 'Shop' : 'Direct'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="text-sm">
                          <div className="font-medium">{order.source === 'shop' ? (order.user?.name ?? 'Shop Order') : (order.user?.name || 'Unknown User')}</div>
                          <div className="text-gray-500 text-xs">{order.source === 'shop' ? (order.customer_email || '-') : (order.user?.email || 'No email')}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">{new Date(order.created_at).toLocaleString()}</td>
                      <td className={`px-3 sm:px-5 py-3 sm:py-4 rounded ${getNetworkColor(order.network)} font-medium`}>
                        {order.network || '-'}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <select
                          className="px-2 py-1 rounded-md text-xs dark:bg-gray-800 bg-gray-100"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getApiStatusColor(order.api_status || 'disabled')}`}>
                          {order.api_status || 'disabled'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 font-semibold">GHS {order.total}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleExpand(order.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm"
                        >
                          {expandedOrder === order.id ? 'Hide' : 'Details'}
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-500 hover:underline text-xs sm:text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {expandedOrder === order.id && (
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                        <td colSpan={9} className="px-3 sm:px-6 py-4 sm:py-5">
                          <div className="space-y-2 text-xs sm:text-sm">
                            <p><strong>Status:</strong> {order.status}</p>
                            <p><strong>API Status:</strong> <span className={`px-2 py-1 rounded text-xs ${getApiStatusColor(order.api_status || 'disabled')}`}>{order.api_status || 'disabled'}</span></p>
                            <p><strong>Products:</strong></p>
                            <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                              {order.products?.map((product) => (
                                <li key={product?.id || Math.random()} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                                  <span>
                                    {product?.name || 'Unknown Product'}{product?.size ? ` (${product.size})` : ''} - GHS {product?.pivot?.price || '0.00'}
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    Beneficiary: {product?.pivot?.beneficiary_number || '-'}
                                  </span>
                                </li>
                              )) || []}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        <Pagination data={orders} />
      </div>
    </AdminLayout>
  );
}
