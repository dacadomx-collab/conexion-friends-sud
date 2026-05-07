-- =============================================================================
-- MIGRACIÓN 11 — Tabla birthday_wishes (Módulo: Celebrando la Vida)
-- =============================================================================
-- Permite que los miembros activos dejen mensajes de felicitación a los
-- cumpleañeros. La unicidad autor+destinatario por año se aplica en la
-- capa de aplicación (post_wish.php), no con índice DB para evitar
-- el uso de funciones en UNIQUE KEY de MySQL < 8.0.13.
-- =============================================================================

CREATE TABLE IF NOT EXISTS birthday_wishes (
  id            INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_id  INT          NOT NULL COMMENT 'FK → users.id | Cumpleañero',
  author_id     INT          NOT NULL COMMENT 'FK → users.id | Autor del mensaje',
  message       VARCHAR(500) NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_bw_recipient FOREIGN KEY (recipient_id)
    REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_bw_author FOREIGN KEY (author_id)
    REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_bw_recipient (recipient_id),
  INDEX idx_bw_author    (author_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mensajes de felicitación del módulo Celebrando la Vida';
