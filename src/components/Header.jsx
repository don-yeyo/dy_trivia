import React from 'react';
import { Award, Clock, Volume2, VolumeX } from 'lucide-react';

export default function Header({ 
  score = 0, 
  questionIndex = 0, 
  totalQuestions = 0,
  timeRemaining = null,
  showTimer = false,
  soundMuted = false,
  onToggleSound = () => {},
  isGameActive = false
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

      {/* Métricas y Stats del Juego */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isGameActive && (
          <>
            {/* Pregunta Actual */}
            <div className="casual-header-badge flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-red-400 font-bold">P</span>
              <span>{questionIndex + 1}/{totalQuestions}</span>
            </div>

            {/* Temporizador */}
            {showTimer && timeRemaining !== null && (
              <div className={`casual-header-badge flex items-center gap-1.5 text-xs sm:text-sm ${
                timeRemaining <= 10 ? 'text-red-300 border-red-400/50 animate-pulse' : 'text-white'
              }`}>
                <Clock size={15} className={timeRemaining <= 10 ? 'text-red-400' : 'text-yellow-300'} />
                <span>{timeRemaining}s</span>
              </div>
            )}

            {/* Puntaje */}
            <div className="casual-header-badge flex items-center gap-1.5 text-xs sm:text-sm text-yellow-300 border-yellow-400/30">
              <Award size={15} className="text-yellow-400" />
              <span>{score} pts</span>
            </div>
          </>
        )}

        {/* Toggle de Sonido */}
        <button
          onClick={onToggleSound}
          className="casual-header-badge p-2.5 text-white/90 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
          title={soundMuted ? "Activar Sonido" : "Silenciar"}
        >
          {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
