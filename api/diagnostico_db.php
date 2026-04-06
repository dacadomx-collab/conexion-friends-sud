<?php
/**
 * =============================================================================
 * PROYECTO  : Conexión FRIENDS SUD
 * ARCHIVO   : api/diagnostico_db.php
 * PROPÓSITO : Diagnóstico profundo de conexión y operaciones CRUD.
 *             Úsalo para identificar la causa exacta de fallos silenciosos.
 *
 * ⚠️  SEGURIDAD — LEER ANTES DE USAR:
 *     Este script expone mensajes de error internos de la base de datos.
 *     1. Está protegido por un token secreto (parámetro ?token= en la URL).
 *     2. ELIMINA ESTE ARCHIVO del servidor una vez terminado el diagnóstico.
 *
 * USO:
 *     https://friends.tecnidepot.com/api/diagnostico_db.php?token=CAMBIA_ESTE_TOKEN
 * =============================================================================
 */
declare(strict_types=1);

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DEL DIAGNÓSTICO
// Cambia DIAG_TOKEN antes de subir. Comparte solo con el Arquitecto.
// -----------------------------------------------------------------------------
const DIAG_TOKEN      = 'CFS_DIAG_2024_CAMBIAR';
const TEST_EMAIL      = 'test_diagnostico@friends.com';
const TEST_FULL_NAME  = 'Usuario Diagnóstico';
const TEST_PHONE      = '5500000000';
const TEST_BIRTH_DATE = '1990-01-15';

// -----------------------------------------------------------------------------
// PROTECCIÓN — Token requerido
// -----------------------------------------------------------------------------
$providedToken = $_GET['token'] ?? '';

if ($providedToken !== DIAG_TOKEN) {
    http_response_code(403);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'status'  => 'error',
        'message' => 'Acceso denegado. Token inválido o ausente.',
        'hint'    => 'Añade ?token=TU_TOKEN a la URL.',
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// CORS y Content-Type — centralizado en conexion.php
// Nota: conexion.php establece cabeceras y maneja OPTIONS automáticamente.
// Para este script de diagnóstico, GET está explícitamente permitido.
// -----------------------------------------------------------------------------
require_once 'conexion.php';

// -----------------------------------------------------------------------------
// ESTRUCTURA DEL LOG
// Cada paso registra: status, message, y datos de contexto opcionales.
// -----------------------------------------------------------------------------
$log     = [];
$pdo     = null;
$userId  = null;

// =============================================================================
// FASE 0 — DIAGNÓSTICO DE ENTORNO
// Verifica el estado del servidor antes de intentar conectar a la BD.
// =============================================================================
$envPath  = __DIR__ . '/../.env';
$log['fase_0_entorno'] = [
    'php_version'      => PHP_VERSION,
    'pdo_disponible'   => extension_loaded('pdo'),
    'pdo_mysql'        => extension_loaded('pdo_mysql'),
    'env_path'         => $envPath,
    'env_existe'       => file_exists($envPath),
    'env_legible'      => is_readable($envPath),
    'directorio_api'   => __DIR__,
];

// Si el .env no existe, no tiene sentido continuar
if (!is_readable($envPath)) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 0 fallida: el archivo .env no existe o no es legible en la ruta esperada.',
        'log'     => $log,
    ]);
    exit;
}

// Leer las claves del .env (sin valores sensibles en el log)
$envData = parse_ini_file($envPath, false, INI_SCANNER_RAW);
$log['fase_0_entorno']['env_variables_presentes'] = $envData !== false
    ? array_keys($envData)
    : 'ERROR: parse_ini_file() devolvió false';

