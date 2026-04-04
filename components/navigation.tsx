"use client"

import { ConexionLogo } from "@/components/conexion-logo"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"

interface NavigationProps {
  currentPage: "profile" | "wall"
  onNavigate: (page: "profile" | "wall") => void
  onLogout: () => void
}

export function Navigation({ currentPage, onNavigate, onLogout }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <ConexionLogo className="[&_span]:text-white [&_.text-turquoise]:text-turquoise" />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant={currentPage === "wall" ? "secondary" : "ghost"}
              onClick={() => onNavigate("wall")}
              className={currentPage === "wall" 
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "text-white/80 hover:text-white hover:bg-white/10"
              }
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Muro Espiritual
            </Button>
            <Button
              variant={currentPage === "profile" ? "secondary" : "ghost"}
              onClick={() => onNavigate("profile")}
              className={currentPage === "profile" 
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "text-white/80 hover:text-white hover:bg-white/10"
              }
            >
              <Users className="h-4 w-4 mr-2" />
              El Book
            </Button>
            <div className="w-px h-8 bg-white/20 mx-2" />
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  onNavigate("wall")
                  setMobileMenuOpen(false)
                }}
                className={`justify-start ${
                  currentPage === "wall"
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Muro Espiritual
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onNavigate("profile")
                  setMobileMenuOpen(false)
                }}
                className={`justify-start ${
                  currentPage === "profile"
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                El Book
              </Button>
              <div className="h-px bg-white/10 my-2" />
              <Button
                variant="ghost"
                onClick={onLogout}
                className="justify-start text-white/80 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
