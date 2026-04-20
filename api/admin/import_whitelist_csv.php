<?php
// =============================================================================
// api/admin/import_whitelist_csv.php — Importador masivo de Lista Blanca (Admin)
// =============================================================================
// Método  : POST multipart/form-data
// Campos  : requesterId (int, POST), csv (archivo .csv)
//
// Columnas esperadas del CSV (detección case-insensitive, cualquier orden):
//   - Teléfono   : columna con "tel", "phone", "celular" o "numero" en el header
//   - Referencia : columna con "nombre" o "referencia" en el header
//   - Fecha      : columna con "fecha" o "ingreso" en el header → profiles.group_join_date
//   - Insignia   : columna con "insignia" o "badge" → SOLO INFORMATIVA, no se almacena
//
// Por cada fila:
//   1. Sanitizar teléfono a solo dígitos.
//   2. INSERT INTO whitelist_phones (phone, reference_name, added_by) ON DUPLICATE KEY UPDATE.
//   3. Si el teléfono ya pertenece a un usuario registrado Y viene fecha → UPDATE profiles.group_join_date.
//
// Respuesta: { status, summary: { inserted, updated_profile, skipped, errors }, rows: RowResult[] }
// =============================================================================

declare(strict_types=1);

set_error_handler(static function (int $errno, string $errstr, string $errfile, int $errline): bool {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

require_once __DIR__ . '/../conexion.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

// ── Validar requesterId ───────────────────────────────────────────────────────
$requesterId = isset($_POST['requesterId']) ? (int) $_POST['requesterId'] : 0;
if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.']);
    exit;
}

// ── Validar archivo ───────────────────────────────────────────────────────────
if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
    $uploadErr = $_FILES['csv']['error'] ?? -1;
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Error al recibir el archivo CSV (código {$uploadErr})."]);
    exit;
}

$tmpPath  = $_FILES['csv']['tmp_name'];
$origName = $_FILES['csv']['name'] ?? 'upload.csv';

// Solo aceptar .csv o text/plain
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, ['csv', 'txt'], true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Solo se aceptan archivos .csv']);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // Verificar admin
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
        echo json_encode(['status' => 'error', 'message' => 'No se pudo leer el archivo CSV.']);
        exit;
    }

    // Detectar delimitador (coma vs punto y coma) desde la primera línea
    $firstLine = fgets($handle);
    if ($firstLine === false) {
        fclose($handle);
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'El archivo CSV está vacío.']);
        exit;
    }
    rewind($handle);
    $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

    // Leer cabecera
    $rawHeaders = fgetcsv($handle, 0, $delimiter);
    if ($rawHeaders === false || $rawHeaders === null) {
        fclose($handle);
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo leer la cabecera del CSV.']);
        exit;
    }

    // Normalizar cabeceras: minúsculas, sin tildes, sin espacios extra
    $headers = array_map(static function (string $h): string {
        $h = mb_strtolower(trim($h));
        // Eliminar tildes básicas
        $h = str_replace(['á','é','í','ó','ú','ñ'], ['a','e','i','o','u','n'], $h);
        return $h;
    }, $rawHeaders);

    // Mapear columnas por palabras clave
    $colPhone = $colRef = $colFecha = $colInsignia = -1;
    foreach ($headers as $i => $h) {
        if ($colPhone    === -1 && (str_contains($h, 'tel') || str_contains($h, 'phone') || str_contains($h, 'celular') || str_contains($h, 'numero') || str_contains($h, 'número'))) {
            $colPhone = $i;
        }
        if ($colRef      === -1 && (str_contains($h, 'nombre') || str_contains($h, 'referencia'))) {
            $colRef = $i;
        }
        if ($colFecha    === -1 && (str_contains($h, 'fecha') || str_contains($h, 'ingreso'))) {
            $colFecha = $i;
        }
        if ($colInsignia === -1 && (str_contains($h, 'insignia') || str_contains($h, 'badge'))) {
            $colInsignia = $i;
        }
    }

    // Si no se detecta columna de teléfono, asumir columna 0
    if ($colPhone === -1) {
        $colPhone = 0;
    }

    // ── Preparar statements ───────────────────────────────────────────────────
    $stmtUpsert = $pdo->prepare(
        'INSERT INTO whitelist_phones (phone, is_used, reference_name, added_by, created_at)
         VALUES (:phone, 0, :ref_name, :added_by, NOW())
         ON DUPLICATE KEY UPDATE
             reference_name = COALESCE(VALUES(reference_name), reference_name),
             added_by       = COALESCE(VALUES(added_by), added_by)'
    );

    // Buscar user_id por teléfono
    $stmtFindUser = $pdo->prepare(
        'SELECT id FROM users WHERE phone = :phone LIMIT 1'
    );

    // Actualizar group_join_date si el usuario ya existe
    $stmtUpdateProfile = $pdo->prepare(
        'INSERT INTO profiles (user_id, group_join_date)
         VALUES (:user_id, :gjd)
         ON DUPLICATE KEY UPDATE group_join_date = VALUES(group_join_date)'
    );

    // ── Procesar filas ────────────────────────────────────────────────────────
    $summary = ['inserted' => 0, 'updated_profile' => 0, 'skipped' => 0, 'errors' => 0];
    $rows    = [];
    $lineNum = 1; // cabecera ya consumida

    while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
        $lineNum++;

        // Saltar filas completamente vacías
        if (empty(array_filter($row, static fn ($c) => trim($c) !== ''))) {
            continue;
        }

        // ── Extraer campos ────────────────────────────────────────────────────
        $rawPhone  = isset($row[$colPhone])    ? trim((string) $row[$colPhone])    : '';
        $refName   = ($colRef      >= 0 && isset($row[$colRef]))      ? trim((string) $row[$colRef])      : null;
        $rawFecha  = ($colFecha    >= 0 && isset($row[$colFecha]))    ? trim((string) $row[$colFecha])    : '';
        $insignia  = ($colInsignia >= 0 && isset($row[$colInsignia])) ? trim((string) $row[$colInsignia]) : '';

        // ── Sanitizar teléfono: solo dígitos ──────────────────────────────────
        $phone = preg_replace('/[^0-9]/', '', $rawPhone);

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

        // ── Parsear fecha (soporta YYYY-MM-DD y DD/MM/YYYY) ──────────────────
        $groupJoinDate = null;
        if ($rawFecha !== '') {
            // Intentar DD/MM/YYYY o DD-MM-YYYY
            if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $rawFecha, $m)) {
                $groupJoinDate = sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawFecha)) {
                $groupJoinDate = $rawFecha;
            }
            // Validar que sea una fecha real
            if ($groupJoinDate !== null) {
                [$y, $mo, $d] = array_map('intval', explode('-', $groupJoinDate));
                if (!checkdate($mo, $d, $y)) {
                    $groupJoinDate = null;
                }
            }
        }

        $refNameFinal = ($refName !== '' && $refName !== null) ? mb_substr($refName, 0, 150) : null;

        try {
            // ── Upsert whitelist_phones ───────────────────────────────────────
            $stmtUpsert->execute([
                ':phone'    => $phone,
                ':ref_name' => $refNameFinal,
                ':added_by' => $requesterId,
            ]);
            $isNew = $stmtUpsert->rowCount() === 1;
            $isNew ? $summary['inserted']++ : null;

            // ── Actualizar profiles.group_join_date si usuario ya existe ──────
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
    echo json_encode(['status' => 'error', 'message' => 'Error interno al procesar el CSV.']);
}
