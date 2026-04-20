<?php
// =============================================================================
// api/admin/sync_existing_users.php — Sincronización Whitelist ↔ Usuarios (Admin)
// =============================================================================
// Método  : POST JSON
// Payload : { "requesterId": int }
//
// Lógica de negocio:
//   1. Cargar todos los registros de whitelist_phones.
//   2. Cargar todos los usuarios de users (con su phone).
//   3. Comparar usando los últimos 10 dígitos de cada teléfono.
//   4. Por cada match:
//        a. Actualiza whitelist_phones.is_used = 1.
//        b. UPSERT profiles.group_join_date con el valor de la whitelist.
//   5. Devuelve { status, synced, skippedNoDate, skippedNoMatch, errors }
//
// Solo accesible para role = 'admin'.
// PHP 7.4 estricto — sin str_contains, sin fn(), sin match, sin union types.
// =============================================================================

declare(strict_types=1);

// ── Safety net: captura errores fatales que escapan del try/catch ─────────────
// Garantiza que el cliente siempre reciba JSON, nunca HTML de PHP.
register_shutdown_function(static function (): void {
    $err = error_get_last();
    if ($err !== null && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'status'  => 'error',
            'message' => 'Error fatal en el servidor.',
            'debug'   => $err['message'] . ' en ' . $err['file'] . ':' . $err['line'],
        ]);
    }
});

// Convierte errores no-fatales en ErrorException (capturables por try/catch)
set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// ── Todo el script queda dentro del try para garantizar respuesta JSON ────────
try {

    require_once __DIR__ . '/../conexion.php';

    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
        exit;
    }

    // Leer y validar body JSON de forma defensiva
    $body  = (string) file_get_contents('php://input');
    $input = json_decode($body, true);

    // Asegurarse de que $input sea un array antes de acceder a sus claves
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Payload JSON inválido o vacío.']);
        exit;
    }

    $requesterId = isset($input['requesterId']) ? (int) $input['requesterId'] : 0;
    if ($requesterId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar rol admin
    $stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso restringido a administradores.']);
        exit;
    }

    // ── 1. Cargar whitelist completa ──────────────────────────────────────────
    $stmtWl = $pdo->query('SELECT phone, group_join_date FROM whitelist_phones');
    $wlRows = ($stmtWl !== false) ? $stmtWl->fetchAll(PDO::FETCH_ASSOC) : [];

    // ── 2. Cargar usuarios con teléfono no vacío ──────────────────────────────
    $stmtUsers = $pdo->query(
        "SELECT id, phone FROM users WHERE phone IS NOT NULL AND phone <> ''"
    );
    $userRows = ($stmtUsers !== false) ? $stmtUsers->fetchAll(PDO::FETCH_ASSOC) : [];

    // ── 3. Construir índice: últimos 10 dígitos → user_id ─────────────────────
    $userIndex = [];
    foreach ($userRows as $u) {
        $digits = (string) preg_replace('/[^0-9]/', '', (string) $u['phone']);
        if (strlen($digits) >= 10) {
            $tail             = substr($digits, -10);
            $userIndex[$tail] = (int) $u['id'];
        }
    }

    // ── 4. Preparar statements de actualización ───────────────────────────────
    $stmtMarkUsed = $pdo->prepare(
        'UPDATE whitelist_phones SET is_used = 1 WHERE phone = :phone'
    );

    $stmtUpsertProfile = $pdo->prepare(
        'INSERT INTO profiles (user_id, group_join_date)
         VALUES (:user_id, :gjd)
         ON DUPLICATE KEY UPDATE group_join_date = VALUES(group_join_date)'
    );

    // ── 5. Iterar whitelist y sincronizar ─────────────────────────────────────
    $synced         = 0;
    $skippedNoDate  = 0;
    $skippedNoMatch = 0;
    $errors         = 0;

    foreach ($wlRows as $wl) {
        // Sanitizar teléfono de la whitelist a solo dígitos
        $wlPhone = (string) preg_replace('/[^0-9]/', '', (string) $wl['phone']);

        // Obtener y limpiar la fecha de ingreso almacenada
        $gjd = (isset($wl['group_join_date']) && $wl['group_join_date'] !== null)
            ? trim((string) $wl['group_join_date'])
            : '';

        // Sin fecha → nada que sincronizar a profiles
        if ($gjd === '') {
            $skippedNoDate++;
            continue;
        }

        // Teléfono demasiado corto para extraer 10 dígitos
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
            $stmtMarkUsed->execute([':phone' => (string) $wl['phone']]);
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
        'status'         => 'success',
        'synced'         => $synced,
        'skippedNoDate'  => $skippedNoDate,
        'skippedNoMatch' => $skippedNoMatch,
        'errors'         => $errors,
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno durante la sincronización.',
        'debug'   => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
