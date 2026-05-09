<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/account/change_password_forced.php
 * ENDPOINT  : POST /api/account/change_password_forced.php
 * ALCANCE   : Usuario con must_change_password=1 establece su nueva contraseña.
 *             Solo opera si la bandera está activa — previene uso arbitrario.
 * =============================================================================
 */

require_once __DIR__ . '/../conexion.php';

// -----------------------------------------------------------------------------
// 1. RESTRICCIÓN DE MÉTODO
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido. Se requiere POST.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 2. LECTURA DEL PAYLOAD
// -----------------------------------------------------------------------------
$payload = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El cuerpo debe ser JSON válido.', 'data' => []]);
    exit;
}

$userId      = isset($payload['userId'])      ? (int)    $payload['userId']          : 0;
$newPassword = isset($payload['newPassword']) ? (string) $payload['newPassword']     : '';

// -----------------------------------------------------------------------------
// 3. VALIDACIONES
// -----------------------------------------------------------------------------
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId es obligatorio.', 'data' => []]);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'La nueva contraseña debe tener al menos 8 caracteres.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 4. CONEXIÓN
// -----------------------------------------------------------------------------
$db  = new Database();
$pdo = $db->getConnection();

// -----------------------------------------------------------------------------
// 5. VERIFICAR QUE EL USUARIO EXISTE Y TIENE LA BANDERA ACTIVA
// -----------------------------------------------------------------------------
$stmt = $pdo->prepare("
    SELECT `id`, `must_change_password`
    FROM   `users`
    WHERE  `id` = :id
    LIMIT  1
");
$stmt->execute([':id' => $userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.', 'data' => []]);
    exit;
}

if ((int) $user['must_change_password'] !== 1) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Este usuario no tiene un cambio de contraseña pendiente.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 6. ACTUALIZAR CONTRASEÑA Y LIMPIAR BANDERA
// -----------------------------------------------------------------------------
$hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
unset($newPassword);

$stmtUpdate = $pdo->prepare("
    UPDATE `users`
    SET    `password_hash`        = :hash,
           `must_change_password` = 0
    WHERE  `id` = :id
");
$stmtUpdate->execute([':hash' => $hash, ':id' => $userId]);

// -----------------------------------------------------------------------------
// 7. RESPUESTA
// -----------------------------------------------------------------------------
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => 'Contraseña actualizada correctamente. Ya puedes ingresar a la plataforma.',
    'data'    => [],
]);
