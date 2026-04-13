-- =============================================================================
-- MIGRACIÓN 05 — Tabla: invitation_password_log
-- Proyecto:  Conexión FRIENDS SUD
-- Fecha:     2026-04-13
-- Ejecutar:  UNA sola vez en producción y entorno local.
-- =============================================================================
-- Descripción:
--   Almacena el historial completo de cambios de la "Contraseña de Invitación
--   Master". La fila más reciente (MAX created_at) es la contraseña activa.
--   El admin_id relaciona cada cambio con el administrador que lo realizó.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `invitation_password_log` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `admin_id`      INT           NOT NULL
                  COMMENT 'FK → users.id — Admin que realizó el cambio',
  `password_hash` VARCHAR(255)  NOT NULL
                  COMMENT 'Hash bcrypt (cost 12) de la contraseña de invitación',
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  -- Índice para acelerar el ORDER BY created_at DESC que recupera la contraseña activa
  KEY `idx_inv_pwd_created` (`created_at` DESC),

  CONSTRAINT `fk_inv_pwd_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial de cambios de la Contraseña de Invitación Master';
