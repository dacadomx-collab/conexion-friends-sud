"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutDashboard, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const CFS_SESSION_KEY = "cfs_session"

// ---------------------------------------------------------------------------
// ProfileNavActions — Client Component
// Botones de navegación global en las páginas de perfil (/perfil y /perfil/media).
// Se renderiza dentro del <header> del Server Component de la página.
// ---------------------------------------------------------------------------
export function ProfileNavActions() {
  const router = useRouter()

  function handleLogout() {
    localStorage.removeItem(CFS_SESSION_KEY)
    router.push("/")
  }

  return (
    <div className="flex items-center gap-1 ml-auto">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        <Link href="/dashboard">
          <LayoutDashboard className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </div>
  )
}
