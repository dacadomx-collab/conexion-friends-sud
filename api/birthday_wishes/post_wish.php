<?php
// =============================================================================
// api/birthday_wishes/post_wish.php — Escribir en el Libro de Firmas
// =============================================================================
// Método : POST JSON
// Body   : { authorId: INT, recipientId: INT, message: STRING (3-500 chars) }
// Returns: { status, message }
// Reglas :
//   - authorId ≠ recipientId (no se puede felicitar a sí mismo)
//   - Ambos usuarios deben existir y tener status='active'
//   - Un autor solo puede escribir UN mensaje por destinatario por año
//   - El mensaje se almacena sin HTML-encoding; la capa React protege de XSS
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Payload JSON inválido.']);
    exit;
}

$authorId    = isset($body['authorId'])    ? (int) $body['authorId']    : 0;
$recipientId = isset($body['recipientId']) ? (int) $body['recipientId'] : 0;
$message     = isset($body['message'])     ? mb_substr(trim((string) $body['message']), 0, 500) : '';

// ── Validaciones de entrada ────────────────────────────────────────────────
if ($authorId <= 0 || $recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'IDs de usuario inválidos.']);
    exit;
}

if ($authorId === $recipientId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No puedes escribirte un mensaje a ti mismo.']);
    exit;
}

if (mb_strlen($message) < 3) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El mensaje debe tener al menos 3 caracteres.']);
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
    $checkResult = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ((int)($checkResult['total'] ?? 0) < 2) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Uno o ambos usuarios no existen o no están activos.']);
        exit;
    }

    // ── Verificar unicidad: un mensaje por autor+destinatario por año ──────
    $stmtDup = $pdo->prepare("
        SELECT id FROM birthday_wishes
        WHERE author_id    = :authorId
          AND recipient_id = :recipientId
          AND YEAR(created_at) = YEAR(CURDATE())
        LIMIT 1
    ");
    $stmtDup->execute([':authorId' => $authorId, ':recipientId' => $recipientId]);

    if ($stmtDup->fetch()) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Ya dejaste un mensaje para este hermano(a) este año. ¡Gracias por tu amor!']);
        exit;
    }

    // ── Insertar el mensaje ────────────────────────────────────────────────
    $stmtIns = $pdo->prepare("
        INSERT INTO birthday_wishes (recipient_id, author_id, message)
        VALUES (:recipientId, :authorId, :message)
    ");
    $stmtIns->execute([
        ':recipientId' => $recipientId,
        ':authorId'    => $authorId,
        ':message'     => $message,
    ]);

    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => '¡Mensaje enviado con amor!']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno al guardar el mensaje.']);
}
