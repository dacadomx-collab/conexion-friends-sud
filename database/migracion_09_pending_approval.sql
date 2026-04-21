-- =============================================================================
-- MIGRACIÓN 09 — Sistema de Aprobación de Nuevos Miembros
-- PROYECTO  : Conexión FRIENDS SUD
-- ARCHIVO   : database/migracion_09_pending_approval.sql
-- CODEX REF : 02_SYSTEM_CODEX_REGISTRY.md
-- DESCRIPCIÓN:
--   1. Añade 'pending' al ENUM status de la tabla `users`
--   2. Añade campos de trazabilidad de autorización a `whitelist_phones`
--   3. Crea la tabla `welcome_registry` (historial de autorizaciones)
-- NOTA: Ejecutar en orden. Cada bloque es idempotente con IF NOT EXISTS / IF EXISTS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1 — Ampliar ENUM status en tabla `users`
--   Antes: ENUM('active','inactive','blocked')
--   Después: ENUM('active','inactive','blocked','pending')
--   'pending' = registro completado pero en espera de aprobación del admin
-- -----------------------------------------------------------------------------
ALTER TABLE `users`
  MODIFY COLUMN `status`
    ENUM('active','inactive','blocked','pending')
    NOT NULL
    DEFAULT 'active';

-- -----------------------------------------------------------------------------
-- PASO 2 — Añadir campos de autorización a `whitelist_phones`
--   authorized_by_id : ID del admin que autorizó la cuenta (FK → users.id)
--   authorized_at    : Fecha y hora exacta de la autorización
--   Estos campos quedan NULL hasta que un admin presione "Autorizar"
-- -----------------------------------------------------------------------------
ALTER TABLE `whitelist_phones`
  ADD COLUMN IF NOT EXISTS `authorized_by_id` INT NULL,
  ADD COLUMN IF NOT EXISTS `authorized_at`    TIMESTAMP NULL;

-- -----------------------------------------------------------------------------
-- PASO 3 — Crear tabla `welcome_registry`
--   Registro histórico e inmutable de cada aprobación de cuenta.
--   Guarda snapshots del nombre/email/teléfono en el momento de la autorización
--   para garantizar trazabilidad aunque el usuario cambie sus datos después.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `welcome_registry` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT          NOT NULL,
  `user_name`     VARCHAR(150) NOT NULL,
  `user_email`    VARCHAR(255) NOT NULL,
  `user_phone`    VARCHAR(30)  NOT NULL,
  `admin_id`      INT          NOT NULL,
  `admin_name`    VARCHAR(150) NOT NULL,
  `authorized_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wr_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wr_admin` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
