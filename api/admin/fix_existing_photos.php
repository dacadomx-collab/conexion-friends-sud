<?php
// =============================================================================
// api/admin/fix_existing_photos.php — Corrección masiva de orientación EXIF
// =============================================================================
// ⚠️  SCRIPT DE MANTENIMIENTO — ELIMINAR DEL SERVIDOR TRAS EL USO
//
// Itera todas las fotos registradas en profile_photos, detecta si el archivo
// físico JPEG tiene orientación incorrecta por metadatos EXIF y lo sobrescribe
// con la versión rotada + redimensionada a ≤1080px.
//
// SEGURIDAD (doble capa obligatoria):
//   1. Token estático en MAINT_TOKEN — cámbialo antes de subir al servidor.
//   2. requesterId debe corresponder a un usuario con role='admin' en BD.
//
// USO (GET desde navegador o curl):
//   http://tu-dominio/api/admin/fix_existing_photos.php
//       ?token=CAMBIA_ESTE_TOKEN&requesterId=1
//
// DESPUÉS DE USAR: borra este archivo del servidor inmediatamente.
// =============================================================================

declare(strict_types=1);

// ── Cambia este valor antes de subir al servidor ──────────────────────────────
const MAINT_TOKEN  = 'TokensitoFriends2026';

const MAINT_MAX_DIM   = 1080;
const MAINT_JPEG_QUAL = 80;

set_error_handler(function (int $errno, string $errstr): bool {
    throw new \RuntimeException("[PHP Warning #{$errno}] {$errstr}");
});

header('Content-Type: application/json; charset=UTF-8');

