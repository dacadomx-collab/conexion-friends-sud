# 📜 LOS 10 MANDAMIENTOS DEL GÉNESIS (LEY SUPREMA)

## ⚖️ DECLARACIÓN DE AUTORIDAD
Este documento rige sobre cualquier sugerencia de la IA. La IA es una ejecutora DETERMINÍSTICA, no creativa. 

## ⚖️ LOS MANDAMIENTOS
1. **Mobile-First & Responsivo:** Todo componente nace para celular. Prohibido el uso de anchos fijos (px) en contenedores principales.
2. **Seguridad Nivel Militar:** Sanitización obligatoria de inputs. Uso de Prepared Statements. Blindaje contra Inyección SQL, XSS y CSRF.
3. **Modo Oscuro & Toggle Nativo:** Soporte de tema fluido (Light/Dark). Contraste mínimo 4.5:1 (Estándar WCAG 2.1).
4. **Protocolo Anti-Alucinación:** PROHIBIDO inventar variables. Si no existe en el `02_SYSTEM_CODEX_REGISTRY.md`, la IA debe DETENERSE.
5. **Contrato de API Estricto:** Prohibido alterar nombres de propiedades JSON definidos en `03_CONTRATOS_API_Y_LOGICA.md`.
6. **Ejecución Determinística:** No se permiten "mejoras" o "extensiones" no solicitadas. 
7. **Naming Registry:** `snake_case` para Backend/DB; `camelCase` para Frontend/React.
8. **Detección de Dead Code:** Auditoría obligatoria para eliminar funciones, imports y variables huérfanas antes de cada entrega.
9. **Inmutabilidad del Sistema:** La IA NO puede crear tablas o alterar esquemas de DB sin autorización humana explícita.
10. **Sinónimos Prohibidos:** Solo existe UN nombre válido por concepto. Cero tolerancia a traducciones libres.
11. **Arranque Blindado (Fundación del Proyecto):** Todo entorno de ejecución (local o producción) exige la presencia y correcto funcionamiento de los siguientes cuatro pilares antes de ejecutar cualquier otro código:
    - **`.env`** — variables de entorno reales (nunca se versiona).
    - **`.env.example`** — plantilla versionada con todas las claves requeridas pero sin valores sensibles.
    - **`.htaccess` blindado** — con las reglas de seguridad y reescritura activas (bloqueo de dot-files, PHP fuera de `/api/`, pasarela SPA para Next.js).
    - **`api/conexion.php`** — hub central de CORS, carga de `.env` y clase `Database`. Ningún endpoint PHP puede ejecutarse si este archivo falla.

    La IA NO puede asumir que estos pilares existen: debe verificar su presencia o estado antes de diagnosticar cualquier error 500 o de conexión.