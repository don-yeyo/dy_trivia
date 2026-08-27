import React from 'react';
import { Play, ArrowRight, Zap, Clock, Lock, User, CheckCircle } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function SplashIntro({
  user,
  totalQuestions = 0,
  pendingQuestionsCount = 0,
  isResuming = false,
  onStartGame
}) {
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
      <div id="card-bienvenida" className="casual-card text-left">
        {/* Cabecera de Usuario: Avatar Centrado en su propia línea */}
        <div className="user-profile-header flex flex-col items-center justify-center text-center border-0" style={{ marginBottom: '0px', paddingBottom: '0px', borderBottom: 'none' }}>
          <div className="user-avatar mx-auto mb-2" title="Usuario">
            <User size={36} className="text-red-600 stroke-[2.5]" />
          </div>
          <div className="min-w-0 text-center">
            <div className="text-lg font-black text-red-600 uppercase tracking-wider mb-0.5">
              {isResuming ? '¡Bienvenido/a de nuevo!' : '¡Bienvenido/a!'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 truncate leading-snug tracking-tight">
              {fullName}
            </h2>
            <div className="text-lg text-slate-700 font-semibold mt-0.5">
              Legajo: <span className="text-slate-950 font-black">{legajoNumber}</span>
            </div>
          </div>
        </div>

        {/* Lista de Items Instructivos Totalmente Transparente de Alto Contraste */}
        <div id="card-instrucciones" className="instructions-container">
          <div className="instruction-row">
            <div className="instruction-icon-box text-amber-500 shrink-0">
              {isResuming ? <CheckCircle size={26} className="stroke-[2.5] text-emerald-600" /> : <Zap size={26} className="stroke-[2.5]" />}
            </div>
            <span className="text-lg text-slate-900 font-medium">
              {isResuming ? (
                <>
                  Te {pendingQuestionsCount === 1 ? 'resta' : 'restan'} <strong className="text-slate-950 font-bold">{pendingQuestionsCount} {pendingQuestionsCount === 1 ? 'pregunta' : 'preguntas'}</strong> sobre calidad e higiene operativa.
                </>
              ) : (
                <>
                  <strong className="text-slate-950 font-bold">{totalQuestions} preguntas</strong> sobre calidad e higiene operativa.
                </>
              )}
            </span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box text-blue-600 shrink-0">
              <Clock size={26} className="stroke-[2.5]" />
            </div>
            <span className="text-lg text-slate-900 font-medium">
              Al presionar <strong className="text-slate-950 font-bold">{isResuming ? 'Continuar' : 'Comenzar'}</strong> se {isResuming ? 'reanudará el cronómetro' : 'iniciará el cronómetro'}.
            </span>
          </div>

          <div className="instruction-row">
            <div className="instruction-icon-box text-red-600 shrink-0">
              <Lock size={26} className="stroke-[2.5]" />
            </div>
            <span className="text-lg text-slate-900 font-medium">
              <strong className="text-slate-950 font-bold">Uso único:</strong> Cada pregunta permite un único intento por participante.
            </span>
          </div>
        </div>
      </div>

      {/* Botón Principal Protagonista Estilo Casual Gaming */}
      <button
        onClick={handleStart}
        className="btn-casual-primary"
      >
        {isResuming ? <ArrowRight size={22} className="text-white stroke-[3]" /> : <Play size={22} className="fill-white" />}
        <span>{isResuming ? 'Continuar Trivia' : 'Comenzar Trivia'}</span>
      </button>
    </div>
  );
}
