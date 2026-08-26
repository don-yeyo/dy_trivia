import React from 'react';
import { Lock, AlertTriangle, Calendar, Info, RotateCcw } from 'lucide-react';

export default function PhaseLocked({
  user,
  playedDate = null,
  isTokenInvalid = false,
  onResetSession
}) {
  const formattedDate = playedDate
    ? new Date(playedDate).toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
    : null;

  const handleReset = () => {
    if (onResetSession) {
      onResetSession();
    } else {
      localStorage.clear();
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-2 sm:py-6">
      {/* Icono de Candado / Alerta */}
      <div className="w-20 h-20 rounded-3xl p-4 bg-white shadow-2xl mb-6 flex items-center justify-center border border-white/40">
        {isTokenInvalid ? (
          <AlertTriangle size={38} className="text-amber-500" />
        ) : (
          <Lock size={38} className="text-red-500" />
        )}
      </div>

      {isTokenInvalid ? (
        <>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Enlace No Válido
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-white leading-snug mb-8 sm:mb-9">
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de Don Yeyo.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Trivia Ya Realizada
          </h1>
          {/* Mismo estilo visual que el H1 */}
          <p className="text-xl sm:text-2xl font-bold text-white leading-snug mb-8 sm:mb-9">
            ¡Hola <span className="text-yellow-300 font-extrabold">{user?.nombre} {user?.apellido}</span>! Tu participación en esta fase ya ha sido registrada exitosamente.
          </p>

          {/* Tarjeta con tipografía mínima de 1rem */}
          <div className="casual-card text-left shadow-2xl">
            <div className="flex items-center gap-3 text-base text-slate-700 mb-5 pb-4 border-b border-slate-100 font-semibold">
              <Calendar size={22} className="text-red-500 shrink-0" />
              <span>Fecha de registro: <strong className="text-slate-900">{formattedDate || 'Completado previamente'}</strong></span>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-base text-slate-700 flex items-start gap-3.5 leading-relaxed">
              <Info size={22} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                Para garantizar la transparencia y equidad del concurso, cads trivia permite un único intento por participante.
              </span>
            </div>
          </div>

          {/* Botón para reiniciar intento en modo prueba */}
          <button
            onClick={handleReset}
            className="btn-casual-primary max-w-sm mb-4"
          >
            <RotateCcw size={20} className="text-white" />
            <span>Reiniciar Trivia (Modo Prueba)</span>
          </button>
        </>
      )}
    </div>
  );
}
