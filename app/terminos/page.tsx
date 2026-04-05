import type { Metadata } from "next"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ArrowLeft, FileText, UserCheck, ShieldAlert, Settings } from "lucide-react"

export const metadata: Metadata = {
  title: "Términos de Uso — Conexion FRIENDS",
  description:
    "Condiciones de uso de Conexion FRIENDS. El acceso es un privilegio otorgado por los administradores.",
}

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

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary/50" />
      <span>{children}</span>
    </li>
  )
}

export default function TerminosPage() {
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
            Términos de Uso
          </h1>
          <p className="text-muted-foreground italic">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros."
          </p>
          <p className="text-sm text-muted-foreground mt-1">— Mosíah 18:21</p>
        </div>

        {/* Intro */}
        <p className="mb-10 text-base leading-relaxed text-foreground">
          Estos términos rigen el uso de Conexion FRIENDS. Al acceder a la plataforma,
          aceptas cumplirlos en su totalidad. Si no estás de acuerdo con alguno de
          estos términos, por favor no uses el servicio.
        </p>

        {/* Sección 1 */}
        <Section icon={<UserCheck className="h-4 w-4" />} title="Acceso y Elegibilidad">
          <ul className="space-y-2">
            <Rule>
              El acceso a Conexion FRIENDS es un <strong className="text-foreground">privilegio
              otorgado por los administradores</strong>, no un derecho automático.
              Cualquier cuenta puede ser suspendida o eliminada si viola los principios
              de esta comunidad.
            </Rule>
            <Rule>
              Para registrarte, debes ser miembro activo o amigo de La Iglesia de
              Jesucristo de los Santos de los Últimos Días, con identidad verificable.
            </Rule>
            <Rule>
              Las identidades deben ser reales. No se permiten cuentas anónimas, seudónimos
              o personas ficticias. Tu nombre completo y fecha de nacimiento son tu
              identidad en la plataforma y no pueden modificarse tras el registro.
            </Rule>
            <Rule>
              Debes tener al menos 16 años para registrarte. Menores de edad deben
              contar con autorización de sus padres o tutor.
            </Rule>
          </ul>
        </Section>

        {/* Sección 2 */}
        <Section icon={<FileText className="h-4 w-4" />} title="Uso del Servicio">
          <ul className="space-y-2">
            <Rule>
              Conexion FRIENDS es una plataforma de directorio y hermandad espiritual.
              Su uso para fines románticos de naturaleza secular, comerciales o ajenos
              a los principios del Evangelio queda expresamente prohibido.
            </Rule>
            <Rule>
              Eres responsable de toda la actividad que ocurra bajo tu cuenta. No
              compartas tus credenciales con nadie.
            </Rule>
            <Rule>
              El contenido que publiques (fotos, texto, mensajes) debe cumplir con el{" "}
              <Link href="/codigo-de-conducta" className="text-primary hover:underline">
                Código de Conducta
              </Link>
              {" "}en todo momento.
            </Rule>
            <Rule>
              Nos reservamos el derecho de modificar, suspender o discontinuar el
              servicio en cualquier momento sin previo aviso.
            </Rule>
          </ul>
        </Section>

        {/* Sección 3 */}
        <Section icon={<ShieldAlert className="h-4 w-4" />} title="Responsabilidades">
          <ul className="space-y-2">
            <Rule>
              La plataforma no garantiza la disponibilidad continua del servicio ni
              la veracidad del contenido publicado por los usuarios.
            </Rule>
            <Rule>
              Los administradores no se hacen responsables de las interacciones entre
              usuarios fuera de la plataforma.
            </Rule>
            <Rule>
              Conexion FRIENDS no está afiliada oficialmente a La Iglesia de Jesucristo
              de los Santos de los Últimos Días. Es una iniciativa independiente de
              miembros que desean servirse mutuamente.
            </Rule>
          </ul>
        </Section>

        {/* Sección 4 */}
        <Section icon={<Settings className="h-4 w-4" />} title="Cambios a estos Términos">
          <p>
            Podemos actualizar estos términos periódicamente. Cuando lo hagamos, te
            notificaremos dentro de la plataforma. Continuar usando el servicio después
            de la notificación implica aceptación de los nuevos términos.
          </p>
          <p className="mt-3">
            Última revisión: abril 2025.
          </p>
        </Section>

        {/* Footer legal */}
        <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground text-center space-y-2">
          <p>
            Al crear una cuenta, confirmas que has leído y aceptas estos Términos de Uso.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/codigo-de-conducta" className="hover:text-primary transition-colors">
              Código de Conducta
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
