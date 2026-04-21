<?php
// =============================================================================
// api/account/delete_account.php — Eliminación permanente de cuenta
// =============================================================================
// Método : POST (JSON body)
// Body   : { "userId": int }
// Proceso: 1. Guarda nombre en user_departures_log (action='deleted', acted_by='self').
//          2. Borrado en cascada manual:
//             social_networks → profile_photos (+ unlink físico) → profiles →
//             invitation_password_log → daily_scriptures → users
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

    // ── Capturar rutas físicas de fotos (lectura previa, fuera de tx) ─────────
    $stmtPhotos = $pdo->prepare('SELECT photo_url FROM profile_photos WHERE user_id = :id');
    $stmtPhotos->execute([':id' => $userId]);
    $photoPaths = [];
    foreach ($stmtPhotos->fetchAll(PDO::FETCH_COLUMN) as $url) {
        $physicalPath = __DIR__ . '/../..' . (string) $url;
        if (file_exists($physicalPath)) {
            $photoPaths[] = $physicalPath;
        }
    }

    // ── Transacción con bloqueo de fila (FOR UPDATE) ──────────────────────────
    // SELECT FOR UPDATE serializa requests concurrentes: el segundo bloquea aquí
    // hasta que el primero haga COMMIT (y borre el usuario), luego recibe null
    // y sale limpiamente como 404. Esto hace imposible duplicados en el log.
    $pdo->beginTransaction();

    $stmtLock = $pdo->prepare(
        'SELECT id, full_name FROM users WHERE id = :id LIMIT 1 FOR UPDATE'
    );
    $stmtLock->execute([':id' => $userId]);
    $user = $stmtLock->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.']);
        exit;
    }

    $userName = (string) $user['full_name'];

    // ── Auditoría DENTRO de la transacción ────────────────────────────────────
    $stmtLog = $pdo->prepare(
        'INSERT INTO user_departures_log (user_name, action, acted_by) VALUES (:user_name, :action, :acted_by)'
    );
    $stmtLog->execute([':user_name' => $userName, ':action' => 'deleted', ':acted_by' => 'self']);

    // ── Borrado en cascada manual ─────────────────────────────────────────────

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
