import type { Metadata } from "next"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ArrowLeft, Shield, Heart, Users, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "Código de Conducta — Conexion FRIENDS",
  description:
    "La Etiqueta Digital SUD de Conexion FRIENDS. Reglas de respeto, propósito y hermandad basadas en los principios del Evangelio.",
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
          Conexion FRIENDS es un directorio de hermandad para miembros del grupo de WhatsApp de Iglesia de Jesucristo de los Santos de los Últimos Días. No somos una app de
          citas secular. Somos una comunidad que se trata como familia del convenio.
          Las siguientes reglas no son opcionales: son el corazón de lo que somos.
        </p>

        {/* Sección 1 */}
        <Section icon={<Heart className="h-4 w-4" />} title="Propósito de la Plataforma">
          <ul className="space-y-2">
          <Rule>
            Conexión FRIENDS existe para edificar la fe, fortalecer amistades y conectar a la gran familia SUD. Nuestro mayor deseo es crear un entorno seguro donde puedan nacer conexiones significativas que, con el tiempo y bajo los principios del Evangelio, puedan florecer hacia la meta eterna del matrimonio en el Templo.
          </Rule> 
           <Rule>
              Toda interacción debe poder describirse así: "Lo trataría igual en precensia
              de el Salvador."
            </Rule>
            <Rule>
              Las conexiones que aquí nazcan deben apuntar hacia actividades que
              fortalezcan a la familia y la Iglesia.
            </Rule>
          </ul>
        </Section>

        {/* Sección 2 */}
        <Section icon={<Users className="h-4 w-4" />} title="Etiqueta Digital SUD">
          <ul className="space-y-2">
            <Rule>
              Usa tu nombre real y una foto que te represente fielmente. Las identidades
              falsas serán eliminadas sin previo aviso.
            </Rule>
            <Rule>
              Escribe con respeto. Sin lenguaje ofensivo, groserías, sarcasmo hiriente
              ni comentarios que degraden la dignidad de nadie.
            </Rule>
            <Rule>
              Las fotos de perfil deben reflejar los estándares de modestia de la Iglesia:
              sin imágenes provocativas, inapropiadas o que generen mal ambiente.
            </Rule>
            <Rule>
              No publiques información personal de terceros sin su consentimiento (número
              de teléfono, dirección, fotos ajenas).
            </Rule>
            <Rule>
              Los mensajes privados son una responsabilidad: úsalos para edificar,
              coordinar actividades o servir — no para acosar o presionar.
            </Rule>
          </ul>
        </Section>

        {/* Sección 3 */}
        <Section icon={<Shield className="h-4 w-4" />} title="Cero Tolerancia">
          <ul className="space-y-2">
            <Rule>
              <strong className="text-foreground">Acoso:</strong> Cualquier forma de
              hostigamiento, persecución o presión hacia otro miembro resultará en
              suspensión inmediata de la cuenta.
            </Rule>
            <Rule>
              <strong className="text-foreground">Intenciones contrarias a las normas de la Iglesia:</strong>{" "}
              Si tu objetivo en la plataforma contradice los principios del Evangelio de
              Jesucristo, este no es tu lugar.
            </Rule>
            <Rule>
              <strong className="text-foreground">Contenido inapropiado:</strong> Imágenes,
              textos o enlaces con contenido sexual, violento u ofensivo son causa de
              eliminación permanente.
            </Rule>
            <Rule>
              <strong className="text-foreground">Suplantación de identidad:</strong>{" "}
              Hacerse pasar por otra persona — miembro o líder — es una falta grave.
            </Rule>
          </ul>
        </Section>

        {/* Sección 4 */}
        <Section icon={<AlertTriangle className="h-4 w-4" />} title="Reportes y Consecuencias">
          <p>
            Si ves una conducta que viola estas reglas, repórtala a los administradores.
            Las denuncias son confidenciales. Los administradores son la autoridad final
            en materia de acceso a la plataforma y pueden suspender o eliminar cuentas
            sin necesidad de dar explicaciones públicas.
          </p>
          <p className="mt-3">
            Recuerda: el acceso a Conexion FRIENDS es un privilegio, no un derecho.
            Cada cuenta es validada por un administrador.
          </p>
        </Section>

        {/* Footer legal */}
        <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground text-center space-y-2">
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
