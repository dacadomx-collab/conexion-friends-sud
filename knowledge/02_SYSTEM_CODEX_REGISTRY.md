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

## 🧠 REGISTRO SEMÁNTICO (VOCABULARIO CONTROLADO)
- ✅ **Términos Permitidos:** `ward`, `stake`, `bio`, `showWhatsapp`, `userId`, `fullName`, `birthDate`, `country`, `state`, `city`, `invitePassword`, `newInvitePassword`, `requesterId`, `adminId`, `adminName`, `createdAt`, `plainCode`, `newStatus`, `accountStatus`, `userName`, `action`, `reason`, `departures`, `actedBy`, `targetUserId`, `authorizedAt`, `pendingUsers`, `welcomeRegistry`, `authorizeUser`, `deleteUserAdmin`, `allUsersOpen`, `allDepsOpen`, `deleteConfirm`, `deletingId`, `recipientId`, `authorId`, `authorName`, `wishId`, `wishMessage`, `birthDay`, `birthdays`, `birthdayLoading`, `wishes`, `wishesLoading`, `postingWish`, `wishSuccess`, `wishError`, `viewerUserId`
- ❌ **Términos Prohibidos:** `barrio`, `estaca`, `descripcion`, `mostrarWhatsapp`, `id_usuario`, `nombre`, `fechaNacimiento`, `pais`, `estado`, `ciudad`, `municipio`, `masterPassword`, `gatePassword`, `invitationCode`, `plain_text`, `rawPassword`, `deleteUser`, `hideUser`, `deactivate`, `whitelistPhone`, `whitelistHistory`, `addWhitelist`, `importCsv`, `isUsed`, `addedBy`, `referenceName`

---

## 🧩 REGISTRO DE COMPONENTES FRONTEND

---

## 🎂 MÓDULO: CELEBRANDO LA VIDA (Cumpleaños) — Migración 11

### Tabla nueva: `birthday_wishes`
Ver detalle completo en la sección "🗄️ ESTRUCTURA DE TABLAS".

### Endpoints nuevos:
- `GET /api/get_birthdays.php?month=INT` → Cumpleañeros del mes
- `GET /api/birthday_wishes/get_wishes.php?recipientId=INT` → Libro de Firmas (año actual)
- `POST /api/birthday_wishes/post_wish.php` → Guardar firma `{authorId, recipientId, message}`

### Cambios en frontend:
- **`DashboardClient.tsx`**: nueva sección "Cumpleañeros de [mes]" (tarjeta ámbar) entre la escritura del día y la tarjeta "Tu Perfil". Enlaza a `/directorio?userId={id}` para abrir el perfil.
- **`DirectoryClient.tsx / MemberSheet`**: si `MONTH(birth_date) === mes actual` → muestra banner + "Libro de Firmas" con mensajes existentes y formulario de nueva firma. Confetti (`canvas-confetti`) se dispara si es cumpleaños HOY.

### Helpers de fechas (en DirectoryClient.tsx):
| Función | Descripción |
| :--- | :--- |
| `getBirthMonthDay(birthDate)` | Parsea `YYYY-MM-DD` → `{month, day}` sin depender de `new Date()` (evita timezone issues) |
| `isBirthdayToday(birthDate)` | `true` si mes+día === hoy |
| `isBirthdayThisWeek(birthDate)` | `true` si cae en Dom–Sáb de la semana actual. Comprueba año ±1 para bordes de año nuevo |
| `isBirthdayMonth(birthDate)` | `true` si el mes coincide con el mes actual |
| `isBirthdayThisMonth(birthDate)` | `true` si el mes coincide pero NO es hoy ni esta semana — tercer nivel de prioridad |

### Insignias de cumpleaños en el grid (DirectoryClient.tsx) — 3 niveles:
| Prioridad | Condición | Insignia (sup. izq.) | Borde tarjeta | Clic |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `bdToday` | 🎂 `"Hoy"` ámbar sólido | `ring-2 ring-amber-400` | `openSheet(member, true)` → scroll a `#libro-firmas` |
| 2 | `bdThisWeek` (no hoy) | 🎈 `"Esta semana"` ámbar suave | Sin borde | `openSheet(member)` |
| 3 | `bdThisMonth` (no hoy ni semana) | 🎁 `"Este mes"` gris neutro `bg-slate-100` | Sin borde | `openSheet(member)` |

> Cada nivel excluye a los anteriores: la lógica de cómputo es `bdThisWeek = !bdToday && ...`, `bdThisMonth = !bdToday && !bdThisWeek && ...`

### `MemberSheet` — nuevos props:
- `focusWishes: boolean` — si `true`, hace scroll suave al div `#libro-firmas` (`ref={wishesRef}`) con un delay de 380 ms tras abrir el Sheet
- `openSheet(member, withWishesFocus?)` — función helper en DirectoryClient que encapsula `setSelected + setFocusWishes`
- `closeSheet()` — limpia ambos estados al cerrar

### `DashboardClient` — Modal "Todos los Cumpleañeros":
- Estado: `showAllBirthdays: boolean`
- Trigger: botón `"+N hermanos más cumplen años este mes — Ver todos →"` (visible solo si `birthdays.length > 5`)
- Modal: overlay fijo `z-50`, `rounded-t-2xl sm:rounded-2xl` (bottom sheet en móvil, centrado en sm+), `max-h-[88vh]` con lista scrollable
- Cada fila: foto/avatar ámbar + nombre + día + emoji 🎂 (hoy) / 🎁 (resto)
- Clic en fila: navega a `/directorio?userId={id}` y cierra el modal
- Cierre: botón ×, o clic en el overlay exterior

### Reglas de seguridad del módulo:
- `viewerUserId` se lee de `localStorage["cfs_session"].id` en el cliente (nunca del server)
- La UI del formulario se oculta si el viewer es el propio cumpleañero
- Unicidad: 1 mensaje por autor+destinatario+año (validado en backend)
- `canvas-confetti` se importa dinámicamente para evitar SSR issues

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

#### Las 6 Tarjetas
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
- En éxito: `localStorage.setItem("cfs_session", JSON.stringify(result.data))` → `router.push("/dashboard")`.
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
| **Endpoints** | `GET /api/get_users_admin.php` · `POST /api/update_user_admin.php` · `GET /api/admin/get_pending_users.php` · `POST /api/admin/authorize_user.php` · `GET /api/admin/get_departures.php` · `POST /api/admin/delete_user_admin.php` · `GET /api/admin/get_welcome_registry.php` |

#### Orden de renderizado del `<main>` (5 bloques)
| Bloque | Contenido | Posición |
| :--- | :--- | :--- |
| 1 | KPI Cards — 6 tarjetas + panel desplegable de admins | Arriba |
| 2 | `InvitationPasswordAdmin` (contraseña activa + modal historial) | Segundo |
| 2b | **Pendientes de Aprobación** — tabla + botón "Autorizar" + modal "Registro de Bienvenida" | Tercero |
| 4 | **Usuarios Registrados** — últimos 5 (preview) + "Ver a todos los hermanos" → modal completo con búsqueda, paginación, edición y eliminación | Cuarto |
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