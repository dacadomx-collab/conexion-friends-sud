<?php
// =============================================================================
// api/upload_photos.php — Subir, comprimir y guardar fotos de perfil
// =============================================================================
// Método : POST (multipart/form-data)
// Campos : $_POST['userId'] (int)
//          $_FILES['photos'] (múltiples, name="photos[]")
// Proceso: Valida con getimagesize() → carga con GD → redimensiona si >1080px
//          → guarda SIEMPRE como .jpg calidad 80 → registra en profile_photos
// Destino: __DIR__ . '/../uploads/profiles/'
// =============================================================================

declare(strict_types=1);

// ── Constantes globales (fuera del try) ───────────────────────────────────────
const MAX_FILE_SIZE  = 15 * 1024 * 1024;   // 15 MB límite de subida raw
const MAX_PHOTOS     = 5;
const MIN_PHOTOS     = 2;
const MAX_DIMENSION  = 1080;               // px — redimensiona si supera esto
const JPEG_QUALITY   = 80;                 // calidad de compresión final

// Mapa MIME → función de carga GD
const GD_LOADERS = [
    IMAGETYPE_JPEG => 'imagecreatefromjpeg',
    IMAGETYPE_PNG  => 'imagecreatefrompng',
    IMAGETYPE_WEBP => 'imagecreatefromwebp',
];

// Convertir warnings/notices de PHP en excepciones capturables
set_error_handler(function (int $errno, string $errstr): bool {
    throw new \RuntimeException("[PHP Warning #{$errno}] {$errstr}");
});

