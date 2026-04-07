"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { UserCircle, Calendar, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Member {
  id:            number
  fullName:      string
  ward:          string
  stake:         string
  groupJoinDate: string | null
  photoUrl:      string | null
}

// ---------------------------------------------------------------------------
// Helper: año desde fecha ISO
// ---------------------------------------------------------------------------
function joinYear(isoDate: string): string {
  return isoDate.split("-")[0]
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function DirectoryClient() {
  const [members,   setMembers]   = useState<Member[]>([])
  const [filtered,  setFiltered]  = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [query,     setQuery]     = useState("")

  // ── Cargar directorio ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/get_directory.php")
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") {
          setMembers(json.data ?? [])
          setFiltered(json.data ?? [])
        } else {
          setError("No se pudo cargar el directorio.")
        }
      })
      .catch(() => setError("Error de conexión al cargar el directorio."))
      .finally(() => setIsLoading(false))
  }, [])

  // ── Filtro de búsqueda ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.toLowerCase().trim()
    if (!q) { setFiltered(members); return }
    setFiltered(
      members.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.ward.toLowerCase().includes(q)     ||
        m.stake.toLowerCase().includes(q)
      )
    )
  }, [query, members])

  // ── Estados de carga / error ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground text-sm">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Cargando el BOOK…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive text-center">
        {error}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Buscador ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar por nombre, barrio o estaca…"
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* ── Contador ── */}
      <p className="text-sm text-muted-foreground">
        {filtered.length === members.length
          ? `${members.length} miembros en el directorio`
          : `${filtered.length} de ${members.length} coinciden`}
      </p>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No se encontraron miembros con esa búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="group rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* Foto o avatar */}
              <div className="relative h-40 bg-secondary/40 flex items-center justify-center overflow-hidden">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={`Foto de ${member.fullName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-20 w-20 text-muted-foreground/30" />
                )}

                {/* Badge sello de confianza */}
                {member.groupJoinDate && (
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm gap-1">
                      <Calendar className="h-3 w-3" />
                      En el grupo desde {joinYear(member.groupJoinDate)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Datos */}
              <div className="p-4">
                <h2 className="font-semibold text-foreground text-base leading-tight truncate">
                  {member.fullName}
                </h2>
                {member.ward && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {member.ward}
                    {member.stake ? ` · ${member.stake}` : ""}
                  </p>
                )}

                {/* Botón Ver Perfil — ruta futura */}
                <div className="mt-3">
                  <Link
                    href={`/perfil?userId=${member.id}`}
                    className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Ver Perfil →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
