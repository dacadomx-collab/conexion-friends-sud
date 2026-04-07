import type { Metadata } from "next"
import Link from "next/link"
import { ConexionLogo } from "@/components/conexion-logo"
import { ProfileNavActions } from "@/components/ProfileNavActions"
import { DirectoryClient } from "@/components/DirectoryClient"

export const metadata: Metadata = {
  title: "El BOOK — Conexion FRIENDS",
  description: "Directorio de Adultos Solteros SUD. Conoce a los miembros de la comunidad.",
}

// -----------------------------------------------------------------------------
// Página de Directorio — Server Component
// Muestra el grid de miembros activos cargado por DirectoryClient.
// -----------------------------------------------------------------------------
export default function DirectorioPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" aria-label="Volver al inicio">
            <ConexionLogo size={36} />
          </Link>
          <ProfileNavActions />
        </div>
      </header>

      {/* ── Cuerpo ── */}
      <main className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-1">El BOOK</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Directorio de Adultos Solteros SUD. Conoce a tus hermanos y conecta con la comunidad.
          </p>
        </div>

        <DirectoryClient />

      </main>
    </div>
  )
}
