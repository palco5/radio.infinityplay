<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$host = 'mysql462.loopia.se';
$db = 'infinityplay_rs_db_1';

$users = [
    'infinity@i77893',
    'infinity',
    'adminip@i77893',
    'adminip',
    'infinityplay.rs',
    'infinityplay'
];

$pass = 'Radio12345';

echo "<h1>Database Connection Test (Brute Users)</h1>";
echo "<p>Host: $host</p>";
echo "<p>Pass: $pass</p>";
echo "<hr>";

foreach ($users as $user) {
    echo "<p>Trying User: <b>$user</b> ... ";

    try {
        $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ];

        $pdo = new PDO($dsn, $user, $pass, $options);

        echo "<span style='color: green; font-weight: bold; font-size: 1.2em'>✅ SUCCESS!</span></p>";
        echo "<div style='background: #dff0d8; padding: 10px; border: 1px solid #3c763d; margin: 10px 0;'>";
        echo "<h3>FOUND WORKING USER:</h3>";
        echo "<p>User: <b>$user</b></p>";
        echo "</div>";

        exit;

    } catch (PDOException $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Access denied') !== false) {
            echo "<span style='color: red'>Access Denied</span>";
        } else {
            echo "<span style='color: orange'>Error: $msg</span>";
        }
        echo "</p>";
    }
}

echo "<h3>Test Finished.</h3>";
?>