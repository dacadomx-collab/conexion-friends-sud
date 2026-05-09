<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/admin/reset_password.php
 * ENDPOINT  : POST /api/admin/reset_password.php
 * ALCANCE   : Admin genera una contraseña temporal para cualquier usuario.
 *             Activa must_change_password=1 para forzar cambio en el próximo login.
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

$requesterId  = isset($payload['requesterId'])  ? (int) $payload['requesterId']  : 0;
$targetUserId = isset($payload['targetUserId']) ? (int) $payload['targetUserId'] : 0;

// -----------------------------------------------------------------------------
// 3. VALIDACIONES BÁSICAS
// -----------------------------------------------------------------------------
if ($requesterId <= 0 || $targetUserId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId y targetUserId son obligatorios.', 'data' => []]);
    exit;
}

if ($requesterId === $targetUserId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No puedes resetear tu propia contraseña desde este módulo.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 4. CONEXIÓN
// -----------------------------------------------------------------------------
$db  = new Database();
$pdo = $db->getConnection();

// -----------------------------------------------------------------------------
// 5. VERIFICAR QUE EL SOLICITANTE ES ADMIN
// -----------------------------------------------------------------------------
$stmtAdmin = $pdo->prepare("SELECT `role` FROM `users` WHERE `id` = :id LIMIT 1");
$stmtAdmin->execute([':id' => $requesterId]);
$requester = $stmtAdmin->fetch();

if (!$requester || $requester['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Solo administradores pueden usar este endpoint.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 6. VERIFICAR QUE EL USUARIO OBJETIVO EXISTE
// -----------------------------------------------------------------------------
$stmtTarget = $pdo->prepare("SELECT `id`, `full_name` FROM `users` WHERE `id` = :id LIMIT 1");
$stmtTarget->execute([':id' => $targetUserId]);
$target = $stmtTarget->fetch();

if (!$target) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Usuario objetivo no encontrado.', 'data' => []]);
    exit;
}

// -----------------------------------------------------------------------------
// 7. GENERAR CONTRASEÑA TEMPORAL SEGURA
// -----------------------------------------------------------------------------
$tempPassword = generateTempPassword();
$hash         = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

// -----------------------------------------------------------------------------
// 8. ACTUALIZAR BD: nueva contraseña + activar bandera de cambio obligatorio
// -----------------------------------------------------------------------------
$stmtUpdate = $pdo->prepare("
    UPDATE `users`
    SET    `password_hash`        = :hash,
           `must_change_password` = 1
    WHERE  `id` = :id
");
$stmtUpdate->execute([
    ':hash' => $hash,
    ':id'   => $targetUserId,
]);

// -----------------------------------------------------------------------------
// 9. RESPUESTA
// -----------------------------------------------------------------------------
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => 'Contraseña temporal generada correctamente.',
    'data'    => [
        'tempPassword' => $tempPassword,
        'userName'     => $target['full_name'],
    ],
]);

// -----------------------------------------------------------------------------
// FUNCIÓN: Genera contraseña aleatoria de 12 caracteres
// Usa random_int (CSPRNG) — seguro criptográficamente
// Excluye caracteres ambiguos: 0, O, l, I, 1
// -----------------------------------------------------------------------------
function generateTempPassword(): string
{
    $chars    = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    $password = '';
    $len      = strlen($chars) - 1;
    for ($i = 0; $i < 12; $i++) {
        $password .= $chars[random_int(0, $len)];
    }
    return $password;
}
