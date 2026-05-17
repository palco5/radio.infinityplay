<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$configs = [
    [
        'host' => 'mysql462.loopia.se',
        'user' => 'adminip@i77893',
        'pass' => 'Racivaci5!'
    ],
    [
        'host' => 'mysql462.loopia.se',
        'user' => 'adminip',
        'pass' => 'Racivaci5!'
    ],
    // Try without password just in case (unlikely)
    [
        'host' => 'mysql462.loopia.se',
        'user' => 'adminip@i77893',
        'pass' => ''
    ]
];

$db = 'infinityplay_rs_db_1';
$charset = 'utf8mb4';

echo "<h1>Database Connection Test (Multiple Configs)</h1>";

foreach ($configs as $i => $conf) {
    echo "<h3>Attempt " . ($i + 1) . "</h3>";
    echo "<p>Host: {$conf['host']}, User: {$conf['user']}</p>";

    try {
        $dsn = "mysql:host={$conf['host']};dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, $conf['user'], $conf['pass'], $options);
        echo "<h2 style='color: green'>✅ Connection Successful!</h2>";

        // Test query
        $stmt = $pdo->query("SELECT VERSION()");
        $version = $stmt->fetchColumn();
        echo "<p>MySQL Version: $version</p>";
        break; // Stop if successful

    } catch (PDOException $e) {
        echo "<p style='color: red'>❌ Failed: " . $e->getMessage() . "</p>";
    }
    echo "<hr>";
}
?>