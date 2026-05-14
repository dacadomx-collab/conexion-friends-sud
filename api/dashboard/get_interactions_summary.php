<?php
// =============================================================================
// api/dashboard/get_interactions_summary.php — Resumen de interacciones del usuario
// =============================================================================
// Método : GET
// Params : ?userId=INT  (requerido — el usuario autenticado)
// Returns: { status, message, data: {
//   wovenMessages:  { total: int, previewNames: string[] },
//   birthdayWishes: { total: int, previewNames: string[] },
//   hasVirtues:     bool,
//   hasAny:         bool
// }}
//
// ⚠️ REGLA FUNDAMENTAL — Virtudes:
//   NUNCA se devuelven conteos de virtue_recognitions.
//   Solo se devuelve `hasVirtues: bool` para mostrar un mensaje cualitativo.
//
// Notas de diseño:
//   - wovenMessages : todos los mensajes recibidos (sin límite temporal).
//   - birthdayWishes: solo el año en curso (firma anual vigente).
//   - previewNames   : máximo 3 nombres de autores, orden DESC por fecha.
//     El frontend los formatea en "Ana, Juan y 2 más".
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/../conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

$userId = isset($_GET['userId']) ? (int) $_GET['userId'] : 0;

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── 1. Woven messages: total + primeros 3 autores ──────────────────────

    $stmtWmTotal = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM woven_messages
        WHERE recipient_id = :userId
    ");
    $stmtWmTotal->execute([':userId' => $userId]);
    $wmTotal = (int)($stmtWmTotal->fetchColumn() ?? 0);

    $wmPreviewNames = [];
    if ($wmTotal > 0) {
        $stmtWmNames = $pdo->prepare("
            SELECT u.full_name
            FROM woven_messages wm
            JOIN users u ON u.id = wm.author_id
            WHERE wm.recipient_id = :userId
            ORDER BY wm.created_at DESC
            LIMIT 3
        ");
        $stmtWmNames->execute([':userId' => $userId]);
        $wmPreviewNames = $stmtWmNames->fetchAll(PDO::FETCH_COLUMN);
    }

    // ── 2. Birthday wishes: total (año en curso) + primeros 3 autores ─────

    $stmtBwTotal = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM birthday_wishes
        WHERE recipient_id = :userId
          AND YEAR(created_at) = YEAR(CURDATE())
    ");
    $stmtBwTotal->execute([':userId' => $userId]);
    $bwTotal = (int)($stmtBwTotal->fetchColumn() ?? 0);

    $bwPreviewNames = [];
    if ($bwTotal > 0) {
        $stmtBwNames = $pdo->prepare("
            SELECT u.full_name
            FROM birthday_wishes bw
            JOIN users u ON u.id = bw.author_id
            WHERE bw.recipient_id = :userId
              AND YEAR(bw.created_at) = YEAR(CURDATE())
            ORDER BY bw.created_at DESC
            LIMIT 3
        ");
        $stmtBwNames->execute([':userId' => $userId]);
        $bwPreviewNames = $stmtBwNames->fetchAll(PDO::FETCH_COLUMN);
    }

    // ── 3. Virtue recognitions: solo existencia (NUNCA conteo público) ────

    $stmtVirtues = $pdo->prepare("
        SELECT EXISTS(
            SELECT 1 FROM virtue_recognitions
            WHERE recipient_id = :userId
            LIMIT 1
        ) AS has_virtues
    ");
    $stmtVirtues->execute([':userId' => $userId]);
    $hasVirtues = (bool)($stmtVirtues->fetchColumn());

    // ── 4. hasAny: ¿hay algo que mostrar? ─────────────────────────────────
    $hasAny = ($wmTotal > 0) || ($bwTotal > 0) || $hasVirtues;

    echo json_encode([
        'status'  => 'success',
        'message' => '',
        'data'    => [
            'wovenMessages'  => [
                'total'        => $wmTotal,
                'previewNames' => array_values($wmPreviewNames),
            ],
            'birthdayWishes' => [
                'total'        => $bwTotal,
                'previewNames' => array_values($bwPreviewNames),
            ],
            'hasVirtues'     => $hasVirtues,
            'hasAny'         => $hasAny,
        ],
    ]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor.',
        'debug'   => $e->getMessage(),
        'data'    => [],
    ]);
}
