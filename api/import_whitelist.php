<?php
declare(strict_types=1);
// =============================================================================
// ENDPOINT: api/import_whitelist.php
// Método  : POST (multipart/form-data)
// Acceso  : Solo administradores (role = 'admin')
// Función : Recibe un archivo CSV, extrae números de teléfono, los normaliza
//           a formato E.164 e inserta los nuevos en whitelist_phones ignorando
//           duplicados (INSERT IGNORE — nunca sobreescribe is_used = 1).
// Payload :
//   $_POST['requesterId'] — INT, ID del admin autenticado
//   $_FILES['csv']        — Archivo CSV con columna de teléfonos
// Respuesta:
//   { status, message, data: { inserted: int, skipped: int, invalid: int } }
// =============================================================================

require_once __DIR__ . '/conexion.php';

// ── Solo POST ─────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.', 'data' => []]);
    exit;
}

// ── Validar requesterId ───────────────────────────────────────────────────────
$requesterId = isset($_POST['requesterId']) ? (int) $_POST['requesterId'] : 0;
if ($requesterId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'requesterId inválido.', 'data' => []]);
    exit;
}

// ── Validar archivo ───────────────────────────────────────────────────────────
if (
    !isset($_FILES['csv']) ||
    $_FILES['csv']['error'] !== UPLOAD_ERR_OK ||
    !is_uploaded_file($_FILES['csv']['tmp_name'])
) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se recibió un archivo CSV válido.', 'data' => []]);
    exit;
}

// Verificar extensión del archivo (solo .csv o .txt)
$ext = strtolower((string) pathinfo($_FILES['csv']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['csv', 'txt'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El archivo debe tener extensión .csv o .txt.', 'data' => []]);
    exit;
}

// Límite de tamaño: 2 MB (suficiente para miles de filas)
if ($_FILES['csv']['size'] > 2 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'El archivo no debe superar 2 MB.', 'data' => []]);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Verificar que requesterId sea admin ───────────────────────────────────
    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtRole->execute([':id' => $requesterId]);
    $requester = $stmtRole->fetch();

    if (!$requester || $requester['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Acceso denegado. Solo administradores pueden importar números.',
            'data'    => [],
        ]);
        exit;
    }

    // ── Leer y parsear el CSV ─────────────────────────────────────────────────
    $tmpPath = $_FILES['csv']['tmp_name'];
    $handle  = fopen($tmpPath, 'r');

    if ($handle === false) {
        throw new \RuntimeException('No se pudo abrir el archivo CSV para lectura.');
    }

    // Detectar cabecera: si la primera celda no parece un teléfono, es encabezado
    $firstRow     = fgetcsv($handle);
    $phoneColIndex = 0;
    $hasHeader    = false;

    if ($firstRow !== false && $firstRow !== null) {
        // Buscar columna llamada 'phone', 'telefono', 'tel', 'celular', 'numero'
        $headerKeywords = ['phone', 'telefono', 'tel', 'celular', 'numero', 'móvil', 'movil'];
        foreach ($firstRow as $colIdx => $cell) {
            if (in_array(mb_strtolower(trim($cell)), $headerKeywords, true)) {
                $phoneColIndex = $colIdx;
                $hasHeader     = true;
                break;
            }
        }
        // Si no se detectó encabezado, la primera fila también contiene datos
        if (!$hasHeader) {
            rewind($handle);
        }
    }

    // ── Normalizar teléfono a E.164 ───────────────────────────────────────────
    // E.164: + seguido de 7 a 15 dígitos (ej: +525512345678)
    // Acepta formatos de entrada: +52 55 1234 5678 | 005255... | 525512345678
    $normalizeToE164 = static function (string $raw): ?string {
        // Eliminar espacios, guiones, puntos y paréntesis
        $clean = preg_replace('/[\s\-\.\(\)]+/', '', $raw);

        if ($clean === null || $clean === '') {
            return null;
        }

        // Reemplazar prefijo internacional 00 por +
        if (str_starts_with($clean, '00')) {
            $clean = '+' . substr($clean, 2);
        }

        // Añadir + si solo son dígitos (asumiendo que ya incluye código de país)
        if (ctype_digit($clean)) {
            $clean = '+' . $clean;
        }

        // Validar: debe iniciar con + y tener entre 7 y 15 dígitos después
        if (!preg_match('/^\+[0-9]{7,15}$/', $clean)) {
            return null;
        }

        return $clean;
    };

    // ── Procesar filas ────────────────────────────────────────────────────────
    $phonesToInsert = [];
    $invalidCount   = 0;

    while (($row = fgetcsv($handle)) !== false) {
        if (!isset($row[$phoneColIndex])) {
            $invalidCount++;
            continue;
        }

        $normalized = $normalizeToE164(trim((string) $row[$phoneColIndex]));

        if ($normalized === null) {
            $invalidCount++;
            continue;
        }

        $phonesToInsert[] = $normalized;
    }

    fclose($handle);

    if (empty($phonesToInsert)) {
        http_response_code(400);
        echo json_encode([
            'status'  => 'error',
            'message' => 'No se encontraron números de teléfono válidos en el archivo.',
            'data'    => ['inserted' => 0, 'skipped' => 0, 'invalid' => $invalidCount],
        ]);
        exit;
    }

    // Eliminar duplicados dentro del mismo archivo antes de insertar
    $phonesToInsert = array_values(array_unique($phonesToInsert));

    // ── INSERT IGNORE — ignora duplicados sin sobrescribir is_used ────────────
    // INSERT IGNORE respeta el UNIQUE KEY en `phone`:
    //   · Si el número ya existe (is_used = 0 o 1)  → fila ignorada (skipped)
    //   · Si el número es nuevo                      → fila insertada (inserted)
    $stmtIns = $pdo->prepare(
        'INSERT IGNORE INTO whitelist_phones (phone, is_used) VALUES (:phone, 0)'
    );

    $insertedCount = 0;
    $skippedCount  = 0;

    foreach ($phonesToInsert as $phone) {
        $stmtIns->execute([':phone' => $phone]);
        $affected = $stmtIns->rowCount();
        if ($affected > 0) {
            $insertedCount++;
        } else {
            $skippedCount++;
        }
    }

    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => "Importación completada. {$insertedCount} número(s) agregado(s).",
        'data'    => [
            'inserted' => $insertedCount,
            'skipped'  => $skippedCount,   // ya existían en la Lista Blanca
            'invalid'  => $invalidCount,   // no tenían formato de teléfono válido
        ],
    ]);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno del servidor al procesar el archivo.',
        'data'    => [],
    ]);
}
