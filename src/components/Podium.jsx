import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Crown, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export default function Podium({ podiumUsers = [], isAnimatedReveal = false }) {
  if (!podiumUsers || podiumUsers.length === 0) return null;

  const firstPlace = podiumUsers[0];
  const secondPlace = podiumUsers[1];
  const thirdPlace = podiumUsers[2];

  // Estado para la revelación progresiva cinematográfica (3° -> 2° -> 1°)
  // Si no es revelación animada, se muestran todos de inmediato (step = 3)
  const [revealStep, setRevealStep] = useState(isAnimatedReveal ? 0 : 3);

  useEffect(() => {
    if (!isAnimatedReveal) {
      setRevealStep(3);
      return;
    }

    setRevealStep(0);

    // Paso 1: Revelar 3° puesto (Bronce) a los 400ms
    const t1 = setTimeout(() => {
      setRevealStep(1);
      try { sounds.playOptionClick(); } catch (e) {}
    }, 500);

    // Paso 2: Revelar 2° puesto (Plata) a los 1600ms
    const t2 = setTimeout(() => {
      setRevealStep(2);
      try { sounds.playOptionClick(); } catch (e) {}
    }, 1800);

    // Paso 3: Revelar 1° puesto (Oro) a los 3200ms con Gran Fanfarria y Confeti
    const t3 = setTimeout(() => {
      setRevealStep(3);
      try { sounds.playVictory(); } catch (e) {}

      // Lluvia de confeti de campeones
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#E5353B', '#FFFFFF', '#0066FF']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.6 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 }
        });
      }, 400);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isAnimatedReveal, podiumUsers]);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getInitials = (nombre = '', apellido = '') => {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${n}${a}` || 'DY';
  };

  const showThird = revealStep >= 1;
  const showSecond = revealStep >= 2;
  const showFirst = revealStep >= 3;

  return (
    <div className="w-full max-w-5xl mx-auto pt-4 sm:pt-6 pb-12 sm:pb-16 px-3 sm:px-6">
      {/* Título de Sección Podio con margen inferior amplio y holgado */}
      <div className="flex items-center justify-center gap-3 mb-10 sm:mb-14">
        <Sparkles size={28} className="text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide uppercase drop-shadow-xl text-center">
          Podio de Honor | Inocuidad 2026
        </h2>
        <Sparkles size={28} className="text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
      </div>

      {/* Grid del Podio Gamer (2° - 1° - 3°) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-8 items-end max-w-4xl mx-auto pt-6 sm:pt-8">

        {/* ================= 2° PUESTO (PLATA) ================= */}
        <div className="flex flex-col items-center order-1 w-full">
          {showSecond ? (
            <div className="w-full flex flex-col items-center animate-casual-in">
              {/* Avatar con aura plateada */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-white p-1 shadow-xl shadow-slate-400/40 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-100 font-black text-base sm:text-2xl border-2 border-slate-300">
                  {getInitials(secondPlace?.nombre, secondPlace?.apellido)}
                </div>
              </div>

              {/* Badge de Medalla con espacio propio (sin solapamiento) */}
              <div className="mt-2.5 mb-2.5 px-3 py-1 rounded-full bg-gradient-to-r from-slate-300 via-white to-slate-300 border border-slate-400 text-slate-900 text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 shrink-0">
                <Medal size={15} className="text-slate-700" />
                <span>2° PLATA</span>
              </div>

              {/* Nombre y Legajo con separación despejada */}
              <div className="text-center w-full px-1 mb-4 min-h-[46px] flex flex-col justify-center">
                <h4 className="text-xs sm:text-base font-black text-white truncate drop-shadow-md leading-tight">
                  {secondPlace ? `${secondPlace.nombre} ${secondPlace.apellido}` : 'Vacante'}
                </h4>
                <span className="text-[11px] sm:text-xs text-slate-300 font-semibold block mt-1">
                  Legajo {secondPlace?.legajo || '----'}
                </span>
              </div>

              {/* Pedestal Plateado */}
              <div className="w-full h-44 sm:h-60 md:h-68 rounded-t-3xl bg-gradient-to-b from-slate-300 via-slate-400 to-slate-700 p-3.5 sm:p-5 flex flex-col items-center justify-between shadow-2xl border-t-4 border-slate-200">
                <div className="flex flex-col items-center gap-1 mt-1 text-slate-950 font-black">
                  <Trophy size={28} className="text-slate-800 drop-shadow sm:w-9 sm:h-9" />
                  <span className="text-sm sm:text-xl tracking-tight font-black">PLATA</span>
                </div>
                <div className="w-full bg-slate-900/85 rounded-2xl p-2.5 sm:p-3.5 text-center text-white backdrop-blur-md border border-slate-400/30 shadow-lg">
                  <div className="text-sm sm:text-lg font-black text-yellow-300">
                    {secondPlace?.score || 0} pts
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-300 flex items-center justify-center gap-1 mt-1 font-mono">
                    <Clock size={12} />
                    <span>{formatTime(secondPlace?.totalTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Placeholder en espera de revelación */
            <div className="w-full h-56 sm:h-80 rounded-t-3xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center text-slate-400 text-xs font-bold animate-pulse">
              2° Puesto...
            </div>
          )}
        </div>

        {/* ================= 1° PUESTO (ORO / CAMPEÓN) ================= */}
        <div className="flex flex-col items-center order-2 w-full z-10">
          {showFirst ? (
            <div className="w-full flex flex-col items-center animate-casual-in">
              {/* Corona animada arriba del avatar */}
              <div className="mb-2">
                <Crown size={40} className="text-yellow-400 animate-bounce drop-shadow-xl sm:w-12 sm:h-12" />
              </div>

              {/* Avatar dorado imponente */}
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-white p-1.5 shadow-2xl shadow-yellow-500/60 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-yellow-400 font-black text-lg sm:text-3xl border-2 border-yellow-400">
                  {getInitials(firstPlace?.nombre, firstPlace?.apellido)}
                </div>
              </div>

              {/* Badge de Campeón con espacio propio (sin tapar el nombre) */}
              <div className="mt-2.5 mb-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 border-2 border-yellow-500 text-slate-950 text-xs sm:text-sm font-black shadow-xl flex items-center gap-1.5 shrink-0">
                <Trophy size={16} className="text-amber-800" />
                <span>1° CAMPEÓN</span>
              </div>

              {/* Nombre y Legajo nítido y 100% visible */}
              <div className="text-center w-full px-1 mb-4 min-h-[50px] flex flex-col justify-center">
                <h4 className="text-sm sm:text-xl font-black text-yellow-300 truncate drop-shadow-xl leading-tight">
                  {firstPlace ? `${firstPlace.nombre} ${firstPlace.apellido}` : 'Vacante'}
                </h4>
                <span className="text-xs sm:text-sm text-white/90 font-bold block mt-1">
                  Legajo {firstPlace?.legajo || '----'}
                </span>
              </div>

              {/* Pedestal Dorado más alto */}
              <div className="w-full h-56 sm:h-76 md:h-88 rounded-t-3xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-700 p-4 sm:p-6 flex flex-col items-center justify-between shadow-2xl border-t-4 border-yellow-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/25 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center gap-1 mt-1 text-slate-950 font-black">
                  <Crown size={36} className="text-amber-950 drop-shadow sm:w-12 sm:h-12" />
                  <span className="text-lg sm:text-3xl tracking-tight font-black">ORO</span>
                </div>
                <div className="w-full bg-slate-950/90 rounded-2xl p-3 sm:p-4 text-center text-white backdrop-blur-md border border-yellow-400/50 shadow-xl">
                  <div className="text-base sm:text-2xl font-black text-yellow-300">
                    {firstPlace?.score || 0} pts
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 flex items-center justify-center gap-2 mt-1 font-mono">
                    <Clock size={14} className="text-yellow-400" />
                    <span>{formatTime(firstPlace?.totalTime)}</span>
                    <span className="text-yellow-400/60">•</span>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{firstPlace?.correctCount || 0} aciertos</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Placeholder en espera de revelación */
            <div className="w-full h-64 sm:h-96 rounded-t-3xl border-2 border-dashed border-yellow-400/30 bg-yellow-500/5 flex items-center justify-center text-yellow-300 text-xs font-bold animate-pulse">
              1° Puesto Campeón...
            </div>
          )}
        </div>

        {/* ================= 3° PUESTO (BRONCE) ================= */}
        <div className="flex flex-col items-center order-3 w-full">
          {showThird ? (
            <div className="w-full flex flex-col items-center animate-casual-in">
              {/* Avatar con aura de bronce */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-700 via-amber-400 to-amber-200 p-1 shadow-xl shadow-amber-700/40 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-200 font-black text-base sm:text-2xl border-2 border-amber-500">
                  {getInitials(thirdPlace?.nombre, thirdPlace?.apellido)}
                </div>
              </div>

              {/* Badge de Medalla con espacio propio (sin solapamiento) */}
              <div className="mt-2.5 mb-2.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 border border-amber-600 text-slate-950 text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 shrink-0">
                <Medal size={15} className="text-amber-900" />
                <span>3° BRONCE</span>
              </div>

              {/* Nombre y Legajo sin obstrucción */}
              <div className="text-center w-full px-1 mb-4 min-h-[46px] flex flex-col justify-center">
                <h4 className="text-xs sm:text-base font-black text-white truncate drop-shadow-md leading-tight">
                  {thirdPlace ? `${thirdPlace.nombre} ${thirdPlace.apellido}` : 'Vacante'}
                </h4>
                <span className="text-[11px] sm:text-xs text-slate-300 font-semibold block mt-1">
                  Legajo {thirdPlace?.legajo || '----'}
                </span>
              </div>

              {/* Pedestal Cobrizo */}
              <div className="w-full h-36 sm:h-52 md:h-60 rounded-t-3xl bg-gradient-to-b from-amber-500 via-amber-600 to-amber-900 p-3.5 sm:p-5 flex flex-col items-center justify-between shadow-2xl border-t-4 border-amber-300">
                <div className="flex flex-col items-center gap-1 mt-1 text-slate-950 font-black">
                  <Trophy size={26} className="text-amber-950 drop-shadow sm:w-8 sm:h-8" />
                  <span className="text-sm sm:text-lg tracking-tight font-black text-white">BRONCE</span>
                </div>
                <div className="w-full bg-slate-900/85 rounded-2xl p-2.5 sm:p-3.5 text-center text-white backdrop-blur-md border border-amber-400/30 shadow-lg">
                  <div className="text-sm sm:text-lg font-black text-yellow-300">
                    {thirdPlace?.score || 0} pts
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-300 flex items-center justify-center gap-1 mt-1 font-mono">
                    <Clock size={11} />
                    <span>{formatTime(thirdPlace?.totalTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Placeholder en espera de revelación */
            <div className="w-full h-48 sm:h-72 rounded-t-3xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center text-slate-400 text-xs font-bold animate-pulse">
              3° Puesto...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
