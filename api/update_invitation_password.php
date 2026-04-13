<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: update_invitation_password.php
// Método:   POST  (Content-Type: application/json)
// Acceso:   Solo administradores (role = 'admin')
// Función:  Genera un hash bcrypt de la nueva contraseña de invitación y lo
//           inserta en invitation_password_log junto al ID del admin.
//           La fila más reciente de esa tabla será la contraseña activa.
// Payload:
//   { "requesterId": int, "newInvitePassword": string (min 6 chars) }
// =============================================================================
require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$body        = json_decode(file_get_contents('php://input'), true);
$requesterId = filter_var($body['requesterId'] ?? null, FILTER_VALIDATE_INT);
$newPassword = (string)($body['newInvitePassword'] ?? '');

// ── Validaciones de input (antes de tocar la DB) ──────────────────────────────
if (!$requesterId || $requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.', 'data' => []]);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La contraseña de invitación debe tener al menos 6 caracteres.',
        'data'    => [],
    ]);
    exit;
}

try {
    $db = (new Database())->getConnection();

    // ── Verificar que requesterId sea admin ───────────────────────────────────
    $check = $db->prepare("SELECT role FROM users WHERE id = :id LIMIT 1");
    $check->execute([':id' => $requesterId]);
    $admin = $check->fetch();

    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Acceso denegado. Solo administradores pueden realizar esta acción.',
            'data'    => [],
        ]);
        exit;
    }

    // ── Hashear y registrar ───────────────────────────────────────────────────
    $plainCode = $newPassword;                                          // Guardar antes de unset
    $hash      = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    unset($newPassword);                                                // Destruir texto plano

    $insert = $db->prepare(
        "INSERT INTO invitation_password_log (admin_id, plain_code, password_hash)
         VALUES (:admin_id, :plain_code, :password_hash)"
    );
    $insert->execute([
        ':admin_id'      => $requesterId,
        ':plain_code'    => $plainCode,
        ':password_hash' => $hash,
    ]);
    unset($plainCode);                                                  // Destruir de memoria

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Contraseña de invitación actualizada correctamente.',
        'data'    => [],
    ]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor. No se pudo guardar la contraseña.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
