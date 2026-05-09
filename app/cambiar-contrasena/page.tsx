import type { Metadata } from "next"
import { ChangePasswordClient } from "@/components/ChangePasswordClient"

export const metadata: Metadata = {
  title: "Crear nueva contraseña — Conexión FRIENDS SUD",
  description: "Por seguridad, debes establecer una contraseña personalizada antes de continuar.",
}

export default function CambiarContrasenaPage() {
  return <ChangePasswordClient />
}
