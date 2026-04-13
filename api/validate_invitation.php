<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: validate_invitation.php
// Método:   POST
// Acceso:   Público — sin autenticación
// Función:  Valida la "Contraseña de Invitación Master".
//           Compara la entrada contra el hash más reciente en
//           invitation_password_log. Si coincide → 200 success.
// =============================================================================
require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$body           = json_decode(file_get_contents('php://input'), true);
$invitePassword = trim((string)($body['invitePassword'] ?? ''));

if ($invitePassword === '') {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La contraseña de invitación es requerida.',
        'data'    => [],
    ]);
    exit;
}

$db = (new Database())->getConnection();

// Recuperar el hash activo (el más reciente)
$stmt = $db->prepare(
    "SELECT password_hash
     FROM   invitation_password_log
     ORDER  BY created_at DESC
     LIMIT  1"
);
$stmt->execute();
$row = $stmt->fetch();

if (!$row) {
    // No hay contraseña configurada aún
    http_response_code(503);
    echo json_encode([
        'status'  => 'error',
        'message' => 'No hay contraseña de invitación configurada. Contacta al administrador.',
        'data'    => [],
    ]);
    exit;
}

if (!password_verify($invitePassword, $row['password_hash'])) {
    http_response_code(401);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Contraseña de invitación incorrecta.',
        'data'    => [],
    ]);
    exit;
}

// Contraseña válida
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => 'Acceso concedido.',
    'data'    => [],
]);
