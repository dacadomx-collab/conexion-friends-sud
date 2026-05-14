# 🧬 SYSTEM CODEX & REGISTRY (DICCIONARIO DE ORO)

## 📊 MAPEO DE VARIABLES VALIDADAS (FRONT VS BACK)
| Concepto | DB / Backend (snake_case) | Frontend (camelCase) | Tipo de Dato |
| :--- | :--- | :--- | :--- |
| ID de usuario | `id` / `user_id` | `userId` | Int |
| Nombre completo ⛔ | `full_name` | `fullName` | String |
| Correo electrónico | `email` | `email` | String |
| Teléfono | `phone` | `phone` | String |
| Fecha de nacimiento ⛔ | `birth_date` | `birthDate` | String (YYYY-MM-DD) |
| Hash de contraseña | `password_hash` | *(nunca viaja al Front)* | String |
| Cambio de contraseña requerido 🔒 | `must_change_password` | `mustChangePassword` | Bool |
| Aceptó código conducta | `accepted_code_of_conduct` | `acceptedCodeOfConduct` | Bool |
| Rol de usuario 🔒 | `role` | `role` | ENUM: `'admin'`\|`'user'` |
| Estado de cuenta 🔒 | `status` | `status` | ENUM: `'active'`\|`'inactive'`\|`'blocked'`\|`'pending'` |
| Barrio / Ward | `ward` | `ward` | String (máx. 100) |
| Estaca / Stake | `stake` | `stake` | String (máx. 100) |
| Biografía | `bio` | `bio` | String (máx. 500) |
| Mostrar WhatsApp | `show_whatsapp` | `showWhatsapp` | Bool |
| País | `country` | `country` | String (máx. 100, nullable) |
| Estado / Provincia | `state` | `state` | String (máx. 100, nullable) |
| Ciudad / Municipio | `city` | `city` | String (máx. 100, nullable) |
| Fecha ingreso grupo 🔒 | `group_join_date` | `groupJoinDate` | Date (nullable, solo admin) |
| ID del cumpleañero | `recipient_id` | `recipientId` | Int |
| ID del autor (firma) | `author_id` | `authorId` | Int |
| Mensaje de firma | `message` | `message` | String (máx. 500) |
| ID del deseo | `id` | `wishId` | Int |
| Nombre del autor (firma) | `full_name` (JOIN users) | `authorName` | String |
| Día del cumpleaños | `DAY(birth_date)` | `birthDay` | Int |

> 🔒 = Campo gestionado exclusivamente por administradores. No se expone en formularios de usuario.

> ⛔ = Campo inmutable post-registro (Regla de Piedra 1).
> Los campos `country`, `state` y `city` son idénticos en Front y DB (sin traducción).

## 🗄️ ESTRUCTURA DE TABLAS (SCHEMA)
### Tabla: `users`
- `id`: INT AUTO_INCREMENT — Clave primaria
- `full_name`: VARCHAR(150) — ⛔ Inmutable
- `email`: VARCHAR(255) UNIQUE — Clave de acceso
- `phone`: VARCHAR(20) — Solo dígitos
- `birth_date`: DATE — ⛔ Inmutable
- `password_hash`: VARCHAR(255) — bcrypt cost 12
- `must_change_password`: TINYINT(1) DEFAULT 0 — 🔒 Flag de seguridad: cuando vale `1`, el usuario debe crear una contraseña personal en el próximo login (activado por admin al resetear contraseña). *(Migración 12)*
- `accepted_code_of_conduct`: TINYINT(1) — Siempre 1 al registro
- `role`: ENUM('admin','user') DEFAULT 'user' — 🔒 Solo modificable por admins *(Migración 03)*
- `status`: ENUM('active','inactive','blocked','pending') DEFAULT 'pending' — 🔒 Solo modificable por admins *(Migraciones 03 + 09)*. Al registrarse el usuario queda en `'pending'`; el admin lo activa a `'active'` al autorizar.
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Tabla: `social_networks`
- `user_id`: INT — FK → `users.id` + `network_type` forman el UNIQUE KEY
- `network_type`: VARCHAR(50) — Valores permitidos: `'instagram'`, `'facebook'`, `'linkedin'`, `'twitter'`, `'tiktok'`, `'website'`
- `handle`: VARCHAR(300) — Handle o URL completa según la red (ver reglas abajo)
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

#### Reglas por red social
| network_type | Formato almacenado | Máx. chars | Ejemplo |
| :--- | :--- | :--- | :--- |
| `instagram` | Handle sin `@` | 100 | `conexionfriends` |
| `facebook` | Handle o nombre | 100 | `Juan Pérez` |
| `linkedin` | URL completa | 300 | `https://linkedin.com/in/juan` |
| `twitter` | Handle sin `@` | 100 | `conexionfriends` |
| `tiktok` | Handle sin `@` | 100 | `conexionfriends` |
| `website` | URL completa | 300 | `https://mi-sitio.com` |

### Tabla: `profile_photos`
- `id`: INT AUTO_INCREMENT — Clave primaria
- `user_id`: INT — FK → `users.id`
- `photo_url`: VARCHAR(300) — Ruta pública relativa `/uploads/profiles/user_{id}_{time}_{idx}.ext`
- `sort_order`: INT — 1 = foto principal; máx. 5 fotos por usuario
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Tabla: `daily_scriptures` *(Migración 02)*
- `id`: INT AUTO_INCREMENT — Clave primaria
- `user_id`: INT — FK → `users.id` ON DELETE CASCADE
- `scripture_text`: TEXT — Texto completo del versículo (máx. 3 000 chars, validado en backend)
- `reference`: VARCHAR(200) — Referencia (ej. "Mosíah 18:21")
- `scheduled_date`: DATE — Fecha de publicación; UNIQUE KEY `uq_scheduled_date` garantiza una escritura por día
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Tabla: `profiles`
- `user_id`: INT — FK → `users.id` (UNIQUE, clave del ON DUPLICATE KEY UPDATE)
- `ward`: VARCHAR(100) — Barrio del miembro
- `stake`: VARCHAR(100) — Estaca del miembro
- `bio`: TEXT — Biografía (máx. 500 chars validado en backend)
- `show_whatsapp`: TINYINT(1) — 1 = visible, 0 = oculto
- `country`: VARCHAR(100) NULL — País del miembro (migración 01)
- `state`: VARCHAR(100) NULL — Estado o provincia (migración 01)
- `city`: VARCHAR(100) NULL — Ciudad o municipio (migración 01)
- `group_join_date`: DATE NULL — 🔒 Fecha de ingreso al grupo físico; solo admin *(Migración 03)*
- `gender`: ENUM('M','F') NULL — Género del miembro; usado para filtros en el Directorio *(Migración 04 — pendiente)*
- `updated_at`: TIMESTAMP — Se actualiza en cada UPDATE

> ⚠️ **Migración 04 pendiente:** `ALTER TABLE profiles ADD COLUMN gender ENUM('M','F') NULL AFTER city;`
> Hasta que se ejecute, el campo retorna `''` y el filtro de Hermanos/Hermanas no filtra en producción (muestra todos).

### Tabla: `gatekeeper_security` *(Creada manualmente — Anti-Brute-Force Gatekeeper)*
- `id`: INT AUTO_INCREMENT — Clave primaria
- `ip_address`: VARCHAR(45) UNIQUE — IPv4 o IPv6 del cliente (detectada por cadena CF → XFF → REMOTE_ADDR)
- `attempts`: INT NOT NULL DEFAULT 0 — Contador de intentos fallidos acumulados
- `blocked_until`: DATETIME NULL — Si no NULL y > NOW(), la IP está bloqueada
- `last_attempt_at`: DATETIME NULL — Timestamp del último intento registrado

> **Regla de negocio:** 1 fallo → `attempts=1`; 2 fallos → `attempts=2` (advertencia al usuario); 3+ fallos → `blocked_until = NOW() + 3 HOURS` (HTTP 429). Contraseña correcta → `attempts=0`, `blocked_until=NULL`. Gestionada exclusivamente por `api/validate_invitation.php` con ON DUPLICATE KEY UPDATE.

---

### Tabla: `invitation_password_log` *(Migraciones 05 + 05b — ejecutadas)*
- `id`: INT AUTO_INCREMENT — Clave primaria
- `admin_id`: INT NOT NULL — FK → `users.id` ON DELETE RESTRICT | Admin que realizó el cambio
- `plain_code`: VARCHAR(100) NOT NULL — Texto plano de la contraseña *(Migración 05b)* — visible solo para admins en el Panel
- `password_hash`: VARCHAR(255) NOT NULL — Hash bcrypt (cost 12) — usado para validación en `/acceso`
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

