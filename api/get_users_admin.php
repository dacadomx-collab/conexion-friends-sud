<?php
// =============================================================================
// api/get_users_admin.php — Lista de usuarios (solo administradores)
// =============================================================================
// Método : GET
// Params : ?requesterId=INT  (debe tener role='admin' en la BD)
// Returns: { status, data: [ { id, fullName, email, role, status, groupJoinDate } ] }
// Seguridad: Si requesterId no existe o no es admin → HTTP 403
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$requesterId = isset($_GET['requesterId']) ? (int) $_GET['requesterId'] : 0;
if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId requerido.']);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que el solicitante sea admin ────────────────────────────────
    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtRole->execute([':id' => $requesterId]);
    $requester = $stmtRole->fetch();

    if (!$requester || $requester['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Se requiere rol de administrador.']);
        exit;
    }

    // ── Obtener lista completa de usuarios ────────────────────────────────────
    $stmt = $pdo->prepare('
        SELECT
            u.id                                           AS id,
            u.full_name                                    AS fullName,
            u.email,
            u.role,
            u.status,
            COALESCE(p.group_join_date, \'\')             AS groupJoinDate
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        ORDER BY u.id ASC
    ');
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $users = array_map(static function (array $row): array {
        return [
            'id'            => (int) $row['id'],
            'fullName'      => $row['fullName'],
            'email'         => $row['email'],
            'role'          => $row['role']   ?? 'user',
            'status'        => $row['status'] ?? 'active',
            'groupJoinDate' => $row['groupJoinDate'] ?? '',
        ];
    }, $rows);

    echo json_encode(['status' => 'success', 'data' => $users]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno del servidor.']);
}
