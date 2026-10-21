// ==============================================================================
// GESTOR DE MAILING CORPORATIVO (ESTÁNDAR DON YEYO S.A.)
// Gestión de envíos masivos: Invitaciones a jugar y Devolución de Resultados Pedagógicos
// Don Yeyo S.A. | Trivia Inocuidad 2026 | Referencia dy_shigma
// ==============================================================================
import React, { useState, useEffect } from 'react';
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
  Flame,
  HelpCircle,
  Clock
} from 'lucide-react';
import {
  fetchMailingStatus,
  sendTestEmail,
  sendBatchMailing
} from '../../services/mailingService';
import { getStoredAdminToken } from '../../services/adminService';

export default function AdminMailingView({ activePhase = 1 }) {
  const brandName = import.meta.env.VITE_ADMIN_BRAND_NAME || 'DY-TRIVIA';

  // Tipo de campaña seleccionada: 'INVITATION' | 'RESULTS_FEEDBACK'
  const [selectedCampaign, setSelectedCampaign] = useState('INVITATION');

  // Estado del servicio
  const [mailingStatus, setMailingStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Estados de envío de prueba
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Estados de envío masivo
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchLimit, setBatchLimit] = useState(50);
  const [resendAll, setResendAll] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Vista previa
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Notificación rápida
  const [statusNotification, setStatusNotification] = useState(null);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const token = getStoredAdminToken();
      const status = await fetchMailingStatus(token);
      if (status) {
        setMailingStatus(status);
        if (!testEmailAddress && status.config?.testEmail) {
          setTestEmailAddress(status.config.testEmail);
        }
      }
    } catch (e) {
      console.error('Error cargando estado de mailing:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const showNotification = (text, type = 'success') => {
    setStatusNotification({ text, type });
    setTimeout(() => setStatusNotification(null), 6000);
  };

  // Enviar correo de prueba
  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) {
      alert('Por favor ingresa una dirección de email válida para la prueba.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    const token = getStoredAdminToken();
    const res = await sendTestEmail(testEmailAddress, token);
    setIsSendingTest(false);
    setTestResult(res);

    if (res.success) {
      showNotification(`✅ Correo de prueba enviado a ${testEmailAddress}`);
    } else {
      showNotification(`❌ Error en envío de prueba: ${res.error}`, 'error');
    }
  };

  // Enviar lote de correos
  const handleSendBatch = async () => {
    const isResend = resendAll;
    const confirmMsg = isResend
      ? `¿Estás seguro de que deseas REENVIAR masivamente el correo a TODOS los participantes (${mailingStatus?.totalWithEmail || 0} con email)?\n\nEsta acción enviará invitaciones incluso a quienes ya la hayan recibido.`
      : `¿Confirmas el envío de invitaciones a los ${mailingStatus?.pendingCount || 0} participantes que aún no la recibieron?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSendingBatch(true);
    setBatchResult(null);

    const token = getStoredAdminToken();
    const res = await sendBatchMailing({ limit: batchLimit, resendAll: isResend }, token);
    setIsSendingBatch(false);
    setBatchResult(res);

    if (res.success) {
      showNotification(`🎉 ¡Lote despachado exitosamente! Enviados: ${res.sentCount}`);
      await loadStatus();
    } else {
      showNotification(`❌ Error en el envío masivo: ${res.error || 'Fallo desconocido'}`, 'error');
    }
  };

  const totalWithEmail = mailingStatus?.totalWithEmail || 0;
  const sentCount = mailingStatus?.sentCount || 0;
  const pendingCount = mailingStatus?.pendingCount || 0;
  const sentPct = totalWithEmail > 0 ? Math.round((sentCount / totalWithEmail) * 100) : 0;

  return (
    <div className="w-full space-y-6 animate-casual-in">
      {/* Cabecera Principal de la Sección Mailing */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={12} />
              <span>Servicio de Mailing Corporativo</span>
            </span>
            <span className="text-xs text-slate-400">
              Conexión SMTP Microsoft 365 / Outlook
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
            Gestión y Despacho de Emails
          </h2>
        </div>

        {/* Botón Refrescar Estado */}
        <button
          onClick={loadStatus}
          type="button"
          disabled={isLoadingStatus}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/5 flex items-center gap-2 cursor-pointer self-start md:self-center"
        >
          <RefreshCw size={14} className={isLoadingStatus ? 'animate-spin' : ''} />
          <span>Actualizar Métricas</span>
        </button>
      </div>

      {/* Notificación de Estado */}
      {statusNotification && (
        <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-xl backdrop-blur-md animate-casual-in ${
          statusNotification.type === 'error'
            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
            : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusNotification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{statusNotification.text}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-xs underline cursor-pointer ml-3 opacity-80 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Selector de Campaña / Plantilla de Correo */}
      <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-slate-900 border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={() => setSelectedCampaign('INVITATION')}
          className={`flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            selectedCampaign === 'INVITATION'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Send size={16} />
          <span>1. Invitación a Jugar (Campaña Activa)</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCampaign('RESULTS_FEEDBACK')}
          className={`flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            selectedCampaign === 'RESULTS_FEEDBACK'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          <span>2. Resultados & Explicaciones Pedagógicas</span>
        </button>
      </div>

      {/* Grid de KPIs de Cobertura */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Con Email</p>
            <h3 className="text-2xl font-heading font-black text-white mt-1">{totalWithEmail}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Destinatarios válidos</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Enviados</p>
            <h3 className="text-2xl font-heading font-black text-emerald-400 mt-1">
              {sentCount} <span className="text-xs text-slate-400 font-normal">({sentPct}%)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Invitaciones despachadas</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pendientes</p>
            <h3 className="text-2xl font-heading font-black text-amber-400 mt-1">{pendingCount}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Por enviar invitación</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Servidor SMTP</p>
            <h3 className="text-sm font-black text-white mt-1 truncate max-w-[120px]">
              {mailingStatus?.config?.smtpHost || 'Microsoft 365'}
            </h3>
            <p className="text-[10px] text-emerald-400 mt-0.5">● Conectado y listo</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Server size={22} />
          </div>
        </div>
      </div>

      {/* Contenido según la campaña seleccionada */}
      {selectedCampaign === 'INVITATION' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Panel de Envío Masivo y Prueba */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tarjeta de Despacho Masivo */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-base">
                    Envío Masivo de Invitaciones
                  </h3>
                  <p className="text-xs text-slate-400">
                    Despacho con enlace criptográfico único por participante
                  </p>
                </div>
              </div>

              {/* Opciones de Despacho */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Modo de Envío:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResendAll(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !resendAll
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Solo Pendientes ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResendAll(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        resendAll
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Reenviar a Todos ({totalWithEmail})
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-slate-300">Tamaño del Lote:</span>
                  <select
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-bold focus:outline-none"
                  >
                    <option value={20}>20 correos</option>
                    <option value={50}>50 correos</option>
                    <option value={100}>100 correos</option>
                    <option value={500}>Todos</option>
                  </select>
                </div>
              </div>

              {/* Botón de Disparo Masivo */}
              <button
                type="button"
                onClick={handleSendBatch}
                disabled={isSendingBatch || (!resendAll && pendingCount === 0)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isSendingBatch ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Despachando Lote de Correos...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>
                      {resendAll
                        ? `Reenviar a Todos (${totalWithEmail})`
                        : `Enviar a Pendientes (${pendingCount})`}
                    </span>
                  </>
                )}
              </button>

              {batchResult && (
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
                  <p className="font-bold">{batchResult.message}</p>
                  {batchResult.sentCount > 0 && (
                    <p className="text-[11px] text-slate-300 mt-1">
                      Invitaciones enviadas exitosamente: <strong>{batchResult.sentCount}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tarjeta de Envío de Prueba Individual */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-base">
                    Envío de Prueba Individual
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verifica cómo llega el email con un participante de muestra
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendTest} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Email de Destino para Prueba:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu-email@donyeyo.com.ar"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando Prueba...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Enviar Email de Prueba</span>
                    </>
                  )}
                </button>
              </form>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/40 border border-rose-500/30 text-rose-200'
                }`}>
                  {testResult.success ? testResult.message : testResult.error}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo del Correo */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Vista Previa del Email de Invitación
                </span>
              </div>

              {/* Selector Desktop / Mobile */}
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
                  title="Vista en smartphone"
                >
                  <Smartphone size={15} />
                </button>
              </div>
            </div>

            {/* Contenedor del Preview */}
            <div className={`mx-auto bg-slate-950 rounded-3xl border border-white/15 p-4 sm:p-6 overflow-hidden transition-all ${
              previewDevice === 'mobile' ? 'max-w-sm shadow-2xl' : 'w-full shadow-xl'
            }`}>
              {/* Tarjeta de Email Simulado Don Yeyo */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl text-slate-900 font-sans">
                {/* Cabecera Roja Don Yeyo */}
                <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 p-6 text-center text-white relative">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-2xl p-2.5 shadow-lg flex items-center justify-center">
                    <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                    Semana de la Inocuidad 2026
                  </span>
                  <h3 className="text-xl font-heading font-black mt-2 leading-tight">
                    ¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!
                  </h3>
                  <p className="text-xs text-red-100 mt-1">
                    Llegó el momento de demostrar todo lo que sabés.
                  </p>
                </div>

                {/* Cuerpo del Mensaje */}
                <div className="p-6 sm:p-8 space-y-5 text-sm">
                  <p className="font-bold text-slate-800">
                    Hola <span className="text-red-600 font-black">Juan Pérez</span> (Legajo: 1234),
                  </p>

                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    Te invitamos a participar en la trivia oficial de la <strong>Semana de la Inocuidad 2026</strong> en Don Yeyo.
                    Completá la trivia, acumulá puntos y asegurá tu lugar en la siguiente fase.
                  </p>

                  {/* Tarjeta de Advertencia */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                    ⚠️ <strong>Muy importante:</strong> cada pregunta permite un único intento por participante.
                  </div>

                  {/* Botón CTA */}
                  <div className="text-center pt-2">
                    <div className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg">
                      INGRESAR A LA TRIVIA AHORA
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-2">
                      Enlace personalizado e intransferible
                    </span>
                  </div>

                  {/* Pie del Email */}
                  <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
                    <p className="font-bold text-slate-600">
                      Don Yeyo S.A. &bull; Departamento de Calidad e Inocuidad
                    </p>
                    <p>Para consultas, comunicate con el área de Calidad o RR.HH.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Campaña 2: Devolución de Resultados & Explicaciones Pedagógicas */
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-3">
                <BookOpen size={14} />
                <span>Campaña Post-Fase &bull; Feedback Pedagógico</span>
              </div>
              <h3 className="text-2xl font-heading font-black text-white">
                Devolución Masiva de Respuestas y Justificaciones
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Esta campaña está preparada para dispararse una vez finalizada la fase del torneo.
                Cada participante recibirá su reporte individual con los puntos logrados, las preguntas en las que acertó, en cuáles se equivocó, y la <strong>justificación normativa de la respuesta correcta</strong> cargada en el banco de preguntas.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <span className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                Fase {activePhase} Activa
              </span>
            </div>
          </div>

          {/* Vista Previa del Email de Resultados */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-emerald-400" />
                <h4 className="font-heading font-black text-white text-sm sm:text-base">
                  Previsualización de la Plantilla de Devolución Pedagógica
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Ejemplo con participante simulado
              </span>
            </div>

            {/* Email Simulado de Devolución */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl text-slate-900 font-sans border border-slate-200">
              {/* Header Verde/Dorado */}
              <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 text-center text-white">
                <div className="w-14 h-14 mx-auto mb-2 bg-white rounded-2xl p-2 shadow flex items-center justify-center">
                  <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
                </div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase">
                  Semana de la Inocuidad 2026 &bull; Fase {activePhase}
                </span>
                <h3 className="text-xl font-heading font-black mt-2">
                  ¡Resultados de tu Participación!
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  Tu desempeño y devolución pedagógica del desafío.
                </p>
              </div>

              {/* Desglose de Desempeño */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Puntaje</span>
                    <span className="text-lg font-black text-slate-900">140.120 pts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Aciertos</span>
                    <span className="text-lg font-black text-emerald-700">14 de 15</span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Tiempo Total</span>
                    <span className="text-lg font-black text-blue-700">117 seg</span>
                  </div>
                </div>

                {/* Ejemplos de Preguntas con Justificación */}
                <div className="space-y-3">
                  <h5 className="font-heading font-black text-xs uppercase tracking-wider text-slate-700">
                    Detalle de Preguntas y Respuestas:
                  </h5>

                  {/* Pregunta 1 (Correcta) */}
                  <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Pregunta 1: Uso de anillos y relojes</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                        ✓ Correcta (+100 pts)
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Tu respuesta:</strong> Porque pueden acumular suciedad microbiológica y desprenderse como cuerpo extraño.
                    </p>
                    <div className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-[11px]">
                      💡 <strong>Justificación normativa:</strong> La normativa BPM prohíbe el uso de joyas para evitar contaminaciones físicas (cuerpo extraño) y biológicas en la masa.
                    </div>
                  </div>

                  {/* Pregunta 2 (Incorrecta) */}
                  <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Pregunta 2: Zona de peligro de temperatura</span>
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                        ✗ Incorrecta
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Tu respuesta:</strong> De 0°C a 4°C &bull; <strong className="text-emerald-700">Correcta:</strong> De 20°C a 45°C.
                    </p>
                    <div className="p-2 rounded-lg bg-white border border-rose-200 text-rose-950 text-[11px]">
                      💡 <strong>Justificación normativa:</strong> Entre 20°C y 45°C los microorganismos patógenos encuentran la temperatura óptima de multiplicación celular exponencial.
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
                  Don Yeyo S.A. &bull; Calidad y Compromiso con la Inocuidad
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
