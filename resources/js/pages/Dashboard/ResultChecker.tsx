import React, { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, CheckCheck, BookOpen, GraduationCap } from 'lucide-react';

interface ResultCheckerProduct {
    id: number;
    name: string;
    checker_type: string;
    display_name: string | null;
    price: number;
    status: string;
    available_vouchers_count: number;
}

interface Checker {
    serial: string;
    pin: string;
    code: string;
}

interface Purchase {
    id: number;
    checker_type: string;
    display_name: string | null;
    recipient: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    client_reference: string | null;
    status: 'COMPLETED' | 'FAILED' | 'PENDING';
    checkers: Checker[];
    created_at: string;
    product: ResultCheckerProduct | null;
}

interface PaginatedPurchases {
    data: Purchase[];
    links: any[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    auth: { user: { id: number; name: string; email: string; wallet_balance: number; phone?: string } };
    products: ResultCheckerProduct[];
    purchases: PaginatedPurchases;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
            {copied ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </button>
    );
}

const typeGradient = (type: string) => {
    if (type === 'WASSCE') return 'from-blue-600 to-indigo-600';
    if (type === 'BECE') return 'from-emerald-500 to-teal-600';
    return 'from-gray-500 to-gray-600';
};

const typeIcon = (type: string) => {
    if (type === 'WASSCE') return <GraduationCap className="h-8 w-8" />;
    if (type === 'BECE') return <BookOpen className="h-8 w-8" />;
    return <BookOpen className="h-8 w-8" />;
};

export default function ResultChecker({ auth, products, purchases }: Props) {
    const { errors, flash } = usePage<any>().props;
    const [selectedProduct, setSelectedProduct] = useState<ResultCheckerProduct | null>(null);
    const [recipient, setRecipient] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [expandedPurchase, setExpandedPurchase] = useState<number | null>(null);

    const total = selectedProduct ? selectedProduct.price * quantity : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setProcessing(true);
        router.post(route('dashboard.result-checker.purchase'), {
            result_checker_product_id: selectedProduct.id,
            recipient,
            quantity,
        }, {
            onFinish: () => setProcessing(false),
            onSuccess: () => { setSelectedProduct(null); setRecipient(''); setQuantity(1); },
        });
    };

