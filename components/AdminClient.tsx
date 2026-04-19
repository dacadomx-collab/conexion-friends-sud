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
  ChevronLeft,
  ChevronRight,
  EyeOff,
  UserX,
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
const PAGE_SIZE       = 10   // Máximo de usuarios por página

interface SessionData {
  id:       number
  fullName: string
  email:    string
  role?:    string
}

interface AdminUser {
  id:            number
  fullName:      string
  email:         string
  role:          string
  status:        string
  groupJoinDate: string
}

interface DepartureEntry {
  id:        number
  userName:  string
  action:    "hidden" | "deleted"
  reason:    string | null
  createdAt: string
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

  // ── Registro de bajas ──────────────────────────────────────────────────────
  const [departures,        setDepartures]        = useState<DepartureEntry[]>([])
  const [loadingDepartures, setLoadingDepartures] = useState(true)
  const [departuresError,   setDeparturesError]   = useState<string | null>(null)

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

  useEffect(() => {
    if (!session) return
    setLoadingDepartures(true)
    fetch(`${API_BASE_URL}/api/admin/get_departures.php?requesterId=${session.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setDepartures(json.data ?? [])
        else setDeparturesError(json.message ?? "Error al cargar el registro de bajas.")
      })
      .catch(() => setDeparturesError("Error de red al cargar el registro de bajas."))
      .finally(() => setLoadingDepartures(false))
  }, [session])

  // ── KPIs ───────────────────────────────────────────────────────────────────
  // hidden  = usuarios con status='inactive' (ya en memoria desde get_users_admin)
  // deleted = entradas action='deleted' en departures (ya en memoria desde get_departures)
  const kpis = useMemo(() => ({
    total:   users.length,
    active:  users.filter((u) => u.status === "active").length,
    admins:  users.filter((u) => u.role === "admin").length,
    hidden:  users.filter((u) => u.status === "inactive").length,
    deleted: departures.filter((d) => d.action === "deleted").length,
  }), [users, departures])

  // ── Panel de Admins (toggle) ───────────────────────────────────────────────
  const [showAdmins, setShowAdmins] = useState(false)

  const adminUsers = useMemo(
    () => users.filter((u) => u.role === "admin"),
    [users],
  )

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

  // ── Paginación ─────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)

  // Resetear a página 1 cada vez que cambia la búsqueda
  useEffect(() => { setCurrentPage(1) }, [query])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length],
  )

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  // ── Accordion: fila expandida actualmente ─────────────────────────────────
  const [openId, setOpenId] = useState<number | null>(null)

  // Cerrar el accordion abierto si cambia de página (evita desorientación)
  useEffect(() => { setOpenId(null) }, [currentPage])

  // ── Scroll suave a sección de Bajas ───────────────────────────────────────
  function scrollToBajas() {
    document.getElementById("seccion-bajas")?.scrollIntoView({ behavior: "smooth" })
  }

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

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 1 — KPI Cards (siempre arriba)
        ══════════════════════════════════════════════════════════════════ */}
        {!loadingList && !loadError && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

              {/* Total miembros */}
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-2xl font-bold text-foreground leading-none">{kpis.total}</p>
                  <p className="text-xs text-muted-foreground text-center">Miembros</p>
                </CardContent>
              </Card>

              {/* Activos */}
              <Card className="border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-none">{kpis.active}</p>
                  <p className="text-xs text-muted-foreground text-center">Activos</p>
                </CardContent>
              </Card>

              {/* Admins — clickeable → despliega panel de administradores */}
              <button
                type="button"
                onClick={() => setShowAdmins((prev) => !prev)}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                aria-expanded={showAdmins}
                aria-label="Ver administradores"
              >
                <Card className={[
                  "border shadow-sm hover:shadow-md transition-all cursor-pointer h-full",
                  showAdmins
                    ? "border-primary/60 bg-primary/5 dark:bg-primary/10"
                    : "border-primary/20 hover:border-primary/50",
                ].join(" ")}>
                  <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold text-primary leading-none">{kpis.admins}</p>
                    <p className="text-xs text-muted-foreground text-center">Admins</p>
                  </CardContent>
                </Card>
              </button>

              {/* Cuentas ocultas — clickeable → scroll a Bajas */}
              <button
                type="button"
                onClick={scrollToBajas}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                aria-label="Ver cuentas ocultas"
              >
                <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer h-full">
                  <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                    <EyeOff className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <p className="text-2xl font-bold text-slate-600 dark:text-slate-300 leading-none">{kpis.hidden}</p>
                    <p className="text-xs text-muted-foreground text-center">Ocultos</p>
                  </CardContent>
                </Card>
              </button>

              {/* Bajas definitivas — clickeable → scroll a Bajas */}
              <button
                type="button"
                onClick={scrollToBajas}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                aria-label="Ver bajas definitivas"
              >
                <Card className="border border-destructive/20 shadow-sm hover:shadow-md hover:border-destructive/50 transition-all cursor-pointer h-full">
                  <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                    <UserX className="h-4 w-4 text-destructive/70" />
                    <p className="text-2xl font-bold text-destructive leading-none">{kpis.deleted}</p>
                    <p className="text-xs text-muted-foreground text-center">Eliminados</p>
                  </CardContent>
                </Card>
              </button>

            </div>

            {/* ── Panel desplegable: lista de administradores ── */}
            <Collapsible open={showAdmins}>
              <CollapsibleContent>
                <div className="rounded-xl border border-primary/20 bg-stone-50 dark:bg-stone-900 px-4 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-3 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Administradores activos
                  </p>
                  {adminUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Sin administradores registrados.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {adminUsers.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center gap-3 rounded-lg bg-background border border-border/60 px-3 py-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0 text-xs font-bold select-none">
                            {admin.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate leading-tight">
                              {admin.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 2 — Contraseña de Invitación Master (en medio)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border/60 pt-2" />
        <InvitationPasswordAdmin adminId={session.id} />

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 3 — Lista de Usuarios Registrados (abajo)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border/60 pt-2" />

        {/* Cabecera de la sección */}
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-bold text-foreground text-base">Usuarios Registrados</h2>
        </div>

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
          <>
            {/* ── Lista colapsable — solo la página actual ── */}
            <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
              {paginated.map((user) => {
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

                        {/* Status badge — solo en sm+ */}
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

            {/* ── Barra de paginación ── */}
            <div className="flex items-center justify-between px-1 pb-2">
              {/* Conteo contextual */}
              <p className="text-xs text-muted-foreground tabular-nums">
                {query
                  ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} · `
                  : ""}
                Página {currentPage} de {totalPages}
              </p>

              {/* Controles */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Página siguiente"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 4 — Bajas / Ocultos (registro de auditoría)
        ══════════════════════════════════════════════════════════════════ */}
        <div id="seccion-bajas" className="border-t border-border/60 pt-2 scroll-mt-20" />

        <div className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-bold text-foreground text-base">Bajas / Ocultos</h2>
          {!loadingDepartures && !departuresError && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {departures.length} registro{departures.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loadingDepartures ? (
          <div className="flex justify-center items-center gap-2 py-10 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando registros…
          </div>
        ) : departuresError ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {departuresError}
          </div>
        ) : departures.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Sin registros de bajas o cuentas ocultas.
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
            {departures.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                <div className={[
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                  entry.action === "hidden"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    : "bg-destructive/10 text-destructive",
                ].join(" ")}>
                  {entry.action === "hidden"
                    ? <EyeOff className="h-4 w-4" />
                    : <UserX className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {entry.userName}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={[
                    "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
                    entry.action === "hidden"
                      ? "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                      : "bg-destructive/10 text-destructive border-destructive/30",
                  ].join(" ")}>
                    {entry.action === "hidden" ? "Oculto" : "Eliminado"}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(entry.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
