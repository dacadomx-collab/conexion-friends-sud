# 🚀 PROYECTO: CONEXIÓN FRIENDS SUD
**MODO ACTIVO:** GÉNESIS ÉLITE (Nivel Arquitecto / Desarrollador Full-Stack)

## 📌 Contexto del Proyecto y Misión
Estás programando "Conexión FRIENDS", un directorio web privado para Jóvenes Adultos Solteros de La Iglesia de Jesucristo de los Santos de los Últimos Días (SUD). 
**Objetivo principal:** Cumplir Mosíah 18:21 ("corazones entretejidos con unidad y amor"). 
**Importante:** ESTO NO ES UNA APP DE CITAS. Es una herramienta de ministración y hermandad segura. Cero lógicas de redes sociales seculares.

## 📚 LOS 4 PILARES DE LA VERDAD (ARCHIVOS MAESTROS)
Para trabajar en este proyecto, es **OBLIGATORIO** que bases cualquier respuesta, código o análisis en los siguientes 4 archivos que ya tienes en tu base de conocimientos. **No inventes NADA que no esté documentado aquí:**

1. **`01_LEY_Y_MANDAMIENTOS.md` (La Ley Suprema):** Contiene las reglas inquebrantables del proyecto. Seguridad Nivel Militar, Mobile-First obligatorio, inmutabilidad del sistema y restricciones de variables. Si tu código viola esta ley, debes detenerte.
¡ATENCIÓN CLAUDE! DIRECTRIZ DE AGENTE AUTÓNOMO ACTIVA
MODO: GÉNESIS ÉLITE.

Excelente trabajo con la actualización del Codex. Ahora tenemos una misión de Mejora de Experiencia de Usuario (UX) en el Dashboard de Administradores (AdminClient.tsx o la vista principal del Admin).

Contexto: Actualmente, la lista de usuarios se muestra completa. Cuando tengamos 250 miembros, será ilegible. Además, el orden de los componentes no es el ideal.

MISIÓN 1: Reordenamiento del Dashboard
En la vista principal del panel de administración, ajusta el orden de renderizado estrictamente así:

Arriba: Las Tarjetas de Estadísticas (Miembros totales, activos, admins).

En medio: El módulo InvitationPasswordAdmin (Control de contraseñas que acabas de hacer).

Abajo: La Lista/Tabla de Usuarios Registrados.

MISIÓN 2: Buscador y Paginación para la Lista de Usuarios
Modifica el componente de la Lista/Tabla de Usuarios (ej. MembersTable o dentro de AdminClient.tsx) para incluir:

Barra de Búsqueda Frontend: Un input de texto arriba de la tabla que filtre en tiempo real a los usuarios por Nombre (fullName) o Correo (email).

Paginación Frontend: Muestra un máximo de 10 usuarios por página. Agrega botones simples de "Anterior" y "Siguiente", y un texto que diga "Página X de Y".
(Nota: Como el máximo de nuestra comunidad es 250, manejar este filtro y paginación del lado del cliente en React es perfectamente eficiente, no necesitas cambiar el endpoint del backend).

MISIÓN 3: Sincronización del Codex (Post-Implementación)
Actualiza el archivo 02_SYSTEM_CODEX_REGISTRY.md para documentar que el componente de la lista de usuarios ahora incluye Pagination y SearchFilter en el estado del cliente.

Procede a editar los archivos correspondientes. Entrega tu Informe de Operación al terminar.3. **`03_CONTRATOS_API_Y_LOGICA.md` (Contratos de API):** Define estrictamente los payloads requeridos, respuestas JSON y la lógica de negocio de cada endpoint PHP. No puedes alterar los nombres de las propiedades JSON aquí definidas.
4. **`04_PROTOCOLOS_DE_VUELO.md` (Checklists de Calidad):** Contiene los pasos de pre-validación y post-validación. Exige que entregues código limpio, sin "dead code" y que te asegures de que la fundación del proyecto (.env, .htaccess, conexion.php) esté intacta antes de programar.

## 🏆 LA REGLA DE ORO
**Privacidad y Seguridad Máxima.** La base de datos es sagrada. Los perfiles son 100% privados y exclusivos para miembros validados. Tu código debe prevenir inyecciones SQL, XSS, accesos no autorizados y bloqueos no permitidos.

## 🛠️ Instrucciones de Flujo de Trabajo (Directriz de Agente)
Cada vez que recibas un prompt del Arquitecto (David):
1. **Verifica los 4 Pilares:** Lee la estructura actual en los archivos `01`, `02`, `03` y `04` antes de escribir una sola línea.
2. **Aplica el Código Exacto:** Entrega soluciones precisas, usando las variables correctas.
3. **Protege lo Creado:** Nunca borres ni alteres el diseño/funcionalidad de archivos que ya funcionan (como nuestro `index.php` de registro), solo agrega la lógica solicitada de manera modular.
4. **Sincroniza:** Si el código es exitoso, recuerda proponer la actualización de nuestra documentación (El Codex).