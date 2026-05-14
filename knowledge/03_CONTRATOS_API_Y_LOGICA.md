# 🤝 CONTRATOS DE API Y LÓGICA DE NEGOCIO

## 📡 PROTOCOLO DE INTEGRACIÓN
- **Intercambio:** JSON UTF-8.
- **Base URL (Producción):** `https://friends.tecnidepot.com/api/`
- **Base URL (Local/Dev):** `http://localhost/CONEXION_FRIENDS_SUD/api/`
- **Convención de Rutas:** Todo endpoint PHP reside estrictamente dentro de la carpeta `/api/`.
  Ningún archivo PHP de backend puede existir fuera de esta carpeta.
- **Headers Base:** CORS habilitado, Methods (`POST`, `GET`, `OPTIONS`).
- **Estructura Standard de Respuesta:**
  ```json
  { "status": "success | error", "message": "string", "data": [] }
  ```

- **Estructura de Respuesta de Error 500 (Blindaje \Throwable):**
  ```json
  { "status": "error", "message": "Error interno del servidor.", "debug": "PDOException: ...", "data": [] }
  ```
  > Todos los endpoints de este módulo envuelven su lógica de DB en `try { ... } catch (\Throwable $e)`.
  > El campo `debug` expone `$e->getMessage()` para facilitar el diagnóstico. Para producción estricta,
  > condicionar su emisión con `getenv('APP_ENV') === 'production'` si se desea ocultarlo.
  > **Nunca** se permiten errores 500 que devuelvan HTML de Apache — el catch garantiza JSON válido siempre.

---

## ✨ MÓDULO ENTRETEJIDOS — Contratos API (Migración 13)

> **Principio:** Edificación mutua sin popularidad. Cero contadores públicos en todas las respuestas.

---

### Endpoint: `api/entretejidos/get_messages.php`
- **Método:** `GET`
- **Ruta completa:** `/api/entretejidos/get_messages.php`
- **Autenticación:** Ninguna (lectura pública de perfiles activos)
- **Alcance de DB:** SELECT en `woven_messages` + JOIN `users` + LEFT JOIN `profile_photos`

**Params de query (GET):**
```
?recipientId=INT   — requerido
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "message": "",
  "data": [
    {
      "messageId":      1,
      "authorId":       42,
      "authorName":     "Ana Pérez",
      "authorPhotoUrl": "/uploads/profiles/user_42_xxx.jpg",
      "promptKey":      "virtue",
      "message":        "Lo que más admiro de ella es…",
      "relationType":   "Barrio",
      "createdAt":      "2026-05-14 10:30:00"
    }
  ]
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 200 | Éxito (array vacío si aún no hay mensajes) |
| 400 | `recipientId` inválido |
| 405 | Método distinto de GET |
| 500 | Error interno |

---

### Endpoint: `api/entretejidos/post_message.php`
- **Método:** `POST`
- **Ruta completa:** `/api/entretejidos/post_message.php`
- **Autenticación:** Ninguna (validación de IDs activos en backend)
- **Alcance de DB:** SELECT `users` + SELECT `woven_messages` (unicidad) + INSERT `woven_messages`

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "authorId":     "int — requerido",
  "recipientId":  "int — requerido, distinto de authorId",
  "promptKey":    "string — requerido, ∈ ['virtue','feeling','memory','light']",
  "message":      "string — requerido, 10–500 chars",
  "relationType": "string | null — opcional, máx. 100 chars"
}
```

**Response Éxito — HTTP 201:**
```json
{
  "status":  "success",
  "message": "¡Tu mensaje quedó entretejido en su historia!",
  "data": {
    "messageId":      7,
    "authorId":       42,
    "authorName":     "Ana Pérez",
    "authorPhotoUrl": "/uploads/profiles/user_42_xxx.jpg",
    "promptKey":      "light",
    "message":        "Siempre que hablo con ella…",
    "relationType":   "Instituto",
    "createdAt":      "2026-05-14 11:00:00"
  }
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 201 | Mensaje creado |
| 400 | IDs inválidos / `authorId === recipientId` / `promptKey` inválido / `message` < 10 chars |
| 404 | Uno o ambos usuarios no existen o no son `status='active'` |
| 405 | Método distinto de POST |
| 409 | El autor ya tiene un mensaje en este perfil |
| 500 | Error interno |

---

### Endpoint: `api/entretejidos/get_virtues.php`
- **Método:** `GET`
- **Ruta completa:** `/api/entretejidos/get_virtues.php`
- **Autenticación:** Ninguna
- **Alcance de DB:** SELECT DISTINCT `virtue_recognitions`

**⚠️ REGLA FUNDAMENTAL:** Esta respuesta NUNCA incluye conteos numéricos. Solo arrays de claves.

**Params de query (GET):**
```
?recipientId=INT   — requerido
?viewerId=INT      — opcional (para saber qué virtudes dio el viewer)
```

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "",
  "data": {
    "virtuesReceived": ["trust", "joy", "service"],
    "viewerGave":      ["trust"]
  }
}
```

> `virtuesReceived` — virtudes que tiene el perfil (de cualquier persona). Sin números.
> `viewerGave` — virtudes que el viewer específicamente dio (para el estado del toggle). Sin números.

| Código HTTP | Causa |
| :--- | :--- |
| 200 | Éxito (arrays vacíos si no hay reconocimientos) |
| 400 | `recipientId` inválido |
| 405 | Método distinto de GET |
| 500 | Error interno |

---

