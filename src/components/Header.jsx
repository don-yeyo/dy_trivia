import React from 'react';
import { Award, Clock, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function Header({ 
  activePhase = 1, 
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
    <header className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center justify-between z-20">
      {/* Logo corporativo Don Yeyo en la esquina superior */}
      <div className="flex items-center gap-3">
        <img 
          src="/logo-donyeyo.svg" 
          alt="Don Yeyo" 
          className="h-10 sm:h-12 object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105" 
        />
        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-1.5 bg-blue-900/60 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs text-blue-200 font-semibold">
            <ShieldCheck size={13} className="text-red-400" />
            <span>Fase {activePhase}</span>
          </div>
        </div>
      </div>

      {/* Métricas y Stats del Juego */}
      <div className="flex items-center gap-2 sm:gap-4">
        {isGameActive && (
          <>
            {/* Pregunta Actual */}
            <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/90">
              <span className="text-red-400">P</span>
              <span>{questionIndex + 1}/{totalQuestions}</span>
            </div>

            {/* Temporizador */}
            {showTimer && timeRemaining !== null && (
              <div className={`glass-panel px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-colors ${
                timeRemaining <= 10 ? 'text-red-400 border-red-500/50 animate-pulse' : 'text-white'
              }`}>
                <Clock size={15} className={timeRemaining <= 10 ? 'text-red-400 animate-spin' : 'text-yellow-400'} />
                <span>{timeRemaining}s</span>
              </div>
            )}

            {/* Puntaje */}
            <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold text-yellow-400 border-yellow-400/30">
              <Award size={15} className="text-yellow-400" />
              <span>{score} pts</span>
            </div>
          </>
        )}

        {/* Toggle de Sonido */}
        <button
          onClick={onToggleSound}
          className="glass-panel p-2 rounded-full text-white/80 hover:text-white hover:border-white/50 transition-all cursor-pointer"
          title={soundMuted ? "Activar Sonido" : "Silenciar"}
        >
          {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
