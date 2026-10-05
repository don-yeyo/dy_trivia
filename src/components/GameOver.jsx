import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, ShieldCheck, HeartHandshake, Award, Trophy } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function GameOver({
  user,
  totalQuestions = 0,
  answeredQuestions = 0,
  totalTime = 0,
  hideAnswered: propHideAnswered,
  hideTime: propHideTime,
  onViewClassification
}) {
  // Flags para ocultar métricas según configuración dinámica de Google Sheets
  const hideAnswered = Boolean(propHideAnswered);
  const showAnswered = !hideAnswered;

  const hideTime = Boolean(propHideTime);
  const showTime = !hideTime;

  const hasMetrics = showAnswered || showTime;
  const isSingleMetric = (showAnswered && !showTime) || (!showAnswered && showTime);

  useEffect(() => {
    sounds.playVictory();

    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#E5353B', '#0d2c5c', '#ffb800', '#ffffff']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#E5353B', '#0d2c5c', '#ffb800', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} seg.`;

  const handleClassificationClick = () => {
    if (onViewClassification) {
      onViewClassification();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'clasificacion');
      window.location.href = url.toString();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-3 sm:py-6 px-2 sm:px-4">
      {/* Emoji 👍 animado */}
      <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-md">
        👍
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight !mb-1.5 sm:!mb-2 leading-tight">
        ¡Trivia Completada!
      </h1>
      <p className="text-sm sm:text-base font-bold text-yellow-300 leading-snug mb-4 sm:mb-6">
        {user?.nombre} {user?.apellido} <span className="text-white font-semibold text-xs sm:text-sm block sm:inline">(Legajo: {user?.legajo || '9999'})</span>
      </p>

      {/* Tarjeta de Resumen Casual Gaming con espaciado balanceado sin scroll mobile */}
      <div id="card-resumen" className="casual-card text-left shadow-2xl w-full p-6 sm:p-8 rounded-3xl">
        {/* Encabezado de la Tarjeta Centrado */}
        <div className="flex items-center justify-center pb-3 sm:pb-3.5 mb-3.5 sm:mb-4 border-b border-slate-200/80 w-full text-center">
          <span className="font-black text-slate-950 text-base sm:text-xl tracking-tight">
            Resumen de Participación
          </span>
        </div>

        {/* Métricas Principales */}
        {hasMetrics && (
          <div className={`grid gap-3 sm:gap-4 mb-4 sm:mb-5 w-full ${isSingleMetric ? 'grid-cols-1 max-w-[240px] mx-auto' : 'grid-cols-2'}`}>
            {showAnswered && (
              <div id="card-metrica-preguntas" className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col items-center justify-center text-center shadow-sm">
                <CheckCircle2 size={28} className="text-emerald-600 mb-1.5 stroke-[2.5]" />
                <span className="text-[11px] sm:text-xs text-slate-600 font-bold mb-0.5">Respondidas</span>
                <div className="text-xl sm:text-2xl font-black text-slate-950 leading-none">
                  {answeredQuestions} de {totalQuestions}
                </div>
              </div>
            )}

            {showTime && (
              <div id="card-metrica-tiempo" className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col items-center justify-center text-center shadow-sm">
                <Clock size={28} className="text-blue-700 mb-1.5 stroke-[2.5]" />
                <span className="text-[11px] sm:text-xs text-slate-600 font-bold mb-0.5">Tiempo Total</span>
                <div className="text-xl sm:text-2xl font-black text-slate-950 leading-none">
                  {timeFormatted}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sección Informativa: Publicación de Resultados y acceso a Clasificación */}
        <div id="card-aviso-ranking" className="w-full pt-4 pb-3.5 sm:pb-4 text-xs sm:text-sm text-amber-950 flex flex-col gap-3 leading-snug border-t border-slate-200/80 mb-3.5 sm:mb-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-700 shrink-0 mt-0.5">
              <Award size={24} className="stroke-[2.5]" />
            </div>
            <div className="flex-1">
              <strong className="block text-xs sm:text-sm font-black text-amber-950 mb-0.5">Resultados y Ranking</strong>
              <span className="text-[11px] sm:text-xs text-amber-900 font-medium leading-relaxed">
                Los puntajes oficiales y el podio de clasificados se publicarán al finalizar la etapa de evaluación de toda la planta.
              </span>
            </div>
          </div>

          {/* Botón directo a consultar Podio y Clasificación */}
          <button
            onClick={handleClassificationClick}
            type="button"
            className="mt-2 w-full py-3.5 sm:py-4 px-5 min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Trophy size={18} className="text-slate-950" />
            <span>Consultar Clasificación y Podio</span>
          </button>
        </div>

        {/* Mensaje de Compromiso y Calidad Don Yeyo */}
        <div id="card-agradecimiento" className="w-full pt-3.5 sm:pt-4 text-xs sm:text-sm text-slate-900 flex items-start gap-3 leading-snug border-t border-slate-200/80">
          <div className="text-emerald-700 shrink-0 mt-0.5">
            <HeartHandshake size={22} className="stroke-[2.5]" />
          </div>
          <p className="flex-1 font-medium text-slate-900 text-[11px] sm:text-xs">
            ¡Muchas gracias por tu compromiso con las Buenas Prácticas de Manufactura e Inocuidad en <strong className="font-black text-red-600">Don Yeyo</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
