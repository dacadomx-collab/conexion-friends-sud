"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface InteractionsSummary {
  wovenMessages:  { total: number; previewNames: string[] }
  birthdayWishes: { total: number; previewNames: string[] }
  hasVirtues:     boolean
  hasAny:         boolean
}

interface DashboardHighlightsProps {
  userId: number | null
}

// ── Helper: construye el texto de autoría ─────────────────────────────────────
// "Ana" / "Ana y Juan" / "Ana, Juan y 3 más"
function formatNames(names: string[], total: number): string {
  const firstNames = names.map((n) => n.split(" ")[0])
  if (total <= 0)   return ""
  if (total === 1)  return firstNames[0] ?? "Alguien"
  if (total === 2)  return `${firstNames[0] ?? ""} y ${firstNames[1] ?? ""}`
  const rest = total - 2
  return `${(firstNames[0] ?? "")}, ${firstNames[1] ?? ""} y ${rest} más`
}

// ── Componente ─────────────────────────────────────────────────────────────────
export function DashboardHighlights({ userId }: DashboardHighlightsProps) {
  const [summary,  setSummary]  = useState<InteractionsSummary | null>(null)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`${API_BASE_URL}/api/dashboard/get_interactions_summary.php?userId=${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setSummary(json.data as InteractionsSummary)
      })
      .catch(() => { /* silencioso — no es crítico para el dashboard */ })
      .finally(() => setLoading(false))
  }, [userId])

  // Mientras carga o no hay sesión todavía: sin render (no mostrar skeleton aquí)
  if (!userId || loading) return null

  // ── Estado vacío: invitación suave ──────────────────────────────────────────
  if (!summary || !summary.hasAny) {
    return (
      <div className="mb-6">
        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/3 dark:bg-primary/5 px-5 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            ✨{" "}
            <Link href="/directorio" className="text-primary font-medium hover:underline underline-offset-4">
              Explora El BOOK
            </Link>{" "}
            y entretejer tu historia con la de otros hermanos.
          </p>
        </div>
      </div>
    )
  }

  const { wovenMessages, birthdayWishes, hasVirtues } = summary

  return (
    <div className="mb-6">

      {/* Etiqueta de sección */}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5 px-0.5">
        <span>✨</span> Lo que han dicho de ti
      </p>

      {/* Tarjeta — clic completo lleva al perfil propio */}
      <Link
        href={`/directorio?userId=${userId}`}
        className="group block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-violet-50/50 to-indigo-50/40 dark:from-primary/10 dark:via-violet-950/20 dark:to-indigo-950/20 px-5 py-4 shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        aria-label="Ver las interacciones en mi perfil"
      >
        <div className="space-y-3">

          {/* Testimonios Entretejidos */}
          {wovenMessages.total > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none shrink-0 mt-0.5">🌿</span>
              <p className="text-sm text-foreground leading-snug">
                <strong className="font-semibold">
                  {formatNames(wovenMessages.previewNames, wovenMessages.total)}
                </strong>{" "}
                {wovenMessages.total === 1 ? "ha entretejido su testimonio" : "han entretejido sus testimonios"}{" "}
                en tu perfil.
              </p>
            </div>
          )}

          {/* Virtudes reconocidas — NUNCA conteo, solo cualitativo */}
          {hasVirtues && (
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none shrink-0 mt-0.5">💫</span>
              <p className="text-sm text-foreground leading-snug">
                Varios hermanos han{" "}
                <strong className="font-semibold">reconocido virtudes</strong>{" "}
                en ti.
              </p>
            </div>
          )}

          {/* Firmas del Libro de Cumpleaños */}
          {birthdayWishes.total > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none shrink-0 mt-0.5">🎂</span>
              <p className="text-sm text-foreground leading-snug">
                <strong className="font-semibold">
                  {formatNames(birthdayWishes.previewNames, birthdayWishes.total)}
                </strong>{" "}
                {birthdayWishes.total === 1
                  ? "te dejó una firma en tu Libro de Cumpleaños."
                  : "te dejaron firmas en tu Libro de Cumpleaños."}
              </p>
            </div>
          )}

        </div>

        {/* Pie de tarjeta */}
        <div className="flex items-center justify-end mt-3.5 pt-3 border-t border-primary/10">
          <span className="text-xs font-medium text-primary/70 group-hover:text-primary flex items-center gap-1 transition-colors">
            Leer todo en mi perfil
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>

    </div>
  )
}
