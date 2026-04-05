"use client"

import Image from "next/image"

interface ConexionLogoProps {
  className?: string
  /** Ancho del logo en px. Por defecto 48 (móvil). */
  size?: number
}

export function ConexionLogo({ className = "", size = 48 }: ConexionLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="Conexion FRIENDS SUD"
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      <div className="flex flex-col">
        <span className="text-xl font-bold text-primary leading-tight">Conexion</span>
        <span className="text-sm font-semibold text-turquoise tracking-wider">FRIENDS</span>
      </div>
    </div>
  )
}
