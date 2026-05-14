<?php
// =============================================================================
// api/entretejidos/get_messages.php — Leer mensajes Entretejidos de un perfil
// =============================================================================
// Método : GET
// Params : ?recipientId=INT  (requerido)
// Returns: { status, message, data: [{ messageId, authorId, authorName,
//            authorPhotoUrl, promptKey, message, relationType, createdAt }] }
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$recipientId = isset($_GET['recipientId']) ? (int) $_GET['recipientId'] : 0;

if ($recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'recipientId inválido.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("
        SELECT
            wm.id            AS messageId,
            wm.author_id     AS authorId,
            u.full_name      AS authorName,
            pp.photo_url     AS authorPhotoUrl,
            wm.prompt_key    AS promptKey,
            wm.message       AS message,
            wm.relation_type AS relationType,
            wm.created_at    AS createdAt
        FROM woven_messages wm
        JOIN  users u  ON u.id  = wm.author_id
        LEFT JOIN profile_photos pp
               ON pp.user_id = wm.author_id AND pp.sort_order = 1
        WHERE wm.recipient_id = :recipientId
        ORDER BY wm.created_at DESC
    ");
    $stmt->execute([':recipientId' => $recipientId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['messageId'] = (int) $row['messageId'];
        $row['authorId']  = (int) $row['authorId'];
    }
    unset($row);

    echo json_encode(['status' => 'success', 'message' => '', 'data' => $rows]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
