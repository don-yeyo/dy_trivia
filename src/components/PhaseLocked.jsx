import React from 'react';
import { Lock, ShieldCheck, AlertTriangle, Calendar, Info } from 'lucide-react';

export default function PhaseLocked({ 
  user, 
  activePhase = 1, 
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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full text-center z-10 animate-fade-in">
      {/* Icono de Candado / Alerta */}
      <div className="w-20 h-20 rounded-3xl p-4 bg-gradient-to-br from-red-600/30 to-blue-900/40 border border-red-500/30 mb-6 flex items-center justify-center shadow-xl">
        {isTokenInvalid ? (
          <AlertTriangle size={42} className="text-yellow-400" />
        ) : (
          <Lock size={42} className="text-red-400" />
        )}
      </div>

      {isTokenInvalid ? (
        <>
          <h1 className="text-2xl font-bold text-white mb-2">
            Enlace No Válido
          </h1>
          <p className="text-sm text-gray-300 mb-6">
            El enlace con el que intentas acceder no corresponde a un participante registrado o ha expirado. Por favor, solicita tu enlace personal al área de Calidad o Recursos Humanos de Don Yeyo.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-white mb-2">
            Fase {activePhase} Ya Realizada
          </h1>
          <p className="text-sm text-blue-200 mb-6">
            ¡Hola <strong>{user?.nombre} {user?.apellido}</strong>! Tu participación en la <strong>Fase {activePhase}</strong> de la Trivia de Inocuidad ya ha sido registrada exitosamente.
          </p>

          <div className="glass-panel p-5 w-full rounded-2xl mb-6 text-left border-t border-white/25">
            <div className="flex items-center gap-2.5 text-xs text-gray-300 mb-3">
              <Calendar size={16} className="text-red-400" />
              <span>Fecha y hora de registro: <strong>{formattedDate || 'Registrado previamente'}</strong></span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-gray-300 flex items-start gap-2">
              <Info size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <span>
                Para mantener la equidad del concurso, cada fase permite un único intento. <strong>Conserva este mismo enlace</strong>, ya que podrás volver a usarlo tan pronto como se habilite la siguiente fase.
              </span>
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-gray-400">
        Don Yeyo S.A. &copy; 2026 | Semana de la Inocuidad
      </div>
    </div>
  );
}