> **Regla de negocio:** La contraseña de invitación activa es **siempre la fila con `MAX(created_at)`**. No existe tabla de configuración separada; el historial completo vive en esta tabla.
> `password_hash` **nunca** se expone en ninguna respuesta de API al frontend.
> `plain_code` **solo** se expone al frontend en `get_invitation_log.php` (ruta protegida por `role='admin'`).
> **Scripts:** `database/migracion_05_invitation_password_log.sql` · `database/migracion_05b_plain_code.sql`

### Tabla: `birthday_wishes` *(Migración 11 — Módulo: Celebrando la Vida)*
- `id`: INT UNSIGNED AUTO_INCREMENT — Clave primaria
- `recipient_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Cumpleañero (destinatario del mensaje)
- `author_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Autor del mensaje de felicitación
- `message`: VARCHAR(500) NOT NULL — Texto del mensaje edificante (3–500 chars, validado en backend)
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Índices:** `INDEX idx_bw_recipient (recipient_id)` · `INDEX idx_bw_author (author_id)`

**Restricciones de integridad:**
> - `recipient_id ≠ author_id` — un usuario no puede felicitarse a sí mismo (verificado en backend antes del INSERT).
> - Ambos usuarios deben tener `status = 'active'` — verificado con `SELECT COUNT(*) FROM users WHERE id IN (:id1, :id2) AND status = 'active'` esperando COUNT = 2.
> - **Unicidad por año (capa de aplicación):** Un autor solo puede dejar UN mensaje por destinatario por año calendario. Se valida con `SELECT id WHERE author_id=X AND recipient_id=Y AND YEAR(created_at)=YEAR(CURDATE())`. Si ya existe → HTTP 409. ⚠️ No se usa restricción DB (`UNIQUE KEY` con función `YEAR()`) por incompatibilidad con MySQL < 8.0.13.
> - El mensaje se almacena en texto plano (sin `htmlspecialchars`). La capa React protege contra XSS al renderizar via JSX.
> - Si el usuario es eliminado: `ON DELETE CASCADE` en ambas FK limpia automáticamente sus mensajes emitidos y recibidos.
> **Script:** `database/migracion_11_birthday_wishes.sql`

---

### Tabla: `welcome_registry` *(Migración 09)*
- `id`: INT AUTO_INCREMENT — Clave primaria
- `user_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Miembro autorizado
- `user_name`: VARCHAR(150) NOT NULL — Nombre del miembro **snapshot al momento de la autorización**
- `user_email`: VARCHAR(255) NOT NULL — Correo snapshot
- `user_phone`: VARCHAR(20) NOT NULL — Teléfono snapshot
- `admin_id`: INT NOT NULL — FK → `users.id` ON DELETE RESTRICT | Admin que autorizó
- `admin_name`: VARCHAR(150) NOT NULL — Nombre del admin snapshot
- `authorized_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

> **Propósito:** Registro histórico inmutable de cada autorización. Se inserta dentro de la misma transacción que activa `users.status = 'active'`. Si el usuario se elimina, `ON DELETE CASCADE` limpia la fila.
> **Script:** `database/migracion_09_pending_approval.sql`

### Tabla: `user_departures_log` *(Migraciones 07 + 10)*
- `id`: INT UNSIGNED AUTO_INCREMENT — Clave primaria
- `user_name`: VARCHAR(150) NOT NULL — Nombre del usuario al momento de la acción (snapshot; persiste tras borrado)
- `action`: ENUM('hidden','deleted') NOT NULL
- `reason`: TEXT NULL — Razón opcional (solo en acciones propias)
- `acted_by`: ENUM('self','admin') NOT NULL DEFAULT 'self'
- `admin_name`: VARCHAR(150) NULL DEFAULT NULL — Nombre del admin si `acted_by='admin'`
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

> **Scripts:** `database/migracion_07_user_departures.sql` · `database/migracion_10_cleanup_whitelist_trazabilidad.sql`

## 🧠 REGISTRO SEMÁNTICO (VOCABULARIO CONTROLADO)
- ✅ **Términos Permitidos:** `ward`, `stake`, `bio`, `showWhatsapp`, `userId`, `fullName`, `birthDate`, `country`, `state`, `city`, `invitePassword`, `newInvitePassword`, `requesterId`, `adminId`, `adminName`, `createdAt`, `plainCode`, `newStatus`, `accountStatus`, `userName`, `action`, `reason`, `departures`, `actedBy`, `targetUserId`, `authorizedAt`, `pendingUsers`, `welcomeRegistry`, `authorizeUser`, `deleteUserAdmin`, `allUsersOpen`, `allDepsOpen`, `deleteConfirm`, `deletingId`, `recipientId`, `authorId`, `authorName`, `wishId`, `wishMessage`, `birthDay`, `birthdays`, `birthdayLoading`, `wishes`, `wishesLoading`, `postingWish`, `wishSuccess`, `wishError`, `viewerUserId`, `mustChangePassword`, `resetPassword`, `tempPassword`, `messageId`, `promptKey`, `relationType`, `authorPhotoUrl`, `virtueKey`, `virtuesReceived`, `viewerGave`, `wovenMessages`, `wovenLoading`, `postingWoven`, `selectedPrompt`, `wovenText`, `wovenRelation`, `togglingVirtue`
- ❌ **Términos Prohibidos:** `barrio`, `estaca`, `descripcion`, `mostrarWhatsapp`, `id_usuario`, `nombre`, `fechaNacimiento`, `pais`, `estado`, `ciudad`, `municipio`, `masterPassword`, `gatePassword`, `invitationCode`, `plain_text`, `rawPassword`, `deleteUser`, `hideUser`, `deactivate`, `whitelistPhone`, `whitelistHistory`, `addWhitelist`, `importCsv`, `isUsed`, `addedBy`, `referenceName`, `likes`, `hearts`, `counter`, `popularidad`, `reactions`

---

## 🧩 REGISTRO DE COMPONENTES FRONTEND

---

## ✨ MÓDULO: ENTRETEJIDOS (Perfil de Usuario) — Migración 13

> **Propósito:** Reemplaza la lógica de "likes" y comentarios libres por edificación mutua y reconocimiento de virtudes basado en Mosíah 18:21.
> **Fuente bíblica:** "Corazones entretejidos con unidad y amor" — Mosíah 18:21.
> **Principio UX:** 🚫 Cero contadores públicos. No hay números visibles. Solo presencia cualitativa.
> **Script de BD:** `database/migracion_13_entretejidos.sql`

### Nueva tabla: `woven_messages`
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | INT UNSIGNED AUTO_INCREMENT | PK |
| `recipient_id` | INT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `author_id` | INT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `prompt_key` | ENUM(`'virtue'`,`'feeling'`,`'memory'`,`'light'`) | Prompt que guió el mensaje |
| `message` | VARCHAR(500) NOT NULL | 10–500 chars, texto plano; React protege XSS |
| `relation_type` | VARCHAR(100) NULL | Vínculo declarado ("Barrio", "Instituto", etc.) |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

**Índices:** `idx_wm_recipient(recipient_id)` · `idx_wm_author(author_id)`

**Restricciones de integridad:**
> - `recipient_id ≠ author_id` — verificado en `post_message.php` antes del INSERT.
> - Ambos usuarios deben tener `status = 'active'` — verificado con COUNT(*) = 2.
> - **1 mensaje por autor+destinatario** (sin límite temporal) — verificado en PHP. Si ya existe → HTTP 409.

---

### Nueva tabla: `virtue_recognitions`
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | INT UNSIGNED AUTO_INCREMENT | PK |
| `recipient_id` | INT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `author_id` | INT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `virtue_key` | ENUM(`'trust'`,`'joy'`,`'light'`,`'service'`) | Insignia seleccionada |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

**Restricción DB:** `UNIQUE KEY uq_vr (recipient_id, author_id, virtue_key)` — un autor da cada virtud máximo una vez por perfil. Compatible MySQL 5.7+.

**Índices:** `idx_vr_recipient(recipient_id)` · `idx_vr_author(author_id)`

**Regla de negocio crítica:**
> - `recipient_id ≠ author_id` — verificado en `toggle_virtue.php`.
> - **NUNCA se exponen conteos** — el API devuelve solo arrays de claves (`virtuesReceived`, `viewerGave`), sin números.
> - Toggle idempotente: si la fila existe → DELETE; si no → INSERT.

---

