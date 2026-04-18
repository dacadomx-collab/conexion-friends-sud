<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/register.php
 * ENDPOINT  : POST /api/register.php
 * CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md | 03_CONTRATOS_API_Y_LOGICA.md
 * ALCANCE   : INSERT en tabla `users` ÚNICAMENTE.
 *             No toca: profiles, profile_photos, social_networks.
 * REGLA     : full_name y birth_date son INMUTABLES post-registro.
 *             Este endpoint es su único punto de escritura (Regla de Piedra 1).
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
// 5. EXTRACCIÓN DE CAMPOS
//    camelCase (Front) → variables PHP locales
//    Fuente de verdad: Contrato register.php en 03_CONTRATOS_API_Y_LOGICA.md
// -----------------------------------------------------------------------------
$fullName              = isset($payload['fullName'])              ? trim((string) $payload['fullName'])    : null;
$email                 = isset($payload['email'])                 ? trim((string) $payload['email'])       : null;
$phone                 = isset($payload['phone'])                 ? trim((string) $payload['phone'])       : null;
$birthDate             = isset($payload['birthDate'])             ? trim((string) $payload['birthDate'])   : null;
$password              = isset($payload['password'])              ? $payload['password']                   : null;
$gender                = isset($payload['gender'])                ? trim((string) $payload['gender'])      : null;
$acceptedCodeOfConduct = $payload['acceptedCodeOfConduct'] ?? null;

// -----------------------------------------------------------------------------
// 6. VALIDACIONES — Blindaje Técnico (Reglas de Piedra)
// -----------------------------------------------------------------------------

// 6.1 — Presencia obligatoria de todos los campos
$missingFields = [];
if (empty($fullName))              $missingFields[] = 'fullName';
if (empty($email))                 $missingFields[] = 'email';
if (empty($phone))                 $missingFields[] = 'phone';
if (empty($birthDate))             $missingFields[] = 'birthDate';
if (empty($password))              $missingFields[] = 'password';
if (empty($gender))                $missingFields[] = 'gender';
if ($acceptedCodeOfConduct === null) $missingFields[] = 'acceptedCodeOfConduct';

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Campos obligatorios faltantes: ' . implode(', ', $missingFields) . '.',
        'data'    => []
    ]);
    exit;
}

// 6.2 — acceptedCodeOfConduct: debe ser estrictamente el booleano true
//        String "true", entero 1 o cualquier otro valor son RECHAZADOS
if ($acceptedCodeOfConduct !== true) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Debes aceptar el código de conducta para registrarte.',
        'data'    => []
    ]);
    exit;
}

// 6.2b — gender: debe ser exactamente 'M' o 'F'
if ($gender !== 'M' && $gender !== 'F') {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El género debe ser "M" (Hermano) o "F" (Hermana).',
        'data'    => []
    ]);
    exit;
}

// 6.3 — Longitud de fullName (3–150 caracteres)
if (mb_strlen($fullName) < 3 || mb_strlen($fullName) > 150) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El nombre completo debe tener entre 3 y 150 caracteres.',
        'data'    => []
    ]);
    exit;
}

// 6.4 — Formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El formato del correo electrónico no es válido.',
        'data'    => []
    ]);
    exit;
}

// 6.5 — Teléfono: solo dígitos, entre 7 y 20 caracteres
if (!preg_match('/^[0-9]{7,20}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El teléfono debe contener solo dígitos (entre 7 y 20 caracteres).',
        'data'    => []
    ]);
    exit;
}

// 6.6 — Fecha de nacimiento: formato YYYY-MM-DD y debe ser fecha pasada
$parsedDate    = DateTime::createFromFormat('Y-m-d', $birthDate);
$isValidFormat = $parsedDate && $parsedDate->format('Y-m-d') === $birthDate;
$isDateInPast  = $isValidFormat && $parsedDate < new DateTime('today');

if (!$isValidFormat || !$isDateInPast) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La fecha de nacimiento debe ser válida (YYYY-MM-DD) y anterior a hoy.',
        'data'    => []
    ]);
    exit;
}

// 6.7 — Contraseña: longitud mínima 8 caracteres
if (mb_strlen($password) < 8) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La contraseña debe tener al menos 8 caracteres.',
        'data'    => []
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 7. HASH DE CONTRASEÑA
//    PASSWORD_BCRYPT con cost 12 (Regla de Piedra — Blindaje Técnico)
//    El texto plano se destruye de memoria inmediatamente después del hash.
// -----------------------------------------------------------------------------
$passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
unset($password);

// -----------------------------------------------------------------------------
// 8. CONEXIÓN PDO — vía clase centralizada Database (conexion.php)
// -----------------------------------------------------------------------------
$db  = new Database();
$pdo = $db->getConnection();

