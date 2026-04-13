"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar, AlertTriangle } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface AuthFormProps {
  onSuccess?: () => void
}

interface RegisterData {
  fullName:              string
  email:                 string
  phone:                 string
  birthDate:             string
  password:              string
  gender:                "M" | "F" | ""
  acceptedCodeOfConduct: boolean
}

// ---------------------------------------------------------------------------
// Estado inicial del formulario de registro
// ---------------------------------------------------------------------------
const REGISTER_INITIAL: RegisterData = {
  fullName:              "",
  email:                 "",
  phone:                 "",
  birthDate:             "",
  password:              "",
  gender:                "",
  acceptedCodeOfConduct: false,
}

// ---------------------------------------------------------------------------
// Clave de sesión en localStorage — debe coincidir con LoginForm.tsx
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

// ---------------------------------------------------------------------------
// Helper: lee la respuesta como texto y luego parsea JSON.
// Si el servidor devuelve HTML (ej. Apache 403), lanza un error legible
// con el código HTTP real en lugar de un SyntaxError mudo.
// ---------------------------------------------------------------------------
async function parseJsonResponse(response: Response): Promise<{ status: string; message: string; data: unknown }> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta inesperada (HTTP ${response.status}).` +
      ` Posible bloqueo de configuración. Detalle: ${text.slice(0, 150)}`
    )
  }
}

// ---------------------------------------------------------------------------
// Componente de banner de error — siempre visible, nunca silencioso
// ---------------------------------------------------------------------------
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function AuthForm({ onSuccess }: AuthFormProps) {
  const router = useRouter()

  // ── Montaje diferido: evita que LastPass inyecte en el SSR ────────────────
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // ── Estado: Login
  const [loginEmail,    setLoginEmail]    = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError,    setLoginError]    = useState<string | null>(null)
  const [loginLoading,  setLoginLoading]  = useState(false)
  const [showPassLogin, setShowPassLogin] = useState(false)

  // ── Estado: Registro
  const [reg,         setReg]         = useState<RegisterData>(REGISTER_INITIAL)
  const [regError,    setRegError]    = useState<string | null>(null)
  const [regSuccess,  setRegSuccess]  = useState<string | null>(null)
  const [regLoading,  setRegLoading]  = useState(false)
  const [showPassReg, setShowPassReg] = useState(false)

  // -------------------------------------------------------------------------
  // LOGIN — conecta con api/login.php
  // -------------------------------------------------------------------------
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    console.log("🚀 [LOGIN] Evento onSubmit capturado. Iniciando validación...")
    e.preventDefault()
    setLoginError(null)

    // Validación local antes de llamar al fetch
    if (!loginEmail.trim()) {
      setLoginError("El correo electrónico es obligatorio.")
      return
    }
    if (!loginPassword) {
      setLoginError("La contraseña es obligatoria.")
      return
    }

    setLoginLoading(true)

    // Flag: si navegamos con éxito, el finally NO resetea el loading para
    // mantener el spinner visible durante la transición a /dashboard.
    let navigating = false

    // AbortController: cancela el fetch si el servidor no responde en 15 s.
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(`${API_BASE_URL}/api/login.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:    loginEmail.trim(),
          password: loginPassword,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const result = await parseJsonResponse(response)

      if (result.status === "success") {
        // Persistir sesión: { id, fullName, email, role, status }
        localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(result.data))
        // Mantenemos loginLoading=true durante la navegación para evitar
        // el parpadeo de la landing page. El flag impide que finally lo baje.
        navigating = true
        router.push("/dashboard")
        return
      }

      setLoginError(result.message ?? "Error desconocido del servidor.")
    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === "AbortError"
      const msg = isAbort
        ? "La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo."
        : err instanceof Error
          ? err.message
          : "Error de red. Verifica tu conexión e intenta de nuevo."
      console.error("[AuthForm/login] Error en la solicitud:", err)
      setLoginError(msg)
    } finally {
      // Solo baja el spinner si NO estamos navegando a /dashboard.
      if (!navigating) setLoginLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // REGISTRO — conecta con api/register.php
  // -------------------------------------------------------------------------
  function handleRegChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setReg((prev) => ({ ...prev, [name]: value }))
    setRegError(null)
  }

  function handleRegCheckbox(checked: boolean | "indeterminate") {
    setReg((prev) => ({ ...prev, acceptedCodeOfConduct: checked === true }))
    setRegError(null)
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    console.log("🚀 [REGISTRO] Evento onSubmit capturado. Iniciando validación...")
    e.preventDefault()
    setRegError(null)
    setRegSuccess(null)

    // Validación local antes de llamar al fetch
    // El botón ya no está bloqueado por el checkbox — validamos aquí en su lugar
    if (!reg.acceptedCodeOfConduct) {
      setRegError("Debes aceptar el código de conducta para registrarte.")
      return
    }

    setRegLoading(true)

    let navigating = false

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(`${API_BASE_URL}/api/register.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fullName:              reg.fullName,
          email:                 reg.email,
          phone:                 reg.phone,
          birthDate:             reg.birthDate,
          password:              reg.password,
          gender:                reg.gender,
          acceptedCodeOfConduct: reg.acceptedCodeOfConduct,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const result = await parseJsonResponse(response)

      if (result.status === "success") {
        const data = result.data as { id: number; fullName: string; email: string }
        setRegSuccess(result.message ?? "Cuenta creada exitosamente.")
        setReg(REGISTER_INITIAL)
        navigating = true
        router.push(`/perfil?userId=${data.id}`)
        return
      }

      setRegError(result.message ?? "Error desconocido del servidor.")
    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === "AbortError"
      const msg = isAbort
        ? "La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo."
        : err instanceof Error
          ? err.message
          : "Error de red. Verifica tu conexión e intenta de nuevo."
      console.error("[AuthForm/register] Error en la solicitud:", err)
      setRegError(msg)
    } finally {
      if (!navigating) setRegLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Card className="w-full max-w-md border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-primary">
          Bienvenido a tu nueva comunidad
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tu privacidad es nuestra prioridad
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Skeleton SSR: el servidor nunca renderiza inputs → LastPass no puede inyectar */}
        {!isMounted ? (
          <div className="space-y-4 animate-pulse" aria-hidden="true">
            {/* Tabs stub */}
            <div className="grid grid-cols-2 gap-1 h-10 rounded-md bg-secondary/60 mb-6" />
            {/* Campos stub */}
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-secondary/80" />
                <div className="h-10 w-full rounded-md bg-secondary/60" />
              </div>
            ))}
            {/* Botón stub */}
            <div className="h-10 w-full rounded-md bg-primary/20 mt-2" />
          </div>
        ) : (
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          {/* ================================================================
              TAB: LOGIN
          ================================================================ */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <FieldGroup>

                {/* ── Email ── */}
                <Field>
                  <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@correo.com"
                      className="pl-10"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null) }}
                      disabled={loginLoading}
                      autoComplete="email"
                      data-lpignore="true"
                    />
                  </div>
                </Field>

                {/* ── Contraseña ── */}
                <Field>
                  <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassLogin ? "text" : "password"}
                      placeholder="Tu contraseña"
                      className="pl-10 pr-10"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null) }}
                      disabled={loginLoading}
                      autoComplete="current-password"
                      data-lpignore="true"
                    />
                    <button
                      type="button"
                      aria-label={showPassLogin ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassLogin((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

              </FieldGroup>

              {/* ── Error visible ── */}
              {loginError && <ErrorBanner message={loginError} />}

              <Button
                type="submit"
                className="w-full bg-turquoise hover:bg-turquoise/90 text-white font-semibold"
                disabled={loginLoading}
              >
                {loginLoading ? "Verificando..." : "Ingresar"}
              </Button>
            </form>
          </TabsContent>

          {/* ================================================================
              TAB: REGISTRO
          ================================================================ */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} noValidate className="space-y-2">
              <FieldGroup>

                {/* ── Nombre completo ── */}
                <Field>
                  <FieldLabel htmlFor="reg-fullName">Nombre completo</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reg-fullName"
                      name="fullName"
                      type="text"
                      placeholder="Nombre y apellidos"
                      className="pl-10"
                      value={reg.fullName}
                      onChange={handleRegChange}
                      maxLength={150}
                      disabled={regLoading}
                    />
                  </div>
                  <FieldDescription className="text-xs text-amber-600 dark:text-amber-400">
                    Este dato no podrá cambiarse después.
                  </FieldDescription>
                </Field>

                {/* ── Correo electrónico ── */}
                <Field>
                  <FieldLabel htmlFor="reg-email">Correo electrónico</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="tu@correo.com"
                      className="pl-10"
                      value={reg.email}
                      onChange={handleRegChange}
                      disabled={regLoading}
                      autoComplete="email"
                      data-lpignore="true"
                    />
                  </div>
                </Field>

                {/* ── Teléfono ── */}
                <Field>
                  <FieldLabel htmlFor="reg-phone">Teléfono</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reg-phone"
                      name="phone"
                      type="tel"
                      placeholder="Solo dígitos, sin espacios"
                      className="pl-10"
                      value={reg.phone}
                      onChange={handleRegChange}
                      disabled={regLoading}
                    />
                  </div>
                </Field>

                {/* ── Fecha de nacimiento ── */}
                <Field>
                  <FieldLabel htmlFor="reg-birthDate">Fecha de nacimiento</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reg-birthDate"
                      name="birthDate"
                      type="date"
                      className="pl-10"
                      value={reg.birthDate}
                      onChange={handleRegChange}
                      disabled={regLoading}
                    />
                  </div>
                  <FieldDescription className="text-xs text-amber-600 dark:text-amber-400">
                    Este dato no podrá cambiarse después.
                  </FieldDescription>
                </Field>

                {/* ── Género ── */}
                <Field>
                  <FieldLabel>Soy...</FieldLabel>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {(
                      [
                        { value: "M", label: "Hermano", emoji: "🙍‍♂️" },
                        { value: "F", label: "Hermana", emoji: "🙍‍♀️" },
                      ] as const
                    ).map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={regLoading}
                        onClick={() => {
                          setReg((prev) => ({ ...prev, gender: value }))
                          setRegError(null)
                        }}
                        className={[
                          "flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 text-sm font-medium transition-all duration-150",
                          reg.gender === value
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:bg-secondary/80",
                          regLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                      >
                        <span className="text-2xl leading-none">{emoji}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  {reg.gender === "" && (
                    <FieldDescription className="text-xs text-amber-600 dark:text-amber-400">
                      Requerido — usado para el directorio de miembros.
                    </FieldDescription>
                  )}
                </Field>

                {/* ── Contraseña ── */}
                <Field>
                  <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reg-password"
                      name="password"
                      type={showPassReg ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-10 pr-10"
                      value={reg.password}
                      onChange={handleRegChange}
                      disabled={regLoading}
                      autoComplete="new-password"
                      data-lpignore="true"
                    />
                    <button
                      type="button"
                      aria-label={showPassReg ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassReg((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassReg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

              </FieldGroup>

              {/* ── Código de conducta ── */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border mt-2">
                <Checkbox
                  id="reg-acceptedCodeOfConduct"
                  checked={reg.acceptedCodeOfConduct}
                  onCheckedChange={handleRegCheckbox}
                  disabled={regLoading}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="reg-acceptedCodeOfConduct"
                  className="text-sm leading-relaxed cursor-pointer select-none"
                >
                  <span className="font-medium text-primary">Acepto el código de conducta: </span>
                  <span className="text-foreground">Trato a todos como hijos de Dios.</span>
                </label>
              </div>

              {/* ── Error visible ── */}
              {regError && <ErrorBanner message={regError} />}

              {/* ── Éxito ── */}
              {regSuccess && (
                <p
                  role="status"
                  className="rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {regSuccess}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald hover:bg-emerald/90 text-white font-semibold mt-2"
                disabled={regLoading}
              >
                {regLoading ? "Creando cuenta..." : "Crear mi cuenta"}
              </Button>
            </form>
          </TabsContent>

        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
