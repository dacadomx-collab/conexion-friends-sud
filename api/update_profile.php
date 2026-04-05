<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/update_profile.php
 * ENDPOINT  : POST /api/update_profile.php
 * CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md | 03_CONTRATOS_API_Y_LOGICA.md
 * ALCANCE   : INSERT ... ON DUPLICATE KEY UPDATE en tabla `profiles` ÚNICAMENTE.
 *             No toca: users, profile_photos, social_networks.
 * REGLA     : full_name y birth_date de la tabla `users` son INMUTABLES.
 *             Este endpoint jamás las modificará (Regla de Piedra 1).
 * MIGRACIÓN : 01_add_location_to_profiles.sql — añade country, state, city.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. CABECERAS HTTP — CORS DINÁMICO
//    Whitelist explícita de orígenes permitidos.
//    El Origin del cliente se compara contra la lista; nunca se refleja ciegamente.
// -----------------------------------------------------------------------------
$allowedOrigins = [
    'https://friends.tecnidepot.com',
    'http://localhost:3000',
    'http://localhost:3001',
];

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin    = in_array($requestOrigin, $allowedOrigins, true)
    ? $requestOrigin
    : 'https://friends.tecnidepot.com';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -----------------------------------------------------------------------------
// 2. RESTRICCIÓN DE MÉTODO
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Método no permitido. Se requiere POST.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 3. CARGA DE CREDENCIALES DESDE .env
// -----------------------------------------------------------------------------
$envPath = __DIR__ . '/../.env';

if (!file_exists($envPath)) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error de configuración del servidor.',
        'data'    => []
    ]);
    exit;
}

$env = parse_ini_file($envPath);

// -----------------------------------------------------------------------------
// 4. LECTURA Y DECODIFICACIÓN DEL PAYLOAD JSON
// -----------------------------------------------------------------------------
$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El cuerpo de la solicitud debe ser JSON válido.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 5. EXTRACCIÓN DE CAMPOS
//    camelCase (Front) → variables PHP locales
//    Campos requeridos:
//      userId       → user_id          (FK → users.id)
//      ward         → ward
//      stake        → stake
//      bio          → bio
//      showWhatsapp → show_whatsapp
//    Campos opcionales (nullable):
//      country      → country
//      state        → state
//      city         → city
// -----------------------------------------------------------------------------
$userId       = isset($payload['userId'])       ? $payload['userId']                       : null;
$ward         = isset($payload['ward'])         ? trim((string) $payload['ward'])          : null;
$stake        = isset($payload['stake'])        ? trim((string) $payload['stake'])         : null;
$bio          = isset($payload['bio'])          ? trim((string) $payload['bio'])           : null;
$showWhatsapp = $payload['showWhatsapp'] ?? null;

// Campos opcionales: si se envían vacíos se guardan como NULL en DB
$country = array_key_exists('country', $payload)
    ? (trim((string) $payload['country']) !== '' ? trim((string) $payload['country']) : null)
    : null;

$state = array_key_exists('state', $payload)
    ? (trim((string) $payload['state']) !== '' ? trim((string) $payload['state']) : null)
    : null;

$city = array_key_exists('city', $payload)
    ? (trim((string) $payload['city']) !== '' ? trim((string) $payload['city']) : null)
    : null;

// -----------------------------------------------------------------------------
// 6. VALIDACIONES
// -----------------------------------------------------------------------------

// 6.1 — Presencia obligatoria de campos requeridos
$missingFields = [];
if ($userId       === null) $missingFields[] = 'userId';
if ($ward         === null) $missingFields[] = 'ward';
if ($stake        === null) $missingFields[] = 'stake';
if ($bio          === null) $missingFields[] = 'bio';
if ($showWhatsapp === null) $missingFields[] = 'showWhatsapp';

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Campos obligatorios faltantes: ' . implode(', ', $missingFields) . '.',
        'data'    => []
    ]);
    exit;
}

// 6.2 — userId: debe ser entero positivo
if (!is_int($userId) || $userId <= 0) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo userId debe ser un entero positivo.',
        'data'    => []
    ]);
    exit;
}

// 6.3 — showWhatsapp: debe ser estrictamente booleano (true o false)
//        String "true", entero 1 o cualquier otro valor son RECHAZADOS
if (!is_bool($showWhatsapp)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo showWhatsapp debe ser un booleano estricto (true o false).',
        'data'    => []
    ]);
    exit;
}

