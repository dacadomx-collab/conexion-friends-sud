<?php
// =============================================================================
// api/get_directory.php — Directorio de miembros activos
// =============================================================================
// Método : GET
// Params : (ninguno)
// Returns: { status, data: Array<{
//             id, fullName, ward, stake, groupJoinDate, photoUrl }> }
// Filtro : users.status = 'active'
// Foto   : la foto con sort_order = 1 (foto principal) si existe
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
    $stmt = $pdo->query('
        SELECT
            u.id                         AS id,
            u.full_name                  AS fullName,
            COALESCE(p.ward,  \'\')      AS ward,
            COALESCE(p.stake, \'\')      AS stake,
            p.group_join_date            AS groupJoinDate,
            pp.photo_url                 AS photoUrl
        FROM users u
        LEFT JOIN profiles p
               ON p.user_id = u.id
        LEFT JOIN profile_photos pp
               ON pp.user_id = u.id AND pp.sort_order = 1
        WHERE u.status = \'active\'
        ORDER BY u.full_name ASC
    ');

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int) $r['id'];
    }
    unset($r);

    echo json_encode(['status' => 'success', 'data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener el directorio.']);
}
