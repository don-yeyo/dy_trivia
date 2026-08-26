import React from 'react';
import { Play, Sparkles, Clock, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SplashIntro({ user, activePhase = 1, totalQuestions = 0, onStartGame }) {
  const handleStart = () => {
    sounds.playSelect();
    onStartGame();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-xl mx-auto w-full text-center z-10 animate-fade-in">
      {/* Logo Don Yeyo con animación de latido suave */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl p-3 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 shadow-2xl flex items-center justify-center animate-pulse-heart">
          <img 
            src="/favicon.svg" 
            alt="Don Yeyo Escudo" 
            className="w-full h-full object-contain filter drop-shadow-xl" 
          />
        </div>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Semana de la Inocuidad 2026</span>
        </div>
      </div>

      {/* Saludo Personalizado */}
      <div className="glass-panel p-6 w-full rounded-2xl mb-6 text-left border-t border-white/25">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center font-bold text-lg text-white shadow-inner">
            {user?.nombre?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="text-xs text-blue-200 font-semibold">¡Hola, bienvenido/a!</div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {user ? `${user.nombre} ${user.apellido}` : 'Colaborador Don Yeyo'}
            </h2>
            <div className="text-xs text-gray-300">Legajo: <span className="font-semibold text-white">{user?.legajo || 'Invitado'}</span></div>
          </div>
        </div>

        {/* Descripción de la Trivia */}
        <h3 className="text-base font-bold text-yellow-400 mb-2 flex items-center gap-2">
          <ShieldAlert size={18} />
          <span>Trivia de Inocuidad - Fase {activePhase}</span>
        </h3>
        <p className="text-sm text-gray-200 leading-relaxed mb-4">
          Pon a prueba tus conocimientos sobre Buenas Prácticas de Manufactura (BPM), inocuidad alimentaria y calidad en nuestros procesos productivos.
        </p>

        {/* Reglas del Juego */}
        <div className="space-y-2 text-xs text-gray-300 bg-black/20 p-3.5 rounded-xl border border-white/5">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-400 shrink-0 mt-0.5" />
            <span>Son <strong>{totalQuestions} preguntas</strong> sobre nuestros estándares de calidad e inocuidad.</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={15} className="text-yellow-400 shrink-0 mt-0.5" />
            <span>Al presionar <strong>Comenzar</strong> se iniciará el cronómetro. Responde con rapidez para sumar más puntos.</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldAlert size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span><strong>Uso único:</strong> Al finalizar o salir, esta fase quedará guardada y no podrás repetirla.</span>
          </div>
        </div>
      </div>

      {/* Botón de Inicio 3D Gaming */}
      <button 
        onClick={handleStart}
        className="btn-3d-primary w-full max-w-sm"
      >
        <Play size={20} className="fill-white" />
        <span>Comenzar Trivia</span>
      </button>
    </div>
  );
}