### Catálogo de prompts guiados
| `prompt_key` | Texto del prompt | Emoji |
| :--- | :--- | :--- |
| `virtue` | ¿Qué virtud destacarías de esta persona? | ✨ |
| `feeling` | ¿Cómo te hace sentir cuando convives con ella? | 🌸 |
| `memory` | ¿Qué momento juntos te ha marcado? | 🌿 |
| `light` | ¿De qué manera ha añadido luz a tu vida? | ☀️ |

### Catálogo de insignias de virtud
| `virtue_key` | Emoji | Label visible |
| :--- | :--- | :--- |
| `trust` | 🌿 | Inspira confianza |
| `joy` | ☀️ | Transmite alegría |
| `light` | 📖 | Comparte luz |
| `service` | 🤝 | Sirve con amor |

---

### Nuevos endpoints:
| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `api/entretejidos/get_messages.php` | GET `?recipientId=INT` | Mensajes entretejidos públicos del perfil |
| `api/entretejidos/post_message.php` | POST JSON | Publicar mensaje guiado `{authorId, recipientId, promptKey, message, relationType?}` |
| `api/entretejidos/get_virtues.php` | GET `?recipientId=INT&viewerId=INT` | Constelación de virtudes (sin conteos) |
| `api/entretejidos/toggle_virtue.php` | POST JSON | Toggle `{authorId, recipientId, virtueKey}` → `{action: 'added'|'removed', virtueKey}` |

---

### Componente: `WovenSection.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/WovenSection.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Usado en** | `MemberSheet` dentro de `components/DirectoryClient.tsx` |
| **Estado** | ✅ Activo — Migración 13 |
| **Endpoints** | `GET api/entretejidos/get_messages.php` · `GET api/entretejidos/get_virtues.php` · `POST api/entretejidos/post_message.php` · `POST api/entretejidos/toggle_virtue.php` |

#### Props
| Prop | Tipo | Descripción |
| :--- | :--- | :--- |
| `memberId` | `number` | ID del perfil visualizado |
| `memberName` | `string` | Nombre completo del miembro (se usa el primer nombre en la UI) |
| `viewerUserId` | `number \| null` | ID del usuario autenticado (leído de `cfs_session`) |

#### Estado interno
| Estado | Tipo | Descripción |
| :--- | :--- | :--- |
| `messages` | `WovenMessage[]` | Mensajes entretejidos del perfil |
| `messagesLoading` | `boolean` | Spinner de carga inicial |
| `virtuesReceived` | `string[]` | Virtudes presentes en este perfil (de cualquier persona) |
| `viewerGave` | `string[]` | Virtudes que el viewer específicamente reconoció |
| `virtuesLoading` | `boolean` | Spinner de carga de virtudes |
| `togglingVirtue` | `string \| null` | Virtud que se está toggling (spinner local por badge) |
| `selectedPrompt` | `PromptKey \| null` | Paso 1 del formulario: prompt seleccionado |
| `wovenText` | `string` | Paso 2: texto del mensaje |
| `wovenRelation` | `string` | Paso 2: relación declarada |
| `posting` | `boolean` | Durante el POST del mensaje |
| `postError` | `string \| null` | Error del POST |
| `postSuccess` | `boolean` | Estado de éxito — oculta el formulario |

#### Interfaz `WovenMessage`
```typescript
interface WovenMessage {
  messageId:      number
  authorId:       number
  authorName:     string
  authorPhotoUrl: string | null
  promptKey:      'virtue' | 'feeling' | 'memory' | 'light'
  message:        string
  relationType:   string | null
  createdAt:      string
}
```

#### Flujo UX del formulario (2 pasos)
1. **Paso 1:** Grid de 4 tarjetas con los prompts guiados — el usuario selecciona uno.
2. **Paso 2:** Textarea con el prompt visible como contexto + selector de relación (opcional) + botón de envío.
3. **Éxito:** Pantalla de confirmación inline; formulario oculto; mensaje añadido en tiempo real al inicio de la lista.

#### Reglas de seguridad del módulo:
- `viewerUserId` se lee de `localStorage["cfs_session"].id` — nunca del servidor.
- El formulario solo es visible si `viewerUserId !== member.id` y el viewer aún no ha publicado.
- El toggle de virtudes solo está activo si `viewerUserId !== member.id`.
- Inyección SQL: todos los endpoints usan PDO con `prepare()` + `execute([':param' => $valor])`.
- XSS: React escapa automáticamente al renderizar `{msg.message}` en JSX.
- **NUNCA se devuelven ni muestran conteos numéricos** — ni en el API ni en la UI.

#### Posición en `MemberSheet` (orden de renderizado):
1. Galería de fotos
2. Ward / Stake / Bio
3. Contacto (WhatsApp)
4. Redes sociales
5. **✨ Entretejidos** ← SIEMPRE visible
6. 🎂 Celebrando la Vida ← solo en mes de cumpleaños

---

### Mapeo de variables — Módulo Entretejidos
| Concepto | DB / Backend (snake_case) | Frontend (camelCase) | Tipo |
| :--- | :--- | :--- | :--- |
| ID del mensaje | `id` | `messageId` | Int |
| Prompt del mensaje | `prompt_key` | `promptKey` | ENUM string |
| Tipo de relación | `relation_type` | `relationType` | String nullable |
| Foto del autor | `photo_url` (JOIN `profile_photos`) | `authorPhotoUrl` | String nullable |
| Clave de virtud | `virtue_key` | `virtueKey` | ENUM string |
| Virtudes presentes | *(DISTINCT query)* | `virtuesReceived` | `string[]` |
| Virtudes del viewer | *(WHERE author_id)* | `viewerGave` | `string[]` |
| Acción del toggle | *(respuesta PHP)* | `action` | `'added'`\|`'removed'` |

---

## 🎂 MÓDULO: CELEBRANDO LA VIDA (Cumpleaños) — Migración 11

> **Propósito:** Visibilidad de cumpleaños y espacio de ministración (Libro de Firmas) para los miembros activos.
> **Fuente de verdad:** `users.birth_date` — campo ⛔ inmutable. Se compara solo mes+día, ignorando el año.
> **Script de BD:** `database/migracion_11_birthday_wishes.sql`

### Nueva tabla: `birthday_wishes`
Ver esquema completo en la sección [🗄️ ESTRUCTURA DE TABLAS → `birthday_wishes`].

### Nuevos endpoints:
| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `api/get_birthdays.php` | GET `?month=INT` | Cumpleañeros del mes (default: mes actual del servidor) |
| `api/birthday_wishes/get_wishes.php` | GET `?recipientId=INT` | Mensajes del Libro de Firmas para un cumpleañero (año actual) |
| `api/birthday_wishes/post_wish.php` | POST JSON | Guardar mensaje `{authorId, recipientId, message}` |

Ver contratos completos en `03_CONTRATOS_API_Y_LOGICA.md`.

---

### Librería: `canvas-confetti`
- **Package:** `canvas-confetti` + `@types/canvas-confetti` (ambos en `dependencies`)
- **Carga:** Dinámica con `import("canvas-confetti")` dentro de `useEffect` — NUNCA import estático en el top del archivo para evitar errores de SSR (Next.js renderiza en servidor, `document` no existe allí).
- **Patrón de uso:**
  ```typescript
  useEffect(() => {
    if (!open || !isBirthdayToday(member.birthDate)) return
    let alive = true
    import("canvas-confetti").then((mod) => {
      if (!alive) return
      mod.default({ particleCount: 160, spread: 80, origin: { y: 0.35 } })
    })
    return () => { alive = false }  // cleanup si el componente desmonta antes
  }, [open, member?.id])
  ```
- **Disparo:** Solo cuando el `MemberSheet` se abre (`open === true`) Y `isBirthdayToday(member.birthDate) === true`. Se dispara una sola vez por apertura de Sheet.

---

### Helpers de fechas (archivo: `components/DirectoryClient.tsx`)

| Función | Firma | Descripción |
| :--- | :--- | :--- |
| `getBirthMonthDay` | `(birthDate: string\|null) → {month,day}\|null` | Parsea `YYYY-MM-DD` extrayendo mes y día sin construir `new Date(string)`. Evita desfases de zona horaria. |
| `isBirthdayToday` | `(birthDate) → boolean` | `true` si mes+día del birthDate === día de hoy |
| `isBirthdayThisWeek` | `(birthDate) → boolean` | `true` si el cumpleaños cae en la semana Dom–Sáb actual. Comprueba año actual ±1 para cubrir semanas que cruzan el borde de año nuevo. |
| `isBirthdayMonth` | `(birthDate) → boolean` | `true` si el mes del birthDate coincide con el mes actual |
| `isBirthdayThisMonth` | `(birthDate) → boolean` | `true` si el mes coincide, pero NO es hoy ni esta semana (= tercer nivel de prioridad) |