// ── BLOQUE GLOBAL ─────────────────────────────────────────────────────────────
try {

    require_once __DIR__ . '/conexion.php';

    // ── Solo POST ─────────────────────────────────────────────────────────────
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
        exit;
    }

    // ── Verificar extensión GD ─────────────────────────────────────────────────
    if (!extension_loaded('gd')) {
        throw new \RuntimeException('La extensión GD de PHP no está disponible en el servidor.');
    }

    // ── Validar userId ─────────────────────────────────────────────────────────
    $userId = isset($_POST['userId']) ? (int) $_POST['userId'] : 0;
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'userId inválido.']);
        exit;
    }

    // ── Verificar archivos ─────────────────────────────────────────────────────
    if (empty($_FILES['photos']) || !is_array($_FILES['photos']['name'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No se recibieron fotos.']);
        exit;
    }

    // ── Normalizar $_FILES ─────────────────────────────────────────────────────
    $rawFiles = $_FILES['photos'];
    $fileList = [];

    for ($i = 0, $n = count($rawFiles['name']); $i < $n; $i++) {
        if ($rawFiles['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        $fileList[] = [
            'name'     => $rawFiles['name'][$i],
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

    // ── Validar cada archivo con getimagesize() ────────────────────────────────
    foreach ($fileList as $idx => $file) {
        $pos = $idx + 1;

        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "Error de subida en foto #{$pos} (código {$file['error']})."]);
            exit;
        }

        if ($file['size'] > MAX_FILE_SIZE) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} supera el límite de 15 MB."]);
            exit;
        }

        // getimagesize() devuelve false si el archivo no es una imagen real
        $info = @getimagesize($file['tmp_name']);
        if ($info === false) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "El archivo #{$pos} no es una imagen válida."]);
            exit;
        }

        $imageType = $info[2];   // IMAGETYPE_JPEG | IMAGETYPE_PNG | IMAGETYPE_WEBP
        if (!isset(GD_LOADERS[$imageType])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => "La foto #{$pos} debe ser JPG, PNG o WebP."]);
            exit;
        }

        $fileList[$idx]['width']      = $info[0];
        $fileList[$idx]['height']     = $info[1];
        $fileList[$idx]['image_type'] = $imageType;
    }

    // ── Preparar directorio ────────────────────────────────────────────────────
    $uploadDir = __DIR__ . '/../uploads/profiles/';

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new \RuntimeException('No se pudo crear el directorio de subida.');
        }
    }

    if (!is_writable($uploadDir)) {
        throw new \RuntimeException('El directorio de subida no tiene permisos de escritura.');
    }

    // ── Conectar a BD ──────────────────────────────────────────────────────────
    $db  = new Database();
    $pdo = $db->getConnection();

    // ── Procesar, comprimir y guardar ──────────────────────────────────────────
    $savedUrls  = [];
    $savedPaths = [];   // para rollback físico si la BD falla

    $pdo->beginTransaction();

    $stmtDel = $pdo->prepare('DELETE FROM profile_photos WHERE user_id = :userId');
    $stmtDel->execute([':userId' => $userId]);

    $stmtIns = $pdo->prepare(
        'INSERT INTO profile_photos (user_id, photo_url, sort_order) VALUES (:userId, :url, :order)'
    );

    foreach ($fileList as $idx => $file) {

        // ── Cargar imagen en memoria con GD ──────────────────────────────────
        $loaderFn = GD_LOADERS[$file['image_type']];
        $srcImg   = $loaderFn($file['tmp_name']);
        if ($srcImg === false) {
            $photoNum = $idx + 1;
            throw new \RuntimeException("No se pudo procesar la imagen #{$photoNum}. Intenta con otro archivo.");
        }

        $srcW = (int) $file['width'];
        $srcH = (int) $file['height'];

        // ── Redimensionar si supera MAX_DIMENSION ─────────────────────────────
        if ($srcW > MAX_DIMENSION || $srcH > MAX_DIMENSION) {
            if ($srcW >= $srcH) {
                $newW = MAX_DIMENSION;
                $newH = (int) round($srcH * MAX_DIMENSION / $srcW);
            } else {
                $newH = MAX_DIMENSION;
                $newW = (int) round($srcW * MAX_DIMENSION / $srcH);
            }

            $dstImg = imagecreatetruecolor($newW, $newH);

            // Preservar transparencia de PNG antes de redimensionar
            if ($file['image_type'] === IMAGETYPE_PNG) {
                imagealphablending($dstImg, false);
                imagesavealpha($dstImg, true);
                $transparent = imagecolorallocatealpha($dstImg, 0, 0, 0, 127);
                imagefilledrectangle($dstImg, 0, 0, $newW, $newH, $transparent);
            }

            imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $newW, $newH, $srcW, $srcH);
            imagedestroy($srcImg);
            $finalImg = $dstImg;
        } else {
            $finalImg = $srcImg;
        }

        // ── Guardar SIEMPRE como .jpg ─────────────────────────────────────────
        $filename = 'user_' . $userId . '_' . time() . '_' . $idx . '.jpg';
        $destPath = $uploadDir . $filename;

        if (!imagejpeg($finalImg, $destPath, JPEG_QUALITY)) {
            imagedestroy($finalImg);
            throw new \RuntimeException("No se pudo guardar la foto #" . ($idx + 1) . " en el servidor.");
        }

        imagedestroy($finalImg);

        $savedPaths[] = $destPath;
        $photoUrl     = '/uploads/profiles/' . $filename;
        $savedUrls[]  = $photoUrl;

        $stmtIns->execute([
            ':userId' => $userId,
            ':url'    => $photoUrl,
            ':order'  => $idx + 1,
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => count($savedUrls) . ' foto(s) procesadas y guardadas correctamente.',
        'photos'  => $savedUrls,
    ]);

} catch (\Throwable $e) {

    // ── Rollback BD ───────────────────────────────────────────────────────────
    if (isset($pdo) && $pdo instanceof \PDO) {
        try { $pdo->rollBack(); } catch (\Throwable $ignored) {}
    }

    // ── Limpiar archivos físicos ya escritos ──────────────────────────────────
    if (!empty($savedPaths)) {
        foreach ($savedPaths as $path) {
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
