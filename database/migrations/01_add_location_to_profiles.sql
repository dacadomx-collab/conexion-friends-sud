-- =============================================================================
-- PROYECTO  : Conexión FRIENDS SUD
-- MIGRACIÓN : 01_add_location_to_profiles.sql
-- TABLA     : profiles
-- ALCANCE   : Añade las columnas de ubicación geográfica: country, state, city.
-- REGLA     : Las 3 columnas son NULL DEFAULT NULL (datos opcionales del perfil).
--             No altera ninguna columna existente ni toca la tabla `users`.
-- EJECUTAR  : Una sola vez en producción y en local.
-- =============================================================================

ALTER TABLE `profiles`
    ADD COLUMN `country` VARCHAR(100) NULL DEFAULT NULL COMMENT 'País del miembro'         AFTER `show_whatsapp`,
    ADD COLUMN `state`   VARCHAR(100) NULL DEFAULT NULL COMMENT 'Estado o provincia'        AFTER `country`,
    ADD COLUMN `city`    VARCHAR(100) NULL DEFAULT NULL COMMENT 'Ciudad o municipio'        AFTER `state`;
