<?php
/**
 * Minimalni test harness — bez ijedne zavisnosti (nema composer/PHPUnit-a jer
 * ih Loopia shared hosting nema). Ispisuje ✓/✗ i vraća exit kod 1 na neuspeh.
 */

$GLOBALS['__tests'] = ['pass' => 0, 'fail' => 0, 'fails' => []];

function test(string $name, callable $fn): void
{
    try {
        $fn();
        $GLOBALS['__tests']['pass']++;
        fwrite(STDOUT, "  \033[32m✓\033[0m {$name}\n");
    } catch (\Throwable $e) {
        $GLOBALS['__tests']['fail']++;
        $GLOBALS['__tests']['fails'][] = $name;
        fwrite(STDOUT, "  \033[31m✗\033[0m {$name}\n      → " . $e->getMessage() . "\n");
    }
}

function assertTrue($cond, string $msg = 'očekivano true'): void
{
    if ($cond !== true) throw new \Exception($msg);
}

function assertFalse($cond, string $msg = 'očekivano false'): void
{
    if ($cond !== false) throw new \Exception($msg);
}

function assertEquals($expected, $actual, string $msg = ''): void
{
    if ($expected !== $actual) {
        throw new \Exception(($msg ? $msg . ': ' : '') .
            'očekivano ' . var_export($expected, true) . ', dobijeno ' . var_export($actual, true));
    }
}

function assertThrows(string $exClass, callable $fn): void
{
    try {
        $fn();
    } catch (\Throwable $e) {
        if ($e instanceof $exClass) return;
        throw new \Exception("očekivan izuzetak {$exClass}, dobijen " . get_class($e) . ': ' . $e->getMessage());
    }
    throw new \Exception("očekivan izuzetak {$exClass}, ali ništa nije bačeno");
}

function summary(): void
{
    $t = $GLOBALS['__tests'];
    fwrite(STDOUT, "\n" . str_repeat('─', 48) . "\n");
    if ($t['fail'] === 0) {
        fwrite(STDOUT, "\033[32mSVI PROŠLI\033[0m: {$t['pass']} test(ova)\n");
        exit(0);
    }
    fwrite(STDOUT, "\033[31mNEUSPEH\033[0m: {$t['fail']} od " . ($t['pass'] + $t['fail']) . " — " . implode(', ', $t['fails']) . "\n");
    exit(1);
}
