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
  List,
  Clock,
  UserPlus,
  BookOpen,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"
import { InvitationPasswordAdmin } from "@/components/InvitationPasswordAdmin"

// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"
const PAGE_SIZE       = 10

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
  actedBy:   "self" | "admin"
  adminName: string | null
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

interface PendingUser {
  id:        number
  fullName:  string
  email:     string
  phone:     string
  createdAt: string
}

interface WelcomeEntry {
  id:           number
  userId:       number
  userName:     string
  userEmail:    string
  userPhone:    string
  adminId:      number
  adminName:    string
  authorizedAt: string
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
  pending:  "Pendiente",
}

const STATUS_DOT: Record<string, string> = {
  active:   "bg-emerald-500",
  inactive: "bg-muted-foreground",
  blocked:  "bg-destructive",
  pending:  "bg-amber-400",
}

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
  inactive: "bg-secondary text-muted-foreground border-border",
  blocked:  "bg-destructive/10 text-destructive border-destructive/30",
  pending:  "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
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

  // ── Pendientes de aprobación ──────────────────────────────────────────────
  const [pendingUsers,     setPendingUsers]     = useState<PendingUser[]>([])
  const [loadingPending,   setLoadingPending]   = useState(true)
  const [pendingError,     setPendingError]     = useState<string | null>(null)
  const [authorizingId,    setAuthorizingId]    = useState<number | null>(null)
  const [authorizeError,   setAuthorizeError]   = useState<string | null>(null)
  const [authorizeSuccess, setAuthorizeSuccess] = useState<string | null>(null)

  // ── Registro de Bienvenida ─────────────────────────────────────────────────
  const [welcomeRegistry,  setWelcomeRegistry]  = useState<WelcomeEntry[]>([])
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false)
  const [loadingWelcome,   setLoadingWelcome]   = useState(false)

  // ── Modal: todos los usuarios ─────────────────────────────────────────────
  const [allUsersOpen,  setAllUsersOpen]  = useState(false)
  // ── Modal: todas las bajas ────────────────────────────────────────────────
  const [allDepsOpen,   setAllDepsOpen]   = useState(false)
  // ── Admin delete ──────────────────────────────────────────────────────────
  const [deletingId,    setDeletingId]    = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    setLoadingPending(true)
    fetch(`${API_BASE_URL}/api/admin/get_pending_users.php?requesterId=${session.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setPendingUsers(json.data ?? [])
        else setPendingError(json.message ?? "Error al cargar pendientes.")
      })
      .catch(() => setPendingError("Error de red al cargar pendientes."))
      .finally(() => setLoadingPending(false))
  }, [session])

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

  async function handleAuthorize(targetUserId: number) {
    if (!session || authorizingId !== null) return
    setAuthorizeError(null)
    setAuthorizeSuccess(null)
    setAuthorizingId(targetUserId)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/admin/authorize_user.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requesterId: session.id, targetUserId }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      setAuthorizeSuccess(`${json.data?.userName ?? "Usuario"} autorizado correctamente.`)
      setPendingUsers((prev) => prev.filter((u) => u.id !== targetUserId))
      setUsers((prev) =>
        prev.map((u) => u.id === targetUserId ? { ...u, status: "active" } : u)
      )
    } catch (err) {
      setAuthorizeError(err instanceof Error ? err.message : "Error desconocido.")
    } finally {
      setAuthorizingId(null)
    }
  }

  async function handleAdminDelete(targetUserId: number) {
    if (!session || deletingId !== null) return
    setDeleteError(null)
    setDeletingId(targetUserId)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/admin/delete_user_admin.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requesterId: session.id, targetUserId }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      setUsers((prev) => prev.filter((u) => u.id !== targetUserId))
      setDeleteConfirm(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error desconocido.")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleOpenWelcome() {
    if (!session) return
    setWelcomeModalOpen(true)
    if (welcomeRegistry.length > 0) return
    setLoadingWelcome(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/admin/get_welcome_registry.php?requesterId=${session.id}`)
      const json = await res.json()
      if (json.status === "success") setWelcomeRegistry(json.data ?? [])
    } catch { /* error silencioso */ }
    finally { setLoadingWelcome(false) }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:   users.length,
    active:  users.filter((u) => u.status === "active").length,
    admins:  users.filter((u) => u.role === "admin").length,
    hidden:  users.filter((u) => u.status === "inactive").length,
    deleted: departures.filter((d) => d.action === "deleted").length,
    pending: pendingUsers.length,
  }), [users, departures, pendingUsers])

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
            BLOQUE 1 — KPI Cards
        ══════════════════════════════════════════════════════════════════ */}
        {!loadingList && !loadError && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

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

              {/* Admins */}
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

              {/* Cuentas ocultas */}
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

              {/* Bajas definitivas */}
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

              {/* Pendientes */}
              <button
                type="button"
                onClick={() => document.getElementById("seccion-pendientes")?.scrollIntoView({ behavior: "smooth" })}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                aria-label="Ver pendientes de aprobación"
              >
                <Card className={[
                  "border shadow-sm hover:shadow-md transition-all cursor-pointer h-full",
                  kpis.pending > 0
                    ? "border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600"
                    : "border-border/60 hover:border-border",
                ].join(" ")}>
                  <CardContent className="px-3 py-3 flex flex-col items-center gap-1">
                    <Clock className={`h-4 w-4 ${kpis.pending > 0 ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`} />
                    <p className={`text-2xl font-bold leading-none ${kpis.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {kpis.pending}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">Pendientes</p>
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
            BLOQUE 2 — Contraseña de Invitación Master
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border/60 pt-2" />
        <InvitationPasswordAdmin adminId={session.id} />

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 2b — Pendientes de Aprobación
        ══════════════════════════════════════════════════════════════════ */}
        <div id="seccion-pendientes" className="border-t border-border/60 pt-2 scroll-mt-20" />

        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
          <h2 className="font-bold text-foreground text-base">Pendientes de Aprobación</h2>
          {!loadingPending && (
            <span className={`ml-auto text-xs tabular-nums font-medium ${pendingUsers.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
              {pendingUsers.length} pendiente{pendingUsers.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={handleOpenWelcome}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none ml-2"
            title="Ver historial completo de aprobaciones"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Registro de Bienvenida
          </button>
        </div>

        {authorizeError && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {authorizeError}
          </div>
        )}
        {authorizeSuccess && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {authorizeSuccess}
          </div>
        )}

        {loadingPending ? (
          <div className="flex justify-center items-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando pendientes…
          </div>
        ) : pendingError ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendingError}
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-stone-50 dark:bg-stone-900 px-4 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Sin pendientes</p>
            <p className="text-xs text-muted-foreground mt-0.5">No hay nuevos miembros esperando aprobación.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm divide-y divide-border/60">
            <div className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_1fr_1fr_auto] bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 border-b border-amber-200 dark:border-amber-800">
              <span className="text-xs font-semibold text-muted-foreground">Nombre</span>
              <span className="text-xs font-semibold text-muted-foreground hidden sm:block">Correo</span>
              <span className="text-xs font-semibold text-muted-foreground">Registro</span>
              <span className="text-xs font-semibold text-muted-foreground text-right">Acción</span>
            </div>
            {pendingUsers.map((pUser) => {
              const isAuthorizing = authorizingId === pUser.id
              const [dd, mm, yyyy] = [
                new Date(pUser.createdAt).toLocaleDateString("es-MX", { day: "2-digit" }),
                new Date(pUser.createdAt).toLocaleDateString("es-MX", { month: "2-digit" }),
                new Date(pUser.createdAt).toLocaleDateString("es-MX", { year: "numeric" }),
              ]
              return (
                <div
                  key={pUser.id}
                  className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-3 py-3 bg-background hover:bg-secondary/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">{pUser.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate sm:hidden">{pUser.email}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{pUser.phone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{pUser.email}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{dd}-{mm}-{yyyy}</p>
                  <button
                    type="button"
                    onClick={() => handleAuthorize(pUser.id)}
                    disabled={isAuthorizing || authorizingId !== null}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isAuthorizing || authorizingId !== null
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow",
                    ].join(" ")}
                    aria-label={`Autorizar a ${pUser.fullName}`}
                  >
                    {isAuthorizing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {isAuthorizing ? "…" : "Autorizar"}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Registro de Bienvenida */}
        <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                Registro de Bienvenida — Historial de Aprobaciones
              </DialogTitle>
            </DialogHeader>
            {loadingWelcome ? (
              <div className="flex justify-center items-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando historial…
              </div>
            ) : welcomeRegistry.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                Sin aprobaciones registradas aún.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {welcomeRegistry.map((entry) => {
                  const date = new Date(entry.authorizedAt)
                  const formatted = `${String(date.getDate()).padStart(2,"0")}-${String(date.getMonth()+1).padStart(2,"0")}-${date.getFullYear()} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border/60 bg-secondary/10 px-3 py-2.5 flex items-start gap-3"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">
                          {entry.userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{entry.userEmail} · {entry.userPhone}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Autorizado por <span className="font-medium text-foreground">{entry.adminName}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 text-right">
                        {formatted}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 4 — Usuarios Registrados (últimos 5 + modal completo)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border/60 pt-2" />

        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-bold text-foreground text-base">Usuarios Registrados</h2>
          {!loadingList && !loadError && (
            <button
              type="button"
              onClick={() => setAllUsersOpen(true)}
              className="ml-auto flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none"
            >
              <List className="h-3.5 w-3.5" />
              Ver a todos los hermanos
            </button>
          )}
        </div>

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
        ) : users.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Sin usuarios registrados.</p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60">
            {users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[user.status] ?? "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">#{user.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`hidden sm:inline-flex text-xs shrink-0 border ${STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive}`}
                >
                  {STATUS_LABELS[user.status] ?? user.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Gestión completa de hermanos */}
        <Dialog
          open={allUsersOpen}
          onOpenChange={(open) => {
            setAllUsersOpen(open)
            if (!open) { setDeleteConfirm(null); setDeleteError(null) }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Gestión de Hermanos
              </DialogTitle>
            </DialogHeader>

            {deleteError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive mt-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nombre o correo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                No se encontraron usuarios{query ? ` para "${query}"` : ""}.
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60 mt-3">
                  {paginated.map((user) => {
                    const draft = drafts[user.id]
                    if (!draft) return null

                    const isOpen  = openId === user.id
                    const isDirty =
                      draft.role          !== user.role          ||
                      draft.status        !== user.status        ||
                      draft.groupJoinDate !== user.groupJoinDate
                    const isConfirmingDelete = deleteConfirm === user.id

                    return (
                      <Collapsible
                        key={user.id}
                        open={isOpen}
                        onOpenChange={(open) => setOpenId(open ? user.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-background hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            aria-label={`Editar ${user.fullName}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[user.status] ?? "bg-muted-foreground"}`}
                              aria-hidden="true"
                            />
                            <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
                              #{user.id}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate leading-tight">
                                {user.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`hidden sm:inline-flex text-xs shrink-0 border ${STATUS_BADGE[user.status] ?? STATUS_BADGE.inactive}`}
                            >
                              {STATUS_LABELS[user.status] ?? user.status}
                            </Badge>
                            {isDirty && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-label="Cambios sin guardar" />
                            )}
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-3 bg-secondary/20 border-t border-border/40 space-y-3">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                            {draft.error && (
                              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{draft.error}
                              </div>
                            )}
                            {draft.saved && (
                              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                Cambios guardados correctamente.
                              </div>
                            )}

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

                            {/* Zona de eliminación — solo para cuentas distintas a la propia */}
                            {session.id !== user.id && (
                              isConfirmingDelete ? (
                                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 space-y-2">
                                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    ¿Eliminar cuenta de {user.fullName}?
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Esta acción es permanente e irreversible. Se eliminarán todos sus datos y fotos.
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1 text-xs h-8"
                                      disabled={deletingId === user.id}
                                      onClick={() => handleAdminDelete(user.id)}
                                    >
                                      {deletingId === user.id ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Eliminando…</>
                                      ) : (
                                        <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Confirmar eliminación</>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-xs h-8"
                                      disabled={deletingId === user.id}
                                      onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(user.id)}
                                  className="w-full flex items-center justify-center gap-1.5 text-xs text-destructive/70 hover:text-destructive border border-destructive/20 hover:border-destructive/50 rounded-md py-1.5 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Eliminar cuenta permanentemente
                                </button>
                              )
                            )}

                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between px-1 pb-2 mt-3">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {query
                      ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} · `
                      : ""}
                    Página {currentPage} de {totalPages}
                  </p>
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
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 5 — Bajas / Ocultos (últimos 5 + modal completo)
        ══════════════════════════════════════════════════════════════════ */}
        <div id="seccion-bajas" className="border-t border-border/60 pt-2 scroll-mt-20" />

        <div className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-bold text-foreground text-base">Bajas / Ocultos</h2>
          {!loadingDepartures && !departuresError && departures.length > 0 && (
            <>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {departures.length} registro{departures.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setAllDepsOpen(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none ml-2"
              >
                <List className="h-3.5 w-3.5" />
                Ver todos
              </button>
            </>
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
            {departures.slice(0, 5).map((entry) => (
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
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {entry.actedBy === "admin"
                      ? `Por: Admin ${entry.adminName ?? ""}`
                      : "Por: el mismo usuario"}
                  </p>
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

        {/* Modal: Historial completo de bajas */}
        <Dialog open={allDepsOpen} onOpenChange={setAllDepsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <EyeOff className="h-4 w-4 text-primary" />
                Historial Completo — Bajas y Ocultos
              </DialogTitle>
            </DialogHeader>
            {departures.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Sin registros.</p>
            ) : (
              <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm divide-y divide-border/60 mt-3">
                {departures.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-secondary/20 transition-colors">
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {entry.actedBy === "admin"
                          ? `Por: Admin ${entry.adminName ?? ""}`
                          : "Por: el mismo usuario"}
                      </p>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground truncate">{entry.reason}</p>
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
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
