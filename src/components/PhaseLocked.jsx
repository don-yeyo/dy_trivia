import React from 'react';
import { Calendar, Info, RotateCcw } from 'lucide-react';

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
      {/* Emoji ✋ en grande reemplazando el icono */}
      <div className="text-6xl sm:text-7xl mb-6 select-none animate-soft-pulse flex items-center justify-center filter drop-shadow-lg">
        {isTokenInvalid ? '⚠️' : '✋'}
      </div>

      {isTokenInvalid ? (
        <>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ marginBottom: '30px' }}>
            Enlace No Válido
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-white leading-snug" style={{ marginBottom: '30px' }}>
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de Don Yeyo.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight" style={{ marginBottom: '30px' }}>
            Trivia Ya Realizada
          </h1>
          {/* Mismo estilo visual que el H1 con margen inferior de 30px */}
          <p className="text-xl sm:text-2xl font-bold text-white leading-snug" style={{ marginBottom: '30px' }}>
            ¡Hola <span className="text-yellow-300 font-extrabold">{user?.nombre} {user?.apellido}</span>! Tu participación en esta trivia ya ha sido registrada exitosamente.
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
                Para garantizar la transparencia y equidad del concurso, cada trivia permite un único intento por participante.
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
