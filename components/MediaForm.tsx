"use client"

import { useState, useRef } from "react"
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
import { Images, Instagram, Facebook, Upload, X, AlertTriangle } from "lucide-react"

// ---------------------------------------------------------------------------
// Reglas de negocio de fotos (Codex: tabla profile_photos)
// ---------------------------------------------------------------------------
const MIN_PHOTOS = 2
const MAX_PHOTOS = 5

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface PhotoSlot {
  id:      number
  file:    File | null
  preview: string | null
}

interface MediaFormProps {
  userId: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createEmptySlots(): PhotoSlot[] {
  return Array.from({ length: MAX_PHOTOS }, (_, i) => ({ id: i, file: null, preview: null }))
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function MediaForm({ userId }: MediaFormProps) {
  const router = useRouter()

  // ── Fotos
  const [slots,    setSlots]    = useState<PhotoSlot[]>(createEmptySlots)
  const fileRefs   = useRef<(HTMLInputElement | null)[]>([])

  // ── Redes sociales
  const [instagram, setInstagram] = useState("")
  const [facebook,  setFacebook]  = useState("")

  // ── UI
  const [error,     setError]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const filledCount = slots.filter((s) => s.file !== null).length

  // ── Seleccionar archivo en slot
  function handleFileChange(slotId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Revocar preview anterior si existe
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
      // ── 1. Redes sociales (JSON) ──────────────────────────────────────────
      const socialRes  = await fetch("/api/update_social.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, instagram, facebook }),
      })
      const socialText = await socialRes.text()
      let   socialJson: { status: string; message: string }
      try   { socialJson = JSON.parse(socialText) }
      catch { throw new Error(`Error del servidor (${socialRes.status}): ${socialText.slice(0, 200)}`) }
      if (socialJson.status !== "success") throw new Error(socialJson.message)

      // ── 2. Fotos (multipart/form-data) ────────────────────────────────────
      const formData = new FormData()
      formData.append("userId", String(userId))
      slots
        .filter((s) => s.file !== null)
        .forEach((s) => formData.append("photos[]", s.file as File))

      const photosRes  = await fetch("/api/upload_photos.php", {
        method: "POST",
        body:   formData,
      })
      const photosText = await photosRes.text()
      let   photosJson: { status: string; message: string }
      try   { photosJson = JSON.parse(photosText) }
      catch { throw new Error(`Error del servidor (${photosRes.status}): ${photosText.slice(0, 200)}`) }
      if (photosJson.status !== "success") throw new Error(photosJson.message)

      // ── 3. Éxito: redirigir ───────────────────────────────────────────────
      router.push("/dashboard")

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido al guardar."
      setError(msg)
      setIsLoading(false)
    }
  }

  // ── Render
  return (
    <div className="space-y-6">

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

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot, idx) => {
              const isRequired = idx < MIN_PHOTOS
              return (
                <div key={slot.id} className="relative aspect-square">

                  {slot.preview ? (
                    /* ── Slot ocupado: muestra preview ── */
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
                    /* ── Slot vacío: dropzone visual ── */
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
                      <Upload
                        className={`h-6 w-6 ${isRequired ? "text-primary/60" : "text-muted-foreground"}`}
                      />
                      <span
                        className={`text-xs font-medium ${isRequired ? "text-primary/70" : "text-muted-foreground"}`}
                      >
                        {idx === 0 ? "Principal" : isRequired ? `Foto ${idx + 1}` : "Opcional"}
                      </span>
                    </button>
                  )}

                  {/* Input de archivo oculto */}
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
          <p className="mt-4 text-xs text-center text-muted-foreground">
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
            Redes Sociales
          </CardTitle>
          <CardDescription>
            Opcionales. Solo comparte lo que te haga sentir cómodo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>

            {/* ── Instagram ── */}
            <Field>
              <FieldLabel htmlFor="media-instagram">Instagram</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none select-none">
                  @
                </span>
                <Input
                  id="media-instagram"
                  type="text"
                  placeholder="nombreusuario"
                  className="pl-[3.25rem]"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ""))}
                  maxLength={60}
                  autoComplete="off"
                />
              </div>
              <FieldDescription className="text-xs">
                Solo el nombre de usuario, sin arroba.
              </FieldDescription>
            </Field>

            {/* ── Facebook ── */}
            <Field>
              <FieldLabel htmlFor="media-facebook">Facebook</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="media-facebook"
                  type="text"
                  placeholder="Nombre o usuario de perfil"
                  className="pl-10"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  maxLength={100}
                  autoComplete="off"
                />
              </div>
            </Field>

          </FieldGroup>
        </CardContent>
      </Card>

      {/* ── Error de validación ── */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Botón finalizar ── */}
      <Button
        type="button"
        className="w-full font-semibold"
        onClick={handleFinalize}
        disabled={isLoading}
      >
        {isLoading ? "Guardando…" : "Finalizar y Entrar al Directorio"}
      </Button>

    </div>
  )
}
