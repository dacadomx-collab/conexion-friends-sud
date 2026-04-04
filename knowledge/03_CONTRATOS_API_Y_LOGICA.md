# 🤝 CONTRATOS DE API Y LÓGICA DE NEGOCIO

## 📡 PROTOCOLO DE INTEGRACIÓN
- **Intercambio:** JSON UTF-8.
- **Headers Base:** CORS habilitado, Methods (POST, GET, OPTIONS).
- **Estructura Standard de Respuesta:**
  `{ "status": "success/error", "message": "string", "data": [...] }`

## 🛠️ ENDPOINTS REGISTRADOS (CONTRATOS)
### Endpoint: `[nombre_archivo.php]`
- **Método:** [GET/POST]
- **Payload Requerido (Front):** `[ { "propiedad": "tipo" } ]`
- **Response Expected (Back):** `[ { "propiedad": "tipo" } ]`

## 🧠 LÓGICA DE NEGOCIO (REGLAS DE PIEDRA)
1. **[REGLA_1]:** [Descripción de la lógica matemática o de flujo].
2. **[REGLA_2]:** [Descripción de validación específica].
3. **Blindaje Técnico:** [Ej: Uso de TRIM, CAST, validación de NaN, etc].