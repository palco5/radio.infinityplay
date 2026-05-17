<?php
require_once 'config.php';

setCORSHeaders();

sendJSON([
    'status' => 'OK',
    'message' => 'InfinityPlay Radio API is running!',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>