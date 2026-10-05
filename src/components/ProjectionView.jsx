import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, ArrowLeft, Sliders, RefreshCw, Flame, Volume2, VolumeX } from 'lucide-react';
import SunburstBackground from './SunburstBackground';
import CalculatingAnimation from './CalculatingAnimation';
import Podium from './Podium';
import ClassificationTable from './ClassificationTable';
import { determineClassification, fetchClassification } from '../services/adminService';
import { sounds } from '../services/soundEffects';

export default function ProjectionView({
  appConfig,
  onOpenConfig,
  onBackToGame
}) {
  const activePhase = appConfig?.activePhase || 1;
  const topCount = appConfig?.classificationTopCount || 30;

  // Estados de la proyección
  // 'IDLE': Pantalla limpia inicial con logo y botón "Clasificados Fase X"
  // 'CALCULATING': Animación gamer de cálculo de datos
  // 'REVEALED': Podio animado, confeti y tabla de clasificados
  const [projectionState, setProjectionState] = useState('IDLE');
  const [classificationData, setClassificationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar datos previos si ya existía una clasificación guardada
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetchClassification(activePhase, topCount);
        if (res && (res.data || res.previewData)) {
          setClassificationData(res.data || res.previewData);
        }
      } catch (e) {
        console.warn('Error precargando clasificación para proyector:', e);
      }
    }
    checkExisting();
  }, [activePhase, topCount]);

  // Disparar el evento épico de cálculo
  const handleStartProjection = async () => {
    setErrorMessage('');
    setProjectionState('CALCULATING');
  };

  // Callback cuando termina la animación de cálculo
  const handleCalculationFinished = async () => {
    setIsLoading(true);
    try {
      const result = await determineClassification(activePhase, topCount);
      if (result && result.success && result.data) {
        setClassificationData(result.data);
      } else {
        // Si no pudo guardar en backend, usar los datos locales
        const res = await fetchClassification(activePhase, topCount);
        if (res && (res.data || res.previewData)) {
          setClassificationData(res.data || res.previewData);
        }
      }
      setProjectionState('REVEALED');
      triggerCelebrationConfetti();
    } catch (err) {
      console.error('Error al determinar clasificación:', err);
      setErrorMessage('Hubo un problema al procesar los datos. Mostrando datos disponibles.');
      setProjectionState('REVEALED');
    } finally {
      setIsLoading(false);
    }
  };

  // Confeti continuo y festivo para la proyección en vivo
  const triggerCelebrationConfetti = () => {
    try {
      sounds.playVictory();
    } catch (e) {}

    // Ráfaga central
    confetti({
      particleCount: 90,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FFA500', '#E5353B', '#FFFFFF', '#0066FF']
    });

    // Cañones laterales
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 80,
        origin: { x: 0.05, y: 0.65 },
        colors: ['#FFD700', '#E5353B', '#FFFFFF']
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 80,
        origin: { x: 0.95, y: 0.65 },
        colors: ['#FFD700', '#E5353B', '#FFFFFF']
      });
    }, 600);

    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.3 },
        colors: ['#FFD700', '#FFA500', '#0066FF']
      });
    }, 1500);
  };

  const handleResetToIdle = () => {
    setProjectionState('IDLE');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-white font-sans selection:bg-red-500 selection:text-white">
      {/* Fondo de Rayos de Sol Animado (Sunburst) */}
      <SunburstBackground />

      {/* =====================================================================
          1. PANTALLA LIMPIA INICIAL (ANTES DE DISPARAR)
          ===================================================================== */}
      {projectionState === 'IDLE' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16 text-center animate-casual-in">
          {/* Logo Don Yeyo Oficial en Grande */}
          <div className="w-48 sm:w-72 md:w-84 max-w-[85vw] mb-8 sm:mb-12 p-5 sm:p-7 rounded-3xl bg-white/95 shadow-2xl shadow-blue-950/60 backdrop-blur-md border-4 border-white/80 animate-soft-pulse">
            <img
              src="/logo-donyeyo.svg"
              alt="Don Yeyo"
              className="w-full h-auto object-contain drop-shadow-md"
            />
          </div>

          {/* Subtítulo institucional del evento */}
          <div className="mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600/90 border border-red-400 text-white text-xs sm:text-base font-black tracking-widest uppercase shadow-xl mb-3">
              <Sparkles size={18} className="text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Semana de la Inocuidad 2026</span>
              <Sparkles size={18} className="text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-2xl">
              Gran Revelación de Clasificación
            </h1>
          </div>

          {/* BOTÓN CENTRAL PROTAGONISTA: "Clasificados Fase X" */}
          <div className="w-full max-w-xl mx-auto px-4">
            <button
              onClick={handleStartProjection}
              type="button"
              className="w-full py-6 sm:py-8 px-8 sm:px-12 rounded-3xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-xl sm:text-3xl md:text-4xl uppercase tracking-wider shadow-2xl shadow-red-600/60 hover:shadow-yellow-500/80 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-4 cursor-pointer border-4 border-white/80 animate-bounce"
              style={{ animationDuration: '2.5s' }}
            >
              <Trophy size={36} className="text-yellow-200 shrink-0 sm:w-12 sm:h-12" />
              <span>Clasificados Fase {activePhase}</span>
              <Flame size={36} className="text-yellow-300 shrink-0 sm:w-12 sm:h-12" />
            </button>
            <p className="text-xs sm:text-sm text-yellow-200/90 font-bold mt-4 drop-shadow">
              Presione para iniciar el cálculo oficial y revelar el podio en vivo
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. ANIMACIÓN GAMER DE CÁLCULO
          ===================================================================== */}
      {projectionState === 'CALCULATING' && (
        <CalculatingAnimation
          topCount={topCount}
          onComplete={handleCalculationFinished}
        />
      )}

      {/* =====================================================================
          3. RESULTADO: PODIO ANIMADO + TABLA DE CLASIFICADOS + CONFETI
          ===================================================================== */}
      {projectionState === 'REVEALED' && (
        <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 animate-casual-in">
          {/* Cabecera Limpia para Proyección */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-12 pb-4 border-b border-white/15">
            <div className="flex items-center gap-4">
              <div className="w-16 sm:w-20 p-2 rounded-2xl bg-white shadow-xl">
                <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-auto object-contain" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-widest">
                  Resultados Oficiales • Fase {activePhase}
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-white">
                  Clasificación General y Podio de Honor
                </h2>
              </div>
            </div>

            {/* Botón Discreto para Repetir la Revelación en Vivo */}
            <button
              onClick={handleStartProjection}
              type="button"
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              title="Volver a ejecutar la animación de cálculo y revelación del podio"
            >
              <RefreshCw size={16} />
              <span>Repetir Revelación</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-500/30 border border-amber-400 text-yellow-200 text-sm font-bold text-center mb-6">
              {errorMessage}
            </div>
          )}

          {/* Podio con Revelación Progresiva Cinematográfica (3° -> 2° -> 1°) */}
          {classificationData?.podio && (
            <div className="mb-14 sm:mb-20">
              <Podium
                podiumUsers={classificationData.podio}
                isAnimatedReveal={true}
              />
            </div>
          )}

          {/* Tabla General de Clasificados con Espaciado Generoso */}
          {classificationData && (
            <div className="mt-12 sm:mt-16 pt-8 border-t border-white/15">
              <div className="text-center mb-8 sm:mb-10">
                <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wide drop-shadow-lg">
                  Tabla General de Clasificados (Top {topCount})
                </h3>
                <p className="text-sm sm:text-base text-yellow-300 font-bold mt-2">
                  Total Evaluados: {classificationData.totalJugados || 0} de {classificationData.totalInscriptos || 0} inscriptos
                </p>
              </div>

              <ClassificationTable
                participants={classificationData.allParticipants || []}
                topCount={topCount}
                showPodiumInList={true}
              />
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          CONTROLES DE PIE DISCRETOS (SOLO PARA EL OPERADOR / ADMIN)
          ===================================================================== */}
      <div className="relative z-20 w-full py-4 px-6 flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onBackToGame}
          className="text-xs text-white/80 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Volver al inicio</span>
        </button>

        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="text-xs text-yellow-300 hover:text-yellow-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/20"
          >
            <Sliders size={14} />
            <span>Configuración de Admin</span>
          </button>
        )}
      </div>
    </div>
  );
}
