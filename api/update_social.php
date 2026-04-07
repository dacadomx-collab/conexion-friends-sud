<?php
// =============================================================================
// api/update_social.php — Guardar / actualizar redes sociales
// =============================================================================
// Método : POST (application/json)
// Body   : {
//   "userId"    : int,
//   "instagram" : string  — solo handle, sin @
//   "facebook"  : string  — handle o nombre
//   "linkedin"  : string  — URL completa
//   "twitter"   : string  — solo handle, sin @
//   "tiktok"    : string  — solo handle, sin @
//   "website"   : string  — URL completa
// }
// Lógica : UPSERT por cada red presente (no vacía).
// Tabla  : social_networks (user_id, network_type, handle)
//          UNIQUE KEY en (user_id, network_type)
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

$userId = isset($body['userId']) ? (int) $body['userId'] : 0;
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
    exit;
}

// ── Definición de redes: [clave_body => [maxLen, esUrl]] ─────────────────────
// esUrl = true  → guardar tal cual (LinkedIn, Website)
// esUrl = false → quitar @ inicial (Instagram, Twitter, TikTok, Facebook)
const NETWORK_RULES = [
    'instagram' => ['max' => 100,  'isUrl' => false],
    'facebook'  => ['max' => 100,  'isUrl' => false],
    'linkedin'  => ['max' => 300,  'isUrl' => true],
    'twitter'   => ['max' => 100,  'isUrl' => false],
    'tiktok'    => ['max' => 100,  'isUrl' => false],
    'website'   => ['max' => 300,  'isUrl' => true],
];

$networks = [];

foreach (NETWORK_RULES as $key => $rules) {
    $value = trim((string) ($body[$key] ?? ''));

    if ($value === '') continue;

    // Para handles: quitar @ inicial
    if (!$rules['isUrl']) {
        $value = ltrim($value, '@');
    }

    if ($value === '') continue;

    $networks[$key] = mb_substr($value, 0, $rules['max']);
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
