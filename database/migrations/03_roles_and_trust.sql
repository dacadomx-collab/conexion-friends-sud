-- =============================================================================
-- Migración 03: Roles, Estado y Fecha de Ingreso al Grupo
-- Fecha estimada: 2026-04-06
-- Descripción:
--   1. users.role   — Rol del usuario: 'admin' | 'user' (default)
--   2. users.status — Estado de la cuenta: 'active' | 'inactive' | 'blocked' (default 'active')
--   3. profiles.group_join_date — Fecha de ingreso al grupo físico; solo editable por admins.
--
-- IMPORTANTE: Ejecutar en orden. Si las columnas ya existen, ALTER TABLE
--             arrojará un error; comentar las líneas correspondientes en ese caso.
-- =============================================================================

-- ── 1. Columna `role` en users ────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'
    AFTER accepted_code_of_conduct;

-- ── 2. Columna `status` en users ─────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active'
    AFTER role;

-- ── 3. Columna `group_join_date` en profiles ─────────────────────────────────
ALTER TABLE profiles
    ADD COLUMN group_join_date DATE NULL DEFAULT NULL
    AFTER city;

-- ── Índice para filtrar usuarios activos en el directorio ─────────────────────
CREATE INDEX idx_users_status ON users (status);

-- ── Verificación visual (opcional, comentar en producción) ───────────────────
-- SELECT id, full_name, role, status FROM users LIMIT 10;
-- SELECT user_id, group_join_date FROM profiles LIMIT 10;
