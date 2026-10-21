// ==============================================================================
// GESTOR DE MAILING CORPORATIVO Y EDITOR DINÁMICO DE PARÁMETROS
// Don Yeyo S.A. | Trivia Inocuidad 2026 | Referencia dy_shigma
// Soporte para campañas de Invitación y Resultados con Live Preview en Tiempo Real
// ==============================================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Server,
  Users,
  Award,
  BookOpen,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor,
  Save,
  RotateCcw,
  Sliders,
  Code2,
  HelpCircle,
  Check,
  Zap,
  Flame,
  Clock,
  Layers
} from 'lucide-react';
import {
  fetchMailingStatus,
  fetchMailingParams,
  saveMailingParams,
  renderMailingPreview,
  sendTestEmail,
  sendBatchMailing
} from '../../services/mailingService';
import { getStoredAdminToken } from '../../services/adminService';

// Valores por defecto iniciales para plantillas de mailing
const DEFAULT_PARAMS = {
  INVITACION: {
    TITULO_EMAIL: '¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!',
    SUBTITULO: 'Llegó el momento de demostrar todo lo que sabés. Cada respuesta correcta suma puntos, pero recordá que el tiempo también es un factor clave y puede marcar la diferencia al momento de clasificar.',
    MENSAJE_PRINCIPAL: '<p>🏆 <strong>Completá la trivia, acumulá puntos y asegurá tu lugar en la Fase 2.</strong></p>\n<p>⏱️ <strong>No lo olvides:</strong> el reloj comienza a correr desde el momento en que iniciás la trivia. Cuanto más rápido y preciso seas en tus respuestas, mayores serán tus posibilidades de avanzar.</p>\n<p>¿Aceptás el desafío?</p>\n<p>👉 Ingresá al siguiente enlace y poné a prueba tus conocimientos.</p><p><strong>¡MUCHA SUERTE!</strong></p>',
    MENSAJE_SECUNDARIO: '⚠️ <strong>Muy importante:</strong> si abandonás la trivia y volvés a ingresar, continuarás desde la siguiente pregunta disponible y no podrás regresar a las anteriores para responderlas.',
    CALL_TO_ACTION_TEXTO: 'INGRESAR A LA TRIVIA AHORA',
    EMPRESA_NOMBRE: 'Don Yeyo S.A. • Departamento de Calidad e Inocuidad',
    CONTACTO_SOPORTE: 'Para consultas o inconvenientes de acceso, comunicate con el área de RR.HH. o Calidad.',
    ANIO_ACTUAL: String(new Date().getFullYear()),
    URL_LOGO: 'https://dy-inocuidad.netlify.app/logo-donyeyo.svg',
    URL_FONDO: 'https://dy-inocuidad.netlify.app/mailing/fondo-rayos.png'
  },
  RESULTADOS: {
    TITULO_EMAIL: '¡RESULTADOS DEL DESAFÍO DE INOCUIDAD 2026!',
    SUBTITULO: 'La etapa ha finalizado. Mirá cómo te fue, revisá tus respuestas y conocé el podio oficial.',
    MENSAJE_PRINCIPAL: '<p>🎉 <strong>¡Muchas gracias por haber participado con tu compromiso diario hacia la inocuidad alimentaria!</strong></p>\n<p>Cada respuesta representa tu conocimiento en las Buenas Prácticas de Manufactura (BPM) y los estándares de calidad que hacen grande a Don Yeyo.</p>\n<p>🏆 <strong>Ya podés consultar la tabla general de clasificación y el Podio oficial de ganadores.</strong></p>',
    MENSAJE_SECUNDARIO: 'ℹ️ <strong>Importante:</strong> Los clasificados a las instancias finales serán contactados por el Departamento de Calidad y Recursos Humanos.',
    CALL_TO_ACTION_TEXTO: 'VER PODIO Y CLASIFICADOS',
    EMPRESA_NOMBRE: 'Don Yeyo S.A. • Departamento de Calidad e Inocuidad',
    CONTACTO_SOPORTE: 'Por dudas sobre tu puntaje o clasificación, comunicate con el área de Calidad.',
    ANIO_ACTUAL: String(new Date().getFullYear()),
    URL_LOGO: 'https://dy-inocuidad.netlify.app/logo-donyeyo.svg',
    URL_FONDO: 'https://dy-inocuidad.netlify.app/mailing/fondo-rayos.png'
  }
};