### Endpoint: `api/entretejidos/toggle_virtue.php`
- **Método:** `POST`
- **Ruta completa:** `/api/entretejidos/toggle_virtue.php`
- **Autenticación:** Ninguna (validación de IDs activos en backend)
- **Alcance de DB:** SELECT `users` + SELECT + DELETE/INSERT `virtue_recognitions`

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "authorId":    "int — requerido",
  "recipientId": "int — requerido, distinto de authorId",
  "virtueKey":   "string — requerido, ∈ ['trust','joy','light','service']"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "¡Virtud reconocida con amor!",
  "data": {
    "action":    "added",
    "virtueKey": "trust"
  }
}
```

> `action` puede ser `"added"` (INSERT realizado) o `"removed"` (DELETE realizado).

| Código HTTP | Causa |
| :--- | :--- |
| 200 | Toggle ejecutado (add o remove) |
| 400 | IDs inválidos / `authorId === recipientId` / `virtueKey` inválido |
| 404 | Uno o ambos usuarios no existen o no son `status='active'` |
| 405 | Método distinto de POST |
| 500 | Error interno |

---

## 🛠️ ENDPOINTS REGISTRADOS (CONTRATOS)

### Endpoint: `api/register.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/register.php`
- **Autenticación:** Ninguna (endpoint público)
- **Alcance de DB:** INSERT en tabla `users` ÚNICAMENTE.
  No toca: `profiles`, `profile_photos`, `social_networks`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "fullName":               "string — requerido, min 3 chars, max 150",
  "email":                  "string — requerido, formato email válido",
  "phone":                  "string — requerido, solo dígitos (7–20 chars)",
  "birthDate":              "string — requerido, formato YYYY-MM-DD, fecha pasada",
  "password":               "string — requerido, min 8 chars",
  "acceptedCodeOfConduct":  "boolean — debe ser true (booleano estricto)"
}
```

**Response Éxito — HTTP 201:**
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente.",
  "data": {
    "id":        "int",
    "fullName":  "string",
    "email":     "string",
    "status":    "string — siempre 'pending' en el registro inicial",
    "createdAt": "string (YYYY-MM-DD HH:MM:SS)"
  }
}
```

**Response Error — HTTP 400 / 409 / 500:**
```json
{
  "status": "error",
  "message": "string — descripción del error",
  "data":    []
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campo faltante, formato inválido, `acceptedCodeOfConduct !== true` |
| 409 | Email ya registrado (`SQLSTATE 23000`) |
| 500 | Error interno de servidor o DB |

> **Flujo de aprobación (Migración 09):** El registro crea el usuario con `status='pending'`. No existe validación previa de lista blanca. El único requisito de acceso es conocer la **Contraseña de Invitación Master** (verificada en `/acceso` → `validate_invitation.php`). Un admin debe hacer clic en "Autorizar" en el Panel para activar la cuenta (`status='active'`). Mientras el usuario está `pending`, el login lo redirige a `/pendiente`.

---

### Endpoint: `api/login.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/login.php`
- **Autenticación:** Ninguna (endpoint público — verifica credenciales propias)
- **Alcance de DB:** SELECT en tabla `users` ÚNICAMENTE.
  No toca: `profiles`, `profile_photos`, `social_networks`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "email":    "string — requerido, formato email válido",
  "password": "string — requerido, no vacío"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso.",
  "data": {
    "id":                 "int",
    "fullName":           "string",
    "email":              "string",
    "role":               "string — 'admin' | 'user'",
    "status":             "string — 'active' | 'inactive' | 'blocked' | 'pending'",
    "mustChangePassword": "boolean — true si el admin reseteó la contraseña y el usuario debe crear una nueva (Migración 12)"
  }
}
```

> **Flujo `mustChangePassword`:** Si `true`, el frontend redirige al usuario a `/cambiar-contrasena` con prioridad sobre cualquier otra ruta (incluso `/pendiente`). El acceso a la plataforma queda bloqueado hasta que el usuario complete el cambio y el flag vuelva a `false`.

**Response Error — HTTP 400 / 401 / 405 / 500:**
```json
{
  "status": "error",
  "message": "string — descripción del error",
  "data":    []
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campo faltante o formato de email inválido |
| 401 | Usuario no encontrado o contraseña incorrecta |
| 405 | Método distinto de POST |
| 500 | Error interno de servidor o DB |

> **Regla de seguridad:** La respuesta HTTP 401 es idéntica tanto si el email no existe como si la contraseña es incorrecta. Esto previene la enumeración de correos registrados.
> `password_hash` **nunca** se incluye en ninguna respuesta al Front.

---

### Endpoint: `api/update_profile.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/update_profile.php`
- **Autenticación:** Ninguna por ahora (se añadirá JWT en fase futura)
- **Alcance de DB:** INSERT ... ON DUPLICATE KEY UPDATE en tabla `profiles` ÚNICAMENTE.
  No toca: `users`, `profile_photos`, `social_networks`.

**Payload (Front → Back) — camelCase:**
```json
{
  "userId":       "int    — requerido, entero positivo, debe existir en users.id",
  "ward":         "string — requerido, trim(), máx. 100 chars",
  "stake":        "string — requerido, trim(), máx. 100 chars",
  "bio":          "string — requerido, trim(), máx. 500 chars",
  "showWhatsapp": "boolean — debe ser true o false (booleano estricto)",
  "country":      "string — opcional, trim(), máx. 100 chars, null si vacío",
  "state":        "string — opcional, trim(), máx. 100 chars, null si vacío",
  "city":         "string — opcional, trim(), máx. 100 chars, null si vacío"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "message": "Perfil actualizado exitosamente.",
  "data": {
    "userId":       "int",
    "ward":         "string",
    "stake":        "string",
    "bio":          "string",
    "showWhatsapp": "boolean",
    "country":      "string | null",
    "state":        "string | null",
    "city":         "string | null"
  }
}
```

**Response Error — HTTP 400 / 404 / 409 / 500:**
```json
{
  "status": "error",
  "message": "string — descripción del error",
  "data":    []
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campo requerido faltante, `userId` no es entero positivo, `showWhatsapp` no es booleano, campo excede longitud máxima |
| 404 | `userId` no existe en la tabla `users` |
| 409 | Error de FK (SQLSTATE 23000) |
| 500 | Error interno de servidor o DB |

---

---

### Endpoint: `api/get_profile.php`
- **Método:** `GET`
- **Autenticación:** Ninguna (se añadirá en fase de seguridad)
- **Alcance de DB:** SELECT en `users` + LEFT JOIN `profiles` + SELECT en `social_networks` + SELECT en `profile_photos`.

**Query Params:**
```
?userId=INT   — requerido, entero positivo
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": {
    "userId":       "int",
    "fullName":     "string",
    "email":        "string",
    "ward":         "string",
    "stake":        "string",
    "bio":          "string",
    "showWhatsapp": "boolean",
    "country":      "string | null",
    "state":        "string | null",
    "city":         "string | null",
    "socials": {
      "instagram": "string",
      "facebook":  "string",
      "linkedin":  "string",
      "twitter":   "string",
      "tiktok":    "string",
      "website":   "string"
    },
    "photos": [
      { "photoUrl": "string", "sortOrder": "int" }
    ]
  }
}
```

**Response Error — HTTP 400 / 404 / 405 / 500**

| Código HTTP | Causa |
| :--- | :--- |
| 400 | `userId` ausente o no es entero positivo |
| 404 | Usuario no encontrado |
| 405 | Método distinto de GET |
| 500 | Error interno de servidor o DB |

---

### Endpoint: `api/update_social.php`
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Alcance de DB:** `INSERT ... ON DUPLICATE KEY UPDATE` en `social_networks`. UNIQUE KEY en `(user_id, network_type)`.

**Payload (Front → Back) — camelCase:**
```json
{
  "userId":    "int    — requerido",
  "instagram": "string — handle sin @, máx. 100 chars",
  "facebook":  "string — handle o nombre, máx. 100 chars",
  "linkedin":  "string — URL completa, máx. 300 chars",
  "twitter":   "string — handle sin @, máx. 100 chars",
  "tiktok":    "string — handle sin @, máx. 100 chars",
  "website":   "string — URL completa, máx. 300 chars"
}
```

> Los campos vacíos se ignoran (no se insertan ni borran). Para borrar una red, enviar string vacío no tiene efecto; la eliminación es una operación futura de admin.

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Redes sociales guardadas correctamente.",
  "saved":   ["instagram", "facebook"]
}
```

