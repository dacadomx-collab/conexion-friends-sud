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
| Aceptó código conducta | `accepted_code_of_conduct` | `acceptedCodeOfConduct` | Bool |
| Rol de usuario 🔒 | `role` | `role` | ENUM: `'admin'`\|`'user'` |
| Estado de cuenta 🔒 | `status` | `status` | ENUM: `'active'`\|`'inactive'`\|`'blocked'` |
| Barrio / Ward | `ward` | `ward` | String (máx. 100) |
| Estaca / Stake | `stake` | `stake` | String (máx. 100) |
| Biografía | `bio` | `bio` | String (máx. 500) |
| Mostrar WhatsApp | `show_whatsapp` | `showWhatsapp` | Bool |
| País | `country` | `country` | String (máx. 100, nullable) |
| Estado / Provincia | `state` | `state` | String (máx. 100, nullable) |
| Ciudad / Municipio | `city` | `city` | String (máx. 100, nullable) |
| Fecha ingreso grupo 🔒 | `group_join_date` | `groupJoinDate` | Date (nullable, solo admin) |

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
- `accepted_code_of_conduct`: TINYINT(1) — Siempre 1 al registro
- `role`: ENUM('admin','user') DEFAULT 'user' — 🔒 Solo modificable por admins *(Migración 03)*
- `status`: ENUM('active','inactive','blocked') DEFAULT 'active' — 🔒 Solo modificable por admins *(Migración 03)*
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

## 🧠 REGISTRO SEMÁNTICO (VOCABULARIO CONTROLADO)
- ✅ **Términos Permitidos:** `ward`, `stake`, `bio`, `showWhatsapp`, `userId`, `fullName`, `birthDate`, `country`, `state`, `city`, `invitePassword`, `newInvitePassword`, `requesterId`, `adminId`, `adminName`, `createdAt`, `plainCode`
- ❌ **Términos Prohibidos:** `barrio`, `estaca`, `descripcion`, `mostrarWhatsapp`, `id_usuario`, `nombre`, `fechaNacimiento`, `pais`, `estado`, `ciudad`, `municipio`, `masterPassword`, `gatePassword`, `invitationCode`, `plain_text`, `rawPassword`

---

## 🧩 REGISTRO DE COMPONENTES FRONTEND

### Mapa de Rutas del Proyecto
| Ruta | Archivo | Estado | Descripción |
| :--- | :--- | :--- | :--- |
| `/acceso` | `app/acceso/page.tsx` | ✅ Activo | **Puerta de Entrada (Gatekeeper)** — única ruta pública |
| `/` | `app/page.tsx` | ✅ Activo | Landing + AuthForm (login/registro) — **protegida por Gatekeeper** |
| `/perfil` | `app/perfil/page.tsx` | ✅ Activo | Paso 2 onboarding — datos de perfil |
| `/perfil/media` | `app/perfil/media/page.tsx` | ✅ Activo | Paso 3 onboarding — fotos y redes |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ Activo | Sala principal tras login |
| `/directorio` | `app/directorio/page.tsx` | ✅ Activo | El BOOK — grid de miembros activos v1.0 |
| `/mensajes` | `app/mensajes/page.tsx` | ✅ Activo (shell) | Bandeja en construcción |
| `/admin` | `app/admin/page.tsx` | ✅ Activo | Panel de Administración — solo `role='admin'` |
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

#### Las 5 Tarjetas
| # | Título | Destino | Estado | Visibilidad |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Tu Perfil | `/perfil?userId={id}` | ✅ Activo | Todos |
| 2 | Panel de Administración | `/admin` | ✅ Activo | Solo `role='admin'` |
| 3 | El BOOK | `/directorio` | Activo para admins / 🔲 Próximamente para users | Condicional por rol |
| 4 | Actividades del grupo | `#` (deshabilitado) | 🚧 Badge "¡En construcción!" | Todos |
| 5 | Mensajes | `/mensajes` | Activo para admins / 🔲 Próximamente para users | Condicional por rol |

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
- Botón **"Iniciar Sesión"** (para miembros existentes): marca `cfs_invite_valid = "1"` y redirige a `/` sin necesidad de ingresar la contraseña de invitación.
- En éxito: `sessionStorage.setItem("cfs_invite_valid", "1")` → `router.replace("/")`.

#### Clave de sessionStorage
| Clave | Valor | Propósito |
| :--- | :--- | :--- |
| `cfs_invite_valid` | `"1"` | Acredita haber pasado la puerta en la sesión actual |

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
| **Endpoints** | `GET /api/get_users_admin.php` · `POST /api/update_user_admin.php` |

#### Orden de renderizado del `<main>` (3 bloques)
| Bloque | Contenido | Posición |
| :--- | :--- | :--- |
| 1 | KPI Cards (Miembros totales / Activos / Admins) | Arriba |
| 2 | `InvitationPasswordAdmin` (gestión de contraseña de invitación) | En medio |
| 3 | Lista de Usuarios Registrados (buscador + lista paginada) | Abajo |

#### Búsqueda y Paginación (cliente)
| Concepto | Implementación |
| :--- | :--- |
| Constante | `PAGE_SIZE = 10` usuarios por página |
| Estado | `currentPage: number` (inicia en `1`) |
| Reset | `useEffect` → `setCurrentPage(1)` cuando cambia `query` |
| Reset accordion | `useEffect` → `setOpenId(null)` cuando cambia `currentPage` |
| `filtered` | `useMemo` — filtra `users` por `fullName` o `email` (case-insensitive) |
| `totalPages` | `useMemo` — `Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))` |
| `paginated` | `useMemo` — `filtered.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE)` |
| Controles UI | Botones "Anterior" / "Siguiente" con iconos `ChevronLeft`/`ChevronRight`; deshabilitados en los extremos |
| Conteo | Texto: "X resultados · Página N de M" (con query) o "Página N de M" (sin query) |

> La paginación y búsqueda son **100% client-side** — el backend devuelve todos los usuarios y el filtrado ocurre en React. Esto es eficiente para ≤ 250 miembros.

---

### `DirectoryClient.tsx`
| Atributo | Valor |
| :--- | :--- |
| **Ruta** | `components/DirectoryClient.tsx` |
| **Tipo** | Client Component (`"use client"`) |
| **Página** | `app/directorio/page.tsx` |
| **Estado** | ✅ Activo |
| **Endpoint** | `GET /api/get_directory.php` |

Grid responsivo (1→2→3 columnas). Buscador en tiempo real por nombre, barrio o estaca. Sello de confianza: Badge "En el grupo desde [Año]" si `groupJoinDate` existe.