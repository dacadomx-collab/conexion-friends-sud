<?php
// =============================================================================
// api/account/delete_account.php — Eliminación permanente de cuenta
// =============================================================================
// Método : POST (JSON body)
// Body   : { "userId": int }
// Proceso: 1. Guarda nombre en user_departures_log (action='deleted').
//          2. Borrado en cascada manual:
//             social_networks → profile_photos (+ unlink físico) → profiles →
//             invitation_password_log → whitelist_audit_log → daily_scriptures →
//             users
// Returns: { "status": "success", "message": string }
//          { "status": "error",   "message": string }
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

try {
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Body JSON inválido.']);
        exit;
    }

    $userId = isset($body['userId']) ? (int) $body['userId'] : 0;
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que el usuario existe ───────────────────────────────────────
    $stmtUser = $pdo->prepare('SELECT full_name FROM users WHERE id = :id LIMIT 1');
    $stmtUser->execute([':id' => $userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.']);
        exit;
    }

    $userName = (string) $user['full_name'];

    // ── Capturar rutas físicas de fotos ANTES de la transacción ──────────────
    $stmtPhotos = $pdo->prepare('SELECT photo_url FROM profile_photos WHERE user_id = :id');
    $stmtPhotos->execute([':id' => $userId]);
    $photoPaths = [];
    foreach ($stmtPhotos->fetchAll(PDO::FETCH_COLUMN) as $url) {
        $physicalPath = __DIR__ . '/../..' . (string) $url;
        if (file_exists($physicalPath)) {
            $photoPaths[] = $physicalPath;
        }
    }

    // ── Auditoría: guardar el nombre ANTES de borrar ──────────────────────────
    $stmtLog = $pdo->prepare(
        'INSERT INTO user_departures_log (user_name, action) VALUES (:user_name, :action)'
    );
    $stmtLog->execute([':user_name' => $userName, ':action' => 'deleted']);

    // ── Borrado en cascada manual (transacción atómica) ───────────────────────
    $pdo->beginTransaction();

    // 1. Redes sociales
    $pdo->prepare('DELETE FROM social_networks WHERE user_id = :id')
        ->execute([':id' => $userId]);

    // 2. Fotos (registros BD; archivos físicos se borran post-commit)
    $pdo->prepare('DELETE FROM profile_photos WHERE user_id = :id')
        ->execute([':id' => $userId]);

    // 3. Perfil
    $pdo->prepare('DELETE FROM profiles WHERE user_id = :id')
        ->execute([':id' => $userId]);

    // 4. Escrituras (también tiene CASCADE, pero siendo explícitos)
    $pdo->prepare('DELETE FROM daily_scriptures WHERE user_id = :id')
        ->execute([':id' => $userId]);

    // 5. Tablas admin con FK → users.id (por si el usuario era admin)
    $pdo->prepare('DELETE FROM invitation_password_log WHERE admin_id = :id')
        ->execute([':id' => $userId]);

    $pdo->prepare('DELETE FROM whitelist_audit_log WHERE admin_id = :id')
        ->execute([':id' => $userId]);

    // 6. Usuario (disparador final)
    $pdo->prepare('DELETE FROM users WHERE id = :id')
        ->execute([':id' => $userId]);

    $pdo->commit();

    // ── Limpiar archivos físicos post-commit ──────────────────────────────────
    foreach ($photoPaths as $path) {
        try {
            if (file_exists($path)) {
                unlink($path);
            }
        } catch (\Throwable $ignored) {
            // No crítico: el commit fue exitoso
        }
    }

    echo json_encode([
        'status'  => 'success',
        'message' => 'Cuenta eliminada correctamente.',
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => 'Error al eliminar la cuenta. Intenta de nuevo.']);
}
