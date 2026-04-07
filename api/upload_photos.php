<?php
// =============================================================================
// api/upload_photos.php — Subir fotos de perfil
// =============================================================================
// Método : POST (multipart/form-data)
// Campos : $_POST['userId'] (int)
//          $_FILES['photos'] (múltiples, name="photos[]")
// Destino: __DIR__ . '/../uploads/profiles/'  (uploads/ en la raíz del proyecto)
// Tabla  : profile_photos (user_id, photo_url, sort_order)
// =============================================================================

declare(strict_types=1);

// ── Constantes de validación (deben estar FUERA del try para ser globales) ────
const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_PHOTOS    = 5;
const MIN_PHOTOS    = 2;
const ALLOWED_MIME  = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT   = ['jpg', 'jpeg', 'png', 'webp'];

// Convertir errores de PHP (warnings, notices) en excepciones capturables
set_error_handler(function (int $errno, string $errstr): bool {
    throw new \RuntimeException($errstr, $errno);
});

// ── BLOQUE GLOBAL — captura CUALQUIER Throwable (Error + Exception) ────────────
try {

    require_once __DIR__ . '/conexion.php';

    // ── Solo POST ─────────────────────────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
        exit;
    }

    // ── Validar userId ─────────────────────────────────────────────────────────
    $userId = isset($_POST['userId']) ? (int) $_POST['userId'] : 0;
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
        exit;
    }

    // ── Verificar que llegaron archivos ────────────────────────────────────────
    if (empty($_FILES['photos']) || !is_array($_FILES['photos']['name'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No se recibieron fotos.']);
        exit;
    }

    // ── Normalizar $_FILES array ───────────────────────────────────────────────
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

    // ── Validar cada archivo ───────────────────────────────────────────────────
    foreach ($fileList as $idx => $file) {
        $pos = $idx + 1;

        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "Error de subida en foto #{$pos} (código {$file['error']})."]);
            exit;
        }

        if ($file['size'] > MAX_FILE_SIZE) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} supera el límite de 5 MB."]);
            exit;
        }

        // Verificar MIME real con finfo (no confiar en el tipo del cliente)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']);
        if (!in_array($mime, ALLOWED_MIME, true)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} no es JPG, PNG ni WebP válido (detectado: {$mime})."]);
            exit;
        }

        // Normalizar extensión desde MIME
        $mimeToExt = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $fileList[$idx]['validated_ext']  = $mimeToExt[$mime];
        $fileList[$idx]['validated_mime'] = $mime;
    }

    // ── Preparar directorio de destino ─────────────────────────────────────────
    // uploads/ está en la raíz del proyecto, un nivel arriba de api/
    $uploadDir = __DIR__ . '/../uploads/profiles/';

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new \RuntimeException('No se pudo crear el directorio de subida.');
        }
    }

    // Verificar que el directorio es escribible
    if (!is_writable($uploadDir)) {
        throw new \RuntimeException('El directorio de subida no tiene permisos de escritura.');
    }

    // ── Conectar a BD ──────────────────────────────────────────────────────────
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Mover archivos y guardar en BD (transacción atómica) ──────────────────
    $savedUrls   = [];
    $movedFiles  = [];   // para limpiar físicamente si la BD falla

    $pdo->beginTransaction();

    // Reemplazar fotos anteriores del usuario
    $stmtDel = $pdo->prepare('DELETE FROM profile_photos WHERE user_id = :userId');
    $stmtDel->execute([':userId' => $userId]);

    $stmtIns = $pdo->prepare(
        'INSERT INTO profile_photos (user_id, photo_url, sort_order) VALUES (:userId, :url, :order)'
    );

    foreach ($fileList as $idx => $file) {
        $ext      = $file['validated_ext'];
        $filename = 'user_' . $userId . '_' . time() . '_' . $idx . '.' . $ext;
        $destPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            throw new \RuntimeException("No se pudo mover la foto #" . ($idx + 1) . " al servidor. Verifica permisos del directorio.");
        }

        $movedFiles[] = $destPath;

        // URL pública relativa
        $photoUrl    = '/uploads/profiles/' . $filename;
        $savedUrls[] = $photoUrl;

        $stmtIns->execute([
            ':userId' => $userId,
            ':url'    => $photoUrl,
            ':order'  => $idx + 1,
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Fotos subidas y guardadas correctamente.',
        'photos'  => $savedUrls,
    ]);

} catch (\Throwable $e) {
    // ── Captura global: CUALQUIER error devuelve JSON legible ──────────────────
    // (nunca un 500 genérico de Apache)

    // Intentar rollback si la transacción está abierta
    if (isset($pdo) && $pdo instanceof \PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }

    // Limpiar archivos físicos ya movidos si la BD falló
    if (!empty($movedFiles)) {
        foreach ($movedFiles as $path) {
            if (file_exists($path)) @unlink($path);
        }
    }

    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage(),
    ]);
}