export default function AdminMailingView({ activePhase = 1 }) {
  // Tipo de campaña seleccionada: 'INVITATION' | 'RESULTS'
  const [activeTab, setActiveTab] = useState('INVITACION'); // 'INVITACION' | 'RESULTADOS'

  // Parámetros editables en memoria para cada tipo
  const [params, setParams] = useState(DEFAULT_PARAMS.INVITACION);
  const [isSavingParams, setIsSavingParams] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estado del servicio de mailing y métricas
  const [mailingStatus, setMailingStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Estados de vista previa
  const [previewHtml, setPreviewHtml] = useState('');
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [showHtmlCode, setShowHtmlCode] = useState(false);

  // Estados de envío de prueba
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Estados de envío masivo
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchLimit, setBatchLimit] = useState(50);
  const [resendAll, setResendAll] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Notificaciones flotantes
  const [notification, setNotification] = useState(null);

  // Sub-pestaña de la columna izquierda: 'PARAMS' o 'DISPATCH'
  const [leftSubTab, setLeftSubTab] = useState('PARAMS'); // 'PARAMS' | 'DISPATCH'

  const debounceTimerRef = useRef(null);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Cargar estado inicial y parámetros desde Supabase para el tipo activo
  const loadMailingData = async (tipo = activeTab) => {
    setIsLoadingStatus(true);
    try {
      const token = getStoredAdminToken();
      const statusData = await fetchMailingStatus(tipo, token);

      if (statusData) {
        setMailingStatus(statusData);
        if (statusData.testEmail && !testEmailAddress) {
          setTestEmailAddress(statusData.testEmail);
        }

        // Si la base devolvió parámetros para este tipo, cargarlos limpios
        if (statusData.params && Object.keys(statusData.params).length > 0) {
          setParams({
            ...DEFAULT_PARAMS[tipo],
            ...statusData.params
          });
        } else {
          setParams(DEFAULT_PARAMS[tipo] || {});
        }
      }
    } catch (err) {
      console.error('Error cargando datos de mailing:', err);
    } finally {
      setIsLoadingStatus(false);
      setHasUnsavedChanges(false);
    }
  };

  // Cambio instantáneo de pestaña
  const handleSelectTab = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setParams(DEFAULT_PARAMS[newTab] || {});
    setHasUnsavedChanges(false);
  };

  // Renderizar la vista previa en tiempo real cuando cambian los parámetros
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsRenderingPreview(true);
      try {
        const token = getStoredAdminToken();
        const res = await renderMailingPreview(activeTab, params, null, token);
        if (res && res.success && res.html) {
          setPreviewHtml(res.html);
        }
      } catch (e) {
        console.error('Error al generar preview en tiempo real:', e);
      } finally {
        setIsRenderingPreview(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [params, activeTab]);

  // Manejador de cambio de input de parámetro
  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Guardar parámetros en Supabase
  const handleSaveParams = async () => {
    setIsSavingParams(true);
    try {
      const token = getStoredAdminToken();
      const res = await saveMailingParams(activeTab, params, token);

      if (res.success) {
        setHasUnsavedChanges(false);
        showNotification(`✅ Parámetros de ${activeTab === 'INVITACION' ? 'Invitación' : 'Resultados'} guardados en Supabase.`);
      } else {
        showNotification(`❌ Error al guardar: ${res.error}`, 'error');
      }
    } catch (err) {
      showNotification(`❌ Excepción: ${err.message}`, 'error');
    } finally {
      setIsSavingParams(false);
    }
  };

  // Restablecer parámetros a los valores por defecto
  const handleResetDefaults = () => {
    if (!window.confirm(`¿Deseas restablecer los parámetros de ${activeTab} a sus valores predeterminados?`)) {
      return;
    }
    setParams(DEFAULT_PARAMS[activeTab] || {});
    setHasUnsavedChanges(true);
    showNotification('Valores predeterminados cargados en el formulario. Pulsa "Guardar" para persistir en Supabase.');
  };

  // Enviar correo de prueba
  const handleSendTest = async (e) => {
    if (e) e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      alert('Ingresa una dirección de correo válida para la prueba.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const token = getStoredAdminToken();
      const res = await sendTestEmail(testEmailAddress, activeTab, params, token);
      setTestResult(res);
      if (res.success) {
        showNotification(`✅ Prueba enviada exitosamente a ${testEmailAddress}`);
      } else {
        showNotification(`❌ Error en prueba: ${res.error}`, 'error');
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      showNotification(`❌ Excepción: ${err.message}`, 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Enviar lote masivo
  const handleSendBatch = async () => {
    const isResend = resendAll;
    const confirmMsg = isResend
      ? `¿Confirmas el REENVÍO masivo (${activeTab}) a TODOS los participantes (${mailingStatus?.totalWithEmail || 0} con email)?`
      : `¿Confirmas el envío masivo (${activeTab}) a los ${mailingStatus?.pendingCount || 0} participantes pendientes?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSendingBatch(true);
    setBatchResult(null);
    try {
      const token = getStoredAdminToken();
      const res = await sendBatchMailing({
        limit: batchLimit,
        resendAll: isResend,
        emailTipo: activeTab,
        params
      }, token);

      setBatchResult(res);
      if (res.success) {
        showNotification(`🎉 ¡Lote despachado exitosamente! Enviados: ${res.sentCount}`);
        await loadMailingData(activeTab);
      } else {
        showNotification(`❌ Error en envío masivo: ${res.error}`, 'error');
      }
    } catch (err) {
      setBatchResult({ success: false, error: err.message });
      showNotification(`❌ Excepción: ${err.message}`, 'error');
    } finally {
      setIsSendingBatch(false);
    }
  };

  const totalWithEmail = mailingStatus?.totalWithEmail || 0;
  const sentCount = mailingStatus?.sentCount || 0;
  const pendingCount = mailingStatus?.pendingCount || 0;
  const sentPct = totalWithEmail > 0 ? Math.round((sentCount / totalWithEmail) * 100) : 0;

  return (
    <div className="w-full space-y-6 animate-casual-in pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[99999] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-fade-in border ${
          notification.type === 'error'
            ? 'bg-rose-950/95 text-rose-200 border-rose-500/50'
            : 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Cabecera Principal y Selector de Campaña */}
      <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={12} />
              <span>Centro de Gestión de Emails</span>
            </span>
            <span className="text-xs text-slate-400">
              Plantillas HTML oficiales y persistencia en Supabase
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
            Gestión de Mailing y Despacho
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Edita los parámetros de las plantillas y visualiza el resultado final en vivo en tiempo real a medida que escribes.
          </p>
        </div>

        {/* Pestañas de Campaña: Invitación vs Resultados */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('INVITACION')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INVITACION'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Send size={14} />
            <span>1. Invitación</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('RESULTADOS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'RESULTADOS'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={14} />
            <span>2. Resultados y Podio</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: 2 Columnas (Editor y Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (5 Cols): Sub-Pestañas Parámetros / Despacho */}
        <div className="lg:col-span-5 space-y-5">
          {/* Barra de Sub-Navegación Izquierda */}
          <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLeftSubTab('PARAMS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  leftSubTab === 'PARAMS'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders size={14} />
                <span>Parámetros de Plantilla</span>
              </button>
              <button
                type="button"
                onClick={() => setLeftSubTab('DISPATCH')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  leftSubTab === 'DISPATCH'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Send size={14} />
                <span>Despacho y Envíos</span>
              </button>
            </div>

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black animate-pulse">
                Sin guardar
              </span>
            )}
          </div>

          {/* SUB-VISTA 1: FORMULARIO DE PARÁMETROS EN TIEMPO REAL */}
          {leftSubTab === 'PARAMS' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-purple-400" />
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wide">
                    Valores para {activeTab}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-300 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Restablecer valores originales"
                  >
                    <RotateCcw size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveParams}
                    disabled={isSavingParams}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
                  >
                    {isSavingParams ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Guardar</span>
                  </button>
                </div>
              </div>

              {/* Campos de Parámetros */}
              <div className="space-y-3.5 text-xs">
                {/* TITULO_EMAIL */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %TITULO_EMAIL% <span className="text-slate-500 font-normal">(Encabezado principal)</span>
                  </label>
                  <input
                    type="text"
                    value={params.TITULO_EMAIL || ''}
                    onChange={(e) => handleParamChange('TITULO_EMAIL', e.target.value)}
                    placeholder="Ej: ¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* SUBTITULO */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %SUBTITULO% <span className="text-slate-500 font-normal">(Bajada destacada)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={params.SUBTITULO || ''}
                    onChange={(e) => handleParamChange('SUBTITULO', e.target.value)}
                    placeholder="Bajada descriptiva del correo..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* MENSAJE_PRINCIPAL */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %MENSAJE_PRINCIPAL% <span className="text-slate-500 font-normal">(Cuerpo HTML)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={params.MENSAJE_PRINCIPAL || ''}
                    onChange={(e) => handleParamChange('MENSAJE_PRINCIPAL', e.target.value)}
                    placeholder="Contenido central en HTML..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* CALL_TO_ACTION_TEXTO */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %CALL_TO_ACTION_TEXTO% <span className="text-slate-500 font-normal">(Etiqueta del botón)</span>
                  </label>
                  <input
                    type="text"
                    value={params.CALL_TO_ACTION_TEXTO || ''}
                    onChange={(e) => handleParamChange('CALL_TO_ACTION_TEXTO', e.target.value)}
                    placeholder="Ej: INGRESAR A LA TRIVIA AHORA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* MENSAJE_SECUNDARIO */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %MENSAJE_SECUNDARIO% <span className="text-slate-500 font-normal">(Alerta o aclaración en recuadro)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={params.MENSAJE_SECUNDARIO || ''}
                    onChange={(e) => handleParamChange('MENSAJE_SECUNDARIO', e.target.value)}
                    placeholder="Aclaración en recuadro..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* EMPRESA_NOMBRE */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %EMPRESA_NOMBRE% <span className="text-slate-500 font-normal">(Firma institucional)</span>
                  </label>
                  <input
                    type="text"
                    value={params.EMPRESA_NOMBRE || ''}
                    onChange={(e) => handleParamChange('EMPRESA_NOMBRE', e.target.value)}
                    placeholder="Don Yeyo S.A."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* CONTACTO_SOPORTE */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    %CONTACTO_SOPORTE% <span className="text-slate-500 font-normal">(Ayuda y canal de contacto)</span>
                  </label>
                  <input
                    type="text"
                    value={params.CONTACTO_SOPORTE || ''}
                    onChange={(e) => handleParamChange('CONTACTO_SOPORTE', e.target.value)}
                    placeholder="Contacto o soporte..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* URLs Absolutas de Imágenes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      %URL_LOGO% <span className="text-slate-500 font-normal">(URL absoluta)</span>
                    </label>
                    <input
                      type="text"
                      value={params.URL_LOGO || ''}
                      onChange={(e) => handleParamChange('URL_LOGO', e.target.value)}
                      placeholder="https://.../logo-donyeyo.svg"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      %URL_FONDO% <span className="text-slate-500 font-normal">(URL absoluta)</span>
                    </label>
                    <input
                      type="text"
                      value={params.URL_FONDO || ''}
                      onChange={(e) => handleParamChange('URL_FONDO', e.target.value)}
                      placeholder="https://.../fondo-rayos.png"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botón flotante para guardar cambios */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {hasUnsavedChanges ? '⚠️ Tienes cambios pendientes de guardar' : '✓ Sincronizado con Supabase'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveParams}
                  disabled={isSavingParams || !hasUnsavedChanges}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-40"
                >
                  {isSavingParams ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Guardar Parámetros</span>
                </button>
              </div>
            </div>
          )}

          {/* SUB-VISTA 2: PANEL DE DESPACHO Y ENVÍO */}
          {leftSubTab === 'DISPATCH' && (
            <div className="space-y-4">
              {/* Tarjeta de Métricas Rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Padrón con Email</span>
                  <p className="text-2xl font-black text-white mt-1">{totalWithEmail}</p>
                  <p className="text-[10px] text-slate-500">{mailingStatus?.totalParticipants || 0} inscriptos en nómina</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Enviados / Cobertura</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{sentCount}</p>
                  <p className="text-[10px] text-emerald-300/70">{sentPct}% despachado</p>
                </div>
              </div>

              {/* Envío de Prueba Individual */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Envío de Prueba ({activeTab})
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Envía el correo de muestra a tu casilla con los parámetros tipeados en tiempo real.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="tu-email@donyeyo.com.ar"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSendingTest}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{isSendingTest ? 'Enviando...' : 'Probar'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold ${
                    testResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                  }`}>
                    {testResult.success ? testResult.message : testResult.error}
                  </div>
                )}
              </div>

              {/* Despacho Masivo */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Despacho Masivo a Participantes
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Tamaño del lote:</span>
                    <span className="font-mono text-purple-300 font-bold">{batchLimit} emails por tanda</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="10"
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500"
                  />

                  <label className="flex items-center gap-2 text-slate-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resendAll}
                      onChange={(e) => setResendAll(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <span>Forzar reenvío a todos (incluso ya enviados)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSendBatch}
                  disabled={isSendingBatch || (!resendAll && pendingCount === 0)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isSendingBatch ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>
                    {resendAll
                      ? `Reenviar a Todos (${totalWithEmail})`
                      : `Enviar a Pendientes (${pendingCount})`}
                  </span>
                </button>

                {batchResult && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300">
                    <p className="font-bold text-white">{batchResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha (7 Cols): Vista Previa en Vivo en Tiempo Real */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barra de Controles de la Vista Previa */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Eye size={18} className="text-purple-400" />
              <div>
                <span className="text-xs font-heading font-black text-white uppercase tracking-wider block">
                  Vista Previa en Tiempo Real ({activeTab === 'INVITACION' ? 'Invitación' : 'Resultados'})
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Se actualiza instantáneamente con cada cambio que escribas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Ver Código HTML */}
              <button
                type="button"
                onClick={() => setShowHtmlCode(!showHtmlCode)}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  showHtmlCode
                    ? 'bg-purple-600 text-white border-purple-400/40'
                    : 'text-slate-400 hover:text-white border-white/10 hover:bg-white/5'
                }`}
                title="Ver código HTML fuente"
              >
                <Code2 size={15} />
                <span className="hidden sm:inline">HTML</span>
              </button>

              {/* Selector de Dispositivo Desktop / Mobile */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista de escritorio"
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista en smartphone (380px)"
                >
                  <Smartphone size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Área de Visualización: Iframe o Código HTML */}
          <div className="w-full flex justify-center bg-slate-950 rounded-3xl border border-white/15 p-3 sm:p-5 shadow-2xl relative min-h-[640px]">
            {isRenderingPreview && (
              <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-slate-900/90 border border-white/20 text-purple-300 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span>Actualizando...</span>
              </div>
            )}

            {showHtmlCode ? (
              <div className="w-full h-[620px] overflow-auto bg-slate-900/90 rounded-2xl p-4 font-mono text-[11px] text-emerald-300 custom-modal-scrollbar select-all">
                <pre>{previewHtml}</pre>
              </div>
            ) : (
              <div
                className={`transition-all duration-300 rounded-2xl overflow-hidden bg-white shadow-2xl border border-slate-700 ${
                  previewDevice === 'mobile' ? 'w-[380px] h-[640px]' : 'w-full h-[680px]'
                }`}
              >
                <iframe
                  title="Live Email Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
