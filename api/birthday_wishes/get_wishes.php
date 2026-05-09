<?php
// =============================================================================
// api/birthday_wishes/get_wishes.php — Leer mensajes del Libro de Firmas
// =============================================================================
// Método : GET
// Params : ?recipientId=INT  (requerido)
//          ?year=INT          (opcional — default: año actual del servidor)
// Returns: { status, year: INT, data: [{ wishId, authorId, authorName, message, createdAt }] }
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$recipientId = isset($_GET['recipientId']) ? (int) $_GET['recipientId'] : 0;

if ($recipientId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'recipientId inválido.']);
    exit;
}

// Año opcional — default al año actual. Acepta cualquier año >= 2020.
$currentYear = (int) date('Y');

if (isset($_GET['year'])) {
    $year = (int) $_GET['year'];
    if ($year < 2020 || $year > $currentYear) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Año fuera de rango.']);
        exit;
    }
} else {
    $year = $currentYear;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("
        SELECT
            bw.id           AS wishId,
            bw.author_id    AS authorId,
            u.full_name     AS authorName,
            bw.message      AS message,
            bw.created_at   AS createdAt
        FROM birthday_wishes bw
        JOIN users u ON u.id = bw.author_id
        WHERE bw.recipient_id = :recipientId
          AND YEAR(bw.created_at) = :year
        ORDER BY bw.created_at ASC
    ");

    $stmt->execute([
        ':recipientId' => $recipientId,
        ':year'        => $year,
    ]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['wishId']   = (int) $row['wishId'];
        $row['authorId'] = (int) $row['authorId'];
    }
    unset($row);

    echo json_encode(['status' => 'success', 'year' => $year, 'data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener los mensajes.']);
}
