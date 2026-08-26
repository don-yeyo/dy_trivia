import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function GameOver({
  user,
  score = 0,
  correctCount = 0,
  totalQuestions = 0,
  totalTime = 0
}) {
  useEffect(() => {
    sounds.playVictory();

    // Confeti de celebración
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

  const percentage = Math.round((correctCount / totalQuestions) * 100) || 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-lg mx-auto w-full text-center z-10 animate-casual-in">
      {/* Insignia Trofeo */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 p-1 mb-4 shadow-xl flex items-center justify-center">
        <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
          <Award size={40} className="text-amber-500" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
        ¡Excelente Participación!
      </h1>
      <p className="text-sm text-slate-200 mb-5">
        {user?.nombre} {user?.apellido} (Legajo: {user?.legajo || '9999'})
      </p>

      {/* Tarjeta de Resumen Casual Gaming */}
      <div className="casual-card p-6 w-full mb-5 text-left">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-red-600" />
            <span className="font-bold text-slate-800 text-base">Trivia Completada</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            Registrado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Award size={14} className="text-amber-500" />
              <span>Puntaje Total</span>
            </div>
            <div className="text-xl font-extrabold text-amber-500">{score} pts</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Aciertos</span>
            </div>
            <div className="text-xl font-extrabold text-slate-800">
              {correctCount} / {totalQuestions} <span className="text-xs font-normal text-slate-500">({percentage}%)</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 col-span-2">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Clock size={14} className="text-blue-500" />
              <span>Tiempo Total</span>
            </div>
            <div className="text-base font-bold text-slate-700">
              {Math.floor(totalTime / 60)} min {totalTime % 60} seg
            </div>
          </div>
        </div>

        {/* Mensaje de Compromiso */}
        <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-100 text-xs text-slate-700 flex items-start gap-2.5">
          <HeartHandshake size={18} className="text-red-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            ¡Gracias por ser guardián de la calidad y la inocuidad alimentaria en cada producto de <strong>Don Yeyo</strong>!
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-300">
        Tu participación ha quedado registrada correctamente.
      </div>
    </div>
  );
}