**Response Error — HTTP 400 / 405 / 500**

---

### Endpoint: `api/upload_photos.php`
- **Método:** `POST`
- **Content-Type:** `multipart/form-data`
- **Alcance de DB:** DELETE + INSERT en `profile_photos` (dentro de una transacción atómica). Las fotos anteriores del usuario se reemplazan por completo.

**Form Fields:**
```
userId     — int, requerido
photos[]   — archivos (JPG, PNG, WebP); mínimo 2, máximo 5
```

**Procesamiento GD (pipeline de imagen):**
1. Validación de extensión original con `pathinfo()` → debe estar en `[jpg, jpeg, png, webp]`.
2. `getimagesize()` verifica que el archivo sea una imagen real.
3. `imagecreatefromjpeg/png/webp()` carga en memoria con la librería GD.
4. Si ancho o alto supera **1080 px**, redimensionado proporcional a 1080 px máx.
5. Guardado **siempre como `.jpg`** con `imagejpeg($img, $path, 80)` (calidad 80%).
6. Rollback físico (unlink) + rollback de BD si cualquier paso falla.

**Destino físico:** `__DIR__ . '/../uploads/profiles/user_{id}_{time}_{idx}.jpg'`
**URL pública guardada:** `/uploads/profiles/user_{id}_{time}_{idx}.jpg`

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "3 foto(s) procesadas y guardadas correctamente.",
  "photos":  ["/uploads/profiles/user_1_xxx_0.jpg", "..."]
}
```

**Response Error — HTTP 400 / 405 / 500** (siempre JSON, nunca 500 genérico de Apache gracias al `catch \Throwable` global)

---

### Endpoint: `api/submit_scripture.php`
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Alcance de DB:** SELECT MAX(scheduled_date) en `daily_scriptures` + INSERT.
- **Restricción:** UNIQUE KEY en `scheduled_date` — solo una escritura por día calendario.

**Payload (Front → Back):**
```json
{
  "userId":    "int    — requerido",
  "text":      "string — requerido, min 10 chars, máx 3000 chars",
  "reference": "string — requerido, min 2 chars, máx 200 chars"
}
```

**Lógica de fecha automática:**
- Cola vacía o última fecha en el pasado → `scheduled_date = HOY`
- Hay fechas presentes o futuras → `scheduled_date = MAX(scheduled_date) + 1 día`

**Response Éxito — HTTP 200:**
```json
{
  "status":        "success",
  "message":       "Tu escritura fue añadida a la cola.",
  "scheduledDate": "YYYY-MM-DD"
}
```

**Response Error — HTTP 400 / 405 / 409 / 500**

| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campo faltante, texto muy corto/largo, referencia vacía |
| 409 | Colisión de fecha (race condition muy improbable) |
| 500 | Error interno |

---

### Endpoint: `api/get_today_scripture.php`
- **Método:** `GET`
- **Alcance de DB:** SELECT en `daily_scriptures` JOIN `users` WHERE `scheduled_date = CURDATE()`.

**Query Params:** ninguno.

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": {
    "id":            "int",
    "userId":        "int",
    "fullName":      "string",
    "scriptureText": "string",
    "reference":     "string",
    "scheduledDate": "YYYY-MM-DD"
  }
}
```
> Si no hay escritura hoy: `"data": null` (status sigue siendo `"success"`).

---

### Endpoint: `api/get_scripture_queue.php`
- **Método:** `GET`
- **Alcance de DB:** SELECT en `daily_scriptures` JOIN `users` WHERE `scheduled_date >= CURDATE()` ORDER BY fecha ASC, LIMIT 60.

