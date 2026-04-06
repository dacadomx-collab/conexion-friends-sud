<?php
// =============================================================================
// api/update_social.php — Guardar / actualizar redes sociales
// =============================================================================
// Método : POST (application/json)
// Body   : { "userId": int, "instagram": string|null, "facebook": string|null }
// Lógica : UPSERT por red social presente; ignora redes con handle vacío.
// Tabla  : social_networks (user_id, network_type, handle)
//          — índice UNIQUE en (user_id, network_type)
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

// ── Solo POST ─────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

// ── Leer body JSON ────────────────────────────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Cuerpo JSON inválido.']);
    exit;
}

// ── Validar userId ────────────────────────────────────────────────────────────
$userId = isset($body['userId']) ? (int) $body['userId'] : 0;
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
    exit;
}

// ── Extraer y sanear handles ──────────────────────────────────────────────────
$networks = [];

$instagram = trim((string) ($body['instagram'] ?? ''));
$instagram = ltrim($instagram, '@');          // quitar @ si viene
if ($instagram !== '') {
    $networks['instagram'] = mb_substr($instagram, 0, 100);
}

$facebook = trim((string) ($body['facebook'] ?? ''));
if ($facebook !== '') {
    $networks['facebook'] = mb_substr($facebook, 0, 100);
}

// Si no hay redes que guardar, éxito vacío
if (empty($networks)) {
    echo json_encode([
        'status'  => 'success',
        'message' => 'No se proporcionaron redes sociales; nada que guardar.',
    ]);
    exit;
}

// ── Conectar a BD ─────────────────────────────────────────────────────────────
try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno de servidor.']);
    exit;
}

// ── UPSERT por cada red ───────────────────────────────────────────────────────
$sql = '
    INSERT INTO social_networks (user_id, network_type, handle)
    VALUES (:userId, :network, :handle)
    ON DUPLICATE KEY UPDATE handle = VALUES(handle)
';

try {
    $stmt = $pdo->prepare($sql);

    foreach ($networks as $type => $handle) {
        $stmt->execute([
            ':userId'  => $userId,
            ':network' => $type,
            ':handle'  => $handle,
        ]);
    }

    echo json_encode([
        'status'  => 'success',
        'message' => 'Redes sociales guardadas correctamente.',
        'saved'   => array_keys($networks),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al guardar redes sociales.']);
}
