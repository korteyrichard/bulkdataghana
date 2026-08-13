import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { PageProps } from '@/types';

interface BecomeAnAgentProps extends PageProps {
    agent_registration_fee: number;
}

export default function BecomeAnAgent() {
    const { agent_registration_fee } = usePage<BecomeAnAgentProps>().props;
    const { post, processing, errors } = useForm({});

    const handleBecomeAgent = (e: React.FormEvent) => {
        e.preventDefault();
        post('/become_an_agent');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <Head title="Become an Agent" />
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex flex-col items-center mb-8">
                        <img src='/bulkdata.jpg' alt="Logo" className="w-40 h-20 mb-6 rounded-lg" />
                        <h1 className="text-2xl font-bold text-gray-800 text-center">
                            Become an Agent
                        </h1>
                        <p className="text-gray-600 text-sm text-center mt-2">
                            Unlock lower data prices with agent access
                        </p>
                    </div>
                    <form onSubmit={handleBecomeAgent} className="space-y-4">
                        <input type="hidden" name="amount" value="100" />
                        <Button 
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-md font-medium transition-colors" 
                            disabled={processing}
                        >
                            {processing ? 'Processing...' : `Pay GHS ${agent_registration_fee.toFixed(2)} to Become An Agent`}
                        </Button>
                        {errors.message && <div className="text-red-500 text-xs mt-1">{errors.message}</div>}
                    </form>
                    <div className="mt-6 text-center">
                        <div className="text-sm">
                            <span className="mx-2 text-gray-400">•</span>
                            <Link href="/" className="text-blue-600 hover:underline">Home</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
