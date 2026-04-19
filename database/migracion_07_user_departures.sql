-- =============================================================================
-- Migración 07: Tabla de auditoría de bajas y cuentas ocultas
-- =============================================================================
-- Registra a los usuarios que ocultan o eliminan su cuenta.
-- Propósito: Ministración (admins pueden saber quién se fue y cuándo).
-- NOTA: user_name guarda el nombre al momento de la acción (persiste post-delete).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `user_departures_log` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_name`  VARCHAR(150)              NOT NULL COMMENT 'Nombre del usuario al momento de la acción',
  `action`     ENUM('hidden','deleted')  NOT NULL COMMENT 'hidden = ocultó cuenta, deleted = eliminó cuenta',
  `reason`     TEXT                      NULL DEFAULT NULL COMMENT 'Razón opcional proporcionada por el usuario',
  `created_at` TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_action`     (`action`),
  INDEX `idx_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
