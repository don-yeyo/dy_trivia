import React from 'react';
import { Trophy } from 'lucide-react';

export default function Header({ onOpenClassification, currentView }) {
  return (
    <header className="app-header">
      {/* Logo Oficial Don Yeyo */}
      <div className="flex items-center">
        <img 
          src="/logo-donyeyo.svg" 
          alt="Don Yeyo" 
          className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-md animate-logo-heartbeat" 
        />
      </div>

      {/* Botón de Clasificación Pública */}
      {onOpenClassification && currentView !== 'PUBLIC_CLASSIFICATION' && currentView !== 'ADMIN' && (
        <button
          onClick={onOpenClassification}
          type="button"
          className="px-3 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer border border-yellow-400/40"
          title="Ver Podio y Clasificación"
        >
          <Trophy size={16} className="text-yellow-400" />
          <span className="hidden sm:inline">Clasificación</span>
        </button>
      )}
    </header>
  );
}
