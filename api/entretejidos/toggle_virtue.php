<?php
// =============================================================================
// api/entretejidos/toggle_virtue.php — Dar / Quitar reconocimiento de virtud
// =============================================================================
// Método : POST JSON
// Body   : { authorId, recipientId, virtueKey }
// Returns: { status, message, data: { action: 'added'|'removed', virtueKey } }
// Reglas :
//   - authorId ≠ recipientId
//   - Ambos usuarios con status='active'
//   - Toggle idempotente: si ya existe → DELETE; si no → INSERT
//   - virtueKey ∈ ['trust','joy','light','service']
//   - La restricción UNIQUE KEY uq_vr en DB garantiza consistencia
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Payload JSON inválido.', 'data' => []]);
    exit;
}

$authorId    = isset($body['authorId'])    ? (int)    $body['authorId']           : 0;
$recipientId = isset($body['recipientId']) ? (int)    $body['recipientId']        : 0;
$virtueKey   = isset($body['virtueKey'])   ? trim((string) $body['virtueKey'])    : '';

$validVirtues = ['trust', 'joy', 'light', 'service'];

// ── Validaciones de entrada ────────────────────────────────────────────────
if ($authorId <= 0 || $recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'IDs de usuario inválidos.', 'data' => []]);
    exit;
}

if ($authorId === $recipientId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No puedes reconocerte una virtud a ti mismo.', 'data' => []]);
    exit;
}

if (!in_array($virtueKey, $validVirtues, true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Virtud inválida.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que ambos usuarios existen y son activos ─────────────────
    $stmtCheck = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM users
        WHERE id IN (:id1, :id2) AND status = 'active'
    ");
    $stmtCheck->execute([':id1' => $authorId, ':id2' => $recipientId]);
    $check = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ((int)($check['total'] ?? 0) < 2) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Uno o ambos usuarios no existen o no están activos.', 'data' => []]);
        exit;
    }

    // ── Verificar si ya existe ese reconocimiento ──────────────────────────
    $stmtExists = $pdo->prepare("
        SELECT id FROM virtue_recognitions
        WHERE recipient_id = :recipientId
          AND author_id    = :authorId
          AND virtue_key   = :virtueKey
        LIMIT 1
    ");
    $stmtExists->execute([
        ':recipientId' => $recipientId,
        ':authorId'    => $authorId,
        ':virtueKey'   => $virtueKey,
    ]);

    if ($stmtExists->fetch()) {
        // ── Ya existe → quitar (DELETE) ────────────────────────────────────
        $stmtDel = $pdo->prepare("
            DELETE FROM virtue_recognitions
            WHERE recipient_id = :recipientId
              AND author_id    = :authorId
              AND virtue_key   = :virtueKey
        ");
        $stmtDel->execute([
            ':recipientId' => $recipientId,
            ':authorId'    => $authorId,
            ':virtueKey'   => $virtueKey,
        ]);

        echo json_encode([
            'status'  => 'success',
            'message' => 'Reconocimiento retirado.',
            'data'    => ['action' => 'removed', 'virtueKey' => $virtueKey],
        ]);

    } else {
        // ── No existe → dar (INSERT) ───────────────────────────────────────
        $stmtIns = $pdo->prepare("
            INSERT INTO virtue_recognitions (recipient_id, author_id, virtue_key)
            VALUES (:recipientId, :authorId, :virtueKey)
        ");
        $stmtIns->execute([
            ':recipientId' => $recipientId,
            ':authorId'    => $authorId,
            ':virtueKey'   => $virtueKey,
        ]);

        echo json_encode([
            'status'  => 'success',
            'message' => '¡Virtud reconocida con amor!',
            'data'    => ['action' => 'added', 'virtueKey' => $virtueKey],
        ]);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
