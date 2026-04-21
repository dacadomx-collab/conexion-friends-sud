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
-- EJECUTAR: En phpMyAdmin o consola remota. Bloques independientes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1A — Eliminar tabla de auditoría de eliminaciones de whitelist
--   (Sus registros son ahora irrelevantes; la trazabilidad vive en
--    welcome_registry y user_departures_log)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whitelist_audit_log`;

-- -----------------------------------------------------------------------------
-- PASO 1B — Eliminar tabla whitelist_phones
--   La Lista Blanca ya no actúa como filtro de acceso ni como registro.
--   Todo el rastreo de ingreso está en welcome_registry (Migración 09).
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whitelist_phones`;

-- -----------------------------------------------------------------------------
-- PASO 2 — Añadir trazabilidad de actor a user_departures_log
--
--   acted_by   : 'self'  = el propio usuario ejecutó la acción
--                'admin' = un administrador ejecutó la acción sobre el usuario
--   admin_name : nombre del admin que actuó (NULL si acted_by='self')
-- -----------------------------------------------------------------------------
ALTER TABLE `user_departures_log`
  ADD COLUMN IF NOT EXISTS `acted_by`   ENUM('self','admin') NOT NULL DEFAULT 'self'
    COMMENT 'Quién ejecutó la acción: el usuario mismo o un admin',
  ADD COLUMN IF NOT EXISTS `admin_name` VARCHAR(150) NULL DEFAULT NULL
    COMMENT 'Nombre del admin que actuó (solo cuando acted_by=admin)';
