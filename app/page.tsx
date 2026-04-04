"use client"

import { useState } from "react"
import { ConexionLogo } from "@/components/conexion-logo"
import { AuthForm } from "@/components/auth-form"
import { ProfilePage } from "@/components/profile-page"
import { WallPage } from "@/components/wall-page"
import { Navigation } from "@/components/navigation"
import { Users, Heart, Shield } from "lucide-react"

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState<"profile" | "wall">("wall")

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} onLogout={() => setIsLoggedIn(false)} />
        <main className="pt-16">
          {currentPage === "wall" && <WallPage />}
          {currentPage === "profile" && <ProfilePage />}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Two Column Layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Branding & Image */}
        <div className="relative lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/90 flex flex-col justify-center items-center p-8 lg:p-12 text-white">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-turquoise/30 blur-3xl" />
            <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gold/30 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald/20 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-lg text-center lg:text-left">
            <ConexionLogo className="mb-8 justify-center lg:justify-start [&_span]:text-white [&_.text-turquoise]:text-turquoise" />

            <h1 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight text-balance">
              Un sitio para conectar a la manera SUD
            </h1>

            <p className="text-lg lg:text-xl text-white/90 mb-8 leading-relaxed">
              Aqui cuidamos tu privacidad y fomentamos la amistad sana. Nuestros corazones estan entretejidos con unidad y amor.
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
                <div className="p-2 bg-turquoise rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Privacidad Protegida</p>
                  <p className="text-sm text-white/80">Tu informacion siempre segura</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
                <div className="p-2 bg-emerald rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Comunidad Autentica</p>
                  <p className="text-sm text-white/80">Conecta con hermanos y hermanas</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
                <div className="p-2 bg-gold rounded-lg">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Amistades Sinceras</p>
                  <p className="text-sm text-white/80">Sin algoritmos, solo conexiones reales</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative bottom wave for mobile */}
          <div className="absolute bottom-0 left-0 right-0 h-16 lg:hidden">
            <svg
              viewBox="0 0 1440 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M0 50C200 80 400 20 720 50C1040 80 1240 20 1440 50V100H0V50Z"
                className="fill-background"
              />
            </svg>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-md">
            <AuthForm onSuccess={() => setIsLoggedIn(true)} />

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Al registrarte, aceptas nuestros{" "}
              <a href="#" className="text-primary hover:underline">
                Terminos de Servicio
              </a>{" "}
              y{" "}
              <a href="#" className="text-primary hover:underline">
                Politica de Privacidad
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
