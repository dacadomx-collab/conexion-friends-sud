<?php
// =============================================================================
// api/admin/delete_user_admin.php — Eliminación profunda de cuenta por Admin
// =============================================================================
// Método : POST (JSON body)
// Body   : { "requesterId": int, "targetUserId": int }
// Proceso: 1. Valida que requesterId sea admin.
//          2. Valida que el admin no se auto-elimine.
//          3. Captura rutas físicas de fotos (previo a la transacción).
//          4. TRANSACCIÓN ATÓMICA con FOR UPDATE:
//             a. Loguea en user_departures_log (action='deleted', acted_by='admin')
//             b. social_networks → profile_photos (BD) → profiles →
//                daily_scriptures → invitation_password_log → users
//          5. Post-commit: unlink() físico de archivos de fotos.
// Returns: { "status": "success"|"error", "message": string }
// CODEX REF : 03_CONTRATOS_API_Y_LOGICA.md
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

    $requesterId  = isset($body['requesterId'])  ? (int) $body['requesterId']  : 0;
    $targetUserId = isset($body['targetUserId']) ? (int) $body['targetUserId'] : 0;

    if ($requesterId <= 0 || $targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId y targetUserId son obligatorios.']);
        exit;
    }

    if ($requesterId === $targetUserId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No puedes eliminar tu propia cuenta desde el panel de admin.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar que el solicitante sea admin y obtener su nombre
    $stmtAdmin = $pdo->prepare('SELECT id, full_name, role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Se requiere rol de administrador.']);
        exit;
    }

    // Capturar rutas físicas de fotos ANTES de la transacción
    $stmtPhotos = $pdo->prepare('SELECT photo_url FROM profile_photos WHERE user_id = :id');
    $stmtPhotos->execute([':id' => $targetUserId]);
    $photoPaths = [];
    foreach ($stmtPhotos->fetchAll(PDO::FETCH_COLUMN) as $url) {
        $physicalPath = __DIR__ . '/../..' . (string) $url;
        if (file_exists($physicalPath)) {
            $photoPaths[] = $physicalPath;
        }
    }

    // TRANSACCIÓN ATÓMICA con bloqueo de fila (evita borrados concurrentes)
    $pdo->beginTransaction();

    $stmtLock = $pdo->prepare('SELECT id, full_name FROM users WHERE id = :id LIMIT 1 FOR UPDATE');
    $stmtLock->execute([':id' => $targetUserId]);
    $targetUser = $stmtLock->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.']);
        exit;
    }

    $userName = (string) $targetUser['full_name'];

    // Auditoría: registrar quién eliminó y a quién
    $stmtLog = $pdo->prepare(
        'INSERT INTO user_departures_log (user_name, action, acted_by, admin_name)
         VALUES (:user_name, :action, :acted_by, :admin_name)'
    );
    $stmtLog->execute([
        ':user_name'  => $userName,
        ':action'     => 'deleted',
        ':acted_by'   => 'admin',
        ':admin_name' => (string) $admin['full_name'],
    ]);

    // Borrado en cascada manual
    $pdo->prepare('DELETE FROM social_networks WHERE user_id = :id')->execute([':id' => $targetUserId]);
    $pdo->prepare('DELETE FROM profile_photos  WHERE user_id = :id')->execute([':id' => $targetUserId]);
    $pdo->prepare('DELETE FROM profiles        WHERE user_id = :id')->execute([':id' => $targetUserId]);
    $pdo->prepare('DELETE FROM daily_scriptures WHERE user_id = :id')->execute([':id' => $targetUserId]);

    // Tablas admin con FK → users.id (por si el usuario era admin)
    $pdo->prepare('DELETE FROM invitation_password_log WHERE admin_id = :id')->execute([':id' => $targetUserId]);

    // Usuario (disparador final — welcome_registry ON DELETE CASCADE limpia automáticamente)
    $pdo->prepare('DELETE FROM users WHERE id = :id')->execute([':id' => $targetUserId]);

    $pdo->commit();

    // Limpiar archivos físicos post-commit
    foreach ($photoPaths as $path) {
        try {
            if (file_exists($path)) {
                unlink($path);
            }
        } catch (\Throwable $ignored) {
            // No crítico: el commit fue exitoso
        }
    }

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => "Cuenta de {$userName} eliminada correctamente.",
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
