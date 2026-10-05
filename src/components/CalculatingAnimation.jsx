import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Cpu, CheckCircle2, ShieldCheck, Trophy, Sparkles, Loader2 } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function CalculatingAnimation({
  topCount = 30,
  onComplete
}) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    { title: 'Conectando con registros de participantes...', sub: 'Extrayendo datos de planta y legajos' },
    { title: 'Auditando respuestas y criterios de inocuidad...', sub: 'Verificando aciertos y puntajes base' },
    { title: 'Calculando velocidad y precisión de respuesta...', sub: 'Aplicando algoritmos de desempate de tiempo' },
    { title: `Armando Podio de Honor y Top ${topCount} Clasificados...`, sub: 'Generando clasificación oficial Don Yeyo' }
  ];

  useEffect(() => {
    // Sonido inicial
    try {
      sounds.playCountdown();
    } catch (e) {}

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        // Incremento con variación para efecto orgánico de procesamiento gamer
        const increment = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(100, prev + increment);

        if (next >= 25 && next < 50) setCurrentStepIndex(1);
        else if (next >= 50 && next < 75) setCurrentStepIndex(2);
        else if (next >= 75) setCurrentStepIndex(3);

        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [topCount]);

  // Al llegar al 100%, disparar confeti y sonido de victoria
  useEffect(() => {
    if (progress === 100) {
      try {
        sounds.playVictory();
      } catch (e) {}

      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E5353B', '#f59e0b', '#0066ff', '#ffffff']
      });

      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-card p-8 sm:p-12 rounded-3xl border border-red-500/30 shadow-2xl relative overflow-hidden text-center">
        {/* Rayo de luz de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Ícono central Gamer de Procesamiento */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-red-600 to-yellow-500 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
              {progress < 100 ? (
                <Cpu size={40} className="text-yellow-400 animate-pulse" />
              ) : (
                <Trophy size={44} className="text-yellow-400 animate-bounce" />
              )}
            </div>
          </div>
        </div>

        {/* Título de Animación */}
        <h3 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase mb-1.5">
          {progress < 100 ? 'Calculando Clasificación' : '¡Clasificación Determinada!'}
        </h3>
        <p className="text-xs sm:text-sm text-yellow-300 font-bold mb-6 sm:mb-8">
          Semana de la Inocuidad 2026 • Don Yeyo
        </p>

        {/* Barra de Progreso Gamer */}
        <div className="w-full mb-6 sm:mb-8">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-2 px-1">
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Sparkles size={14} />
              <span>Procesando...</span>
            </span>
            <span className="font-mono text-white text-sm">{progress}%</span>
          </div>

          <div className="w-full h-4 bg-slate-900 rounded-full p-0.5 border border-white/20 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-yellow-300 transition-all duration-150 relative overflow-hidden shadow"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Lista de Pasos */}
        <div className="space-y-3.5 text-left mb-2">
          {steps.map((s, idx) => {
            const isDone = currentStepIndex > idx || progress === 100;
            const isCurrent = currentStepIndex === idx && progress < 100;

            return (
              <div
                key={idx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                  isDone
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : isCurrent
                    ? 'bg-white/10 border-yellow-400/50 text-white'
                    : 'bg-slate-900/30 border-white/5 text-slate-500 opacity-60'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 size={20} className="text-yellow-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold truncate">{s.title}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
