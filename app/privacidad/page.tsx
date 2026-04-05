import type { Metadata } from "next"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ArrowLeft, Lock, Database, EyeOff, Key } from "lucide-react"

export const metadata: Metadata = {
  title: "Política de Privacidad — Conexion FRIENDS",
  description:
    "Tu información es sagrada. Conoce cómo Conexion FRIENDS protege tus datos personales.",
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

export default function PrivacidadPage() {
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
            Política de Privacidad
          </h1>
          <p className="text-muted-foreground italic">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros."
          </p>
          <p className="text-sm text-muted-foreground mt-1">— Mosíah 18:21</p>
        </div>

        {/* Intro — La Regla de Oro */}
        <div className="mb-10 rounded-xl border border-primary/20 bg-primary/5 px-6 py-5">
          <p className="text-base leading-relaxed text-foreground font-medium text-center">
            Tu información es privada. No la vendemos. No la compartimos.
            No existe ningún algoritmo de publicidad. Punto.
          </p>
        </div>

        {/* Sección 1 */}
        <Section icon={<Database className="h-4 w-4" />} title="Qué Datos Recopilamos">
          <ul className="space-y-2">
            <Rule>
              <strong className="text-foreground">Datos de registro:</strong> Nombre
              completo, correo electrónico, número de teléfono y fecha de nacimiento.
              Estos datos los proporcionas tú al crear tu cuenta.
            </Rule>
            <Rule>
              <strong className="text-foreground">Datos de perfil:</strong> Barrio
              (ward), estaca (stake), biografía personal y preferencia de contacto por
              WhatsApp. Estos son opcionales y los controlas tú.
            </Rule>
            <Rule>
              <strong className="text-foreground">Fotos de perfil:</strong> Las imágenes
              que subas voluntariamente para tu presentación en la comunidad.
            </Rule>
          </ul>
          <p className="mt-3">
            No recopilamos datos de ubicación en tiempo real, no instalamos cookies de
            rastreo y no integramos redes publicitarias de ningún tipo.
          </p>
        </Section>

        {/* Sección 2 */}
        <Section icon={<Lock className="h-4 w-4" />} title="Cómo Protegemos tu Información">
          <ul className="space-y-2">
            <Rule>
              La base de datos es privada y de acceso exclusivo para los administradores
              del sistema. Ningún tercero tiene acceso.
            </Rule>
            <Rule>
              Tu contraseña nunca se almacena en texto legible. Se guarda como un hash
              cifrado de forma segura. Ni los administradores pueden leerla.
            </Rule>
            <Rule>
              Toda la comunicación entre tu dispositivo y nuestros servidores viaja
              cifrada mediante HTTPS.
            </Rule>
          </ul>
        </Section>

        {/* Sección 3 — Regla Técnica de Inmutabilidad */}
        <Section icon={<Key className="h-4 w-4" />} title="Datos Que No Puedes Cambiar">
          <p>
            Por seguridad de identidad, dos campos son{" "}
            <strong className="text-foreground">inmutables</strong> una vez que te
            registras:
          </p>
          <ul className="mt-3 space-y-2">
            <Rule>
              <strong className="text-foreground">Nombre completo:</strong> Es la
              identidad que usaste al registrarte. No se puede modificar para prevenir
              suplantaciones y garantizar la integridad del directorio.
            </Rule>
            <Rule>
              <strong className="text-foreground">Fecha de nacimiento:</strong> Se usa
              como dato de verificación de identidad. No puede alterarse tras el
              registro.
            </Rule>
          </ul>
          <p className="mt-3">
            Si hay un error genuino en alguno de estos datos, contacta directamente a
            un administrador con evidencia.
          </p>
        </Section>

        {/* Sección 4 */}
        <Section icon={<EyeOff className="h-4 w-4" />} title="Visibilidad de tu Perfil">
          <ul className="space-y-2">
            <Rule>
              Tu perfil solo es visible para otros miembros registrados y aprobados
              de la plataforma.
            </Rule>
            <Rule>
              Puedes controlar si tu número de WhatsApp aparece visible para otros
              usuarios desde la configuración de tu perfil.
            </Rule>
            <Rule>
              En ningún caso tu información personal aparece indexada en buscadores
              públicos como Google.
            </Rule>
          </ul>
        </Section>

        {/* Footer legal */}
        <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground text-center space-y-2">
          <p>Última revisión: abril 2025.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/codigo-de-conducta" className="hover:text-primary transition-colors">
              Código de Conducta
            </Link>
            <Link href="/terminos" className="hover:text-primary transition-colors">
              Términos de Uso
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
