import type { Metadata } from "next"
import { PendienteClient } from "@/components/PendienteClient"

export const metadata: Metadata = {
  title: "Cuenta en revisión — Conexion FRIENDS",
  description: "Tu cuenta está siendo revisada por el equipo de administración.",
}

export default function PendientePage() {
  return <PendienteClient />
}
