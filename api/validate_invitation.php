<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: validate_invitation.php
// Método:   POST
// Acceso:   Público — sin autenticación
// Función:  Valida la "Contraseña de Invitación Master" con protección
//           Anti-Fuerza Bruta usando la tabla gatekeeper_security por IP.
//
// Lógica de intentos:
//   attempts == 1  → HTTP 401, mensaje estándar de contraseña incorrecta
//   attempts == 2  → HTTP 401, status "warning" (último intento)
//   attempts >= 3  → HTTP 429, IP bloqueada 3 horas
//   Contraseña OK  → HTTP 200, reinicia attempts y blocked_until
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

// ── Obtener IP del cliente (con soporte para proxies) ─────────────────────────
$ip = 'unknown';
foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
    if (!empty($_SERVER[$key])) {
        // Tomar solo la primera IP si hay lista separada por comas
        $ip = trim(explode(',', $_SERVER[$key])[0]);
        break;
    }
}
// Normalizar y validar formato IP (IPv4 e IPv6, máx 45 chars)
if (!filter_var($ip, FILTER_VALIDATE_IP)) {
    $ip = 'invalid';
}

try {
    $db = (new Database())->getConnection();

    // ── 1. Consultar registro de seguridad para esta IP ───────────────────────
    $checkStmt = $db->prepare(
        "SELECT id, attempts, blocked_until
         FROM   gatekeeper_security
         WHERE  ip_address = :ip
         LIMIT  1"
    );
    $checkStmt->execute([':ip' => $ip]);
    $record = $checkStmt->fetch();

    // ── 2. Verificar si la IP está actualmente bloqueada ──────────────────────
    if ($record && !empty($record['blocked_until'])) {
        $now          = new \DateTime('now',                      new \DateTimeZone('UTC'));
        $blockedUntil = new \DateTime($record['blocked_until'],   new \DateTimeZone('UTC'));

        if ($now < $blockedUntil) {
            $diff      = $now->diff($blockedUntil);
            $minsLeft  = max(1, $diff->h * 60 + $diff->i + ($diff->s > 0 ? 1 : 0));

            http_response_code(429);
            echo json_encode([
                'status'       => 'blocked',
                'message'      => "Tu dirección IP está bloqueada por demasiados intentos fallidos. "
                                . "Podrás intentarlo en aproximadamente {$minsLeft} minuto(s).",
                'blockedUntil' => $record['blocked_until'],
                'data'         => [],
            ]);
            exit;
        }
    }

    // ── 3. Obtener el hash de la contraseña activa ────────────────────────────
    $hashStmt = $db->prepare(
        "SELECT password_hash
         FROM   invitation_password_log
         ORDER  BY created_at DESC
         LIMIT  1"
    );
    $hashStmt->execute();
    $hashRow = $hashStmt->fetch();

    if (!$hashRow) {
        http_response_code(503);
        echo json_encode([
            'status'  => 'error',
            'message' => 'No hay contraseña de invitación configurada. Contacta al administrador.',
            'data'    => [],
        ]);
        exit;
    }

    // ── 4. Verificar la contraseña ────────────────────────────────────────────
    if (!password_verify($invitePassword, $hashRow['password_hash'])) {

        $currentAttempts = $record ? (int)$record['attempts'] : 0;
        $newAttempts     = $currentAttempts + 1;

        if ($newAttempts >= 3) {
            // Bloquear la IP por 3 horas
            $upsertStmt = $db->prepare(
                "INSERT INTO gatekeeper_security
                     (ip_address, attempts, blocked_until, last_attempt_at)
                 VALUES
                     (:ip, :atts, DATE_ADD(NOW(), INTERVAL 3 HOUR), NOW())
                 ON DUPLICATE KEY UPDATE
                     attempts        = :atts_u,
                     blocked_until   = DATE_ADD(NOW(), INTERVAL 3 HOUR),
                     last_attempt_at = NOW()"
            );
            $upsertStmt->execute([
                ':ip'     => $ip,
                ':atts'   => $newAttempts,
                ':atts_u' => $newAttempts,
            ]);

            http_response_code(429);
            echo json_encode([
                'status'  => 'blocked',
                'message' => 'Has excedido el número de intentos permitidos. '
                           . 'Tu dirección IP ha sido bloqueada por 3 horas.',
                'data'    => [],
            ]);

        } else {
            // Registrar el intento sin bloquear
            $upsertStmt = $db->prepare(
                "INSERT INTO gatekeeper_security
                     (ip_address, attempts, blocked_until, last_attempt_at)
                 VALUES
                     (:ip, :atts, NULL, NOW())
                 ON DUPLICATE KEY UPDATE
                     attempts        = :atts_u,
                     blocked_until   = NULL,
                     last_attempt_at = NOW()"
            );
            $upsertStmt->execute([
                ':ip'     => $ip,
                ':atts'   => $newAttempts,
                ':atts_u' => $newAttempts,
            ]);

            if ($newAttempts === 2) {
                // Último intento disponible — advertencia visible
                http_response_code(401);
                echo json_encode([
                    'status'  => 'warning',
                    'message' => 'Contraseña incorrecta. Tienes un ÚLTIMO INTENTO '
                               . 'antes de que tu IP sea bloqueada por 3 horas.',
                    'data'    => [],
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Contraseña de invitación incorrecta.',
                    'data'    => [],
                ]);
            }
        }

        exit;
    }

    // ── 5. Contraseña correcta — limpiar registro de seguridad ───────────────
    $resetStmt = $db->prepare(
        "INSERT INTO gatekeeper_security
             (ip_address, attempts, blocked_until, last_attempt_at)
         VALUES
             (:ip, 0, NULL, NOW())
         ON DUPLICATE KEY UPDATE
             attempts        = 0,
             blocked_until   = NULL,
             last_attempt_at = NOW()"
    );
    $resetStmt->execute([':ip' => $ip]);

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Acceso concedido.',
        'data'    => [],
    ]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor. Inténtalo de nuevo.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
