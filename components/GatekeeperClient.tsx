"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  KeyRound, Loader2, AlertTriangle, ArrowRight, LogIn, ShieldAlert, ShieldOff,
} from "lucide-react"
import { Button }       from "@/components/ui/button"
import { Input }        from "@/components/ui/input"
import { ConexionLogo } from "@/components/conexion-logo"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Clave de sessionStorage que acredita haber pasado la puerta en esta sesión.
// Se comparte con la protección de app/page.tsx.
// ---------------------------------------------------------------------------
export const CFS_INVITE_KEY = "cfs_invite_valid"

const FETCH_TIMEOUT_MS = 15_000

// Nivel de alerta devuelto por la API
type AlertLevel = "error" | "warning" | "blocked"

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
export function GatekeeperClient() {
  const router = useRouter()

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // Si ya pasó la puerta o tiene sesión activa, redirigir a /
  useEffect(() => {
    if (!isMounted) return
    const alreadyIn  = sessionStorage.getItem(CFS_INVITE_KEY) === "1"
    const hasSession = !!localStorage.getItem("cfs_session")
    if (alreadyIn || hasSession) router.replace("/")
  }, [isMounted, router])

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [password,   setPassword]   = useState("")
  const [loading,    setLoading]    = useState(false)
  const [alertMsg,   setAlertMsg]   = useState<string | null>(null)
  const [alertLevel, setAlertLevel] = useState<AlertLevel>("error")
  const inputRef = useRef<HTMLInputElement>(null)

  // Bloqueo de UI cuando la IP está bloqueada
  const isBlocked = alertLevel === "blocked" && alertMsg !== null

  useEffect(() => {
    if (isMounted) inputRef.current?.focus()
  }, [isMounted])

  // ── Limpiar alerta al escribir ────────────────────────────────────────────
  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value)
    // Solo limpiamos alertas no-bloqueadas al escribir
    if (alertLevel !== "blocked") setAlertMsg(null)
  }

  // ── Validar contraseña ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || isBlocked) return

    setLoading(true)
    setAlertMsg(null)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const res  = await fetch(`${API_BASE_URL}/api/validate_invitation.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ invitePassword: password }),
        signal:  controller.signal,
      })
      clearTimeout(timeoutId)

      const json = await parseJsonResponse(res)

      if (json.status === "success") {
        sessionStorage.setItem(CFS_INVITE_KEY, "1")
        router.replace("/")
        return
      }

      // Clasificar nivel de alerta según la respuesta del servidor
      if (json.status === "blocked" || res.status === 429) {
        setAlertLevel("blocked")
      } else if (json.status === "warning") {
        setAlertLevel("warning")
      } else {
        setAlertLevel("error")
      }

      setAlertMsg(json.message ?? "Contraseña incorrecta. Inténtalo de nuevo.")
      setPassword("")
      if (alertLevel !== "blocked") inputRef.current?.focus()

    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === "AbortError"
      const msg = isAbort
        ? "La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo."
        : err instanceof Error
          ? err.message
          : "Error de conexión. Verifica tu internet e inténtalo de nuevo."
      console.error("[GatekeeperClient] Error al validar contraseña:", err)
      setAlertLevel("error")
      setAlertMsg(msg)
    } finally {
      setLoading(false)
    }
  }

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

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full border ${isBlocked
              ? "bg-destructive/10 border-destructive/30"
              : "bg-primary/10 border-primary/20"}`}
            >
              {isBlocked
                ? <ShieldOff className="h-6 w-6 text-destructive" />
                : <KeyRound  className="h-6 w-6 text-primary" />
              }
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {isBlocked ? "Acceso Bloqueado" : "Comunidad Privada"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {isBlocked
              ? "Tu dirección IP ha sido bloqueada temporalmente por razones de seguridad."
              : "Esta comunidad es solo por invitación. Ingresa la contraseña que te compartió un miembro."
            }
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="invitePassword" className="text-sm font-medium text-foreground">
              Contraseña de Invitación
            </label>
            <Input
              id="invitePassword"
              ref={inputRef}
              type="password"
              placeholder={isBlocked ? "Acceso bloqueado temporalmente…" : "Escribe la contraseña..."}
              value={password}
              onChange={handlePasswordChange}
              disabled={loading || isBlocked}
              autoComplete="off"
              className={`text-base ${isBlocked ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Banner de alerta — 3 niveles visuales */}
          {alertMsg && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
                alertLevel === "blocked"
                  ? "bg-destructive/10 border-destructive/40 text-destructive"
                  : alertLevel === "warning"
                    ? "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {alertLevel === "blocked"
                ? <ShieldAlert  className="h-4 w-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              }
              <span>{alertMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={loading || !password.trim() || isBlocked}
          >
            {loading ? (
              <><Loader2   className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
            ) : (
              <><ArrowRight className="h-4 w-4 mr-2" />Ingresar</>
            )}
          </Button>
        </form>

        {/* Divisor */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">o</span>
          </div>
        </div>

        {/* ── Acceso exclusivo para miembros (→ /login, sin registro) ── */}
        <div className="text-center">
          <p className="text-base font-medium text-foreground mb-3">
            ¿Ya eres miembro?
          </p>
          <Button
            variant="outline"
            className="w-full font-semibold border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => router.push("/login")}
            disabled={loading}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Iniciar Sesión
          </Button>
        </div>

        {/* Footer */}
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