// ── BLOQUE GLOBAL ─────────────────────────────────────────────────────────────
try {

    // ── Verificar GD (hard-fail) ──────────────────────────────────────────────
    if (!extension_loaded('gd')) {
        throw new \RuntimeException('La extensión GD no está disponible. Actívala en php.ini.');
    }

    // ── Verificar EXIF (hard-fail — sin EXIF este script no tiene sentido) ────
    if (!extension_loaded('exif') || !function_exists('exif_read_data')) {
        throw new \RuntimeException(
            'La extensión EXIF no está disponible. ' .
            'Descomenta extension=exif en php.ini y reinicia Apache.'
        );
    }

    // ── Capa 1: Token estático ────────────────────────────────────────────────
    $providedToken = (string) ($_GET['token'] ?? '');
    if (!hash_equals(MAINT_TOKEN, $providedToken)) {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Acceso denegado. Token inválido o ausente.',
            'hint'    => 'Añade ?token=TU_TOKEN&requesterId=ID_ADMIN a la URL.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ── Capa 2: requesterId + role='admin' en BD ──────────────────────────────
    $requesterId = isset($_GET['requesterId']) ? (int) $_GET['requesterId'] : 0;
    if ($requesterId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'requesterId inválido o ausente.']);
        exit;
    }

    require_once __DIR__ . '/../conexion.php';
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
    $stmtRole->execute([':id' => $requesterId]);
    $requester = $stmtRole->fetch();

    if (!$requester || $requester['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Acceso denegado. Solo un administrador puede ejecutar este script.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ── Directorio base de fotos (se usa para validar path traversal) ─────────
    $uploadsBase = realpath(__DIR__ . '/../../uploads/profiles');
    if ($uploadsBase === false) {
        throw new \RuntimeException('El directorio uploads/profiles no existe o no es accesible.');
    }

    // ── Obtener todas las fotos registradas en BD ─────────────────────────────
    $stmtPhotos = $pdo->query(
        'SELECT id, user_id, photo_url FROM profile_photos ORDER BY id ASC'
    );
    $photos = $stmtPhotos->fetchAll();

    $fixedCount   = 0;
    $skippedCount = 0;
    $errors       = [];

    foreach ($photos as $row) {
        $photoId  = (int)    $row['id'];
        $userId   = (int)    $row['user_id'];
        $photoUrl = (string) $row['photo_url'];

        // Cada foto se procesa de forma aislada — un fallo no detiene el resto
        try {
            // ── Construir ruta física con protección anti-traversal ───────────
            // Usamos basename() para ignorar cualquier subdirectorio en photo_url
            $filename   = basename($photoUrl);
            $serverPath = realpath($uploadsBase . '/' . $filename);

            if ($serverPath === false) {
                $errors[] = [
                    'photo_id'  => $photoId,
                    'user_id'   => $userId,
                    'photo_url' => $photoUrl,
                    'error'     => 'Archivo físico no encontrado en servidor.',
                ];
                continue;
            }

            // Confirmar que el path resuelto sigue dentro del directorio permitido
            if (strpos($serverPath, $uploadsBase) !== 0) {
                $errors[] = [
                    'photo_id'  => $photoId,
                    'user_id'   => $userId,
                    'photo_url' => $photoUrl,
                    'error'     => 'Ruta fuera del directorio permitido — omitida por seguridad.',
                ];
                continue;
            }

            // ── Solo procesar JPEG ────────────────────────────────────────────
            $ext = strtolower((string) pathinfo($serverPath, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg'], true)) {
                $skippedCount++;
                continue;
            }

            // ── Leer metadatos EXIF ───────────────────────────────────────────
            $exif = @exif_read_data($serverPath);
            if ($exif === false || !isset($exif['Orientation'])) {
                $skippedCount++;   // Sin tag Orientation — archivo ya está bien
                continue;
            }

            switch ((int) $exif['Orientation']) {
                case 3:  $degrees = 180; break;
                case 6:  $degrees = -90; break;  // 90° sentido horario del dispositivo
                case 8:  $degrees =  90; break;  // 90° sentido antihorario del dispositivo
                default: $degrees =   0; break;
            }

            if ($degrees === 0) {
                $skippedCount++;   // Orientación normal (1) — no hay nada que hacer
                continue;
            }

            // ── Cargar imagen en memoria ──────────────────────────────────────
            $srcImg = @imagecreatefromjpeg($serverPath);
            if ($srcImg === false) {
                throw new \RuntimeException('GD no pudo cargar el JPEG.');
            }

            // ── Rotar ─────────────────────────────────────────────────────────
            $rotated = imagerotate($srcImg, $degrees, 0);
            if ($rotated === false) {
                imagedestroy($srcImg);
                throw new \RuntimeException('imagerotate() falló.');
            }
            imagedestroy($srcImg);
            $workImg = $rotated;

            // ── Redimensionar si sigue superando MAX tras rotación ────────────
            $srcW = (int) imagesx($workImg);
            $srcH = (int) imagesy($workImg);

            if ($srcW > MAINT_MAX_DIM || $srcH > MAINT_MAX_DIM) {
                if ($srcW >= $srcH) {
                    $newW = MAINT_MAX_DIM;
                    $newH = (int) round($srcH * MAINT_MAX_DIM / $srcW);
                } else {
                    $newH = MAINT_MAX_DIM;
                    $newW = (int) round($srcW * MAINT_MAX_DIM / $srcH);
                }

                $dstImg = imagecreatetruecolor($newW, $newH);
                imagecopyresampled($dstImg, $workImg, 0, 0, 0, 0, $newW, $newH, $srcW, $srcH);
                imagedestroy($workImg);
                $workImg = $dstImg;
            }

            // ── Sobrescribir archivo en disco ─────────────────────────────────
            if (!imagejpeg($workImg, $serverPath, MAINT_JPEG_QUAL)) {
                imagedestroy($workImg);
                throw new \RuntimeException('imagejpeg() no pudo sobrescribir el archivo en disco.');
            }

            imagedestroy($workImg);
            $fixedCount++;

        } catch (\Throwable $e) {
            // Log en error_log del servidor + acumular en el reporte
            error_log(
                '[fix_existing_photos] ' .
                "photo_id={$photoId} user_id={$userId} url={$photoUrl} " .
                'error=' . $e->getMessage()
            );
            $errors[] = [
                'photo_id'  => $photoId,
                'user_id'   => $userId,
                'photo_url' => $photoUrl,
                'error'     => $e->getMessage(),
            ];
        }
    }

    // ── Reporte final ─────────────────────────────────────────────────────────
    echo json_encode(
        [
            'status'        => 'success',
            'total_scanned' => count($photos),
            'fixed_count'   => $fixedCount,
            'skipped_count' => $skippedCount,
            'error_count'   => count($errors),
            'errors'        => $errors,
            'WARNING'       => 'ELIMINA ESTE SCRIPT DEL SERVIDOR AHORA QUE TERMINASTE.',
        ],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

// ── Catch global — errores catastróficos (BD caída, GD ausente, etc.) ────────
} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
    }
    error_log('[fix_existing_photos] FATAL: ' . $e->getMessage());
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
