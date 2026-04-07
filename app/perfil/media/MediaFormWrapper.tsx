"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { MediaForm } from "@/components/MediaForm"
import { ProfileTabs } from "@/components/ProfileTabs"
import { UserContextHeader } from "@/components/UserContextHeader"

// -----------------------------------------------------------------------------
// MediaFormWrapper — Client Component
// Extrae userId de ?userId=123 y lo pasa a <MediaForm>.
// Separado de page.tsx para que el Server Component pueda hacer export default
// mientras este accede a useSearchParams dentro de <Suspense>.
// -----------------------------------------------------------------------------
export function MediaFormWrapper() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const rawId  = searchParams.get("userId")
  const userId = rawId ? parseInt(rawId, 10) : NaN

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
    <>
      <UserContextHeader />
      <ProfileTabs userId={userId} />
      <MediaForm userId={userId} />
    </>
  )
}
