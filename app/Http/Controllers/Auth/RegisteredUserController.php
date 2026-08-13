<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ReferralLog;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/register', [
            'referral_code' => $request->query('ref'),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'phone'         => 'nullable|string|max:20',
            'email'         => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password'      => ['required', 'confirmed', Rules\Password::defaults()],
            'referral_code' => 'nullable|string|max:12',
        ]);

        $referredBy = null;
        if ($request->filled('referral_code')) {
            $referrer = User::where('referral_code', $request->referral_code)->first();
            $referredBy = $referrer?->id;
        }

        $user = User::create([
            'name'          => $request->name,
            'business_name' => $request->business_name,
            'phone'         => $request->phone,
            'email'         => $request->email,
            'password'      => Hash::make($request->password),
            'referred_by'   => $referredBy,
        ]);

        event(new Registered($user));

        // Create referral log entry on registration
        if ($referredBy) {
            ReferralLog::create([
                'referrer_id'       => $referredBy,
                'referred_id'       => $user->id,
                'status'            => 'registered',
                'commission_earned' => 0,
            ]);
        }

        Auth::login($user);

        return to_route('dashboard');
    }
}