    const adjustQty = useCallback((delta: number) => {
        setQuantity(q => Math.min(30, Math.max(1, q + delta)));
    }, []);

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Result Checker</h2>}>
            <Head title="Result Checker" />
            <div className="py-6 max-w-6xl mx-auto px-4 space-y-8">

                {/* Flash messages */}
                {(flash as any)?.success && (
                    <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded">{(flash as any).success}</div>
                )}
                {errors && Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded space-y-1">
                        {Object.values(errors as Record<string, string>).map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                )}

                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                    <h1 className="text-2xl font-bold mb-1">Result Checker Vouchers</h1>
                    <p className="text-indigo-100 text-sm">Purchase WASSCE & BECE result checker cards instantly</p>
                    <div className="flex gap-6 mt-4 text-sm">
                        <div><span className="text-2xl font-bold">{purchases.total}</span><br /><span className="text-indigo-200">Total Purchases</span></div>
                        <div><span className="text-2xl font-bold">{products.length}</span><br /><span className="text-indigo-200">Available Types</span></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Steps */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Step 1: Product Selection */}
                        <div>
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Step 1 — Select a Product</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {products.map(p => {
                                    const inStock = p.available_vouchers_count > 0;
                                    const isSelected = selectedProduct?.id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            disabled={!inStock}
                                            onClick={() => { setSelectedProduct(p); setQuantity(1); }}
                                            className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                                                isSelected ? 'border-indigo-500 shadow-md' : 'border-gray-200 dark:border-gray-700'
                                            } ${!inStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300 cursor-pointer'}`}
                                        >
                                            {isSelected && (
                                                <span className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5">
                                                    <Check className="h-3 w-3" />
                                                </span>
                                            )}
                                            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${typeGradient(p.checker_type)} text-white mb-3`}>
                                                {typeIcon(p.checker_type)}
                                            </div>
                                            <p className="font-semibold">{p.display_name ?? p.name}</p>
                                            <p className="text-xs text-muted-foreground">{p.checker_type}</p>
                                            <p className="text-lg font-bold mt-1">₵{Number(p.price).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ card</span></p>
                                            <p className={`text-xs mt-1 font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                                                {inStock ? `${p.available_vouchers_count} in stock` : 'Out of stock'}
                                            </p>
                                        </button>
                                    );
                                })}
                                {products.length === 0 && (
                                    <p className="text-muted-foreground text-sm col-span-2">No products available at the moment.</p>
                                )}
                            </div>
                        </div>

                        {/* Step 2: Purchase Form */}
                        {selectedProduct && (
                            <div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Step 2 — Enter Details</h3>
                                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Recipient Phone Number</label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={recipient}
                                            onChange={e => setRecipient(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="0XXXXXXXXX"
                                            required
                                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Quantity</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => adjustQty(-1)} className="w-8 h-8 rounded border flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                                            <input
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={quantity}
                                                onChange={e => setQuantity(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-16 text-center border rounded-md py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <button type="button" onClick={() => adjustQty(1)} className="w-8 h-8 rounded border flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                                        </div>
                                    </div>
                                    {/* Summary strip */}
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                                        <span>{quantity} × ₵{Number(selectedProduct.price).toFixed(2)}</span>
                                        <span className="text-muted-foreground">=</span>
                                        <span className="font-bold text-indigo-700 dark:text-indigo-300">₵{total.toFixed(2)}</span>
                                    </div>
                                    <Button type="submit" disabled={processing} className="w-full">
                                        {processing ? 'Processing...' : `Pay ₵${total.toFixed(2)}`}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Right: Sidebar */}
                    <div className="space-y-4">
                        {/* Order Summary */}
                        <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl border p-5">
                            <h3 className="font-semibold mb-3">Order Summary</h3>
                            {selectedProduct ? (
                                <div className="space-y-2 text-sm">
                                    <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${typeGradient(selectedProduct.checker_type)} text-white mb-2`}>
                                        {typeIcon(selectedProduct.checker_type)}
                                    </div>
                                    <p className="font-medium">{selectedProduct.display_name ?? selectedProduct.name}</p>
                                    <p className="text-muted-foreground">{selectedProduct.checker_type}</p>
                                    <div className="border-t pt-2 mt-2 space-y-1">
                                        <div className="flex justify-between"><span>Unit Price</span><span>₵{Number(selectedProduct.price).toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Quantity</span><span>{quantity}</span></div>
                                        <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>Total</span><span>₵{total.toFixed(2)}</span></div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Select a product to see summary.</p>
                            )}
                        </div>

                        {/* How it works */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm">How it works</h4>
                            <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                                <li>Select a result checker product</li>
                                <li>Enter recipient phone & quantity</li>
                                <li>Wallet balance is deducted instantly</li>
                                <li>Cards are sent via SMS to the recipient</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Purchase History */}
                <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Purchase History</h3>
                    {purchases.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No purchases yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {purchases.data.map(p => (
                                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
                                    <div className="flex items-center gap-4 p-4">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${typeGradient(p.checker_type)} text-white flex-shrink-0`}>
                                            {typeIcon(p.checker_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{p.display_name ?? p.checker_type}</p>
                                            <p className="text-xs text-muted-foreground">To: {p.recipient} · Qty: {p.quantity} · {new Date(p.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-sm">₵{Number(p.total_amount).toFixed(2)}</p>
                                            <Badge className={p.status === 'COMPLETED' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
                                                {p.status}
                                            </Badge>
                                        </div>
                                        <button
                                            className="text-xs text-blue-600 hover:underline flex-shrink-0"
                                            onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)}
                                        >
                                            {expandedPurchase === p.id ? '▲ Hide' : '▼ Cards'}
                                        </button>
                                    </div>
                                    {expandedPurchase === p.id && (
                                        <div className="border-t bg-gray-50 dark:bg-gray-900/30 p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {p.checkers?.map((c, i) => (
                                                    <div key={i} className="bg-white dark:bg-gray-800 border rounded-lg p-3 text-xs space-y-1">
                                                        <p><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{c.serial}</span></p>
                                                        <p className="flex items-center">
                                                            <span className="text-muted-foreground mr-1">PIN:</span>
                                                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{c.pin}</span>
                                                            <CopyButton text={c.pin} />
                                                        </p>
                                                        <p><span className="text-muted-foreground">Code:</span> <span className="font-mono">{c.code}</span></p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {purchases.last_page > 1 && (
                        <div className="flex gap-1 mt-4 flex-wrap">
                            {purchases.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    className={`px-3 py-1 text-sm rounded border ${link.active ? 'bg-indigo-600 text-white' : 'hover:bg-muted'} disabled:opacity-40`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