**Constante auxiliar:** `MONTH_NAMES_ES` — array de 12 nombres de mes en español (índice 0 = enero).

---

### Insignias de cumpleaños en el grid del Directorio — 3 niveles de prioridad

Posición en la tarjeta: **esquina superior izquierda** (`absolute top-2 left-2 z-20`).
La insignia de rol/membresía preexistente (Admin, Nuevo, Confianza) permanece en **esquina superior derecha** sin colisión.

| Prioridad | Estado | Insignia | Estilo badge | Borde tarjeta | Comportamiento al clic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `bdToday` | 🎂 `Hoy` | `bg-amber-400/95 text-white` sólido | `ring-2 ring-amber-400` | `div[role="button"]` con `e.stopPropagation()` → `openSheet(member, true)` → abre Sheet + scroll a `#libro-firmas` |
| 2 | `bdThisWeek` (¬hoy) | 🎈 `Esta semana` | `bg-amber-100/90 text-amber-800` suave | Sin borde extra | Click normal en la tarjeta → `openSheet(member)` |
| 3 | `bdThisMonth` (¬hoy, ¬semana) | 🎁 `Este mes` | `bg-slate-100/90 text-slate-600` neutro | Sin borde extra | Click normal en la tarjeta → `openSheet(member)` |

> En móvil (`xs`): el texto de la label está oculto (`hidden sm:inline`) — solo se muestra el emoji para no saturar el espacio.
> Prioridad excluyente: `bdThisWeek = !bdToday && isBirthdayThisWeek(...)`, `bdThisMonth = !bdToday && !bdThisWeek && isBirthdayMonth(...)`.

---

### `MemberSheet` — Sección "Celebrando la Vida"

La sección de cumpleaños se renderiza **solo si `isBirthdayMonth(member.birthDate) === true`**, colocada al final del perfil (después de redes sociales), separada con borde ámbar.

**Nuevos props de `MemberSheet`:**
| Prop | Tipo | Descripción |
| :--- | :--- | :--- |
| `focusWishes` | `boolean` | Si `true`, ejecuta scroll suave al elemento `#libro-firmas` con delay 380 ms tras abrir el Sheet |
| `viewerUserId` | `number \| null` | ID del usuario autenticado (leído de `localStorage`). Si coincide con `member.id`, oculta el formulario de firmas. |

**Funciones helper en `DirectoryClient`:**
- `openSheet(member, withWishesFocus?)` — encapsula `setSelected(member) + setFocusWishes(bool)`.
- `closeSheet()` — resetea ambos estados al cerrar.

**Estado interno de `MemberSheet` para el Libro de Firmas:**
| Estado | Tipo | Descripción |
| :--- | :--- | :--- |
| `wishes` | `BirthdayWish[]` | Mensajes del año actual cargados desde la API |
| `wishesLoading` | `boolean` | Spinner de carga |
| `wishMessage` | `string` | Texto del textarea del formulario |
| `postingWish` | `boolean` | Deshabilita el botón durante el POST |
| `wishError` | `string \| null` | Error a mostrar si el POST falla |
| `wishSuccess` | `boolean` | Reemplaza el formulario con mensaje de éxito |
| `wishesRef` | `useRef<HTMLDivElement>` | Ref adjunto al `div#libro-firmas` para scroll programático |

**Interfaz `BirthdayWish`:** `{ wishId: number, authorId: number, authorName: string, message: string, createdAt: string }`

---

### `DashboardClient` — Tarjeta + Modal "Celebrando la Vida"

**Tarjeta (sección compacta ámbar):**
- Posición: entre la Escritura del Día y la tarjeta "Tu Perfil".
- Visible solo si `!birthdayLoading && birthdays.length > 0`.
- Muestra hasta **5** entradas; cumpleañeros de HOY van con emoji 🎂 y texto "¡Hoy es su cumpleaños!".
- Cada fila es un `<Link href="/directorio?userId={id}">` — navega al Directorio y auto-abre el perfil.
- Estado: `birthdays: BirthdayMember[]` · `birthdayLoading: boolean`.
- API: `GET /api/get_birthdays.php` (sin params — usa el mes actual del servidor).

**Interfaz `BirthdayMember`:**
```typescript
{ userId: number, fullName: string, birthDate: string,
  birthDay: number, ward: string, stake: string, photoUrl: string | null }
```

**Modal "Todos los Cumpleañeros" (`showAllBirthdays`):**
- Trigger: botón `"+N hermanos más cumplen años este mes — Ver todos →"` (solo cuando `birthdays.length > 5`).
- **Mobile-First:** bottom sheet en móvil (`items-end`, `rounded-t-2xl`), centrado en sm+ (`sm:items-center`, `sm:rounded-2xl`, `sm:max-w-md`).
- Altura máxima: `max-h-[88vh]` en móvil / `sm:max-h-[80vh]` en desktop. Lista interna con scroll.
- Cada fila: avatar circular ámbar + nombre + día. Emoji 🎂 si es hoy, 🎁 si es otro día del mes.
- Clic en fila: navega a `/directorio?userId={id}` + `setShowAllBirthdays(false)`.
- Cierre: botón × (header) o clic en el overlay exterior (`onClick` en el fondo oscuro).

---

### Reglas de seguridad del módulo:
- `viewerUserId` se lee de `localStorage["cfs_session"].id` en el cliente — **nunca** del servidor.
- El formulario de firmas se oculta si `viewerUserId === member.id` (el perfil es el propio).
- Unicidad de firma: 1 mensaje por autor+destinatario+año → verificado en `post_wish.php` antes del INSERT.
- XSS: React escapa automáticamente el contenido al renderizar `{w.message}` en JSX.
- Inyección SQL: todos los endpoints usan PDO con `prepare()` + `execute([':param' => $valor])`.
- `canvas-confetti` se importa dinámicamente (import dinámico) para evitar crash SSR de Next.js.

---

### Mapa de Rutas del Proyecto
| Ruta | Archivo | Estado | Descripción |
| :--- | :--- | :--- | :--- |
| `/acceso` | `app/acceso/page.tsx` | ✅ Activo | **Puerta de Entrada (Gatekeeper)** — única ruta pública |
| `/login` | `app/login/page.tsx` | ✅ Activo | **Login exclusivo para miembros** — sin registro, sin links de registro |
| `/` | `app/page.tsx` | ✅ Activo | Landing + AuthForm (login/registro) — **protegida por Gatekeeper** |
| `/perfil` | `app/perfil/page.tsx` | ✅ Activo | Paso 2 onboarding — datos de perfil |
| `/perfil/media` | `app/perfil/media/page.tsx` | ✅ Activo | Paso 3 onboarding — fotos y redes |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ Activo | Sala principal tras login |
| `/directorio` | `app/directorio/page.tsx` | ✅ Activo | El BOOK — grid de miembros activos v1.0 |
| `/mensajes` | `app/mensajes/page.tsx` | ✅ Activo (shell) | Bandeja en construcción |
| `/admin` | `app/admin/page.tsx` | ✅ Activo | Panel de Administración — solo `role='admin'` |
| `/pendiente` | `app/pendiente/page.tsx` | ✅ Activo | Sala de espera para usuarios con `status='pending'` — onboarding pendiente de aprobación |
| `/cambiar-contrasena` | `app/cambiar-contrasena/page.tsx` | ✅ Activo | Pantalla de cambio obligatorio de contraseña — bloqueante hasta completar. Solo accesible si `mustChangePassword=true` en sesión *(Migración 12)* |
| `/inspiracion` | `app/inspiracion/page.tsx` | ✅ Activo | Formulario de escritura + cola de espera |
| `/codigo-de-conducta` | `app/codigo-de-conducta/page.tsx` | ✅ Activo | Página legal |
| `/terminos` | `app/terminos/page.tsx` | ✅ Activo | Página legal |
| `/privacidad` | `app/privacidad/page.tsx` | ✅ Activo | Página legal |

---

### Páginas Legales (Server Components estáticas)
| Ruta | Archivo | Estado |
| :--- | :--- | :--- |
| `/codigo-de-conducta` | `app/codigo-de-conducta/page.tsx` | ✅ Creado |
| `/terminos` | `app/terminos/page.tsx` | ✅ Creado |
| `/privacidad` | `app/privacidad/page.tsx` | ✅ Creado |

- Tono: SUD, amigable, basado en Mosíah 18:21.
- Diseño: Mobile-first, `max-w-prose`, `ConexionLogo`, cabecera sticky, links cruzados entre páginas.
- `privacidad/page.tsx` menciona explícitamente la inmutabilidad de `fullName` y `birthDate`.

---

