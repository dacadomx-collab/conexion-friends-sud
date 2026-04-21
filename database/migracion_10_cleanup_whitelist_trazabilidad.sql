-- =============================================================================
-- MIGRACIÓN 10 — Limpieza de Lista Blanca + Trazabilidad en Bajas
-- PROYECTO  : Conexión FRIENDS SUD
-- ARCHIVO   : database/migracion_10_cleanup_whitelist_trazabilidad.sql
-- CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md
-- DESCRIPCIÓN:
--   PASO 1 — Elimina las tablas de Lista Blanca (redundantes desde la
--             implementación de welcome_registry en Migración 09).
--   PASO 2 — Añade trazabilidad a user_departures_log: quién ejecutó la
--             acción (el propio usuario o un admin, con nombre del admin).
--
-- COMPATIBILIDAD: MySQL 5.6 / 5.7 / 8.x · MariaDB 10.x
-- EJECUTAR     : En phpMyAdmin o consola remota, bloque por bloque.
--                PASO 2 usa un procedimiento almacenado para verificar si
--                las columnas ya existen antes de intentar crearlas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1A — Eliminar tabla de auditoría de eliminaciones de whitelist
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whitelist_audit_log`;

-- -----------------------------------------------------------------------------
-- PASO 1B — Eliminar tabla whitelist_phones
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whitelist_phones`;

-- -----------------------------------------------------------------------------
-- PASO 2 — Añadir trazabilidad a user_departures_log
--
--   acted_by   : 'self'  = el propio usuario ejecutó la acción
--                'admin' = un administrador ejecutó la acción sobre el usuario
--   admin_name : nombre del admin que actuó (NULL si acted_by='self')
--
--   Se usa un procedimiento almacenado porque MySQL 5.x no soporta
--   la sintaxis "ADD COLUMN IF NOT EXISTS" (disponible solo en MySQL 8.0.3+).
--   El procedimiento consulta information_schema antes de modificar la tabla,
--   garantizando idempotencia: se puede ejecutar varias veces sin error.
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `cfs_add_departure_trazabilidad`;

DELIMITER //
CREATE PROCEDURE `cfs_add_departure_trazabilidad`()
BEGIN
    -- Añadir acted_by solo si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = 'user_departures_log'
          AND  COLUMN_NAME  = 'acted_by'
    ) THEN
        ALTER TABLE `user_departures_log`
            ADD COLUMN `acted_by` ENUM('self','admin') NOT NULL DEFAULT 'self'
            COMMENT 'Quién ejecutó la acción: el usuario mismo o un admin';
    END IF;

    -- Añadir admin_name solo si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
          AND  TABLE_NAME   = 'user_departures_log'
          AND  COLUMN_NAME  = 'admin_name'
    ) THEN
        ALTER TABLE `user_departures_log`
            ADD COLUMN `admin_name` VARCHAR(150) NULL DEFAULT NULL
            COMMENT 'Nombre del admin que actuó (solo cuando acted_by=admin)';
    END IF;
END //
DELIMITER ;

CALL `cfs_add_departure_trazabilidad`();

DROP PROCEDURE IF EXISTS `cfs_add_departure_trazabilidad`;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN — Confirma que las columnas existen correctamente
-- -----------------------------------------------------------------------------
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'user_departures_log'
  AND COLUMN_NAME  IN ('acted_by', 'admin_name')
ORDER BY COLUMN_NAME;
-- Resultado esperado: 2 filas (admin_name + acted_by).
-- Si ves 0 filas, el procedimiento falló — verifica permisos de la BD.