**Query Params:** ninguno.

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":            "int",
      "userId":        "int",
      "fullName":      "string",
      "scriptureText": "string",
      "reference":     "string",
      "scheduledDate": "YYYY-MM-DD"
    }
  ]
}
```
> Array vacío `[]` si no hay escrituras programadas.

---

## 🧠 LÓGICA DE NEGOCIO (REGLAS DE PIEDRA)

1. **Inmutabilidad de Identidad:** Los campos `full_name` y `birth_date` se insertan
   UNA SOLA VEZ en `register.php`. Ningún endpoint de actualización posterior puede
   modificarlos. El backend rechazará cualquier UPDATE que los incluya.

2. **Validación de Fotos (`api/upload_photos.php`):** La tabla `profile_photos` acepta mínimo 2 y máximo 5 fotos por `user_id`. El endpoint realiza un DELETE completo de las fotos anteriores + INSERT de las nuevas dentro de una transacción atómica — el reemplazo es siempre total, nunca parcial. El pipeline GD garantiza que el archivo guardado en disco sea siempre un JPEG válido independientemente del formato original enviado.

3. **Blindaje Técnico del Registro:**
   - `trim()` obligatorio sobre `full_name`, `email`, `phone`, `handle`.
   - `email` debe pasar `FILTER_VALIDATE_EMAIL` antes del INSERT.
   - `phone` debe pasar la regex `/^[0-9]{7,20}$/` (solo dígitos).
   - `birth_date` debe ser fecha pasada y válida (no futura, formato `YYYY-MM-DD`).
   - `password` jamás se almacena en texto plano: usar `password_hash()` con
     `PASSWORD_BCRYPT` y `cost >= 12`. Destruir variable de texto plano con `unset()`.
   - `acceptedCodeOfConduct` debe ser estrictamente `true` (booleano PHP).

---

### Endpoint: `api/get_users_admin.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/get_users_admin.php`
- **Autenticación:** `requesterId` (query param) — se verifica en BD que sea `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT en `users` LEFT JOIN `profiles`.

**Query Params:**
```
?requesterId=INT  (obligatorio)
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":            "int",
      "fullName":      "string",
      "email":         "string",
      "role":          "string — 'admin' | 'user'",
      "status":        "string — 'active' | 'inactive' | 'blocked' | 'pending'",
      "groupJoinDate": "string — YYYY-MM-DD | ''"
    }
  ]
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` faltante o inválido |
| 403 | Usuario no es admin o no existe |
| 500 | Error interno de servidor |

---

### Endpoint: `api/update_user_admin.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/update_user_admin.php`
- **Autenticación:** `requesterId` en body JSON — se verifica en BD que sea `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** UPDATE en `users` (role, status) + INSERT/UPDATE en `profiles` (group_join_date) + INSERT condicional en `user_departures_log`.
- **Regla de Integridad:** Un admin NO puede cambiar su propio rol a un valor distinto de `'admin'`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":  "int — ID del admin que ejecuta la acción",
  "targetUserId": "int — ID del usuario a modificar",
  "newRole":      "string — 'admin' | 'user'",
  "newStatus":    "string — 'active' | 'inactive' | 'blocked' | 'pending'",
  "newJoinDate":  "string | null — YYYY-MM-DD o null para no modificar"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Usuario actualizado correctamente."
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campos faltantes, valores inválidos, o admin intentando degradar su propio rol |
| 403 | `requesterId` no es admin o no existe |
| 500 | Error interno de servidor |

> **Trazabilidad de bajas (Migración 10):** Si `newStatus='inactive'` y el estado previo NO era ya `'inactive'`, se inserta una fila en `user_departures_log` con `action='hidden'`, `acted_by='admin'`, `admin_name=<full_name del admin>`.

---

### Endpoint: `api/validate_invitation.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/validate_invitation.php`
- **Autenticación:** Ninguna (endpoint público — es la puerta de entrada)
- **Alcance de DB:** SELECT en `invitation_password_log` (fila más reciente por `created_at DESC LIMIT 1`).

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "invitePassword": "string — requerido, no vacío"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Acceso concedido.",
  "data":    []
}
```

**Response Fallo — Contraseña incorrecta (1er intento) — HTTP 401:**
```json
{
  "status":  "error",
  "message": "Contraseña de invitación incorrecta.",
  "data":    []
}
```

**Response Advertencia — Contraseña incorrecta (2º intento) — HTTP 401:**
```json
{
  "status":  "warning",
  "message": "Contraseña incorrecta. Tienes un ÚLTIMO INTENTO antes de que tu IP sea bloqueada por 3 horas.",
  "data":    []
}
```

**Response Bloqueo — IP bloqueada al 3er fallo — HTTP 429:**
```json
{
  "status":  "blocked",
  "message": "Has excedido el número de intentos permitidos. Tu dirección IP ha sido bloqueada por 3 horas.",
  "data":    []
}
```

**Response Bloqueo — IP ya bloqueada (intentos posteriores) — HTTP 429:**
```json
{
  "status":       "blocked",
  "message":      "Tu dirección IP está bloqueada por demasiados intentos fallidos. Podrás intentarlo en aproximadamente N minuto(s).",
  "blockedUntil": "YYYY-MM-DD HH:MM:SS (UTC)",
  "data":         []
}
```

| Código HTTP | `status` | Causa |
| :--- | :--- | :--- |
| 200 | `"success"` | Contraseña correcta |
| 400 | `"error"` | `invitePassword` vacío o faltante |
| 401 | `"error"` | Contraseña incorrecta (1er intento) |
| 401 | `"warning"` | Contraseña incorrecta (2º intento — último antes de bloqueo) |
| 405 | `"error"` | Método distinto de POST |
| 429 | `"blocked"` | 3+ intentos fallidos — IP bloqueada 3 horas |
| 503 | `"error"` | No hay contraseña configurada en `invitation_password_log` |
| 500 | `"error"` | Error interno de servidor |

