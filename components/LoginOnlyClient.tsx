"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, Loader2, LogIn, AlertTriangle } from "lucide-react"
import { Button }        from "@/components/ui/button"
import { Input }         from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ConexionLogo }  from "@/components/conexion-logo"
import { API_BASE_URL }  from "@/lib/api"

// ---------------------------------------------------------------------------
// Clave de sesión en localStorage — misma que usa auth-form.tsx
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

const FETCH_TIMEOUT_MS = 15_000

// ---------------------------------------------------------------------------
async function parseJsonResponse(
  res: Response,
): Promise<{ status: string; message: string; data: unknown }> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta inesperada (HTTP ${res.status}). ` +
      `Detalle: ${text.slice(0, 150)}`,
    )
  }
}

// ---------------------------------------------------------------------------
export function LoginOnlyClient() {
  const router = useRouter()

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // Si ya tiene sesión activa, redirigir directamente al dashboard
  useEffect(() => {
    if (!isMounted) return
    if (localStorage.getItem(CFS_SESSION_KEY)) {
      router.replace("/dashboard")
    }
  }, [isMounted, router])

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isMounted) emailRef.current?.focus()
  }, [isMounted])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim()) {
      setErrorMsg("El correo electrónico es obligatorio.")
      return
    }
    if (!password) {
      setErrorMsg("La contraseña es obligatoria.")
      return
    }

    setLoading(true)
    let navigating = false

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE_URL}/api/login.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), password }),
        signal:  controller.signal,
      })
      clearTimeout(timeoutId)

      const result = await parseJsonResponse(res)

      if (result.status === "success") {
        const sessionData = result.data as {
          mustChangePassword?: boolean
          status?: string
        }
        localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(result.data))
        navigating = true
        if (sessionData.mustChangePassword === true) {
          router.push("/cambiar-contrasena")
        } else if (sessionData.status === "pending") {
          router.push("/pendiente")
        } else {
          router.push("/dashboard")
        }
        return
      }

      setErrorMsg(result.message ?? "Correo o contraseña incorrectos.")
    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === "AbortError"
      const msg = isAbort
        ? "La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo."
        : err instanceof Error
          ? err.message
          : "Error de red. Verifica tu conexión e intenta de nuevo."
      console.error("[LoginOnlyClient] Error al iniciar sesión:", err)
      setErrorMsg(msg)
    } finally {
      if (!navigating) setLoading(false)
    }
  }

  // ── Skeleton mientras hidrata ─────────────────────────────────────────────
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <ConexionLogo />
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-sm">
              Accede a tu cuenta de Conexion FRIENDS SUD
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FieldGroup>

                {/* Email */}
                <Field>
                  <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-email"
                      ref={emailRef}
                      type="email"
                      placeholder="tu@correo.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg(null) }}
                      disabled={loading}
                      autoComplete="email"
                      data-lpignore="true"
                    />
                  </div>
                </Field>

                {/* Contraseña */}
                <Field>
                  <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                  <div className="relative" suppressHydrationWarning data-lpignore="true">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      placeholder="Tu contraseña"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(null) }}
                      disabled={loading}
                      autoComplete="current-password"
                      data-lpignore="true"
                    />
                    <button
                      type="button"
                      aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

              </FieldGroup>

              {/* Banner de error */}
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-turquoise hover:bg-turquoise/90 text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
                ) : (
                  <><LogIn className="h-4 w-4 mr-2" />Ingresar</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Volver a /acceso */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/acceso"
            className="font-medium text-primary underline hover:text-primary/80 transition-colors"
          >
            Solicita una invitación
          </Link>
        </p>

        {/* Footer legal */}
        <p className="text-center text-xs text-muted-foreground">
          Al acceder aceptas nuestros{" "}
          <Link href="/terminos" className="underline hover:text-foreground transition-colors">
            Términos
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" className="underline hover:text-foreground transition-colors">
            Privacidad
          </Link>
        </p>

      </div>
    </div>
  )
}
