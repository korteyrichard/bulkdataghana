import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, usePage, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function CreateShop({ auth }: PageProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        whatsapp: '',
        logo: null as File | null,
        primary_color: '#0891b2',
        secondary_color: '#1d4ed8',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('shop.store'), { forceFormData: true });
    };

    return (
        <DashboardLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Create Shop</h2>}>
            <Head title="Create Shop" />
            <div className="max-w-xl mx-auto p-4">
                {/* Live preview */}
                <div
                    className="rounded-xl p-5 text-white flex items-center gap-4 mb-4 transition-all duration-300"
                    style={{ background: `linear-gradient(to right, ${data.primary_color}, ${data.secondary_color})` }}
                >
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                        {data.name.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-bold text-lg">{data.name || 'Shop Name'}</p>
                        <p className="text-white/80 text-sm">{data.description || 'Shop description'}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name *</label>
                            <input value={data.name} onChange={e => setData('name', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
                            <input value={data.whatsapp} onChange={e => setData('whatsapp', e.target.value)}
                                placeholder="e.g. 0241234567"
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shop Colors</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1.5">Primary Color</p>
                                    <div className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-600">
                                        <input type="color" value={data.primary_color}
                                            onChange={e => setData('primary_color', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{data.primary_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1.5">Secondary Color</p>
                                    <div className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-600">
                                        <input type="color" value={data.secondary_color}
                                            onChange={e => setData('secondary_color', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{data.secondary_color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Logo</label>
                            <input type="file" accept="image/*" onChange={e => setData('logo', e.target.files?.[0] ?? null)}
                                className="w-full text-sm" />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create Shop'}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
