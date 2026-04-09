import type { Metadata } from "next"
import { AdminClient } from "@/components/AdminClient"

export const metadata: Metadata = {
  title: "Panel de Administración — Conexion FRIENDS",
  description: "Gestión de usuarios y comunidad. Solo accesible para administradores.",
}

// -----------------------------------------------------------------------------
// Ruta protegida /admin — Server Component (shell)
// La verificación real de rol ocurre en AdminClient (client-side, localStorage).
// Si el usuario no tiene role='admin' → AdminClient lo redirige al dashboard.
// -----------------------------------------------------------------------------
export default function AdminPage() {
  return <AdminClient />
}
