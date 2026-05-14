<?php
// =============================================================================
// api/entretejidos/post_message.php — Publicar mensaje guiado Entretejidos
// =============================================================================
// Método : POST JSON
// Body   : { authorId, recipientId, promptKey, message, relationType? }
// Returns: { status, message, data: { messageId, authorId, authorName,
//            authorPhotoUrl, promptKey, message, relationType, createdAt } }
// Reglas :
//   - authorId ≠ recipientId
//   - Ambos usuarios con status='active'
//   - 1 mensaje por autor+destinatario (sin límite temporal; 409 si ya existe)
//   - promptKey ∈ ['virtue','feeling','memory','light']
//   - message: 10–500 chars (almacenado en texto plano; React protege XSS)
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

$authorId     = isset($body['authorId'])     ? (int)    $body['authorId']                                     : 0;
$recipientId  = isset($body['recipientId'])  ? (int)    $body['recipientId']                                  : 0;
$promptKey    = isset($body['promptKey'])    ? trim((string) $body['promptKey'])                              : '';
$message      = isset($body['message'])      ? mb_substr(trim((string) $body['message']), 0, 500)             : '';
$relationType = isset($body['relationType']) ? mb_substr(trim((string) $body['relationType']), 0, 100) : null;

if ($relationType === '') $relationType = null;

$validPrompts = ['virtue', 'feeling', 'memory', 'light'];

// ── Validaciones de entrada ────────────────────────────────────────────────
if ($authorId <= 0 || $recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'IDs de usuario inválidos.', 'data' => []]);
    exit;
}

if ($authorId === $recipientId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No puedes escribirte un mensaje a ti mismo.', 'data' => []]);
    exit;
}

if (!in_array($promptKey, $validPrompts, true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt inválido.', 'data' => []]);
    exit;
}

if (mb_strlen($message) < 10) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El mensaje debe tener al menos 10 caracteres.', 'data' => []]);
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

    // ── Unicidad: 1 mensaje por autor+destinatario (sin límite temporal) ───
    $stmtDup = $pdo->prepare("
        SELECT id FROM woven_messages
        WHERE author_id = :authorId AND recipient_id = :recipientId
        LIMIT 1
    ");
    $stmtDup->execute([':authorId' => $authorId, ':recipientId' => $recipientId]);

    if ($stmtDup->fetch()) {
        http_response_code(409);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Ya dejaste un mensaje en este perfil. ¡Tu testimonio ya forma parte de su historia!',
            'data'    => [],
        ]);
        exit;
    }

    // ── Insertar el mensaje ────────────────────────────────────────────────
    $stmtIns = $pdo->prepare("
        INSERT INTO woven_messages (recipient_id, author_id, prompt_key, message, relation_type)
        VALUES (:recipientId, :authorId, :promptKey, :message, :relationType)
    ");
    $stmtIns->execute([
        ':recipientId'  => $recipientId,
        ':authorId'     => $authorId,
        ':promptKey'    => $promptKey,
        ':message'      => $message,
        ':relationType' => $relationType,
    ]);

    $newId = (int) $pdo->lastInsertId();

    // ── Retornar el mensaje completo con JOIN para que el frontend lo muestre
    $stmtGet = $pdo->prepare("
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
        WHERE wm.id = :id
    ");
    $stmtGet->execute([':id' => $newId]);
    $newMsg = $stmtGet->fetch(PDO::FETCH_ASSOC);

    if ($newMsg) {
        $newMsg['messageId'] = (int) $newMsg['messageId'];
        $newMsg['authorId']  = (int) $newMsg['authorId'];
    }

    http_response_code(201);
    echo json_encode([
        'status'  => 'success',
        'message' => '¡Tu mensaje quedó entretejido en su historia!',
        'data'    => $newMsg ?: [],
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
