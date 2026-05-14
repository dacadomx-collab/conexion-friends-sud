"use client"

import { useState, useEffect } from "react"
import { Send, ChevronLeft } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ── Catálogo de prompts guiados ────────────────────────────────────────────────
const WOVEN_PROMPTS = {
  virtue:  { label: "¿Qué virtud destacarías de esta persona?",      emoji: "✨" },
  feeling: { label: "¿Cómo te hace sentir cuando convives con ella?", emoji: "🌸" },
  memory:  { label: "¿Qué momento juntos te ha marcado?",            emoji: "🌿" },
  light:   { label: "¿De qué manera ha añadido luz a tu vida?",      emoji: "☀️" },
} as const

type PromptKey = keyof typeof WOVEN_PROMPTS

// ── Insignias de virtudes (sin contadores — solo presencia cualitativa) ────────
const VIRTUE_BADGES = {
  trust:   { emoji: "🌿", label: "Inspira confianza" },
  joy:     { emoji: "☀️", label: "Transmite alegría" },
  light:   { emoji: "📖", label: "Comparte luz" },
  service: { emoji: "🤝", label: "Sirve con amor" },
} as const

type VirtueKey = keyof typeof VIRTUE_BADGES

const VIRTUE_KEYS = Object.keys(VIRTUE_BADGES) as VirtueKey[]

