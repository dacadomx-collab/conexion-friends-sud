"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Images } from "lucide-react"

interface ProfileTabsProps {
  userId: number
}

// ---------------------------------------------------------------------------
// ProfileTabs — Navegación visual entre secciones del perfil.
// Se muestra en /perfil y /perfil/media para alternar sin hacer submit.
// ---------------------------------------------------------------------------
export function ProfileTabs({ userId }: ProfileTabsProps) {
  const pathname = usePathname()

  const tabs = [
    {
      label: "Datos Personales",
      href:  `/perfil?userId=${userId}`,
      icon:  <User className="h-4 w-4" />,
      // Activo cuando la ruta exacta es /perfil (no /perfil/media)
      active: pathname === "/perfil",
    },
    {
      label: "Fotos y Redes",
      href:  `/perfil/media?userId=${userId}`,
      icon:  <Images className="h-4 w-4" />,
      active: pathname === "/perfil/media",
    },
  ]

  return (
    <div className="flex gap-1 rounded-xl bg-secondary/50 border border-border p-1 mb-6">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={[
            "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab.active
              ? "bg-background text-primary shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60",
          ].join(" ")}
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
