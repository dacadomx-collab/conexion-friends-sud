<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/admin/authorize_user.php
 * ENDPOINT  : POST /api/admin/authorize_user.php
 * BODY      : { requesterId, targetUserId }
 * ALCANCE   : Activa un usuario 'pending' → 'active'.
 *             TRANSACCIÓN ATÓMICA:
 *               1. users.status = 'active'
 *               2. INSERT en welcome_registry (snapshot inmutable)
 *             Solo accesible por admins.
 * CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md | 03_CONTRATOS_API_Y_LOGICA.md
 * =============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON inválido.', 'data' => []]);
    exit;
}

$requesterId  = isset($payload['requesterId'])  ? (int) $payload['requesterId']  : 0;
$targetUserId = isset($payload['targetUserId']) ? (int) $payload['targetUserId'] : 0;

if ($requesterId <= 0 || $targetUserId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId y targetUserId son obligatorios.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar que el solicitante sea admin
    $stmtAdmin = $pdo->prepare('SELECT id, full_name, role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch();

    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Se requiere rol de administrador.', 'data' => []]);
        exit;
    }

    // Obtener el usuario objetivo y validar su estado
    $stmtUser = $pdo->prepare('SELECT id, full_name, email, phone, status FROM users WHERE id = :id LIMIT 1');
    $stmtUser->execute([':id' => $targetUserId]);
    $targetUser = $stmtUser->fetch();

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.', 'data' => []]);
        exit;
    }

    if ($targetUser['status'] !== 'pending') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'El usuario no está en estado pendiente de aprobación.', 'data' => []]);
        exit;
    }

    // TRANSACCIÓN ATÓMICA
    $pdo->beginTransaction();

    // 1. Activar la cuenta del usuario
    $stmtActivate = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = :id");
    $stmtActivate->execute([':id' => $targetUserId]);

    // 2. Insertar snapshot inmutable en welcome_registry
    $stmtWelcome = $pdo->prepare("
        INSERT INTO welcome_registry
            (user_id, user_name, user_email, user_phone, admin_id, admin_name)
        VALUES
            (:user_id, :user_name, :user_email, :user_phone, :admin_id, :admin_name)
    ");
    $stmtWelcome->execute([
        ':user_id'    => $targetUserId,
        ':user_name'  => $targetUser['full_name'],
        ':user_email' => $targetUser['email'],
        ':user_phone' => $targetUser['phone'],
        ':admin_id'   => $requesterId,
        ':admin_name' => $admin['full_name'],
    ]);

    $pdo->commit();

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Usuario autorizado y activado correctamente.',
        'data'    => [
            'userId'   => $targetUserId,
            'userName' => $targetUser['full_name'],
        ],
    ]);

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo instanceof \PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno del servidor.', 'data' => []]);
}
