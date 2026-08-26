import React from 'react';
import { Lock, AlertTriangle, Calendar, Info } from 'lucide-react';

export default function PhaseLocked({ 
  user, 
  playedDate = null,
  isTokenInvalid = false 
}) {
  const formattedDate = playedDate 
    ? new Date(playedDate).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full text-center z-10 animate-casual-in">
      {/* Icono de Candado / Alerta */}
      <div className="w-18 h-18 rounded-3xl p-4 bg-white/95 shadow-xl mb-5 flex items-center justify-center">
        {isTokenInvalid ? (
          <AlertTriangle size={36} className="text-amber-500" />
        ) : (
          <Lock size={36} className="text-red-500" />
        )}
      </div>

      {isTokenInvalid ? (
        <>
          <h1 className="text-2xl font-bold text-white mb-2">
            Enlace No Válido
          </h1>
          <p className="text-sm text-slate-200 mb-6 leading-relaxed">
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de Don Yeyo.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-white mb-2">
            Trivia Ya Realizada
          </h1>
          <p className="text-sm text-slate-200 mb-5">
            ¡Hola <strong>{user?.nombre} {user?.apellido}</strong>! Tu participación en esta fase ya ha sido registrada exitosamente.
          </p>

          <div className="casual-card p-6 w-full mb-6 text-left">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 mb-3.5 pb-3 border-b border-slate-100 font-medium">
              <Calendar size={16} className="text-red-500" />
              <span>Fecha de registro: <strong>{formattedDate || 'Completado previamente'}</strong></span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
              <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                Para garantizar la transparencia y equidad del concurso, cada fase permite un único intento por participante.
              </span>
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-slate-300">
        Don Yeyo S.A. &copy; 2026 | Semana de la Inocuidad
      </div>
    </div>
  );
}
