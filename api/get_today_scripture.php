<?php
// =============================================================================
// api/get_today_scripture.php — Obtener la escritura del día
// =============================================================================
// Método : GET
// Params : (ninguno)
// Returns: { status, data: { id, userId, fullName, scriptureText, reference,
//             scheduledDate } | null }
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
        WHERE ds.scheduled_date = CURDATE()
        LIMIT 1
    ');
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        // No hay escritura hoy — respuesta válida con data null
        echo json_encode(['status' => 'success', 'data' => null]);
        exit;
    }

    $row['id']     = (int) $row['id'];
    $row['userId'] = (int) $row['userId'];

    echo json_encode(['status' => 'success', 'data' => $row]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener la escritura del día.']);
}
