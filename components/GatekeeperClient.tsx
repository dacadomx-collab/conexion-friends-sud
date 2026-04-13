"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { KeyRound, Loader2, AlertTriangle, ArrowRight, LogIn } from "lucide-react"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { ConexionLogo } from "@/components/conexion-logo"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Clave de sessionStorage que acredita haber pasado la puerta en esta sesión.
// Se comparte con la protección de app/page.tsx.
// ---------------------------------------------------------------------------
export const CFS_INVITE_KEY = "cfs_invite_valid"

// ---------------------------------------------------------------------------
export function GatekeeperClient() {
  const router = useRouter()

  // ── Evitar render SSR ─────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // ── Si ya tiene sesión activa o ya pasó la puerta, redirigir directo ───────
  useEffect(() => {
    if (!isMounted) return
    const alreadyIn  = sessionStorage.getItem(CFS_INVITE_KEY) === "1"
    const hasSession = !!localStorage.getItem("cfs_session")
    if (alreadyIn || hasSession) {
      router.replace("/")
    }
  }, [isMounted, router])

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isMounted) inputRef.current?.focus()
  }, [isMounted])

  // ── Validar contraseña ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setError("Ingresa la contraseña de invitación.")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch(`${API_BASE_URL}/api/validate_invitation.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ invitePassword: password }),
      })
      const json = await res.json()

      if (json.status === "success") {
        sessionStorage.setItem(CFS_INVITE_KEY, "1")
        router.replace("/")
      } else {
        setError(json.message ?? "Contraseña incorrecta. Inténtalo de nuevo.")
        setPassword("")
        inputRef.current?.focus()
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // ── Acceso directo para miembros existentes ───────────────────────────────
  function handleMemberAccess() {
    // El miembro tiene cfs_session en localStorage, pero igual marcamos la
    // puerta para que la protección de page.tsx no lo rebote.
    sessionStorage.setItem(CFS_INVITE_KEY, "1")
    router.replace("/")
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

      {/* ── Card central ── */}
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <ConexionLogo />
        </div>

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Comunidad Privada
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Esta comunidad es solo por invitación. Ingresa la contraseña que te compartió un miembro.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label
              htmlFor="invitePassword"
              className="text-sm font-medium text-foreground"
            >
              Contraseña de Invitación
            </label>
            <Input
              id="invitePassword"
              ref={inputRef}
              type="password"
              placeholder="Escribe la contraseña..."
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              disabled={loading}
              autoComplete="off"
              className="text-base"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
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

        {/* Enlace para miembros existentes */}
        <div className="text-center">
          <p className="text-base font-medium text-foreground mb-3">
            ¿Ya eres miembro?
          </p>
          <Button
            variant="outline"
            className="w-full font-semibold border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={handleMemberAccess}
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
