import { Head, usePage, Link } from '@inertiajs/react';

interface OrderData {
    id: number | null;
    total: number;
    beneficiary_number: string | null;
    network: string | null;
    product_name: string;
    size: string;
    is_result_checker?: boolean;
}

interface OrderSuccessProps {
    order: { reference: string; total_amount: number; items_count: number } | OrderData | null;
    shop_slug: string;
}

export default function OrderSuccess() {
    const { order, shop_slug } = usePage<OrderSuccessProps>().props;

    const isRc = order && 'is_result_checker' in order && order.is_result_checker;
    const rcOrder = isRc ? order as OrderData : null;
    const legacyOrder = !isRc ? order as { reference: string; total_amount: number; items_count: number } | null : null;

    return (
        <>
            <Head title="Order Confirmed" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>

                    {isRc && rcOrder ? (
                        <>
                            <p className="text-gray-500 mb-6">
                                Your result checker card(s) have been sent to <span className="font-semibold text-gray-700">{rcOrder.beneficiary_number}</span> via SMS.
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Product</span>
                                    <span className="font-medium">{rcOrder.product_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Quantity</span>
                                    <span className="font-medium">{rcOrder.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Sent To</span>
                                    <span className="font-medium">{rcOrder.beneficiary_number}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Amount Paid</span>
                                    <span className="font-bold text-green-600">GHS {Number(rcOrder.total).toFixed(2)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-500 mb-6">Your order has been received and is being processed.</p>
                            {legacyOrder && (
                                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Reference</span>
                                        <span className="font-mono text-xs text-gray-700">{legacyOrder.reference.slice(0, 24)}...</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Items</span>
                                        <span className="font-medium">{legacyOrder.items_count}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Amount Paid</span>
                                        <span className="font-bold text-green-600">GHS {Number(legacyOrder.total_amount).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <Link href={route('shop.storefront', shop_slug)}
                        className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        Back to Shop
                    </Link>
                </div>
            </div>
        </>
    );
}
