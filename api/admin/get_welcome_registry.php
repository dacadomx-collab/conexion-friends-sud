<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/admin/get_welcome_registry.php
 * ENDPOINT  : GET /api/admin/get_welcome_registry.php?requesterId={id}
 * ALCANCE   : Devuelve el historial completo de autorizaciones (welcome_registry).
 *             Muestra quién aprobó a quién y cuándo.
 *             Solo accesible por admins.
 * CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md | 03_CONTRATOS_API_Y_LOGICA.md
 * =============================================================================
 */

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$requesterId = isset($_GET['requesterId']) ? (int) $_GET['requesterId'] : 0;

if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId requerido.', 'data' => []]);
    exit;
}

$db  = new Database();
$pdo = $db->getConnection();

// Verificar que el solicitante sea admin
$stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
$stmtRole->execute([':id' => $requesterId]);
$requester = $stmtRole->fetch();

if (!$requester || $requester['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Se requiere rol de administrador.', 'data' => []]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        id,
        user_id       AS userId,
        user_name     AS userName,
        user_email    AS userEmail,
        user_phone    AS userPhone,
        admin_id      AS adminId,
        admin_name    AS adminName,
        authorized_at AS authorizedAt
    FROM welcome_registry
    ORDER BY authorized_at DESC
");
$stmt->execute();
$registry = $stmt->fetchAll();

http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => '',
    'data'    => $registry,
]);
