import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, ShieldCheck, HeartHandshake, Award } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function GameOver({
  user,
  totalQuestions = 0,
  answeredQuestions = 0,
  totalTime = 0
}) {
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

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-1 sm:py-4">
      {/* Emoji 👍 compacto */}
      <div className="text-4xl sm:text-5xl mb-1.5 sm:mb-2 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-md">
        👍
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
        ¡Trivia Completada!
      </h1>
      <p className="text-sm sm:text-base font-bold text-yellow-300 leading-snug mb-3 sm:mb-4">
        {user?.nombre} {user?.apellido} <span className="text-white font-semibold text-xs sm:text-sm block sm:inline">(Legajo: {user?.legajo || '9999'})</span>
      </p>

      {/* Tarjeta de Resumen Casual Gaming Compacta */}
      <div id="card-resumen" className="casual-card text-left shadow-2xl w-full">
        {/* Encabezado de la Tarjeta Centrado */}
        <div className="flex items-center justify-center pb-2 mb-3 border-b border-slate-200/60 w-full text-center">
          <span className="font-black text-slate-950 text-base sm:text-lg tracking-tight">
            Resumen de Participación
          </span>
        </div>

        {/* Métricas Principales en Grid de 2 Columnas */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 w-full">
          <div id="card-metrica-preguntas" className="p-1.5 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={26} className="text-emerald-600 mb-1 stroke-[2.5]" />
            <span className="text-xs sm:text-sm text-slate-700 font-bold mb-0.5">Respondidas</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-none">
              {answeredQuestions} de {totalQuestions}
            </div>
          </div>

          <div id="card-metrica-tiempo" className="p-1.5 flex flex-col items-center justify-center text-center">
            <Clock size={26} className="text-blue-700 mb-1 stroke-[2.5]" />
            <span className="text-xs sm:text-sm text-slate-700 font-bold mb-0.5">Tiempo Total</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-none">
              {timeFormatted}
            </div>
          </div>
        </div>

        {/* Sección Informativa: Publicación de Resultados */}
        <div id="card-aviso-ranking" className="w-full pt-2.5 pb-2 text-xs sm:text-sm text-amber-950 flex items-start gap-2.5 leading-snug border-t border-slate-200/50 mb-2.5">
          <div className="text-amber-700 shrink-0 mt-0.5">
            <Award size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <strong className="block text-xs sm:text-sm font-black text-amber-950 mb-0.5">Resultados y Ranking</strong>
            <span className="text-xs sm:text-sm text-amber-950 font-medium">Los puntajes y respuestas correctas se publicarán al finalizar la etapa de evaluación de toda la planta.</span>
          </div>
        </div>

        {/* Mensaje de Compromiso y Calidad Don Yeyo */}
        <div id="card-agradecimiento" className="w-full pt-2 text-xs sm:text-sm text-slate-900 flex items-start gap-2.5 leading-snug border-t border-slate-200/50">
          <div className="text-emerald-700 shrink-0 mt-0.5">
            <HeartHandshake size={20} className="stroke-[2.5]" />
          </div>
          <p className="text-xs sm:text-sm flex-1 font-medium text-slate-950">
            ¡Muchas gracias por tu compromiso con las Buenas Prácticas de Manufactura e Inocuidad en <strong className="font-black text-red-600">Don Yeyo</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
