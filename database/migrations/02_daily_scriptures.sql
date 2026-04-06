-- =============================================================================
-- Migración 02: Tabla daily_scriptures — Escritura del Día
-- Fecha estimada: 2026-04-06
-- Descripción: Almacena las escrituras que los miembros aportan para ser
--              publicadas como "Escritura del Día" en el dashboard.
--              Cada fecha del calendario puede tener como máximo UNA escritura.
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_scriptures (
    id              INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    scripture_text  TEXT         NOT NULL,
    reference       VARCHAR(200) NOT NULL,
    scheduled_date  DATE         NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    -- Garantía: una sola escritura por día calendario
    UNIQUE KEY uq_scheduled_date (scheduled_date),

    -- Integridad referencial: si el usuario es eliminado, se eliminan sus escrituras
    CONSTRAINT fk_ds_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para consultas frecuentes por fecha y por usuario
CREATE INDEX idx_ds_scheduled_date ON daily_scriptures (scheduled_date);
CREATE INDEX idx_ds_user_id        ON daily_scriptures (user_id);
