"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
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
} from "lucide-react"

// ---------------------------------------------------------------------------
// Clave de sesión — debe coincidir con LoginForm.tsx y auth-form.tsx
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

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
      badge:       isAdmin ? undefined : "Próximamente",
      comingSoon:  !isAdmin,
      disabled:    !isAdmin,
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

  // ── Leer sesión de localStorage (client-side only) ────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(CFS_SESSION_KEY)
    if (!raw) {
      router.replace("/")
      return
    }
    try {
      const data: SessionData = JSON.parse(raw)
      setSession(data)

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

  function handleLogout() {
    localStorage.removeItem(CFS_SESSION_KEY)
    router.push("/")
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
                  href={`/perfil?userId=${scripture.userId}`}
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
    </div>
  )
}
