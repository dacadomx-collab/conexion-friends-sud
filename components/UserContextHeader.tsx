"use client"

import { useEffect, useState } from "react"
import { UserCircle } from "lucide-react"

const CFS_SESSION_KEY = "cfs_session"

interface Session {
  fullName: string
  email:    string
}

// ---------------------------------------------------------------------------
// UserContextHeader — Muestra el nombre y correo del usuario activo.
// Se renderiza en la parte superior de los formularios de perfil para que
// el usuario sepa siempre en qué cuenta está trabajando.
// ---------------------------------------------------------------------------
export function UserContextHeader() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFS_SESSION_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data?.fullName && data?.email) {
          setSession({ fullName: data.fullName, email: data.email })
        }
      }
    } catch { /* sin sesión — no renderiza nada */ }
  }, [])

  if (!session) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-4 py-2.5 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
        <UserCircle className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {session.fullName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {session.email}
        </p>
      </div>
    </div>
  )
}
