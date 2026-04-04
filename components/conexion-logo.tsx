"use client"

export function ConexionLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Connected Hands Icon with Light */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          {/* Left hand */}
          <path
            d="M12 28C10 26 8 24 8 21C8 18 10 16 13 16C15 16 17 17 18 19L20 22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Right hand */}
          <path
            d="M36 28C38 26 40 24 40 21C40 18 38 16 35 16C33 16 31 17 30 19L28 22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Connection - hands meeting */}
          <path
            d="M18 22C18 22 21 28 24 28C27 28 30 22 30 22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Light in center */}
          <circle
            cx="24"
            cy="24"
            r="4"
            className="fill-gold"
            style={{ filter: "drop-shadow(0 0 4px rgba(255, 200, 50, 0.6))" }}
          />
          {/* Light rays */}
          <path
            d="M24 16V18M24 30V32M18 24H16M32 24H30M19.5 19.5L20.5 20.5M28.5 28.5L27.5 27.5M28.5 19.5L27.5 20.5M19.5 28.5L20.5 27.5"
            className="stroke-gold"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-primary leading-tight">Conexion</span>
        <span className="text-sm font-semibold text-turquoise tracking-wider">FRIENDS</span>
      </div>
    </div>
  )
}
