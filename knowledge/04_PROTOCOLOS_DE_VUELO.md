# 🧪 PROTOCOLOS DE VUELO (CHECKLISTS DE CALIDAD)

## 🤖 DIRECTRIZ DE AGENTE AUTÓNOMO (VS CODE)

Cuando el Arquitecto activa la frase **"DIRECTRIZ DE AGENTE AUTÓNOMO"**, la IA opera bajo las siguientes reglas sin excepción:

1. **Editar archivos directamente** usando las herramientas de escritura del IDE (Edit / Write). Prohibido entregar bloques largos de código para copiar y pegar — eso invalida el propósito del agente.
2. **Informe de Operación al final** — no al principio. La IA ejecuta primero, reporta después.
3. **Autonomía total de lectura/escritura** sobre los archivos del proyecto. No pedir confirmación para cada archivo individual; solo para acciones destructivas irreversibles (ej. eliminar una tabla de producción).
4. **Misiones en paralelo** — cuando las misiones sean independientes entre sí, la IA debe ejecutarlas en el mismo turno, no en secuencia de múltiples mensajes.
5. **Codex siempre al final** — la última misión de todo bloque autónomo es sincronizar la documentación.

---

## 🛡️ FOUNDATION CHECK (ANTES DEL PRE-CODE)
Antes de diagnosticar cualquier error o generar nuevo código, verificar:
- [ ] ¿Existe `.env` con las variables requeridas en la raíz del proyecto?
- [ ] ¿Existe `.htaccess` con las reglas de blindaje activas?
- [ ] ¿`api/conexion.php` carga el `.env` desde `__DIR__ . '/../.env'`?
- [ ] ¿La extensión PHP requerida (GD, PDO, etc.) está habilitada en el servidor?

Si cualquiera falla → detener y resolver el pilar antes de continuar.

---

## 🛫 PRE-CODE CHECKLIST (OBLIGATORIO)
Antes de generar código, la IA debe confirmar:
- [ ] ¿Las variables están registradas en el Codex?
- [ ] ¿El endpoint respeta el Contrato de API?
- [ ] ¿El diseño propuesto es Mobile-First?
- [ ] ¿Existe una Regla de Piedra que afecte esta lógica?

## 🔒 SYSTEM IMMUTABILITY CHECK
- [ ] ¿Estoy intentando crear una tabla o campo nuevo sin permiso? (DETENERSE SI ES SÍ).
- [ ] ¿Estoy intentando "optimizar" algo que altera el Codex? (DETENERSE SI ES SÍ).

## 🛬 POST-CODE VALIDATION (AUTO-AUDITORÍA)
Antes de entregar el código al usuario:
- [ ] **Limpieza:** ¿Eliminé variables e imports no usados? (Dead Code).
- [ ] **Naming:** ¿Back es snake_case y Front es camelCase?
- [ ] **Seguridad:** ¿Sanitice inputs y protegí contra tipos erróneos (NaN/Null)?
- [ ] **Consistencia:** ¿Usé sinónimos prohibidos o me apegué al Codex?

## ✅ POST-IMPLEMENTACIÓN (ACTUALIZACIÓN DEL CODEX)
**Regla:** Cuando el usuario confirme que un componente (Front o Back) funciona sin errores
en producción o en entorno local, la IA **debe** proponer la actualización de la documentación
oficial antes de continuar con el siguiente hito.

Checklist obligatorio al recibir confirmación de éxito:
- [ ] **Codex:** ¿Se registró el componente/endpoint en `02_SYSTEM_CODEX_REGISTRY.md`?
- [ ] **Contrato:** ¿El contrato en `03_CONTRATOS_API_Y_LOGICA.md` refleja el estado real?
- [ ] **Protocolos:** ¿Hay alguna nueva regla o patrón detectado que deba añadirse aquí?
- [ ] **Fuente de Verdad:** Ningún hito se cierra sin que la documentación quede sincronizada.