"use client"

import { useState } from "react"
import { ProfileCard } from "@/components/profile-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Users } from "lucide-react"

// Sample data for demonstration
const sampleMembers = [
  {
    id: 1,
    name: "Maria Garcia Lopez",
    birthDate: "15 de Marzo, 1995",
    ward: "Barrio Centro",
    stake: "Estaca Mexico Norte",
    bio: "Amo la musica, especialmente cantar en el coro. Disfruto las noches de hogar y servir en mi comunidad. Busco amistades sinceras que compartan mis valores.",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop",
    ],
    whatsapp: "525512345678",
  },
  {
    id: 2,
    name: "Carlos Martinez Ruiz",
    birthDate: "22 de Julio, 1992",
    ward: "Barrio Las Palmas",
    stake: "Estaca Mexico Norte",
    bio: "Ingeniero de profesion, misionero retornado de Peru. Me encanta el futbol y organizar actividades para los jovenes adultos solteros.",
    photos: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop",
    ],
    whatsapp: "525587654321",
  },
  {
    id: 3,
    name: "Ana Sofia Hernandez",
    birthDate: "8 de Diciembre, 1997",
    ward: "Barrio Valle Verde",
    stake: "Estaca Mexico Sur",
    bio: "Maestra de primaria y lider de las Mujeres Jovenes. Amo la naturaleza, las manualidades y preparar postres para las actividades del barrio.",
    photos: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop",
    ],
    whatsapp: "525598765432",
  },
  {
    id: 4,
    name: "Diego Alejandro Torres",
    birthDate: "3 de Enero, 1990",
    ward: "Barrio Reforma",
    stake: "Estaca Mexico Sur",
    bio: "Contador publico, amante de los libros y el estudio del evangelio. Busco personas con quienes compartir experiencias espirituales y amistades duraderas.",
    photos: [
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=300&fit=crop",
    ],
    whatsapp: "525543219876",
  },
  {
    id: 5,
    name: "Valentina Morales",
    birthDate: "19 de Agosto, 1994",
    ward: "Barrio Centro",
    stake: "Estaca Mexico Norte",
    bio: "Disenadora grafica y voluntaria en el templo. Me apasiona el arte, la fotografia y conocer nuevas culturas. Siempre lista para una buena platica.",
    photos: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=300&fit=crop",
    ],
    whatsapp: "525565432198",
  },
  {
    id: 6,
    name: "Roberto Sanchez Perez",
    birthDate: "27 de Abril, 1993",
    ward: "Barrio Las Palmas",
    stake: "Estaca Mexico Norte",
    bio: "Medico residente, sirvio mision en Argentina. Me gusta el senderismo, los deportes y las buenas conversaciones sobre el evangelio.",
    photos: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=300&fit=crop",
    ],
    whatsapp: "525578901234",
  },
]

const stakes = ["Todas las Estacas", "Estaca Mexico Norte", "Estaca Mexico Sur"]
const wards = ["Todos los Barrios", "Barrio Centro", "Barrio Las Palmas", "Barrio Valle Verde", "Barrio Reforma"]

export function ProfilePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStake, setSelectedStake] = useState("Todas las Estacas")
  const [selectedWard, setSelectedWard] = useState("Todos los Barrios")

  const filteredMembers = sampleMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.bio.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStake = selectedStake === "Todas las Estacas" || member.stake === selectedStake
    const matchesWard = selectedWard === "Todos los Barrios" || member.ward === selectedWard
    return matchesSearch && matchesStake && matchesWard
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary/90 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-turquoise" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">El Book</h1>
          </div>
          <p className="text-white/80 text-sm md:text-base">
            Directorio de Hermandad - Conoce a los miembros de tu comunidad
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-16 z-40 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre o intereses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stake Filter */}
            <Select value={selectedStake} onValueChange={setSelectedStake}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estaca" />
              </SelectTrigger>
              <SelectContent>
                {stakes.map((stake) => (
                  <SelectItem key={stake} value={stake}>
                    {stake}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ward Filter */}
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Barrio" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((ward) => (
                  <SelectItem key={ward} value={ward}>
                    {ward}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredMembers.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Mostrando {filteredMembers.length} miembro{filteredMembers.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <ProfileCard
                  key={member.id}
                  name={member.name}
                  birthDate={member.birthDate}
                  ward={member.ward}
                  stake={member.stake}
                  bio={member.bio}
                  photos={member.photos}
                  whatsapp={member.whatsapp}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron miembros
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros de busqueda
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
