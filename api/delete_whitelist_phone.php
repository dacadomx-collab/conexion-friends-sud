<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: api/delete_whitelist_phone.php
// Método  : POST (Content-Type: application/json)
// Acceso  : Solo administradores (role = 'admin')
// Función : Elimina un número de whitelist_phones y registra la acción en
//           whitelist_audit_log dentro de una transacción PDO atómica.
//           Si el INSERT de auditoría falla → Rollback completo (número no se borra).
// Payload :
//   { "requesterId": int, "phone": string (E.164) }
// Respuesta:
//   { status, message, data: {} }
// =============================================================================

require_once __DIR__ . '/conexion.php';

// ── Solo POST ─────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

// ── Decodificar payload JSON ──────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El cuerpo debe ser JSON válido.', 'data' => []]);
    exit;
}

// ── Extraer y validar campos ──────────────────────────────────────────────────
$requesterId = isset($body['requesterId']) ? (int) $body['requesterId'] : 0;
$phone       = isset($body['phone'])       ? trim((string) $body['phone']) : '';

if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.', 'data' => []]);
    exit;
}

// Validar formato E.164: + seguido de 7–15 dígitos
if (!preg_match('/^\+[0-9]{7,15}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'El teléfono debe estar en formato E.164 (ej: +525512345678).',
        'data'    => [],
    ]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que requesterId sea admin ───────────────────────────────────
    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtRole->execute([':id' => $requesterId]);
    $requester = $stmtRole->fetch();

    if (!$requester || $requester['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Acceso denegado. Solo administradores pueden eliminar números.',
            'data'    => [],
        ]);
        exit;
    }

    // ── Verificar que el número exista en la Lista Blanca ─────────────────────
    $stmtCheck = $pdo->prepare('SELECT phone FROM whitelist_phones WHERE phone = :phone LIMIT 1');
    $stmtCheck->execute([':phone' => $phone]);
    $existing = $stmtCheck->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'status'  => 'error',
            'message' => 'El número no existe en la Lista Blanca.',
            'data'    => [],
        ]);
        exit;
    }

    // ── TRANSACCIÓN ATÓMICA ───────────────────────────────────────────────────
    // Regla: DELETE + INSERT en whitelist_audit_log son inseparables.
    // Si alguno falla → Rollback completo (ningún cambio persiste).
    $pdo->beginTransaction();

    // 1. Eliminar de la Lista Blanca
    $stmtDel = $pdo->prepare('DELETE FROM whitelist_phones WHERE phone = :phone');
    $stmtDel->execute([':phone' => $phone]);

    if ($stmtDel->rowCount() === 0) {
        // El número desapareció entre el check y el DELETE (race condition muy improbable)
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'status'  => 'error',
            'message' => 'El número no pudo ser encontrado al momento de eliminar.',
            'data'    => [],
        ]);
        exit;
    }

    // 2. Registrar en auditoría (OBLIGATORIO — si falla, Rollback del DELETE)
    $stmtAudit = $pdo->prepare(
        'INSERT INTO whitelist_audit_log (admin_id, phone) VALUES (:admin_id, :phone)'
    );
    $stmtAudit->execute([
        ':admin_id' => $requesterId,
        ':phone'    => $phone,
    ]);

    $pdo->commit();

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => "El número {$phone} fue eliminado de la Lista Blanca y registrado en auditoría.",
        'data'    => [],
    ]);

} catch (\Throwable $e) {

    // Revertir si la transacción estaba abierta
    if (isset($pdo) && $pdo instanceof \PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor. No se realizó ningún cambio.',
        'data'    => [],
    ]);
}
