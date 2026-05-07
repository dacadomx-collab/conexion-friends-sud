"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
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
  PenLine,
  Send,
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

interface BirthdayWish {
  wishId:     number
  authorId:   number
  authorName: string
  message:    string
  createdAt:  string
}
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

// ---------------------------------------------------------------------------
// Helpers de cumpleaños
// ---------------------------------------------------------------------------
function getBirthMonthDay(birthDate: string | null): { month: number; day: number } | null {
  if (!birthDate) return null
  const parts = birthDate.split("-")
  if (parts.length < 3) return null
  const month = parseInt(parts[1], 10)
  const day   = parseInt(parts[2], 10)
  if (isNaN(month) || isNaN(day)) return null
  return { month, day }
}

function isBirthdayMonth(birthDate: string | null): boolean {
  const bd = getBirthMonthDay(birthDate)
  if (!bd) return false
  return bd.month === new Date().getMonth() + 1
}

function isBirthdayToday(birthDate: string | null): boolean {
  const bd = getBirthMonthDay(birthDate)
  if (!bd) return false
  const today = new Date()
  return bd.month === today.getMonth() + 1 && bd.day === today.getDate()
}

// Domingo-Sábado de la semana en curso; maneja semanas que cruzan fin de mes o año.
function isBirthdayThisWeek(birthDate: string | null): boolean {
  const bd = getBirthMonthDay(birthDate)
  if (!bd) return false

  const today     = new Date()
  const year      = today.getFullYear()
  const dayOfWeek = today.getDay()                          // 0 = domingo

  // Extremos de la semana actual (midnight, sin horas)
  const sunday   = new Date(year, today.getMonth(), today.getDate() - dayOfWeek)
  const saturday = new Date(year, today.getMonth(), today.getDate() - dayOfWeek + 6)

  // Comprobar en el año actual y en los adyacentes (borde año nuevo)
  for (const y of [year - 1, year, year + 1]) {
    const candidate = new Date(y, bd.month - 1, bd.day)
    if (candidate >= sunday && candidate <= saturday) return true
  }
  return false
}

// Mes en curso pero NO es hoy ni esta semana — tercer nivel de prioridad.
function isBirthdayThisMonth(birthDate: string | null): boolean {
  return (
    isBirthdayMonth(birthDate) &&
    !isBirthdayToday(birthDate) &&
    !isBirthdayThisWeek(birthDate)
  )
}

const MONTH_NAMES_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
]

const GENDER_OPTS = [
  { value: "all", label: "Todos",    icon: <Users className="h-4 w-4" /> },
  { value: "M",   label: "Hermanos", icon: null },
  { value: "F",   label: "Hermanas", icon: null },
]