> **Anti-Brute-Force (tabla `gatekeeper_security`):** Cada IP tiene un contador de intentos. Al 3er fallo se escribe `blocked_until = NOW() + 3 HOURS`. Los intentos mientras bloqueada retornan 429 inmediatamente con el tiempo restante.
> **Reset:** Contraseña correcta → `attempts = 0`, `blocked_until = NULL`.
> **Regla de seguridad:** El `password_hash` almacenado **nunca** se expone al frontend. La comparación ocurre 100% en el servidor con `password_verify()`.
> **Acción frontend en éxito:** `sessionStorage.setItem("cfs_invite_valid", "1")` → `router.replace("/")`.
> **Patrón de fetch obligatorio:** El cliente usa `AbortController` con timeout de 15 s + helper `parseJsonResponse` (lee `text()` antes de `JSON.parse`) para manejar respuestas HTML de Apache sin silenciar errores. El `finally` siempre llama `setLoading(false)` excepto en el path de navegación exitosa (flag `navigating = true`).
> **Clasificación de alertas en el frontend:** `status === "blocked" || res.status === 429` → `alertLevel = "blocked"`; `status === "warning"` → `alertLevel = "warning"`; resto → `alertLevel = "error"`.

---

### Endpoint: `api/update_invitation_password.php`
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Ruta Completa:** `/api/update_invitation_password.php`
- **Autenticación:** `requesterId` en body JSON — se verifica en BD que sea `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** INSERT en `invitation_password_log` (columnas: `admin_id`, `plain_code`, `password_hash`).

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":       "int    — requerido, ID del admin autenticado",
  "newInvitePassword": "string — requerido, mínimo 6 caracteres"
}
```

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Contraseña de invitación actualizada correctamente.",
  "data":    []
}
```

**Response Error:**
```json
{
  "status":  "error",
  "message": "string — descripción del error",
  "data":    []
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` inválido o `newInvitePassword` menor a 6 caracteres |
| 403 | `requesterId` no es `role='admin'` o no existe |
| 405 | Método distinto de POST |
| 500 | Error interno de servidor |

> **Regla de seguridad:** Se guarda el `plain_code` (para uso admin) y el `password_hash` bcrypt cost 12 (para validación pública). La variable de texto plano se destruye con `unset()` tras el INSERT. El `password_hash` **nunca** viaja al frontend.

---

### Endpoint: `api/get_invitation_log.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/get_invitation_log.php`
- **Autenticación:** `requesterId` (query param) — se verifica en BD que sea `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT en `invitation_password_log` INNER JOIN `users`. Retorna últimas 50 entradas ordenadas por `created_at DESC`.

**Query Params:**
```
?requesterId=INT  (obligatorio)
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":        "int    — ID del registro en invitation_password_log",
      "adminId":   "int    — ID del admin que realizó el cambio (FK users.id)",
      "adminName": "string — full_name del admin",
      "plainCode": "string — contraseña en texto plano (visible solo para admins)",
      "createdAt": "string — YYYY-MM-DD HH:MM:SS (fecha y hora del cambio)"
    }
  ]
}
```

> La primera entrada del array (`data[0]`) corresponde a la **contraseña activa actual**.
> El campo `password_hash` está **excluido explícitamente** de la respuesta — nunca se expone.
> El campo `plainCode` está protegido por la verificación de `role='admin'` en el endpoint.

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` faltante o inválido |
| 403 | `requesterId` no es admin o no existe |
| 405 | Método distinto de GET |
| 500 | Error interno de servidor |

---

### Endpoint: `api/account/toggle_visibility.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/account/toggle_visibility.php`
- **Autenticación:** `userId` en body — se verifica existencia en BD.
- **Alcance de DB:** UPDATE `users.status` + INSERT condicional en `user_departures_log`.

**Payload Requerido (Front → Back):**
```json
{ "userId": "int — requerido" }
```

**Lógica:**
- Si `status = 'active'` → cambia a `'inactive'` + INSERT `user_departures_log` con `action='hidden'`, `acted_by='self'`.
- Si `status = 'inactive'` → cambia a `'active'` (reactivación, sin log).

**Response Éxito — HTTP 200:**
```json
{ "status": "success", "message": "...", "newStatus": "'active' | 'inactive'" }
```

---

### Endpoint: `api/account/delete_account.php`
- **Método:** `POST`
- **Autenticación:** `userId` en body — se verifica existencia.
- **Alcance de DB:** INSERT `user_departures_log` + DELETE en cascada manual + commit + `unlink()` físico.

**Payload Requerido:**
```json
{ "userId": "int — requerido" }
```

**Proceso atómico:**
1. Captura rutas físicas de fotos (`profile_photos`) pre-transacción.
2. BEGIN TRANSACTION con `FOR UPDATE`.
3. INSERT `user_departures_log` (`action='deleted'`, `acted_by='self'`).
4. DELETE `social_networks` → `profile_photos` → `profiles` → `daily_scriptures` → `users`.
5. COMMIT → `unlink()` de archivos físicos.

**Response Éxito — HTTP 200:**
```json
{ "status": "success", "message": "Tu cuenta ha sido eliminada permanentemente." }
```

---

### Endpoint: `api/admin/get_departures.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/admin/get_departures.php`
- **Autenticación:** `requesterId` (query param) — solo `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT en `user_departures_log` ORDER BY `created_at DESC`.

**Query Params:**
```
?requesterId=INT  (obligatorio)
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":        "int",
      "userName":  "string — nombre snapshot al momento de la acción",
      "action":    "string — 'hidden' | 'deleted'",
      "reason":    "string | null — razón del usuario (null si fue acción admin)",
      "actedBy":   "string — 'self' | 'admin'",
      "adminName": "string | null — nombre del admin (null si actedBy='self')",
      "createdAt": "string — YYYY-MM-DD HH:MM:SS"
    }
  ]
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` faltante o inválido |
| 403 | No es admin |
| 500 | Error interno |

---

### Endpoint: `api/admin/get_pending_users.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/admin/get_pending_users.php`
- **Autenticación:** `requesterId` (query param) — solo `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT en `users` WHERE `status='pending'` ORDER BY `created_at ASC`.

**Query Params:**
```
?requesterId=INT  (obligatorio)
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":        "int",
      "fullName":  "string",
      "email":     "string",
      "phone":     "string",
      "createdAt": "string — YYYY-MM-DD HH:MM:SS"
    }
  ]
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` inválido |
| 403 | No es admin |
| 500 | Error interno |

---

### Endpoint: `api/admin/authorize_user.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/admin/authorize_user.php`
- **Autenticación:** `requesterId` en body JSON — solo `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** UPDATE `users.status` + INSERT `welcome_registry` — **transacción atómica**.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":  "int — ID del admin autenticado",
  "targetUserId": "int — ID del usuario con status='pending' a autorizar"
}
```

**Proceso atómico:**
1. Verifica que `requesterId` sea `role='admin'`.
2. BEGIN TRANSACTION con `FOR UPDATE` en la fila del usuario objetivo.
3. Verifica que `targetUserId` exista y tenga `status='pending'`.
4. UPDATE `users SET status='active'` donde `id=targetUserId`.
5. INSERT `welcome_registry` (snapshot: `user_name`, `user_email`, `user_phone`, `admin_id`, `admin_name`).
6. COMMIT.

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Usuario autorizado correctamente.",
  "data": {
    "userId":   "int",
    "userName": "string — nombre del usuario activado"
  }
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` o `targetUserId` inválidos |
| 403 | `requesterId` no es admin |
| 404 | `targetUserId` no encontrado o no está en `status='pending'` |
| 500 | Error interno / rollback |