### `DashboardClient.tsx` / `app/dashboard/page.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta página** | `app/dashboard/page.tsx` |
| **Ruta componente** | `components/DashboardClient.tsx` |
| **Tipo** | Server Component (shell) + Client Component (lógica) |
| **Estado** | ✅ Creado |
| **Hito** | Sala Principal — post-login |

#### Comportamiento
- Lee `localStorage["cfs_session"]` al montar. Si no existe sesión válida → `router.replace("/")`.
- Genera saludo dinámico: "Buenos días/tardes/noches, [PrimerNombre]" según la hora del dispositivo.
- Botón **Salir** limpia `cfs_session` y redirige a `/`.

#### Orden de renderizado del `<main>` (completo — post Migración 11)
| Bloque | Contenido | Posición |
| :--- | :--- | :--- |
| 1 | Banner de bienvenida (saludo dinámico + versículo Mosíah 18:21) | Arriba |
| 2 | Escritura del Día (carga de `get_today_scripture.php`) | Segundo |
| 3 | **🎂 Celebrando la Vida** — tarjeta ámbar + modal de cumpleaños *(Mig. 11)* | Tercero |
| 4 | Tarjeta "Tu Perfil" (botones Editar Datos / Fotos y Redes) | Cuarto |
| 5 | Tarjeta "Privacidad de Cuenta" (Ocultar / Reactivar / Eliminar) | Quinto |
| 6 | Tarjeta "Panel de Administración" (solo `role='admin'`) | Sexto |
| 7 | Grid de tarjetas: El BOOK · Actividades · Mensajes | Abajo |

#### Las Tarjetas de Navegación
| # | Título | Destino | Estado | Visibilidad |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Tu Perfil | `/perfil?userId={id}` | ✅ Activo | Todos |
| 2 | **Privacidad de Cuenta** | Modal inline | ✅ Activo | Todos |
| 3 | Panel de Administración | `/admin` | ✅ Activo | Solo `role='admin'` |
| 4 | El BOOK | `/directorio` | Activo para admins / 🔲 Próximamente para users | Condicional por rol |
| 5 | Actividades del grupo | `#` (deshabilitado) | 🚧 Badge "¡En construcción!" | Todos |
| 6 | Mensajes | `/mensajes` | Activo para admins / 🔲 Próximamente para users | Condicional por rol |

#### Tarjeta: Privacidad de Cuenta (nueva — Misión 07)
- Ubicación: Entre "Tu Perfil" y "Panel de Administración".
- **Botón Ocultar / Reactivar:** Llama a `api/account/toggle_visibility.php`. Si `accountStatus='active'` → texto "Ocultar mi cuenta" (`EyeOff`). Si `'inactive'` → "Reactivar mi cuenta en El Book" (`Eye`).
- **Botón Eliminar** (texto en destructive): Llama a `api/account/delete_account.php`. Muestra modal de advertencia extrema antes de ejecutar. Tras éxito, limpia `cfs_session` y redirige a `/`.
- **Estado cliente:** `accountStatus` (inicializado de `session.status`), `showHideModal`, `showDeleteModal`, `privacyLoading`, `privacyError`.
- **Modales:** Fixed-overlay Tailwind. Se cierran con botón ×. Muestran `privacyError` si el API falla.

#### Regla de rol en el Dashboard
- `isAdmin = session?.role === 'admin'`
- Tarjeta "Panel de Administración" solo se renderiza si `isAdmin === true`.
- El BOOK y Mensajes: si `isAdmin`, se muestran como tarjetas activas; si no, badge "Próximamente" + alert al clic.

---

### `RegisterForm.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/RegisterForm.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Estado** | ✅ Verificado — HTTP 201 confirmado en entorno local |
| **Hito** | Fase 1 — Autenticación |

#### Props
| Prop | Tipo | Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `onSuccess` | `(data: ApiSuccessData) => void` | No | Callback ejecutado tras registro exitoso. Recibe `{ id, fullName, email, createdAt }`. |

#### Campos del formulario
| Campo (camelCase) | Input HTML | Regla especial |
| :--- | :--- | :--- |
| `fullName` | `type="text"` | ⛔ Inmutable post-registro — helper text visible al usuario |
| `email` | `type="email"` | Unique — el backend devuelve HTTP 409 si ya existe |
| `phone` | `type="tel"` | Solo dígitos, 7–20 caracteres (validado en backend) |
| `birthDate` | `type="date"` | ⛔ Inmutable post-registro — helper text visible al usuario |
| `password` | `type="password"` | Mínimo 8 caracteres; se limpia del estado React tras éxito |
| `acceptedCodeOfConduct` | `Checkbox` | Se envía como `boolean true` (no `1`, no `"true"`) |

#### Reglas de Piedra aplicadas
- `fullName` y `birthDate` muestran el texto de advertencia **"Este dato no podrá cambiarse después"**
  para que el usuario sea consciente de su inmutabilidad antes de confirmar el registro.
- `acceptedCodeOfConduct` se serializa como `true` (booleano JS) para satisfacer la validación
  `=== true` del backend (`api/register.php`, sección 6.2).
- `password_hash` **nunca** viaja al frontend; la respuesta de éxito expone solo
  `{ id, fullName, email, createdAt }`.

---

### `ProfileForm.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/ProfileForm.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Estado** | ✅ Creado — pendiente de prueba en entorno local |
| **Hito** | Fase 2 — Perfil de Usuario |
| **Endpoint** | `POST /api/update_profile.php` |

#### Props
| Prop | Tipo | Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `userId` | `number` | Sí | ID del usuario autenticado. Se envía en el payload como `userId`. |
| `initialData` | `Partial<FormData>` | No | Valores iniciales para pre-rellenar el formulario (edición de perfil existente). |
| `onSuccess` | `(data: ApiProfileData) => void` | No | Callback tras guardado exitoso. Recibe los datos confirmados por el backend. |

#### Campos del formulario
| Campo (camelCase) | Input | Requerido | Regla especial |
| :--- | :--- | :--- | :--- |
| `country` | `Input type="text"` | No | Nullable — se envía `null` si vacío |
| `state` | `Input type="text"` | No | Nullable — se envía `null` si vacío |
| `city` | `Input type="text"` | No | Nullable — se envía `null` si vacío |
| `ward` | `Input type="text"` | Sí | Máx. 100 chars |
| `stake` | `Input type="text"` | Sí | Máx. 100 chars |
| `bio` | `Textarea` | Sí | Máx. 500 chars — contador de caracteres restantes en tiempo real |
| `showWhatsapp` | `Checkbox` | Sí | Se envía como `boolean` estricto |

#### Comportamiento post-éxito
Tras un guardado exitoso, muestra el mensaje verde durante **1 500 ms** y luego redirige a `/perfil/media?userId={userId}` (Paso 3 del onboarding).

---

### `MediaForm.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/MediaForm.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Estado** | ✅ Creado — UI completa, backend pendiente (Fase 3) |
| **Hito** | Fase 3 — Fotos y Redes Sociales |
| **Ruta de página** | `app/perfil/media/page.tsx` |
| **Wrapper** | `app/perfil/media/MediaFormWrapper.tsx` |
| **Endpoint (pendiente)** | `POST /api/upload_photos.php` · `POST /api/update_social.php` |

#### Props
| Prop | Tipo | Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `userId` | `number` | Sí | ID del usuario autenticado. Recibido desde `MediaFormWrapper` vía `useSearchParams`. |

#### Sección de Fotos
| Regla | Valor |
| :--- | :--- |
| Mínimo obligatorio | 2 fotos (slots con borde azul) |
| Máximo permitido | 5 fotos |
| Foto 0 | Siempre es la foto **principal** (etiqueta visible en el preview) |
| Preview | `URL.createObjectURL()` — local, antes de subir |
| Formatos de entrada | `image/jpeg`, `image/png`, `image/webp` |
| Formato de salida | **Siempre `.jpg`** — procesado por GD, calidad 80% |
| Redimensionado | Si ancho o alto > 1080 px, se escala proporcionalmente a 1080 px máx |
| Validación MIME | `getimagesize()` — sin dependencia de `finfo` (compatible con cPanel) |
| Tabla de destino | `profile_photos` — `user_id`, `sort_order`, `photo_url` |

#### Sección de Redes Sociales
| Campo | Input | Obligatorio | Tabla de destino (futuro) |
| :--- | :--- | :--- | :--- |
| `instagram` | `Input type="text"` | No | `social_networks` |
| `facebook` | `Input type="text"` | No | `social_networks` |

