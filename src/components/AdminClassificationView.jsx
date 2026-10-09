import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Trophy,
  RefreshCw,
  Share2,
  Check,
  LogOut,
  Flame,
  Sparkles,
  ArrowLeft,
  Sliders,
  Tv,
  Save,
  Clock,
  Shuffle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  UserPlus
} from 'lucide-react';
import Podium from './Podium';
import ClassificationTable from './ClassificationTable';
import ProjectionView from './ProjectionView';
import ImportParticipantsModal from './ImportParticipantsModal';
import {
  loginAdmin,
  getStoredAdminToken,
  getStoredAdminUsername,
  clearAdminSession,
  isStoredTokenValid,
  fetchClassification,
  determineClassification,
  resetClassification
} from '../services/adminService';
import { saveAppConfig, fetchAppConfig } from '../services/configService';
import { exportClassificationToExcel } from '../services/exportExcelService';

export default function AdminClassificationView({ onBackToGame, appConfig }) {
  // Estados de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Modal de importación de participantes
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modo del admin: 'CONFIG' (panel técnico) o 'PROJECTION' (pantalla limpia para proyector)
  const [adminMode, setAdminMode] = useState('CONFIG');

  // Estados de configuración de Google Sheets
  const [activePhase, setActivePhase] = useState(appConfig?.activePhase || 1);
  const [topCount, setTopCount] = useState(appConfig?.classificationTopCount || 30);
  const [isPhaseClosed, setIsPhaseClosed] = useState(appConfig?.isPhaseClosed || false);
  const [timePerQuestion, setTimePerQuestion] = useState(appConfig?.timePerQuestion ?? 30);
  const [shuffleQuestions, setShuffleQuestions] = useState(appConfig?.shuffleQuestions ?? true);
  const [showPartialInTable, setShowPartialInTable] = useState(appConfig?.showPartialInTable ?? true);
  const [showUnansweredInTable, setShowUnansweredInTable] = useState(appConfig?.showUnansweredInTable ?? false);
  const [hideSummaryAnswered, setHideSummaryAnswered] = useState(appConfig?.hideSummaryAnswered ?? false);
  const [hideSummaryTime, setHideSummaryTime] = useState(appConfig?.hideSummaryTime ?? false);

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Estados de clasificación y datos
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [classificationData, setClassificationData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Verificar si ya había sesión abierta y si sigue vigente
  useEffect(() => {
    const token = getStoredAdminToken();
    if (token) {
      if (isStoredTokenValid()) {
        setIsAuthenticated(true);
        setAdminUsername(getStoredAdminUsername());
        loadData(token);
      } else {
        clearAdminSession();
        setIsAuthenticated(false);
        setLoginError('Tu sesión de administrador ha expirado. Por favor ingresa tus credenciales nuevamente.');
      }
    }
  }, []);

  const loadData = async (token) => {
    setIsLoadingData(true);
    try {
      // 1. Obtener configuración fresca desde la API / Google Sheets
      const freshConfig = await fetchAppConfig();
      let currentPhase = activePhase;
      let currentTop = topCount;

      if (freshConfig) {
        if (freshConfig.activePhase) {
          setActivePhase(freshConfig.activePhase);
          currentPhase = freshConfig.activePhase;
        }
        if (freshConfig.classificationTopCount) {
          setTopCount(freshConfig.classificationTopCount);
          currentTop = freshConfig.classificationTopCount;
        }
        if (freshConfig.isPhaseClosed !== undefined) setIsPhaseClosed(freshConfig.isPhaseClosed);
        if (freshConfig.isClassificationPublished !== undefined) setIsPublished(freshConfig.isClassificationPublished);
        if (freshConfig.publishedAt !== undefined) setPublishedAt(freshConfig.publishedAt);
        if (freshConfig.timePerQuestion !== undefined) setTimePerQuestion(freshConfig.timePerQuestion);
        if (freshConfig.shuffleQuestions !== undefined) setShuffleQuestions(freshConfig.shuffleQuestions);
        if (freshConfig.showPartialInTable !== undefined) setShowPartialInTable(freshConfig.showPartialInTable);
        if (freshConfig.showUnansweredInTable !== undefined) setShowUnansweredInTable(freshConfig.showUnansweredInTable);
        if (freshConfig.hideSummaryAnswered !== undefined) setHideSummaryAnswered(freshConfig.hideSummaryAnswered);
        if (freshConfig.hideSummaryTime !== undefined) setHideSummaryTime(freshConfig.hideSummaryTime);
      }

      // 2. Cargar clasificación para la fase y cupo actuales
      const res = await fetchClassification(currentPhase, currentTop);
      if (res) {
        const published = res.isPublished !== undefined ? res.isPublished : Boolean(freshConfig?.isClassificationPublished);
        setIsPublished(published);
        setPublishedAt(res.publishedAt || freshConfig?.publishedAt || null);
        const data = res.data || res.previewData;
        setClassificationData(data);
      }
    } catch (e) {
      console.warn('Error cargando clasificación y configuración:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const result = await loginAdmin(loginForm.username, loginForm.password);
    setIsLoggingIn(false);

    if (result.success) {
      setIsAuthenticated(true);
      setAdminUsername(result.username);
      setLoginForm({ username: '', password: '' });
      loadData(result.token);
    } else {
      setLoginError(result.error || 'Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setClassificationData(null);
    setIsPublished(false);
  };

  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!window.confirm(`¿Confirmas la publicación oficial de la Fase ${activePhase}? Todos los participantes podrán ver el podio de 3 ganadores y los clasificados en sus dispositivos.`)) {
      return;
    }

    setIsPublishing(true);
    setStatusMessage('');
    try {
      const result = await determineClassification(activePhase, topCount);
      if (result && result.success) {
        setIsPublished(true);
        const pubDate = result.publishedAt || new Date().toISOString();
        setPublishedAt(pubDate);
        if (result.data) {
          setClassificationData(result.data);
        }
        setStatusMessage('🎉 ¡Clasificación publicada oficialmente! Los participantes ya pueden ver el podio y clasificados.');
        setTimeout(() => setStatusMessage(''), 6000);
      } else if (result?.isAuthError) {
        setIsAuthenticated(false);
        setLoginError(result.error || 'La sesión de administrador expiró. Por favor vuelva a iniciar sesión.');
        setStatusMessage('🔒 ' + (result.error || 'Sesión expirada. Inicie sesión nuevamente.'));
      } else {
        setStatusMessage('❌ Error al publicar: ' + (result?.error || 'No se pudo completar la operación'));
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error publicando clasificación:', err);
      setStatusMessage('❌ Error al publicar: ' + err.message);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Despublicar la clasificación oficial? Los participantes volverán a ver el mensaje de que los resultados están en proceso de auditoría y no podrán ver el podio.')) {
      return;
    }
    setIsLoadingData(true);
    const result = await resetClassification(activePhase);
    if (result?.isAuthError) {
      setIsAuthenticated(false);
      setLoginError(result.error || 'La sesión de administrador expiró. Por favor vuelva a iniciar sesión.');
      setStatusMessage('🔒 ' + (result.error || 'Sesión expirada. Inicie sesión nuevamente.'));
      setIsLoadingData(false);
      return;
    }
    setIsPublished(false);
    setPublishedAt(null);
    await loadData(getStoredAdminToken());
    setIsLoadingData(false);
    setStatusMessage('🔒 La clasificación se despublicó y volvió al estado de auditoría (oculta al público).');
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleCopyPublicLink = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('view', 'clasificacion');
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setSaveSuccessMsg('');
    try {
      const configPayload = {
        activePhase: Number(activePhase),
        classificationTopCount: Number(topCount),
        isPhaseClosed: Boolean(isPhaseClosed),
        isClassificationPublished: Boolean(isPublished),
        timePerQuestion: Number(timePerQuestion),
        shuffleQuestions: Boolean(shuffleQuestions),
        showPartialInTable: Boolean(showPartialInTable),
        showUnansweredInTable: Boolean(showUnansweredInTable),
        hideSummaryAnswered: Boolean(hideSummaryAnswered),
        hideSummaryTime: Boolean(hideSummaryTime)
      };

      const result = await saveAppConfig(configPayload);
      if (result && result.success) {
        if (result.syncedWithSheet) {
          setSaveSuccessMsg('¡Configuración guardada y sincronizada con Google Sheets exitosamente!');
        } else {
          setSaveSuccessMsg(`⚠️ Configuración aplicada en la sesión, pero Google Sheets no se actualizó: ${result.warning || 'Webhook no respondió'}`);
        }
        // Recargar vista previa con el cupo y fase actualizados
        const res = await fetchClassification(activePhase, topCount);
        if (res && (res.data || res.previewData)) {
          setClassificationData(res.data || res.previewData);
        }
      } else {
        if (result?.error && (result.error.includes('expirada') || result.error.includes('inválida') || result.error.includes('administrador'))) {
          setIsAuthenticated(false);
          setLoginError(result.error);
        }
        setSaveSuccessMsg(`❌ No se pudo guardar la configuración: ${result?.error || 'Error de conexión o autenticación'}`);
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setSaveSuccessMsg(`❌ Ocurrió un error al guardar: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    }
  };

  const handlePhaseChange = async (newPhase) => {
    setActivePhase(newPhase);
    setIsLoadingData(true);
    try {
      const res = await fetchClassification(newPhase, topCount);
      if (res) {
        setIsPublished(res.isPublished || false);
        setPublishedAt(res.publishedAt || null);
        setClassificationData(res.data || res.previewData);
      }
    } catch (e) {
      console.warn('Error al cambiar de fase en admin:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (!classificationData) {
        setStatusMessage('No hay datos de clasificación disponibles para exportar.');
        setTimeout(() => setStatusMessage(''), 4000);
        return;
      }
      const res = exportClassificationToExcel({
        phase: activePhase,
        topCount,
        classificationData,
        publishedAt,
        adminUsername
      });
      if (res && res.success) {
        setStatusMessage(`¡Planilla Excel exportada con éxito: ${res.fileName}!`);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error exportando clasificación a Excel:', err);
      setStatusMessage(err.message || 'Error al exportar a Excel.');
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  // =========================================================================
  // VISTA 1: FORMULARIO DE LOGIN LIMPIO Y ELEGANTE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-lg mx-auto py-8 sm:py-16 px-4 animate-casual-in">
        <div className="casual-card p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-2xl relative overflow-hidden">
          {/* Header del Login */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center border border-slate-100">
              <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Panel de Administración
            </h2>
            <p className="text-xs sm:text-sm text-amber-900 font-bold mt-1.5">
              Configuración y Clasificación • Semana de la Inocuidad 2026
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-700 text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2 shadow-sm">
                <ShieldAlert size={18} className="text-red-600" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">
                Usuario Administrador
              </label>
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="admin"
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold focus:outline-none focus:border-red-600 transition-colors shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold focus:outline-none focus:border-red-600 transition-colors shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 sm:py-5 px-6 min-h-[56px] rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 mt-6 transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Ingresar al Panel de Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Volver a la Trivia */}
          <div className="mt-8 pt-6 border-t border-slate-200/80 text-center">
            <button
              onClick={onBackToGame}
              type="button"
              className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center gap-2 mx-auto transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver a la Trivia</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SI EL ADMIN ELIGE EL MODO PROYECCIÓN: MOSTRAR LA PANTALLA LIMPIA
  // =========================================================================
  if (adminMode === 'PROJECTION') {
    return (
      <ProjectionView
        appConfig={{ ...appConfig, activePhase, classificationTopCount: topCount }}
        onOpenConfig={() => {
          setAdminMode('CONFIG');
          loadData(getStoredAdminToken());
        }}
        onBackToGame={onBackToGame}
      />
    );
  }

  // =========================================================================
  // VISTA 2: PANEL DE CONFIGURACIÓN TÉCNICA DEL ADMINISTRADOR
  // =========================================================================
  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-3 sm:px-6 animate-casual-in">
      {/* Barra Superior de Admin */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl mb-8 sm:mb-10 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center shrink-0">
            <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                Configuración Admin
              </span>
              <span className="text-xs text-yellow-300 font-bold">
                @{adminUsername}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white">
              Gestor de Clasificación y Parámetros
            </h2>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-3">
          {/* Indicador de Estado */}
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2.5 shadow-md ${
              isPublished
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                : 'bg-yellow-500/25 text-yellow-300 border border-yellow-400/50'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-emerald-400 animate-ping' : 'bg-yellow-400'}`} />
            <span>{isPublished ? 'Publicada Oficialmente' : 'Borrador / No Publicada'}</span>
          </div>

          {/* Botón Importar Participantes CSV */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/50 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 transform hover:scale-105 active:scale-95"
            title="Importar lista de colaboradores desde archivo CSV a Google Sheets"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>

          <button
            onClick={onBackToGame}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/20 shadow"
            title="Ir a pantalla de Trivia / Home"
          >
            <ArrowLeft size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="p-3 rounded-xl bg-red-600/40 hover:bg-red-600 text-white border border-red-500/50 text-xs font-bold transition-all cursor-pointer shadow"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mensaje de Estado / Notificación */}
      {statusMessage && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-emerald-600/40 border border-emerald-400 text-white text-sm sm:text-base font-black text-center shadow-2xl animate-bounce">
          {statusMessage}
        </div>
      )}

      {/* =========================================================================
          BOTÓN DESTACADO: ABRIR PANTALLA LIMPIA DE PROYECCIÓN PARA EL SALÓN
          ========================================================================= */}
      <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 border-2 border-yellow-400/60 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-2">
            <Tv size={14} />
            <span>Modo Auditorio / Proyector</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Pantalla Limpia de Proyección Pública
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl">
            Abre la vista despejada y cinematográfica sin opciones técnicas, con el logo Don Yeyo, fondo animado y el botón <strong>"Clasificados Fase {activePhase}"</strong> para disparar el cálculo ante el público.
          </p>
        </div>

        <button
          onClick={() => {
            window.open(
              `${window.location.origin}${window.location.pathname}?view=proyeccion`,
              '_blank'
            );
          }}
          type="button"
          className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shrink-0 cursor-pointer border-2 border-white"
        >
          <Tv size={22} className="text-slate-950" />
          <span>Abrir Pantalla de Proyección</span>
          <Sparkles size={20} className="text-amber-800" />
        </button>
      </div>

      {/* =========================================================================
          BANNER PRINCIPAL: CONTROL DE PUBLICACIÓN DE PODIO Y CLASIFICADOS
          ========================================================================= */}
      <div
        className={`mb-8 p-6 sm:p-8 rounded-3xl border-2 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${
          isPublished
            ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-400/80 text-white'
            : 'bg-gradient-to-r from-amber-950 via-slate-900 to-red-950 border-amber-400/80 text-white'
        }`}
      >
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 bg-white/10 border border-white/20">
            <Trophy size={14} className={isPublished ? 'text-emerald-400' : 'text-amber-400'} />
            <span>
              {isPublished
                ? 'Estado Actual: Visible a los Participantes'
                : 'Estado Actual: Oculto a Participantes (En Auditoría)'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {isPublished
              ? `Podio y Clasificados de Fase ${activePhase} Publicados Oficialmente`
              : `Resultados de Fase ${activePhase} en Borrador / Auditoría`}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isPublished
              ? `Los colaboradores ya pueden ver el podio de 3 ganadores y la tabla oficial en sus dispositivos. Publicado el: ${
                  publishedAt ? new Date(publishedAt).toLocaleString() : 'Recientemente'
                }.`
              : 'La fase puede estar cerrada para responder, pero los participantes verán la pantalla de espera o fin de fase hasta que pulses este botón para oficializar el podio.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {isPublished ? (
            <button
              onClick={handleReset}
              type="button"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-rose-600/70 text-white font-black text-xs sm:text-sm uppercase tracking-wider border border-white/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
              title="Despublicar la clasificación para volver al modo auditoría"
            >
              <EyeOff size={18} />
              <span>Despublicar (Volver a Auditoría)</span>
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              type="button"
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-white disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <RefreshCw size={20} className="animate-spin text-slate-950" />
                  <span>Publicando Podio...</span>
                </>
              ) : (
                <>
                  <Trophy size={22} className="text-slate-950" />
                  <span>Publicar Podio y Clasificados</span>
                  <Sparkles size={18} className="text-amber-800" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          PANEL INTEGRAL DE CONFIGURACIÓN DE LA TRIVIA (PESTAÑA GOOGLE SHEETS)
          ========================================================================= */}
      <div className="casual-card text-left shadow-2xl w-full p-6 sm:p-10 rounded-3xl mb-8 sm:mb-12 border-2 border-slate-200/90">
        {/* Cabecera del Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 sm:mb-8 border-b border-slate-200/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 shadow-sm">
              <Sliders size={24} />
            </div>
            <div>
              <span className="font-black text-slate-950 text-lg sm:text-2xl tracking-tight block">
                Configuración Integral de la Trivia
              </span>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Sincronizado con la pestaña <strong>"Configuracion"</strong> de Google Sheets
              </span>
            </div>
          </div>
          {publishedAt && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
              Publicado el: {new Date(publishedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Mensaje de confirmación de guardado */}
        {saveSuccessMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-md animate-casual-in">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Bloque de Secciones de Configuración */}
        <div className="space-y-6">
          {/* SECCIÓN 1: FASE ACTIVA, ESTADOS DE RESPUESTAS Y PUBLICACIÓN */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Fase del Torneo, Estado de Respuestas y Publicación de Resultados
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Selector de Fase Activa */}
              <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2">
                  FASE_ACTIVA
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((fase) => (
                    <button
                      key={fase}
                      type="button"
                      onClick={() => handlePhaseChange(fase)}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        activePhase === fase
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      Fase {fase}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Define qué preguntas e inscriptos juegan actualmente.
                </p>
              </div>

              {/* Estado de la Fase: Abierta vs Cerrada */}
              <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2">
                  FASE_CERRADA (Admisión de Respuestas)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPhaseClosed(false)}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      !isPhaseClosed
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Abierta
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPhaseClosed(true)}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      isPhaseClosed
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Cerrada
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {isPhaseClosed
                    ? 'Fase cerrada: nadie más puede enviar respuestas.'
                    : 'Fase abierta: los participantes pueden jugar.'}
                </p>
                {isPhaseClosed && (
                  <button
                    onClick={handleExportExcel}
                    type="button"
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                    title="Descargar clasificación de la fase cerrada en Excel"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Exportar a Excel</span>
                    <Download size={13} className="text-emerald-200" />
                  </button>
                )}
              </div>

              {/* Visibilidad de Clasificación para Participantes */}
              <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>CLASIFICACION_PUBLICADA</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublished(false)}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isPublished
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <EyeOff size={14} />
                    <span>Oculta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublished(true)}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isPublished
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <Eye size={14} />
                    <span>Publicada</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {isPublished
                    ? 'Podio y ranking visibles a todos los colaboradores.'
                    : 'Fase en auditoría: podio oculto a participantes.'}
                </p>
              </div>

              {/* Cupo de Clasificados */}
              <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2">
                  CLASIFICACION_TOP_COUNT (Cupo)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="3"
                    max="500"
                    value={topCount}
                    onChange={(e) => setTopCount(Math.max(3, parseInt(e.target.value || '3', 10)))}
                    className="w-16 px-2 py-2 rounded-xl bg-slate-50 border-2 border-slate-300 font-black text-slate-950 text-sm text-center focus:outline-none focus:border-red-600"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {[5, 10, 20, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTopCount(num)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                          topCount === num
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Cantidad oficial de clasificados a la final.
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: TIEMPOS Y PREGUNTAS */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Dinámica de Preguntas y Límites de Tiempo
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Tiempo por Pregunta */}
              <div className="md:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-600" />
                  TIEMPO_POR_PREGUNTA (Segundos)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    className="w-20 px-2.5 py-2 rounded-xl bg-slate-50 border-2 border-slate-300 font-black text-slate-950 text-sm text-center focus:outline-none focus:border-red-600"
                  />
                  {[0, 15, 20, 30, 45].map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setTimePerQuestion(seg)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                        timePerQuestion === seg
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {seg === 0 ? 'Sin límite' : `${seg}s`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  0 = tiempo ilimitado. Mayor a 0 activa la cuenta regresiva en cada pregunta.
                </p>
              </div>

              {/* Mezclar Preguntas */}
              <div className="md:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Shuffle size={13} className="text-slate-600" />
                    MEZCLAR_PREGUNTAS
                  </label>
                  <p className="text-[11px] text-slate-600 font-semibold mb-3">
                    Presentar las preguntas en orden aleatorio para cada participante.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShuffleQuestions(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      shuffleQuestions
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Activado (Sí)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuffleQuestions(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      !shuffleQuestions
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Desactivado (No)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: VISIBILIDAD EN TABLAS Y PANTALLAS */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Visibilidad de Datos en Tablas y Pantallas Públicas
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Parciales en Tabla */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-800 block mb-1">
                  MOSTRAR_PARCIALES_EN_TABLA
                </span>
                <span className="text-[10px] text-slate-500 block mb-2">
                  Mostrar a quienes respondieron parcialmente (no terminaron todas).
                </span>
                <button
                  type="button"
                  onClick={() => setShowPartialInTable(!showPartialInTable)}
                  className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                    showPartialInTable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {showPartialInTable ? 'Visible' : 'Oculto'}
                </button>
              </div>

              {/* No Respondidos en Tabla */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-800 block mb-1">
                  MOSTRAR_NO_RESPONDIDOS_EN_TABLA
                </span>
                <span className="text-[10px] text-slate-500 block mb-2">
                  Mostrar a colaboradores inscriptos que aún no participaron.
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnansweredInTable(!showUnansweredInTable)}
                  className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                    showUnansweredInTable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {showUnansweredInTable ? 'Incluir' : 'Omitir'}
                </button>
              </div>

              {/* Ocultar Resumen Respondidas */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-800 block mb-1">
                  OCULTAR_RESUMEN_RESPONDIDAS
                </span>
                <span className="text-[10px] text-slate-500 block mb-2">
                  Ocultar tarjeta de "Preguntas Respondidas" al final.
                </span>
                <button
                  type="button"
                  onClick={() => setHideSummaryAnswered(!hideSummaryAnswered)}
                  className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                    hideSummaryAnswered
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {hideSummaryAnswered ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {/* Ocultar Resumen Tiempo */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-800 block mb-1">
                  OCULTAR_RESUMEN_TIEMPO
                </span>
                <span className="text-[10px] text-slate-500 block mb-2">
                  Ocultar tarjeta de "Tiempo Total Empleado".
                </span>
                <button
                  type="button"
                  onClick={() => setHideSummaryTime(!hideSummaryTime)}
                  className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                    hideSummaryTime
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {hideSummaryTime ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIÓN: GUARDAR EN GOOGLE SHEETS */}
        <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleSaveConfig}
            disabled={isSavingConfig}
            type="button"
            className="w-full sm:w-auto px-8 py-4 min-h-[56px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-700/30 flex items-center justify-center gap-3 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {isSavingConfig ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Guardando en Google Sheets...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Guardar Configuración en Google Sheets</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Botón de Exportar a Excel (para fases cerradas) */}
            {isPhaseClosed && (
              <button
                onClick={handleExportExcel}
                type="button"
                className="flex-1 sm:flex-none py-3.5 px-5 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all border border-emerald-500 transform hover:scale-105 active:scale-95"
                title="Descargar clasificación de la fase en formato Excel (.xlsx)"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar Excel</span>
                <Download size={14} className="text-emerald-200" />
              </button>
            )}

            {/* Botón de Enlace Público */}
            <button
              onClick={handleCopyPublicLink}
              type="button"
              className="flex-1 sm:flex-none py-3.5 px-5 min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all border border-slate-700"
              title="Copiar enlace público de la clasificación"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>

            {/* Botón de Publicar / Despublicar en barra de acciones */}
            {isPublished ? (
              <button
                onClick={handleReset}
                type="button"
                className="flex-1 sm:flex-none py-3.5 px-4 min-h-[48px] rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200"
                title="Despublicar clasificación y volver a modo auditoría"
              >
                <EyeOff size={14} />
                <span>Despublicar</span>
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                type="button"
                className="flex-1 sm:flex-none py-3.5 px-5 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all border border-amber-300 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Publicar podio y clasificados para todos los participantes"
              >
                {isPublishing ? (
                  <RefreshCw size={14} className="animate-spin text-slate-950" />
                ) : (
                  <Trophy size={14} className="text-slate-950" />
                )}
                <span>Publicar Clasificación</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          PREVISUALIZACIÓN DE DATOS (CON MÁRGENES Y ESPACIADOS DESPEJADOS)
          ========================================================================= */}
      {classificationData ? (
        <div className="space-y-12 sm:space-y-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/20 gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                Vista Previa de Clasificación
              </h3>
              <span className="text-xs text-yellow-300 font-bold">
                {classificationData.totalJugados || 0} evaluados
                {classificationData.totalCompletados !== undefined ? ` (${classificationData.totalCompletados} completos, ${classificationData.totalParciales || 0} parciales)` : ''}
                {` de ${classificationData.totalInscriptos || 0} inscriptos`}
              </span>
            </div>

            {/* Botón destacado de Exportación a Excel para Fases Cerradas */}
            {isPhaseClosed && (
              <button
                onClick={handleExportExcel}
                type="button"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all transform hover:scale-105 active:scale-95 border border-emerald-400/50"
                title="Descargar planilla Excel (.xlsx) con clasificación completa, top clasificados y podio"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar a Excel (.xlsx)</span>
                <Download size={14} className="text-emerald-200" />
              </button>
            )}
          </div>

          {/* Podio Gamer de los 3 Primeros (Sin solapamientos) */}
          <Podium podiumUsers={classificationData.podio || []} />

          {/* Tabla de Clasificados restantes */}
          <div className="mt-10 sm:mt-16">
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                Tabla General de Clasificación (Top {topCount})
              </h3>
            </div>

            <ClassificationTable
              participants={classificationData.allParticipants || []}
              topCount={topCount}
              showPodiumInList={true}
            />
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-3xl border border-white/20 text-slate-300">
          <Trophy size={48} className="mx-auto text-yellow-400/50 mb-3" />
          <p className="font-bold text-sm sm:text-base">
            No hay datos de clasificación disponibles todavía. Abre la <strong>Pantalla de Proyección</strong> para disparar el cálculo oficial.
          </p>
        </div>
      )}

      {/* Modal de Importación de Participantes (CSV) */}
      <ImportParticipantsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(result) => {
          setStatusMessage(`¡${result.total || 'Lista de'} colaboradores importados exitosamente a Google Sheets!`);
          setTimeout(() => setStatusMessage(''), 8000);
        }}
      />
    </div>
  );
}
