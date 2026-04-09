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
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge }    from "@/components/ui/badge"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

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

interface UserDraft {
  role:          string
  status:        string
  groupJoinDate: string
  saving:        boolean
  error:         string | null
  saved:         boolean
}

// ---------------------------------------------------------------------------
// Helpers
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

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
  inactive: "bg-secondary text-muted-foreground border-border",
  blocked:  "bg-destructive/10 text-destructive border-destructive/30",
}

// ---------------------------------------------------------------------------
export function AdminClient() {
  const router = useRouter()

  // ── Sesión ─────────────────────────────────────────────────────────────────
  const [session,    setSession]    = useState<SessionData | null>(null)
  const [authReady,  setAuthReady]  = useState(false)

  // ── Montaje diferido (blinda SSR contra inyecciones de extensiones) ─────────
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

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    setLoadingList(true)
    fetch(`${API_BASE_URL}/api/get_users_admin.php?requesterId=${session.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") {
          setUsers(json.data ?? [])
        } else {
          setLoadError(json.message ?? "Error al cargar usuarios.")
        }
      })
      .catch(() => setLoadError("Error de red al cargar usuarios."))
      .finally(() => setLoadingList(false))
  }, [session])

  // ── Drafts (edición en memoria por usuario) ────────────────────────────────
  const [drafts, setDrafts] = useState<Record<number, UserDraft>>({})

  useEffect(() => {
    const initial: Record<number, UserDraft> = {}
    users.forEach((u) => {
      initial[u.id] = {
        role:          u.role,
        status:        u.status,
        groupJoinDate: u.groupJoinDate,
        saving:        false,
        error:         null,
        saved:         false,
      }
    })
    setDrafts(initial)
  }, [users])

  function updateDraft(userId: number, patch: Partial<UserDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }))
  }

  // ── Buscador ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  // ── Guardar cambios de un usuario ──────────────────────────────────────────
  async function handleSave(targetUserId: number) {
    if (!session) return
    const draft = drafts[targetUserId]
    if (!draft) return

    updateDraft(targetUserId, { saving: true, error: null, saved: false })
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

      // Reflejar cambios en la lista base
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, role: draft.role, status: draft.status, groupJoinDate: draft.groupJoinDate }
            : u,
        ),
      )
      updateDraft(targetUserId, { saving: false, saved: true })
      setTimeout(() => updateDraft(targetUserId, { saved: false }), 3000)
    } catch (err) {
      updateDraft(targetUserId, {
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

        {/* ── Estado de carga / error global ── */}
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
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
              {query ? ` coinciden con "${query}"` : " en total"}
            </p>

            {filtered.map((user) => {
              const draft = drafts[user.id]
              if (!draft) return null

              const isDirty =
                draft.role          !== user.role          ||
                draft.status        !== user.status        ||
                draft.groupJoinDate !== user.groupJoinDate

              return (
                <Card key={user.id} className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                          {user.fullName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 border ${STATUS_COLORS[user.status] ?? STATUS_COLORS.inactive}`}
                      >
                        {STATUS_LABELS[user.status] ?? user.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">

                    {/* ── Rol ── */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Rol</label>
                      <select
                        value={draft.role}
                        onChange={(e) => updateDraft(user.id, { role: e.target.value, error: null, saved: false })}
                        disabled={draft.saving || (session.id === user.id)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {Object.entries(ROLE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      {session.id === user.id && (
                        <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>
                      )}
                    </div>

                    {/* ── Estatus ── */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Estatus</label>
                      <select
                        value={draft.status}
                        onChange={(e) => updateDraft(user.id, { status: e.target.value, error: null, saved: false })}
                        disabled={draft.saving}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* ── Fecha de ingreso al grupo ── */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fecha de ingreso al grupo</label>
                      <Input
                        type="date"
                        value={draft.groupJoinDate}
                        onChange={(e) => updateDraft(user.id, { groupJoinDate: e.target.value, error: null, saved: false })}
                        disabled={draft.saving}
                      />
                    </div>

                    {/* ── Feedback ── */}
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

                    {/* ── Botón guardar ── */}
                    <Button
                      size="sm"
                      className="w-full font-semibold"
                      disabled={draft.saving || !isDirty}
                      onClick={() => handleSave(user.id)}
                    >
                      {draft.saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando…
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isDirty ? "Guardar Cambios" : "Sin cambios"}
                        </>
                      )}
                    </Button>

                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
