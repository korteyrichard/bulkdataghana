<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'bulkclix' => [
        'api_key' => env('BULKCLIX_API_KEY'),
        'sender_id' => env('BULKCLIX_SENDER_ID'),
    ],

    'moolre' => [
        'api_key' => env('MOOLRE_API_KEY'),
    ],

    'etopup' => [
        'api_key' => env('ETOPUP_API_KEY'),
        'api_secret' => env('ETOPUP_API_SECRET'),
    ],

    'unibundlegh' => [
        'base_url'       => env('UNIBUNDLEGH_BASE_URL', 'https://unibundlegh.com/api/v1'),
        'signature_base' => env('UNIBUNDLEGH_SIGNATURE_BASE', '/unibundlegh-api/v1'),
        'api_key'        => env('UNIBUNDLEGH_API_KEY'),
        'api_secret'     => env('UNIBUNDLEGH_API_SECRET'),
    ],

];