#### Comportamiento del botón "Finalizar"
1. Valida que `filledCount >= 2`. Si no, muestra `ErrorBanner` rojo.
2. Llama a `POST /api/update_social.php` con `{ userId, instagram, facebook }` (JSON).
3. Llama a `POST /api/upload_photos.php` con `FormData` → campo `photos[]`.
4. Solo redirige a `/dashboard` cuando ambos endpoints responden `status: success`.

---

### `ProfileNavActions.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/ProfileNavActions.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Usado en** | `app/perfil/page.tsx`, `app/perfil/media/page.tsx`, `app/inspiracion/page.tsx` |
| **Estado** | ✅ Activo |

Dos botones compactos en el header: "Dashboard" (Link a `/dashboard`) y "Salir" (limpia `cfs_session` + `router.push("/")`).

---

### `ScriptureForm.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/ScriptureForm.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/inspiracion/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoints** | `POST /api/submit_scripture.php` · `GET /api/get_scripture_queue.php` |

Lee `userId` de `localStorage["cfs_session"]`. Envía texto + referencia. Tras éxito muestra la fecha asignada y refresca la cola de espera.

---

### `DirectoryClient.tsx` *(actualizado — Migración 11)*
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/DirectoryClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/directorio/page.tsx` |
| **Estado** | ✅ Activo — v3 con Módulo Cumpleaños |
| **Endpoints** | `GET /api/get_directory.php` · `GET /api/birthday_wishes/get_wishes.php` · `POST /api/birthday_wishes/post_wish.php` |

#### Estado del componente
| Estado | Tipo | Descripción |
| :--- | :--- | :--- |
| `members` | `Member[]` | Todos los miembros activos cargados desde `get_directory.php` |
| `filtered` | `Member[]` (memo) | Resultado de filtros de género, edad, país y búsqueda |
| `selected` | `Member \| null` | Miembro cuyo `MemberSheet` está abierto |
| `focusWishes` | `boolean` | Si `true`, el Sheet hace scroll a `#libro-firmas` |
| `viewerUserId` | `number \| null` | ID del usuario autenticado leído de `localStorage["cfs_session"].id` |
| `genderFilter` | `string` | `"all" \| "M" \| "F"` |
| `ageMinStr` / `ageMaxStr` | `string` | Valores de los inputs de edad (convertidos a int al filtrar) |
| `country` | `string` | País seleccionado para filtrar (`"all"` = sin filtro) |
| `query` | `string` | Texto de búsqueda libre |

#### Insignias en el grid — 3 niveles de cumpleaños
Ver tabla completa en la sección [🎂 MÓDULO → Insignias de cumpleaños en el grid].

#### `MemberSheet` — sub-componente embebido
- Muestra el perfil completo (galería, ward/stake, bio, WhatsApp, redes sociales).
- Si `isBirthdayMonth(member.birthDate)`: renderiza la sección **"Celebrando la Vida"** con:
  - Banner emoji+texto de cumpleaños.
  - **Libro de Firmas**: lista de `BirthdayWish[]` (año actual) + formulario de nueva firma.
  - Si `isBirthdayToday(member.birthDate)`: dispara `canvas-confetti` (importación dinámica, 160 partículas).
  - Si `focusWishes === true`: scroll suave al `div#libro-firmas` con delay 380 ms.

#### Funciones helper de fecha
Ver tabla completa en la sección [🎂 MÓDULO → Helpers de fechas].

---

## 🔌 REGISTRO DE ENDPOINTS API

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `api/register.php` | POST JSON | Registro de nuevo usuario |
| `api/login.php` | POST JSON | Login; devuelve `{id, fullName, email}` |
| `api/update_profile.php` | POST JSON | UPSERT en tabla `profiles` |
| `api/get_profile.php` | GET `?userId=` | Devuelve `users + profiles + social_networks` (hidratación del formulario) |
| `api/update_social.php` | POST JSON | UPSERT de 6 redes (`instagram`, `facebook`, `linkedin`, `twitter`, `tiktok`, `website`) en `social_networks` |
| `api/upload_photos.php` | POST multipart | Valida con `getimagesize()` (GD), redimensiona a ≤1080px, guarda **siempre como `.jpg` calidad 80**. Try/catch `\Throwable` global. Rollback BD + limpieza física si falla. |
| `api/submit_scripture.php` | POST JSON | Añade escritura a la cola; calcula `scheduled_date` automáticamente |
| `api/get_today_scripture.php` | GET | Devuelve escritura de `scheduled_date = CURDATE()` |
| `api/get_scripture_queue.php` | GET | Lista escrituras con `scheduled_date >= CURDATE()` (máx. 60) |
| `api/get_directory.php` | GET | Todos los usuarios `status='active'` con foto principal |
| `api/validate_invitation.php` | POST JSON | Valida la Contraseña de Invitación Master (público) |
| `api/update_invitation_password.php` | POST JSON | Establece nueva contraseña de invitación — solo `admin` |
| `api/get_invitation_log.php` | GET `?requesterId=` | Historial de cambios de contraseña de invitación — solo `admin` |
| `api/account/toggle_visibility.php` | POST JSON `{userId}` | Alterna `users.status` entre `'active'`↔`'inactive'`; registra en `user_departures_log` con `acted_by='self'` |
| `api/account/delete_account.php` | POST JSON `{userId}` | Borrado en cascada manual + `unlink()` de fotos + `user_departures_log action='deleted', acted_by='self'` |
| `api/admin/get_departures.php` | GET `?requesterId=` | Lista `user_departures_log` DESC con `actedBy` + `adminName` — solo `admin` |
| `api/admin/get_pending_users.php` | GET `?requesterId=` | Usuarios con `status='pending'`; campos: id, fullName, email, phone, createdAt — solo `admin` |
| `api/admin/authorize_user.php` | POST JSON `{requesterId, targetUserId}` | Activa usuario (`status='active'`) + inserta snapshot en `welcome_registry` — atómico — solo `admin` |
| `api/admin/get_welcome_registry.php` | GET `?requesterId=` | Historial completo de autorizaciones en `welcome_registry` — solo `admin` |
| `api/admin/delete_user_admin.php` | POST JSON `{requesterId, targetUserId}` | Borrado profundo por admin: log + cascada 5 tablas + `unlink()` fotos — atómico con FOR UPDATE — solo `admin` |
| `api/get_birthdays.php` | GET `?month=INT` (optional) | Cumpleañeros del mes (default: mes actual). Devuelve `userId, fullName, birthDate, birthDay, ward, stake, photoUrl`. Solo `status='active'` |
| `api/birthday_wishes/get_wishes.php` | GET `?recipientId=INT` | Mensajes del Libro de Firmas para un cumpleañero en el año actual. Devuelve `wishId, authorId, authorName, message, createdAt` |
| `api/birthday_wishes/post_wish.php` | POST JSON `{authorId, recipientId, message}` | Guarda un mensaje de felicitación. Validaciones: autor≠destinatario, ambos activos, un mensaje por autor+destinatario por año, 3-500 chars |
| `api/admin/reset_password.php` | POST JSON `{requesterId, targetUserId}` | Admin genera contraseña temporal (12 chars CSPRNG, bcrypt cost 12) y activa `must_change_password=1`. Devuelve `tempPassword` en texto plano solo en esta respuesta — solo `admin` *(Migración 12)* |
| `api/account/change_password_forced.php` | POST JSON `{userId, newPassword}` | Usuario con `must_change_password=1` establece su nueva contraseña (mín. 8 chars); hace `password_hash` con bcrypt y limpia el flag a `0` *(Migración 12)* |

---

### `GatekeeperClient.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/GatekeeperClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/acceso/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoint** | `POST /api/validate_invitation.php` |

#### Comportamiento
- Si `sessionStorage["cfs_invite_valid"] === "1"` o `localStorage["cfs_session"]` existe → redirige directo a `/`.
- Formulario mínimalista: un `Input type="password"` + botón "Ingresar".
- **Botón "¿Ya eres miembro? → Iniciar Sesión":** redirige a `/login` con `router.push("/login")`. **NO establece `cfs_invite_valid`** — el login completo ocurre en la ruta aislada `/login`.
- En éxito: `sessionStorage.setItem("cfs_invite_valid", "1")` → `router.replace("/")`.
- **UI Anti-Brute-Force (3 niveles):**
  - `"error"` → banner rojo con `AlertTriangle`. Input y botón activos.
  - `"warning"` → banner ámbar con `AlertTriangle`. Mensaje "ÚLTIMO INTENTO".
  - `"blocked"` → banner rojo con `ShieldAlert`. Encabezado cambia a "Acceso Bloqueado". Input y botón **deshabilitados**. Ícono cambia a `ShieldOff`.

