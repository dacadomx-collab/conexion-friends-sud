<?php
// =============================================================================
// api/submit_scripture.php — Registrar una escritura para la cola
// =============================================================================
// Método : POST (application/json)
// Body   : { "userId": int, "text": string, "reference": string }
// Lógica : Encuentra la fecha máxima en la cola.
//          Si está vacía o es pasada → asigna HOY.
//          Si hay fechas futuras     → asigna MAX + 1 día.
//          Inserta el nuevo registro.
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Cuerpo JSON inválido.']);
    exit;
}

// ── Validaciones ──────────────────────────────────────────────────────────────
$userId    = isset($body['userId'])    ? (int)    $body['userId']    : 0;
$text      = isset($body['text'])      ? trim((string) $body['text'])      : '';
$reference = isset($body['reference']) ? trim((string) $body['reference']) : '';

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
    exit;
}
if (mb_strlen($text) < 10) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El texto de la escritura es demasiado corto (mínimo 10 caracteres).']);
    exit;
}
if (mb_strlen($text) > 3000) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El texto de la escritura supera el límite de 3 000 caracteres.']);
    exit;
}
if (mb_strlen($reference) < 2) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'La referencia es obligatoria (ej. "3 Nefi 11:29").']);
    exit;
}
if (mb_strlen($reference) > 200) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'La referencia supera el límite de 200 caracteres.']);
    exit;
}

// ── Conectar ──────────────────────────────────────────────────────────────────
try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno de servidor.']);
    exit;
}

// ── Calcular fecha de publicación ─────────────────────────────────────────────
try {
    $stmtMax = $pdo->query('SELECT MAX(scheduled_date) AS max_date FROM daily_scriptures');
    $maxRow  = $stmtMax->fetch(PDO::FETCH_ASSOC);
    $maxDate = $maxRow['max_date'];   // NULL si tabla vacía

    $today = new DateTimeImmutable('today');

    if ($maxDate === null) {
        // Cola vacía → publicar hoy
        $scheduledDate = $today->format('Y-m-d');
    } else {
        $maxDt = new DateTimeImmutable($maxDate);
        if ($maxDt < $today) {
            // La cola se agotó en el pasado → reiniciar desde hoy
            $scheduledDate = $today->format('Y-m-d');
        } else {
            // Hay fechas presentes o futuras → encolar al día siguiente del último
            $scheduledDate = $maxDt->modify('+1 day')->format('Y-m-d');
        }
    }

    // ── Insertar ──────────────────────────────────────────────────────────────
    $stmtIns = $pdo->prepare('
        INSERT INTO daily_scriptures (user_id, scripture_text, reference, scheduled_date)
        VALUES (:userId, :text, :reference, :date)
    ');
    $stmtIns->execute([
        ':userId'    => $userId,
        ':text'      => $text,
        ':reference' => $reference,
        ':date'      => $scheduledDate,
    ]);

    echo json_encode([
        'status'        => 'success',
        'message'       => 'Tu escritura fue añadida a la cola.',
        'scheduledDate' => $scheduledDate,
    ]);

} catch (PDOException $e) {
    // Único duplicado posible: colisión de fecha (muy improbable en el flujo normal)
    if ((string) $e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Ya existe una escritura para esa fecha. Intenta de nuevo.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error al guardar la escritura.']);
    }
}
