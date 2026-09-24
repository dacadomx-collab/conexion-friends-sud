import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  MessageCircle,
  Filter,
  MessagesSquare,
  HeartHandshake,
  Dumbbell,
  BookOpenCheck,
  Flower2,
  Crown,
  CalendarX2,
  ShieldCheck,
  Lightbulb,
  CheckCircle2,
  ArrowDown,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Subgrupos de WhatsApp FRIENDS — Conexion FRIENDS",
  description:
    "Conoce los nuevos Subgrupos de WhatsApp de FRIENDS: espacios más pequeños para profundizar en comunidad, con propósito y sin saturar el chat general.",
}

type Accent = "turquoise" | "emerald" | "gold" | "rose"

const ACCENT_STYLES: Record<Accent, { icon: string; badge: string; border: string }> = {
  turquoise: {
    icon: "bg-turquoise/15 text-turquoise",
    badge: "bg-turquoise/10 text-turquoise border-turquoise/20",
    border: "hover:border-turquoise/40",
  },
  emerald: {
    icon: "bg-emerald/15 text-emerald",
    badge: "bg-emerald/10 text-emerald border-emerald/20",
    border: "hover:border-emerald/40",
  },
  gold: {
    icon: "bg-gold/20 text-gold",
    badge: "bg-gold/10 text-gold border-gold/30",
    border: "hover:border-gold/40",
  },
  rose: {
    icon: "bg-rose-500/15 text-rose-500",
    badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    border: "hover:border-rose-500/40",
  },
}

interface Subgroup {
  icon: ReactNode
  name: string
  tag: string
  objective: string
  ambiente: string[]
  accent: Accent
}

const SUBGROUPS: Subgroup[] = [
  {
    icon: <HeartHandshake className="h-6 w-6" />,
    name: "Conexiones-Ligues 💌",
    tag: "Hermanos y Hermanas",
    objective:
      "Un espacio digno y respetuoso para que solteros y solteras se conozcan mejor, con la mira puesta en un posible noviazgo serio, guiados siempre por los principios del evangelio.",
    ambiente: ["Respeto absoluto", "Buenas intenciones", "Cero presión, solo autenticidad"],
    accent: "turquoise",
  },
  {
    icon: <Dumbbell className="h-6 w-6" />,
    name: "Aventura y Recreación ⚽",
    tag: "Deporte y Vida Activa",
    objective:
      "Para los que aman moverse: partidos, salidas y retos deportivos que cuidan el cuerpo —templo del Espíritu— mientras fortalecemos el compañerismo entre todos.",
    ambiente: ["Energía y buen humor", "Sano compañerismo", "Todos los niveles son bienvenidos"],
    accent: "emerald",
  },
  {
    icon: <BookOpenCheck className="h-6 w-6" />,
    name: "Estudio y Templo 📖",
    tag: "Ven, Sígueme",
    objective:
      "Un espacio para profundizar juntos en las Escrituras y el manual Ven, Sígueme —usando solo fuentes oficiales de la Iglesia— y coordinar sesiones al templo con espíritu de preparación.",
    ambiente: ["Reverencia y enfoque doctrinal", "Fuentes 100% oficiales", "Espíritu de preparación al templo"],
    accent: "gold",
  },
  {
    icon: <Flower2 className="h-6 w-6" />,
    name: "Entre Nosotras 🌸",
    tag: "Exclusivo Hermanas",
    objective:
      "Un rincón exclusivo para las hermanas, donde crear lazos de apoyo, hermandad y confianza, hablando con libertad de lo que viven como mujeres SUD solteras.",
    ambiente: ["Confianza y confidencialidad", "Apoyo mutuo genuino", "Espacio seguro y edificante"],
    accent: "rose",
  },
]

interface Rule {
  icon: ReactNode
  title: string
  description: string
  highlight?: boolean
}

const RULES: Rule[] = [
  {
    icon: <Crown className="h-5 w-5" />,
    title: "Liderazgo Temporal",
    description:
      "Cada subgrupo tendrá un líder temporal encargado de dar la bienvenida a los nuevos miembros, mantener viva la participación, aportar ideas creativas y cuidar que el grupo nunca pierda su objetivo original.",
  },
  {
    icon: <CalendarX2 className="h-5 w-5" />,
    title: "La Regla de Oro del Calendario",
    description:
      "🚫 Las actividades de los subgrupos NUNCA pueden empalmarse con la Agenda General de FRIENDS. La comunidad completa siempre va primero.",
    highlight: true,
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Etiqueta Digital SUD",
    description:
      "Aquí tratamos a cada persona como lo que es: un hijo o hija de Dios. Eso significa respeto absoluto, cero chismes, cero contenido inapropiado y siempre edificar, nunca derribar.",
  },
]

