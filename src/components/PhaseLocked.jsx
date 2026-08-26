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
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center z-10 animate-casual-in py-4 sm:py-8">
      {/* Icono de Candado / Alerta */}
      <div className="w-20 h-20 rounded-3xl p-4 bg-white/95 shadow-2xl mb-5 flex items-center justify-center border border-white/30">
        {isTokenInvalid ? (
          <AlertTriangle size={38} className="text-amber-500" />
        ) : (
          <Lock size={38} className="text-red-500" />
        )}
      </div>

      {isTokenInvalid ? (
        <>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Enlace No Válido
          </h1>
          <p className="text-sm sm:text-base text-slate-200 mb-6 leading-relaxed">
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de Don Yeyo.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Trivia Ya Realizada
          </h1>
          <p className="text-sm sm:text-base text-slate-200 mb-6">
            ¡Hola <strong>{user?.nombre} {user?.apellido}</strong>! Tu participación en esta fase ya ha sido registrada exitosamente.
          </p>

          <div className="casual-card p-6 sm:p-8 w-full mb-6 text-left shadow-2xl">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 mb-4 pb-3.5 border-b border-slate-100 font-medium">
              <Calendar size={18} className="text-red-500" />
              <span>Fecha de registro: <strong>{formattedDate || 'Completado previamente'}</strong></span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-600 flex items-start gap-3 leading-relaxed">
              <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                Para garantizar la transparencia y equidad del concurso, cada fase permite un único intento por participante.
              </span>
            </div>
          </div>

          {/* Botón para reiniciar intento en modo prueba / desarrollo */}
          <button
            onClick={handleReset}
            className="btn-casual-primary max-w-sm mb-4"
          >
            <RotateCcw size={18} className="text-white" />
            <span>Reiniciar Trivia (Modo Prueba)</span>
          </button>
        </>
      )}

      <div className="text-xs text-slate-300 mt-2">
        Don Yeyo S.A. &copy; 2026 | Semana de la Inocuidad
      </div>
    </div>
  );
}
