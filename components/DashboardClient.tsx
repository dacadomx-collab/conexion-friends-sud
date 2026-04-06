"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  UserCircle,
  BookOpen,
  Tent,
  MessageSquare,
  LogOut,
  ChevronRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Clave de sesión — debe coincidir con LoginForm.tsx y auth-form.tsx
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

interface SessionData {
  id:       number
  fullName: string
  email:    string
}

// ---------------------------------------------------------------------------
// Tipos de las tarjetas de navegación
// ---------------------------------------------------------------------------
interface DashCard {
  icon:        React.ReactNode
  iconBg:      string
  title:       string
  description: string
  href:        string
  badge?:      string
  disabled?:   boolean
}

// ---------------------------------------------------------------------------
// Definición de las 4 tarjetas
// ---------------------------------------------------------------------------
const CARDS: DashCard[] = [
  {
    icon:        <UserCircle className="h-7 w-7" />,
    iconBg:      "bg-primary/10 text-primary",
    title:       "Tu Perfil",
    description: "Edita tu información, fotos y redes sociales.",
    href:        "/perfil",   // se añade ?userId= dinámicamente en el render
  },
  {
    icon:        <BookOpen className="h-7 w-7" />,
    iconBg:      "bg-turquoise/10 text-turquoise",
    title:       "El BOOK",
    description: "Explora el directorio de Adultos Solteros SUD y conecta con la hermandad.",
    href:        "/directorio",
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
  },
]

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function DashboardClient() {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [greeting, setGreeting] = useState("¡Bienvenido al Cuartel General!")

  // Leer sesión de localStorage (client-side only)
  useEffect(() => {
    const raw = localStorage.getItem(CFS_SESSION_KEY)
    if (!raw) {
      // Sin sesión → volver al inicio
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

        {/* ── Grid de tarjetas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((card) => {
            // Para el perfil, añadir el userId como query param
            const href =
              card.title === "Tu Perfil" && session
                ? `/perfil?userId=${session.id}`
                : card.href

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
                  {/* Icono */}
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${card.iconBg}`}
                  >
                    {card.icon}
                  </div>

                  {/* Texto */}
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

                  {/* Flecha — solo si no está deshabilitada */}
                  {!card.disabled && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  )}
                </CardContent>
              </Card>
            )

            return card.disabled ? (
              <div key={card.title}>{inner}</div>
            ) : (
              <Link key={card.title} href={href} className="block">
                {inner}
              </Link>
            )
          })}
        </div>

      </main>
    </div>
  )
}
