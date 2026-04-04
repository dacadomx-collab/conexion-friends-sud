"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Calendar, MapPin, Clock, Users, CheckCircle, Sparkles } from "lucide-react"

// Sample inspirational posts
const inspirationalPosts = [
  {
    id: 1,
    type: "scripture",
    title: "Escritura del Dia",
    content: "Y acontecio que yo, Nefi, dije a mi padre: Ire y hare lo que el Senor ha mandado, porque se que el Senor nunca da mandamientos a los hijos de los hombres sin prepararles la via para que cumplan lo que les ha mandado.",
    source: "1 Nefi 3:7",
    date: "Hoy",
  },
  {
    id: 2,
    type: "quote",
    title: "Pensamiento Inspirador",
    content: "El Senor obra desde adentro hacia afuera. El mundo obra desde afuera hacia adentro. El mundo quita a los humildes de los barrios bajos. Cristo quita los barrios bajos de los humildes, y luego estos se sacan a si mismos de los barrios bajos.",
    source: "Presidente Ezra Taft Benson",
    date: "Ayer",
  },
  {
    id: 3,
    type: "scripture",
    title: "Escritura de la Semana",
    content: "Allegaos a mi y yo me allegare a vosotros; buscadme diligentemente, y me hallareis; pedid, y recibireis; llamad, y se os abrira.",
    source: "Doctrina y Convenios 88:63",
    date: "Hace 2 dias",
  },
  {
    id: 4,
    type: "quote",
    title: "Mensaje del Liderazgo",
    content: "No importa cuales sean nuestras dificultades, si oramos sinceramente y escuchamos la voz suave y apacible del Espiritu, recibiremos la guia que necesitamos para nuestras circunstancias personales.",
    source: "Presidente Russell M. Nelson",
    date: "Hace 3 dias",
  },
]

// Sample events
const upcomingEvents = [
  {
    id: 1,
    title: "Noche de Hogar Regional",
    description: "Una noche especial de convivencia, juegos y mensaje espiritual para todos los JAS de la region.",
    date: "Viernes, 10 de Abril",
    time: "7:00 PM",
    location: "Centro de Estaca Mexico Norte",
    attendees: 24,
    confirmed: false,
  },
  {
    id: 2,
    title: "Servicio Comunitario",
    description: "Limpieza y embellecimiento del parque local. Traer guantes y buena actitud.",
    date: "Sabado, 12 de Abril",
    time: "9:00 AM",
    location: "Parque Municipal Centro",
    attendees: 18,
    confirmed: true,
  },
  {
    id: 3,
    title: "Devocional de Jovenes Adultos",
    description: "Transmision especial con mensaje del Area Setenta. Tema: Preparacion para el templo.",
    date: "Domingo, 13 de Abril",
    time: "6:00 PM",
    location: "Capilla Barrio Centro",
    attendees: 45,
    confirmed: false,
  },
  {
    id: 4,
    title: "Actividad Deportiva",
    description: "Torneo de voleibol mixto. Habra premios y refrigerios. Todos los niveles bienvenidos.",
    date: "Sabado, 19 de Abril",
    time: "4:00 PM",
    location: "Cancha de la Estaca Sur",
    attendees: 32,
    confirmed: false,
  },
]

export function WallPage() {
  const [confirmedEvents, setConfirmedEvents] = useState<number[]>([2])

  const toggleConfirmation = (eventId: number) => {
    setConfirmedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary/90 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-gold" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Fortalezcamos Nuestra Fe
            </h1>
          </div>
          <p className="text-white/80 text-sm md:text-base">
            Mensajes inspiradores y actividades para nuestra comunidad
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Feed - Inspirational Posts */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Muro Espiritual</h2>
            </div>

            <div className="flex flex-col gap-6">
              {inspirationalPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden border-l-4 border-l-turquoise">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge
                        variant="secondary"
                        className={
                          post.type === "scripture"
                            ? "bg-turquoise/10 text-turquoise border-turquoise/20"
                            : "bg-gold/10 text-gold border-gold/20"
                        }
                      >
                        {post.title}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    
                    <blockquote className="text-foreground leading-relaxed mb-4 italic">
                      &ldquo;{post.content}&rdquo;
                    </blockquote>
                    
                    <p className="text-sm font-medium text-primary">
                      — {post.source}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar - Events */}
          <div className="lg:w-96">
            <div className="sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="h-5 w-5 text-emerald" />
                <h2 className="text-xl font-bold text-foreground">Agenda FRIENDS</h2>
              </div>

              <div className="flex flex-col gap-4">
                {upcomingEvents.map((event) => {
                  const isConfirmed = confirmedEvents.includes(event.id)
                  return (
                    <Card
                      key={event.id}
                      className={`overflow-hidden transition-all ${
                        isConfirmed ? "ring-2 ring-emerald bg-emerald/5" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground mb-2">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {event.description}
                        </p>

                        <div className="flex flex-col gap-2 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 text-turquoise" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-turquoise" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 text-turquoise" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 text-turquoise" />
                            <span>{event.attendees + (isConfirmed ? 1 : 0)} confirmados</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => toggleConfirmation(event.id)}
                          variant={isConfirmed ? "outline" : "default"}
                          className={
                            isConfirmed
                              ? "w-full border-emerald text-emerald hover:bg-emerald/10"
                              : "w-full bg-emerald hover:bg-emerald/90 text-white"
                          }
                        >
                          {isConfirmed ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Asistencia Confirmada
                            </>
                          ) : (
                            "Confirmar Asistencia"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
