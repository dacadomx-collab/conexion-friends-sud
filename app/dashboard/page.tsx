import type { Metadata } from "next"
import { DashboardClient } from "@/components/DashboardClient"

export const metadata: Metadata = {
  title: "Cuartel General — Conexion FRIENDS",
  description: "Tu sala principal en Conexion FRIENDS. Accede a tu perfil, el directorio, actividades y mensajes.",
}

// -----------------------------------------------------------------------------
// Página del Dashboard — Server Component (shell)
// La lógica de sesión y el saludo dinámico viven en DashboardClient,
// que lee localStorage en el navegador (Client Component).
// -----------------------------------------------------------------------------
export default function DashboardPage() {
  return <DashboardClient />
}
