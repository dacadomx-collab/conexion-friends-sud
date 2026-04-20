<?php
// =============================================================================
// api/admin/get_whitelist_history.php — Historial de altas de Lista Blanca (Admin)
// =============================================================================
// Método : GET
// Query  : requesterId=int  (debe tener role='admin')
// Returns: { "status": "success", "data": WhitelistEntry[] }
//
// WhitelistEntry = {
//   phone: string, isUsed: bool, addedByName: string|null, createdAt: string
// }
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

header('Content-Type: application/json; charset=utf-8');

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
        'SELECT wp.phone,
                wp.is_used,
                u.full_name  AS added_by_name,
                wp.created_at
         FROM   whitelist_phones wp
         LEFT   JOIN users u ON u.id = wp.added_by
         ORDER  BY wp.created_at DESC'
    );

    $rows = $stmt !== false ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    $data = [];
    foreach ($rows as $r) {
        $data[] = [
            'phone'       => (string) $r['phone'],
            'isUsed'      => (bool)   $r['is_used'],
            'addedByName' => !empty($r['added_by_name']) ? (string) $r['added_by_name'] : null,
            'createdAt'   => (string) $r['created_at'],
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => 'Error al cargar el historial de lista blanca.']);
}
