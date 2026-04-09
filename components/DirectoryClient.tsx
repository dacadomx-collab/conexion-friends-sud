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
} from "lucide-react"
import { Badge }  from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Tipos
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
  gender:        string          // 'M' | 'F' | ''
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
// Mock data — se usa mientras el backend aún no devuelve todos los campos
// ---------------------------------------------------------------------------
const MOCK_MEMBERS: Member[] = [
  {
    id: 1, fullName: "Ana Lucía Herrera",   birthDate: "1996-03-12",
    gender: "F", ward: "Barrio Norte", stake: "Estaca Toluca",
    bio: "Me encanta leer, cocinar y compartir con la familia. Busco amistades sinceras y llenas de luz.",
    showWhatsapp: true, phone: "5215551234567",
    country: "México", state: "Estado de México", city: "Toluca",
    role: "user", groupJoinDate: "2023-09-01",
    photoUrl: null, allPhotos: [], socials: { instagram: "analuciaher", facebook: "", linkedin: "", twitter: "", tiktok: "analuciaher", website: "" },
  },
  {
    id: 2, fullName: "Carlos Mendoza Ríos", birthDate: "1991-07-25",
    gender: "M", ward: "Barrio Poniente", stake: "Estaca Toluca",
    bio: "Amo el futbol y el senderismo. Mi fe es mi guía.",
    showWhatsapp: false, phone: null,
    country: "México", state: "Estado de México", city: "Toluca",
    role: "user", groupJoinDate: "2021-02-14",
    photoUrl: null, allPhotos: [], socials: { instagram: "", facebook: "carlos.mendoza.rios", linkedin: "", twitter: "", tiktok: "", website: "" },
  },
  {
    id: 3, fullName: "Sofía Ramírez Torres", birthDate: "1999-11-30",
    gender: "F", ward: "Barrio Sur", stake: "Estaca Naucalpan",
    bio: "Trabajo en diseño gráfico. La música es mi refugio y los templos son mi meta.",
    showWhatsapp: true, phone: "5215559876543",
    country: "México", state: "CDMX", city: "Naucalpan",
    role: "user", groupJoinDate: "2024-01-10",
    photoUrl: null, allPhotos: [], socials: { instagram: "sofiart_", facebook: "", linkedin: "sofia-ramirez", twitter: "", tiktok: "", website: "https://sofiart.mx" },
  },
  {
    id: 4, fullName: "Diego Vargas Castillo", birthDate: "1988-05-18",
    gender: "M", ward: "Barrio Central", stake: "Estaca CDMX Norte",
    bio: "Contador de profesión, voluntario de corazón. Me gustan los retiros de jóvenes adultos.",
    showWhatsapp: true, phone: "5215554561234",
    country: "México", state: "CDMX", city: "Ciudad de México",
    role: "admin", groupJoinDate: "2019-06-01",
    photoUrl: null, allPhotos: [], socials: { instagram: "", facebook: "", linkedin: "diegovargas", twitter: "diegovc", tiktok: "", website: "" },
  },
  {
    id: 5, fullName: "Valentina Cruz Ortega", birthDate: "1994-08-22",
    gender: "F", ward: "Barrio Oriente", stake: "Estaca Guadalajara",
    bio: "Maestra de primaria. Los niños y el Evangelio son mi vocación.",
    showWhatsapp: false, phone: null,
    country: "México", state: "Jalisco", city: "Guadalajara",
    role: "user", groupJoinDate: "2022-11-05",
    photoUrl: null, allPhotos: [], socials: { instagram: "vale.cruz", facebook: "valentina.cruz.ortega", linkedin: "", twitter: "", tiktok: "vale.cruz", website: "" },
  },
  {
    id: 6, fullName: "Rodrigo Ibáñez Pérez", birthDate: "1997-01-09",
    gender: "M", ward: "Barrio Lomas", stake: "Estaca Guadalajara",
    bio: "Estudiante de medicina. La oración y el ejercicio me mantienen enfocado.",
    showWhatsapp: true, phone: "5213312345678",
    country: "México", state: "Jalisco", city: "Guadalajara",
    role: "user", groupJoinDate: "2024-03-20",
    photoUrl: null, allPhotos: [], socials: { instagram: "roibanez", facebook: "", linkedin: "", twitter: "", tiktok: "", website: "" },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const today = new Date()
  const bd    = new Date(birthDate)
  let age     = today.getFullYear() - bd.getFullYear()
  const m     = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age
}

function memberBadge(m: Member): { icon: React.ReactNode; label: string; cls: string } | null {
  if (!m.groupJoinDate) return null
  const joined  = new Date(m.groupJoinDate)
  const now     = new Date()
  const months  = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth())

  if (m.role === "admin") {
    return { icon: <Shield className="h-3 w-3" />, label: "Admin", cls: "bg-primary/90 text-primary-foreground" }
  }
  if (months <= 6) {
    return { icon: <Sparkles className="h-3 w-3" />, label: "Nuevo", cls: "bg-gold/90 text-white" }
  }
  if (months >= 12) {
    return { icon: <Handshake className="h-3 w-3" />, label: "Confianza", cls: "bg-emerald-600/90 text-white" }
  }
  return null
}

