"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar } from "lucide-react"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface FormData {
  fullName: string
  email: string
  phone: string
  birthDate: string
  password: string
  acceptedCodeOfConduct: boolean
}

interface ApiSuccessData {
  id: number
  fullName: string
  email: string
  createdAt: string
}

interface ApiResponse {
  status: "success" | "error"
  message: string
  data: ApiSuccessData | []
}

interface RegisterFormProps {
  /** Callback opcional que se dispara tras un registro exitoso. */
  onSuccess?: (data: ApiSuccessData) => void
  /** URL a la que redirigir tras el registro. Si se omite, no redirige. */
  redirectTo?: (data: ApiSuccessData) => string
}

// ---------------------------------------------------------------------------
// Estado inicial — valores vacíos, tipado estricto
// ---------------------------------------------------------------------------
const INITIAL_FORM: FormData = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  password: "",
  acceptedCodeOfConduct: false,
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function RegisterForm({ onSuccess, redirectTo }: RegisterFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Helpers de cambio de estado
  // -------------------------------------------------------------------------
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setApiError(null)
  }

  function handleCheckbox(checked: boolean | "indeterminate") {
    setFormData((prev) => ({
      ...prev,
      acceptedCodeOfConduct: checked === true,
    }))
    setApiError(null)
  }

  // -------------------------------------------------------------------------
  // Submit — conecta con api/register.php
  // -------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setApiError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const apiUrl = '/api/register.php'

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Mandamiento 7: payload en camelCase.
        // acceptedCodeOfConduct se serializa como booleano true (no 1, no "true").
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          birthDate: formData.birthDate,
          password: formData.password,
          acceptedCodeOfConduct: formData.acceptedCodeOfConduct,
        }),
      })

      const result: ApiResponse = await response.json()

      if (result.status === "success") {
        const successData = result.data as ApiSuccessData
        setSuccessMessage(result.message)
        setFormData(INITIAL_FORM)
        onSuccess?.(successData)
        if (redirectTo) {
          router.push(redirectTo(successData))
        }
      } else {
        setApiError(result.message)
      }
    } catch (err) {
      console.error("[RegisterForm] Error de conexión con el servidor PHP:", err)
      setApiError("Error de conexión con el servidor. Verifica tu red e intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Card className="w-full max-w-md border-0 shadow-xl bg-card/95 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-primary">
          Crea tu cuenta
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tu privacidad es nuestra prioridad
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-2">
          <FieldGroup>

            {/* ── Nombre Completo ── */}
            <Field>
              <FieldLabel htmlFor="reg-fullName">Nombre completo</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nombre y apellidos"
                  className="pl-10"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={150}
                  disabled={isLoading}
                />
              </div>
              <FieldDescription className="text-xs text-amber-600 dark:text-amber-400">
                Este dato no podrá cambiarse después.
              </FieldDescription>
            </Field>

            {/* ── Correo Electrónico ── */}
            <Field>
              <FieldLabel htmlFor="reg-email">Correo electrónico</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* ── Teléfono ── */}
            <Field>
              <FieldLabel htmlFor="reg-phone">Teléfono</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  placeholder="Solo dígitos, sin espacios"
                  className="pl-10"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* ── Fecha de Nacimiento ── */}
            <Field>
              <FieldLabel htmlFor="reg-birthDate">Fecha de nacimiento</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-birthDate"
                  name="birthDate"
                  type="date"
                  className="pl-10"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <FieldDescription className="text-xs text-amber-600 dark:text-amber-400">
                Este dato no podrá cambiarse después.
              </FieldDescription>
            </Field>

            {/* ── Contraseña ── */}
            <Field>
              <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
              <div className="relative" suppressHydrationWarning>
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reg-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

          </FieldGroup>

          {/* ── Código de Conducta ── */}
          <div className="flex items-start gap-3 rounded-lg bg-secondary/50 border border-border p-4 mt-2">
            <Checkbox
              id="reg-acceptedCodeOfConduct"
              checked={formData.acceptedCodeOfConduct}
              onCheckedChange={handleCheckbox}
              disabled={isLoading}
              className="mt-0.5 shrink-0"
            />
            <label
              htmlFor="reg-acceptedCodeOfConduct"
              className="text-sm leading-relaxed cursor-pointer select-none"
            >
              <span className="font-medium text-primary">Acepto el código de conducta: </span>
              <span className="text-foreground">
                Trato a todos como hijos de Dios.
              </span>
            </label>
          </div>

          {/* ── Mensaje de error de la API ── */}
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
            disabled={isLoading || !formData.acceptedCodeOfConduct}
          >
            {isLoading ? "Creando cuenta..." : "Crear mi cuenta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
