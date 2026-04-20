<?php
// =============================================================================
// api/admin/import_whitelist_csv.php — Importador masivo de Lista Blanca (Admin)
// =============================================================================
// Método  : POST multipart/form-data
// Campos  : requesterId (int, POST), csv (archivo .csv)
//
// Estructura del CSV (mapeo fijo por índice, cabecera ignorada):
//   Índice 0 → Teléfono          → phone          (solo dígitos)
//   Índice 1 → Nombre_Referencia → reference_name
//   Índice 2 → fECHA DE iNGRESO  → group_join_date (YYYY-MM-DD o DD/MM/YYYY)
//   Índice 3 → Insignia          → SOLO INFORMATIVO, no se almacena
//
// Por cada fila:
//   1. Sanitizar teléfono a solo dígitos (preg_replace).
//   2. INSERT INTO whitelist_phones ON DUPLICATE KEY UPDATE.
//   3. Si el teléfono pertenece a un usuario registrado Y viene fecha →
//      UPDATE profiles.group_join_date.
//
// Respuesta: { status, summary: { inserted, updated_profile, skipped, errors },
//              rows: RowResult[] }
// =============================================================================

declare(strict_types=1);

// Convierte errores no-fatales en ErrorException para que el catch los capture
set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

header('Content-Type: application/json; charset=utf-8');

// ── Validaciones previas (fuera del try → salidas limpias garantizadas) ───────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$requesterId = isset($_POST['requesterId']) ? (int) $_POST['requesterId'] : 0;
if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
    exit;
}

if (!isset($_FILES['csv']) || (int) $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
    $uploadErr = isset($_FILES['csv']['error']) ? (int) $_FILES['csv']['error'] : -1;
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Error al recibir el archivo CSV (código {$uploadErr})."]);
    exit;
}

$tmpPath  = (string) $_FILES['csv']['tmp_name'];
$origName = isset($_FILES['csv']['name']) ? (string) $_FILES['csv']['name'] : 'upload.csv';

$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, ['csv', 'txt'], true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Solo se aceptan archivos .csv']);
    exit;
}

