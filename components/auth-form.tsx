"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar, AlertTriangle } from "lucide-react"

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

    try {
      const response = await fetch("/api/login.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:    loginEmail.trim(),
          password: loginPassword,
        }),
      })

      const result = await parseJsonResponse(response)

      if (result.status === "success") {
        // Persistir sesión: { id, fullName, email }
        localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(result.data))
        onSuccess?.()
        router.push("/dashboard")
      } else {
        setLoginError(result.message ?? "Error desconocido del servidor.")
      }
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : "Error de red. Verifica tu conexión e intenta de nuevo."
      )
    } finally {
      setLoginLoading(false)
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

    try {
      const response = await fetch("/api/register.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fullName:              reg.fullName,
          email:                 reg.email,
          phone:                 reg.phone,
          birthDate:             reg.birthDate,
          password:              reg.password,
          acceptedCodeOfConduct: reg.acceptedCodeOfConduct,
        }),
      })

      const result = await parseJsonResponse(response)

      if (result.status === "success") {
        const data = result.data as { id: number; fullName: string; email: string }
        setRegSuccess(result.message ?? "Cuenta creada exitosamente.")
        setReg(REGISTER_INITIAL)
        // Redirigir al formulario de perfil con el ID del usuario recién creado
        router.push(`/perfil?userId=${data.id}`)
      } else {
        setRegError(result.message ?? "Error desconocido del servidor.")
      }
    } catch (err) {
      setRegError(
        err instanceof Error
          ? err.message
          : "Error de red. Verifica tu conexión e intenta de nuevo."
      )
    } finally {
      setRegLoading(false)
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
                  <div className="relative" suppressHydrationWarning>
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
                    />
                  </div>
                </Field>

                {/* ── Contraseña ── */}
                <Field>
                  <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                  <div className="relative" suppressHydrationWarning>
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
                  <div className="relative" suppressHydrationWarning>
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
                  <div className="relative" suppressHydrationWarning>
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
                    />
                  </div>
                </Field>

                {/* ── Teléfono ── */}
                <Field>
                  <FieldLabel htmlFor="reg-phone">Teléfono</FieldLabel>
                  <div className="relative" suppressHydrationWarning>
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
                  <div className="relative" suppressHydrationWarning>
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

                {/* ── Contraseña ── */}
                <Field>
                  <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
                  <div className="relative" suppressHydrationWarning>
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
      </CardContent>
    </Card>
  )
}
