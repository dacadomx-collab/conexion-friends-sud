"use client"

import { useState, useEffect } from "react"
import { BookOpen, Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { API_BASE_URL } from "@/lib/api"

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
const CFS_SESSION_KEY = "cfs_session"

interface QueueItem {
  id:            number
  userId:        number
  fullName:      string
  scriptureText: string
  reference:     string
  scheduledDate: string
}

// ---------------------------------------------------------------------------
// Helper: formato de fecha legible en español
// ---------------------------------------------------------------------------
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  })
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function ScriptureForm() {
  // ── Sesión ────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CFS_SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        if (session?.id) setUserId(session.id)
      }
    } catch { /* sin sesión — el formulario mostrará error al enviar */ }
  }, [])

  // ── Montaje diferido: blinda el SSR contra inyecciones de extensiones ────
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])

  // ── Formulario ────────────────────────────────────────────────────────────
  const [text,      setText]      = useState("")
  const [reference, setReference] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  // ── Cola de espera ────────────────────────────────────────────────────────
  const [queue,        setQueue]        = useState<QueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(true)

  function loadQueue() {
    setQueueLoading(true)
    fetch(`${API_BASE_URL}/api/get_scripture_queue.php`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setQueue(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false))
  }

  useEffect(() => { loadQueue() }, [])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!userId) {
      setError("No hay sesión activa. Vuelve a iniciar sesión.")
      return
    }
    if (text.trim().length < 10) {
      setError("El texto de la escritura debe tener al menos 10 caracteres.")
      return
    }
    if (reference.trim().length < 2) {
      setError('La referencia es obligatoria (ej. "Mosíah 18:21").')
      return
    }

    setIsLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/submit_scripture.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, text: text.trim(), reference: reference.trim() }),
      })
      const raw  = await res.text()
      let   json: { status: string; message: string; scheduledDate?: string }
      try   { json = JSON.parse(raw) }
      catch { throw new Error(`Error del servidor (${res.status})`) }

      if (json.status !== "success") throw new Error(json.message)

      const dateStr = json.scheduledDate
        ? formatDate(json.scheduledDate)
        : "próximamente"

      setSuccess(`¡Gracias! Tu escritura fue añadida a la cola y se publicará el ${dateStr}.`)
      setText("")
      setReference("")
      loadQueue()   // refrescar la cola
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Formulario de envío ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <BookOpen className="h-5 w-5" />
            Compartir una Escritura
          </CardTitle>
          <CardDescription>
            Elige un versículo que haya tocado tu corazón. Se publicará como
            "Escritura del Día" en la fecha que te corresponda en la cola.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isMounted ? (
            /* Skeleton SSR: el servidor nunca renderiza inputs → LastPass no inyecta */
            <div className="space-y-4 animate-pulse" aria-hidden="true">
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 rounded bg-secondary/80" />
                <div className="h-28 w-full rounded-md bg-secondary/60" />
                <div className="h-3 w-24 ml-auto rounded bg-secondary/60" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-secondary/80" />
                <div className="h-10 w-full rounded-md bg-secondary/60" />
              </div>
              <div className="h-10 w-full rounded-md bg-primary/20" />
            </div>
          ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FieldGroup>

              <Field>
                <FieldLabel htmlFor="scr-text">Texto de la escritura</FieldLabel>
                <Textarea
                  id="scr-text"
                  placeholder='"…que sus corazones estuviesen entretejidos con unidad y amor los unos para con los otros."'
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(null) }}
                  maxLength={3000}
                  rows={5}
                  className="resize-none"
                  disabled={isLoading}
                />
                <FieldDescription className="text-xs text-right">
                  {3000 - text.length} caracteres restantes
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="scr-ref">Referencia</FieldLabel>
                <Input
                  id="scr-ref"
                  placeholder="ej. Mosíah 18:21"
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setError(null) }}
                  maxLength={200}
                  disabled={isLoading}
                />
                <FieldDescription className="text-xs">
                  Libro, capítulo y versículo.
                </FieldDescription>
              </Field>

            </FieldGroup>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-300 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? "Enviando…" : "Agregar a la fila"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

      {/* ── Cola de espera ───────────────────────────────────────────────── */}
      <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Fila de Espera
          </CardTitle>
          <CardDescription>
            Escrituras programadas — la tuya aparecerá aquí con su fecha exacta.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {queueLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground text-sm gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Cargando…
            </div>
          ) : queue.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              La cola está vacía. ¡Sé el primero en compartir una escritura!
            </p>
          ) : (
            <ol className="space-y-3">
              {queue.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex gap-3 items-start rounded-lg border border-border/60 bg-secondary/30 px-4 py-3"
                >
                  {/* Número de posición */}
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Fecha */}
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.scheduledDate)}
                    </p>
                    {/* Texto truncado */}
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2 italic">
                      "{item.scriptureText}"
                    </p>
                    <p className="text-xs text-primary font-medium mt-1">
                      — {item.reference}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Compartida por {item.fullName}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
