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
    "id":       "int",
    "fullName": "string",
    "email":    "string",
    "role":     "string — 'admin' | 'user'",
    "status":   "string — 'active' | 'inactive' | 'blocked'"
  }
}
```

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
      "status":        "string — 'active' | 'inactive' | 'blocked'",
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
- **Alcance de DB:** UPDATE en `users` (role, status) + INSERT/UPDATE en `profiles` (group_join_date).
- **Regla de Integridad:** Un admin NO puede cambiar su propio rol a un valor distinto de `'admin'`.

**Payload Requerido (Front → Back) — camelCase:**
```json
{
  "requesterId":  "int — ID del admin que ejecuta la acción",
  "targetUserId": "int — ID del usuario a modificar",
  "newRole":      "string — 'admin' | 'user'",
  "newStatus":    "string — 'active' | 'inactive' | 'blocked'",
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
     Cualquier otro valor rechaza el registro con HTTP 400.
