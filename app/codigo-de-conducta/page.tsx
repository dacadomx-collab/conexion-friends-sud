import type { Metadata } from "next"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ArrowLeft, Shield, Heart, Users, AlertTriangle, Star, BookHeart } from "lucide-react"

export const metadata: Metadata = {
  title: "Código de Conducta — Conexión FRIENDS",
  description:
    "La Etiqueta Digital SUD de Conexión FRIENDS. Reglas de respeto, propósito y hermandad basadas en los principios del Evangelio.",
}

// ---------------------------------------------------------------------------
// Sección reutilizable
// ---------------------------------------------------------------------------
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
          {icon}
        </span>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="pl-12 space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Ítem de regla
// ---------------------------------------------------------------------------
function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/50" />
      <span>{children}</span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function CodigoDeConductaPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <ConexionLogo />
        </div>
      </header>

      {/* ── Cuerpo ── */}
      <main className="max-w-prose mx-auto px-4 py-10">

        {/* Título */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-primary mb-3">
            Código de Conducta
          </h1>
          <p className="text-muted-foreground italic">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros."
          </p>
          <p className="text-sm text-muted-foreground mt-1">— Mosíah 18:21</p>
        </div>

        {/* Intro */}
        <p className="mb-10 text-base leading-relaxed text-foreground">
          Conexión FRIENDS es un directorio de hermandad para miembros del grupo de
          La Iglesia de Jesucristo de los Santos de los Últimos Días. No somos una
          app de citas secular. Somos una comunidad que se trata como familia del
          convenio. Las siguientes reglas no son opcionales: son el corazón de lo
          que somos.
        </p>

        {/* Sección 1 — Propósito */}
        <Section icon={<Heart className="h-4 w-4" />} title="Propósito de la Plataforma">
          <ul className="space-y-2">
            <Rule>
              Conexión FRIENDS existe para edificar la fe, fortalecer amistades y
              conectar a la gran familia SUD. Nuestro mayor deseo es crear un entorno
              seguro donde puedan nacer conexiones significativas que, con el tiempo
              y bajo los principios del Evangelio, puedan florecer hacia la meta
              eterna del matrimonio en el Templo.
            </Rule>
            <Rule>
              Toda interacción debe poder describirse así: "Lo trataría igual en
              presencia del Salvador."
            </Rule>
            <Rule>
              Las conexiones que aquí nazcan deben apuntar hacia actividades que
              fortalezcan a la familia y la Iglesia.
            </Rule>
          </ul>
        </Section>

        {/* Sección 2 — Valores Fundamentales */}
        <Section icon={<Star className="h-4 w-4" />} title="Valores Fundamentales">
          <ul className="space-y-2">
            <Rule>
              <strong className="text-foreground">Amor cristiano:</strong> Tratar a
              cada miembro como un hijo o hija de Dios, con genuino interés en su
              bienestar espiritual y emocional.
            </Rule>
            <Rule>
              <strong className="text-foreground">Respeto y dignidad:</strong> Cada
              persona merece ser tratada con consideración, independientemente de
              su historial, apariencia o circunstancias.
            </Rule>
            <Rule>
              <strong className="text-foreground">Honestidad:</strong> Presentarse
              con autenticidad, sin exageraciones ni engaños sobre la propia
              identidad, intenciones o estado de vida.
            </Rule>
            <Rule>
              <strong className="text-foreground">Responsabilidad espiritual:</strong>{" "}
              Ser consciente del impacto que nuestras palabras y acciones tienen en
              la fe y el corazón de los demás.
            </Rule>
            <Rule>
              <strong className="text-foreground">Pureza de intención:</strong>{" "}
              Participar en la plataforma con el deseo genuino de edificar, no de
              explotar la vulnerabilidad emocional de nadie.
            </Rule>
          </ul>
        </Section>

        {/* Sección 3 — Relaciones y Cortejo */}
        <Section icon={<BookHeart className="h-4 w-4" />} title="Relaciones y Cortejo">
          <ul className="space-y-2">
            <Rule>
              Toda interacción debe ser respetuosa, paciente y basada en los
              principios del Evangelio. El cortejo cristiano exige tiempo, oración
              y confirmación del Espíritu.
            </Rule>
            <Rule>
              El rechazo debe ser aceptado con madurez y respeto. No insistir,
              no presionar y no tomar represalias cuando alguien decide no
              continuar una conversación o relación.
            </Rule>
            <Rule>
              Evita generar expectativas falsas o jugar con los sentimientos de
              otros. Ser claro y honesto sobre tus intenciones es un acto de
              amor cristiano.
            </Rule>
          </ul>
        </Section>

        {/* Sección 4 — Etiqueta Digital */}
        <Section icon={<Users className="h-4 w-4" />} title="Etiqueta Digital SUD">
          <ul className="space-y-2">
            <Rule>
              Usa tu nombre real y una foto que te represente fielmente. Las
              identidades falsas serán eliminadas sin previo aviso.
            </Rule>
            <Rule>
              Escribe con respeto. Sin lenguaje ofensivo, groserías, sarcasmo
              hiriente ni comentarios que degraden la dignidad de nadie.
            </Rule>
            <Rule>
              Las fotos de perfil deben reflejar los estándares de modestia de
              La Iglesia: sin imágenes provocativas, inapropiadas o que generen
              mal ambiente.
            </Rule>
            <Rule>
              No publiques información personal de terceros sin su consentimiento
              (número de teléfono, dirección, fotos ajenas).
            </Rule>
            <Rule>
              Los mensajes privados son una responsabilidad: úsalos para edificar,
              coordinar actividades o servir — no para acosar o presionar.
            </Rule>
          </ul>
        </Section>

        {/* Sección 5 — Cero Tolerancia */}
        <Section icon={<Shield className="h-4 w-4" />} title="Cero Tolerancia">
          <ul className="space-y-2">
            <Rule>
              <strong className="text-foreground">Acoso:</strong> Cualquier forma
              de hostigamiento, persecución o presión hacia otro miembro resultará
              en suspensión inmediata de la cuenta.
            </Rule>
            <Rule>
              <strong className="text-foreground">Intenciones contrarias a las normas de La Iglesia:</strong>{" "}
              Si tu objetivo en la plataforma contradice los principios del
              Evangelio de Jesucristo, este no es tu lugar.
            </Rule>
            <Rule>
              <strong className="text-foreground">Contenido inapropiado:</strong>{" "}
              Imágenes, textos o enlaces con contenido sexual, violento u ofensivo
              son causa de eliminación permanente.
            </Rule>
            <Rule>
              <strong className="text-foreground">Suplantación de identidad:</strong>{" "}
              Hacerse pasar por otra persona — miembro o líder — es una falta grave.
            </Rule>
          </ul>
        </Section>

        {/* Sección 6 — Reportes y Consecuencias */}
        <Section icon={<AlertTriangle className="h-4 w-4" />} title="Reportes y Consecuencias">
          <p>
            Si ves una conducta que viola estas reglas, repórtala a los
            administradores. Las denuncias son confidenciales. Los administradores
            son la autoridad final en materia de acceso a la plataforma.
          </p>

          <div className="mt-4 rounded-xl border border-border/60 bg-secondary/40 overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Escala disciplinaria
            </p>
            <ul className="divide-y divide-border/40">
              {[
                { level: "Primera falta",  action: "Advertencia formal por parte de un administrador." },
                { level: "Segunda falta",  action: "Suspensión temporal de la cuenta." },
                { level: "Tercera falta",  action: "Expulsión permanente de la plataforma." },
              ].map(({ level, action }) => (
                <li key={level} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="font-semibold text-foreground shrink-0 w-32">{level}:</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3">
            Recuerda: el acceso a Conexión FRIENDS es un privilegio, no un derecho.
            Cada cuenta es validada por un administrador.
          </p>
        </Section>

        {/* Cierre espiritual */}
        <div className="mt-4 mb-10 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 text-center">
          <p className="text-base leading-relaxed text-foreground font-medium italic">
            "Más que una comunidad, somos una familia del convenio.
            Cuidemos este espacio como cuidaríamos el corazón de alguien más."
          </p>
        </div>

        {/* Footer legal */}
        <footer className="mt-4 pt-6 border-t border-border text-sm text-muted-foreground text-center space-y-2">
          <p>
            Al crear una cuenta, confirmas que has leído y aceptas este Código de Conducta.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/terminos" className="hover:text-primary transition-colors">
              Términos de Uso
            </Link>
            <Link href="/privacidad" className="hover:text-primary transition-colors">
              Privacidad
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
