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
      <p className="text-xl sm:text-2xl font-bold text-yellow-300 leading-snug" style={{ marginBottom: '30px' }}>
        {user?.nombre} {user?.apellido} <span className="text-white font-semibold text-lg sm:text-xl block sm:inline">(Legajo: {user?.legajo || '9999'})</span>
      </p>

      {/* Tarjeta de Resumen Casual Gaming Organizada con Padding Simétrico */}
      <div id="card-resumen" className="casual-card text-left shadow-2xl w-full" style={{ paddingLeft: '20px' }}>
        {/* Encabezado de la Tarjeta Centrado */}
        <div className="flex items-center justify-center pb-4 border-b border-slate-100 w-full" style={{ marginBottom: '20px' }}>
          <div className="flex items-center justify-center gap-2.5 text-center">

            <span className="font-bold text-slate-800 text-lg sm:text-xl">Resumen de Participación</span>
          </div>
        </div>

        {/* Métricas Principales en Grid de 2 Columnas Centradas */}
        <div className="grid grid-cols-2 gap-4 mb-6 w-full">
          <div id="card-metrica-preguntas" className="bg-white/20 p-4 sm:p-5 rounded-2xl border border-white/40 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={32} className="text-emerald-600 mb-2" />
            <span className="text-base text-slate-700 font-semibold mb-1.5">Preguntas</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {totalQuestions} de {totalQuestions}
            </div>
          </div>

          <div id="card-metrica-tiempo" className="bg-white/20 p-4 sm:p-5 rounded-2xl border border-white/40 flex flex-col items-center justify-center text-center">
            <Clock size={32} className="text-blue-600 mb-2" />
            <span className="text-base text-slate-700 font-semibold mb-1.5">Tiempo Total</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {timeFormatted}
            </div>
          </div>
        </div>

        {/* Sección Informativa: Publicación de Resultados */}
        <div id="card-aviso-ranking" className="w-full p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-base text-amber-950 flex items-start gap-3.5 leading-relaxed" style={{ marginBottom: '20px', marginTop: '20px' }}>
          <div className="w-10 h-10 min-w-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <Award size={26} />
          </div>
          <div className="flex-1">
            <strong className="block text-lg font-bold mb-0.5">Resultados y Ranking</strong>
            <span className="text-lg">Los puntajes y respuestas correctas se publicarán al finalizar la etapa de evaluación de toda la planta.</span>
          </div>
        </div>

        {/* Mensaje de Compromiso y Calidad Don Yeyo */}
        <div id="card-agradecimiento" className="w-full p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-base text-slate-800 flex items-start gap-3.5 leading-relaxed">
          <div className="w-10 h-10 min-w-10 rounded-xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <HeartHandshake size={26} />
          </div>
          <p className="text-lg flex-1">
            ¡Muchas gracias por tu compromiso con las Buenas Prácticas de Manufactura e Inocuidad en <strong>Don Yeyo</strong>!
          </p>
        </div>
      </div>
    </div >
  );
}
