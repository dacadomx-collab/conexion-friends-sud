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

## 🧠 LÓGICA DE NEGOCIO (REGLAS DE PIEDRA)

1. **Inmutabilidad de Identidad:** Los campos `full_name` y `birth_date` se insertan
   UNA SOLA VEZ en `register.php`. Ningún endpoint de actualización posterior puede
   modificarlos. El backend rechazará cualquier UPDATE que los incluya.

2. **Validación de Fotos (futuro endpoint):** La tabla `profile_photos` acepta mínimo 2
   y máximo 5 registros por `user_id`. Toda operación INSERT/DELETE verificará este
   rango antes de ejecutarse. Si `sort_order` ya existe para ese `user_id`, la
   operación es rechazada.

3. **Blindaje Técnico del Registro:**
   - `trim()` obligatorio sobre `full_name`, `email`, `phone`, `handle`.
   - `email` debe pasar `FILTER_VALIDATE_EMAIL` antes del INSERT.
   - `phone` debe pasar la regex `/^[0-9]{7,20}$/` (solo dígitos).
   - `birth_date` debe ser fecha pasada y válida (no futura, formato `YYYY-MM-DD`).
   - `password` jamás se almacena en texto plano: usar `password_hash()` con
     `PASSWORD_BCRYPT` y `cost >= 12`. Destruir variable de texto plano con `unset()`.
   - `acceptedCodeOfConduct` debe ser estrictamente `true` (booleano PHP).
     Cualquier otro valor rechaza el registro con HTTP 400.
