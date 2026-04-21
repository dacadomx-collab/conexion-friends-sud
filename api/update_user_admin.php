<?php
// =============================================================================
// api/update_user_admin.php — Actualizar rol, estatus y fecha de ingreso
// =============================================================================
// Método : POST (JSON)
// Body   : { requesterId, targetUserId, newRole, newStatus, newJoinDate }
// Seguridad: Si requesterId no es admin → HTTP 403
//            Un admin no puede degradarse a sí mismo (integridad de sesión)
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON inválido.']);
    exit;
}

$requesterId  = isset($payload['requesterId'])  ? (int)    $payload['requesterId']  : 0;
$targetUserId = isset($payload['targetUserId']) ? (int)    $payload['targetUserId'] : 0;
$newRole      = isset($payload['newRole'])      ? trim((string) $payload['newRole'])      : '';
$newStatus    = isset($payload['newStatus'])    ? trim((string) $payload['newStatus'])    : '';
$newJoinDate  = isset($payload['newJoinDate'])  ? trim((string) $payload['newJoinDate'])  : null;

// ── Validaciones básicas ──────────────────────────────────────────────────────
if ($requesterId <= 0 || $targetUserId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId y targetUserId son obligatorios.']);
    exit;
}

$validRoles    = ['admin', 'user'];
$validStatuses = ['active', 'inactive', 'blocked', 'pending'];

if (!in_array($newRole, $validRoles, true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Rol inválido. Valores permitidos: " . implode(', ', $validRoles)]);
    exit;
}

if (!in_array($newStatus, $validStatuses, true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Estatus inválido. Valores permitidos: " . implode(', ', $validStatuses)]);
    exit;
}

// Validar fecha si se proporcionó
$joinDate = null;
if (!empty($newJoinDate)) {
    $d = \DateTime::createFromFormat('Y-m-d', $newJoinDate);
    if (!$d || $d->format('Y-m-d') !== $newJoinDate) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Formato de fecha inválido. Se espera YYYY-MM-DD.']);
        exit;
    }
    $joinDate = $newJoinDate;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que el solicitante sea admin ────────────────────────────────
    $stmtRole = $pdo->prepare('SELECT role, full_name FROM users WHERE id = :id LIMIT 1');
    $stmtRole->execute([':id' => $requesterId]);
    $requester = $stmtRole->fetch();

    if (!$requester || $requester['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso denegado. Se requiere rol de administrador.']);
        exit;
    }

    // ── Guardia: un admin no puede degradar su propio rol ─────────────────────
    if ($requesterId === $targetUserId && $newRole !== 'admin') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No puedes cambiar tu propio rol de administrador.']);
        exit;
    }

    // Obtener nombre y estado actual del usuario objetivo para trazabilidad
    $stmtTarget = $pdo->prepare('SELECT full_name, status FROM users WHERE id = :id LIMIT 1');
    $stmtTarget->execute([':id' => $targetUserId]);
    $targetUser = $stmtTarget->fetch();

    $pdo->beginTransaction();

    // ── Actualizar tabla users ─────────────────────────────────────────────────
    $stmtUser = $pdo->prepare('
        UPDATE users
        SET role = :role, status = :status
        WHERE id = :targetId
    ');
    $stmtUser->execute([
        ':role'     => $newRole,
        ':status'   => $newStatus,
        ':targetId' => $targetUserId,
    ]);

    // ── Trazabilidad: loggear cuando admin oculta un usuario ──────────────────
    // Si el status anterior era active/pending y el nuevo es inactive → baja por admin
    $prevStatus = $targetUser ? (string) $targetUser['status'] : '';
    if ($newStatus === 'inactive' && $prevStatus !== 'inactive') {
        $stmtDep = $pdo->prepare(
            'INSERT INTO user_departures_log (user_name, action, acted_by, admin_name)
             VALUES (:user_name, :action, :acted_by, :admin_name)'
        );
        $stmtDep->execute([
            ':user_name'  => $targetUser ? (string) $targetUser['full_name'] : "ID #{$targetUserId}",
            ':action'     => 'hidden',
            ':acted_by'   => 'admin',
            ':admin_name' => (string) $requester['full_name'],
        ]);
    }

    // ── Actualizar tabla profiles (group_join_date) ───────────────────────────
    if ($joinDate !== null) {
        // Upsert: si no tiene perfil aún, crea el registro
        $stmtProf = $pdo->prepare('
            INSERT INTO profiles (user_id, group_join_date)
            VALUES (:userId, :joinDate)
            ON DUPLICATE KEY UPDATE group_join_date = :joinDate2
        ');
        $stmtProf->execute([
            ':userId'    => $targetUserId,
            ':joinDate'  => $joinDate,
            ':joinDate2' => $joinDate,
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Usuario actualizado correctamente.',
    ]);

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo instanceof \PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno del servidor.']);
}
