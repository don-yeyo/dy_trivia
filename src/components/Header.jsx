import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function Header({ 
  soundMuted = false,
  onToggleSound = () => {}
}) {
  return (
    <header className="app-header">
      {/* Logo Oficial Don Yeyo */}
      <div className="flex items-center">
        <img 
          src="/logo-donyeyo.svg" 
          alt="Don Yeyo" 
          className="h-11 sm:h-13 w-auto object-contain filter drop-shadow-md transition-transform duration-200 hover:scale-105" 
        />
      </div>

      {/* Control de Sonido */}
      <div className="flex items-center">
        <button
          onClick={onToggleSound}
          className="casual-header-badge p-2.5 text-white/90 hover:text-white hover:bg-white/25 transition-all cursor-pointer"
          title={soundMuted ? "Activar Sonido" : "Silenciar"}
        >
          {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
