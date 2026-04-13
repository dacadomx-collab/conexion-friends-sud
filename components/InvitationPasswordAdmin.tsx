"use client"

import { useState, useEffect } from "react"
import {
  KeyRound,
  RefreshCw,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
} from "lucide-react"
import { Button }               from "@/components/ui/button"
import { Input }                from "@/components/ui/input"
import { Card, CardContent }    from "@/components/ui/card"
import { API_BASE_URL }         from "@/lib/api"

// ---------------------------------------------------------------------------
interface LogEntry {
  id:        number
  adminId:   number
  adminName: string
  createdAt: string
}

interface Props {
  adminId: number
}

// ---------------------------------------------------------------------------
export function InvitationPasswordAdmin({ adminId }: Props) {
  // ── Estado del formulario de cambio ───────────────────────────────────────
  const [newPassword,  setNewPassword]  = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)
  const [saveOk,       setSaveOk]       = useState(false)

  // ── Estado del historial ──────────────────────────────────────────────────
  const [log,         setLog]         = useState<LogEntry[]>([])
  const [loadingLog,  setLoadingLog]  = useState(true)
  const [logError,    setLogError]    = useState<string | null>(null)

  // ── Cargar historial al montar ────────────────────────────────────────────
  useEffect(() => {
    fetchLog()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchLog() {
    setLoadingLog(true)
    setLogError(null)
    try {
      const res  = await fetch(
        `${API_BASE_URL}/api/get_invitation_log.php?requesterId=${adminId}`,
      )
      const json = await res.json()
      if (json.status === "success") setLog(json.data ?? [])
      else setLogError(json.message ?? "Error al cargar el historial.")
    } catch {
      setLogError("Error de red al cargar el historial.")
    } finally {
      setLoadingLog(false)
    }
  }

  // ── Guardar nueva contraseña ──────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setSaveError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)

    try {
      const res  = await fetch(`${API_BASE_URL}/api/update_invitation_password.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requesterId: adminId, newInvitePassword: newPassword }),
      })
      const json = await res.json()

      if (json.status === "success") {
        setSaveOk(true)
        setNewPassword("")
        setTimeout(() => setSaveOk(false), 4000)
        fetchLog() // Refrescar historial
      } else {
        setSaveError(json.message ?? "Error al guardar la contraseña.")
      }
    } catch {
      setSaveError("Error de red. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  // ── Formatear fecha ───────────────────────────────────────────────────────
  function formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat("es-MX", {
        day:    "2-digit",
        month:  "short",
        year:   "numeric",
        hour:   "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Cabecera de sección ── */}
      <div className="flex items-center gap-2 pt-2">
        <KeyRound className="h-5 w-5 text-primary shrink-0" />
        <h2 className="font-bold text-foreground text-base">
          Contraseña de Invitación Master
        </h2>
      </div>

      {/* ── Formulario de cambio ── */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Establece una nueva contraseña de invitación. Los nuevos usuarios
            necesitarán ingresarla en la puerta de acceso antes de registrarse.
          </p>

          <form onSubmit={handleSave} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="newInvitePassword"
                className="text-xs font-medium text-muted-foreground"
              >
                Nueva contraseña de invitación
              </label>
              <div className="relative">
                <Input
                  id="newInvitePassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres..."
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setSaveError(null) }}
                  disabled={saving}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Feedback */}
            {saveError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {saveError}
              </div>
            )}
            {saveOk && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Contraseña de invitación actualizada correctamente.
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              className="w-full font-semibold"
              disabled={saving || newPassword.length < 6}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Guardar nueva contraseña</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Historial de cambios ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Historial de cambios</span>
          </div>
          <button
            onClick={fetchLog}
            disabled={loadingLog}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Refrescar historial"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLog ? "animate-spin" : ""}`} />
            Refrescar
          </button>
        </div>

        {loadingLog ? (
          <div className="flex justify-center items-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        ) : logError ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {logError}
          </div>
        ) : log.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Aún no hay cambios registrados.
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
            {log.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 bg-background hover:bg-secondary/30 transition-colors"
              >
                {/* Indicador activo / histórico */}
                <div className="shrink-0 mt-1">
                  {idx === 0 ? (
                    <span
                      className="block w-2 h-2 rounded-full bg-emerald-500 mt-0.5"
                      title="Contraseña activa actual"
                    />
                  ) : (
                    <span className="block w-2 h-2 rounded-full bg-muted-foreground/40 mt-0.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.adminName}
                    {idx === 0 && (
                      <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                        · activa
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Admin ID #{entry.adminId}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{formatDate(entry.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
