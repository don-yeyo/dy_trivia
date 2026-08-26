import React from 'react';
import { Play, Zap, Clock, Lock, Sparkles } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SplashIntro({ user, totalQuestions = 0, onStartGame }) {
  const handleStart = () => {
    sounds.playSelect();
    onStartGame();
  };

  const initialLetter = user?.nombre ? user.nombre.trim().charAt(0).toUpperCase() : 'P';
  const fullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : 'Participante Demo';
  const legajoNumber = user?.legajo || '9999';

  return (
    <div className="w-full flex flex-col items-center justify-center text-center z-10 animate-casual-in">
      {/* Insignia / Logotipo Centrado con animación suave */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-4 bg-white shadow-2xl flex items-center justify-center animate-soft-pulse border border-white/40">
          <img 
            src="/logo-donyeyo.svg" 
            alt="Don Yeyo Logo" 
            className="w-full h-full object-contain" 
          />
        </div>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md">
          <Sparkles size={15} className="text-yellow-300" />
          <span>Semana de la Inocuidad 2026</span>
        </div>
      </div>

      {/* Tarjeta Principal Casual Gaming con paddings y márgenes explícitos */}
      <div className="casual-card text-left">
        {/* Cabecera de Usuario: Avatar + Jerarquía de Nombre y Legajo */}
        <div className="user-profile-header">
          <div className="user-avatar">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
              Bienvenido/a
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate leading-snug">
              {fullName}
            </h2>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Legajo: <span className="text-slate-700 font-semibold">{legajoNumber}</span>
            </div>
          </div>
        </div>

        {/* Texto Instructivo Claro */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-2">
          Pon a prueba tus conocimientos sobre Buenas Prácticas de Manufactura (BPM) y los estándares de inocuidad en los procesos de Don Yeyo.
        </p>

        {/* Lista de Items Instructivos (Rayo, Reloj, Candado) */}
        <div className="instructions-container">
          <div className="instruction-row">
            <div className="instruction-icon-box bg-amber-100 text-amber-600 shadow-xs">
              <Zap size={18} />
            </div>
            <span><strong>{totalQuestions} preguntas</strong> sobre calidad e higiene operativa.</span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box bg-blue-100 text-blue-600 shadow-xs">
              <Clock size={18} />
            </div>
            <span>Al presionar <strong>Comenzar</strong> se iniciará el cronómetro.</span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box bg-red-100 text-red-600 shadow-xs">
              <Lock size={18} />
            </div>
            <span><strong>Uso único:</strong> Cada fase permite un solo intento por participante.</span>
          </div>
        </div>
      </div>

      {/* Botón Principal Protagonista Estilo Casual Gaming */}
      <button 
        onClick={handleStart}
        className="btn-casual-primary"
      >
        <Play size={22} className="fill-white" />
        <span>Comenzar Trivia</span>
      </button>
    </div>
  );
}
