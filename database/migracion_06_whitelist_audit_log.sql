-- =============================================================================
-- MIGRACIÓN 06: whitelist_audit_log
-- Proyecto : Conexión FRIENDS SUD
-- Propósito: Tabla de auditoría que registra cada eliminación de un número
--            de la Lista Blanca. Garantiza trazabilidad total de las acciones
--            de los administradores sobre whitelist_phones.
-- Ejecutar : Una sola vez sobre la base de datos de producción.
-- Codex    : 02_SYSTEM_CODEX_REGISTRY.md — Sección "TABLAS DE SEGURIDAD"
-- =============================================================================

CREATE TABLE IF NOT EXISTS `whitelist_audit_log` (
    `id`         INT         NOT NULL AUTO_INCREMENT                        COMMENT 'Clave primaria',
    `admin_id`   INT         NOT NULL                                       COMMENT 'FK → users.id — admin que ejecutó la eliminación',
    `phone`      VARCHAR(30) NOT NULL                                       COMMENT 'Número E.164 eliminado de whitelist_phones',
    `deleted_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP            COMMENT 'Fecha y hora exacta de la eliminación',
    PRIMARY KEY (`id`),
    INDEX `idx_audit_admin`  (`admin_id`),
    INDEX `idx_audit_phone`  (`phone`),
    CONSTRAINT `fk_audit_admin_id`
        FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de eliminaciones de la Lista Blanca — gestionada por api/delete_whitelist_phone.php';
