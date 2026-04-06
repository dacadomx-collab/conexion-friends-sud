<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/login.php
 * ENDPOINT  : POST /api/login.php
 * CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md | 03_CONTRATOS_API_Y_LOGICA.md
 * ALCANCE   : SELECT en tabla `users` ÚNICAMENTE.
 *             Verifica credenciales; nunca devuelve password_hash al Front.
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. CENTRALIZACIÓN — CORS, cabeceras y clase Database
// -----------------------------------------------------------------------------
require_once 'conexion.php';

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
// 3. LECTURA Y DECODIFICACIÓN DEL PAYLOAD JSON
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
// 4. EXTRACCIÓN DE CAMPOS
//    camelCase (Front) → variables PHP locales
//    Fuente de verdad: Contrato login.php en 03_CONTRATOS_API_Y_LOGICA.md
// -----------------------------------------------------------------------------
$email    = isset($payload['email'])    ? trim((string) $payload['email'])    : null;
$password = isset($payload['password']) ? (string) $payload['password']       : null;

// -----------------------------------------------------------------------------
// 5. VALIDACIONES
// -----------------------------------------------------------------------------

// 5.1 — Presencia obligatoria de ambos campos
$missingFields = [];
if (empty($email))    $missingFields[] = 'email';
if (empty($password)) $missingFields[] = 'password';

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Campos obligatorios faltantes: ' . implode(', ', $missingFields) . '.',
        'data'    => []
    ]);
    exit;
}

// 5.2 — Formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El formato del correo electrónico no es válido.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 6. CONEXIÓN PDO — vía clase centralizada Database (conexion.php)
// -----------------------------------------------------------------------------
$db  = new Database();
$pdo = $db->getConnection();

// -----------------------------------------------------------------------------
// 7. BÚSQUEDA DEL USUARIO POR EMAIL
//    Solo se seleccionan los campos estrictamente necesarios.
//    password_hash se usa ÚNICAMENTE para verificación; nunca sale en respuesta.
// -----------------------------------------------------------------------------
$stmt = $pdo->prepare("
    SELECT `id`, `full_name`, `email`, `password_hash`
    FROM   `users`
    WHERE  `email` = :email
    LIMIT  1
");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

// -----------------------------------------------------------------------------
// 8. VERIFICACIÓN DE CREDENCIALES
//    Si el usuario no existe O la contraseña es incorrecta → HTTP 401.
//    Respuesta idéntica en ambos casos (evita enumeración de emails).
// -----------------------------------------------------------------------------
if ($user === false || !password_verify($password, $user['password_hash'])) {
    unset($password);
    http_response_code(401);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Credenciales incorrectas.',
        'data'    => []
    ]);
    exit;
}

unset($password);

// -----------------------------------------------------------------------------
// 9. RESPUESTA DE ÉXITO — HTTP 200
//    Contrato exacto de 03_CONTRATOS_API_Y_LOGICA.md
//    password_hash NUNCA se incluye (Codex: "nunca se devuelve al Front")
// -----------------------------------------------------------------------------
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => 'Inicio de sesión exitoso.',
    'data'    => [
        'id'       => (int) $user['id'],
        'fullName' => $user['full_name'],
        'email'    => $user['email'],
    ]
]);
