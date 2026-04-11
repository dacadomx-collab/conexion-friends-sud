"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Search,
  Sparkles,
  Shield,
  Handshake,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Globe,
  MapPin,
  Church,
  UserCircle2,
  Users,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Tipos — alineados exactamente con get_directory.php v3
// ---------------------------------------------------------------------------
interface Socials {
  instagram: string
  facebook:  string
  linkedin:  string
  twitter:   string
  tiktok:    string
  website:   string
}

interface Member {
  id:            number
  fullName:      string
  birthDate:     string | null
  gender:        string        // 'M' | 'F' | ''
  ward:          string
  stake:         string
  bio:           string
  showWhatsapp:  boolean
  phone:         string | null
  country:       string
  state:         string
  city:          string
  role:          string
  groupJoinDate: string | null
  photoUrl:      string | null
  allPhotos:     string[]
  socials:       Socials
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const EMPTY_SOCIALS: Socials = {
  instagram: "", facebook: "", linkedin: "",
  twitter:   "", tiktok:   "", website:  "",
}

function normalizeMember(m: Partial<Member> & { id: number; fullName: string }): Member {
  return {
    id:            m.id,
    fullName:      m.fullName      ?? "",
    birthDate:     m.birthDate     ?? null,
    gender:        m.gender        ?? "",
    ward:          m.ward          ?? "",
    stake:         m.stake         ?? "",
    bio:           m.bio           ?? "",
    showWhatsapp:  m.showWhatsapp  ?? false,
    phone:         m.phone         ?? null,
    country:       m.country       ?? "",
    state:         m.state         ?? "",
    city:          m.city          ?? "",
    role:          m.role          ?? "user",
    groupJoinDate: m.groupJoinDate ?? null,
    photoUrl:      m.photoUrl      ?? null,
    allPhotos:     Array.isArray(m.allPhotos) ? m.allPhotos : [],
    socials:       m.socials ? { ...EMPTY_SOCIALS, ...m.socials } : { ...EMPTY_SOCIALS },
  }
}

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const today = new Date()
  const bd    = new Date(birthDate)
  if (isNaN(bd.getTime())) return null
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age >= 0 ? age : null
}

function memberBadge(m: Member): { icon: React.ReactNode; label: string; cls: string } | null {
  if (m.role === "admin") {
    return { icon: <Shield className="h-3 w-3" />, label: "Admin", cls: "bg-primary/90 text-primary-foreground" }
  }
  if (!m.groupJoinDate) return null
  const joined = new Date(m.groupJoinDate)
  if (isNaN(joined.getTime())) return null
  const now    = new Date()
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth())
  if (months <= 6)  return { icon: <Sparkles className="h-3 w-3" />,  label: "Nuevo",     cls: "bg-amber-500/90 text-white" }
  if (months >= 12) return { icon: <Handshake className="h-3 w-3" />, label: "Confianza", cls: "bg-emerald-600/90 text-white" }
  return null
}

function locationLabel(m: Member): string {
  return [m.city, m.state, m.country].filter(Boolean).slice(0, 2).join(", ")
}

const GENDER_OPTS = [
  { value: "all", label: "Todos",    icon: <Users className="h-4 w-4" /> },
  { value: "M",   label: "Hermanos", icon: null },
  { value: "F",   label: "Hermanas", icon: null },
]