// ---------------------------------------------------------------------------
// Sub-componente: Sheet de perfil expandido
// ---------------------------------------------------------------------------
function MemberSheet({
  member, open, onClose, viewerUserId, focusWishes,
}: {
  member:       Member | null
  open:         boolean
  onClose:      () => void
  viewerUserId: number | null
  focusWishes:  boolean
}) {
  const [photoIdx, setPhotoIdx] = useState(0)

  // ── Estado del Libro de Firmas ────────────────────────────────────────────
  const [wishes,        setWishes]        = useState<BirthdayWish[]>([])
  const [wishesLoading, setWishesLoading] = useState(false)
  const [wishMessage,   setWishMessage]   = useState("")
  const [postingWish,   setPostingWish]   = useState(false)
  const [wishError,     setWishError]     = useState<string | null>(null)
  const [wishSuccess,   setWishSuccess]   = useState(false)

  // Ref para scroll automático al Libro de Firmas
  const wishesRef = useRef<HTMLDivElement>(null)

  // Reset al cambiar de miembro
  useEffect(() => {
    setPhotoIdx(0)
    setWishes([])
    setWishMessage("")
    setWishError(null)
    setWishSuccess(false)
  }, [member?.id])

  // ── Cargar mensajes del Libro de Firmas (solo en mes de cumpleaños) ───────
  useEffect(() => {
    if (!open || !member || !isBirthdayMonth(member.birthDate)) return
    setWishesLoading(true)
    fetch(`${API_BASE_URL}/api/birthday_wishes/get_wishes.php?recipientId=${member.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setWishes(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setWishesLoading(false))
  }, [open, member?.id])

  // ── Confetti para cumpleaños de hoy ──────────────────────────────────────
  useEffect(() => {
    if (!open || !member || !isBirthdayToday(member.birthDate)) return
    let alive = true
    import("canvas-confetti").then((mod) => {
      if (!alive) return
      mod.default({
        particleCount: 160,
        spread:        80,
        origin:        { y: 0.35 },
        colors:        ["#FFD700", "#FF69B4", "#00CED1", "#32CD32", "#FF6347"],
      })
    })
    return () => { alive = false }
  }, [open, member?.id])

  // ── Scroll al Libro de Firmas cuando se abre con focusWishes ─────────────
  useEffect(() => {
    if (!open || !focusWishes || !wishesRef.current) return
    const timer = setTimeout(() => {
      wishesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 380)
    return () => clearTimeout(timer)
  }, [open, focusWishes, member?.id])

  // ── Enviar mensaje al Libro de Firmas ─────────────────────────────────────
  async function handlePostWish() {
    if (!viewerUserId || !member) return
    setPostingWish(true)
    setWishError(null)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/birthday_wishes/post_wish.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          authorId:    viewerUserId,
          recipientId: member.id,
          message:     wishMessage.trim(),
        }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      setWishSuccess(true)
      setWishMessage("")
      const refetch = await fetch(`${API_BASE_URL}/api/birthday_wishes/get_wishes.php?recipientId=${member.id}`)
      const rfJson  = await refetch.json()
      if (rfJson.status === "success") setWishes(rfJson.data ?? [])
    } catch (err) {
      setWishError(err instanceof Error ? err.message : "Error al enviar el mensaje.")
    } finally {
      setPostingWish(false)
    }
  }

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
        <div className="relative w-full aspect-[4/3] bg-stone-100 dark:bg-stone-800 shrink-0 overflow-hidden">
          {currentSrc ? (
            <img
              src={currentSrc}
              alt={`Foto de ${member.fullName}`}
              className="w-full h-full object-contain"
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
                  <SocialPill
                    href={member.socials.website.startsWith("http") ? member.socials.website : `https://${member.socials.website}`}
                    icon={<Globe className="h-4 w-4" />}
                    label="Sitio web"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Sección Celebrando la Vida ──────────────────────────────── */}
          {isBirthdayMonth(member.birthDate) && (
            <div className="border-t border-amber-200 dark:border-amber-900/40 pt-5 space-y-4">

              {/* Banner de cumpleaños */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-300/15 to-amber-100/10 dark:from-amber-800/30 dark:via-orange-900/20 dark:to-amber-950/10 border border-amber-300/50 dark:border-amber-700/40 px-4 py-4 text-center">
                <p className="text-2xl mb-1">🎂</p>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                  {isBirthdayToday(member.birthDate)
                    ? `¡Hoy es el cumpleaños de ${member.fullName.split(" ")[0]}! 🎉`
                    : `¡${member.fullName.split(" ")[0]} cumple años en ${MONTH_NAMES_ES[new Date().getMonth()]}! 🎈`}
                </p>
              </div>

              {/* Libro de Firmas */}
              <div ref={wishesRef} id="libro-firmas">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5" />
                  Libro de Firmas
                </p>

                {/* Mensajes existentes */}
                {wishesLoading ? (
                  <div className="flex justify-center py-5">
                    <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  </div>
                ) : wishes.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {wishes.map((w) => (
                      <div
                        key={w.wishId}
                        className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3.5 py-3 border border-amber-100 dark:border-amber-900/40"
                      >
                        <p className="text-sm text-foreground leading-relaxed">
                          &ldquo;{w.message}&rdquo;
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
                          — {w.authorName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-3 mb-4">
                    Aún no hay mensajes. ¡Sé el primero en dejar tu firma!
                  </p>
                )}

                {/* Formulario — solo si el viewer no es el propio cumpleañero */}
                {viewerUserId && viewerUserId !== member.id && (
                  <div className="space-y-2">
                    {wishSuccess ? (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          💌 ¡Tu mensaje fue enviado con amor!
                        </p>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={wishMessage}
                          onChange={(e) => setWishMessage(e.target.value)}
                          placeholder="Escribe un mensaje edificante…"
                          maxLength={500}
                          rows={3}
                          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-shadow"
                        />
                        {wishError && (
                          <p className="text-xs text-destructive">{wishError}</p>
                        )}
                        <button
                          onClick={handlePostWish}
                          disabled={postingWish || wishMessage.trim().length < 3}
                          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4" />
                          {postingWish ? "Enviando…" : "Dejar mi firma"}
                        </button>
                      </>
                    )}
                  </div>
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
  const [isMounted,    setIsMounted]    = useState(false)
  const [viewerUserId, setViewerUserId] = useState<number | null>(null)

  useEffect(() => {
    setIsMounted(true)
    try {
      const raw = localStorage.getItem("cfs_session")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.id) setViewerUserId(Number(parsed.id))
      }
    } catch { /* sesión inválida: continuar sin userId */ }
  }, [])

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

  const [selected,     setSelected]     = useState<Member | null>(null)
  const [focusWishes,  setFocusWishes]  = useState(false)

  function openSheet(member: Member, withWishesFocus = false) {
    setSelected(member)
    setFocusWishes(withWishesFocus)
  }

  function closeSheet() {
    setSelected(null)
    setFocusWishes(false)
  }

  // ── Auto-abrir perfil desde URL (?userId=X) ───────────────────────────────
  const searchParams  = useSearchParams()
  const urlUserId     = searchParams ? Number(searchParams.get("userId")) : NaN
  const autoOpened    = useRef(false)

  useEffect(() => {
    if (autoOpened.current || !urlUserId || isNaN(urlUserId) || members.length === 0) return
    const target = members.find((m) => m.id === urlUserId)
    if (target) {
      openSheet(target)
      autoOpened.current = true
    }
  }, [urlUserId, members])

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
            const age          = calcAge(member.birthDate)
            const badge        = memberBadge(member)
            const location     = locationLabel(member)
            const bdToday      = isBirthdayToday(member.birthDate)
            const bdThisWeek   = !bdToday && isBirthdayThisWeek(member.birthDate)
            const bdThisMonth  = !bdToday && !bdThisWeek && isBirthdayThisMonth(member.birthDate)

            return (
              <button
                key={member.id}
                onClick={() => openSheet(member)}
                className={[
                  "group relative aspect-square rounded-2xl overflow-hidden shadow-sm",
                  "hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200",
                  "cursor-pointer text-left bg-stone-100 dark:bg-stone-800",
                  bdToday
                    ? "ring-2 ring-amber-400 shadow-amber-200/60 dark:shadow-amber-900/40"
                    : "",
                ].filter(Boolean).join(" ")}
                aria-label={`Ver perfil de ${member.fullName}`}
              >
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={`Foto de ${member.fullName}`}
                    className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/40">
                    <UserCircle2 className="h-16 w-16 text-primary/30" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* ── Insignia de rol / membresía (esquina superior derecha) ── */}
                {badge && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm ${badge.cls}`}>
                      {badge.icon}
                      <span className="hidden sm:inline">{badge.label}</span>
                    </span>
                  </div>
                )}

                {/* ── Insignia cumpleaños HOY (esquina superior izquierda) ── */}
                {bdToday && (
                  <div
                    role="button"
                    title={`¡Hoy es el cumpleaños de ${member.fullName}! Clic para felicitarle`}
                    aria-label={`Ir al Libro de Firmas de ${member.fullName}`}
                    className="absolute top-2 left-2 z-20"
                    onClick={(e) => {
                      e.stopPropagation()
                      openSheet(member, true)
                    }}
                  >
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm bg-amber-400/95 text-white animate-pulse-slow">
                      🎂
                      <span className="hidden sm:inline">Hoy</span>
                    </span>
                  </div>
                )}

                {/* ── Insignia cumpleaños ESTA SEMANA (esquina superior izquierda) ── */}
                {bdThisWeek && (
                  <div
                    className="absolute top-2 left-2 z-20"
                    title="Cumpleaños esta semana"
                    aria-label={`${member.fullName} cumple años esta semana`}
                  >
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm bg-amber-100/90 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200">
                      🎈
                      <span className="hidden sm:inline">Esta semana</span>
                    </span>
                  </div>
                )}

                {/* ── Insignia cumpleaños ESTE MES (esquina superior izquierda) ── */}
                {bdThisMonth && (
                  <div
                    className="absolute top-2 left-2 z-20"
                    title="Cumpleaños este mes"
                    aria-label={`${member.fullName} cumple años este mes`}
                  >
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm bg-slate-100/90 text-slate-600 dark:bg-slate-700/80 dark:text-slate-200">
                      🎁
                      <span className="hidden sm:inline">Este mes</span>
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
        onClose={closeSheet}
        viewerUserId={viewerUserId}
        focusWishes={focusWishes}
      />

    </div>
  )
}
