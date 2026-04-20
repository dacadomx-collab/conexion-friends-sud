<?php
// =============================================================================
// api/admin/import_whitelist_csv.php — Importador masivo de Lista Blanca (Admin)
// =============================================================================
// Método  : POST multipart/form-data
// Campos  : requesterId (int, POST), csv (archivo .csv)
//
// Columnas esperadas del CSV (detección case-insensitive, cualquier orden):
//   - Teléfono   : header con "tel", "phone", "celular" o "numero"
//   - Referencia : header con "nombre" o "referencia"
//   - Fecha      : header con "fecha" o "ingreso" → profiles.group_join_date
//   - Insignia   : header con "insignia" o "badge"  → INFORMATIVO, no se almacena
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

// ── Helpers compatibles PHP 7.4 ──────────────────────────────────────────────

/**
 * Reemplaza str_contains() de PHP 8.0.
 * Devuelve true si $haystack contiene $needle.
 */
function cfs_str_contains(string $haystack, string $needle): bool {
    return $needle === '' || strpos($haystack, $needle) !== false;
}

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

    // Leer cabecera — longitud explícita 4096 para compatibilidad PHP 7.4/cPanel
    $rawHeaders = fgetcsv($handle, 4096, $delimiter);
    if ($rawHeaders === false || $rawHeaders === null) {
        fclose($handle);
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo leer la cabecera del CSV.']);
        exit;
    }

    // Normalizar cabeceras: minúsculas + eliminar tildes
    $headers = array_map(static function ($h): string {
        $h = mb_strtolower(trim((string) $h));
        return str_replace(
            ['á','é','í','ó','ú','ü','ñ'],
            ['a','e','i','o','u','u','n'],
            $h
        );
    }, $rawHeaders);

    // Mapear columnas por palabras clave — usa cfs_str_contains() (PHP 7.4 safe)
    $colPhone = $colRef = $colFecha = $colInsignia = -1;
    foreach ($headers as $i => $h) {
        $i = (int) $i;
        if ($colPhone === -1 && (
            cfs_str_contains($h, 'tel')     ||
            cfs_str_contains($h, 'phone')   ||
            cfs_str_contains($h, 'celular') ||
            cfs_str_contains($h, 'numero')
        )) {
            $colPhone = $i;
        }
        if ($colRef === -1 && (
            cfs_str_contains($h, 'nombre') ||
            cfs_str_contains($h, 'referencia')
        )) {
            $colRef = $i;
        }
        if ($colFecha === -1 && (
            cfs_str_contains($h, 'fecha') ||
            cfs_str_contains($h, 'ingreso')
        )) {
            $colFecha = $i;
        }
        if ($colInsignia === -1 && (
            cfs_str_contains($h, 'insignia') ||
            cfs_str_contains($h, 'badge')
        )) {
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

        // ── Extraer campos ────────────────────────────────────────────────────
        $rawPhone = isset($row[$colPhone]) ? trim((string) $row[$colPhone]) : '';
        $refName  = ($colRef >= 0 && isset($row[$colRef]))
            ? trim((string) $row[$colRef])
            : null;
        $rawFecha = ($colFecha >= 0 && isset($row[$colFecha]))
            ? trim((string) $row[$colFecha])
            : '';
        $insignia = ($colInsignia >= 0 && isset($row[$colInsignia]))
            ? trim((string) $row[$colInsignia])
            : '';

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

        $refNameFinal = ($refName !== null && $refName !== '')
            ? mb_substr($refName, 0, 150)
            : null;

        try {
            // ── Upsert whitelist_phones ───────────────────────────────────────
            $stmtUpsert->execute([
                ':phone'    => $phone,
                ':ref_name' => $refNameFinal,
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
