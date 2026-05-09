-- =============================================================================
-- PROYECTO  : Conexión FRIENDS SUD
-- MIGRACIÓN : 12 — Bandera de cambio obligatorio de contraseña
-- TABLA     : users
-- FECHA     : 2026-05-08
-- DESCRIPCIÓN:
--   Añade la columna `must_change_password` a la tabla `users`.
--   Cuando vale 1, el sistema obliga al usuario a crear una nueva contraseña
--   en el próximo inicio de sesión (se activa al hacer un reset admin).
-- =============================================================================

ALTER TABLE `users`
  ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Flag de seguridad: 1 = el usuario debe cambiar su contraseña en el próximo login'
  AFTER `password_hash`;