// =============================================================================
// FASE 1 — CONEXIÓN A LA BASE DE DATOS
// =============================================================================
try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $log['fase_1_conexion'] = [
        'status'  => 'ok',
        'message' => 'Conexión PDO establecida correctamente.',
    ];
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 1 fallida: no se pudo establecer la conexión PDO.',
        'error'   => $e->getMessage(),
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// FASE 2A — PRE-LIMPIEZA
// Elimina cualquier usuario de prueba huérfano de corridas anteriores.
// Evita fallos por UNIQUE constraint en el INSERT de la Fase 2B.
// =============================================================================
try {
    // Primero profiles (FK), luego users
    $stmtPreClean = $pdo->prepare("
        DELETE p FROM `profiles` p
        INNER JOIN `users` u ON u.id = p.user_id
        WHERE u.email = :email
    ");
    $stmtPreClean->execute([':email' => TEST_EMAIL]);

    $stmtPreCleanUser = $pdo->prepare("DELETE FROM `users` WHERE `email` = :email");
    $stmtPreCleanUser->execute([':email' => TEST_EMAIL]);

    $log['fase_2a_pre_limpieza'] = [
        'status'  => 'ok',
        'message' => 'Pre-limpieza completada. Registros huérfanos eliminados si existían.',
    ];
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2A fallida: error en la pre-limpieza.',
        'error'   => $e->getMessage(),
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// FASE 2B — INSERT (tabla: users)
// =============================================================================
try {
    $passwordHash = password_hash('DiagTest1234!', PASSWORD_BCRYPT, ['cost' => 12]);

    $stmtInsert = $pdo->prepare("
        INSERT INTO `users`
            (`full_name`, `email`, `phone`, `birth_date`, `password_hash`, `accepted_code_of_conduct`)
        VALUES
            (:full_name, :email, :phone, :birth_date, :password_hash, 1)
    ");

    $stmtInsert->execute([
        ':full_name'    => TEST_FULL_NAME,
        ':email'        => TEST_EMAIL,
        ':phone'        => TEST_PHONE,
        ':birth_date'   => TEST_BIRTH_DATE,
        ':password_hash' => $passwordHash,
    ]);

    $userId = (int) $pdo->lastInsertId();

    $log['fase_2b_insert'] = [
        'status'      => 'ok',
        'message'     => 'INSERT en `users` exitoso.',
        'new_user_id' => $userId,
    ];
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2B fallida: INSERT en `users` falló.',
        'error'   => $e->getMessage(),
        'sqlstate' => $e->getCode(),
        'hint'    => $e->getCode() === '23000'
            ? 'UNIQUE constraint violado. La pre-limpieza (2A) no eliminó el registro previo.'
            : 'Verifica que la tabla `users` exista y tenga el schema correcto.',
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// FASE 2C — SELECT (tabla: users)
// =============================================================================
try {
    $stmtSelect = $pdo->prepare("
        SELECT `id`, `full_name`, `email`, `phone`, `birth_date`, `created_at`
        FROM   `users`
        WHERE  `id` = :id
    ");
    $stmtSelect->execute([':id' => $userId]);
    $fetchedUser = $stmtSelect->fetch();

    if ($fetchedUser === false) {
        throw new \RuntimeException("El SELECT no devolvió filas para el user_id={$userId} recién insertado.");
    }

    $log['fase_2c_select'] = [
        'status'  => 'ok',
        'message' => 'SELECT en `users` exitoso.',
        'fila'    => $fetchedUser,
    ];
} catch (\PDOException $e) {
    // Intentar limpieza antes de salir
    cleanup_test_user($pdo, $userId);
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2C fallida: SELECT en `users` falló.',
        'error'   => $e->getMessage(),
        'log'     => $log,
    ]);
    exit;
} catch (\RuntimeException $e) {
    cleanup_test_user($pdo, $userId);
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2C fallida: ' . $e->getMessage(),
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// FASE 2D — INSERT/UPDATE (tabla: profiles)
// Replica exactamente la lógica de api/update_profile.php
// =============================================================================
try {
    $stmtProfile = $pdo->prepare("
        INSERT INTO `profiles`
            (`user_id`, `ward`, `stake`, `bio`, `show_whatsapp`, `country`, `state`, `city`)
        VALUES
            (:user_id, :ward, :stake, :bio, :show_whatsapp, :country, :state, :city)
        ON DUPLICATE KEY UPDATE
            `ward`          = VALUES(`ward`),
            `stake`         = VALUES(`stake`),
            `bio`           = VALUES(`bio`),
            `show_whatsapp` = VALUES(`show_whatsapp`),
            `country`       = VALUES(`country`),
            `state`         = VALUES(`state`),
            `city`          = VALUES(`city`),
            `updated_at`    = CURRENT_TIMESTAMP
    ");

    $stmtProfile->execute([
        ':user_id'      => $userId,
        ':ward'         => 'Barrio Diagnóstico',
        ':stake'        => 'Estaca Diagnóstico',
        ':bio'          => 'Perfil de prueba generado por diagnostico_db.php.',
        ':show_whatsapp' => 0,
        ':country'      => 'México',
        ':state'        => 'CDMX',
        ':city'         => 'Benito Juárez',
    ]);

    $log['fase_2d_profile'] = [
        'status'  => 'ok',
        'message' => 'INSERT/UPDATE en `profiles` exitoso.',
        'rows'    => $stmtProfile->rowCount(),
    ];
} catch (\PDOException $e) {
    cleanup_test_user($pdo, $userId);
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2D fallida: INSERT/UPDATE en `profiles` falló.',
        'error'   => $e->getMessage(),
        'sqlstate' => $e->getCode(),
        'hint'    => $e->getCode() === '23000'
            ? 'FK constraint violado. Verifica que `profiles.user_id` apunte a `users.id`.'
            : 'Verifica que la tabla `profiles` exista con el schema completo (incluyendo country/state/city).',
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// FASE 2E — DELETE (limpieza final)
// Elimina profiles primero (FK), luego users.
// =============================================================================
try {
    cleanup_test_user($pdo, $userId);

    $log['fase_2e_delete'] = [
        'status'  => 'ok',
        'message' => 'DELETE en `profiles` y `users` exitoso. Base de datos limpia.',
    ];
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'FASE 2E fallida: DELETE falló. El usuario de prueba puede haber quedado en la BD.',
        'error'   => $e->getMessage(),
        'hint'    => "Ejecuta manualmente: DELETE FROM users WHERE email = '" . TEST_EMAIL . "';",
        'log'     => $log,
    ]);
    exit;
}

// =============================================================================
// RESULTADO FINAL — Todos los pasos OK
// =============================================================================
http_response_code(200);
echo json_encode([
    'status'  => 'success',
    'message' => '✅ Diagnóstico completo. Todas las fases pasaron. La conexión y el CRUD funcionan correctamente.',
    'log'     => $log,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);


// =============================================================================
// FUNCIÓN AUXILIAR — Limpieza segura del usuario de prueba
// =============================================================================
function cleanup_test_user(\PDO $pdo, ?int $userId): void {
    if ($userId === null) {
        return;
    }
    // Profiles primero (FK), luego users
    $pdo->prepare("DELETE FROM `profiles` WHERE `user_id` = :id")->execute([':id' => $userId]);
    $pdo->prepare("DELETE FROM `users`    WHERE `id`      = :id")->execute([':id' => $userId]);
}
