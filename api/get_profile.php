<?php
// =============================================================================
// api/get_profile.php — Obtener perfil completo de un usuario
// =============================================================================
// Método : GET
// Params : ?userId=INT
// Returns: { status, data: {
//     userId, fullName, email,
//     ward, stake, bio, showWhatsapp, country, state, city,
//     socials: { instagram, facebook, linkedin, twitter, tiktok, website },
//     photos:  [ { photoUrl, sortOrder }, ... ]   ← ordenadas por sort_order
// }}
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
    // ── 1. Datos base: users + profiles ───────────────────────────────────────
    $stmt = $pdo->prepare('
        SELECT
            u.id                             AS userId,
            u.full_name                      AS fullName,
            u.email,
            COALESCE(p.ward,   \'\')         AS ward,
            COALESCE(p.stake,  \'\')         AS stake,
            COALESCE(p.bio,    \'\')         AS bio,
            COALESCE(p.show_whatsapp, 0)     AS showWhatsapp,
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

    $row['userId']       = (int)  $row['userId'];
    $row['showWhatsapp'] = (bool) $row['showWhatsapp'];

    // ── 2. Redes sociales → objeto keyed por network_type ─────────────────────
    $stmtSoc = $pdo->prepare('
        SELECT network_type, handle
        FROM social_networks
        WHERE user_id = :userId
    ');
    $stmtSoc->execute([':userId' => $userId]);
    $socRows = $stmtSoc->fetchAll(PDO::FETCH_ASSOC);

    $socials = [
        'instagram' => '',
        'facebook'  => '',
        'linkedin'  => '',
        'twitter'   => '',
        'tiktok'    => '',
        'website'   => '',
    ];
    foreach ($socRows as $soc) {
        if (isset($socials[$soc['network_type']])) {
            $socials[$soc['network_type']] = $soc['handle'];
        }
    }
    $row['socials'] = $socials;

    // ── 3. Fotos de perfil ordenadas por sort_order ───────────────────────────
    $stmtPh = $pdo->prepare('
        SELECT photo_url AS photoUrl, sort_order AS sortOrder
        FROM profile_photos
        WHERE user_id = :userId
        ORDER BY sort_order ASC
    ');
    $stmtPh->execute([':userId' => $userId]);
    $photos = $stmtPh->fetchAll(PDO::FETCH_ASSOC);

    foreach ($photos as &$ph) {
        $ph['sortOrder'] = (int) $ph['sortOrder'];
    }
    unset($ph);

    $row['photos'] = $photos;

    echo json_encode(['status' => 'success', 'data' => $row]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener el perfil.']);
}
