import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import { ConexionLogo } from "@/components/conexion-logo"
import { ProfileNavActions } from "@/components/ProfileNavActions"

export const metadata: Metadata = {
  title: "Mensajes — Conexion FRIENDS",
  description: "Bandeja de mensajes y comunicados oficiales de la comunidad.",
}

// -----------------------------------------------------------------------------
// Página de Mensajes — Server Component (shell estático)
// -----------------------------------------------------------------------------
export default function MensajesPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" aria-label="Volver al inicio">
            <ConexionLogo size={36} />
          </Link>
          <ProfileNavActions />
        </div>
      </header>

      {/* ── Contenido centrado ── */}
      <main className="max-w-lg mx-auto px-4 flex flex-col items-center justify-center py-24 text-center gap-6">

        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 text-primary">
          <Mail className="h-12 w-12" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">
            Bandeja de Mensajes
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Próximamente recibirás aquí los comunicados oficiales, avisos
            de actividades y novedades de los administradores de la comunidad.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-6 py-4 text-sm text-muted-foreground w-full">
          <span className="font-semibold text-primary">En construcción.</span>{" "}
          Estamos trabajando para ti. ¡Vuelve pronto!
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors underline underline-offset-4"
        >
          ← Volver al Cuartel General
        </Link>

      </main>
    </div>
  )
}
