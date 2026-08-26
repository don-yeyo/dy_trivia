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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6 max-w-lg mx-auto w-full text-center z-10 animate-casual-in">
      {/* Insignia / Logotipo Centrado con animación suave */}
      <div className="mb-4 flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-3 bg-white/95 shadow-xl flex items-center justify-center animate-soft-pulse">
          <img 
            src="/logo-donyeyo.svg" 
            alt="Don Yeyo Logo" 
            className="w-full h-full object-contain" 
          />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles size={13} className="text-yellow-300" />
          <span>Semana de la Inocuidad 2026</span>
        </div>
      </div>

      {/* Tarjeta Principal Casual Gaming (Limpia, Blanca, Soft Corners & Soft Shadows) */}
      <div className="casual-card p-6 sm:p-7 w-full mb-5 text-left">
        {/* Cabecera de Usuario: Avatar + Jerarquía de Nombre y Legajo */}
        <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-extrabold text-xl text-white shadow-md shadow-red-500/25 shrink-0">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Bienvenido/a
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate leading-snug">
              {fullName}
            </h2>
            <div className="text-xs text-slate-500 font-medium">
              Legajo: <span className="text-slate-700 font-semibold">{legajoNumber}</span>
            </div>
          </div>
        </div>

        {/* Texto Instructivo Claro */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4 font-normal">
          Pon a prueba tus conocimientos sobre Buenas Prácticas de Manufactura (BPM) y los estándares de inocuidad en los procesos de Don Yeyo.
        </p>

        {/* Lista de Items Instructivos (Rayo, Reloj, Candado) */}
        <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 mb-2">
          <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <Zap size={15} />
            </div>
            <span><strong>{totalQuestions} preguntas</strong> sobre calidad e higiene operativa.</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={15} />
            </div>
            <span>Al presionar <strong>Comenzar</strong> se iniciará el cronómetro.</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
            <div className="w-7 h-7 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
              <Lock size={15} />
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
        <Play size={20} className="fill-white" />
        <span>Comenzar Trivia</span>
      </button>
    </div>
  );
}
