<?php
// =============================================================================
// api/admin/sync_existing_users.php — Sincronización Whitelist ↔ Usuarios (Admin)
// =============================================================================
// Método  : POST JSON
// Payload : { "requesterId": int }
//
// Lógica de negocio:
//   1. Cargar todos los registros de whitelist_phones que tengan group_join_date.
//   2. Cargar todos los usuarios de users (con su phone).
//   3. Comparar usando los últimos 10 dígitos de cada teléfono.
//   4. Por cada match:
//        a. Actualiza whitelist_phones.is_used = 1.
//        b. Actualiza (UPSERT) profiles.group_join_date con el valor de la whitelist.
//   5. Devuelve { status, synced, skipped_no_date, skipped_no_match, errors }
//
// Solo accesible para role = 'admin'.
// PHP 7.4 estricto — sin str_contains, sin sintaxis PHP 8+.
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

try {
    $body        = (string) file_get_contents('php://input');
    $input       = json_decode($body, true);
    $requesterId = isset($input['requesterId']) ? (int) $input['requesterId'] : 0;

    if ($requesterId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar admin
    $stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso restringido a administradores.']);
        exit;
    }

    // ── 1. Cargar whitelist completa ──────────────────────────────────────────
    $stmtWl  = $pdo->query('SELECT phone, group_join_date FROM whitelist_phones');
    $wlRows  = $stmtWl !== false ? $stmtWl->fetchAll(PDO::FETCH_ASSOC) : [];

    // ── 2. Cargar todos los usuarios con teléfono ─────────────────────────────
    $stmtUsers = $pdo->query('SELECT id, phone FROM users WHERE phone IS NOT NULL AND phone <> \'\'');
    $userRows  = $stmtUsers !== false ? $stmtUsers->fetchAll(PDO::FETCH_ASSOC) : [];

    // Construir índice de usuarios: últimos10dígitos → user_id
    // Si hay colisiones de últimos 10 dígitos, el último en el array gana
    // (en la práctica no debería haber colisiones en una comunidad de ≤ 250)
    $userIndex = [];
    foreach ($userRows as $u) {
        $digits = (string) preg_replace('/[^0-9]/', '', (string) $u['phone']);
        if (strlen($digits) >= 10) {
            $tail = substr($digits, -10);
            $userIndex[$tail] = (int) $u['id'];
        }
    }

    // ── 3 & 4. Iterar whitelist y sincronizar ─────────────────────────────────
    $stmtMarkUsed = $pdo->prepare(
        'UPDATE whitelist_phones SET is_used = 1 WHERE phone = :phone'
    );

    $stmtUpsertProfile = $pdo->prepare(
        'INSERT INTO profiles (user_id, group_join_date)
         VALUES (:user_id, :gjd)
         ON DUPLICATE KEY UPDATE group_join_date = VALUES(group_join_date)'
    );

    $synced          = 0;
    $skippedNoDate   = 0;
    $skippedNoMatch  = 0;
    $errors          = 0;

    foreach ($wlRows as $wl) {
        $wlPhone = (string) preg_replace('/[^0-9]/', '', (string) $wl['phone']);
        $gjd     = isset($wl['group_join_date']) ? trim((string) $wl['group_join_date']) : '';

        // Si la whitelist no tiene fecha, no hay nada que sincronizar a profiles
        if ($gjd === '' || $gjd === null) {
            $skippedNoDate++;
            continue;
        }

        if (strlen($wlPhone) < 10) {
            $skippedNoMatch++;
            continue;
        }

        $tail = substr($wlPhone, -10);

        if (!isset($userIndex[$tail])) {
            $skippedNoMatch++;
            continue;
        }

        $userId = $userIndex[$tail];

        try {
            // Marcar como utilizado en whitelist
            $stmtMarkUsed->execute([':phone' => (string) $wl['phone']]);

            // UPSERT en profiles
            $stmtUpsertProfile->execute([
                ':user_id' => $userId,
                ':gjd'     => $gjd,
            ]);

            $synced++;
        } catch (\Throwable $rowErr) {
            $errors++;
        }
    }

    echo json_encode([
        'status'  => 'success',
        'synced'          => $synced,
        'skippedNoDate'   => $skippedNoDate,
        'skippedNoMatch'  => $skippedNoMatch,
        'errors'          => $errors,
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno durante la sincronización.',
        'debug'   => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
