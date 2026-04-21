<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/admin/get_pending_users.php
 * ENDPOINT  : GET /api/admin/get_pending_users.php?requesterId={id}
 * ALCANCE   : Devuelve todos los usuarios con status='pending'.
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

// Obtener usuarios pendientes con sus datos de contacto
$stmt = $pdo->prepare("
    SELECT
        u.id,
        u.full_name  AS fullName,
        u.email,
        u.phone,
        u.created_at AS createdAt
    FROM users u
    WHERE u.status = 'pending'
    ORDER BY u.created_at ASC
");
$stmt->execute();
$pendingUsers = $stmt->fetchAll();

http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => '',
    'data'    => $pendingUsers,
]);