---

### Endpoint: `api/admin/get_welcome_registry.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/admin/get_welcome_registry.php`
- **Autenticación:** `requesterId` (query param) — solo `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT en `welcome_registry` ORDER BY `authorized_at DESC`.

**Query Params:**
```
?requesterId=INT  (obligatorio)
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id":           "int",
      "userId":       "int",
      "userName":     "string — snapshot del nombre al momento de la autorización",
      "userEmail":    "string — snapshot del correo",
      "userPhone":    "string — snapshot del teléfono",
      "adminId":      "int",
      "adminName":    "string — snapshot del nombre del admin",
      "authorizedAt": "string — YYYY-MM-DD HH:MM:SS"
    }
  ]
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` inválido |
| 403 | No es admin |
| 500 | Error interno |

---

### Endpoint: `api/admin/delete_user_admin.php`
- **Método:** `POST`
- **Ruta Completa:** `/api/admin/delete_user_admin.php`
- **Autenticación:** `requesterId` en body JSON — solo `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** INSERT `user_departures_log` + DELETE en cascada manual — **transacción atómica con FOR UPDATE**.
- **Regla de Integridad:** El admin NO puede eliminarse a sí mismo (`requesterId !== targetUserId`).

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":  "int — ID del admin que ejecuta la eliminación",
  "targetUserId": "int — ID del usuario a eliminar permanentemente"
}
```

**Proceso atómico:**
1. Verifica que `requesterId` sea `role='admin'` y obtiene su `full_name`.
2. Captura rutas físicas de fotos (`profile_photos`) **pre-transacción**.
3. BEGIN TRANSACTION con `SELECT ... FOR UPDATE` en `users WHERE id=targetUserId`.
4. INSERT `user_departures_log` (`action='deleted'`, `acted_by='admin'`, `admin_name=<full_name admin>`).
5. DELETE `social_networks` → `profile_photos` → `profiles` → `daily_scriptures` → `invitation_password_log` (si el target era admin) → `users`.
6. COMMIT → `unlink()` físico de los archivos de foto post-commit.
7. `welcome_registry` se limpia automáticamente por `ON DELETE CASCADE` en `users`.

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Cuenta de [userName] eliminada correctamente."
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | Campos inválidos o admin intentando auto-eliminarse |
| 403 | `requesterId` no es admin |
| 404 | `targetUserId` no encontrado |
| 500 | Error interno / rollback |

---

### Endpoint: `api/admin/reset_password.php` *(Migración 12 — Reset de Contraseña)*
- **Método:** `POST`
- **Ruta Completa:** `/api/admin/reset_password.php`
- **Autenticación:** `requesterId` en body JSON — se verifica en BD que sea `role='admin'`. Si no → HTTP 403.
- **Alcance de DB:** SELECT de verificación en `users` (requesterId + targetUserId) + UPDATE `password_hash` y `must_change_password`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":  "int — requerido, ID del admin autenticado",
  "targetUserId": "int — requerido, ID del usuario a quien se le resetea la contraseña"
}
```

**Lógica de negocio:**
1. Verifica que `requesterId` sea `role='admin'` y que `requesterId !== targetUserId` (admin no puede resetearse a sí mismo).
2. Verifica que `targetUserId` exista en `users`.
3. Genera contraseña temporal de 12 caracteres con `random_int()` (CSPRNG) — excluye caracteres ambiguos (0, O, l, I, 1).
4. Aplica `password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12])`.
5. `UPDATE users SET password_hash = :hash, must_change_password = 1 WHERE id = :targetUserId`.
6. Devuelve `tempPassword` en texto plano **solo en esta única respuesta** — el admin la copia y se la envía al usuario manualmente.

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Contraseña temporal generada correctamente.",
  "data": {
    "tempPassword": "string — contraseña temporal en texto plano (12 chars)",
    "userName":     "string — full_name del usuario al que se le reseteó"
  }
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `requesterId` o `targetUserId` inválidos (≤ 0) |
| 400 | `requesterId === targetUserId` (auto-reset prohibido) |
| 403 | `requesterId` no es `role='admin'` o no existe |
| 404 | `targetUserId` no encontrado en `users` |
| 405 | Método distinto de POST |
| 500 | Error interno de servidor |

