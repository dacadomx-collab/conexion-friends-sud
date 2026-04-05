"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { MapPin, Church, User, MessageCircle, Globe } from "lucide-react"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface FormData {
  country: string
  state: string
  city: string
  ward: string
  stake: string
  bio: string
  showWhatsapp: boolean
}

interface ApiProfileData {
  userId: number
  ward: string
  stake: string
  bio: string
  showWhatsapp: boolean
  country: string | null
  state: string | null
  city: string | null
}

interface ApiResponse {
  status: "success" | "error"
  message: string
  data: ApiProfileData | []
}

interface ProfileFormProps {
  /** ID del usuario autenticado — se envía como `userId` en el payload. */
  userId: number
  /** Valores iniciales para pre-rellenar el formulario al editar un perfil existente. */
  initialData?: Partial<FormData>
  /** Callback opcional ejecutado tras un guardado exitoso. */
  onSuccess?: (data: ApiProfileData) => void
}

// ---------------------------------------------------------------------------
// Estado inicial vacío
// ---------------------------------------------------------------------------
const EMPTY_FORM: FormData = {
  country: "",
  state: "",
  city: "",
  ward: "",
  stake: "",
  bio: "",
  showWhatsapp: false,
}

const BIO_MAX = 500

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function ProfileForm({ userId, initialData, onSuccess }: ProfileFormProps) {
  const [formData, setFormData] = useState<FormData>({
    ...EMPTY_FORM,
    ...initialData,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Helpers de estado
  // -------------------------------------------------------------------------
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setApiError(null)
  }

  function handleCheckbox(checked: boolean | "indeterminate") {
    setFormData((prev) => ({ ...prev, showWhatsapp: checked === true }))
    setApiError(null)
  }

  const bioCharsLeft = BIO_MAX - formData.bio.length

  // -------------------------------------------------------------------------
  // Submit — conecta con api/update_profile.php
  // -------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setApiError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/update_profile.php`

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Mandamiento 7: payload en camelCase.
        // country/state/city vacíos se envían como null para que el backend los guarde como NULL.
        body: JSON.stringify({
          userId,
          ward:         formData.ward,
          stake:        formData.stake,
          bio:          formData.bio,
          showWhatsapp: formData.showWhatsapp,
          country:      formData.country.trim() || null,
          state:        formData.state.trim()   || null,
          city:         formData.city.trim()    || null,
        }),
      })

      const result: ApiResponse = await response.json()

      if (result.status === "success") {
        const saved = result.data as ApiProfileData
        setSuccessMessage(result.message)
        onSuccess?.(saved)
      } else {
        setApiError(result.message)
      }
    } catch (err) {
      console.error("[ProfileForm] Error de conexión con el servidor PHP:", err)
      setApiError("Error de conexión con el servidor. Verifica tu red e intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Card className="w-full max-w-lg border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-primary">
          Mi Perfil
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Esta información es visible para otros miembros de la comunidad.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-2">
          <FieldGroup>

            {/* ── Sección: Ubicación ── */}
            <div className="pt-1 pb-0.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Ubicación
              </p>
            </div>

            {/* País */}
            <Field>
              <FieldLabel htmlFor="prof-country">País</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="prof-country"
                  name="country"
                  type="text"
                  placeholder="ej. México"
                  className="pl-10"
                  value={formData.country}
                  onChange={handleChange}
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Estado */}
            <Field>
              <FieldLabel htmlFor="prof-state">Estado / Provincia</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="prof-state"
                  name="state"
                  type="text"
                  placeholder="ej. Jalisco"
                  className="pl-10"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Ciudad */}
            <Field>
              <FieldLabel htmlFor="prof-city">Ciudad / Municipio</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="prof-city"
                  name="city"
                  type="text"
                  placeholder="ej. Guadalajara"
                  className="pl-10"
                  value={formData.city}
                  onChange={handleChange}
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* ── Sección: Organización de la Iglesia ── */}
            <div className="pt-3 pb-0.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Church className="h-3.5 w-3.5" />
                Organización
              </p>
            </div>

            {/* Ward */}
            <Field>
              <FieldLabel htmlFor="prof-ward">Barrio (Ward)</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Church className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="prof-ward"
                  name="ward"
                  type="text"
                  placeholder="ej. Barrio Jardines"
                  className="pl-10"
                  value={formData.ward}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Stake */}
            <Field>
              <FieldLabel htmlFor="prof-stake">Estaca (Stake)</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Church className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="prof-stake"
                  name="stake"
                  type="text"
                  placeholder="ej. Estaca Guadalajara Norte"
                  className="pl-10"
                  value={formData.stake}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* ── Sección: Sobre mí ── */}
            <div className="pt-3 pb-0.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Sobre mí
              </p>
            </div>

            {/* Bio */}
            <Field>
              <FieldLabel htmlFor="prof-bio">Biografía</FieldLabel>
              <Textarea
                id="prof-bio"
                name="bio"
                placeholder="Cuéntanos sobre tus talentos, pasatiempos y cómo te gusta servir..."
                value={formData.bio}
                onChange={handleChange}
                maxLength={BIO_MAX}
                disabled={isLoading}
                rows={4}
                className="resize-none"
              />
              <FieldDescription
                className={`text-xs text-right ${bioCharsLeft < 50 ? "text-amber-600 dark:text-amber-400" : ""}`}
              >
                {bioCharsLeft} caracteres restantes
              </FieldDescription>
            </Field>

          </FieldGroup>

          {/* ── WhatsApp visible ── */}
          <div className="flex items-start gap-3 rounded-lg bg-secondary/50 border border-border p-4 mt-2">
            <MessageCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  Mostrar WhatsApp
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Otros miembros podrán ver tu número de teléfono para contactarte.
                </p>
              </div>
              <Checkbox
                id="prof-showWhatsapp"
                checked={formData.showWhatsapp}
                onCheckedChange={handleCheckbox}
                disabled={isLoading}
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>
          <label htmlFor="prof-showWhatsapp" className="sr-only">
            Mostrar WhatsApp a otros miembros
          </label>

          {/* ── Error de la API ── */}
          {apiError && (
            <FieldError className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm">
              {apiError}
            </FieldError>
          )}

          {/* ── Mensaje de éxito ── */}
          {successMessage && (
            <p
              role="status"
              className="rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
            >
              {successMessage}
            </p>
          )}

          {/* ── Botón submit ── */}
          <Button
            type="submit"
            className="w-full font-semibold mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : "Guardar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
