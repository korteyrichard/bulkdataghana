import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, useForm, router, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useState } from 'react';

interface ShopProductItem {
    id: number;
    variant_id: number;
    name: string;
    network: string;
    cost_price: number;
    selling_price: number;
    profit: number;
    stock_status: string;
    is_active: boolean;
}

interface AvailableVariant {
    id: number;
    name: string;
    network: string;
    price: number;
}

interface ResultCheckerProduct {
    id: number;
    name: string;
    display_name: string | null;
    checker_type: string;
    price: string;
    available_vouchers_count: number;
}

interface ShopResultChecker {
    id: number;
    shop_id: number;
    result_checker_product_id: number;
    agent_price: string;
    result_checker_product: ResultCheckerProduct;
}

interface ProductsProps extends PageProps {
    shop: { id: number; name: string; slug: string };
    shop_products: ShopProductItem[];
    available_variants: AvailableVariant[];
    resultCheckerProducts: ResultCheckerProduct[];
    shopResultCheckers: ShopResultChecker[];
}

export default function ShopProducts({ auth }: ProductsProps) {
    const { shop, shop_products, available_variants, resultCheckerProducts, shopResultCheckers } = usePage<ProductsProps>().props;

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [selectedRcp, setSelectedRcp] = useState('');
    const [rcPrice, setRcPrice] = useState('');
    const [editingRcId, setEditingRcId] = useState<number | null>(null);
    const [editRcPrice, setEditRcPrice] = useState('');
    const [savingRcId, setSavingRcId] = useState<number | null>(null);

    const addForm = useForm({ product_variant_id: '', selling_price: '' });
    const rcAddForm = useForm({ result_checker_product_id: '', agent_price: '' });

    const addedRcpIds = shopResultCheckers.map(src => src.result_checker_product_id);
    const availableRcps = resultCheckerProducts.filter(rcp => !addedRcpIds.includes(rcp.id));
    const selectedRcpObj = resultCheckerProducts.find(r => r.id === parseInt(selectedRcp));
    const rcCommission = selectedRcpObj && rcPrice && parseFloat(rcPrice) >= parseFloat(selectedRcpObj.price)
        ? (parseFloat(rcPrice) - parseFloat(selectedRcpObj.price)).toFixed(2)
        : null;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('shop.products.add'), { onSuccess: () => addForm.reset() });
    };

    const handleUpdate = (id: number) => {
        router.put(route('shop.products.update', id), { selling_price: editPrice }, {
            onSuccess: () => setEditingId(null),
        });
    };

    const handleRemove = (id: number) => {
        if (confirm('Remove this product from your shop?')) {
            router.delete(route('shop.products.remove', id));
        }
    };

    const handleAddRc = (e: React.FormEvent) => {
        e.preventDefault();
        rcAddForm.transform(() => ({ result_checker_product_id: selectedRcp, agent_price: rcPrice }));
        rcAddForm.post(route('shop.result-checkers.add'), {
            onSuccess: () => { setSelectedRcp(''); setRcPrice(''); rcAddForm.reset(); },
        });
    };

    const handleUpdateRc = (id: number) => {
        setSavingRcId(id);
        router.put(route('shop.result-checkers.update', id), { agent_price: editRcPrice }, {
            onSuccess: () => { setEditingRcId(null); setSavingRcId(null); },
            onError: () => setSavingRcId(null),
        });
    };

    const handleRemoveRc = (id: number) => {
        if (confirm('Remove this result checker from your shop?')) {
            router.delete(route('shop.result-checkers.remove', id));
        }
    };

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Shop Products</h2>}>
            <Head title="Shop Products" />
            <div className="max-w-5xl mx-auto p-4 space-y-6">
                <Link href={route('shop.dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Shop
                </Link>

                {/* Add data bundle */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Data Bundle to Shop</h3>
                    {available_variants.length === 0 ? (
                        <p className="text-sm text-gray-500">All available products are already in your shop.</p>
                    ) : (
                        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={addForm.data.product_variant_id}
                                onChange={e => addForm.setData('product_variant_id', e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                required
                            >
                                <option value="">Select a product</option>
                                {available_variants.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} ({v.network}) — Cost: GHS {v.price.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number" step="0.01" min="0.01"
                                placeholder="Your selling price"
                                value={addForm.data.selling_price}
                                onChange={e => addForm.setData('selling_price', e.target.value)}
                                className="w-40 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                required
                            />
                            <button type="submit" disabled={addForm.processing}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                Add
                            </button>
                        </form>
                    )}
                    {addForm.errors.selling_price && <p className="text-red-500 text-xs mt-2">{addForm.errors.selling_price}</p>}
                </div>

                {/* Data bundle list */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Product', 'Network', 'Cost', 'Your Price', 'Profit', 'Stock', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {shop_products.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No products yet. Add some above.</td></tr>
                            ) : shop_products.map(sp => (
                                <tr key={sp.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{sp.name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sp.network}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">GHS {sp.cost_price.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        {editingId === sp.id ? (
                                            <input type="number" step="0.01" value={editPrice}
                                                onChange={e => setEditPrice(e.target.value)}
                                                className="w-24 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600" />
                                        ) : (
                                            <span className="font-medium">GHS {sp.selling_price.toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-green-600 font-medium">GHS {sp.profit.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${sp.stock_status === 'IN STOCK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {sp.stock_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {editingId === sp.id ? (
                                                <>
                                                    <button onClick={() => handleUpdate(sp.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setEditingId(sp.id); setEditPrice(String(sp.selling_price)); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                                                    <button onClick={() => handleRemove(sp.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Remove</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add result checker */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Result Checker to Shop</h3>
                    {availableRcps.length === 0 ? (
                        <p className="text-sm text-gray-500">All available result checkers are already in your shop.</p>
                    ) : (
                        <form onSubmit={handleAddRc} className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={selectedRcp}
                                onChange={e => { setSelectedRcp(e.target.value); setRcPrice(''); }}
                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                required
                            >
                                <option value="">Select a result checker</option>
                                {availableRcps.map(rcp => (
                                    <option key={rcp.id} value={rcp.id}>
                                        {rcp.display_name ?? rcp.name} — Base: GHS {parseFloat(rcp.price).toFixed(2)} ({rcp.available_vouchers_count} in stock)
                                    </option>
                                ))}
                            </select>
                            <div className="flex flex-col gap-1">
                                <input
                                    type="number" step="0.01"
                                    min={selectedRcpObj ? selectedRcpObj.price : '0'}
                                    placeholder="Your selling price"
                                    value={rcPrice}
                                    onChange={e => setRcPrice(e.target.value)}
                                    className="w-44 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    required
                                />
                                {rcCommission && (
                                    <p className="text-xs text-green-600">+GHS {rcCommission} commission/sale</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={rcAddForm.processing || !selectedRcp || !rcPrice || (selectedRcpObj ? parseFloat(rcPrice) < parseFloat(selectedRcpObj.price) : false)}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 self-start"
                            >
                                Add
                            </button>
                        </form>
                    )}
                    {rcAddForm.errors.agent_price && <p className="text-red-500 text-xs mt-2">{rcAddForm.errors.agent_price}</p>}
                </div>

                {/* Result checker list */}
                {shopResultCheckers.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {['Product', 'Type', 'Base Price', 'Your Price', 'Commission', 'Stock', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {shopResultCheckers.map(src => {
                                    const rcp = src.result_checker_product;
                                    const commission = (parseFloat(src.agent_price) - parseFloat(rcp.price)).toFixed(2);
                                    const editRcpObj = resultCheckerProducts.find(r => r.id === src.result_checker_product_id);
                                    const editCommission = editingRcId === src.id && editRcPrice && editRcpObj && parseFloat(editRcPrice) >= parseFloat(editRcpObj.price)
                                        ? (parseFloat(editRcPrice) - parseFloat(editRcpObj.price)).toFixed(2)
                                        : null;
                                    return (
                                        <tr key={src.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{rcp.display_name ?? rcp.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${rcp.checker_type === 'WASSCE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {rcp.checker_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">GHS {parseFloat(rcp.price).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                {editingRcId === src.id ? (
                                                    <div className="flex flex-col gap-1">
                                                        <input type="number" step="0.01" min={rcp.price} value={editRcPrice}
                                                            onChange={e => setEditRcPrice(e.target.value)}
                                                            className="w-24 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600" />
                                                        {editCommission && <p className="text-xs text-green-600">+GHS {editCommission}/sale</p>}
                                                    </div>
                                                ) : (
                                                    <span className="font-medium">GHS {parseFloat(src.agent_price).toFixed(2)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-green-600 font-medium">GHS {commission}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${rcp.available_vouchers_count > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {rcp.available_vouchers_count} in stock
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {editingRcId === src.id ? (
                                                        <>
                                                            <button onClick={() => handleUpdateRc(src.id)} disabled={savingRcId === src.id}
                                                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Save</button>
                                                            <button onClick={() => setEditingRcId(null)}
                                                                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => { setEditingRcId(src.id); setEditRcPrice(src.agent_price); }}
                                                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                                                            <button onClick={() => handleRemoveRc(src.id)}
                                                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Remove</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
