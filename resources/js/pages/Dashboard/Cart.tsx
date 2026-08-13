import DashboardLayout from '../../layouts/DashboardLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import React from 'react';
import { PageProps } from '@/types';

interface CartProduct {
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

// Fix: Add index signature to make it compatible with PageProps constraint
interface CartPageProps extends Record<string, unknown> {
  cartItems: CartProduct[];
}

export default function Cart() {
  const { cartItems, auth } = usePage<PageProps<CartPageProps>>().props;

  const handleRemove = (cartId: number) => {
    router.delete(route('remove.from.cart', cartId));
  };

  const total = cartItems.reduce((sum, item) => sum + Number(item.product?.price || 0), 0);

  return (
    <DashboardLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          Cart
        </h2>
      }
    >
      <Head title="Cart" />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-4 sm:px-6 lg:px-8 py-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <Icon name="ShoppingCart" className="w-7 h-7 sm:w-8 sm:h-8" />
                Your Cart
                {cartItems.length > 0 && (
                  <span className="bg-white/20 text-white text-sm px-2 py-1 rounded-full">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h3>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {cartItems.length === 0 ? (
                <div className="text-center py-16">
                  <Icon name="ShoppingCart" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Your cart is empty
                  </h4>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    Add some products to get started
                  </p>
                  <Button 
                    onClick={() => router.visit('/dashboard')}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200"
                  >
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Product</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Network</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Size</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Beneficiary</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Expiry</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-400 dark:border-gray-600">Price</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-400 dark:divide-gray-600">
                      {cartItems.map((item) => (
                        <tr key={item.id} className="hover:bg-cyan-50 dark:hover:bg-gray-800 transition-all duration-200">
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.product?.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-200 text-cyan-700">
                              {item.product?.network}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                            <span className="px-3 py-1 rounded-lg text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30">
                              {item.quantity.toString().toUpperCase().includes('GB') ? item.quantity : `${item.quantity}GB`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm text-gray-700 dark:text-gray-200">{item.beneficiary_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm text-gray-700 dark:text-gray-200">{item.product?.expiry}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              GHS {item.product?.price || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleRemove(item.id)}
                            >
                              <Icon name="Trash2" className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Table */}
                <div className="lg:hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-600 border border-gray-400 dark:border-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Network</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Size</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-gray-400 dark:border-gray-600">Price</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-400 dark:divide-gray-600">
                      {cartItems.map((item) => (
                        <tr key={item.id} className="hover:bg-cyan-50 dark:hover:bg-gray-800 transition-all duration-200">
                          <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.product?.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.beneficiary_number}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.product?.expiry}</div>
                          </td>
                          <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-cyan-200 text-cyan-700">
                              {item.product?.network}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-r border-gray-400 dark:border-gray-600">
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30">
                              {item.quantity.toString().toUpperCase().includes('GB') ? item.quantity : `${item.quantity}GB`}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right border-r border-gray-400 dark:border-gray-600">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              GHS {item.product?.price || 0}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleRemove(item.id)}
                            >
                              <Icon name="Trash2" className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  
                  {/* Total and Checkout Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-6 mt-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Total Amount
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                          GHS {total}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => router.visit('/dashboard')}
                          className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 hover:bg-cyan-50 dark:hover:bg-gray-800 transition-colors duration-200"
                        >
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Add More Items
                        </Button>
                        
                        <Button 
                          onClick={() => router.visit('/checkout')}
                          className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                        >
                          <Icon name="CreditCard" className="w-4 h-4 mr-2" />
                          Proceed to Checkout
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}