import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, ShieldCheck, HeartHandshake, Award } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function GameOver({
  user,
  totalQuestions = 0,
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
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} segundos`;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-2 sm:py-6">
      {/* Emoji 👍 en grande con animación de pulso */}
      <div className="text-6xl sm:text-7xl mb-6 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-lg">
        👍
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ marginBottom: '12px' }}>
        ¡Trivia Completada!
      </h1>
      <p className="text-xl sm:text-2xl font-bold text-white leading-snug" style={{ marginBottom: '30px' }}>
        {user?.nombre} {user?.apellido} <span className="text-yellow-300 font-semibold text-lg sm:text-xl block sm:inline">(Legajo: {user?.legajo || '9999'})</span>
      </p>

      {/* Tarjeta de Resumen Casual Gaming Organizada */}
      <div className="casual-card text-left shadow-2xl">
        {/* Encabezado de la Tarjeta */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <span className="font-bold text-slate-800 text-lg sm:text-xl">Resumen de Participación</span>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Registrado
          </span>
        </div>

        {/* Métricas Principales en Grid de 2 Columnas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="text-sm text-slate-600 mb-2 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Preguntas</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {totalQuestions} de {totalQuestions}
            </div>
          </div>

          <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="text-sm text-slate-600 mb-2 flex items-center gap-1.5 font-semibold">
              <Clock size={18} className="text-blue-600" />
              <span>Tiempo Invertido</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {timeFormatted}
            </div>
          </div>
        </div>

        {/* Sección Informativa: Publicación de Resultados */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/70 text-base text-amber-950 mb-5 flex items-start gap-3.5 leading-relaxed">
          <div className="w-8 h-8 min-w-8 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <Award size={18} />
          </div>
          <div>
            <strong className="block text-amber-900 font-bold mb-0.5">Resultados y Ranking</strong>
            <span>Los puntajes y respuestas correctas se publicarán al finalizar la etapa de evaluación de toda la planta.</span>
          </div>
        </div>

        {/* Mensaje de Compromiso y Calidad Don Yeyo */}
        <div className="p-4 sm:p-5 rounded-2xl bg-red-50/90 border border-red-100 text-base text-slate-800 flex items-start gap-3.5 leading-relaxed">
          <div className="w-8 h-8 min-w-8 rounded-xl bg-red-200/70 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
            <HeartHandshake size={18} />
          </div>
          <p>
            ¡Muchas gracias por tu compromiso con las Buenas Prácticas de Manufactura y la inocuidad en <strong>Don Yeyo</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