#### Clave de sessionStorage
| Clave | Valor | Propósito |
| :--- | :--- | :--- |
| `cfs_invite_valid` | `"1"` | Acredita haber pasado la puerta en la sesión actual |

---

### `LoginOnlyClient.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/LoginOnlyClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/login/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoint** | `POST /api/login.php` |

#### Comportamiento
- Si `localStorage["cfs_session"]` existe al montar → `router.replace("/dashboard")`.
- Formulario mínimalista: `Input type="email"` + `Input type="password"` (toggle ojo) + botón "Ingresar".
- **NO incluye** ningún link, tab ni referencia a registro — aislamiento total.
- Link "Solicita una invitación" → `router.push("/acceso")` (único link externo al formulario).
- Usa patrón estándar: `AbortController(15 s)` + `parseJsonResponse` + `navigating = true`.
- En éxito: `localStorage.setItem("cfs_session", JSON.stringify(result.data))`.
  - Si `result.data.mustChangePassword === true` → `router.push("/cambiar-contrasena")` *(Migración 12)*.
  - Si `result.data.status === 'pending'` → `router.push("/pendiente")`.
  - Caso base → `router.push("/dashboard")`.
- Error local (campo vacío): validación inline antes de llamar al fetch.

---

### `InvitationPasswordAdmin.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/InvitationPasswordAdmin.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Usado en** | `components/AdminClient.tsx` (sección al final del `<main>`) |
| **Estado** | ✅ Activo |
| **Endpoints** | `POST /api/update_invitation_password.php` · `GET /api/get_invitation_log.php` |

#### Props
| Prop | Tipo | Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `adminId` | `number` | Sí | ID del admin autenticado (`session.id` de `cfs_session`). Se envía como `requesterId`. |

#### Funcionalidad
- Formulario con `Input type="password"` (toggle mostrar/ocultar) para establecer nueva contraseña de invitación (mín. 6 chars).
- Tabla de historial: muestra `adminName`, `adminId`, `createdAt` de las últimas 50 entradas. La primera fila tiene badge "activa".
- Botón "Refrescar" recarga el historial sin recargar la página.
- `password_hash` **nunca** aparece en la UI ni en la respuesta de la API.
- `plain_code` se expone solo via `get_invitation_log.php` (ruta admin).
- Cada fila del historial tiene botón **ojo** (toggle visible/oculto) y botón **copiar** (Clipboard API con fallback `execCommand`). El ID copiado activo se rastrea con estado `copiedId` para mostrar el checkmark 2.5 s.

---

### `ChangePasswordClient.tsx` *(Migración 12 — Cambio Obligatorio de Contraseña)*
| Atributo | Valor |
| :--- | :--- |
| **Ruta componente** | `components/ChangePasswordClient.tsx` |
| **Ruta página** | `app/cambiar-contrasena/page.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Estado** | ✅ Activo |
| **Endpoint** | `POST /api/account/change_password_forced.php` |

#### Comportamiento
- Al montar: lee `localStorage["cfs_session"]`. Si no existe sesión, redirige a `/`. Si `mustChangePassword !== true`, redirige a `/dashboard` (página no accesible sin la bandera activa).
- Muestra un **aviso ámbar** de seguridad explicando que el acceso está bloqueado hasta completar el cambio.
- Formulario con dos campos `Input type="password"` (nueva contraseña + confirmación), cada uno con toggle de visibilidad.
- Validación en tiempo real: indicador verde/rojo de coincidencia. Botón submit deshabilitado hasta que ambos campos coincidan y cumplan mínimo 8 chars.
- En éxito HTTP 200: actualiza `localStorage["cfs_session"]` con `mustChangePassword: false` → redirige a `/dashboard` tras 2 s.
- `password_hash` **nunca** viaja al frontend; el hash se calcula en `change_password_forced.php`.

#### Estado interno
| Estado | Tipo | Descripción |
| :--- | :--- | :--- |
| `session` | `SessionData \| null` | Datos de sesión leídos de `cfs_session` |
| `newPassword` | `string` | Campo nueva contraseña |
| `confirmPassword` | `string` | Campo confirmación |
| `showNew` / `showConfirm` | `boolean` | Toggle visibilidad de cada campo |
| `isLoading` | `boolean` | Durante el POST al endpoint |
| `error` | `string \| null` | Error de validación o de API |
| `success` | `boolean` | Reemplaza el formulario con pantalla de éxito |

---

### `ProfileTabs.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/ProfileTabs.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Usado en** | `app/perfil/ProfileFormWrapper.tsx`, `app/perfil/media/MediaFormWrapper.tsx` |
| **Estado** | ✅ Activo |

Tabs de navegación visual entre "Datos Personales" (`/perfil?userId=`) y "Fotos y Redes" (`/perfil/media?userId=`). Usa `usePathname()` para marcar la pestaña activa. No hace submit del formulario.

### `AdminClient.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/AdminClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/admin/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoints** | `GET /api/get_users_admin.php` · `POST /api/update_user_admin.php` · `GET /api/admin/get_pending_users.php` · `POST /api/admin/authorize_user.php` · `GET /api/admin/get_departures.php` · `POST /api/admin/delete_user_admin.php` · `GET /api/admin/get_welcome_registry.php` · `POST /api/admin/reset_password.php` |

#### Orden de renderizado del `<main>` (6 bloques)
| Bloque | Contenido | Posición |
| :--- | :--- | :--- |
| 1 | KPI Cards — 6 tarjetas + panel desplegable de admins | Arriba |
| 2 | `InvitationPasswordAdmin` (contraseña activa + modal historial) | Segundo |
| 2b | **Pendientes de Aprobación** — tabla + botón "Autorizar" + modal "Registro de Bienvenida" | Tercero |
| 3 | **Resetear Contraseña** — buscador inline, confirmación ámbar, botón "Resetear PASS", display de clave copiable con `navigator.clipboard` *(Migración 12)* | Cuarto |
| 4 | **Usuarios Registrados** — últimos 5 (preview) + "Ver a todos los hermanos" → modal completo con búsqueda, paginación, edición y eliminación | Quinto |
| 5 | **Bajas / Ocultos** — últimos 5 + traceabilidad + "Ver todos" → modal historial completo | Abajo |

#### KPIs — 6 tarjetas (grid responsivo)
| KPI | Fuente | Icono | Color | Acción al clic |
| :--- | :--- | :--- | :--- | :--- |
| Miembros | `users.length` | `Users` | neutro | — |
| Activos | `users.filter(status='active')` | `UserCheck` | emerald | — |
| Admins | `users.filter(role='admin')` | `Shield` | primary | Toggle panel desplegable |
| Ocultos | `users.filter(status='inactive')` | `EyeOff` | slate | `scrollToBajas()` |
| Eliminados | `departures.filter(action='deleted')` | `UserX` | destructive | `scrollToBajas()` |
| Pendientes | `pendingUsers.length` | `Clock` | amber | Scroll a `#seccion-pendientes` |

- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.
- **No hay endpoint dedicado de stats** — valores computados en `useMemo kpis`.

#### Bloque 2b: Pendientes de Aprobación
- Estado: `pendingUsers: PendingUser[]`, `loadingPending`, `pendingError`, `authorizingId`, `authorizeError`, `authorizeSuccess`.
- Tabla con columnas: Nombre / Correo (hidden sm) / Celular / Fecha (DD-MM-YYYY) / Botón "Autorizar".
- Botón "Autorizar" → `POST api/admin/authorize_user.php` → cambia status a `'active'` + crea snapshot en `welcome_registry`.
- Botón "Registro de Bienvenida" → abre modal con historial completo de `welcome_registry`.
- Interfaz `PendingUser`: `{ id, fullName, email, phone, createdAt }`.
- Interfaz `WelcomeEntry`: `{ id, userId, userName, userEmail, userPhone, adminId, adminName, authorizedAt }`.

#### Bloque 4: Gestión completa de hermanos (modal `allUsersOpen`)
- **Vista previa** en dashboard: últimos 5 usuarios (`users.slice(0, 5)`) en lista compacta de solo lectura.
- **Link "Ver a todos los hermanos"** → abre `<Dialog>` `allUsersOpen`.
- **Modal** contiene: buscador + lista paginada `Collapsible` + panel de edición expandido por usuario.
- **Panel de edición** (dentro del modal): Rol (`select`), Estatus (`select`), Fecha de ingreso (`date input`), botón "Guardar Cambios".
- **Eliminación profunda**: botón "Eliminar cuenta permanentemente" → `deleteConfirm` (estado de confirmación por `id`). Confirmado → `POST api/admin/delete_user_admin.php`. Cascada: `social_networks`, `profile_photos`, `profiles`, `daily_scriptures`, `invitation_password_log`, `users` + `unlink()` físico de fotos.
- **Guardia:** Admin no puede eliminar ni degradar su propia cuenta.
- Estado clave: `allUsersOpen`, `deletingId`, `deleteConfirm`, `deleteError`.