> **Regla de seguridad:** `tempPassword` se expone SOLO en esta respuesta y SOLO al admin. **Nunca** se almacena en texto plano en la BD — solo el `password_hash`. El admin es responsable de comunicarle la clave al usuario por un canal seguro.
> **Efecto en el login:** La próxima vez que el usuario inicie sesión, `login.php` devolverá `mustChangePassword: true` y el frontend lo redirigirá obligatoriamente a `/cambiar-contrasena`.

---

### Endpoint: `api/account/change_password_forced.php` *(Migración 12 — Cambio Obligatorio)*
- **Método:** `POST`
- **Ruta Completa:** `/api/account/change_password_forced.php`
- **Autenticación:** `userId` en body — se verifica existencia y que `must_change_password = 1`. Previene uso arbitrario fuera del flujo de reset.
- **Alcance de DB:** SELECT de verificación en `users` + UPDATE `password_hash` y `must_change_password`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "userId":      "int    — requerido, ID del usuario autenticado",
  "newPassword": "string — requerida, mínimo 8 caracteres"
}
```

**Lógica de negocio:**
1. Verifica que `userId` sea entero positivo y `newPassword` tenga ≥ 8 chars.
2. SELECT de `must_change_password` para el usuario: si vale `0` → HTTP 400 (operación no aplicable).
3. `password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12])` + `unset($newPassword)`.
4. `UPDATE users SET password_hash = :hash, must_change_password = 0 WHERE id = :userId`.

**Response Éxito — HTTP 200:**
```json
{
  "status":  "success",
  "message": "Contraseña actualizada correctamente. Ya puedes ingresar a la plataforma.",
  "data":    []
}
```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `userId` ≤ 0, o `newPassword` < 8 caracteres |
| 400 | El usuario no tiene `must_change_password = 1` (flag no activo — operación no aplicable) |
| 404 | `userId` no encontrado en `users` |
| 405 | Método distinto de POST |
| 500 | Error interno de servidor |

> **Flujo frontend:** En éxito, `ChangePasswordClient.tsx` actualiza `localStorage["cfs_session"]` con `mustChangePassword: false` y redirige a `/dashboard` tras 2 s.
> `password_hash` **nunca** se incluye en ninguna respuesta al Front. La variable de texto plano se destruye con `unset()` tras el hash.

---

## 🎂 CONTRATOS DEL MÓDULO: CELEBRANDO LA VIDA (Migración 11)

> **Contexto:** Estos tres endpoints implementan el sistema de cumpleaños. Todos requieren `status='active'` en los usuarios involucrados. No se usa autenticación Bearer — la identidad se confirma con `userId` entero positivo verificado contra la tabla `users`.

---

### Endpoint: `api/get_birthdays.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/get_birthdays.php`
- **Autenticación:** Ninguna (todos los miembros activos pueden ver los cumpleaños)
- **Alcance de DB:** `SELECT` en `users` LEFT JOIN `profiles` LEFT JOIN `profile_photos` (sort_order = 1). Filtra por `MONTH(birth_date) = :month` y `status = 'active'`.

**Query Params:**
```
?month=INT   — opcional, 1–12. Default: mes actual del servidor (date('n'))
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [
    {
      "userId":    "int",
      "fullName":  "string",
      "birthDate": "string — YYYY-MM-DD (año real, ignorado en la lógica de fechas del front)",
      "birthDay":  "int    — DAY(birth_date), día del mes (1–31)",
      "ward":      "string — barrio, '' si no tiene perfil",
      "stake":     "string — estaca, '' si no tiene perfil",
      "photoUrl":  "string | null — URL de la foto principal (/uploads/...) o null"
    }
  ]
}
```

> Array vacío `[]` si no hay miembros activos con cumpleaños en el mes solicitado.
> El array viene ordenado por `DAY(birth_date) ASC` — el frontend puede mostrarlos del 1 al 31 sin reordenar.

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `month` fuera del rango 1–12 |
| 405 | Método distinto de GET |
| 500 | Error interno de servidor o DB |

**Lógica de negocio:**
- Solo usuarios con `status = 'active'` y `birth_date IS NOT NULL` son incluidos.
- El filtro usa `MONTH(birth_date) = :month` — **no compara el año**, solo el mes. Esto es correcto por diseño: el módulo "ignora el año de nacimiento" (es el campo ⛔ fuente de verdad del mes+día).
- La foto retornada es la de `sort_order = 1` (foto principal); `NULL` si el usuario no tiene fotos.

---

### Endpoint: `api/birthday_wishes/get_wishes.php`
- **Método:** `GET`
- **Ruta Completa:** `/api/birthday_wishes/get_wishes.php`
- **Autenticación:** Ninguna (cualquier miembro puede leer el Libro de Firmas)
- **Alcance de DB:** `SELECT` en `birthday_wishes` JOIN `users` WHERE `recipient_id = :recipientId AND YEAR(created_at) = :year`.

**Query Params:**
```
?recipientId=INT   — requerido, entero positivo > 0
?year=INT          — opcional, entero 2020–año_actual. Default: año actual del servidor.
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "year":   2026,
  "data": [
    {
      "wishId":     "int    — ID del registro en birthday_wishes",
      "authorId":   "int    — ID del usuario que escribió el mensaje",
      "authorName": "string — full_name del autor (JOIN con users)",
      "message":    "string — texto del mensaje (3–500 chars, sin HTML-encoding)",
      "createdAt":  "string — YYYY-MM-DD HH:MM:SS"
    }
  ]
}
```

> Array vacío `[]` si no hay mensajes para ese destinatario en el año solicitado.
> Los mensajes se devuelven ordenados por `created_at ASC` (del más antiguo al más reciente).
> El campo `year` en la respuesta confirma el año que fue consultado (útil para el frontend cuando navega por el historial).
> Sin param `year`: devuelve el año actual → comportamiento idéntico al original.

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `recipientId` ausente, no numérico, o ≤ 0 |
| 400 | `year` presente pero fuera de rango (< 2020 o > año actual) |
| 405 | Método distinto de GET |
| 500 | Error interno de servidor o DB |

---

### Endpoint: `api/birthday_wishes/get_available_years.php` *(nuevo — Álbum de Recuerdos)*
- **Método:** `GET`
- **Ruta Completa:** `/api/birthday_wishes/get_available_years.php`
- **Autenticación:** Ninguna
- **Alcance de DB:** `SELECT DISTINCT YEAR(created_at) AS year FROM birthday_wishes WHERE recipient_id = :recipientId ORDER BY year DESC`.

**Query Params:**
```
?recipientId=INT   — requerido, entero positivo > 0
```

**Response Éxito — HTTP 200:**
```json
{
  "status": "success",
  "data": [2026, 2025, 2024]
}
```

> Array plano de enteros ordenados DESC (más reciente primero).
> Array vacío `[]` si el usuario no tiene ningún mensaje recibido todavía.
> El frontend filtra el año actual de esta lista para determinar si hay "años anteriores" que mostrar en el Álbum de Recuerdos:
> ```typescript
> const pastYears = availableYears.filter(y => y !== new Date().getFullYear())
> // Si pastYears.length > 0 → mostrar botón "Ver felicitaciones de años anteriores"
> ```

**Response Error:**
| Código HTTP | Causa |
| :--- | :--- |
| 400 | `recipientId` ausente, no numérico, o ≤ 0 |
| 405 | Método distinto de GET |
| 500 | Error interno de servidor o DB |

---

### Endpoint: `api/birthday_wishes/post_wish.php`
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Ruta Completa:** `/api/birthday_wishes/post_wish.php`
- **Autenticación:** Implícita — se verifica que `authorId` y `recipientId` existen y tienen `status='active'` en la tabla `users`.
- **Alcance de DB:** SELECT de verificación + SELECT de unicidad + INSERT en `birthday_wishes`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "authorId":    "int    — requerido, ID del usuario que escribe (viewer autenticado)",
  "recipientId": "int    — requerido, ID del cumpleañero (dueño del perfil)",
  "message":     "string — requerido, 3–500 caracteres después de trim()"
}
```

