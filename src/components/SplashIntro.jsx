import React from 'react';
import { Play, Zap, Clock, Lock, User } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SplashIntro({ user, totalQuestions = 0, onStartGame }) {
  const handleStart = () => {
    sounds.playSelect();
    onStartGame();
  };

  const fullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : 'Participante Demo';
  const legajoNumber = user?.legajo || '9999';

  return (
    <div className="w-full flex flex-col items-center justify-center text-center z-10 animate-casual-in">
      {/* Titular Principal H1 con margen inferior de 30px */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight filter drop-shadow-md" style={{ marginBottom: '30px' }}>
        Semana de la Inocuidad 2026
      </h1>

      {/* Tarjeta Principal Casual Gaming */}
      <div className="casual-card text-left">
        {/* Cabecera de Usuario: Avatar Circular MSN con Borde Marcado */}
        <div className="user-profile-header">
          <div className="user-avatar" title="Usuario">
            <User size={32} className="text-red-600 stroke-[2.3]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-red-600 uppercase tracking-wider mb-0.5">
              Bienvenido/a
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate leading-snug">
              {fullName}
            </h2>
            <div className="text-base text-slate-600 font-medium mt-0.5">
              Legajo: <span className="text-slate-800 font-bold">{legajoNumber}</span>
            </div>
          </div>
        </div>

        {/* Texto Instructivo Claro con 30px de margen inferior */}
        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal" style={{ marginBottom: '30px' }}>
          Poné a prueba tus conocimientos sobre Buenas Prácticas de Manufactura y los estándares de inocuidad de nuestros procesos en Don Yeyo.
        </p>

        {/* Lista de Items Instructivos */}
        <div className="instructions-container">
          <div className="instruction-row">
            <div className="instruction-icon-box bg-amber-100 text-amber-600 shadow-xs">
              <Zap size={20} />
            </div>
            <span className="text-base text-slate-800">
              <strong>{totalQuestions} preguntas</strong> sobre calidad e higiene operativa.
            </span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box bg-blue-100 text-blue-600 shadow-xs">
              <Clock size={20} />
            </div>
            <span className="text-base text-slate-800">
              Al presionar <strong>Comenzar</strong> se iniciará el cronómetro.
            </span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box bg-red-100 text-red-600 shadow-xs">
              <Lock size={20} />
            </div>
            <span className="text-base text-slate-800">
              <strong>Uso único:</strong> Cada trivia permite un solo intento por participante.
            </span>
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
