import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { MediaFormWrapper } from "./MediaFormWrapper"
import { ProfileNavActions } from "@/components/ProfileNavActions"

export const metadata: Metadata = {
  title: "Fotos y Redes — Conexion FRIENDS",
  description: "Sube tus fotos y añade tus redes sociales para completar tu perfil en Conexion FRIENDS.",
}

// -----------------------------------------------------------------------------
// Página de fotos y redes sociales — Server Component
// Paso 3 del onboarding: después de completar el perfil base (/perfil),
// el usuario llega aquí para subir fotos y añadir redes sociales opcionales.
// -----------------------------------------------------------------------------
export default function MediaPage() {
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

      {/* ── Cuerpo ── */}
      <main className="max-w-lg mx-auto px-4 py-10">

        {/* Bienvenida */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">
            ¡Casi listo! Muéstrate al mundo.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Las fotos ayudan a los demás a conocerte antes de conectar contigo.
            Sube entre 2 y 5 fotos que te representen fielmente y con dignidad.
          </p>
          <p className="text-sm text-muted-foreground italic mt-3">
            "…que sus corazones estuviesen entretejidos con unidad y amor
            los unos para con los otros." — Mosíah 18:21
          </p>
        </div>

        {/* Formulario — necesita useSearchParams → Client Component envuelto en Suspense */}
        <Suspense fallback={
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            Cargando…
          </div>
        }>
          <MediaFormWrapper />
        </Suspense>

      </main>
    </div>
  )
}
