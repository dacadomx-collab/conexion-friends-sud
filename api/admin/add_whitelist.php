<?php
// =============================================================================
// api/admin/add_whitelist.php — Agregar número a la Lista Blanca (Admin)
// =============================================================================
// Método : POST JSON
// Payload: { "phone": string, "requesterId": int, "groupJoinDate": string (YYYY-MM-DD, opcional) }
// Returns: { "status": "success", "data": { "phone": string } }
//          HTTP 409 si el número ya existe en whitelist_phones
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

try {
    $body = (string) file_get_contents('php://input');
    $input = json_decode($body, true);

    $requesterId = isset($input['requesterId']) ? (int)    $input['requesterId']    : 0;
    $rawPhone    = isset($input['phone'])       ? (string) $input['phone']         : '';
    $rawDate     = isset($input['groupJoinDate']) ? trim((string) $input['groupJoinDate']) : '';

    if ($requesterId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
        exit;
    }

    // Sanitización Estrella: solo dígitos
    $phone = preg_replace('/[^0-9]/', '', $rawPhone);

    if ($phone === '' || strlen($phone) < 7 || strlen($phone) > 20) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'El número de teléfono debe contener entre 7 y 20 dígitos.']);
        exit;
    }

    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar que el solicitante sea admin
    $stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso restringido a administradores.']);
        exit;
    }

    // Normalizar fecha: YYYY-MM-DD válido o fecha de hoy como fallback
    $groupJoinDate = date('Y-m-d');
    if ($rawDate !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawDate)) {
        $parts = explode('-', $rawDate);
        if (checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0])) {
            $groupJoinDate = $rawDate;
        }
    }

    // Verificar duplicado
    $stmtCheck = $pdo->prepare('SELECT phone FROM whitelist_phones WHERE phone = :phone LIMIT 1');
    $stmtCheck->execute([':phone' => $phone]);
    if ($stmtCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Este número ya existe en la lista blanca.']);
        exit;
    }

    // Insertar
    $stmtInsert = $pdo->prepare(
        'INSERT INTO whitelist_phones (phone, is_used, group_join_date, added_by, created_at)
         VALUES (:phone, 0, :gjd, :added_by, NOW())'
    );
    $stmtInsert->execute([
        ':phone'    => $phone,
        ':gjd'      => $groupJoinDate,
        ':added_by' => $requesterId,
    ]);

    http_response_code(201);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Número agregado a la lista blanca.',
        'data'    => ['phone' => $phone],
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['status' => 'error', 'message' => 'Error interno al agregar el número.']);
}