// ---------------------------------------------------------------------------
// Sub-componente: Sheet de perfil expandido
// ---------------------------------------------------------------------------
function MemberSheet({
  member, open, onClose,
}: {
  member:  Member | null
  open:    boolean
  onClose: () => void
}) {
  const [photoIdx, setPhotoIdx] = useState(0)
  useEffect(() => { setPhotoIdx(0) }, [member?.id])

  if (!member) return null

  // Defensa total: allPhotos siempre es array después de normalizeMember
  const photos     = member.allPhotos.length > 0 ? member.allPhotos : ([] as (string | null)[])
  const hasPhotos  = photos.length > 0
  const currentSrc = hasPhotos ? photos[photoIdx] : null

  const age        = calcAge(member.birthDate)
  const badge      = memberBadge(member)
  const location   = locationLabel(member)
  const hasSocials = Object.values(member.socials).some(Boolean)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">Perfil de {member.fullName}</SheetTitle>

        {/* ── Galería ── */}
        <div className="relative w-full aspect-[4/3] bg-secondary/40 shrink-0 overflow-hidden">
          {currentSrc ? (
            <img
              src={currentSrc}
              alt={`Foto de ${member.fullName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserCircle2 className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-bold text-xl leading-tight drop-shadow">
              {member.fullName}{age !== null ? `, ${age}` : ""}
            </h2>
            {location && (
              <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {location}
              </p>
            )}
          </div>

          {/* Navegación entre fotos */}
          {hasPhotos && photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                disabled={photoIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1))}
                disabled={photoIdx === photos.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
                aria-label="Foto siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/50"}`}
                    aria-label={`Ir a foto ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {badge && (
            <div className="absolute top-3 right-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow ${badge.cls}`}>
                {badge.icon} {badge.label}
              </span>
            </div>
          )}
        </div>

        {/* ── Contenido del perfil ── */}
        <div className="flex-1 px-5 py-5 space-y-5">

          {(member.ward || member.stake) && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Church className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
              <span>{[member.ward, member.stake].filter(Boolean).join(" · ")}</span>
            </div>
          )}

          {member.bio && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Sobre mí
              </p>
              <p className="text-sm text-foreground leading-relaxed">{member.bio}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contacto
            </p>
            {member.showWhatsapp && member.phone ? (
              <a
                href={`https://wa.me/${member.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enviar WhatsApp
                </Button>
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Este miembro no compartió su WhatsApp.
              </p>
            )}
          </div>

          {hasSocials && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Redes sociales
              </p>
              <div className="flex flex-wrap gap-2">
                {member.socials.instagram && (
                  <SocialPill href={`https://instagram.com/${member.socials.instagram}`} icon={<Instagram className="h-4 w-4" />} label="Instagram" />
                )}
                {member.socials.facebook && (
                  <SocialPill href={`https://facebook.com/${member.socials.facebook}`} icon={<Facebook className="h-4 w-4" />} label="Facebook" />
                )}
                {member.socials.linkedin && (
                  <SocialPill href={member.socials.linkedin.startsWith("http") ? member.socials.linkedin : `https://linkedin.com/in/${member.socials.linkedin}`} icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" />
                )}
                {member.socials.twitter && (
                  <SocialPill href={`https://x.com/${member.socials.twitter}`} icon={<Twitter className="h-4 w-4" />} label="X / Twitter" />
                )}
                {member.socials.tiktok && (
                  <SocialPill href={`https://tiktok.com/@${member.socials.tiktok}`} icon={<span className="text-[10px] font-black">TT</span>} label="TikTok" />
                )}
                {member.socials.website && (
                  <SocialPill href={member.socials.website} icon={<Globe className="h-4 w-4" />} label="Sitio web" />
                )}
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )
}

