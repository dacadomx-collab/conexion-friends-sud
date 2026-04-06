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
| Barrio / Ward | `ward` | `ward` | String (máx. 100) |
| Estaca / Stake | `stake` | `stake` | String (máx. 100) |
| Biografía | `bio` | `bio` | String (máx. 500) |
| Mostrar WhatsApp | `show_whatsapp` | `showWhatsapp` | Bool |
| País | `country` | `country` | String (máx. 100, nullable) |
| Estado / Provincia | `state` | `state` | String (máx. 100, nullable) |
| Ciudad / Municipio | `city` | `city` | String (máx. 100, nullable) |

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
- `updated_at`: TIMESTAMP — Se actualiza en cada UPDATE

## 🧠 REGISTRO SEMÁNTICO (VOCABULARIO CONTROLADO)
- ✅ **Términos Permitidos:** `ward`, `stake`, `bio`, `showWhatsapp`, `userId`, `fullName`, `birthDate`, `country`, `state`, `city`
- ❌ **Términos Prohibidos:** `barrio`, `estaca`, `descripcion`, `mostrarWhatsapp`, `id_usuario`, `nombre`, `fechaNacimiento`, `pais`, `estado`, `ciudad`, `municipio`

---

## 🧩 REGISTRO DE COMPONENTES FRONTEND

### Mapa de Rutas del Proyecto
| Ruta | Archivo | Estado | Descripción |
| :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | ✅ Activo | Landing + AuthForm (login/registro) |
| `/perfil` | `app/perfil/page.tsx` | ✅ Activo | Paso 2 onboarding — datos de perfil |
| `/perfil/media` | `app/perfil/media/page.tsx` | ✅ Activo | Paso 3 onboarding — fotos y redes |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ Activo | Sala principal tras login |
| `/directorio` | — | 🔲 Pendiente | El BOOK — directorio de miembros |
| `/mensajes` | — | 🔲 Pendiente | Avisos de administradores |
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

#### Las 4 Tarjetas
| # | Título | Destino | Estado |
| :--- | :--- | :--- | :--- |
| 1 | Tu Perfil | `/perfil?userId={id}` | ✅ Activo |
| 2 | El BOOK | `/directorio` | 🔲 Ruta futura |
| 3 | Actividades del grupo | `#` (deshabilitado) | 🚧 Badge "¡En construcción!" |
| 4 | Mensajes | `/mensajes` | 🔲 Ruta futura |

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
| Preview | `URL.createObjectURL()` — local, sin subida real hasta que el backend esté conectado |
| Formatos aceptados | `image/jpeg`, `image/png`, `image/webp` |
| Tabla de destino (futuro) | `profile_photos` — `user_id`, `sort_order`, `photo_url` |

#### Sección de Redes Sociales
| Campo | Input | Obligatorio | Tabla de destino (futuro) |
| :--- | :--- | :--- | :--- |
| `instagram` | `Input type="text"` | No | `social_networks` |
| `facebook` | `Input type="text"` | No | `social_networks` |

#### Comportamiento del botón "Finalizar"
1. Valida que `filledCount >= 2`. Si no, muestra `ErrorBanner` rojo.
2. Emite `console.log("[MediaForm] Botón 'Finalizar' presionado.", { userId, fotosSeleccionadas, instagram, facebook })`.
3. Redirige a `/dashboard` (ruta temporal hasta que el Dashboard sea construido).