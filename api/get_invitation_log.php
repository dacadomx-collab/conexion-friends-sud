<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: get_invitation_log.php
// Método:   GET  ?requesterId=INT
// Acceso:   Solo administradores (role = 'admin')
// Función:  Devuelve el historial de cambios de la Contraseña de Invitación
//           Master (últimas 50 entradas), incluyendo nombre del admin que
//           realizó cada cambio y la fecha/hora.
//           NO devuelve password_hash — solo metadatos de auditoría.
// =============================================================================
require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$requesterId = filter_var($_GET['requesterId'] ?? null, FILTER_VALIDATE_INT);

if (!$requesterId || $requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido o faltante.', 'data' => []]);
    exit;
}

$db = (new Database())->getConnection();

// ── Verificar que requesterId sea admin ───────────────────────────────────────
$check = $db->prepare("SELECT role FROM users WHERE id = :id LIMIT 1");
$check->execute([':id' => $requesterId]);
$admin = $check->fetch();

if (!$admin || $admin['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Acceso denegado. Solo administradores.',
        'data'    => [],
    ]);
    exit;
}

// ── Consultar historial (sin exponer password_hash) ───────────────────────────
$stmt = $db->prepare(
    "SELECT
         l.id,
         l.admin_id,
         u.full_name  AS adminName,
         l.created_at AS createdAt
     FROM  invitation_password_log l
     INNER JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT 50"
);
$stmt->execute();
$rows = $stmt->fetchAll();

$data = array_map(static function (array $r): array {
    return [
        'id'        => (int)$r['id'],
        'adminId'   => (int)$r['admin_id'],
        'adminName' => $r['adminName'],
        'createdAt' => $r['createdAt'],
    ];
}, $rows);

http_response_code(200);
echo json_encode(['status' => 'success', 'data' => $data]);
