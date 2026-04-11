<?php
// =============================================================================
// api/get_directory.php — Directorio de miembros activos (v3 — definitivo)
// =============================================================================
// Método : GET  |  Sin parámetros requeridos
// Filtro : users.status = 'active'
// Schema : 02_SYSTEM_CODEX_REGISTRY.md — tablas: users, profiles,
//          profile_photos, social_networks
// Returns:
//   { status: "success", data: Member[] }
//   { status: "error",   message: string }
//
// Member = {
//   id, fullName, birthDate, gender, ward, stake, bio,
//   showWhatsapp, phone|null, country, state, city,
//   role, groupJoinDate|null,
//   photoUrl|null, allPhotos: string[],
//   socials: { instagram, facebook, linkedin, twitter, tiktok, website }
// }
// =============================================================================

declare(strict_types=1);

// Captura cualquier error PHP no-excepción y lo convierte en \ErrorException
set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/conexion.php';

// ── Solo GET ──────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

// Constantes vacías para redes sociales (según schema social_networks)
const EMPTY_SOCIALS = [
    'instagram' => '',
    'facebook'  => '',
    'linkedin'  => '',
    'twitter'   => '',
    'tiktok'    => '',
    'website'   => '',
];

// ── Conexión ──────────────────────────────────────────────────────────────────
try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error de conexión a la base de datos.']);
    exit;
}

// ── Lógica principal ──────────────────────────────────────────────────────────
try {

    // ── 1. Usuarios activos con perfil y foto principal ───────────────────────
    // Columnas según schema documentado en 02_SYSTEM_CODEX_REGISTRY.md:
    //   users: id, full_name, birth_date, phone, role, status
    //   profiles: gender (Migr.04), ward, stake, bio, show_whatsapp,
    //             country, state, city, group_join_date (Migr.03)
    //   profile_photos: photo_url (sort_order=1 = foto principal)
    $stmt = $pdo->prepare("
        SELECT
            u.id                                AS id,
            u.full_name                         AS fullName,
            u.birth_date                        AS birthDate,
            u.phone                             AS phone,
            u.role                              AS role,
            COALESCE(p.gender,        '')       AS gender,
            COALESCE(p.ward,          '')       AS ward,
            COALESCE(p.stake,         '')       AS stake,
            COALESCE(p.bio,           '')       AS bio,
            COALESCE(p.show_whatsapp, 0)        AS showWhatsapp,
            COALESCE(p.country,       '')       AS country,
            COALESCE(p.state,         '')       AS state,
            COALESCE(p.city,          '')       AS city,
            p.group_join_date                   AS groupJoinDate,
            pp.photo_url                        AS photoUrl
        FROM users u
        LEFT JOIN profiles p
               ON p.user_id = u.id
        LEFT JOIN profile_photos pp
               ON pp.user_id = u.id AND pp.sort_order = 1
        WHERE u.status = 'active'
        ORDER BY u.full_name ASC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Sin miembros activos → respuesta vacía válida (no es error)
    if (empty($rows)) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit;
    }

    // ── 2. IDs para los queries secundarios ───────────────────────────────────
    $ids = implode(',', array_map(static fn (array $r): int => (int) $r['id'], $rows));

    // ── 3. Todas las fotos (tabla profile_photos) ─────────────────────────────
    // sort_order 1..5, ordenadas para que la principal quede primera
    $photosMap = [];
    $stmtPh    = $pdo->query("
        SELECT user_id, photo_url
        FROM   profile_photos
        WHERE  user_id IN ({$ids})
        ORDER  BY user_id ASC, sort_order ASC
    ");
    if ($stmtPh !== false) {
        foreach ($stmtPh->fetchAll(PDO::FETCH_ASSOC) as $ph) {
            $uid = (int) $ph['user_id'];
            if (isset($ph['photo_url']) && $ph['photo_url'] !== '') {
                $photosMap[$uid][] = (string) $ph['photo_url'];
            }
        }
    }

    // ── 4. Redes sociales (tabla social_networks) ─────────────────────────────
    // network_type: instagram | facebook | linkedin | twitter | tiktok | website
    $socialsMap = [];
    $stmtSoc    = $pdo->query("
        SELECT user_id, network_type, handle
        FROM   social_networks
        WHERE  user_id IN ({$ids})
          AND  handle IS NOT NULL
          AND  handle <> ''
    ");
    if ($stmtSoc !== false) {
        foreach ($stmtSoc->fetchAll(PDO::FETCH_ASSOC) as $soc) {
            $uid = (int) $soc['user_id'];
            $nt  = (string) $soc['network_type'];
            if (array_key_exists($nt, EMPTY_SOCIALS)) {
                $socialsMap[$uid][$nt] = (string) $soc['handle'];
            }
        }
    }

    // ── 5. Componer la respuesta final ────────────────────────────────────────
    $data = [];
    foreach ($rows as $r) {
        $uid  = (int) $r['id'];
        $show = (bool) $r['showWhatsapp'];

        $data[] = [
            'id'            => $uid,
            'fullName'      => (string)  ($r['fullName']      ?? ''),
            'birthDate'     => !empty($r['birthDate'])     ? (string) $r['birthDate']     : null,
            'gender'        => (string)  ($r['gender']        ?? ''),
            'ward'          => (string)  ($r['ward']          ?? ''),
            'stake'         => (string)  ($r['stake']         ?? ''),
            'bio'           => (string)  ($r['bio']           ?? ''),
            'showWhatsapp'  => $show,
            'phone'         => $show && !empty($r['phone'])  ? (string) $r['phone']       : null,
            'country'       => (string)  ($r['country']       ?? ''),
            'state'         => (string)  ($r['state']         ?? ''),
            'city'          => (string)  ($r['city']          ?? ''),
            'role'          => (string)  ($r['role']          ?? 'user'),
            'groupJoinDate' => !empty($r['groupJoinDate'])  ? (string) $r['groupJoinDate'] : null,
            'photoUrl'      => !empty($r['photoUrl'])       ? (string) $r['photoUrl']      : null,
            'allPhotos'     => array_values($photosMap[$uid] ?? []),
            'socials'       => array_merge(EMPTY_SOCIALS, $socialsMap[$uid] ?? []),
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    // Captura PDOException, ErrorException y cualquier otro error
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error al procesar el directorio. Intenta de nuevo.',
    ]);
}
