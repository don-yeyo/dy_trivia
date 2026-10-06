import React from 'react';
import { Trophy } from 'lucide-react';

export default function Header({
  onOpenClassification,
  currentView,
  isGameActive = false,
  isClassificationPublished = false
}) {
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

      {/* Botón de Clasificación: Solo visible cuando la clasificación está publicada,
          el participante no está en una partida activa y no está en admin ni en la propia clasificación */}
      {onOpenClassification &&
        isClassificationPublished &&
        !isGameActive &&
        currentView !== 'ADMIN' &&
        currentView !== 'PUBLIC_CLASSIFICATION' && (
          <button
            onClick={onOpenClassification}
            type="button"
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer border border-amber-400/50"
            title="Ver Podio y Clasificación Oficial"
          >
            <Trophy size={16} className="text-yellow-400" />
            <span>Ver Clasificación</span>
          </button>
      )}
    </header>
  );
}
