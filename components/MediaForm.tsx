"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Images,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
  Globe,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  ImageIcon,
} from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Reglas de negocio (Codex)
// ---------------------------------------------------------------------------
const MIN_PHOTOS = 2
const MAX_PHOTOS = 5

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface PhotoSlot {
  id:      number
  file:    File | null
  preview: string | null
}

interface ServerPhoto {
  photoUrl:  string
  sortOrder: number
}

interface MediaFormProps {
  userId: number
}

function createEmptySlots(): PhotoSlot[] {
  return Array.from({ length: MAX_PHOTOS }, (_, i) => ({ id: i, file: null, preview: null }))
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function MediaForm({ userId }: MediaFormProps) {
  const router = useRouter()

  // ── Fotos nuevas (upload)
  const [slots,  setSlots] = useState<PhotoSlot[]>(createEmptySlots)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Fotos existentes (desde servidor)
  const [serverPhotos, setServerPhotos] = useState<ServerPhoto[]>([])

  // ── Redes sociales
  const [instagram, setInstagram] = useState("")
  const [facebook,  setFacebook]  = useState("")
  const [linkedin,  setLinkedin]  = useState("")
  const [twitter,   setTwitter]   = useState("")
  const [tiktok,    setTiktok]    = useState("")
  const [website,   setWebsite]   = useState("")

  // ── UI
  const [isHydrating, setIsHydrating] = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [isLoading,   setIsLoading]   = useState(false)

  const filledCount = slots.filter((s) => s.file !== null).length

  // ── Hidratación: cargar redes y fotos existentes ──────────────────────────
  useEffect(() => {
    async function loadProfile() {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/get_profile.php?userId=${userId}`)
        const text = await res.text()
        let   json: {
          status: string
          data?: {
            socials: Record<string, string>
            photos:  ServerPhoto[]
          }
        }
        try   { json = JSON.parse(text) }
        catch { return }

        if (json.status === "success" && json.data) {
          const { socials, photos } = json.data

          // Pre-rellenar redes
          if (socials) {
            setInstagram(socials.instagram ?? "")
            setFacebook(socials.facebook   ?? "")
            setLinkedin(socials.linkedin   ?? "")
            setTwitter(socials.twitter     ?? "")
            setTiktok(socials.tiktok       ?? "")
            setWebsite(socials.website     ?? "")
          }

          // Guardar fotos del servidor para mostrarlas como miniaturas
          if (Array.isArray(photos)) {
            setServerPhotos(photos)
          }
        }
      } catch { /* error de red — el form queda en blanco, es manejable */ }
      finally {
        setIsHydrating(false)
      }
    }
    loadProfile()
  }, [userId])

  // ── Seleccionar archivo en slot
  function handleFileChange(slotId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const prev = slots.find((s) => s.id === slotId)?.preview
    if (prev) URL.revokeObjectURL(prev)

    const preview = URL.createObjectURL(file)
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, file, preview } : s))
    setError(null)
  }

  // ── Eliminar foto de un slot
  function handleRemovePhoto(slotId: number) {
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.preview) URL.revokeObjectURL(slot.preview)

    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, file: null, preview: null } : s))
    const ref = fileRefs.current[slotId]
    if (ref) ref.value = ""
  }

  // ── Finalizar
  async function handleFinalize() {
    setError(null)

    if (filledCount < MIN_PHOTOS) {
      setError(`Debes subir al menos ${MIN_PHOTOS} fotos para continuar.`)
      return
    }

    setIsLoading(true)

    try {
      // 1. Redes sociales
      const socialRes  = await fetch(`${API_BASE_URL}/api/update_social.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, instagram, facebook, linkedin, twitter, tiktok, website }),
      })
      const socialText = await socialRes.text()
      let   socialJson: { status: string; message: string }
      try   { socialJson = JSON.parse(socialText) }
      catch { throw new Error(`Error del servidor (${socialRes.status}): ${socialText.slice(0, 200)}`) }
      if (socialJson.status !== "success") throw new Error(socialJson.message)

      // 2. Fotos
      const formData = new FormData()
      formData.append("userId", String(userId))
      slots
        .filter((s) => s.file !== null)
        .forEach((s) => formData.append("photos[]", s.file as File))

      const photosRes  = await fetch(`${API_BASE_URL}/api/upload_photos.php`, {
        method: "POST",
        body:   formData,
      })
      const photosText = await photosRes.text()
      let   photosJson: { status: string; message: string }
      try   { photosJson = JSON.parse(photosText) }
      catch { throw new Error(`Error del servidor (${photosRes.status}): ${photosText.slice(0, 200)}`) }
      if (photosJson.status !== "success") throw new Error(photosJson.message)

      router.push("/dashboard")

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al guardar.")
      setIsLoading(false)
    }
  }

  // ── Skeleton de hidratación ───────────────────────────────────────────────
  if (isHydrating) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground text-sm">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        Cargando tu información…
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-6">

      {/* ── Overlay de carga al guardar ── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm min-h-[200px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center px-6">
            <p className="font-semibold text-foreground text-base">
              Optimizando y subiendo tus fotos…
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Por favor no cierres esta ventana.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================
          SECCIÓN 1 — FOTOS DE PERFIL
      ================================================================ */}
      <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <Images className="h-5 w-5" />
            Tus Fotos
          </CardTitle>
          <CardDescription>
            Sube entre {MIN_PHOTOS} y {MAX_PHOTOS} fotos. La primera será tu foto principal.
            Las fotos con borde azul son obligatorias.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* ── Fotos actuales del servidor ── */}
          {serverPhotos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Tus fotos actuales</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {serverPhotos.map((ph) => (
                  <div key={ph.sortOrder} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-border/60 shrink-0">
                    <img
                      src={ph.photoUrl}
                      alt={`Foto actual ${ph.sortOrder}`}
                      className="h-full w-full object-cover"
                    />
                    {ph.sortOrder === 1 && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-primary/80 text-primary-foreground font-semibold py-0.5">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Advertencia de reemplazo */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/40 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Nota:</strong> Si subes nuevas fotos, se reemplazarán las actuales.
                </span>
              </div>
            </div>
          )}

          {/* ── Grid de slots para nuevas fotos ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot, idx) => {
              const isRequired = idx < MIN_PHOTOS
              return (
                <div key={slot.id} className="relative aspect-square">

                  {slot.preview ? (
                    <div className="relative h-full w-full rounded-xl overflow-hidden border-2 border-primary/40 shadow-sm">
                      <img
                        src={slot.preview}
                        alt={`Foto ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold shadow">
                          Principal
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(slot.id)}
                        className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-white hover:bg-destructive/80 transition-colors shadow"
                        aria-label={`Eliminar foto ${idx + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRefs.current[idx]?.click()}
                      className={[
                        "h-full w-full rounded-xl border-2 border-dashed",
                        "flex flex-col items-center justify-center gap-1.5",
                        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isRequired
                          ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                          : "border-border bg-secondary/30 hover:bg-secondary/50",
                      ].join(" ")}
                      aria-label={`Subir foto ${idx + 1}${isRequired ? " (obligatoria)" : " (opcional)"}`}
                    >
                      <Upload className={`h-6 w-6 ${isRequired ? "text-primary/60" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-medium ${isRequired ? "text-primary/70" : "text-muted-foreground"}`}>
                        {idx === 0 ? "Principal" : isRequired ? `Foto ${idx + 1}` : "Opcional"}
                      </span>
                    </button>
                  )}

                  <input
                    ref={(el) => { fileRefs.current[idx] = el }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(slot.id, e)}
                  />
                </div>
              )
            })}
          </div>

          {/* Contador */}
          <p className="text-xs text-center text-muted-foreground">
            <span className={filledCount >= MIN_PHOTOS ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
              {filledCount} de {MAX_PHOTOS} fotos seleccionadas
            </span>
            {" "}— mínimo {MIN_PHOTOS} para continuar
          </p>

        </CardContent>
      </Card>

      {/* ================================================================
          SECCIÓN 2 — REDES SOCIALES
      ================================================================ */}
      <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-primary">
            Redes Sociales <span className="text-base font-normal text-muted-foreground">(100% Opcional)</span>
          </CardTitle>
          <CardDescription>
            No estás obligado a compartir ninguna. Solo lo que te haga sentir cómodo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>

            {/* Instagram */}
            <Field>
              <FieldLabel htmlFor="media-instagram">Instagram</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none select-none">@</span>
                <Input id="media-instagram" type="text" placeholder="nombreusuario" className="pl-[3.25rem]"
                  value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ""))}
                  maxLength={60} autoComplete="off" />
              </div>
              <FieldDescription className="text-xs">Sin arroba.</FieldDescription>
            </Field>

            {/* Facebook */}
            <Field>
              <FieldLabel htmlFor="media-facebook">Facebook</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="media-facebook" type="text" placeholder="Nombre o usuario de perfil" className="pl-10"
                  value={facebook} onChange={(e) => setFacebook(e.target.value)}
                  maxLength={100} autoComplete="off" />
              </div>
            </Field>

            {/* LinkedIn */}
            <Field>
              <FieldLabel htmlFor="media-linkedin">LinkedIn</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="media-linkedin" type="url" placeholder="https://linkedin.com/in/tu-perfil" className="pl-10"
                  value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                  maxLength={200} autoComplete="off" />
              </div>
              <FieldDescription className="text-xs">URL completa de tu perfil de LinkedIn.</FieldDescription>
            </Field>

            {/* X (Twitter) */}
            <Field>
              <FieldLabel htmlFor="media-twitter">X (Twitter)</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none select-none">@</span>
                <Input id="media-twitter" type="text" placeholder="nombreusuario" className="pl-[3.25rem]"
                  value={twitter} onChange={(e) => setTwitter(e.target.value.replace(/^@+/, ""))}
                  maxLength={60} autoComplete="off" />
              </div>
              <FieldDescription className="text-xs">Sin arroba.</FieldDescription>
            </Field>

            {/* TikTok */}
            <Field>
              <FieldLabel htmlFor="media-tiktok">TikTok</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none select-none">@</span>
                <Input id="media-tiktok" type="text" placeholder="nombreusuario" className="pl-[3.25rem]"
                  value={tiktok} onChange={(e) => setTiktok(e.target.value.replace(/^@+/, ""))}
                  maxLength={60} autoComplete="off" />
              </div>
              <FieldDescription className="text-xs">Sin arroba.</FieldDescription>
            </Field>

            {/* Sitio Web */}
            <Field>
              <FieldLabel htmlFor="media-website">Sitio Web</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input id="media-website" type="url" placeholder="https://tu-sitio.com" className="pl-10"
                  value={website} onChange={(e) => setWebsite(e.target.value)}
                  maxLength={200} autoComplete="off" />
              </div>
              <FieldDescription className="text-xs">URL completa incluyendo https://</FieldDescription>
            </Field>

          </FieldGroup>
        </CardContent>
      </Card>

      {/* ── Error de validación ── */}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Botón finalizar ── */}
      <Button type="button" className="w-full font-semibold" onClick={handleFinalize} disabled={isLoading}>
        {isLoading ? "Guardando…" : "Finalizar y Entrar al Directorio"}
      </Button>

    </div>
  )
}
