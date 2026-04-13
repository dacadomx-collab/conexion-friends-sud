-- =============================================================================
-- MIGRACIÓN 05b — Columna: invitation_password_log.plain_code
-- Proyecto:  Conexión FRIENDS SUD
-- Fecha:     2026-04-13
-- Ejecutar:  UNA sola vez. Requiere que la Migración 05 ya esté aplicada.
-- =============================================================================
-- Descripción:
--   Agrega la columna plain_code para que el Admin pueda ver y copiar la
--   contraseña de invitación desde el historial del Panel de Administración.
--   La columna se almacena en texto plano intencionalmente, ya que esta
--   contraseña NO protege datos sensibles de usuarios — es solo el código
--   de acceso público para ingresar a la puerta de registro.
-- =============================================================================

ALTER TABLE `invitation_password_log`
  ADD COLUMN `plain_code` VARCHAR(100) NOT NULL
    DEFAULT ''
    COMMENT 'Texto plano de la contraseña de invitación — visible solo para admins'
    AFTER `admin_id`;

-- Quitar el DEFAULT vacío una vez aplicada la columna (solo para filas futuras).
-- Las filas existentes quedan con '' ya que no había plain_code antes.
ALTER TABLE `invitation_password_log`
  ALTER COLUMN `plain_code` DROP DEFAULT;
