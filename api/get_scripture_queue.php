<?php
// =============================================================================
// api/get_scripture_queue.php — Obtener la cola de escrituras futuras
// =============================================================================
// Método : GET
// Params : (ninguno)
// Returns: { status, data: Array<{ id, userId, fullName, scriptureText,
//             reference, scheduledDate }> }
// Incluye: La escritura de HOY + todas las futuras, ordenadas por fecha ASC.
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno de servidor.']);
    exit;
}

try {
    $stmt = $pdo->prepare('
        SELECT
            ds.id,
            ds.user_id         AS userId,
            u.full_name        AS fullName,
            ds.scripture_text  AS scriptureText,
            ds.reference,
            ds.scheduled_date  AS scheduledDate
        FROM daily_scriptures ds
        JOIN users u ON u.id = ds.user_id
        WHERE ds.scheduled_date >= CURDATE()
        ORDER BY ds.scheduled_date ASC
        LIMIT 60
    ');
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id']     = (int) $r['id'];
        $r['userId'] = (int) $r['userId'];
    }
    unset($r);

    echo json_encode(['status' => 'success', 'data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener la cola.']);
}
