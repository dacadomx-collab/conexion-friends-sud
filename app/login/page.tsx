import type { Metadata } from "next"
import { LoginOnlyClient } from "@/components/LoginOnlyClient"

export const metadata: Metadata = {
  title: "Iniciar Sesión — Conexion FRIENDS SUD",
  description: "Accede a tu cuenta de Conexion FRIENDS SUD.",
}

// -----------------------------------------------------------------------------
// Ruta /login — Formulario de inicio de sesión exclusivo para miembros.
// NO incluye registro. Accesible desde /acceso → "¿Ya eres miembro?".
// -----------------------------------------------------------------------------
export default function LoginPage() {
  return <LoginOnlyClient />
}
