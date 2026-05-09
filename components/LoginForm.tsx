"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface LoginSuccessData {
  id:                  number
  fullName:            string
  email:               string
  role?:               string
  status?:             string
  mustChangePassword?: boolean
}

interface ApiResponse {
  status: "success" | "error"
  message: string
  data: LoginSuccessData | []
}

interface LoginFormProps {
  /** Callback que se dispara tras un login exitoso. */
  onSuccess?: (data: LoginSuccessData) => void
  /**
   * Ruta a la que redirigir tras el login.
   * Si se omite, la navegación queda en manos del callback onSuccess.
   */
  redirectTo?: string
}

// ---------------------------------------------------------------------------
// Clave de sesión en localStorage
// Almacena: { id, fullName, email } — nunca password_hash
// ---------------------------------------------------------------------------
export const CFS_SESSION_KEY = "cfs_session"

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Submit — conecta con api/login.php
  // -------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setApiError(null)
    setIsLoading(true)

    const apiUrl = `${API_BASE_URL}/api/login.php`

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const result: ApiResponse = await response.json()

      if (result.status === "success") {
        const userData = result.data as LoginSuccessData

        // Persistir sesión completa (role, status incluidos) — nunca datos sensibles
        localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(userData))

        onSuccess?.(userData)
        if (userData.mustChangePassword) {
          router.push("/cambiar-contrasena")
        } else if (userData.status === "pending") {
          router.push("/pendiente")
        } else {
          router.push(redirectTo ?? "/dashboard")
        }
      } else {
        setApiError(result.message)
      }
    } catch (err) {
      console.error("[LoginForm] Error de conexión con el servidor PHP:", err)
      setApiError("Error de conexión con el servidor. Verifica tu red e intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Card className="w-full max-w-md border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-primary">
          Bienvenido de nuevo
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tu privacidad es nuestra prioridad
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FieldGroup>

            {/* ── Correo Electrónico ── */}
            <Field>
              <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setApiError(null) }}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  data-lpignore="true"
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setApiError(null) }}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

          </FieldGroup>

          {/* ── Mensaje de error de la API ── */}
          {apiError && (
            <FieldError className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm">
              {apiError}
            </FieldError>
          )}

          {/* ── Botón submit ── */}
          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "Verificando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
