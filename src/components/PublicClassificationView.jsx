import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Sparkles,
  KeyRound,
  RefreshCw,
  Award
} from 'lucide-react';
import Podium from './Podium';
import ClassificationTable from './ClassificationTable';
import { fetchClassification } from '../services/adminService';

export default function PublicClassificationView({ onBackToGame, appConfig }) {
  const [activePhase, setActivePhase] = useState(appConfig?.activePhase || 1);
  const [topCount, setTopCount] = useState(appConfig?.classificationTopCount || 30);

  const [isLoading, setIsLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [classificationData, setClassificationData] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchClassification(activePhase, topCount);
      if (res) {
        if (res.activePhase) setActivePhase(res.activePhase);
        setIsPublished(res.isPublished || false);
        setPublishedAt(res.publishedAt || null);
        setClassificationData(res.data || null);
        if (res.topCount) setTopCount(res.topCount);
      }
    } catch (e) {
      console.warn('Error cargando clasificación pública:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================================
  // ESTADO DE CARGA
  // =========================================================================
  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto py-20 text-center text-white flex flex-col items-center gap-5 animate-casual-in">
        <div className="w-24 h-24 rounded-3xl bg-white p-3.5 shadow-2xl flex items-center justify-center animate-soft-pulse">
          <img src="/logo-donyeyo.svg" alt="Cargando" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-3 text-base font-semibold text-slate-200">
          <RefreshCw size={20} className="animate-spin text-red-500" />
          <span>Consultando clasificación oficial...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO 1: LA CLASIFICACIÓN AÚN NO HA SIDO DETERMINADA / PUBLICADA
  // =========================================================================
  if (!isPublished || !classificationData) {
    return (
      <div className="w-full max-w-xl mx-auto py-8 sm:py-16 px-4 text-center animate-casual-in">
        <div className="casual-card text-center shadow-2xl w-full p-8 sm:p-12 rounded-3xl">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-amber-500/15 border-2 border-amber-400 p-5 flex items-center justify-center text-amber-500 shadow-xl">
            <Clock size={44} className="animate-pulse" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mb-4 sm:mb-5">
            Clasificación en Preparación
          </h2>

          <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium leading-relaxed mb-6 sm:mb-8 text-left flex items-start gap-3.5 shadow-inner">
            <Award size={24} className="text-amber-700 shrink-0 mt-0.5" />
            <span>
              Los resultados oficiales, el <strong>Podio de Ganadores</strong> y los <strong>Clasificados</strong> de la Semana de la Inocuidad 2026 se publicarán al concluir la etapa de evaluación de toda la planta.
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-bold mb-8">
            ¡Sigue atento a los anuncios del Departamento de Calidad de <strong className="text-red-600">Don Yeyo</strong>!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onBackToGame}
              type="button"
              className="w-full sm:w-auto px-8 py-4 min-h-[52px] rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-extrabold text-sm shadow-xl hover:shadow-red-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft size={18} />
              <span>Volver a la Trivia</span>
            </button>

            <button
              onClick={loadData}
              type="button"
              className="w-full sm:w-auto px-6 py-4 min-h-[52px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw size={16} />
              <span>Actualizar Estado</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO 2: CLASIFICACIÓN PUBLICADA OFICIALMENTE
  // =========================================================================
  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-8 px-2 sm:px-6 animate-casual-in">
      {/* Podio Gamer de Ganadores */}
      <div className="mb-8 sm:mb-16">
        <Podium podiumUsers={classificationData.podio || []} />
      </div>

      {/* Tabla de Clasificados restantes con separación holgada */}
      <div className="mt-8 sm:mt-24 pt-6 sm:pt-8 border-t border-white/15">
        <div className="text-center mb-6 sm:mb-12">
          <h3 className="text-xl sm:text-4xl font-black text-white uppercase tracking-wide drop-shadow-lg">
            Tabla General de Clasificados (Top {topCount})
          </h3>
          <p className="text-xs sm:text-sm text-yellow-300 font-bold mt-1.5 sm:mt-2">
            {classificationData.totalJugados || 0} colaboradores evaluados de {classificationData.totalInscriptos || 0} inscriptos
          </p>
        </div>

        <ClassificationTable
          participants={classificationData.allParticipants || []}
          topCount={topCount}
          showPodiumInList={true}
        />
      </div>
    </div>
  );
}
