"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, MapPin, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react"

interface ProfileCardProps {
  name: string
  birthDate: string
  ward: string
  stake: string
  bio: string
  photos: string[]
  whatsapp?: string
}

export function ProfileCard({
  name,
  birthDate,
  ward,
  stake,
  bio,
  photos,
  whatsapp,
}: ProfileCardProps) {
  const [currentPhoto, setCurrentPhoto] = useState(0)

  const nextPhoto = () => {
    setCurrentPhoto((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhoto((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const handleGreet = () => {
    if (whatsapp) {
      const message = encodeURIComponent(`Hola ${name.split(" ")[0]}! Te saludo desde Conexion FRIENDS.`)
      window.open(`https://wa.me/${whatsapp}?text=${message}`, "_blank")
    }
  }

  return (
    <Card className="overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Photo Carousel */}
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={photos[currentPhoto]}
          alt={`Foto de ${name}`}
          className="w-full h-full object-cover"
        />
        
        {/* Photo Navigation */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              aria-label="Siguiente foto"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            {/* Photo Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPhoto(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentPhoto ? "bg-white" : "bg-white/50"
                  }`}
                  aria-label={`Ir a foto ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <CardContent className="p-5">
        {/* Name and Birth Date (Locked) */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">{name}</h3>
            <Lock className="h-4 w-4 text-muted-foreground" aria-label="Campo protegido" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-3 w-3" aria-label="Campo protegido" />
            <span>{birthDate}</span>
          </div>
        </div>

        {/* Ward and Stake */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-turquoise" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              {ward}
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {stake}
            </Badge>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-foreground mb-2">Sobre mi</h4>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {bio}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleGreet}
            className="flex-1 bg-emerald hover:bg-emerald/90 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Me gustaria saludar
          </Button>
          {whatsapp && (
            <Button
              onClick={handleGreet}
              variant="outline"
              className="border-emerald text-emerald hover:bg-emerald/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
