<?php
// =============================================================================
// api/get_birthdays.php — Cumpleañeros del mes (Módulo: Celebrando la Vida)
// =============================================================================
// Método : GET
// Params : ?month=INT  (opcional, 1-12; default = mes actual del servidor)
// Returns: { status, data: [{ userId, fullName, birthDate, birthDay, ward, stake, photoUrl }] }
// Nota   : Ignora el año de nacimiento; solo compara MONTH(birth_date).
//          Solo devuelve usuarios con status='active'.
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$month = isset($_GET['month']) ? (int) $_GET['month'] : (int) date('n');

if ($month < 1 || $month > 12) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Mes inválido. Debe ser un número entre 1 y 12.']);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id                        AS userId,
            u.full_name                 AS fullName,
            u.birth_date                AS birthDate,
            DAY(u.birth_date)           AS birthDay,
            COALESCE(p.ward,  '')       AS ward,
            COALESCE(p.stake, '')       AS stake,
            pp.photo_url                AS photoUrl
        FROM users u
        LEFT JOIN profiles      p  ON p.user_id  = u.id
        LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.sort_order = 1
        WHERE u.status = 'active'
          AND u.birth_date IS NOT NULL
          AND MONTH(u.birth_date) = :month
        ORDER BY DAY(u.birth_date) ASC
    ");

    $stmt->execute([':month' => $month]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['userId']   = (int) $row['userId'];
        $row['birthDay'] = (int) $row['birthDay'];
    }
    unset($row);

    echo json_encode(['status' => 'success', 'data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener cumpleaños.']);
}