**Response Éxito — HTTP 201:**
```json
{
  "status":  "success",
  "message": "¡Mensaje enviado con amor!"
}
```

**Response Error:**
```json
{
  "status":  "error",
  "message": "string — descripción del error"
}
```

| Código HTTP | Causa |
| :--- | :--- |
| 400 | `authorId` o `recipientId` ≤ 0, o `authorId === recipientId`, o `message` < 3 chars tras `trim()` |
| 404 | Uno o ambos usuarios no existen o no tienen `status='active'` |
| 405 | Método distinto de POST |
| 409 | El autor ya dejó un mensaje para ese destinatario en el año en curso |
| 500 | Error interno de servidor o DB |

**Reglas de negocio completas:**
1. **Autofelicitación prohibida:** `authorId !== recipientId` verificado en backend. HTTP 400 si coinciden.
2. **Usuarios activos:** Se ejecuta `SELECT COUNT(*) FROM users WHERE id IN (:id1, :id2) AND status = 'active'`. Si el resultado es < 2 → HTTP 404.
3. **Unicidad anual:** Antes del INSERT se ejecuta `SELECT id FROM birthday_wishes WHERE author_id = :authorId AND recipient_id = :recipientId AND YEAR(created_at) = YEAR(CURDATE())`. Si existe → HTTP 409 con mensaje amigable: `"Ya dejaste un mensaje para este hermano(a) este año. ¡Gracias por tu amor!"`.
4. **Longitud del mensaje:** `mb_substr(trim($message), 0, 500)` — truncado a 500 chars antes de cualquier validación. El mínimo requerido tras trim es 3 chars. Si no cumple → HTTP 400.
5. **Sin HTML-encoding al almacenar:** El mensaje se guarda en texto plano. La capa React protege contra XSS al renderizar el texto via JSX (no `dangerouslySetInnerHTML`).
6. **Payload JSON inválido:** Si `json_decode()` devuelve `null` (body no es JSON válido) → HTTP 400.

**Flujo de frontend al enviar:**
1. `POST /api/birthday_wishes/post_wish.php` con `{ authorId, recipientId, message }`.
2. Si HTTP 201 → `setWishSuccess(true)` + refetch de `get_wishes.php` para actualizar la lista.
3. Si HTTP 409 → muestra el mensaje de error en `wishError`.
4. Si HTTP 4xx/5xx → muestra `wishError` genérico.

---

## 🚨 ENDPOINTS CRÍTICOS Y SEGURIDAD (HALLAZGOS DE AUDITORÍA)

* **Autenticación Dual:** El sistema usa `auth:api` (Laravel Passport/Bearer Token) para el ecosistema `/api/` y sesión nativa web para el panel interno.
* **El Guardián del Panel:** Todo el panel está protegido por el triple middleware: `auth` → `company` → `companyPayment` (Login -> Empresa -> Pago Activo).
* **`POST /api/auth/login`**: Punto de entrada crítico. Si falla, el ecosistema frontend/app se queda ciego.
* **`POST /files/upload/store`**: El controlador más complejo (The Monster). Gestiona 4 tipos de archivos, miniaturas con Intervention Image, rutas dinámicas por ID de empresa y límites de subida (20 imgs, 50MB video). *Precaución máxima al conectar la IA aquí.*
* **`POST /properties/store` & `update`**: Núcleo del CRM (14 reglas de validación estricta).
* **VULNERABILIDAD PURGADA:** La ruta GET `/generar-codex` (que exponía la base de datos) queda estrictamente prohibida en producción.