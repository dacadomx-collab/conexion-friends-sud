<?php
// =============================================================================
// api/upload_photos.php — Subir fotos de perfil
// =============================================================================
// Método : POST (multipart/form-data)
// Campos : $_POST['userId'] (int)
//          $_FILES['photos'] (múltiples, name="photos[]")
// Reglas : JPG/PNG/WEBP, máx 5 MB por foto, máx 5 fotos en total.
// Destino: ../public/uploads/profiles/
// Tabla  : profile_photos (user_id, photo_url, sort_order)
//          — sort_order empieza en 1; la foto 1 es la principal.
// =============================================================================

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

// ── Solo POST ─────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

// ── Validar userId ────────────────────────────────────────────────────────────
$userId = isset($_POST['userId']) ? (int) $_POST['userId'] : 0;
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
    exit;
}

// ── Verificar que llegaron archivos ───────────────────────────────────────────
if (empty($_FILES['photos']) || !is_array($_FILES['photos']['name'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se recibieron fotos.']);
    exit;
}

// ── Constantes de validación ──────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_PHOTOS    = 5;
const MIN_PHOTOS    = 2;
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT   = ['jpg', 'jpeg', 'png', 'webp'];

// ── Normalizar $_FILES array ──────────────────────────────────────────────────
// PHP agrupa múltiples files de forma non-intuitive; reordenamos a lista de arrays.
$rawFiles = $_FILES['photos'];
$fileList = [];
$count    = count($rawFiles['name']);

for ($i = 0; $i < $count; $i++) {
    if ($rawFiles['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
    $fileList[] = [
        'name'     => $rawFiles['name'][$i],
        'type'     => $rawFiles['type'][$i],
        'tmp_name' => $rawFiles['tmp_name'][$i],
        'error'    => $rawFiles['error'][$i],
        'size'     => $rawFiles['size'][$i],
    ];
}

if (count($fileList) < MIN_PHOTOS) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Debes subir al menos ' . MIN_PHOTOS . ' fotos para continuar.',
    ]);
    exit;
}

if (count($fileList) > MAX_PHOTOS) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Máximo ' . MAX_PHOTOS . ' fotos permitidas.']);
    exit;
}

// ── Validar cada archivo ──────────────────────────────────────────────────────
foreach ($fileList as $idx => $file) {
    $pos = $idx + 1;

    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Error de subida en foto #{$pos}."]);
        exit;
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} supera el límite de 5 MB."]);
        exit;
    }

    // Verificar MIME real (no confiar en el tipo enviado por el cliente)
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, ALLOWED_MIME, true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} no es JPG, PNG ni WebP válido."]);
        exit;
    }

    // Verificar extensión
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT, true)) {
        // Normalizar extensión desde MIME si el cliente no la incluyó correctamente
        $mimeToExt = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $ext       = $mimeToExt[$mime] ?? 'jpg';
    }

    $fileList[$idx]['validated_ext'] = $ext;
}

// ── Preparar directorio de destino ────────────────────────────────────────────
$uploadDir = realpath(__DIR__ . '/../public') . '/uploads/profiles/';

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No se pudo crear el directorio de subida.']);
        exit;
    }
}

// ── Conectar a BD ─────────────────────────────────────────────────────────────
try {
    $db  = new Database();
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error interno de servidor.']);
    exit;
}

// ── Mover archivos y guardar en BD ────────────────────────────────────────────
$savedUrls = [];

try {
    $pdo->beginTransaction();

    // Borrar fotos anteriores del usuario (reemplazo completo)
    $stmtDel = $pdo->prepare('DELETE FROM profile_photos WHERE user_id = :userId');
    $stmtDel->execute([':userId' => $userId]);

    $stmtIns = $pdo->prepare(
        'INSERT INTO profile_photos (user_id, photo_url, sort_order) VALUES (:userId, :url, :order)'
    );

    foreach ($fileList as $idx => $file) {
        $ext      = $file['validated_ext'];
        $filename = "user_{$userId}_" . time() . "_{$idx}.{$ext}";
        $destPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            $photoNum = $idx + 1;
            throw new RuntimeException("No se pudo mover la foto #{$photoNum} al servidor.");
        }

        // URL relativa pública: /uploads/profiles/user_X_timestamp_N.ext
        $photoUrl = '/uploads/profiles/' . $filename;
        $savedUrls[] = $photoUrl;

        $stmtIns->execute([
            ':userId' => $userId,
            ':url'    => $photoUrl,
            ':order'  => $idx + 1,   // sort_order inicia en 1
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Fotos subidas y guardadas correctamente.',
        'photos'  => $savedUrls,
    ]);

} catch (Throwable $e) {
    $pdo->rollBack();

    // Limpiar archivos físicos ya movidos si la BD falló
    foreach ($savedUrls as $url) {
        $fullPath = realpath(__DIR__ . '/../public') . $url;
        if (file_exists($fullPath)) @unlink($fullPath);
    }

    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error al guardar las fotos: ' . $e->getMessage(),
    ]);
}
