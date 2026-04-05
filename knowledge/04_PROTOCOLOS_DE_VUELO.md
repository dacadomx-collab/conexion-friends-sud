# 🧪 PROTOCOLOS DE VUELO (CHECKLISTS DE CALIDAD)

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