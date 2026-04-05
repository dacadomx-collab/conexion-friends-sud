import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ProfileFormWrapper } from "./ProfileFormWrapper"

export const metadata: Metadata = {
  title: "Completa tu perfil — Conexion FRIENDS",
  description: "Enchula tu perfil para conectar con otros Jóvenes Adultos SUD.",
}

// -----------------------------------------------------------------------------
// Página de perfil — Server Component
// Captura el userId desde los Search Params y delega la interactividad
// al Client Component ProfileFormWrapper (necesario por useSearchParams).
// -----------------------------------------------------------------------------
export default function PerfilPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" aria-label="Volver al inicio">
            <ConexionLogo size={36} />
          </Link>
        </div>
      </header>

      {/* ── Cuerpo ── */}
      <main className="max-w-lg mx-auto px-4 py-10">

        {/* Bienvenida */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">
            ¡Ya eres parte de la familia!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Completa tu perfil para que otros Jóvenes Adultos SUD puedan conocerte
            y conectar contigo. Tu información es privada y solo visible
            para miembros aprobados.
          </p>
          <p className="text-sm text-muted-foreground italic mt-3">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros." — Mosíah 18:21
          </p>
        </div>

        {/* Formulario — necesita useSearchParams → Client Component envuelto en Suspense */}
        <Suspense fallback={
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            Cargando formulario…
          </div>
        }>
          <ProfileFormWrapper />
        </Suspense>

      </main>
    </div>
  )
}