function locationLabel(m: Member): string {
  return [m.city, m.state, m.country].filter(Boolean).slice(0, 2).join(", ")
}

const GENDER_FILTER = [
  { value: "all",  label: "Todos",      icon: <Users className="h-4 w-4" /> },
  { value: "M",    label: "Hermanos",   icon: null },
  { value: "F",    label: "Hermanas",   icon: null },
]


// ---------------------------------------------------------------------------
// Sub-componente: perfil expandido (Sheet)
// ---------------------------------------------------------------------------
function MemberSheet({
  member,
  open,
  onClose,
}: {
  member: Member | null
  open:   boolean
  onClose: () => void
}) {
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => { setPhotoIdx(0) }, [member])

  if (!member) return null

  const photos   = member.allPhotos?.length > 0 ? member.allPhotos : [null]
  const age      = calcAge(member.birthDate)
  const badge    = memberBadge(member)
  const location = locationLabel(member)
  const hasSocials = member.socials ? Object.values(member.socials).some(Boolean) : false

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">{member.fullName}</SheetTitle>

        {/* ── Galería de fotos ── */}
        <div className="relative w-full aspect-[4/3] bg-secondary/40 shrink-0 overflow-hidden">
          {photos[photoIdx] ? (
            <img
              src={photos[photoIdx]!}
              alt={`Foto de ${member.fullName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserCircle2 className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}

          {/* Degradado inferior */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Nombre sobre la foto */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-bold text-xl leading-tight drop-shadow">
              {member.fullName}{age ? `, ${age}` : ""}
            </h2>
            {location && (
              <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {location}
              </p>
            )}
          </div>

          {/* Navegación fotos */}
          {photos.length > 1 && (
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

              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
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

          {/* Badges */}
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

          {/* Barrio y estaca */}
          {(member.ward || member.stake) && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Church className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
              <span>
                {[member.ward, member.stake].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}

          {/* Biografía */}
          {member.bio && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Sobre mí
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {member.bio}
              </p>
            </div>
          )}

          {/* ── Contacto ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contacto
            </p>

            {member.showWhatsapp && member.phone ? (
              <a
                href={`https://wa.me/${member.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full"
              >
                <Button className="w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enviar WhatsApp
                </Button>
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Este miembro no compartió WhatsApp.
              </p>
            )}
          </div>

          {/* ── Redes sociales ── */}
          {hasSocials && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Redes sociales
              </p>
              <div className="flex flex-wrap gap-2">
                {member.socials.instagram && (
                  <SocialLink href={`https://instagram.com/${member.socials.instagram}`} icon={<Instagram className="h-4 w-4" />} label="Instagram" />
                )}
                {member.socials.facebook && (
                  <SocialLink href={`https://facebook.com/${member.socials.facebook}`} icon={<Facebook className="h-4 w-4" />} label="Facebook" />
                )}
                {member.socials.linkedin && (
                  <SocialLink href={member.socials.linkedin.startsWith("http") ? member.socials.linkedin : `https://linkedin.com/in/${member.socials.linkedin}`} icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" />
                )}
                {member.socials.twitter && (
                  <SocialLink href={`https://x.com/${member.socials.twitter}`} icon={<Twitter className="h-4 w-4" />} label="X / Twitter" />
                )}
                {member.socials.tiktok && (
                  <SocialLink href={`https://tiktok.com/@${member.socials.tiktok}`} icon={<span className="text-xs font-bold">TT</span>} label="TikTok" />
                )}
                {member.socials.website && (
                  <SocialLink href={member.socials.website} icon={<Globe className="h-4 w-4" />} label="Sitio web" />
                )}
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
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
  // ── Montaje diferido (SSR / LastPass shield) ──────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // ── Datos ─────────────────────────────────────────────────────────────────
  const [members,   setMembers]   = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [usingMock, setUsingMock] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/get_directory.php`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") {
          const data: Member[] = json.data ?? []
          if (data.length === 0) {
            // BD vacía o sin usuarios activos → mostrar mock para revisión de diseño
            setMembers(MOCK_MEMBERS)
            setUsingMock(true)
          } else {
            // Normalizar campos que el backend v1 puede omitir
            const normalized = data.map((m) => ({
              ...m,
              allPhotos: m.allPhotos  ?? [],
              socials:   m.socials    ?? { instagram: "", facebook: "", linkedin: "", twitter: "", tiktok: "", website: "" },
              gender:    m.gender     ?? "",
              bio:       m.bio        ?? "",
            }))
            setMembers(normalized)
          }
        } else {
          setError(json.message ?? "Error al cargar el directorio.")
        }
      })
      .catch(() => setError("Error de conexión. Verifica que el servidor esté disponible."))
      .finally(() => setIsLoading(false))
  }, [])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [genderFilter, setGenderFilter] = useState("all")
  const [ageMin,       setAgeMin]       = useState(0)
  const [ageMax,       setAgeMax]       = useState(999)
  const [country,      setCountry]      = useState("all")
  const [query,        setQuery]        = useState("")

  const countries = useMemo(
    () => ["all", ...Array.from(new Set(members.map((m) => m.country).filter(Boolean))).sort()],
    [members],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (genderFilter !== "all" && m.gender !== genderFilter) return false
      if (country !== "all" && m.country !== country) return false
      const age = calcAge(m.birthDate)
      if (age !== null) {
        if (ageMin > 0   && age < ageMin) return false
        if (ageMax < 999 && age > ageMax) return false
      }
      if (q) {
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.ward.toLowerCase().includes(q)     ||
          m.stake.toLowerCase().includes(q)    ||
          m.city.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [members, genderFilter, ageMin, ageMax, country, query])

  // ── Perfil seleccionado ───────────────────────────────────────────────────
  const [selected, setSelected] = useState<Member | null>(null)

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading || !isMounted) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-full rounded-md bg-secondary/60 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-secondary/60 animate-pulse" />
          ))}
        </div>
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

  return (
    <div className="space-y-5">

      {/* ── Mock notice ── */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-md bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Vista previa con datos de prueba — conecta el backend para ver miembros reales.
        </div>
      )}

      {/* ── Filtro de género (Toggle Group principal) ── */}
      <div className="flex rounded-xl border border-border/60 bg-secondary/30 p-1 gap-1">
        {GENDER_FILTER.map((g) => (
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

        {/* Rango de edad: mínimo */}
        <div className="flex-1 min-w-[120px]">
          <Input
            type="number"
            min={18}
            max={99}
            placeholder="Edad Mín. (Ej. 30)"
            value={ageMin === 0 ? "" : ageMin}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Math.max(0, Math.min(99, Number(e.target.value)))
              setAgeMin(v)
            }}
            aria-label="Edad mínima"
          />
        </div>

        {/* Rango de edad: máximo */}
        <div className="flex-1 min-w-[120px]">
          <Input
            type="number"
            min={18}
            max={99}
            placeholder="Edad Máx."
            value={ageMax === 999 ? "" : ageMax}
            onChange={(e) => {
              const v = e.target.value === "" ? 999 : Math.max(0, Math.min(99, Number(e.target.value)))
              setAgeMax(v)
            }}
            aria-label="Edad máxima"
          />
        </div>

        {/* País */}
        <div className="flex-1 min-w-[140px]">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todos los países</option>
            {countries.slice(1).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Buscador */}
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
          ? `${members.length} miembros`
          : `${filtered.length} de ${members.length} coinciden`}
        {genderFilter === "F" ? " · Hermanas" : genderFilter === "M" ? " · Hermanos" : ""}
        {(ageMin > 0 || ageMax < 999)
          ? ` · ${ageMin > 0 ? ageMin : "—"} – ${ageMax < 999 ? ageMax : "—"} años`
          : ""}
      </p>

      {/* ── Grid de tarjetas ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground text-sm">
          <Users className="h-10 w-10 opacity-20" />
          No se encontraron miembros con estos filtros.
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
                {/* ── Foto de fondo ── */}
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

                {/* ── Degradado inferior ── */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* ── Badge esquina superior derecha ── */}
                {badge && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm ${badge.cls}`}>
                      {badge.icon}
                      <span className="hidden sm:inline">{badge.label}</span>
                    </span>
                  </div>
                )}

                {/* ── Texto inferior ── */}
                <div className="absolute inset-x-0 bottom-0 p-3 z-10">
                  <p className="text-white font-bold text-sm leading-tight drop-shadow-md truncate">
                    {member.fullName}{age ? `, ${age}` : ""}
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

      {/* ── Sheet de perfil expandido ── */}
      <MemberSheet
        member={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />

    </div>
  )
}