// ── Opciones de relación para el formulario ────────────────────────────────────
const RELATION_OPTIONS = [
  "Barrio",
  "Instituto",
  "Estaca",
  "Amigos de toda la vida",
  "Compañeros de servicio",
  "Conocidos del grupo",
]

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface WovenMessage {
  messageId:      number
  authorId:       number
  authorName:     string
  authorPhotoUrl: string | null
  promptKey:      PromptKey
  message:        string
  relationType:   string | null
  createdAt:      string
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface WovenSectionProps {
  memberId:     number
  memberName:   string
  viewerUserId: number | null
}

// ── Componente principal ───────────────────────────────────────────────────────
export function WovenSection({ memberId, memberName, viewerUserId }: WovenSectionProps) {
  const firstName = memberName.split(" ")[0]

  // ── Estado: mensajes ─────────────────────────────────────────────────────
  const [messages,        setMessages]        = useState<WovenMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)

  // ── Estado: virtudes ─────────────────────────────────────────────────────
  const [virtuesReceived, setVirtuesReceived] = useState<string[]>([])
  const [viewerGave,      setViewerGave]      = useState<string[]>([])
  const [virtuesLoading,  setVirtuesLoading]  = useState(true)
  const [togglingVirtue,  setTogglingVirtue]  = useState<string | null>(null)

  // ── Estado: formulario guiado (2 pasos) ──────────────────────────────────
  const [selectedPrompt, setSelectedPrompt] = useState<PromptKey | null>(null)
  const [wovenText,      setWovenText]      = useState("")
  const [wovenRelation,  setWovenRelation]  = useState("")
  const [posting,        setPosting]        = useState(false)
  const [postError,      setPostError]      = useState<string | null>(null)
  const [postSuccess,    setPostSuccess]    = useState(false)

  // ── Carga inicial al abrir un perfil ─────────────────────────────────────
  useEffect(() => {
    setMessages([])
    setVirtuesReceived([])
    setViewerGave([])
    setMessagesLoading(true)
    setVirtuesLoading(true)
    setSelectedPrompt(null)
    setWovenText("")
    setWovenRelation("")
    setPostError(null)
    setPostSuccess(false)

    const viewerParam = viewerUserId ? `&viewerId=${viewerUserId}` : ""

    Promise.all([
      fetch(`${API_BASE_URL}/api/entretejidos/get_messages.php?recipientId=${memberId}`)
        .then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/entretejidos/get_virtues.php?recipientId=${memberId}${viewerParam}`)
        .then((r) => r.json()),
    ])
      .then(([msgJson, virtJson]) => {
        if (msgJson.status  === "success") setMessages(msgJson.data ?? [])
        if (virtJson.status === "success") {
          setVirtuesReceived(virtJson.data?.virtuesReceived ?? [])
          setViewerGave(virtJson.data?.viewerGave ?? [])
        }
      })
      .catch(() => { /* silencioso — el usuario no pierde el perfil por error de red */ })
      .finally(() => {
        setMessagesLoading(false)
        setVirtuesLoading(false)
      })
  }, [memberId, viewerUserId])

  // ── Toggle de virtud ──────────────────────────────────────────────────────
  async function handleToggleVirtue(vk: VirtueKey) {
    if (!viewerUserId || viewerUserId === memberId || togglingVirtue) return
    setTogglingVirtue(vk)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/entretejidos/toggle_virtue.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ authorId: viewerUserId, recipientId: memberId, virtueKey: vk }),
      })
      const json = await res.json()
      if (json.status !== "success") return

      const { action } = json.data as { action: "added" | "removed"; virtueKey: string }

      if (action === "added") {
        setViewerGave((prev) => [...prev, vk])
        setVirtuesReceived((prev) => prev.includes(vk) ? prev : [...prev, vk])
      } else {
        setViewerGave((prev) => prev.filter((v) => v !== vk))
        // Re-fetch para saber si la virtud sigue presente por otros (sin exponer conteos)
        const refetch = await fetch(
          `${API_BASE_URL}/api/entretejidos/get_virtues.php?recipientId=${memberId}&viewerId=${viewerUserId}`
        ).then((r) => r.json())
        if (refetch.status === "success") {
          setVirtuesReceived(refetch.data?.virtuesReceived ?? [])
          setViewerGave(refetch.data?.viewerGave ?? [])
        }
      }
    } catch { /* silencioso */ } finally {
      setTogglingVirtue(null)
    }
  }

  // ── Enviar mensaje guiado ─────────────────────────────────────────────────
  async function handlePostMessage() {
    if (!viewerUserId || !selectedPrompt || wovenText.trim().length < 10) return
    setPosting(true)
    setPostError(null)
    try {
      const res  = await fetch(`${API_BASE_URL}/api/entretejidos/post_message.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          authorId:     viewerUserId,
          recipientId:  memberId,
          promptKey:    selectedPrompt,
          message:      wovenText.trim(),
          relationType: wovenRelation || null,
        }),
      })
      const json = await res.json()
      if (json.status !== "success") throw new Error(json.message)
      setPostSuccess(true)
      if (json.data && json.data.messageId) {
        setMessages((prev) => [json.data as WovenMessage, ...prev])
      }
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Error al enviar el mensaje.")
    } finally {
      setPosting(false)
    }
  }

  const viewerAlreadyPosted = messages.some((m) => m.authorId === viewerUserId)
  const canPost             = viewerUserId !== null && viewerUserId !== memberId && !viewerAlreadyPosted && !postSuccess
  const isOwnProfile        = viewerUserId === memberId
  const canToggleVirtues    = viewerUserId !== null && !isOwnProfile

  return (
    <div className="border-t border-primary/10 pt-5 space-y-6">

      {/* ── Encabezado del módulo ───────────────────────────────────────────── */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-1">
          ✨ Entretejidos
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          "Corazones entretejidos con unidad y amor"
        </p>
        <p className="text-[10px] text-muted-foreground/60">— Mosíah 18:21</p>
      </div>

      {/* ── Constelación de virtudes ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Virtudes reconocidas
        </p>

        {virtuesLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {VIRTUE_KEYS.map((vk) => {
              const badge      = VIRTUE_BADGES[vk]
              const isReceived = virtuesReceived.includes(vk)
              const iGaveIt    = viewerGave.includes(vk)
              const isToggling = togglingVirtue === vk

              return (
                <button
                  key={vk}
                  onClick={() => canToggleVirtues && handleToggleVirtue(vk)}
                  disabled={isToggling || !canToggleVirtues}
                  aria-label={
                    canToggleVirtues
                      ? iGaveIt
                        ? `Quitar mi reconocimiento: ${badge.label}`
                        : `Reconocer en ${firstName}: ${badge.label}`
                      : badge.label
                  }
                  className={[
                    "relative rounded-xl px-3 py-3 text-left transition-all duration-200 border flex flex-col gap-1",
                    canToggleVirtues
                      ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      : "cursor-default",
                    isReceived
                      ? iGaveIt
                        ? "bg-primary/10 border-primary/40 shadow-sm"
                        : "bg-secondary/60 border-border"
                      : "bg-secondary/20 border-border/40 opacity-40",
                  ].join(" ")}
                >
                  <span className="text-xl leading-none">{badge.emoji}</span>
                  <span
                    className={`text-[11px] font-medium leading-tight ${
                      isReceived ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {badge.label}
                  </span>

                  {/* Indicador: tú diste esta virtud */}
                  {iGaveIt && (
                    <span
                      className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                      title="Tú reconociste esta virtud"
                    />
                  )}

                  {/* Spinner durante toggle */}
                  {isToggling && (
                    <span className="absolute inset-0 rounded-xl flex items-center justify-center bg-background/60">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Instrucción contextual según rol del viewer */}
        <p className="text-[10px] text-muted-foreground/60 mt-2.5 text-center leading-relaxed">
          {isOwnProfile
            ? "Así te ven quienes te conocen y han reconocido tus virtudes."
            : canToggleVirtues
              ? `Toca una virtud para reconocerla en ${firstName}. El punto azul indica las que tú has reconocido.`
              : ""}
        </p>
      </div>

      {/* ── Lista de mensajes entretejidos ──────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <span className="text-sm">💬</span>
          Mensajes entretejidos
        </p>

        {messagesLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg) => {
              const prompt = WOVEN_PROMPTS[msg.promptKey]
              return (
                <div
                  key={msg.messageId}
                  className="rounded-xl bg-secondary/30 border border-border/60 px-3.5 py-3 space-y-2"
                >
                  {/* Chip del prompt que guió el mensaje */}
                  {prompt && (
                    <span className="inline-block text-[10px] font-medium text-primary/70 bg-primary/10 rounded-full px-2.5 py-0.5 leading-normal">
                      {prompt.emoji} {prompt.label}
                    </span>
                  )}

                  <p className="text-sm text-foreground leading-relaxed">
                    &ldquo;{msg.message}&rdquo;
                  </p>

                  {/* Pie: autor + relación */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {msg.authorPhotoUrl ? (
                        <img
                          src={msg.authorPhotoUrl}
                          alt={msg.authorName}
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-primary/70 uppercase">
                            {msg.authorName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {msg.authorName}
                      </span>
                    </div>
                    {msg.relationType && (
                      <span className="shrink-0 text-[10px] text-muted-foreground/60 bg-secondary/60 rounded-full px-2 py-0.5">
                        {msg.relationType}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            Aún no hay mensajes. ¡Sé el primero en entretejer tu testimonio!
          </p>
        )}
      </div>

      {/* ── Formulario guiado (solo si el viewer puede escribir) ────────────── */}
      {canPost && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-primary/80 uppercase tracking-widest">
            Entretejer mi testimonio
          </p>

          {postSuccess ? (
            /* Estado de éxito */
            <div className="text-center py-3 space-y-1">
              <p className="text-2xl">🌿</p>
              <p className="text-sm font-semibold text-primary">
                ¡Tu testimonio quedó entretejido en la historia de {firstName}!
              </p>
            </div>
          ) : selectedPrompt === null ? (
            /* Paso 1: Selección del prompt guía */
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Elige desde dónde quieres escribir:
              </p>
              <div className="flex flex-col gap-2">
                {(Object.entries(WOVEN_PROMPTS) as [PromptKey, { label: string; emoji: string }][]).map(
                  ([key, p]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPrompt(key)}
                      className="text-left rounded-xl border border-border/60 bg-background hover:bg-secondary/40 hover:border-primary/30 px-3.5 py-2.5 transition-all group flex items-start gap-2.5"
                    >
                      <span className="text-base leading-snug shrink-0">{p.emoji}</span>
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                        {p.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            /* Paso 2: Escribir el mensaje */
            <div className="space-y-3">
              {/* Prompt seleccionado como contexto visible */}
              <div className="flex items-start gap-2">
                <button
                  onClick={() => { setSelectedPrompt(null); setWovenText(""); setPostError(null) }}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5 shrink-0 flex items-center gap-0.5 underline underline-offset-2"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Cambiar
                </button>
                <span className="text-[11px] text-primary/80 font-medium italic leading-relaxed">
                  {WOVEN_PROMPTS[selectedPrompt].emoji} {WOVEN_PROMPTS[selectedPrompt].label}
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={wovenText}
                onChange={(e) => setWovenText(e.target.value)}
                placeholder="Escribe aquí con sinceridad y amor…"
                maxLength={500}
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />

              {/* Contador de caracteres */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{wovenText.length} / 500</span>
                <span
                  className={
                    wovenText.trim().length >= 10
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {wovenText.trim().length >= 10
                    ? "✓ Listo para enviar"
                    : `Mínimo 10 caracteres`}
                </span>
              </div>

              {/* Selector de relación (opcional) */}
              <select
                value={wovenRelation}
                onChange={(e) => setWovenRelation(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">¿Cómo se conocen? (opcional)</option>
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {postError && (
                <p className="text-xs text-destructive">{postError}</p>
              )}

              {/* Botón de envío */}
              <button
                onClick={handlePostMessage}
                disabled={posting || wovenText.trim().length < 10}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {posting ? "Entretejiendo…" : "Entretejer mi mensaje"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nota cuando el viewer ya publicó (formulario oculto) */}
      {!isOwnProfile && viewerUserId !== null && viewerAlreadyPosted && !canPost && (
        <p className="text-xs text-muted-foreground/60 text-center italic">
          Ya entretejiste tu testimonio en el perfil de {firstName}.
        </p>
      )}
    </div>
  )
}
