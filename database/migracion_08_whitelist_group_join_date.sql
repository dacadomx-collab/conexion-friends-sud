-- =============================================================================
-- MIGRACIÓN 08: Agregar group_join_date a whitelist_phones
-- Proyecto : Conexión FRIENDS SUD
-- Propósito: Almacenar la fecha de ingreso al grupo desde el CSV de importación,
--            para poder asignarla al perfil cuando el usuario se registre
--            o al ejecutar sync_existing_users.php.
-- Ejecutar : Una sola vez sobre la base de datos de producción.
-- Codex    : 02_SYSTEM_CODEX_REGISTRY.md — Sección "TABLAS DE SEGURIDAD"
-- =============================================================================

ALTER TABLE `whitelist_phones`
    ADD COLUMN `group_join_date` VARCHAR(100) NULL DEFAULT NULL
        COMMENT 'Fecha de ingreso al grupo (del CSV). Formato YYYY-MM-DD. Se copia a profiles.group_join_date al sincronizar.'
        AFTER `reference_name`;