// ── Lógica principal ──────────────────────────────────────────────────────────
try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar rol admin
    $stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtAdmin->execute([':id' => $requesterId]);
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    if (!$admin || $admin['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acceso restringido a administradores.']);
        exit;
    }

    // ── Abrir CSV ─────────────────────────────────────────────────────────────
    $handle = fopen($tmpPath, 'r');
    if ($handle === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo abrir el archivo CSV.', 'debug' => 'fopen failed']);
        exit;
    }

    // Detectar delimitador leyendo la primera línea y rebobinando
    $firstLine = fgets($handle);
    if ($firstLine === false || $firstLine === '') {
        fclose($handle);
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'El archivo CSV está vacío.']);
        exit;
    }
    rewind($handle);
    $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

    // Consumir la fila de cabecera (índices 0-3 son fijos, no necesitamos leerla)
    $headerRow = fgetcsv($handle, 4096, $delimiter);
    if ($headerRow === false || $headerRow === null) {
        fclose($handle);
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo leer la cabecera del CSV.']);
        exit;
    }

    // ── Preparar statements ───────────────────────────────────────────────────
    $stmtUpsert = $pdo->prepare(
        'INSERT INTO whitelist_phones (phone, is_used, reference_name, group_join_date, added_by, created_at)
         VALUES (:phone, 0, :ref_name, :gjd, :added_by, NOW())
         ON DUPLICATE KEY UPDATE
             reference_name  = COALESCE(VALUES(reference_name),  reference_name),
             group_join_date = COALESCE(VALUES(group_join_date), group_join_date),
             added_by        = COALESCE(VALUES(added_by),        added_by)'
    );

    $stmtFindUser = $pdo->prepare(
        'SELECT id FROM users WHERE phone = :phone LIMIT 1'
    );

    $stmtUpdateProfile = $pdo->prepare(
        'INSERT INTO profiles (user_id, group_join_date)
         VALUES (:user_id, :gjd)
         ON DUPLICATE KEY UPDATE group_join_date = VALUES(group_join_date)'
    );

    // ── Procesar filas ────────────────────────────────────────────────────────
    $summary = ['inserted' => 0, 'updated_profile' => 0, 'skipped' => 0, 'errors' => 0];
    $rows    = [];
    $lineNum = 1; // la cabecera ya fue consumida

    while (($row = fgetcsv($handle, 4096, $delimiter)) !== false) {
        $lineNum++;

        // Saltar filas completamente vacías
        $nonEmpty = array_filter($row, static function ($c): bool {
            return trim((string) $c) !== '';
        });
        if (empty($nonEmpty)) {
            continue;
        }

        // ── Extraer campos por índice fijo ────────────────────────────────────
        $rawPhone = isset($row[0]) ? trim((string) $row[0]) : '';
        $refName  = isset($row[1]) ? trim((string) $row[1]) : '';
        $rawFecha = isset($row[2]) ? trim((string) $row[2]) : '';
        $insignia = isset($row[3]) ? trim((string) $row[3]) : '';

        // ── Sanitizar teléfono: solo dígitos ──────────────────────────────────
        $phone = (string) preg_replace('/[^0-9]/', '', $rawPhone);

        if ($phone === '' || strlen($phone) < 7 || strlen($phone) > 20) {
            $summary['skipped']++;
            $rows[] = [
                'line'     => $lineNum,
                'rawPhone' => $rawPhone,
                'status'   => 'skipped',
                'reason'   => 'Teléfono inválido o vacío',
            ];
            continue;
        }

        // ── Parsear fecha: soporta YYYY-MM-DD y DD/MM/YYYY ───────────────────
        $groupJoinDate = null;
        if ($rawFecha !== '') {
            if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $rawFecha, $m)) {
                $groupJoinDate = sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawFecha)) {
                $groupJoinDate = $rawFecha;
            }
            if ($groupJoinDate !== null) {
                $parts = explode('-', $groupJoinDate);
                $y  = (int) $parts[0];
                $mo = (int) $parts[1];
                $d  = (int) $parts[2];
                if (!checkdate($mo, $d, $y)) {
                    $groupJoinDate = null;
                }
            }
        }

        $refNameFinal = ($refName !== '') ? mb_substr($refName, 0, 150) : null;

        try {
            // ── Upsert whitelist_phones (incluye group_join_date) ─────────────
            $stmtUpsert->execute([
                ':phone'    => $phone,
                ':ref_name' => $refNameFinal,
                ':gjd'      => $groupJoinDate,
                ':added_by' => $requesterId,
            ]);
            // rowCount() = 1 → INSERT nuevo; 2 → UPDATE existente; 0 → sin cambio
            $isNew = $stmtUpsert->rowCount() === 1;
            if ($isNew) {
                $summary['inserted']++;
            }

            // ── Actualizar profiles.group_join_date si el usuario ya existe ────
            $profileUpdated = false;
            if ($groupJoinDate !== null) {
                $stmtFindUser->execute([':phone' => $phone]);
                $existingUser = $stmtFindUser->fetch(PDO::FETCH_ASSOC);
                if ($existingUser) {
                    $stmtUpdateProfile->execute([
                        ':user_id' => (int) $existingUser['id'],
                        ':gjd'     => $groupJoinDate,
                    ]);
                    $summary['updated_profile']++;
                    $profileUpdated = true;
                }
            }

            $rows[] = [
                'line'           => $lineNum,
                'phone'          => $phone,
                'referenceName'  => $refNameFinal,
                'groupJoinDate'  => $groupJoinDate,
                'insigniaNote'   => $insignia !== '' ? $insignia : null,
                'status'         => $isNew ? 'inserted' : 'updated',
                'profileUpdated' => $profileUpdated,
            ];

        } catch (\Throwable $rowErr) {
            $summary['errors']++;
            $rows[] = [
                'line'     => $lineNum,
                'rawPhone' => $rawPhone,
                'status'   => 'error',
                'reason'   => $rowErr->getMessage(),
            ];
        }
    }

    fclose($handle);

    echo json_encode([
        'status'  => 'success',
        'summary' => $summary,
        'rows'    => $rows,
    ], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno al procesar el CSV.',
        'debug'   => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
