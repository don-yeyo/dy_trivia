// ==============================================================================
// PANEL DASHBOARD EJECUTIVO (ESTÁNDAR DON YEYO S.A.)
// Métricas clave, estado de fase, resumen de participación y accesos directos
// Don Yeyo S.A. | Trivia Inocuidad 2026 | Referencia dy_shigma
// ==============================================================================
import React, { useState, useEffect } from 'react';
import {
  Users,
  Trophy,
  HelpCircle,
  Sliders,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Tv,
  ArrowRight,
  TrendingUp,
  Database,
  ShieldCheck,
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import { getStoredAdminToken } from '../../services/adminService.js';

export default function AdminDashboardView({
  activePhase = 1,
  isPhaseClosed = false,
  isPublished = false,
  classificationData = null,
  onNavigateSection,
  onOpenProjection
}) {
  const brandName = import.meta.env.VITE_ADMIN_BRAND_NAME || 'DY-TRIVIA';
  const [participantsCount, setParticipantsCount] = useState(0);
  const [questionsSummary, setQuestionsSummary] = useState({ 1: 0, 2: 0 });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Cargar datos resumidos de participantes y preguntas
  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        const token = getStoredAdminToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Cargar participantes para estadísticas
        const resPart = await fetch('/api/participants', { headers });
        if (resPart.ok) {
          const dataPart = await resPart.json();
          if (isMounted && dataPart.participants) {
            setParticipantsCount(dataPart.participants.length);
          }
        }

        // 2. Cargar preguntas de fases
        const resQ = await fetch('/api/admin-questions', { headers });
        if (resQ.ok) {
          const dataQ = await resQ.json();
          if (isMounted && dataQ.questions) {
            const counts = {};
            dataQ.questions.forEach(q => {
              counts[q.fase] = (counts[q.fase] || 0) + 1;
            });
            setQuestionsSummary(counts);
          }
        }
      } catch (e) {
        console.warn('Advertencia cargando resumen del dashboard:', e);
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    }
    loadSummary();
    return () => { isMounted = false; };
  }, []);

  // Métricas calculadas
  const totalJugados = classificationData?.totalJugados || 0;
  const totalCompletados = classificationData?.totalCompletados || 0;
  const totalParciales = classificationData?.totalParciales || 0;
  const totalInscriptos = participantsCount || classificationData?.totalInscriptos || 0;

  const pctCompletados = totalInscriptos > 0 ? Math.round((totalCompletados / totalInscriptos) * 100) : 0;
  const pctParciales = totalInscriptos > 0 ? Math.round((totalParciales / totalInscriptos) * 100) : 0;
  const pctSinJugar = Math.max(0, 100 - pctCompletados - pctParciales);

  const podioProvisional = classificationData?.podio || [];

  return (
    <div className="w-full space-y-8 animate-casual-in">
      {/* Banner de Bienvenida Corporativo */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/80 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            <span>Consola de Administración Central</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
            Bienvenido a {brandName}
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Monitoreo en tiempo real de participación, gestión integral de participantes,
            definición de preguntas por fase y publicación oficial de resultados.
          </p>
        </div>

        {/* Acciones Rápidas del Banner */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={onOpenProjection}
            type="button"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all border border-purple-400/40"
          >
            <Tv size={17} />
            <span>Pantalla de Proyección</span>
          </button>

          <button
            onClick={() => onNavigateSection('CLASSIFICATION')}
            type="button"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all border border-amber-300"
          >
            <Trophy size={17} />
            <span>Ver Participación</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Nómina Total */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Colaboradores Inscriptos
            </span>
            <span className="text-2xl sm:text-3xl font-heading font-black text-white">
              {totalInscriptos}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Base oficial en Supabase
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
            <Users size={26} />
          </div>
        </div>

        {/* KPI 2: Participación Fase Activa */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Participaron en Fase {activePhase}
            </span>
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">
              {totalJugados}
            </span>
            <span className="text-[11px] text-emerald-300/80 block mt-1 font-semibold">
              {pctCompletados}% Completaron la trivia
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <TrendingUp size={26} />
          </div>
        </div>

        {/* KPI 3: Estado de la Fase Activa */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Fase Actual ({activePhase})
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xl sm:text-2xl font-heading font-black ${isPhaseClosed ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isPhaseClosed ? 'Cerrada' : 'Abierta'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              {isPhaseClosed ? 'No admite más respuestas' : 'Admitiendo respuestas'}
            </span>
          </div>
          <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border ${
            isPhaseClosed ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            <Clock size={26} />
          </div>
        </div>

        {/* KPI 4: Estado de Publicación */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Podio & Clasificados
            </span>
            <span className={`text-xl sm:text-2xl font-heading font-black ${isPublished ? 'text-amber-400' : 'text-slate-400'}`}>
              {isPublished ? 'Publicado' : 'Borrador'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {isPublished ? 'Visible a los colaboradores' : 'En auditoría técnica'}
            </span>
          </div>
          <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border ${
            isPublished ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Trophy size={26} />
          </div>
        </div>
      </div>

      {/* Fila 2: Desglose de Participación + Resumen de Preguntas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Barra de Progreso de Participación */}
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-black text-white text-base sm:text-lg flex items-center gap-2">
                <Flame size={20} className="text-amber-400" />
                <span>Progreso de Participación &bull; Fase {activePhase}</span>
              </h3>
              <span className="text-xs text-slate-400 font-bold">
                {totalJugados} de {totalInscriptos} colaboradores
              </span>
            </div>

            {/* Barra Visual Multiprogress */}
            <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden flex mb-4 border border-white/5">
              <div
                style={{ width: `${pctCompletados}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`Completaron: ${totalCompletados} (${pctCompletados}%)`}
              />
              <div
                style={{ width: `${pctParciales}%` }}
                className="h-full bg-amber-500 transition-all duration-500"
                title={`Parciales: ${totalParciales} (${pctParciales}%)`}
              />
              <div
                style={{ width: `${pctSinJugar}%` }}
                className="h-full bg-slate-700 transition-all duration-500"
                title={`Sin Jugar: ${totalInscriptos - totalJugados} (${pctSinJugar}%)`}
              />
            </div>

            {/* Leyenda */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-emerald-500/20">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Completaron</span>
                </div>
                <span className="text-lg font-black text-white">{totalCompletados}</span>
                <span className="text-[10px] text-slate-400 block">({pctCompletados}%)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-amber-500/20">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Parciales</span>
                </div>
                <span className="text-lg font-black text-white">{totalParciales}</span>
                <span className="text-[10px] text-slate-400 block">({pctParciales}%)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-700/50">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Sin Jugar</span>
                </div>
                <span className="text-lg font-black text-white">{Math.max(0, totalInscriptos - totalJugados)}</span>
                <span className="text-[10px] text-slate-400 block">({pctSinJugar}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Para ver el detalle de cada participante o reenviar emails:
            </span>
            <button
              onClick={() => onNavigateSection('PARTICIPANTS')}
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Ir a Participantes</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Resumen de Preguntas y Fases */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-black text-white text-base sm:text-lg flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-400" />
                <span>Banco de Preguntas</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                Gestión Activa
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Las preguntas están organizadas por fase numérica en Supabase, con respuestas correctas y explicaciones pedagógicas.
            </p>

            <div className="space-y-2.5">
              {[1, 2, 3].map(faseNum => {
                const count = questionsSummary[faseNum] || 0;
                const isActive = activePhase === faseNum;
                return (
                  <div
                    key={faseNum}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-blue-950/40 border-blue-500/50 shadow-sm'
                        : 'bg-slate-950/40 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-xs font-bold text-white">
                        Fase {faseNum} {isActive ? '(Fase Activa)' : ''}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-black text-slate-200">
                      {count} preguntas
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Crear, editar opciones y explicaciones:
            </span>
            <button
              onClick={() => onNavigateSection('QUESTIONS')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Gestionar Preguntas</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Fila 3: Podio Provisional + Accesos Directos a Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Podio Provisional */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-white text-base sm:text-lg flex items-center gap-2">
              <Award size={20} className="text-yellow-400" />
              <span>Podio Provisional &bull; Fase {activePhase}</span>
            </h3>
            <button
              onClick={() => onNavigateSection('CLASSIFICATION')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Tabla Completa</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {podioProvisional.length > 0 ? (
            <div className="space-y-3">
              {podioProvisional.slice(0, 3).map((user, idx) => {
                const medalColors = [
                  'from-amber-400 to-yellow-500 text-slate-950 border-amber-300',
                  'from-slate-300 to-slate-400 text-slate-950 border-slate-200',
                  'from-amber-700 to-amber-800 text-white border-amber-600'
                ];
                return (
                  <div
                    key={user.legajo || idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${medalColors[idx] || 'bg-slate-700 text-white'} border font-black text-xs flex items-center justify-center shadow`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                          {user.apellido}, {user.nombre}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {user.sector || 'Sin Sector'} &bull; Legajo: {user.legajo}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-yellow-400 block">
                        {user.score ? Number(user.score).toLocaleString() : user.points} pts
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {user.correctCount || 0} aciertos &bull; {user.totalTime || 0}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-white/5 text-slate-400">
              <Trophy size={32} className="mx-auto text-yellow-400/40 mb-2" />
              <p className="text-xs font-semibold">
                Todavía no se ha calculado el podio de la Fase {activePhase}.
              </p>
              <button
                onClick={() => onNavigateSection('CLASSIFICATION')}
                className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                Abrir Sección Participación
              </button>
            </div>
          )}
        </div>

        {/* Tarjetas de Acceso Rápido a Módulos */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Módulo Preguntas */}
          <div
            onClick={() => onNavigateSection('QUESTIONS')}
            className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/50 to-slate-900 border border-blue-500/20 hover:border-blue-500/50 shadow-xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <HelpCircle size={20} />
              </div>
              <h4 className="font-heading font-black text-white text-sm mb-1">
                Preguntas
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                CRUD completo de preguntas, opciones dinámicas, respuesta correcta y explicaciones.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-blue-300">
              <span>Gestionar</span>
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Módulo Participantes */}
          <div
            onClick={() => onNavigateSection('PARTICIPANTS')}
            className="p-5 rounded-2xl bg-gradient-to-br from-red-950/50 to-slate-900 border border-red-500/20 hover:border-red-500/50 shadow-xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-all">
                <Users size={20} />
              </div>
              <h4 className="font-heading font-black text-white text-sm mb-1">
                Participantes
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nómina, generación de links únicos, marcas de email enviado y reinicio de trivia.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-red-400 group-hover:text-red-300">
              <span>Auditar</span>
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Módulo Participación */}
          <div
            onClick={() => onNavigateSection('CLASSIFICATION')}
            className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/20 hover:border-amber-500/50 shadow-xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                <Trophy size={20} />
              </div>
              <h4 className="font-heading font-black text-white text-sm mb-1">
                Participación
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Podio 3D Gamer, tabla de clasificados, exportación Excel y publicación oficial.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Ver Podio</span>
              <ArrowRight size={13} />
            </div>
          </div>

          {/* Módulo Configuración */}
          <div
            onClick={() => onNavigateSection('CONFIG')}
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/20 hover:border-indigo-500/50 shadow-xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Sliders size={20} />
              </div>
              <h4 className="font-heading font-black text-white text-sm mb-1">
                Configuración
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Fase activa, cierre de fase, tiempos de pregunta, penalizaciones y reglas.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Configurar</span>
              <ArrowRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