export default function SubgruposPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Cabecera ──
          Página pública informativa: visible para miembros y no miembros por
          igual (se comparte también fuera del sistema, en WhatsApp), por eso
          no lleva ningún botón que dependa de tener sesión iniciada. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center">
          <ConexionLogo size={36} />
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-white">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-turquoise/40 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-gold/30 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald/20 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 sm:py-28 text-center flex flex-col items-center gap-6">
            <Badge className="bg-white/15 text-white border-white/20 px-3 py-1">
              📲 Nuevos Subgrupos de WhatsApp
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
              Subgrupos de WhatsApp FRIENDS: Espacios Más Pequeños, Amistades Más Profundas
            </h1>

            <p className="text-lg text-white/90 leading-relaxed max-w-2xl">
              El grupo general de FRIENDS en WhatsApp es nuestro hogar, pero sabemos que
              cuando somos muchos es difícil profundizar en lo que de verdad nos apasiona.
              Por eso nacen los Subgrupos de WhatsApp: espacios dentro de nuestra misma
              familia, pensados para platicar, servir y crecer junto a quienes comparten tus
              mismos intereses —sin saturar el chat general y sin perder nunca el enfoque de
              por qué estamos aquí.
            </p>

            <p className="text-sm sm:text-base text-white/80 italic">
              ✝️ Porque nuestros corazones están entretejidos con unidad y amor.{" "}
              <span className="not-italic font-semibold">— Mosíah 18:21</span>
            </p>

            <Button asChild size="lg" className="mt-4 bg-white text-primary hover:bg-white/90">
              <Link href="#subgrupos">
                Descubre los Subgrupos
                <ArrowDown className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Por qué Subgrupos ── */}
        <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Filter className="h-5 w-5" />,
              title: "Conversaciones con Enfoque",
              text: "Cada subgrupo tiene un propósito claro, así que las conversaciones no se pierden ni se saturan con temas que no te interesan.",
            },
            {
              icon: <MessagesSquare className="h-5 w-5" />,
              title: "Participación Real",
              text: "Grupos más pequeños significan más espacio para que tu voz, tus ideas y tu testimonio se escuchen.",
            },
            {
              icon: <HeartHandshake className="h-5 w-5" />,
              title: "Hermandad Más Cercana",
              text: "Compartir un interés en común es una manera hermosa de fortalecer lazos y edificarnos mutuamente en la fe.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center gap-3 px-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                {item.icon}
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </section>

        {/* ── Tarjetas de Subgrupos ── */}
        <section id="subgrupos" className="scroll-mt-20 bg-secondary/30 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Elige el Espacio Que Va Contigo 🙌
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estos son los grupos de WhatsApp que abriremos próximamente. Puedes ser
                parte de los que quieras —solo recuerda que cada uno tiene su propio
                propósito y ambiente esperado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {SUBGROUPS.map((group) => {
                const styles = ACCENT_STYLES[group.accent]
                return (
                  <Card
                    key={group.name}
                    className={`flex flex-col transition-colors ${styles.border}`}
                  >
                    <CardHeader>
                      <span
                        className={`flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${styles.icon}`}
                      >
                        {group.icon}
                      </span>
                      <CardTitle className="text-lg leading-snug">{group.name}</CardTitle>
                      <Badge variant="outline" className={`w-fit mt-1 ${styles.badge}`}>
                        {group.tag}
                      </Badge>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {group.objective}
                      </p>
                      <ul className="space-y-2">
                        {group.ambiente.map((rasgo) => (
                          <li key={rasgo} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald" />
                            <span className="text-foreground/80">{rasgo}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Badge variant="outline" className="w-fit gap-1.5 text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Grupo de WhatsApp — próximamente
                      </Badge>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Reglas, Normas y Liderazgo ── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Para Que Esto Funcione: Nuestro Compromiso
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Los Subgrupos de WhatsApp son una extensión de FRIENDS, así que se rigen por
              el mismo espíritu de orden y amor de toda la comunidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RULES.map((rule) => (
              <div
                key={rule.title}
                className={`rounded-xl border p-6 ${
                  rule.highlight
                    ? "border-gold/40 bg-gold/10"
                    : "border-border bg-card"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-lg mb-4 ${
                    rule.highlight ? "bg-gold/20 text-gold" : "bg-primary/10 text-primary"
                  }`}
                >
                  {rule.icon}
                </span>
                <h3 className="font-semibold text-foreground mb-2">{rule.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Propón tu Subgrupo ── */}
        <section className="bg-primary/5 py-16">
          <div className="max-w-2xl mx-auto px-4 text-center flex flex-col items-center gap-5">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gold/20 text-gold">
              <Lightbulb className="h-7 w-7" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              ¿Tienes un Tema Especial en Mente? 💡
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              ¡Estás en el lugar correcto! Si sientes que falta un espacio para profundizar
              en algo que te apasiona —un pasatiempo, un talento o un tema de interés— puedes
              proponerlo.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed bg-card border border-border rounded-xl px-5 py-4">
              Recuerda: el éxito de un subgrupo no depende de la plataforma, depende de
              ustedes. Un subgrupo florece cuando sus propios miembros toman la iniciativa
              de liderar, invitar y mantener viva la conversación.
            </p>
            <p className="text-sm font-medium text-primary">
              💬 Comparte tu idea con el liderazgo o coméntala en el chat general de FRIENDS.
            </p>
          </div>
        </section>
      </main>

      {/* ── Pie de página ── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <ConexionLogo size={28} />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/codigo-de-conducta" className="hover:text-primary transition-colors">
              Código de Conducta
            </Link>
            <Link href="/terminos" className="hover:text-primary transition-colors">
              Términos de Uso
            </Link>
            <Link href="/privacidad" className="hover:text-primary transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
