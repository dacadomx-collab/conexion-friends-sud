<?php
// =============================================================================
// api/birthday_wishes/get_available_years.php — Años con mensajes registrados
// =============================================================================
// Método : GET
// Params : ?recipientId=INT  (requerido)
// Returns: { status, data: [INT, INT, ...] } — años ordenados DESC (más reciente primero)
// Uso    : El frontend usa esta lista para mostrar el "Álbum de Recuerdos".
//          Si solo existe el año actual, el frontend no muestra el selector de años.
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

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("
        SELECT DISTINCT YEAR(created_at) AS year
        FROM birthday_wishes
        WHERE recipient_id = :recipientId
        ORDER BY year DESC
    ");

    $stmt->execute([':recipientId' => $recipientId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convertir a array plano de enteros: [2026, 2025, 2024]
    $years = array_map(fn(array $r): int => (int) $r['year'], $rows);

    echo json_encode(['status' => 'success', 'data' => $years]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener los años disponibles.']);
}
