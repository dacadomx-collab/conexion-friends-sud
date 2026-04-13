import type { Metadata } from "next"
import { GatekeeperClient } from "@/components/GatekeeperClient"

export const metadata: Metadata = {
  title: "Acceso — Conexion FRIENDS SUD",
  description: "Ingresa la contraseña de invitación para acceder a la comunidad.",
}

// -----------------------------------------------------------------------------
// Ruta pública /acceso — Puerta de Entrada (Gatekeeper)
// Esta es la ÚNICA página pública del sistema.
// Requiere la Contraseña de Invitación Master para avanzar al registro/login.
// -----------------------------------------------------------------------------
export default function AccesoPage() {
  return <GatekeeperClient />
}
