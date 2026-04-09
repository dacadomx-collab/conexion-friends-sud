<?php
// =============================================================================
// api/get_directory.php — Directorio de miembros activos (v2)
// =============================================================================
// Método : GET
// Params : (ninguno — filtra status='active' en BD)
// Returns: { status, data: Array<{
//             id, fullName, birthDate, gender, ward, stake, bio,
//             country, state, city, role, groupJoinDate,
//             phone (solo si showWhatsapp=true), showWhatsapp,
//             photoUrl,   ← foto principal (sort_order=1)
//             allPhotos,  ← array de URLs en orden
//             socials: { instagram, facebook, linkedin, twitter, tiktok, website }
//           }> }
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
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
    // ── 1. Datos base de usuarios activos ─────────────────────────────────────
    $stmt = $pdo->query('
        SELECT
            u.id                                AS id,
            u.full_name                         AS fullName,
            u.birth_date                        AS birthDate,
            u.phone                             AS phone,
            u.role                              AS role,
            COALESCE(p.gender,       \'\')      AS gender,
            COALESCE(p.ward,         \'\')      AS ward,
            COALESCE(p.stake,        \'\')      AS stake,
            COALESCE(p.bio,          \'\')      AS bio,
            COALESCE(p.show_whatsapp, 0)        AS showWhatsapp,
            COALESCE(p.country,      \'\')      AS country,
            COALESCE(p.state,        \'\')      AS state,
            COALESCE(p.city,         \'\')      AS city,
            p.group_join_date                   AS groupJoinDate,
            pp.photo_url                        AS photoUrl
        FROM users u
        LEFT JOIN profiles p
               ON p.user_id = u.id
        LEFT JOIN profile_photos pp
               ON pp.user_id = u.id AND pp.sort_order = 1
        WHERE u.status = \'active\'
        ORDER BY u.full_name ASC
    ');

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rows)) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit;
    }

    // ── 2. Recopilar IDs para queries secundarios ─────────────────────────────
    $ids = implode(',', array_map(static fn($r): int => (int) $r['id'], $rows));

    // ── 3. Todas las fotos ────────────────────────────────────────────────────
    $photosMap = [];
    foreach (
        $pdo->query("
            SELECT user_id, photo_url
            FROM   profile_photos
            WHERE  user_id IN ({$ids})
            ORDER  BY user_id ASC, sort_order ASC
        ")->fetchAll(PDO::FETCH_ASSOC)
        as $ph
    ) {
        $photosMap[(int) $ph['user_id']][] = $ph['photo_url'];
    }

    // ── 4. Redes sociales ─────────────────────────────────────────────────────
    $socialsMap = [];
    foreach (
        $pdo->query("
            SELECT user_id, network_type, handle
            FROM   social_networks
            WHERE  user_id IN ({$ids})
        ")->fetchAll(PDO::FETCH_ASSOC)
        as $soc
    ) {
        $socialsMap[(int) $soc['user_id']][$soc['network_type']] = $soc['handle'];
    }

    $emptySocials = [
        'instagram' => '', 'facebook'  => '', 'linkedin' => '',
        'twitter'   => '', 'tiktok'    => '', 'website'  => '',
    ];

    // ── 5. Componer respuesta ─────────────────────────────────────────────────
    $data = [];
    foreach ($rows as $r) {
        $uid  = (int) $r['id'];
        $show = (bool) $r['showWhatsapp'];

        $data[] = [
            'id'            => $uid,
            'fullName'      => $r['fullName'],
            'birthDate'     => $r['birthDate'] ?? null,
            'gender'        => $r['gender'],
            'ward'          => $r['ward'],
            'stake'         => $r['stake'],
            'bio'           => $r['bio'],
            'showWhatsapp'  => $show,
            'phone'         => $show ? $r['phone'] : null,
            'country'       => $r['country'],
            'state'         => $r['state'],
            'city'          => $r['city'],
            'role'          => $r['role'] ?? 'user',
            'groupJoinDate' => $r['groupJoinDate'] ?? null,
            'photoUrl'      => $r['photoUrl'] ?? null,
            'allPhotos'     => array_values($photosMap[$uid] ?? []),
            'socials'       => array_merge($emptySocials, (array) ($socialsMap[$uid] ?? [])),
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $data]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener el directorio.']);
}
