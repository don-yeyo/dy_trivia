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
  Tv
} from 'lucide-react';
import Podium from './Podium';
import ClassificationTable from './ClassificationTable';
import ProjectionView from './ProjectionView';
import {
  loginAdmin,
  getStoredAdminToken,
  getStoredAdminUsername,
  clearAdminSession,
  fetchClassification,
  resetClassification
} from '../services/adminService';

export default function AdminClassificationView({ onBackToGame, appConfig }) {
  const initialTopCount = appConfig?.classificationTopCount || 30;
  const [activePhase, setActivePhase] = useState(appConfig?.activePhase || 1);

  // Estados de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Modo del admin: 'CONFIG' (panel técnico) o 'PROJECTION' (pantalla limpia para proyector)
  const [adminMode, setAdminMode] = useState('CONFIG');

  // Estados de clasificación
  const [topCount, setTopCount] = useState(initialTopCount);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [classificationData, setClassificationData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Verificar si ya había sesión abierta
  useEffect(() => {
    const token = getStoredAdminToken();
    if (token) {
      setIsAuthenticated(true);
      setAdminUsername(getStoredAdminUsername());
      loadData(token);
    }
  }, []);

  const loadData = async (token) => {
    setIsLoadingData(true);
    try {
      const res = await fetchClassification(activePhase, topCount);
      if (res) {
        if (res.activePhase) setActivePhase(res.activePhase);
        setIsPublished(res.isPublished || false);
        setPublishedAt(res.publishedAt || null);
        const data = res.data || res.previewData;
        setClassificationData(data);
        if (res.topCount) setTopCount(res.topCount);
      }
    } catch (e) {
      console.warn('Error cargando clasificación:', e);
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

  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de que deseas reiniciar la publicación oficial de la clasificación?')) {
      return;
    }
    setIsLoadingData(true);
    await resetClassification(activePhase);
    setIsPublished(false);
    setPublishedAt(null);
    await loadData(getStoredAdminToken());
    setIsLoadingData(false);
    setStatusMessage('La clasificación volvió al estado pendiente de publicación.');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleCopyPublicLink = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('view', 'clasificacion');
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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
          onClick={() => setAdminMode('PROJECTION')}
          type="button"
          className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shrink-0 cursor-pointer border-2 border-white"
        >
          <Tv size={22} className="text-slate-950" />
          <span>Abrir Pantalla de Proyección</span>
          <Sparkles size={20} className="text-amber-800" />
        </button>
      </div>

      {/* =========================================================================
          PANEL DE CONFIGURACIÓN TÉCNICA DEL ADMINISTRADOR
          ========================================================================= */}
      <div className="casual-card text-left shadow-2xl w-full p-6 sm:p-10 rounded-3xl mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 sm:mb-8 border-b border-slate-200/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-100 text-red-600">
              <Sliders size={24} />
            </div>
            <span className="font-black text-slate-950 text-lg sm:text-2xl tracking-tight">
              Parámetros de Clasificación
            </span>
          </div>
          {publishedAt && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
              Publicado el: {new Date(publishedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Selector de cantidad de clasificados */}
          <div className="md:col-span-6 bg-slate-50/90 p-5 sm:p-6 rounded-2xl border-2 border-slate-200/80 shadow-inner">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-2.5">
              Cupo de Clasificados (Top N a Seleccionar)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="3"
                max="500"
                value={topCount}
                onChange={(e) => setTopCount(Math.max(3, parseInt(e.target.value || '3', 10)))}
                className="w-24 px-3 py-2.5 rounded-xl bg-white border-2 border-slate-300 font-black text-slate-950 text-base text-center focus:outline-none focus:border-red-600 shadow-sm"
              />
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTopCount(num)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      topCount === num
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2.5">
              Este valor determina cuántos participantes clasificarán a la siguiente fase cuando se dispare la proyección.
            </p>
          </div>

          {/* Acciones de gestión y enlace */}
          <div className="md:col-span-6 flex flex-col sm:flex-row items-center gap-4">
            {/* Botón de Enlace Público */}
            <button
              onClick={handleCopyPublicLink}
              type="button"
              className="w-full py-4 px-6 min-h-[56px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all border border-slate-700"
              title="Copiar enlace para compartir con colaboradores"
            >
              {copiedLink ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Público'}</span>
            </button>

            {/* Reiniciar si ya está publicado */}
            {isPublished && (
              <button
                onClick={handleReset}
                type="button"
                className="w-full py-4 px-5 min-h-[56px] rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200"
                title="Despublicar clasificación"
              >
                <RefreshCw size={15} />
                <span>Reiniciar Publicación</span>
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
          <div className="flex items-center justify-between pb-3 border-b border-white/20">
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
              Vista Previa de Clasificación
            </h3>
            <span className="text-xs text-yellow-300 font-bold">
              {classificationData.totalJugados || 0} evaluados de {classificationData.totalInscriptos || 0} inscriptos
            </span>
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
    </div>
  );
}