// -----------------------------------------------------------------------------
// 8b. VALIDACIÓN DE LISTA BLANCA (whitelist_phones)
//     El teléfono debe existir en whitelist_phones con is_used = 0.
//     · No encontrado        → HTTP 403 (número no autorizado)
//     · is_used = 1          → HTTP 403 (número ya utilizado para otra cuenta)
//     Esta verificación ocurre antes de la transacción para evitar bloqueos
//     innecesarios en la tabla users ante teléfonos no autorizados.
// -----------------------------------------------------------------------------
$stmtWL = $pdo->prepare(
    'SELECT is_used FROM whitelist_phones WHERE phone = :phone LIMIT 1'
);
$stmtWL->execute([':phone' => $phone]);
$whitelistEntry = $stmtWL->fetch();

if ($whitelistEntry === false) {
    http_response_code(403);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Tu número de teléfono no está autorizado para registrarse. Solicita una invitación.',
        'data'    => [],
    ]);
    exit;
}

if ((int) $whitelistEntry['is_used'] === 1) {
    http_response_code(403);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Este número de teléfono ya fue utilizado para crear una cuenta.',
        'data'    => [],
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 9. INSERT EN TABLA `users`
//    Mapeo explícito camelCase (Front) → snake_case (DB) según Codex:
//
//      fullName              → full_name              (⛔ INMUTABLE)
//      email                 → email
//      phone                 → phone
//      birthDate             → birth_date             (⛔ INMUTABLE)
//      $passwordHash         → password_hash
//      acceptedCodeOfConduct → accepted_code_of_conduct
// -----------------------------------------------------------------------------
try {
    // -------------------------------------------------------------------------
    // 9. TRANSACCIÓN ATÓMICA — users + profiles + whitelist deben ser atómicos.
    //    Si cualquier INSERT falla, ningún cambio persiste en la base de datos.
    // -------------------------------------------------------------------------
    $pdo->beginTransaction();

    // 9a. INSERT en tabla `users`
    $stmt = $pdo->prepare("
        INSERT INTO `users`
            (`full_name`, `email`, `phone`, `birth_date`, `password_hash`, `accepted_code_of_conduct`)
        VALUES
            (:full_name, :email, :phone, :birth_date, :password_hash, :accepted_code_of_conduct)
    ");

    $stmt->execute([
        ':full_name'                => $fullName,
        ':email'                    => $email,
        ':phone'                    => $phone,
        ':birth_date'               => $birthDate,
        ':password_hash'            => $passwordHash,
        ':accepted_code_of_conduct' => 1,
    ]);

    $newUserId = (int) $pdo->lastInsertId();

    // 9b. INSERT en tabla `profiles` — siembra el género desde el registro.
    //     Columna gender: ENUM('M','F') NULL — Migración 04 ejecutada.
    //     Los demás campos del perfil se completan en /perfil (Paso 2 del onboarding).
    $stmtProfile = $pdo->prepare("
        INSERT INTO `profiles` (`user_id`, `gender`)
        VALUES (:user_id, :gender)
    ");

    $stmtProfile->execute([
        ':user_id' => $newUserId,
        ':gender'  => $gender,
    ]);

    // 9c. Marcar el número como utilizado en la Lista Blanca.
    //     is_used = 1 impide que el mismo número cree una segunda cuenta.
    //     Al estar dentro de la transacción, si algo falla el número
    //     no queda marcado y puede volver a intentar el registro.
    $stmtMarkUsed = $pdo->prepare(
        'UPDATE whitelist_phones SET is_used = 1 WHERE phone = :phone'
    );
    $stmtMarkUsed->execute([':phone' => $phone]);

    $pdo->commit();

    $createdAt = date('Y-m-d H:i:s');

    // -------------------------------------------------------------------------
    // 10. RESPUESTA DE ÉXITO — HTTP 201
    //     Contrato exacto de 03_CONTRATOS_API_Y_LOGICA.md
    //     password_hash NUNCA se incluye (Codex: "nunca se devuelve al Front")
    // -------------------------------------------------------------------------
    http_response_code(201);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Usuario registrado exitosamente.',
        'data'    => [
            'id'        => $newUserId,
            'fullName'  => $fullName,
            'email'     => $email,
            'createdAt' => $createdAt,
        ]
    ]);

} catch (PDOException $e) {

    // Revertir la transacción si algo falló a mitad
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // -------------------------------------------------------------------------
    // 11. CAPTURA DE ERROR — Email duplicado (SQLSTATE 23000)
    //     Violación de UNIQUE KEY `uq_users_email` en tabla `users`
    // -------------------------------------------------------------------------
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Este correo electrónico ya está registrado.',
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
