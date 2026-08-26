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
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-4 sm:py-8">
      {/* Insignia Trofeo */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 p-1 mb-5 shadow-2xl flex items-center justify-center">
        <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
          <Award size={46} className="text-amber-500" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
        ¡Excelente Participación!
      </h1>
      <p className="text-sm sm:text-base text-slate-200 mb-6">
        {user?.nombre} {user?.apellido} (Legajo: {user?.legajo || '9999'})
      </p>

      {/* Tarjeta de Resumen Casual Gaming con espaciado holgado */}
      <div className="casual-card p-6 sm:p-9 w-full mb-6 text-left shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={22} className="text-red-600" />
            <span className="font-bold text-slate-800 text-lg">Trivia Completada</span>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-bold">
            Registrado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Award size={16} className="text-amber-500" />
              <span>Puntaje Total</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-500">{score} pts</div>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Aciertos</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {correctCount} / {totalQuestions} <span className="text-xs sm:text-sm font-normal text-slate-500">({percentage}%)</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 col-span-2">
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <Clock size={16} className="text-blue-500" />
              <span>Tiempo Invertido</span>
            </div>
            <div className="text-lg font-bold text-slate-700">
              {Math.floor(totalTime / 60)} min {totalTime % 60} seg
            </div>
          </div>
        </div>

        {/* Mensaje de Compromiso */}
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-100 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
          <HeartHandshake size={20} className="text-red-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            ¡Gracias por ser guardián de la calidad y la inocuidad alimentaria en cada proceso de <strong>Don Yeyo</strong>!
          </p>
        </div>
      </div>

      <div className="text-xs sm:text-sm text-slate-300">
        Tu participación ha quedado registrada correctamente.
      </div>
    </div>
  );
}
