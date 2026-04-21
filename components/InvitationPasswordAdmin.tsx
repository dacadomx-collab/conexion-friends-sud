"use client"

import { useState, useEffect } from "react"
import {
  KeyRound,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"
import { Button }            from "@/components/ui/button"
import { Input }             from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL }      from "@/lib/api"

// ---------------------------------------------------------------------------
interface LogEntry {
  id:        number
  adminId:   number
  adminName: string
  plainCode: string | null
  createdAt: string
}

interface Props {
  adminId: number
}

// ---------------------------------------------------------------------------
export function InvitationPasswordAdmin({ adminId }: Props) {
  // ── Formulario de cambio ──────────────────────────────────────────────────
  const [newPassword,  setNewPassword]  = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)
  const [saveOk,       setSaveOk]       = useState(false)

  // ── Log (historial completo) ──────────────────────────────────────────────
  const [log,        setLog]        = useState<LogEntry[]>([])
  const [loadingLog, setLoadingLog] = useState(true)
  const [logError,   setLogError]   = useState<string | null>(null)

  // ── Modal del historial ───────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false)

  // ── Visibilidad / copiado ─────────────────────────────────────────────────
  const [visibleId, setVisibleId] = useState<number | null>(null)
  const [copiedId,  setCopiedId]  = useState<number | null>(null)
  const [activeVisible, setActiveVisible] = useState(false)
  const [activeCopied,  setActiveCopied]  = useState(false)

  useEffect(() => { fetchLog() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchLog() {
    setLoadingLog(true)
    setLogError(null)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/get_invitation_log.php?requesterId=${adminId}`)
      const json = await res.json()
      if (json.status === "success") setLog(json.data ?? [])
      else setLogError(json.message ?? "Error al cargar.")
    } catch {
      setLogError("Error de red.")
    } finally {
      setLoadingLog(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { setSaveError("Mínimo 6 caracteres."); return }
    setSaving(true); setSaveError(null); setSaveOk(false)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/update_invitation_password.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requesterId: adminId, newInvitePassword: newPassword }),
      })
      const json = await res.json()
      if (json.status === "success") {
        setSaveOk(true); setNewPassword(""); setShowPassword(false)
        setTimeout(() => setSaveOk(false), 4000)
        fetchLog()
      } else {
        setSaveError(json.message ?? "Error al guardar.")
      }
    } catch {
      setSaveError("Error de red.")
    } finally {
      setSaving(false)
    }
  }

  async function copyToClipboard(text: string, onDone: () => void) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el)
    }
    onDone()
    setTimeout(onDone, 2500)   // onDone llamado de nuevo para limpiar el estado
  }

  function formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso))
    } catch { return iso }
  }

  const activeEntry = log[0] ?? null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex items-center gap-2 pt-2">
        <KeyRound className="h-5 w-5 text-primary shrink-0" />
        <h2 className="font-bold text-foreground text-base">Contraseña de Invitación Master</h2>
      </div>

      {/* Contraseña Activa */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="px-4 py-4 space-y-4">

          {/* Título de subsección + link historial */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Contraseña Activa
            </p>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none"
            >
              <History className="h-3.5 w-3.5" />
              Registro de Contraseñas
            </button>
          </div>

          {/* Caja de contraseña activa */}
          {loadingLog ? (
            <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : logError ? (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {logError}
            </div>
          ) : !activeEntry ? (
            <p className="text-sm text-muted-foreground py-2">Sin contraseña configurada aún.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="flex-1 text-sm font-mono font-semibold tracking-wide select-all text-emerald-800 dark:text-emerald-300">
                    {activeVisible ? (activeEntry.plainCode ?? "—") : "•".repeat(Math.min((activeEntry.plainCode ?? "").length || 8, 12))}
                  </span>
                </div>
                {/* Ojo */}
                <button
                  type="button"
                  onClick={() => setActiveVisible((v) => !v)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label={activeVisible ? "Ocultar" : "Mostrar"}
                >
                  {activeVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {/* Copiar */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCopied(true)
                    copyToClipboard(activeEntry.plainCode ?? "", () => setActiveCopied(false))
                  }}
                  className={`p-1.5 rounded-md transition-colors ${activeCopied ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                  aria-label="Copiar contraseña"
                >
                  {activeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                Establecida por <span className="font-medium text-foreground">{activeEntry.adminName}</span>
                {" · "}{formatDate(activeEntry.createdAt)}
              </p>
            </div>
          )}

          {/* Formulario de cambio */}
          <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-border/40" noValidate>
            <p className="text-xs text-muted-foreground">Establecer nueva contraseña de invitación:</p>
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  id="newInvitePassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres…"
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
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{saveError}
              </div>
            )}
            {saveOk && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Contraseña actualizada. Compártela con los nuevos miembros.
              </div>
            )}

            <Button type="submit" size="sm" className="w-full font-semibold" disabled={saving || newPassword.length < 6}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : <><Save className="h-4 w-4 mr-2" />Guardar nueva contraseña</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modal: Registro de Contraseñas */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Registro de Contraseñas
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-end mb-1">
            <button
              onClick={fetchLog}
              disabled={loadingLog}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingLog ? "animate-spin" : ""}`} />
              Refrescar
            </button>
          </div>

          {loadingLog ? (
            <div className="flex justify-center items-center gap-2 py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />Cargando…
            </div>
          ) : log.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sin contraseñas registradas.</p>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
              {log.map((entry, idx) => {
                const isActive  = idx === 0
                const isVisible = visibleId === entry.id
                const isCopied  = copiedId  === entry.id
                return (
                  <div key={entry.id} className={`px-4 py-3 bg-background ${isActive ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-secondary/30"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`block w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.adminName}
                          {isActive && <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">· activa</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">{formatDate(entry.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <div className="flex-1 flex items-center gap-2 rounded-md bg-secondary/60 border border-border/60 px-3 py-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={`flex-1 text-sm font-mono tracking-wide select-all ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          {isVisible ? (entry.plainCode ?? "—") : "•".repeat(Math.min((entry.plainCode ?? "").length || 6, 12))}
                        </span>
                      </div>
                      <button type="button" onClick={() => setVisibleId(isVisible ? null : entry.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label={isVisible ? "Ocultar" : "Mostrar"}>
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button type="button"
                        onClick={() => { setCopiedId(entry.id); copyToClipboard(entry.plainCode ?? "", () => setCopiedId(null)) }}
                        className={`p-1.5 rounded-md transition-colors ${isCopied ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                        aria-label="Copiar">
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
