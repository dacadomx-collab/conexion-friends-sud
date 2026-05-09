"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"

const CFS_SESSION_KEY = "cfs_session"

interface SessionData {
  id:                  number
  fullName:            string
  email:               string
  role?:               string
  status?:             string
  mustChangePassword?: boolean
}

export function ChangePasswordClient() {
  const router = useRouter()

  const [isMounted,       setIsMounted]       = useState(false)
  const [session,         setSession]         = useState<SessionData | null>(null)
  const [newPassword,     setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [isLoading,       setIsLoading]       = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (!isMounted) return
    try {
      const raw = localStorage.getItem(CFS_SESSION_KEY)
      if (!raw) { router.replace("/"); return }
      const data: SessionData = JSON.parse(raw)
      if (!data?.id) { router.replace("/"); return }
      if (!data.mustChangePassword) { router.replace("/dashboard"); return }
      setSession(data)
    } catch {
      router.replace("/")
    }
  }, [isMounted, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (!session) return

    setIsLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/account/change_password_forced.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: session.id, newPassword }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)

      const updatedSession: SessionData = { ...session, mustChangePassword: false }
      localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(updatedSession))

      setSuccess(true)
      setTimeout(() => router.replace("/dashboard"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">

        {/* Aviso de seguridad */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 leading-tight">
              Cambio de contraseña requerido
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Por seguridad, debes crear una contraseña personalizada antes de continuar. No podrás acceder a la plataforma hasta completar este paso.
            </p>
          </div>
        </div>

        <Card className="border border-border shadow-xl bg-card/95 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-primary">
              Crear nueva contraseña
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Hola, <span className="font-medium text-foreground">{session.fullName}</span>. Elige una contraseña segura y personal.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-foreground">¡Contraseña actualizada!</p>
                <p className="text-xs text-muted-foreground text-center">
                  Redirigiendo al dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Nueva contraseña */}
                <div className="space-y-1.5">
                  <label htmlFor="cp-new" className="text-sm font-medium text-foreground">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="cp-new"
                      type={showNew ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      className="pl-10 pr-10"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null) }}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showNew ? "Ocultar" : "Mostrar"}
                      onClick={() => setShowNew((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-1.5">
                  <label htmlFor="cp-confirm" className="text-sm font-medium text-foreground">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="cp-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repite tu nueva contraseña"
                      className="pl-10 pr-10"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Indicador de fuerza / coincidencia */}
                {confirmPassword && (
                  <div className={[
                    "flex items-center gap-1.5 text-xs rounded-md px-3 py-2 border",
                    newPassword === confirmPassword
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive",
                  ].join(" ")}>
                    {newPassword === confirmPassword
                      ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Las contraseñas coinciden.</>
                      : <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Las contraseñas no coinciden.</>
                    }
                  </div>
                )}

                {/* Error API */}
                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
                    : <><KeyRound className="h-4 w-4 mr-2" />Guardar nueva contraseña</>
                  }
                </Button>

              </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
