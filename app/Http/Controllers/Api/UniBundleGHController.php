<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\UniBundleGHService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UniBundleGHController extends Controller
{
    public function __construct(private UniBundleGHService $service) {}

    /**
     * GET /api/v1/unibundlegh/beneficiaries/check?beneficiary_number=...
     * Pre-check a single MTN beneficiary number.
     */
    public function checkBeneficiary(Request $request)
    {
        $request->validate([
            'beneficiary_number' => 'required|string',
        ]);

        $result = $this->service->checkBeneficiary($request->beneficiary_number);

        return response()->json($result['body'], $result['status']);
    }

    /**
     * POST /api/v1/unibundlegh/orders/create
     * Pre-checks all MTN numbers, then submits the bulk order.
     *
     * Body: { "orders": [{ "_beneficiary_number", "network", "_data_size" }] }
     */
    public function createBulkOrder(Request $request)
    {
        $request->validate([
            'orders'                         => 'required|array|min:1|max:300',
            'orders.*.network'               => 'required|string',
            'orders.*._beneficiary_number'   => 'required|string',
            'orders.*._data_size'            => 'required|integer|min:1',
        ]);

        $orders  = $request->input('orders');
        $skipped = [];
        $valid   = [];

        foreach ($orders as $index => $order) {
            if (strtolower($order['network']) === 'mtn') {
                $check = $this->service->checkBeneficiary($order['_beneficiary_number']);

                if (!$check['ok']) {
                    $skipped[] = [
                        'index'              => $index,
                        '_beneficiary_number' => $order['_beneficiary_number'],
                        'reason'             => $check['body']['message'] ?? 'Beneficiary check failed',
                    ];
                    Log::warning('UniBundleGH: beneficiary rejected at pre-check', [
                        'number' => $order['_beneficiary_number'],
                        'reason' => $check['body'],
                    ]);
                    continue;
                }
            }

            $valid[] = $order;
        }

        if (empty($valid)) {
            return response()->json([
                'success' => false,
                'message' => 'All beneficiaries failed pre-check validation.',
                'skipped' => $skipped,
            ], 422);
        }

        $result = $this->service->createBulkOrder($valid);

        $responseBody = $result['body'] ?? [];
        $responseBody['pre_check_skipped'] = $skipped;

        return response()->json($responseBody, $result['status']);
    }
}
