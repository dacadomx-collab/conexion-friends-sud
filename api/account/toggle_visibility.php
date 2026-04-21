<?php
// =============================================================================
// api/account/toggle_visibility.php — Ocultar / Reactivar cuenta en El Book
// =============================================================================
// Método : POST (JSON body)
// Body   : { "userId": int, "reason": string|null }
// Proceso: Alterna users.status entre 'active' e 'inactive'.
//          active → inactive : inserta en user_departures_log (action='hidden').
//          inactive → active : elimina la entrada 'hidden' más reciente del log.
// Returns: { "status": "success", "newStatus": "active"|"inactive" }
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
    $reason = isset($body['reason']) && is_string($body['reason']) ? trim($body['reason']) : null;

    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    $stmtUser = $pdo->prepare('SELECT full_name, status FROM users WHERE id = :id LIMIT 1');
    $stmtUser->execute([':id' => $userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.']);
        exit;
    }

    if ($user['status'] === 'blocked') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Tu cuenta está bloqueada. Contacta a un administrador.']);
        exit;
    }

    $currentStatus = (string) $user['status'];
    $newStatus     = $currentStatus === 'active' ? 'inactive' : 'active';
    $userName      = (string) $user['full_name'];

    $pdo->beginTransaction();

    $stmtUpdate = $pdo->prepare('UPDATE users SET status = :status WHERE id = :id');
    $stmtUpdate->execute([':status' => $newStatus, ':id' => $userId]);

    if ($newStatus === 'inactive') {
        $stmtLog = $pdo->prepare(
            'INSERT INTO user_departures_log (user_name, action, reason, acted_by) VALUES (:user_name, :action, :reason, :acted_by)'
        );
        $stmtLog->execute([
            ':user_name' => $userName,
            ':action'    => 'hidden',
            ':reason'    => ($reason !== null && $reason !== '') ? $reason : null,
            ':acted_by'  => 'self',
        ]);
    } else {
        // Eliminar la entrada 'hidden' más reciente de este usuario (reactivación)
        $stmtDel = $pdo->prepare(
            'DELETE FROM user_departures_log WHERE id = (
                SELECT id FROM (
                    SELECT id FROM user_departures_log
                    WHERE user_name = :user_name AND action = :action
                    ORDER BY created_at DESC LIMIT 1
                ) AS t
            )'
        );
        $stmtDel->execute([':user_name' => $userName, ':action' => 'hidden']);
    }

    $pdo->commit();

    echo json_encode(['status' => 'success', 'newStatus' => $newStatus], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => 'Error al procesar la solicitud. Intenta de nuevo.']);
}
