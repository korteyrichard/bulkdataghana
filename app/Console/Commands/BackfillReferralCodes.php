<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillReferralCodes extends Command
{
    protected $signature = 'shop:backfill-referral-codes';
    protected $description = 'Generate referral codes for users who do not have one';

    public function handle(): void
    {
        $count = 0;
        User::whereNull('referral_code')->each(function (User $user) use (&$count) {
            $user->update(['referral_code' => strtoupper(Str::random(8))]);
            $count++;
        });
        $this->info("Backfilled {$count} referral codes.");
    }
}