// 6.4 — Longitud de ward (máx. 100 caracteres)
if (mb_strlen($ward) > 100) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo ward no puede superar los 100 caracteres.',
        'data'    => []
    ]);
    exit;
}

// 6.5 — Longitud de stake (máx. 100 caracteres)
if (mb_strlen($stake) > 100) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo stake no puede superar los 100 caracteres.',
        'data'    => []
    ]);
    exit;
}

// 6.6 — Longitud de bio (máx. 500 caracteres)
if (mb_strlen($bio) > 500) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La biografía no puede superar los 500 caracteres.',
        'data'    => []
    ]);
    exit;
}

// 6.7 — Longitud de campos opcionales de ubicación (máx. 100 caracteres c/u)
if ($country !== null && mb_strlen($country) > 100) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo country no puede superar los 100 caracteres.',
        'data'    => []
    ]);
    exit;
}

if ($state !== null && mb_strlen($state) > 100) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo state no puede superar los 100 caracteres.',
        'data'    => []
    ]);
    exit;
}

if ($city !== null && mb_strlen($city) > 100) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El campo city no puede superar los 100 caracteres.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 7. CONEXIÓN PDO
// -----------------------------------------------------------------------------
try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $env['DB_HOST'],
        $env['DB_NAME']
    );

    $pdo = new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'No se pudo conectar al servidor. Intenta más tarde.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 8. VERIFICAR QUE EL user_id EXISTE EN LA TABLA `users`
//    Blindaje contra registros huérfanos en profiles sin usuario real.
// -----------------------------------------------------------------------------
try {
    $checkStmt = $pdo->prepare("SELECT id FROM `users` WHERE id = :id LIMIT 1");
    $checkStmt->execute([':id' => $userId]);

    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            'status'  => 'error',
            'message' => 'El usuario indicado no existe.',
            'data'    => []
        ]);
        exit;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor. Intenta más tarde.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 9. INSERT ... ON DUPLICATE KEY UPDATE EN TABLA `profiles`
//    Si el usuario no tiene perfil (recién registrado) → INSERT.
//    Si ya tiene perfil → UPDATE de los campos editables.
//
//    Mapeo explícito camelCase (Front) → snake_case (DB):
//      userId       → user_id       (clave UNIQUE, nunca se actualiza)
//      ward         → ward
//      stake        → stake
//      bio          → bio
//      showWhatsapp → show_whatsapp
//      country      → country       (nullable)
//      state        → state         (nullable)
//      city         → city          (nullable)
// -----------------------------------------------------------------------------
try {
    $stmt = $pdo->prepare("
        INSERT INTO `profiles`
            (`user_id`, `ward`, `stake`, `bio`, `show_whatsapp`, `country`, `state`, `city`)
        VALUES
            (:user_id, :ward, :stake, :bio, :show_whatsapp, :country, :state, :city)
        ON DUPLICATE KEY UPDATE
            `ward`          = VALUES(`ward`),
            `stake`         = VALUES(`stake`),
            `bio`           = VALUES(`bio`),
            `show_whatsapp` = VALUES(`show_whatsapp`),
            `country`       = VALUES(`country`),
            `state`         = VALUES(`state`),
            `city`          = VALUES(`city`),
            `updated_at`    = CURRENT_TIMESTAMP
    ");

    $stmt->execute([
        ':user_id'       => $userId,
        ':ward'          => $ward,
        ':stake'         => $stake,
        ':bio'           => $bio,
        ':show_whatsapp' => $showWhatsapp ? 1 : 0,
        ':country'       => $country,
        ':state'         => $state,
        ':city'          => $city,
    ]);

    // -------------------------------------------------------------------------
    // 10. RESPUESTA DE ÉXITO — HTTP 200
    // -------------------------------------------------------------------------
    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Perfil actualizado exitosamente.',
        'data'    => [
            'userId'       => $userId,
            'ward'         => $ward,
            'stake'        => $stake,
            'bio'          => $bio,
            'showWhatsapp' => $showWhatsapp,
            'country'      => $country,
            'state'        => $state,
            'city'         => $city,
        ]
    ]);

} catch (PDOException $e) {

    // Error de FK (user_id no existe en users) — SQLSTATE 23000
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Error de integridad: el usuario no es válido.',
            'data'    => []
        ]);
        exit;
    }

    // Error interno — no exponer detalles de la excepción al cliente
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor. Intenta más tarde.',
        'data'    => []
    ]);
}
