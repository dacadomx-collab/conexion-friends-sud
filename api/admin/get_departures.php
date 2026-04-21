<?php
// =============================================================================
// api/admin/get_departures.php — Registro de bajas y cuentas ocultas (Admin)
// =============================================================================
// Método : GET
// Query  : requesterId=int  (debe tener role='admin')
// Returns: { "status": "success", "data": DepartureEntry[] }
//
// DepartureEntry = {
//   id: int, userName: string, action: "hidden"|"deleted",
//   reason: string|null, createdAt: string
// }
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

try {
    $requesterId = isset($_GET['requesterId']) ? (int) $_GET['requesterId'] : 0;
    if ($requesterId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar que el solicitante sea admin
    $stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso restringido a administradores.']);
        exit;
    }

    $stmt = $pdo->query(
        'SELECT id, user_name, action, reason, acted_by, admin_name, created_at
         FROM   user_departures_log
         ORDER  BY created_at DESC'
    );

    $rows = $stmt !== false ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $data = [];
    foreach ($rows as $r) {
        $data[] = [
            'id'        => (int)    $r['id'],
            'userName'  => (string) $r['user_name'],
            'action'    => (string) $r['action'],
            'reason'    => !empty($r['reason'])     ? (string) $r['reason']     : null,
            'actedBy'   => !empty($r['acted_by'])   ? (string) $r['acted_by']   : 'self',
            'adminName' => !empty($r['admin_name']) ? (string) $r['admin_name'] : null,
            'createdAt' => (string) $r['created_at'],
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    $debug = (getenv('APP_ENV') !== 'production') ? $e->getMessage() : null;
    echo json_encode(array_filter([
        'status'  => 'error',
        'message' => 'Error al cargar el registro de bajas.',
        'debug'   => $debug,
    ]), JSON_UNESCAPED_UNICODE);
}
