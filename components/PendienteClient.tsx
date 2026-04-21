"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, UserCircle, Images, LogOut, CheckCircle2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const CFS_SESSION_KEY = "cfs_session"

interface SessionData {
  id:       number
  fullName: string
  email:    string
  role?:    string
  status?:  string
}

export function PendienteClient() {
  const router = useRouter()
  const [session,   setSession]   = useState<SessionData | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (!isMounted) return
    const raw = localStorage.getItem(CFS_SESSION_KEY)
    if (!raw) { router.replace("/"); return }
    try {
      const data: SessionData = JSON.parse(raw)
      // Si ya fue aprobado (status='active'), mandarlo al dashboard
      if (data.status === "active") { router.replace("/dashboard"); return }
      setSession(data)
    } catch {
      router.replace("/")
    }
  }, [isMounted, router])

  function handleLogout() {
    localStorage.removeItem(CFS_SESSION_KEY)
    router.replace("/")
  }

  if (!isMounted || !session) return null

  const firstName = session.fullName.split(" ")[0]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">

      <div className="w-full max-w-md space-y-6">

        {/* Icono central animado */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700">
            <Clock className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            ¡Hola, {firstName}!
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
            Tu cuenta está <strong className="text-amber-600 dark:text-amber-400">pendiente de aprobación</strong>.
            Un administrador la revisará pronto.
          </p>
        </div>

        {/* Tarjeta de estado */}
        <Card className="border border-amber-200 dark:border-amber-800 shadow-sm bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="px-4 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80">
              Estado de tu registro
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-foreground">Datos personales registrados</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-foreground">Código de conducta aceptado</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-full border-2 border-amber-400 dark:border-amber-500 shrink-0 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                </div>
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Pendiente de aprobación por Admin
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pasos opcionales de onboarding */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium px-1">
            Mientras esperas, puedes completar tu perfil:
          </p>

          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 hover:bg-secondary/40 transition-colors group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Completar mi perfil</p>
              <p className="text-xs text-muted-foreground">Barrio, estaca, biografía y más</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <Link
            href="/perfil/media"
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 hover:bg-secondary/40 transition-colors group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <Images className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Subir mis fotos</p>
              <p className="text-xs text-muted-foreground">Mínimo 2 fotos para el directorio</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>

        {/* Nota informativa */}
        <p className="text-xs text-center text-muted-foreground px-2 leading-relaxed">
          Recibirás acceso completo al directorio y funciones de la app
          una vez que un administrador apruebe tu cuenta.
        </p>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>

      </div>
    </div>
  )
}
