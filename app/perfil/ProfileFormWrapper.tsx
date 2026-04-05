"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { ProfileForm } from "@/components/ProfileForm"

// -----------------------------------------------------------------------------
// ProfileFormWrapper — Client Component
// Extrae userId de ?userId=123 y lo pasa a <ProfileForm>.
// Separado de page.tsx para que el Server Component pueda hacer export default
// mientras este accede a useSearchParams dentro de <Suspense>.
// -----------------------------------------------------------------------------
export function ProfileFormWrapper() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const rawId  = searchParams.get("userId")
  const userId = rawId ? parseInt(rawId, 10) : NaN

  // Guardia: si no hay userId válido en la URL, muestra error en lugar de
  // pasar NaN al formulario (blindaje Mandamiento 2).
  if (!userId || isNaN(userId) || userId <= 0) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive text-center">
        No se encontró un usuario válido en la URL.{" "}
        <button
          onClick={() => router.push("/")}
          className="underline underline-offset-4 hover:text-destructive/80 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <ProfileForm
      userId={userId}
      onSuccess={() => {
        // Aquí se puede redirigir al muro o al perfil público en el futuro.
        // Por ahora el mensaje de éxito del propio ProfileForm es suficiente.
      }}
    />
  )
}
