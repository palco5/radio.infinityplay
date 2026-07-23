<?php
require_once 'config.php';

setCORSHeaders();

// Public config for Paddle.js — the client-side token is designed to be
// exposed in the browser (equivalent to a Stripe publishable key).
sendJSON([
    'environment' => PADDLE_ENVIRONMENT,
    'clientToken' => PADDLE_CLIENT_TOKEN,
    'prices' => [
        'basic'   => PADDLE_PRICE_BASIC,
        'branded' => PADDLE_PRICE_BRANDED,
        'host'    => PADDLE_PRICE_HOST,
    ],
]);
