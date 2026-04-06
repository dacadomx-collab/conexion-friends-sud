import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ScriptureForm } from "@/components/ScriptureForm"
import { ProfileNavActions } from "@/components/ProfileNavActions"

export const metadata: Metadata = {
  title: "Inspiración — Conexion FRIENDS",
  description: "Comparte una escritura con la comunidad y conviértete en la Escritura del Día.",
}

// -----------------------------------------------------------------------------
// Página de Inspiración Diaria — Server Component
// Permite a los miembros enviar escrituras a la cola de "Escritura del Día".
// Muestra la fila de espera con la fecha exacta de publicación.
// -----------------------------------------------------------------------------
export default function InspiracionPage() {
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
            Escritura del Día
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Comparte un versículo que haya iluminado tu camino. Cada día,
            una escritura diferente aparecerá en el dashboard de toda la comunidad.
          </p>
          <p className="text-sm text-muted-foreground italic mt-3">
            "…el que guarda los mandamientos de Dios tiene la necesidad de
            tener esperanza." — Moroni 7:41
          </p>
        </div>

        {/* Formulario — Client Component; Suspense para useEffect seguro */}
        <Suspense fallback={
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            Cargando…
          </div>
        }>
          <ScriptureForm />
        </Suspense>

      </main>
    </div>
  )
}
