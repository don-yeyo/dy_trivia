import React from 'react';
import { Calendar, Info, RotateCcw, Trophy } from 'lucide-react';

export default function PhaseLocked({
  user,
  playedDate = null,
  isTokenInvalid = false,
  isPhaseClosed = false,
  phaseNumber = 1,
  allowReset = false,
  onResetSession
}) {
  const formattedDate = playedDate
    ? new Date(playedDate).toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
    : null;

  const handleReset = () => {
    if (onResetSession) {
      onResetSession();
    } else {
      localStorage.clear();
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-4 sm:py-8 px-2 sm:px-4">
      {/* Emoji en grande animado */}
      <div className="text-6xl sm:text-7xl mb-6 sm:mb-8 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-xl">
        {isTokenInvalid ? '⚠️' : isPhaseClosed ? '🏁' : '✋'}
      </div>

      {isTokenInvalid ? (
        <div className="casual-card text-center shadow-2xl w-full p-8 sm:p-12 rounded-3xl">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mb-4">
            Enlace No Válido
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed mb-6">
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de <strong className="text-red-600">Don Yeyo</strong>.
          </p>
        </div>
      ) : isPhaseClosed ? (
        <div className="casual-card text-center shadow-2xl w-full p-8 sm:p-12 rounded-3xl">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mb-3">
            Fase {phaseNumber} Finalizada
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed mb-6">
            ¡Hola <strong className="text-red-600 font-extrabold">{user?.nombre || 'Colaborador/a'}</strong>! El plazo para responder las preguntas de esta fase ha concluido oficialmente.
          </p>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium leading-relaxed mb-8 text-left flex items-start gap-3 shadow-inner">
            <Info size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              La Dirección de Calidad está consolidando las puntuaciones y los tiempos de toda la planta para determinar a los clasificados.
            </span>
          </div>

          {/* Botón para consultar Clasificación y Podio */}
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('view', 'clasificacion');
              window.location.href = url.toString();
            }}
            type="button"
            className="w-full py-4 px-6 min-h-[54px] rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Trophy size={20} className="text-slate-950" />
            <span>Consultar Clasificación y Podio</span>
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Trivia Ya Realizada
          </h1>
          <p className="text-base sm:text-xl font-bold text-yellow-300 leading-snug mb-6 sm:mb-8">
            ¡Hola <span className="text-white font-extrabold">{user?.nombre} {user?.apellido}</span>! Tu participación en esta trivia ya ha sido registrada exitosamente.
          </p>

          {/* Tarjeta de participación */}
          <div id="card-fase-bloqueada" className="casual-card text-left shadow-2xl p-6 sm:p-10 rounded-3xl w-full mb-6">
            <div className="flex items-center gap-3.5 text-base sm:text-lg text-slate-700 mb-5 pb-4 font-semibold border-b border-slate-200/80">
              <Calendar size={26} className="text-red-500 shrink-0" />
              <span>Fecha de registro: <strong className="text-slate-900">{formattedDate || 'Completado previamente'}</strong></span>
            </div>

            <div id="card-info-bloqueo" className="text-sm sm:text-base text-slate-700 flex items-start gap-3.5 leading-relaxed">
              <Info size={24} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                Para garantizar la transparencia y equidad del concurso, cada pregunta permite un único intento por participante.
              </span>
            </div>

            {/* Botón para consultar Clasificación y Podio */}
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('view', 'clasificacion');
                  window.location.href = url.toString();
                }}
                type="button"
                className="w-full py-4 px-6 min-h-[54px] rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Trophy size={20} className="text-slate-950" />
                <span>Consultar Clasificación y Podio</span>
              </button>
            </div>
          </div>

          {/* Botón para reiniciar intento visible SOLO en modo de prueba */}
          {allowReset && (
            <button
              onClick={handleReset}
              className="btn-casual-primary max-w-sm mb-4 mt-2"
            >
              <RotateCcw size={20} className="text-white" />
              <span>Reiniciar Trivia (Modo Prueba)</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
