import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, ArrowLeft, RefreshCw, Flame, Volume2, VolumeX } from 'lucide-react';
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
  const urlParams = new URLSearchParams(window.location.search);
  const urlTop = parseInt(urlParams.get('topCount'), 10);
  const urlPhase = parseInt(urlParams.get('phase'), 10);

  const activePhase = !isNaN(urlPhase) && urlPhase > 0 ? urlPhase : (appConfig?.activePhase || 1);
  const topCount = !isNaN(urlTop) && urlTop > 0 ? urlTop : (appConfig?.classificationTopCount || 30);

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

  // Reiniciar scroll a 0 al cambiar a revelación o iniciar cálculo
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [projectionState]);

  // Disparar el evento épico de cálculo
  const handleStartProjection = async () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    setErrorMessage('');
    setProjectionState('CALCULATING');
  };

  // Callback cuando termina la animación de cálculo
  const handleCalculationFinished = async () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
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
      {/* =====================================================================
          1. PANTALLA LIMPIA INICIAL (ANTES DE DISPARAR)
          ===================================================================== */}
      {projectionState === 'IDLE' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16 text-center animate-casual-in">
          {/* Título de Revelación */}
          <div className="mb-10 sm:mb-16">
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
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-500/30 border border-amber-400 text-yellow-200 text-sm font-bold text-center mb-6">
              {errorMessage}
            </div>
          )}

          {/* Podio con Revelación Progresiva Cinematográfica (3° -> 2° -> 1°) */}
          {classificationData?.podio && (
            <div className="mb-8 sm:mb-12">
              <Podium
                podiumUsers={classificationData.podio}
                isAnimatedReveal={true}
              />
            </div>
          )}

          {/* Botón de Repetir Revelación Abajo del Podio (Centrado) */}
          <div className="flex justify-center mb-10 sm:mb-14">
            <button
              onClick={handleStartProjection}
              type="button"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/25 text-white font-extrabold text-sm sm:text-base flex items-center gap-3 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95 backdrop-blur-md"
              title="Volver a ejecutar la animación de cálculo y revelación del podio"
            >
              <RefreshCw size={18} className="text-yellow-400" />
              <span>Repetir Revelación</span>
            </button>
          </div>

          {/* Tabla General de Clasificados con Espaciado Generoso */}
          {classificationData && (
            <div className="mt-8 sm:mt-12 pt-8 border-t border-white/15">
              <div className="text-center mb-8 sm:mb-10">
                <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wide drop-shadow-lg">
                  Tabla General de Clasificados (Top {topCount})
                </h3>
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
      <div className="relative z-20 w-full py-4 px-6 flex items-center justify-start opacity-40 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onBackToGame}
          className="text-xs text-white/80 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Volver al inicio</span>
        </button>
      </div>
    </div>
  );
}
