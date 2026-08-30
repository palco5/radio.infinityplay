<?php
/**
 * Javni Polar config za frontend. NE izlaže tajne (access token / webhook secret).
 * `configured` govori da li checkout može da radi (ima access token + bar jedan
 * product ID) — frontend na osnovu toga pokazuje pravu formu ili maketu.
 */

require_once __DIR__ . '/config.php';

setCORSHeaders();

$hasProducts = POLAR_PRODUCT_BASIC !== '' || POLAR_PRODUCT_BRANDED !== '' || POLAR_PRODUCT_HOST !== ''
    || POLAR_PRODUCT_BASIC_ANNUAL !== '' || POLAR_PRODUCT_BRANDED_ANNUAL !== '' || POLAR_PRODUCT_HOST_ANNUAL !== '';

sendJSON([
    'provider'    => MOR_PROVIDER_NAME,
    'environment' => POLAR_ENVIRONMENT,
    'configured'  => (POLAR_ACCESS_TOKEN !== '' && $hasProducts),
]);
