"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { DashboardHighlights } from "@/components/DashboardHighlights"
import { Card, CardContent } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  UserCircle,
  BookOpen,
  Tent,
  MessageSquare,
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  EyeOff,
  Eye,
  Trash2,
  X,
  AlertTriangle,
  Lock,
  Cake,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Clave de sesión — debe coincidir con LoginForm.tsx y auth-form.tsx
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

const MONTH_NAMES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
]

interface BirthdayMember {
  userId:    number
  fullName:  string
  birthDate: string
  birthDay:  number
  ward:      string
  stake:     string
  photoUrl:  string | null
}

interface SessionData {
  id:       number
  fullName: string
  email:    string
  role?:    string
  status?:  string
}

interface ScriptureData {
  id:            number
  userId:        number
  fullName:      string
  scriptureText: string
  reference:     string
  scheduledDate: string
}

// ---------------------------------------------------------------------------
// Tipos de las tarjetas de navegación (todas excepto "Tu Perfil")
// ---------------------------------------------------------------------------
interface DashCard {
  icon:        React.ReactNode
  iconBg:      string
  title:       string
  description: string
  href:        string
  badge?:      string
  disabled?:   boolean
  comingSoon?: boolean   // muestra alert en lugar de navegar
}

function buildCards(isAdmin: boolean): DashCard[] {
  return [
    {
      icon:        <BookOpen className="h-7 w-7" />,
      iconBg:      "bg-turquoise/10 text-turquoise",
      title:       "El BOOK",
      description: "Explora el directorio de Adultos Solteros SUD y conecta con la hermandad.",
      href:        "/directorio",
      badge:       "¡Nuevo!",
    },
    {
      icon:        <Tent className="h-7 w-7" />,
      iconBg:      "bg-gold/10 text-gold",
      title:       "Actividades del grupo",
      description: "Noches de hogar, servicio comunitario, devocionales y deportes.",
      href:        "#",
      badge:       "¡En construcción!",
      disabled:    true,
    },
    {
      icon:        <MessageSquare className="h-7 w-7" />,
      iconBg:      "bg-emerald/10 text-emerald",
      title:       "Mensajes",
      description: "Avisos y comunicados oficiales de los administradores.",
      href:        "/mensajes",
      badge:       isAdmin ? undefined : "Próximamente",
      comingSoon:  !isAdmin,
      disabled:    !isAdmin,
    },
  ]
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function DashboardClient() {
  const router = useRouter()
  const [session,   setSession]   = useState<SessionData | null>(null)
  const [greeting,  setGreeting]  = useState("¡Bienvenido al Cuartel General!")
  const [scripture, setScripture] = useState<ScriptureData | null | "loading">("loading")

  const isAdmin = session?.role === "admin"
  const CARDS   = buildCards(isAdmin)

  const [accountStatus,  setAccountStatus]  = useState<string>("active")
  const [showHideModal,   setShowHideModal]   = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [privacyLoading,  setPrivacyLoading]  = useState(false)
  const [privacyError,    setPrivacyError]    = useState<string | null>(null)
  const deleteInFlightRef = useRef(false)

  const [birthdays,        setBirthdays]        = useState<BirthdayMember[]>([])
  const [birthdayLoading,  setBirthdayLoading]  = useState(true)
  const [showAllBirthdays, setShowAllBirthdays] = useState(false)

  // ── Leer sesión de localStorage (client-side only) ────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(CFS_SESSION_KEY)
    if (!raw) {
      router.replace("/")
      return
    }
    try {
      const data: SessionData = JSON.parse(raw)
      // Usuarios pendientes no pueden acceder al dashboard completo
      if (data.status === "pending") { router.replace("/pendiente"); return }
      setSession(data)
      setAccountStatus(data.status ?? "active")

      const firstName = data.fullName.split(" ")[0]
      const hour = new Date().getHours()
      const saludo =
        hour < 12 ? "¡Buenos días" :
        hour < 19 ? "¡Buenas tardes" :
                    "¡Buenas noches"
      setGreeting(`${saludo}, ${firstName}!`)
    } catch {
      router.replace("/")
    }
  }, [router])

  // ── Cargar escritura del día ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/get_today_scripture.php`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setScripture(json.data ?? null)
        else setScripture(null)
      })
      .catch(() => setScripture(null))
  }, [])

  // ── Cargar cumpleañeros del mes ───────────────────────────────────────────
  useEffect(() => {
    setBirthdayLoading(true)
    fetch(`${API_BASE_URL}/api/get_birthdays.php`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setBirthdays(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setBirthdayLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem(CFS_SESSION_KEY)
    router.push("/")
  }

  async function handleToggleVisibility() {
    if (!session) return
    setPrivacyLoading(true)
    setPrivacyError(null)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/account/toggle_visibility.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: session.id }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      const newStatus = json.newStatus as string
      setAccountStatus(newStatus)
      const updated = { ...session, status: newStatus }
      localStorage.setItem(CFS_SESSION_KEY, JSON.stringify(updated))
      setSession(updated)
      setShowHideModal(false)
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Error desconocido.")
    } finally {
      setPrivacyLoading(false)
    }
  }

  async function handleDeleteAccount() {
    // Guardia síncrona: bloquea re-clics antes de que React re-renderice con disabled
    if (!session || deleteInFlightRef.current) return
    deleteInFlightRef.current = true
    setPrivacyLoading(true)
    setPrivacyError(null)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/account/delete_account.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: session.id }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      localStorage.removeItem(CFS_SESSION_KEY)
      router.push("/")
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Error desconocido.")
    } finally {
      deleteInFlightRef.current = false
      setPrivacyLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <ConexionLogo size={36} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Banner de bienvenida ── */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-white px-6 py-8 shadow-lg">
          <p className="text-sm font-medium text-white/70 mb-1 uppercase tracking-widest">
            Cuartel General
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {greeting}
          </h1>
          {session && (
            <p className="mt-1 text-white/70 text-sm">
              {session.email}
            </p>
          )}
          <p className="mt-4 text-white/80 text-sm leading-relaxed max-w-md">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros." — Mosíah 18:21
          </p>
        </div>

        {/* ── Interacciones recibidas (Highlights) ── */}
        <DashboardHighlights userId={session?.id ?? null} />

        {/* ── Escritura del Día ── */}
        <div className="mb-6">
          {scripture === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Cargando escritura del día…
            </div>
          ) : scripture ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-6 py-5 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/70 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Escritura del Día
              </p>
              <blockquote className="text-foreground leading-relaxed italic text-base border-l-2 border-primary/40 pl-4">
                "{scripture.scriptureText}"
              </blockquote>
              <p className="mt-3 text-sm font-semibold text-primary">
                — {scripture.reference}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Compartida por{" "}
                <Link
                  href={`/directorio?userId=${scripture.userId}`}
                  className="text-primary hover:underline underline-offset-4 font-medium"
                >
                  {scripture.fullName}
                </Link>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-5 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Escritura del Día
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hoy no hay escritura todavía. ¡Sé el primero en compartir una!
              </p>
            </div>
          )}

          {/* Botón compartir escritura */}
          <div className="mt-3 flex justify-center">
            <Link
              href="/inspiracion"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              📖 Compartir una Escritura
            </Link>
          </div>
        </div>

        {/* ── Cumpleañeros del Mes ── */}
        {!birthdayLoading && birthdays.length > 0 && (
          <div className="mb-6">
            <div className="rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-3">
                <Cake className="h-3.5 w-3.5" />
                Celebrando la Vida — {MONTH_NAMES[new Date().getMonth()]}
              </p>
              <div className="space-y-1.5">
                {birthdays.slice(0, 5).map((b) => {
                  const isToday = b.birthDay === new Date().getDate()
                  return (
                    <Link
                      key={b.userId}
                      href={`/directorio?userId=${b.userId}`}
                      className="flex items-center gap-3 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 -mx-1 px-2 py-2 transition-colors"
                    >
                      {b.photoUrl ? (
                        <img
                          src={b.photoUrl}
                          alt={b.fullName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-amber-400/60"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full shrink-0 bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 text-sm font-bold ring-2 ring-amber-400/50">
                          {b.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                          {b.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isToday
                            ? "🎉 ¡Hoy es su cumpleaños!"
                            : `${b.birthDay} de ${MONTH_NAMES[new Date().getMonth()]}`}
                        </p>
                      </div>
                      {isToday && <span className="shrink-0 text-xl">🎂</span>}
                    </Link>
                  )
                })}
              </div>
              {birthdays.length > 5 && (
                <button
                  onClick={() => setShowAllBirthdays(true)}
                  className="mt-3 w-full text-xs font-semibold text-amber-700/70 dark:text-amber-400/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors text-center py-1 rounded-lg hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
                >
                  +{birthdays.length - 5} hermanos más cumplen años este mes — Ver todos →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Tarjeta especial: Tu Perfil (con dos botones internos) ── */}
        <Card className="border border-border/60 shadow-sm mb-4">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-primary/10 text-primary">
              <UserCircle className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground leading-tight mb-0.5">
                Tu Perfil
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Edita tu información, fotos y redes sociales.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={session ? `/perfil?userId=${session.id}` : "/perfil"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition-colors"
                >
                  📝 Editar Datos
                </Link>
                <Link
                  href={session ? `/perfil/media?userId=${session.id}` : "/perfil/media"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-semibold px-3 py-1.5 hover:bg-secondary/80 transition-colors"
                >
                  📸 Fotos y Redes
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tarjeta: Privacidad de Cuenta ── */}
        <Card className="border border-border/60 shadow-sm mb-4">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Lock className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground leading-tight mb-0.5">
                Privacidad de Cuenta
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Controla tu visibilidad en El Book o elimina tu cuenta permanentemente.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setPrivacyError(null); setShowHideModal(true) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-semibold px-3 py-1.5 hover:bg-secondary/80 transition-colors"
                >
                  {accountStatus === "active" ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Ocultar mi cuenta</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Reactivar mi cuenta en El Book</>
                  )}
                </button>
                <button
                  onClick={() => { setPrivacyError(null); setShowDeleteModal(true) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 text-destructive bg-destructive/5 text-xs font-semibold px-3 py-1.5 hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar mi cuenta
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tarjeta: Panel de Administración (solo admins) ── */}
        {isAdmin && (
          <Link href="/admin" className="block">
            <Card className="group relative border-2 border-primary/40 shadow-md hover:shadow-lg hover:border-primary/70 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-primary/15 text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-foreground leading-tight">
                      Panel de Administración
                    </h2>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border border-primary/30 font-semibold"
                    >
                      Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Gestiona usuarios, roles, estatus y fechas de ingreso al grupo.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* ── Grid de tarjetas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((card) => {
            const inner = (
              <Card
                className={[
                  "group relative border border-border/60 shadow-sm transition-all duration-200",
                  card.disabled
                    ? "opacity-80 cursor-default"
                    : "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer",
                ].join(" ")}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-base font-semibold text-foreground leading-tight">
                        {card.title}
                      </h2>
                      {card.badge && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gold/15 text-amber-700 dark:text-amber-400 border border-gold/30 font-medium"
                        >
                          {card.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  {!card.disabled && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  )}
                </CardContent>
              </Card>
            )

            if (card.comingSoon) {
              return (
                <button
                  key={card.title}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => alert("¡Próximamente! Esta sección estará disponible pronto para todos los miembros.")}
                >
                  {inner}
                </button>
              )
            }

            return card.disabled ? (
              <div key={card.title}>{inner}</div>
            ) : (
              <Link key={card.title} href={card.href} className="block">
                {inner}
              </Link>
            )
          })}
        </div>

      </main>

      {/* ══ Modal: Ocultar / Reactivar cuenta ══ */}
      {showHideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {accountStatus === "active"
                  ? <EyeOff className="h-5 w-5 text-foreground" />
                  : <Eye className="h-5 w-5 text-emerald-600" />}
                <h3 className="font-bold text-foreground text-base">
                  {accountStatus === "active" ? "Ocultar mi cuenta" : "Reactivar mi cuenta"}
                </h3>
              </div>
              <button onClick={() => setShowHideModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {accountStatus === "active" ? (
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Tu perfil, fotos y redes <strong className="text-foreground">no aparecerán en El Book</strong>, pero podrás seguir compartiendo escrituras y usando la plataforma. Puedes reactivarla cuando quieras.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Tu perfil <strong className="text-foreground">volverá a aparecer en El Book</strong> y los demás miembros podrán encontrarte nuevamente.
              </p>
            )}
            {privacyError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive mb-4">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {privacyError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowHideModal(false)}
                disabled={privacyLoading}
                className="flex-1 rounded-lg border border-border bg-secondary text-foreground text-sm font-semibold py-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleVisibility}
                disabled={privacyLoading}
                className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {privacyLoading
                  ? "Procesando…"
                  : accountStatus === "active" ? "Sí, ocultar" : "Sí, reactivar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Eliminar cuenta ══ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-background border border-destructive/30 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-bold text-destructive text-base">Eliminar cuenta</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-destructive mb-1">⚠️ Esta acción no se puede deshacer</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se borrarán permanentemente <strong className="text-foreground">todas tus fotos, redes sociales, escrituras y datos</strong> del sistema.
              </p>
            </div>
            {privacyError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive mb-4">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {privacyError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={privacyLoading}
                className="flex-1 rounded-lg border border-border bg-secondary text-foreground text-sm font-semibold py-2 hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={privacyLoading}
                className="flex-1 rounded-lg bg-destructive text-white text-sm font-semibold py-2 hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {privacyLoading ? "Eliminando…" : "Eliminar para siempre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Todos los Cumpleañeros del Mes ══ */}
      {showAllBirthdays && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
          onClick={() => setShowAllBirthdays(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-background border border-border shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-foreground text-base">
                  Celebrando la Vida
                </h3>
                <span className="text-sm text-muted-foreground font-normal capitalize">
                  — {MONTH_NAMES[new Date().getMonth()]}
                </span>
              </div>
              <button
                onClick={() => setShowAllBirthdays(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista scrollable */}
            <div className="overflow-y-auto px-3 py-3 space-y-0.5 flex-1">
              {birthdays.map((b) => {
                const isToday = b.birthDay === new Date().getDate()
                return (
                  <Link
                    key={b.userId}
                    href={`/directorio?userId=${b.userId}`}
                    onClick={() => setShowAllBirthdays(false)}
                    className="flex items-center gap-3 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 px-2 py-2.5 transition-colors"
                  >
                    {b.photoUrl ? (
                      <img
                        src={b.photoUrl}
                        alt={b.fullName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-amber-400/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full shrink-0 bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 text-sm font-bold ring-2 ring-amber-400/40">
                        {b.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {b.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isToday
                          ? "🎉 ¡Hoy es su cumpleaños!"
                          : `${b.birthDay} de ${MONTH_NAMES[new Date().getMonth()]}`}
                      </p>
                    </div>
                    {isToday
                      ? <span className="shrink-0 text-xl">🎂</span>
                      : <span className="shrink-0 text-base">🎁</span>}
                  </Link>
                )
              })}
            </div>

            {/* Pie */}
            <div className="px-5 py-3 border-t border-border shrink-0 text-center">
              <p className="text-xs text-muted-foreground">
                {birthdays.length} {birthdays.length === 1 ? "cumpleaños" : "cumpleaños"} este mes
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
