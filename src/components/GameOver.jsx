import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, ShieldCheck, HeartHandshake, FileCheck } from 'lucide-react';
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

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-2 sm:py-6">
      {/* Insignia Trofeo */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-600 to-red-500 p-1 mb-6 shadow-2xl flex items-center justify-center">
        <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
          <FileCheck size={48} className="text-red-600" />
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
        ¡Trivia Completada!
      </h1>
      <p className="text-xl sm:text-2xl font-bold text-white leading-snug mb-8 sm:mb-9">
        {user?.nombre} {user?.apellido} <span className="text-yellow-300 font-semibold text-lg sm:text-xl block sm:inline">(Legajo: {user?.legajo || '9999'})</span>
      </p>

      {/* Tarjeta de Resumen Casual Gaming con tipografía >= 1rem */}
      <div className="casual-card text-left shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={24} className="text-red-600" />
            <span className="font-bold text-slate-800 text-lg sm:text-xl">Respuestas Registradas</span>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
            Guardado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <div className="text-sm text-slate-600 mb-1.5 flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Preguntas</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {totalQuestions} de {totalQuestions}
            </div>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <div className="text-sm text-slate-600 mb-1.5 flex items-center gap-1.5 font-medium">
              <Clock size={18} className="text-blue-500" />
              <span>Tiempo Total</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {Math.floor(totalTime / 60)}m {totalTime % 60}s
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/60 text-base text-amber-900 mb-4 flex items-start gap-3.5 leading-relaxed">
          <ShieldCheck size={22} className="text-amber-600 shrink-0 mt-0.5" />
          <p>
            Los puntajes y respuestas correctas serán publicados oficialmente al finalizar la etapa de evaluación de toda la planta.
          </p>
        </div>

        {/* Mensaje de Agradecimiento */}
        <div className="p-4 sm:p-5 rounded-2xl bg-red-50/80 border border-red-100 text-base text-slate-800 flex items-start gap-3.5 leading-relaxed">
          <HeartHandshake size={22} className="text-red-600 shrink-0 mt-0.5" />
          <p>
            ¡Muchas gracias por tu compromiso con las Buenas Prácticas y la inocuidad alimentaria en <strong>Don Yeyo</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
