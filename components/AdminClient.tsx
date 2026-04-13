"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield,
  Search,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  UserCheck,
  ChevronDown,
} from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge }   from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { API_BASE_URL } from "@/lib/api"
import { InvitationPasswordAdmin } from "@/components/InvitationPasswordAdmin"

// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

interface SessionData {
  id:      number
  fullName: string
  email:   string
  role?:   string
}

interface AdminUser {
  id:            number
  fullName:      string
  email:         string
  role:          string
  status:        string
  groupJoinDate: string
}

interface UserDraft {
  role:          string
  status:        string
  groupJoinDate: string
  saving:        boolean
  error:         string | null
  saved:         boolean
}

// ---------------------------------------------------------------------------
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  user:  "Usuario",
}

const STATUS_LABELS: Record<string, string> = {
  active:   "Activo",
  inactive: "Inactivo",
  blocked:  "Bloqueado",
}

const STATUS_DOT: Record<string, string> = {
  active:   "bg-emerald-500",
  inactive: "bg-muted-foreground",
  blocked:  "bg-destructive",
}

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
  inactive: "bg-secondary text-muted-foreground border-border",
  blocked:  "bg-destructive/10 text-destructive border-destructive/30",
}

const SELECT_CLS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

// ---------------------------------------------------------------------------
export function AdminClient() {
  const router = useRouter()

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [session,   setSession]   = useState<SessionData | null>(null)
  const [authReady, setAuthReady] = useState(false)

  // ── Montaje diferido (blinda SSR / LastPass) ───────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFS_SESSION_KEY)
      if (!raw) { router.replace("/"); return }
      const data: SessionData = JSON.parse(raw)
      if (data?.role !== "admin") { router.replace("/dashboard"); return }
      setSession(data)
    } catch {
      router.replace("/")
    } finally {
      setAuthReady(true)
    }
  }, [router])

  // ── Lista de usuarios ──────────────────────────────────────────────────────
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    setLoadingList(true)
    fetch(`${API_BASE_URL}/api/get_users_admin.php?requesterId=${session.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setUsers(json.data ?? [])
        else setLoadError(json.message ?? "Error al cargar usuarios.")
      })
      .catch(() => setLoadError("Error de red al cargar usuarios."))
      .finally(() => setLoadingList(false))
  }, [session])

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:   users.length,
    active:  users.filter((u) => u.status === "active").length,
    admins:  users.filter((u) => u.role === "admin").length,
  }), [users])

  // ── Drafts ─────────────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<Record<number, UserDraft>>({})

  useEffect(() => {
    const init: Record<number, UserDraft> = {}
    users.forEach((u) => {
      init[u.id] = {
        role: u.role, status: u.status, groupJoinDate: u.groupJoinDate,
        saving: false, error: null, saved: false,
      }
    })
    setDrafts(init)
  }, [users])

  function patchDraft(userId: number, patch: Partial<UserDraft>) {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }))
  }

  // ── Buscador ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  // ── Accordion: fila expandida actualmente ─────────────────────────────────
  const [openId, setOpenId] = useState<number | null>(null)

  // ── Guardar ────────────────────────────────────────────────────────────────
  async function handleSave(targetUserId: number) {
    if (!session) return
    const draft = drafts[targetUserId]
    if (!draft) return

    patchDraft(targetUserId, { saving: true, error: null, saved: false })
    try {
      const res  = await fetch(`${API_BASE_URL}/api/update_user_admin.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          requesterId:  session.id,
          targetUserId,
          newRole:      draft.role,
          newStatus:    draft.status,
          newJoinDate:  draft.groupJoinDate || null,
        }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, role: draft.role, status: draft.status, groupJoinDate: draft.groupJoinDate }
            : u,
        ),
      )
      patchDraft(targetUserId, { saving: false, saved: true })
      setTimeout(() => patchDraft(targetUserId, { saved: false }), 3000)
    } catch (err) {
      patchDraft(targetUserId, {
        saving: false,
        error:  err instanceof Error ? err.message : "Error desconocido.",
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isMounted || !authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="flex-1 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <span className="font-bold text-foreground text-base">Panel de Administración</span>
          </div>
          <Badge
            variant="secondary"
            className="text-xs bg-primary/10 text-primary border border-primary/30 font-semibold"
          >
            Admin
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── KPI Cards ── */}
        {!loadingList && !loadError && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="px-4 py-3 flex flex-col items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground leading-none">{kpis.total}</p>
                <p className="text-xs text-muted-foreground text-center">Miembros</p>
              </CardContent>
            </Card>
            <Card className="border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CardContent className="px-4 py-3 flex flex-col items-center gap-1">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-none">{kpis.active}</p>
                <p className="text-xs text-muted-foreground text-center">Activos</p>
              </CardContent>
            </Card>
            <Card className="border border-primary/20 shadow-sm">
              <CardContent className="px-4 py-3 flex flex-col items-center gap-1">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold text-primary leading-none">{kpis.admins}</p>
                <p className="text-xs text-muted-foreground text-center">Admins</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Buscador ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre o correo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* ── Estado de carga / error / vacío ── */}
        {loadingList ? (
          <div className="flex justify-center items-center gap-2 py-12 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando usuarios…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No se encontraron usuarios{query ? ` para "${query}"` : ""}.
          </p>
        ) : (

          // ── Lista colapsable ──
          <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
            {filtered.map((user) => {
              const draft   = drafts[user.id]
              if (!draft) return null

              const isOpen  = openId === user.id
              const isDirty =
                draft.role          !== user.role          ||
                draft.status        !== user.status        ||
                draft.groupJoinDate !== user.groupJoinDate

              return (
                <Collapsible
                  key={user.id}
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? user.id : null)}
                >
                  {/* ── Fila compacta (trigger) ── */}
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-background hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      aria-label={`Editar ${user.fullName}`}
                    >
                      {/* Status dot */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[user.status] ?? "bg-muted-foreground"}`}
                        aria-hidden="true"
                      />

                      {/* ID */}
                      <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
                        #{user.id}
                      </span>

                      {/* Nombre + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Role badge — solo en sm+ */}
                      <Badge
                        variant="outline"
                        className={`hidden sm:inline-flex text-xs shrink-0 border ${STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive}`}
                      >
                        {STATUS_LABELS[user.status] ?? user.status}
                      </Badge>

                      {/* Indicador de cambios pendientes */}
                      {isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-label="Cambios sin guardar" />
                      )}

                      {/* Chevron */}
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>

                  {/* ── Panel de edición expandido ── */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-3 bg-secondary/20 border-t border-border/40 space-y-3">

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Rol */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Rol</label>
                          <select
                            value={draft.role}
                            onChange={(e) => patchDraft(user.id, { role: e.target.value, error: null, saved: false })}
                            disabled={draft.saving || session.id === user.id}
                            className={SELECT_CLS}
                          >
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          {session.id === user.id && (
                            <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>
                          )}
                        </div>

                        {/* Estatus */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Estatus</label>
                          <select
                            value={draft.status}
                            onChange={(e) => patchDraft(user.id, { status: e.target.value, error: null, saved: false })}
                            disabled={draft.saving}
                            className={SELECT_CLS}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>

                      </div>

                      {/* Fecha de ingreso */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Fecha de ingreso al grupo
                        </label>
                        <Input
                          type="date"
                          value={draft.groupJoinDate}
                          onChange={(e) => patchDraft(user.id, { groupJoinDate: e.target.value, error: null, saved: false })}
                          disabled={draft.saving}
                        />
                      </div>

                      {/* Feedback */}
                      {draft.error && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          {draft.error}
                        </div>
                      )}
                      {draft.saved && (
                        <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          Cambios guardados correctamente.
                        </div>
                      )}

                      {/* Botón guardar */}
                      <Button
                        size="sm"
                        className="w-full font-semibold"
                        disabled={draft.saving || !isDirty}
                        onClick={() => handleSave(user.id)}
                      >
                        {draft.saving ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" />{isDirty ? "Guardar Cambios" : "Sin cambios"}</>
                        )}
                      </Button>

                    </div>
                  </CollapsibleContent>

                </Collapsible>
              )
            })}
          </div>

        )}

        {/* Conteo de resultados */}
        {!loadingList && !loadError && filtered.length > 0 && (
          <p className="text-xs text-center text-muted-foreground pb-2">
            {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
            {query ? ` coinciden con "${query}"` : " en total"}
          </p>
        )}

        {/* ── Divisor ── */}
        <div className="border-t border-border/60 pt-2" />

        {/* ── Sección: Contraseña de Invitación Master ── */}
        <InvitationPasswordAdmin adminId={session.id} />

      </main>
    </div>
  )
}
