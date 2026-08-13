import { Head, usePage, useForm, Link } from '@inertiajs/react';
import { useState, useRef } from 'react';

interface ShopProduct {
    id: number;
    name: string;
    network: string;
    selling_price: number;
    in_stock: boolean;
}

interface ResultChecker {
    id: number;
    result_checker_product_id: number;
    name: string;
    checker_type: string;
    agent_price: number;
    in_stock: boolean;
}

interface StorefrontProps {
    shop: {
        name: string; slug: string; description: string | null;
        logo: string | null; whatsapp: string | null;
        primary_color: string; secondary_color: string;
    };
    products: ShopProduct[];
    resultCheckers: ResultChecker[];
    flash?: { error?: string };
}

// Group products by network
function groupByNetwork(products: ShopProduct[]): Record<string, ShopProduct[]> {
    return products.reduce((acc, p) => {
        const key = p.network.toUpperCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {} as Record<string, ShopProduct[]>);
}

const networkMeta: Record<string, { icon: string; gradient: string }> = {
    MTN:     { icon: '/mtnlogo.jpeg',    gradient: 'from-yellow-500 to-yellow-700' },
    TELECEL: { icon: '/telecellogo.png', gradient: 'from-red-500 to-red-700' },
    ISHARE:  { icon: '/atlogo.png',      gradient: 'from-blue-500 to-blue-700' },
    BIGTIME: { icon: '/atlogo.png',      gradient: 'from-blue-600 to-indigo-700' },
};

function getNetworkMeta(network: string) {
    return networkMeta[network.toUpperCase()] ?? { icon: '/bulkdata.png', gradient: 'from-gray-500 to-gray-700' };
}

interface RcModalProps {
    rc: ResultChecker;
    shopSlug: string;
    primaryColor: string;
    secondaryColor: string;
    onClose: () => void;
}

function RcModal({ rc, shopSlug, primaryColor, secondaryColor, onClose }: RcModalProps) {
    const { data, setData, post, processing, errors } = useForm({
        agent_result_checker_id: rc.id,
        recipient: '',
        quantity: 1,
        email: '',
    });
    const [quantityInput, setQuantityInput] = useState('1');

    const total = (rc.agent_price * data.quantity).toFixed(2);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shop.purchase.result-checker', shopSlug));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 text-white" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">📋 {rc.checker_type}</p>
                            <h3 className="font-bold text-lg leading-tight">{rc.name}</h3>
                            <p className="text-2xl font-bold mt-1">GHS {rc.agent_price.toFixed(2)} / card</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <form onSubmit={submit} className="p-5 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                        <input type="email" placeholder="your@email.com"
                            value={data.email} onChange={e => setData('email', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number (to receive SMS) *</label>
                        <input type="tel" placeholder="0XXXXXXXXX"
                            value={data.recipient}
                            onChange={e => setData('recipient', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={10} required />
                        {errors.recipient && <p className="text-red-500 text-xs mt-1">{errors.recipient}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                        <input type="number" min={1} max={30}
                            value={quantityInput}
                            onChange={e => {
                                setQuantityInput(e.target.value);
                                const parsed = parseInt(e.target.value);
                                if (!isNaN(parsed)) setData('quantity', Math.min(30, Math.max(1, parsed)));
                            }}
                            onBlur={() => {
                                const parsed = parseInt(quantityInput);
                                const clamped = isNaN(parsed) ? 1 : Math.min(30, Math.max(1, parsed));
                                setQuantityInput(String(clamped));
                                setData('quantity', clamped);
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                    </div>
                    {(errors as any).stock && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{(errors as any).stock}</p>}
                    {(errors as any).message && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{(errors as any).message}</p>}
                    <button type="submit" disabled={processing}
                        className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                        style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                        {processing ? 'Redirecting to Paystack...' : `Pay GHS ${total}`}
                    </button>
                    <p className="text-center text-xs text-gray-400">Secured by Paystack. Cards delivered via SMS.</p>
                </form>
            </div>
        </div>
    );
}

interface OrderModalProps {
    product: ShopProduct;
    shopSlug: string;
    primaryColor: string;
    secondaryColor: string;
    onClose: () => void;
}

function OrderModal({ product, shopSlug, primaryColor, secondaryColor, onClose }: OrderModalProps) {
    const { data, setData, post, processing, errors } = useForm({
        customer_email: '',
        items: [{ shop_product_id: product.id, beneficiary_number: '' }],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shop.storefront.checkout', shopSlug));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Modal header with shop colors */}
                <div className="p-5 text-white" style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{product.network}</p>
                            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                            <p className="text-2xl font-bold mt-1">GHS {product.selling_price.toFixed(2)}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="p-5 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Number *</label>
                        <input
                            type="tel"
                            placeholder="e.g. 0241234567"
                            value={data.items[0].beneficiary_number}
                            onChange={e => setData('items', [{ ...data.items[0], beneficiary_number: e.target.value.replace(/\D/g, '').slice(0, 10) }])}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={10}
                            required
                        />
                        <p className="text-xs text-amber-600 mt-1">⚠️ Verify this number carefully before paying.</p>
                    </div>

                    <div className="border-t pt-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Your Details</p>
                        <input
                            type="email"
                            placeholder="Email Address *"
                            value={data.customer_email}
                            onChange={e => setData('customer_email', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {errors.message && (
                        <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{errors.message}</p>
                    )}

                    <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="font-bold text-gray-900">GHS {product.selling_price.toFixed(2)}</span>
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.items[0].beneficiary_number || !data.customer_email}
                        className="w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-opacity"
                        style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                    >
                        {processing ? 'Redirecting to Paystack...' : `Pay GHS ${product.selling_price.toFixed(2)}`}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function Storefront() {
    const { shop, products, resultCheckers = [], flash } = usePage<StorefrontProps>().props;
    const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
    const [selectedRc, setSelectedRc] = useState<ResultChecker | null>(null);
    const rcSectionRef = useRef<HTMLDivElement>(null);

    const scrollToRc = () => rcSectionRef.current?.scrollIntoView({ behavior: 'smooth' });

    const grouped = groupByNetwork(products);
    const networks = Object.keys(grouped);

    const toggleNetwork = (network: string) => {
        setExpandedNetwork(prev => prev === network ? null : network);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title={shop.name} />

                {/* Header — uses shop colors */}
                <div
                    className="text-white py-8 px-4 shadow-lg"
                    style={{ background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` }}
                >
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        {shop.logo ? (
                            <img src={shop.logo} alt={shop.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-lg flex-shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                                {shop.name.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold truncate">{shop.name}</h1>
                            {shop.description && <p className="text-white/80 text-sm mt-0.5 line-clamp-2">{shop.description}</p>}
                        </div>
                        {shop.whatsapp && (
                            <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '').replace(/^0/, '233')}`} target="_blank"
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Chat
                            </a>
                        )}
                        {resultCheckers.length > 0 && (
                            <button onClick={scrollToRc}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">
                                📋 Result Checkers
                            </button>
                        )}
                        <Link href={route('shop.storefront.track.page', shop.slug)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Track Order
                        </Link>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

                    {flash?.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {flash.error}
                        </div>
                    )}

                    {networks.length === 0 ? (
                        <div className="bg-white rounded-xl shadow p-12 text-center">
                            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-gray-500">No products available yet.</p>
                        </div>
                    ) : networks.map(network => {
                        const meta = getNetworkMeta(network);
                        const networkProducts = grouped[network];
                        const isExpanded = expandedNetwork === network;

                        return (
                            <div key={network} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                                {/* Network header — clickable */}
                                <div
                                    className={`bg-gradient-to-r ${meta.gradient} p-5 cursor-pointer select-none`}
                                    onClick={() => toggleNetwork(network)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                                                <img src={meta.icon} alt={network} className="w-10 h-10 rounded-lg object-contain" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white">{network}</h4>
                                                <p className="text-white/70 text-sm">{networkProducts.length} package{networkProducts.length !== 1 ? 's' : ''} available</p>
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-6 h-6 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Products list */}
                                {isExpanded && (
                                    <div className="divide-y divide-gray-50">
                                        {networkProducts.map(product => (
                                            <div key={product.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{product.name}</p>
                                                    <p className="text-xl font-bold mt-0.5" style={{ color: shop.primary_color }}>
                                                        GHS {product.selling_price.toFixed(2)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedProduct(product)}
                                                    disabled={!product.in_stock}
                                                    className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                                                    style={product.in_stock ? { background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` } : {}}
                                                >
                                                    {product.in_stock ? 'Buy Now' : 'Out of Stock'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Result Checkers section */}
                {resultCheckers.length > 0 && (
                    <div ref={rcSectionRef} className="max-w-2xl mx-auto px-4 pb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-3">Result Checkers</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {resultCheckers.map(rc => (
                                <div key={rc.id}
                                    onClick={() => rc.in_stock && setSelectedRc(rc)}
                                    className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all ${
                                        rc.in_stock ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'
                                    }`}>
                                    <div className="p-3 text-white text-center text-sm font-bold"
                                        style={{ background: `linear-gradient(to right, ${shop.primary_color}, ${shop.secondary_color})` }}>
                                        📋 {rc.checker_type}
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="font-semibold text-gray-900 text-sm">{rc.name}</p>
                                        <p className="font-bold mt-1" style={{ color: shop.primary_color }}>GHS {rc.agent_price.toFixed(2)}</p>
                                        <p className="text-xs text-gray-400">per card</p>
                                        {!rc.in_stock && <p className="text-xs text-red-500 mt-1 font-medium">Out of Stock</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data bundle order modal */}
                {selectedProduct && (
                    <OrderModal product={selectedProduct} shopSlug={shop.slug}
                        primaryColor={shop.primary_color} secondaryColor={shop.secondary_color}
                        onClose={() => setSelectedProduct(null)} />
                )}

                {/* Result checker purchase modal */}
                {selectedRc && (
                    <RcModal rc={selectedRc} shopSlug={shop.slug}
                        primaryColor={shop.primary_color} secondaryColor={shop.secondary_color}
                        onClose={() => setSelectedRc(null)} />
                )}
        </div>
    );
}