#### Bloque 5: Bajas / Ocultos
- **Vista previa** en dashboard: últimos 5 registros (`departures.slice(0, 5)`) con línea de trazabilidad.
- **Trazabilidad** por fila: `"Por: el mismo usuario"` si `actedBy='self'`; `"Por: Admin [adminName]"` si `actedBy='admin'`.
- **Link "Ver todos"** → abre `<Dialog>` `allDepsOpen` con el historial completo.
- Estado clave: `departures: DepartureEntry[]`, `allDepsOpen`.
- Interfaz `DepartureEntry`: `{ id, userName, action: 'hidden'|'deleted', reason: string|null, actedBy: 'self'|'admin', adminName: string|null, createdAt }`.

#### Búsqueda y Paginación (cliente — en modal allUsersOpen)
| Concepto | Implementación |
| :--- | :--- |
| Constante | `PAGE_SIZE = 10` usuarios por página |
| Estado | `currentPage: number` (inicia en `1`) |
| Reset | `useEffect` → `setCurrentPage(1)` cuando cambia `query` |
| Reset accordion | `useEffect` → `setOpenId(null)` cuando cambia `currentPage` |
| `filtered` | `useMemo` — filtra `users` por `fullName` o `email` (case-insensitive) |
| `totalPages` | `useMemo` — `Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))` |
| `paginated` | `useMemo` — `filtered.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE)` |
| Controles UI | Botones "Anterior" / "Siguiente"; deshabilitados en extremos |

> La paginación y búsqueda son **100% client-side** — eficiente para ≤ 250 miembros.

---

### `DirectoryClient.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/DirectoryClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/directorio/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoint** | `GET /api/get_directory.php` |

Grid responsivo (1→2→3 columnas). Buscador en tiempo real por nombre, barrio o estaca.

#### 🏅 Sistema de Insignias (Badges) — Lógica 100% Frontend
Las insignias se calculan en tiempo real en `memberBadge(m: Member)` (`DirectoryClient.tsx:106`). **No existe un campo `insignia` en la base de datos** — son derivadas de `role` y `group_join_date`.

| Insignia | Ícono | Color | Condición |
| :--- | :--- | :--- | :--- |
| **Admin** | `Shield` | `bg-primary/90` | `users.role = 'admin'` |
| **Nuevo** | `Sparkles` | `bg-amber-500/90` | `profiles.group_join_date` hace ≤ 6 meses |
| **Confianza** | `Handshake` | `bg-emerald-600/90` | `profiles.group_join_date` hace ≥ 12 meses |
| *(sin insignia)* | — | — | Sin `group_join_date`, o 7–11 meses en el grupo |

**Campos fuente en DB:**
- Insignia "Admin" → `users.role` (ENUM `'admin'`|`'user'`)
- Insignias "Nuevo" / "Confianza" → `profiles.group_join_date` (DATE, nullable, 🔒 solo admin)

**Campo fuente en JSON del API (`get_directory.php`):**
- `role` ← `users.role`
- `groupJoinDate` ← `profiles.group_join_date`

> **Regla clave para importación CSV:** Para asignar la insignia "Confianza" o "Nuevo" a un miembro hay que actualizar `profiles.group_join_date` con la fecha real de ingreso al grupo. La insignia aparecerá automáticamente en el frontend sin ningún cambio de código.

---

## 🛡️ TABLAS DE SEGURIDAD Y REGISTRO

| Concepto | Tabla / Campo (DB) | Frontend (camelCase) | Tipo de Dato |
| :--- | :--- | :--- | :--- |
| **Tabla OTP** | `otp_sessions` | - | **Tabla** |
| Hash del Código | `otp_hash` | - | String |
| Expiración | `expires_at` | `expiresAt` | Datetime |
| Intentos fallidos | `attempts` | `attempts` | Int |
| Código Validado | `is_verified` | `isVerified` | Bool (0/1) |

> ⚠️ **TABLAS ELIMINADAS (Migración 10):** `whitelist_phones` y `whitelist_audit_log` fueron **eliminadas permanentemente** (`DROP TABLE`) en `database/migracion_10_cleanup_whitelist_trazabilidad.sql`. El acceso al sistema ya no requiere pre-aprobación en lista blanca. El control de acceso se gestiona exclusivamente mediante la **Contraseña de Invitación Master** (`invitation_password_log`).

### Tabla: `otp_sessions` *(Creada manualmente — Sesiones OTP)*
- `otp_hash`: VARCHAR(255) — Hash bcrypt del código de verificación
- `expires_at`: DATETIME — Tiempo de expiración del código
- `attempts`: INT DEFAULT 0 — Intentos fallidos de validación
- `is_verified`: TINYINT(1) DEFAULT 0 — 0 = pendiente; 1 = código validado

### Tabla: `welcome_registry` *(Migración 09)*
- `id`: INT AUTO_INCREMENT — Clave primaria
- `user_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Miembro autorizado
- `user_name`: VARCHAR(150) NOT NULL — Nombre del miembro **snapshot al momento de la autorización** (texto plano; persiste si el usuario se elimina)
- `user_email`: VARCHAR(255) NOT NULL — Correo snapshot
- `user_phone`: VARCHAR(20) NOT NULL — Teléfono snapshot
- `admin_id`: INT NOT NULL — FK → `users.id` ON DELETE RESTRICT | Admin que autorizó
- `admin_name`: VARCHAR(150) NOT NULL — Nombre del admin snapshot
- `authorized_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP — Fecha y hora de la autorización

> **Regla de negocio:** Se inserta UNA fila por cada usuario autorizado, dentro de la misma transacción de `authorize_user.php` que cambia `users.status = 'active'`. Es un **registro histórico inmutable** (snapshot). Si el usuario se elimina, `ON DELETE CASCADE` limpia la fila automáticamente.
> **Propósito:** Ministración — evidencia de quién fue bienvenido, cuándo y qué admin lo autorizó.
> **Script:** `database/migracion_09_pending_approval.sql`

### Tabla: `birthday_wishes` *(Migración 11 — Módulo: Celebrando la Vida)*
- `id`: INT UNSIGNED AUTO_INCREMENT — Clave primaria
- `recipient_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Cumpleañero (destinatario)
- `author_id`: INT NOT NULL — FK → `users.id` ON DELETE CASCADE | Quien escribe la firma
- `message`: VARCHAR(500) NOT NULL — Texto del mensaje edificante
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

> **Regla de negocio:** Un autor solo puede escribir UN mensaje por destinatario por año calendario (aplicado en `post_wish.php`, no con restricción DB). El mensaje se almacena sin HTML-encoding; React protege XSS en el renderizado. Solo aplica entre usuarios con `status='active'`.
> **Script:** `database/migracion_11_birthday_wishes.sql`

### Tabla: `user_departures_log` *(Migraciones 07 + 10)*
- `id`: INT UNSIGNED AUTO_INCREMENT — Clave primaria
- `user_name`: VARCHAR(150) NOT NULL — Nombre del usuario **al momento de la acción** (texto plano; persiste aunque el usuario sea eliminado)
- `action`: ENUM('hidden','deleted') NOT NULL — `hidden` = cuenta ocultada; `deleted` = cuenta eliminada permanentemente
- `reason`: TEXT NULL — Razón opcional proporcionada por el usuario (solo en acciones propias)
- `acted_by`: ENUM('self','admin') NOT NULL DEFAULT 'self' — Quién ejecutó la acción *(Migración 10)*
- `admin_name`: VARCHAR(150) NULL DEFAULT NULL — Nombre del admin si `acted_by='admin'` *(Migración 10)*
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

> **Regla de negocio — hidden (self):** `toggle_visibility.php` → `acted_by='self'`, `admin_name=NULL`.
> **Regla de negocio — hidden (admin):** `update_user_admin.php` cuando `newStatus='inactive'` → `acted_by='admin'`, `admin_name=<full_name del admin>`.
> **Regla de negocio — deleted (self):** `delete_account.php` → `acted_by='self'`, `admin_name=NULL`.
> **Regla de negocio — deleted (admin):** `delete_user_admin.php` → `acted_by='admin'`, `admin_name=<full_name del admin>`.
> **Propósito:** Ministración — el liderazgo puede saber quién se fue, cuándo, y si fue acción propia o administrativa.
> **Scripts:** `database/migracion_07_user_departures.sql` · `database/migracion_10_cleanup_whitelist_trazabilidad.sql`