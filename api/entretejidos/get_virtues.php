<?php
// =============================================================================
// api/entretejidos/get_virtues.php — Constelación de virtudes de un perfil
// =============================================================================
// Método : GET
// Params : ?recipientId=INT  (requerido)
//          ?viewerId=INT     (opcional — para identificar las virtudes que dio el viewer)
// Returns: { status, message, data: { virtuesReceived: string[], viewerGave: string[] } }
//
// ⚠️ REGLA FUNDAMENTAL: NUNCA se exponen conteos (ni totales ni por virtud).
//    Solo se devuelve QUÉ virtudes existen en el perfil (presencia cualitativa).
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$recipientId = isset($_GET['recipientId']) ? (int) $_GET['recipientId'] : 0;
$viewerId    = isset($_GET['viewerId'])    ? (int) $_GET['viewerId']    : 0;

if ($recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'recipientId inválido.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Qué virtudes tiene este perfil (de cualquier persona) — solo claves únicas
    $stmtReceived = $pdo->prepare("
        SELECT DISTINCT virtue_key
        FROM virtue_recognitions
        WHERE recipient_id = :recipientId
    ");
    $stmtReceived->execute([':recipientId' => $recipientId]);
    $virtuesReceived = $stmtReceived->fetchAll(PDO::FETCH_COLUMN);

    // ── Qué virtudes dio específicamente el viewer (para el estado del toggle)
    $viewerGave = [];
    if ($viewerId > 0 && $viewerId !== $recipientId) {
        $stmtGave = $pdo->prepare("
            SELECT virtue_key
            FROM virtue_recognitions
            WHERE recipient_id = :recipientId AND author_id = :viewerId
        ");
        $stmtGave->execute([':recipientId' => $recipientId, ':viewerId' => $viewerId]);
        $viewerGave = $stmtGave->fetchAll(PDO::FETCH_COLUMN);
    }

    echo json_encode([
        'status'  => 'success',
        'message' => '',
        'data'    => [
            'virtuesReceived' => array_values($virtuesReceived),
            'viewerGave'      => array_values($viewerGave),
        ],
    ]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
