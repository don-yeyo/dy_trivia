import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, Clock, ShieldCheck, HeartHandshake, RotateCcw } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function GameOver({
  user,
  score = 0,
  correctCount = 0,
  totalQuestions = 0,
  totalTime = 0,
  activePhase = 1
}) {
  useEffect(() => {
    sounds.playVictory();

    // Disparo de confeti Don Yeyo (Rojo, Azul, Dorado y Blanco)
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#e40521', '#0d2c5c', '#ffb800', '#ffffff']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#e40521', '#0d2c5c', '#ffb800', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const percentage = Math.round((correctCount / totalQuestions) * 100) || 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full text-center z-10 animate-bounce-in">
      {/* Insignia de Trofeo */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 p-1 mb-5 shadow-2xl shadow-yellow-500/30 flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-blue-950 flex items-center justify-center border-2 border-yellow-300">
          <Award size={48} className="text-yellow-400 animate-pulse" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
        ¡Excelente Participación!
      </h1>
      <p className="text-sm text-blue-200 mb-6">
        {user?.nombre} {user?.apellido} (Legajo: {user?.legajo})
      </p>

      {/* Tarjeta de Resumen de Resultados */}
      <div className="glass-panel p-6 w-full rounded-2xl mb-6 shadow-2xl border-t border-white/30 text-left">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-red-400" />
            <span className="font-bold text-white text-base">Fase {activePhase} Completada</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/40">
            Registrado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-card p-3 rounded-xl">
            <div className="text-xs text-gray-300 mb-1 flex items-center gap-1.5">
              <Award size={14} className="text-yellow-400" />
              <span>Puntaje Total</span>
            </div>
            <div className="text-xl font-extrabold text-yellow-400">{score} pts</div>
          </div>

          <div className="glass-card p-3 rounded-xl">
            <div className="text-xs text-gray-300 mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-400" />
              <span>Aciertos</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {correctCount} / {totalQuestions} <span className="text-xs font-normal text-gray-300">({percentage}%)</span>
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl col-span-2">
            <div className="text-xs text-gray-300 mb-1 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-300" />
              <span>Tiempo Invertido</span>
            </div>
            <div className="text-lg font-bold text-blue-200">
              {Math.floor(totalTime / 60)} min {totalTime % 60} seg
            </div>
          </div>
        </div>

        {/* Mensaje de Cultura de Inocuidad */}
        <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-400/30 text-xs text-blue-100 flex items-start gap-2.5">
          <HeartHandshake size={20} className="text-red-400 shrink-0 mt-0.5" />
          <p>
            ¡Gracias por ser guardián de la inocuidad y la calidad en cada uno de los productos de <strong>Don Yeyo</strong>! Tu compromiso hace la diferencia.
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Tu participación ha quedado guardada con fecha y hora. Podrás usar este mismo enlace cuando se habilite la siguiente fase.
      </div>
    </div>
  );
}