function SocialPill({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors"
      aria-label={label}
    >
      {icon} {label}
    </a>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function DirectoryClient() {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // ── Datos del backend ──────────────────────────────────────────────────────
  const [members,   setMembers]   = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/get_directory.php`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Error del servidor (HTTP ${r.status})`)
        return r.json()
      })
      .then((json) => {
        if (json.status === "success") {
          const normalized = (json.data ?? []).map(normalizeMember)
          setMembers(normalized)
        } else {
          setError(json.message ?? "Error al cargar el directorio.")
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error de conexión con el servidor.")
      })
      .finally(() => setIsLoading(false))
  }, [])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [genderFilter, setGenderFilter] = useState("all")
  const [ageMinStr,    setAgeMinStr]    = useState("")
  const [ageMaxStr,    setAgeMaxStr]    = useState("")
  const [country,      setCountry]      = useState("all")
  const [query,        setQuery]        = useState("")

  const ageMin = ageMinStr === "" ? null : parseInt(ageMinStr, 10)
  const ageMax = ageMaxStr === "" ? null : parseInt(ageMaxStr, 10)

  const countries = useMemo(
    () => Array.from(new Set(members.map((m) => m.country).filter(Boolean))).sort(),
    [members],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (genderFilter !== "all" && m.gender !== genderFilter) return false
      if (country      !== "all" && m.country !== country)     return false
      const age = calcAge(m.birthDate)
      if (ageMin !== null && !isNaN(ageMin) && (age === null || age < ageMin)) return false
      if (ageMax !== null && !isNaN(ageMax) && (age === null || age > ageMax)) return false
      if (q) {
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.ward.toLowerCase().includes(q)     ||
          m.stake.toLowerCase().includes(q)    ||
          m.city.toLowerCase().includes(q)     ||
          m.state.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [members, genderFilter, ageMin, ageMax, country, query])

  const [selected, setSelected] = useState<Member | null>(null)

  // ── Skeleton de carga ─────────────────────────────────────────────────────
  if (isLoading || !isMounted) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-full rounded-xl bg-secondary/60 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-md bg-secondary/50 animate-pulse" />
          <div className="h-10 flex-1 rounded-md bg-secondary/50 animate-pulse" />
          <div className="h-10 flex-1 rounded-md bg-secondary/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-secondary/60 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error de conexión / backend ───────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/30 px-5 py-4 text-sm text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">No se pudo cargar El BOOK</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Toggle género ── */}
      <div className="flex rounded-xl border border-border/60 bg-secondary/30 p-1 gap-1">
        {GENDER_OPTS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGenderFilter(g.value)}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-150",
              genderFilter === g.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            ].join(" ")}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      {/* ── Filtros secundarios ── */}
      <div className="flex flex-wrap gap-2">

        <Input
          type="number"
          min={18} max={99}
          placeholder="Edad Mín. (ej. 30)"
          value={ageMinStr}
          onChange={(e) => setAgeMinStr(e.target.value)}
          className="flex-1 min-w-[130px]"
          aria-label="Edad mínima"
        />

        <Input
          type="number"
          min={18} max={99}
          placeholder="Edad Máx. (ej. 50)"
          value={ageMaxStr}
          onChange={(e) => setAgeMaxStr(e.target.value)}
          className="flex-1 min-w-[130px]"
          aria-label="Edad máxima"
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="flex-1 min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Nombre, barrio, estaca, ciudad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

      </div>

      {/* ── Contador ── */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === members.length
          ? `${members.length} miembro${members.length !== 1 ? "s" : ""}`
          : `${filtered.length} de ${members.length} coinciden`}
        {genderFilter === "F" ? " · Hermanas" : genderFilter === "M" ? " · Hermanos" : ""}
        {(ageMin !== null || ageMax !== null)
          ? ` · ${ageMin ?? "—"}–${ageMax ?? "—"} años`
          : ""}
      </p>

      {/* ── Grid de tarjetas ── */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground text-sm">
          <Users className="h-10 w-10 opacity-20" />
          <p>Aún no hay miembros activos en el directorio.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground text-sm">
          <Search className="h-10 w-10 opacity-20" />
          <p>No se encontraron miembros con estos filtros.</p>
          <button
            onClick={() => { setGenderFilter("all"); setAgeMinStr(""); setAgeMaxStr(""); setCountry("all"); setQuery("") }}
            className="text-primary text-xs hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((member) => {
            const age      = calcAge(member.birthDate)
            const badge    = memberBadge(member)
            const location = locationLabel(member)

            return (
              <button
                key={member.id}
                onClick={() => setSelected(member)}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-all duration-200 cursor-pointer text-left"
                aria-label={`Ver perfil de ${member.fullName}`}
              >
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={`Foto de ${member.fullName}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/40">
                    <UserCircle2 className="h-16 w-16 text-primary/30" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {badge && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm ${badge.cls}`}>
                      {badge.icon}
                      <span className="hidden sm:inline">{badge.label}</span>
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-3 z-10">
                  <p className="text-white font-bold text-sm leading-tight drop-shadow-md truncate">
                    {member.fullName}{age !== null ? `, ${age}` : ""}
                  </p>
                  {location && (
                    <p className="text-white/75 text-[11px] mt-0.5 truncate leading-tight">
                      {location}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <MemberSheet
        member={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />

    </div>
  )
}
