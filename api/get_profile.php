<?php
// =============================================================================
// api/get_profile.php — Obtener perfil completo de un usuario
// =============================================================================
// Método : GET
// Params : ?userId=INT
// Returns: { status, data: { userId, fullName, email, ward, stake, bio,
//             showWhatsapp, country, state, city, instagram, facebook } }
// JOINs  : users + profiles (LEFT) + social_networks (LEFT, agrupadas)
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$userId = isset($_GET['userId']) ? (int) $_GET['userId'] : 0;
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno de servidor.']);
    exit;
}

try {
    // ── Datos base: users + profiles ─────────────────────────────────────────
    $stmt = $pdo->prepare('
        SELECT
            u.id            AS userId,
            u.full_name     AS fullName,
            u.email,
            COALESCE(p.ward,          \'\')    AS ward,
            COALESCE(p.stake,         \'\')    AS stake,
            COALESCE(p.bio,           \'\')    AS bio,
            COALESCE(p.show_whatsapp, 0)      AS showWhatsapp,
            p.country,
            p.state,
            p.city
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.id = :userId
        LIMIT 1
    ');
    $stmt->execute([':userId' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado.']);
        exit;
    }

    // Castear tipos correctos
    $row['userId']       = (int)  $row['userId'];
    $row['showWhatsapp'] = (bool) $row['showWhatsapp'];

    // ── Redes sociales ────────────────────────────────────────────────────────
    $stmtSoc = $pdo->prepare('
        SELECT network_type, handle
        FROM social_networks
        WHERE user_id = :userId
    ');
    $stmtSoc->execute([':userId' => $userId]);
    $socRows = $stmtSoc->fetchAll(PDO::FETCH_ASSOC);

    $row['instagram'] = '';
    $row['facebook']  = '';
    foreach ($socRows as $soc) {
        if ($soc['network_type'] === 'instagram') $row['instagram'] = $soc['handle'];
        if ($soc['network_type'] === 'facebook')  $row['facebook']  = $soc['handle'];
    }

    echo json_encode(['status' => 'success', 'data' => $row]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener el perfil.']);
}
