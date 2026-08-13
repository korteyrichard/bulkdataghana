import { Head, usePage, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

interface ShopInfo {
    name: string;
    slug: string;
    logo: string | null;
    primary_color: string;
    secondary_color: string;
}

interface OrderItem {
    product_name: string;
    network: string;
    beneficiary_number: string;
    unit_price: number;
}

interface AffordableProduct {
    id: number;
    name: string;
    network: string;
    selling_price: number;
}

type TrackResult =
    | { status: 'found'; order: { reference: string; payment_status: string; fulfillment_status: string; total_amount: number; created_at: string; items: OrderItem[] } }
    | { status: 'reference_used'; message: string }
    | { status: 'not_found'; message: string }
    | { status: 'payment_exists_no_order'; paid_amount: number; reference: string; products: AffordableProduct[] };

interface TrackOrderProps {
    shop: ShopInfo;
    track_result?: TrackResult;
}

const statusBadge: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    fulfilled: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
};

function CreateOrderModal({
    product, reference, shopSlug, primaryColor, secondaryColor, onClose,
}: {
    product: AffordableProduct; reference: string; shopSlug: string;
    primaryColor: string; secondaryColor: string; onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        reference,
        shop_product_id: product.id,
        beneficiary_number: '',
        customer_email: '',
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 text-white" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{product.network}</p>
                            <h3 className="font-bold text-lg">{product.name}</h3>
                            <p className="text-2xl font-bold mt-1">GHS {product.selling_price.toFixed(2)}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={e => { e.preventDefault(); post(route('shop.storefront.create-from-payment', shopSlug)); }}
                    className="p-5 space-y-3"
                >
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Number *</label>
                        <input
                            type="tel"
                            placeholder="e.g. 0241234567"
                            value={data.beneficiary_number}
                            onChange={e => setData('beneficiary_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={10}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={data.customer_email}
                            onChange={e => setData('customer_email', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {errors.message && (
                        <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{errors.message}</p>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                        ✅ No additional payment required. Your existing payment will be used.
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.beneficiary_number || !data.customer_email}
                        className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                        style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                    >
                        {processing ? 'Creating Order...' : 'Create Order'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function TrackOrder() {
    const { shop, track_result: result } = usePage<TrackOrderProps>().props;

    const { data, setData, post, processing } = useForm({
        beneficiary_number: '',
        reference: '',
    });

    const [selectedProduct, setSelectedProduct] = useState<AffordableProduct | null>(null);

    return (
        <>
            <Head title={`Track Order — ${shop.name}`} />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div
                    className="text-white py-6 px-4 shadow-lg"
                    style={{ background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` }}
                >
                    <div className="max-w-lg mx-auto flex items-center gap-3">
                        <Link href={route('shop.storefront', shop.slug)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        {shop.logo ? (
                            <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/50 flex-shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold flex-shrink-0">
                                {shop.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{shop.name}</h1>
                            <p className="text-white/70 text-xs">Order Tracking</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
                    {/* Search form */}
                    <div className="bg-white rounded-2xl shadow-md p-5">
                        <h2 className="font-semibold text-gray-800 mb-4">Track Your Order</h2>
                        <form
                            onSubmit={e => { e.preventDefault(); post(route('shop.storefront.track', shop.slug)); }}
                            className="space-y-3"
                        >
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Beneficiary Number *</label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 0241234567"
                                    value={data.beneficiary_number}
                                    onChange={e => setData('beneficiary_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={10}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Paystack Reference *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. store_xxxxxxxx-xxxx-xxxx"
                                    value={data.reference}
                                    onChange={e => setData('reference', e.target.value.trim())}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Must start with <span className="font-mono">store_</span></p>
                            </div>
                            <button
                                type="submit"
                                disabled={processing || !data.beneficiary_number || !data.reference}
                                className="w-full py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                                style={{ background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` }}
                            >
                                {processing ? 'Searching...' : 'Track Order'}
                            </button>
                        </form>
                    </div>

                    {/* Results */}
                    {result && (
                        <>
                            {/* Order found */}
                            {result.status === 'found' && (
                                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                                    <div className="bg-green-50 border-b border-green-100 px-5 py-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-semibold text-green-800">Order Found</span>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs">Reference</p>
                                                <p className="font-mono text-xs text-gray-700 break-all">{result.order.reference}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Date</p>
                                                <p className="font-medium text-gray-800">{new Date(result.order.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Payment</p>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[result.order.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {result.order.payment_status}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Fulfillment</p>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[result.order.fulfillment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {result.order.fulfillment_status ?? 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3">
                                            <p className="text-xs font-medium text-gray-500 mb-2">Order Items</p>
                                            <div className="space-y-2">
                                                {result.order.items.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-800">{item.product_name}</p>
                                                            <p className="text-xs text-gray-500">{item.network} · {item.beneficiary_number}</p>
                                                        </div>
                                                        <p className="font-bold text-sm" style={{ color: shop.primary_color }}>
                                                            GHS {item.unit_price.toFixed(2)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center border-t pt-3">
                                            <span className="text-sm text-gray-600">Total Paid</span>
                                            <span className="font-bold text-gray-900">GHS {result.order.total_amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reference used by another order */}
                            {result.status === 'reference_used' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
                                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-amber-800">Reference Already Used</p>
                                        <p className="text-sm text-amber-700 mt-1">{result.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Not found */}
                            {result.status === 'not_found' && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-red-700">Order Not Found</p>
                                        <p className="text-sm text-red-600 mt-1">{result.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Payment exists but no order — show products */}
                            {result.status === 'payment_exists_no_order' && (
                                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                                    <div className="bg-blue-50 border-b border-blue-100 px-5 py-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-semibold text-blue-800">Payment Found — No Order Yet</span>
                                        </div>
                                        <p className="text-sm text-blue-700">
                                            Your payment of <strong>GHS {result.paid_amount.toFixed(2)}</strong> was successful but no order was created.
                                            Select a product below to create your order — no additional payment needed.
                                        </p>
                                    </div>

                                    <div className="p-5">
                                        {result.products.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">No products available within your paid amount.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-gray-500 mb-3">
                                                    Products available for GHS {result.paid_amount.toFixed(2)} and below:
                                                </p>
                                                {result.products.map(product => (
                                                    <div key={product.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                                        <div>
                                                            <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                                                            <p className="text-xs text-gray-500">{product.network}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-sm" style={{ color: shop.primary_color }}>
                                                                GHS {product.selling_price.toFixed(2)}
                                                            </p>
                                                            <button
                                                                onClick={() => setSelectedProduct(product)}
                                                                className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold"
                                                                style={{ background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` }}
                                                            >
                                                                Select
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {selectedProduct && result?.status === 'payment_exists_no_order' && (
                    <CreateOrderModal
                        product={selectedProduct}
                        reference={result.reference}
                        shopSlug={shop.slug}
                        primaryColor={shop.primary_color}
                        secondaryColor={shop.secondary_color}
                        onClose={() => setSelectedProduct(null)}
                    />
                )}
            </div>
        </>
    );
}
