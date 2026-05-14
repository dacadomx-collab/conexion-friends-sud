-- =============================================================================
-- MIGRACIÓN 13 — Módulo "Entretejidos"
-- Basado en Mosíah 18:21: "corazones entretejidos con unidad y amor"
-- =============================================================================
-- Tablas nuevas:
--   · woven_messages      — Mensajes guiados públicos en perfiles de usuario
--   · virtue_recognitions — Reconocimiento cualitativo de virtudes (sin conteos)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: woven_messages
-- Un usuario (author) puede dejar UN mensaje en el perfil de otro (recipient).
-- El mensaje está guiado por un prompt temático (virtue/feeling/memory/light).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS woven_messages (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  recipient_id  INT             NOT NULL,
  author_id     INT             NOT NULL,
  prompt_key    ENUM('virtue','feeling','memory','light') NOT NULL,
  message       VARCHAR(500)    NOT NULL,
  relation_type VARCHAR(100)    NULL DEFAULT NULL,
  created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_wm_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wm_author    FOREIGN KEY (author_id)    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wm_recipient (recipient_id),
  INDEX idx_wm_author    (author_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tabla: virtue_recognitions
-- Un autor puede reconocer cada virtud UNA VEZ en cada perfil (UNIQUE en DB).
-- REGLA: NUNCA exponer conteos públicos — solo presencia cualitativa.
-- El toggle (add/remove) lo gestiona toggle_virtue.php.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtue_recognitions (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  recipient_id  INT             NOT NULL,
  author_id     INT             NOT NULL,
  virtue_key    ENUM('trust','joy','light','service') NOT NULL,
  created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_vr_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vr_author    FOREIGN KEY (author_id)    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_vr (recipient_id, author_id, virtue_key),
  INDEX idx_vr_recipient (recipient_id),
  INDEX idx_vr_author    (author_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
