import React from 'react';
import { Calendar, Info, RotateCcw, Trophy } from 'lucide-react';

export default function PhaseLocked({
  user,
  playedDate = null,
  isTokenInvalid = false,
  isPhaseClosed = false,
  isClassificationPublished = false,
  phaseNumber = 1,
  allowReset = false,
  onResetSession,
  onViewClassification
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

  const handleGoToClassification = () => {
    if (onViewClassification) {
      onViewClassification();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'clasificacion');
      window.location.href = url.toString();
    }
  };

  const isCulminada = isPhaseClosed || isClassificationPublished;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-4 sm:py-8 px-2 sm:px-4">
      {/* Emoji en grande animado */}
      <div className="text-6xl sm:text-7xl mb-6 sm:mb-8 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-xl">
        {isTokenInvalid ? '⚠️' : isClassificationPublished ? '🏆' : isPhaseClosed ? '🏁' : '✋'}
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
      ) : isCulminada ? (
        <div className="casual-card text-center shadow-2xl w-full p-8 sm:p-12 rounded-3xl border-2 border-amber-300/80">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider mb-4">
            <Trophy size={14} className="text-amber-700" />
            <span>{isClassificationPublished ? 'Resultados Publicados' : 'Jornada Concluida'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mb-3">
            Fase {phaseNumber} Culminada
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed mb-6">
            ¡Hola <strong className="text-red-600 font-extrabold">{user?.nombre ? `${user.nombre} ${user.apellido || ''}` : 'Colaborador/a'}</strong>! {isClassificationPublished
              ? 'La clasificación oficial de esta fase ya ha sido publicada y los resultados del podio y clasificados están disponibles.'
              : 'El plazo para responder las preguntas de esta fase ha concluido oficialmente.'}
          </p>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium leading-relaxed mb-8 text-left flex items-start gap-3 shadow-inner">
            <Info size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isClassificationPublished
                ? 'Ya no es posible realizar la trivia para esta fase. Puedes consultar a los clasificados oficiales y el podio de honor en la pantalla de resultados.'
                : 'La Dirección de Calidad está consolidando las puntuaciones y los tiempos de toda la planta para determinar a los clasificados.'}
            </span>
          </div>

          {/* Botón para consultar Clasificación y Podio */}
          <button
            onClick={handleGoToClassification}
            type="button"
            className="w-full py-4 px-6 min-h-[54px] rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer border-2 border-white"
          >
            <Trophy size={20} className="text-slate-950" />
            <span>Ver Clasificación y Podio Oficial</span>
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
