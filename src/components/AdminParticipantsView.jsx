// ==============================================================================
// GESTIÓN INTEGRAL DE PARTICIPANTES (PANEL DE ADMINISTRACIÓN)
// Don Yeyo S.A. | Semana de la Inocuidad 2026
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Trash2,
  Edit3,
  KeyRound,
  Mail,
  Send,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Zap,
  HelpCircle,
  Eye,
  X,
  MailCheck,
  Clock,
  Play,
  SendHorizontal,
  Settings2
} from 'lucide-react';
import {
  fetchParticipantsAdmin,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  regenerateParticipantHash,
  generateAllMissingHashes,
  toggleEmailSent,
  resetParticipantTrivia,
  buildParticipationUrl
} from '../services/participantsService';
import {
  sendSingleParticipantEmail,
  sendTestEmail,
  sendBatchMailing,
  markAllEmailsSent
} from '../services/mailingService';

export default function AdminParticipantsView({ activePhase = 1, onOpenImportCsv }) {
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [emailStatusFilter, setEmailStatusFilter] = useState('ALL');
  const [hashStatusFilter, setHashStatusFilter] = useState('ALL');
  const [triviaStatusFilter, setTriviaStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'PARTIAL' | 'NOT_PLAYED'

  // Paginación
  // Paginación parametrizada por variable de entorno (por defecto 100)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = Number(import.meta.env.VITE_ADMIN_PARTICIPANTS_PER_PAGE) || 100;

  // Estado de Copia
  const [copiedLegajo, setCopiedLegajo] = useState(null);

  // Estados de carga de acciones específicas (para spinners en filas)
  const [actionLoadingLegajo, setActionLoadingLegajo] = useState(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // Modales
  // 1. Modal Crear / Editar
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null); // null = Crear, objeto = Editar
  const [formData, setFormData] = useState({
    legajo: '',
    nombre: '',
    apellido: '',
    sector: '',
    email: '',
    autoGenerateHash: true
  });
  const [formError, setFormError] = useState('');
  const [isSavingForm, setIsSavingForm] = useState(false);

  // 2. Modal Reset Trivia
  const [resetModalParticipant, setResetModalParticipant] = useState(null);
  const [resetPhaseOption, setResetPhaseOption] = useState('ACTIVE'); // 'ACTIVE' | 'ALL'
  const [isResetting, setIsResetting] = useState(false);

  // 3. Modal Eliminar
  const [deleteModalParticipant, setDeleteModalParticipant] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 4. Modal Mailing Integral (Envío y Reenvío)
  const [isMailingModalOpen, setIsMailingModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isMailingRunning, setIsMailingRunning] = useState(false);
  const [mailingStatusMsg, setMailingStatusMsg] = useState('');
  const [mailingProgress, setMailingProgress] = useState({ sent: 0, failed: 0, total: 0 });

  // Bloquear scroll de la página cuando algún modal esté abierto
  useEffect(() => {
    const isAnyModalOpen = isEditModalOpen || Boolean(resetModalParticipant) || Boolean(deleteModalParticipant) || isMailingModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isEditModalOpen, resetModalParticipant, deleteModalParticipant, isMailingModalOpen]);

  // Mostrar mensaje tipo Toast autodescartable
  const notify = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? '' : prev));
    }, 4500);
  };

  // Helper para determinar el estado de la trivia de un participante
  const getParticipantTriviaStatus = (p) => {
    const count = Number(
      p.answersCount ??
      p.total_responses ??
      (Array.isArray(p.responses) ? p.responses.length : 0)
    );
    if (count >= 15) {
      return { code: 'COMPLETED', label: 'Completado', count };
    }
    if (count > 0) {
      return { code: 'PARTIAL', label: 'Parcial', count };
    }
    return { code: 'NOT_PLAYED', label: 'Sin jugar', count: 0 };
  };

  // Carga inicial y refresco
  const loadParticipants = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchParticipantsAdmin();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando participantes:', err);
      setErrorMsg('No se pudo cargar la lista de participantes. Revisa la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  // Lista de sectores únicos para el filtro
  const availableSectors = useMemo(() => {
    const sectors = new Set();
    participants.forEach((p) => {
      if (p.sector && typeof p.sector === 'string' && p.sector.trim()) {
        sectors.add(p.sector.trim());
      }
    });
    return Array.from(sectors).sort();
  }, [participants]);

  // Filtrado de participantes
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Búsqueda libre
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const full = `${p.nombre || ''} ${p.apellido || ''} ${p.legajo || ''} ${p.sector || ''} ${p.email || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }

      // Filtro de Sector
      if (sectorFilter !== 'ALL') {
        if ((p.sector || '').trim() !== sectorFilter) return false;
      }

      // Filtro de Email Enviado
      if (emailStatusFilter === 'SENT' && !p.email_enviado) return false;
      if (emailStatusFilter === 'PENDING' && p.email_enviado) return false;

      // Filtro de Hash
      if (hashStatusFilter === 'WITH_HASH' && !p.token_hash) return false;
      if (hashStatusFilter === 'WITHOUT_HASH' && p.token_hash) return false;

      // Filtro de Estado Trivia
      if (triviaStatusFilter !== 'ALL') {
        const st = getParticipantTriviaStatus(p);
        if (st.code !== triviaStatusFilter) return false;
      }

      return true;
    });
  }, [participants, searchTerm, sectorFilter, emailStatusFilter, hashStatusFilter, triviaStatusFilter]);

  // Paginación calculada
  const totalPages = Math.ceil(filteredParticipants.length / pageSize) || 1;
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParticipants.slice(start, start + pageSize);
  }, [filteredParticipants, currentPage, pageSize]);

  // Si cambiamos de filtro y quedamos en una página inexistente, volver a la 1
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Métricas para tarjetas KPI
  const metrics = useMemo(() => {
    const total = participants.length;
    const withHash = participants.filter((p) => Boolean(p.token_hash)).length;
    const withoutHash = total - withHash;
    const withEmail = participants.filter((p) => Boolean(p.email && p.email.trim())).length;
    const emailSentCount = participants.filter((p) => Boolean(p.email_enviado)).length;

    let completedCount = 0;
    let partialCount = 0;
    let notPlayedCount = 0;

    participants.forEach((p) => {
      const st = getParticipantTriviaStatus(p);
      if (st.code === 'COMPLETED') completedCount++;
      else if (st.code === 'PARTIAL') partialCount++;
      else notPlayedCount++;
    });

    const playedCount = completedCount + partialCount;

    return {
      total,
      withHash,
      withoutHash,
      withEmail,
      emailSentCount,
      emailSentPct: total > 0 ? Math.round((emailSentCount / total) * 100) : 0,
      playedCount,
      playedPct: total > 0 ? Math.round((playedCount / total) * 100) : 0,
      completedCount,
      partialCount,
      notPlayedCount
    };
  }, [participants]);

  // =========================================================================
  // ACCIONES INDIVIDUALES
  // =========================================================================

  // 1. Copiar Link de Participación
  const handleCopyLink = (p) => {
    if (!p.token_hash) {
      alert('Este participante no tiene token hash generado aún. Primero genera su hash.');
      return;
    }
    const url = buildParticipationUrl(p.token_hash);
    navigator.clipboard.writeText(url);
    setCopiedLegajo(p.legajo);
    notify(`📋 ¡Enlace copiado al portapapeles para ${p.nombre} ${p.apellido}!`);
    setTimeout(() => {
      setCopiedLegajo((prev) => (prev === p.legajo ? null : prev));
    }, 2500);
  };

  // 2. Toggle Email Enviado
  const handleToggleEmail = async (p) => {
    const newStatus = !p.email_enviado;
    setActionLoadingLegajo(p.legajo);

    // Optimistic update
    setParticipants((prev) =>
      prev.map((item) => (item.legajo === p.legajo ? { ...item, email_enviado: newStatus } : item))
    );

    const res = await toggleEmailSent(p.legajo, newStatus);
    setActionLoadingLegajo(null);

    if (res.success) {
      notify(
        newStatus
          ? `✉️ Marcado como "Email Enviado" a ${p.nombre} ${p.apellido}`
          : `⏳ Marcado como "Pendiente de Envío" para ${p.nombre} ${p.apellido}`
      );
    } else {
      // Revert on error
      setParticipants((prev) =>
        prev.map((item) => (item.legajo === p.legajo ? { ...item, email_enviado: !newStatus } : item))
      );
      alert(`Error al actualizar estado de email: ${res.error}`);
    }
  };

  // 3. Enviar / Reenviar Email Individual
  const handleSendSingleEmail = async (p) => {
    if (!p.email) {
      alert(`El participante ${p.nombre} ${p.apellido} no tiene email registrado.`);
      return;
    }
    if (!p.token_hash) {
      alert(`El participante ${p.nombre} ${p.apellido} no tiene token hash generado. Genera su hash primero.`);
      return;
    }

    const actionText = p.email_enviado ? 'reenviar' : 'enviar';
    if (
      !window.confirm(
        `¿Deseas ${actionText} la invitación de la trivia a:\n\n${p.nombre} ${p.apellido}\nEmail: ${p.email}\nLegajo: ${p.legajo}`
      )
    ) {
      return;
    }

    setActionLoadingLegajo(p.legajo);
    const res = await sendSingleParticipantEmail(p.legajo);
    setActionLoadingLegajo(null);

    if (res.success) {
      setParticipants((prev) =>
        prev.map((item) => (item.legajo === p.legajo ? { ...item, email_enviado: true } : item))
      );
      notify(`✉️ Invitación enviada exitosamente a ${p.email}`);
    } else {
      alert(`Error al enviar correo: ${res.error || 'Ocurrió un error en el servidor'}`);
    }
  };

  // 4. Enviar Email de Prueba (Test)
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      alert('Ingresa una dirección de correo válida para la prueba.');
      return;
    }

    setIsSendingTest(true);
    const res = await sendTestEmail(testEmailAddress.trim());
    setIsSendingTest(false);

    if (res.success) {
      notify(`📧 Correo de prueba enviado con éxito a ${testEmailAddress}`);
    } else {
      alert(`Error al enviar correo de prueba: ${res.error}`);
    }
  };

  // 5. Enviar Mailing Masivo (Pendientes o Todos)
  const handleBatchMailing = async (filterType) => {
    const isPending = filterType === 'PENDING';
    const targetCount = isPending
      ? participants.filter((p) => p.email && !p.email_enviado).length
      : participants.filter((p) => p.email).length;

    if (targetCount === 0) {
      alert(
        isPending
          ? 'No hay participantes pendientes de envío con email válido.'
          : 'No hay participantes con email válido.'
      );
      return;
    }

    const confirmMsg = isPending
      ? `¿Iniciar envío masivo de invitaciones a los ${targetCount} participantes PENDIENTES?`
      : `⚠️ ATENCIÓN: Se REENVIARÁ el correo de invitación a TODOS los ${targetCount} participantes con email registrado.\n\n¿Deseas continuar?`;

    if (!window.confirm(confirmMsg)) return;

    setIsMailingRunning(true);
    setMailingStatusMsg(`Procesando lote de ${targetCount} correos...`);
    setMailingProgress({ sent: 0, failed: 0, total: targetCount });

    try {
      const res = await sendBatchMailing({ filter: filterType, delayMs: 400 });
      if (res.success) {
        setMailingProgress({ sent: res.sentCount || 0, failed: res.failedCount || 0, total: targetCount });
        notify(`🎉 Mailing completado: ${res.sentCount} enviados, ${res.failedCount || 0} fallidos.`);
        await loadParticipants();
      } else {
        alert(`Error en el proceso de mailing: ${res.error}`);
      }
    } catch (err) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setIsMailingRunning(false);
    }
  };

  // 6. Marcar Todos como Enviados / Pendientes en Base de Datos (Sin enviar correos)
  const handleMarkAllEmails = async (markAsSent) => {
    const actionLabel = markAsSent ? 'ENVIADOS' : 'PENDIENTES';
    if (
      !window.confirm(
        `¿Seguro que deseas marcar a TODOS los participantes como ${actionLabel} en la base de datos?\n\n(Esta acción solo actualiza el registro en la base de datos, NO envía correos).`
      )
    ) {
      return;
    }

    setIsMailingRunning(true);
    const res = await markAllEmailsSent(markAsSent);
    setIsMailingRunning(false);

    if (res.success) {
      notify(`✅ Marcados todos los participantes como ${actionLabel}`);
      await loadParticipants();
    } else {
      alert(`Error al actualizar marcas en base de datos: ${res.error}`);
    }
  };

  // 7. Regenerar Hash Individual
  const handleRegenerateHash = async (p) => {
    if (
      p.token_hash &&
      !window.confirm(
        `¿Deseas regenerar el hash de acceso para ${p.nombre} ${p.apellido} (Legajo: ${p.legajo})?\n\nSi ya le enviaste el enlace anterior, deberás enviarle el nuevo enlace generado.`
      )
    ) {
      return;
    }

    setActionLoadingLegajo(p.legajo);
    const res = await regenerateParticipantHash(p.legajo);
    setActionLoadingLegajo(null);

    if (res.success && res.token_hash) {
      setParticipants((prev) =>
        prev.map((item) => (item.legajo === p.legajo ? { ...item, token_hash: res.token_hash } : item))
      );
      notify(`🔑 ¡Nuevo hash generado con éxito para ${p.nombre} ${p.apellido}!`);
    } else {
      alert(`Error generando hash: ${res.error || 'Ocurrió un error inesperado'}`);
    }
  };

  // 4. Generar Hashes Masivos para los que no tienen
  const handleGenerateAllMissing = async () => {
    if (metrics.withoutHash === 0) {
      notify('✅ Todos los participantes ya tienen su token hash generado.');
      return;
    }

    if (
      !window.confirm(
        `Hay ${metrics.withoutHash} participante(s) sin hash de acceso.\n\n¿Deseas generarlos ahora automáticamente utilizando la frase semilla oficial?`
      )
    ) {
      return;
    }

    setIsBulkGenerating(true);
    const res = await generateAllMissingHashes();
    setIsBulkGenerating(false);

    if (res.success) {
      notify(`⚡ ¡Hashes generados correctamente! Se actualizaron ${res.updatedCount} participantes.`);
      await loadParticipants();
    } else {
      alert(`Error al generar hashes masivos: ${res.error}`);
    }
  };

  // 5. Abrir Modal Crear
  const handleOpenCreateModal = () => {
    setEditingParticipant(null);
    setFormData({
      legajo: '',
      nombre: '',
      apellido: '',
      sector: '',
      email: '',
      autoGenerateHash: true
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // 6. Abrir Modal Editar
  const handleOpenEditModal = (p) => {
    setEditingParticipant(p);
    setFormData({
      legajo: p.legajo || '',
      nombre: p.nombre || '',
      apellido: p.apellido || '',
      sector: p.sector || '',
      email: p.email || '',
      autoGenerateHash: !p.token_hash
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // 7. Guardar Formulario (Crear o Actualizar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.legajo || !formData.nombre || !formData.apellido) {
      setFormError('Legajo, Nombre y Apellido son obligatorios.');
      return;
    }

    setIsSavingForm(true);

    if (editingParticipant) {
      // Actualizar
      const res = await updateParticipant(editingParticipant.legajo, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        sector: formData.sector,
        email: formData.email
      });
      setIsSavingForm(false);

      if (res.success) {
        setIsEditModalOpen(false);
        notify(`✏️ Participante ${formData.nombre} ${formData.apellido} actualizado.`);
        await loadParticipants();
      } else {
        setFormError(res.error || 'No se pudo actualizar el participante.');
      }
    } else {
      // Crear
      const res = await createParticipant({
        legajo: formData.legajo,
        nombre: formData.nombre,
        apellido: formData.apellido,
        sector: formData.sector,
        email: formData.email,
        autoGenerateHash: formData.autoGenerateHash
      });
      setIsSavingForm(false);

      if (res.success) {
        setIsEditModalOpen(false);
        notify(`✨ Nuevo participante registrado: ${formData.nombre} ${formData.apellido} (${formData.legajo})`);
        await loadParticipants();
      } else {
        setFormError(res.error || 'No se pudo crear el participante.');
      }
    }
  };

  // 8. Confirmar y Ejecutar Reset Trivia
  const handleConfirmResetTrivia = async () => {
    if (!resetModalParticipant) return;
    const p = resetModalParticipant;
    setIsResetting(true);

    const phaseParam = resetPhaseOption === 'ACTIVE' ? activePhase : null;
    const res = await resetParticipantTrivia(p.legajo, phaseParam);
    setIsResetting(false);

    if (res.success) {
      const targetText = resetPhaseOption === 'ACTIVE' ? `la Fase ${activePhase}` : 'todas las fases';
      notify(`🔄 Trivia reseteada para ${p.nombre} ${p.apellido} en ${targetText}. Ahora puede volver a responder.`);
      setResetModalParticipant(null);
      await loadParticipants();
    } else {
      alert(`Error reseteando trivia: ${res.error}`);
    }
  };

  // 9. Confirmar y Ejecutar Eliminación
  const handleConfirmDelete = async () => {
    if (!deleteModalParticipant) return;
    const p = deleteModalParticipant;
    setIsDeleting(true);

    const res = await deleteParticipant(p.legajo);
    setIsDeleting(false);

    if (res.success) {
      notify(`🗑️ Participante ${p.nombre} ${p.apellido} (${p.legajo}) eliminado correctamente.`);
      setDeleteModalParticipant(null);
      await loadParticipants();
    } else {
      alert(`Error al eliminar participante: ${res.error}`);
    }
  };

  return (
    <div className="w-full space-y-6 animate-casual-in">
      {/* Toast Notificación */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl flex items-center gap-3 border border-emerald-400 animate-slide-in">
          <CheckCircle2 size={20} className="shrink-0 text-white" />
          <span className="flex-1">{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================================
          TARJETAS KPI RESUMEN DE PARTICIPANTES
          ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Participantes */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Nómina</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">{metrics.total}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Participantes registrados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {/* Hashes Generados */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
          <div>
            <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Con Enlace Hash</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {metrics.withHash}
              <span className="text-xs text-slate-400 font-normal ml-2">/ {metrics.total}</span>
            </h3>
            <p className="text-[11px] text-yellow-200/70 mt-0.5">
              {metrics.withoutHash > 0 ? `⚠️ ${metrics.withoutHash} sin hash` : '✅ 100% listos'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center">
            <KeyRound size={24} />
          </div>
        </div>

        {/* Emails Enviados */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
          <div>
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Emails Enviados</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {metrics.emailSentCount}
              <span className="text-xs text-purple-200 font-normal ml-2">({metrics.emailSentPct}%)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Invitaciones despachadas</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
            <Send size={24} />
          </div>
        </div>

        {/* Jugaron al menos 1 fase */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
          <div>
            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Participación</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {metrics.playedCount}
              <span className="text-xs text-emerald-200 font-normal ml-2">({metrics.playedPct}%)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Respondieron trivia</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE HERRAMIENTAS Y ACCIONES PRINCIPALES
          ========================================================================= */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, Apellido, Legajo, Sector o Email..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/15 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {metrics.withoutHash > 0 && (
              <button
                onClick={handleGenerateAllMissing}
                disabled={isBulkGenerating}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                title="Genera token hash para todos los participantes que aún no lo tienen"
              >
                <Zap size={16} className={isBulkGenerating ? 'animate-spin' : ''} />
                <span>Generar {metrics.withoutHash} Hashes</span>
              </button>
            )}

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Nuevo Participante</span>
            </button>

            {onOpenImportCsv && (
              <button
                onClick={onOpenImportCsv}
                className="px-3.5 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs transition-all shadow border border-blue-400/40 cursor-pointer"
                title="Importar lista masiva desde archivo CSV"
              >
                Importar CSV
              </button>
            )}

            <button
              onClick={loadParticipants}
              disabled={isLoading}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow border border-white/15 cursor-pointer disabled:opacity-50"
              title="Refrescar lista"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Fila de Filtros Secundarios */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <Filter size={14} />
            <span>Filtros:</span>
          </div>

          {/* Filtro Sector */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Todos los Sectores ({participants.length})</option>
            {availableSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Filtro Estado Email */}
          <select
            value={emailStatusFilter}
            onChange={(e) => setEmailStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Email: Todos</option>
            <option value="SENT">Email: Enviado ({metrics.emailSentCount})</option>
            <option value="PENDING">Email: Pendiente ({metrics.total - metrics.emailSentCount})</option>
          </select>

          {/* Filtro Estado Hash */}
          <select
            value={hashStatusFilter}
            onChange={(e) => setHashStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Hash: Todos</option>
            <option value="WITH_HASH">Con Hash ({metrics.withHash})</option>
            <option value="WITHOUT_HASH">Sin Hash ({metrics.withoutHash})</option>
          </select>

          {/* Filtro Estado Trivia (Corregido y con estados Parcial/Completado/Sin jugar) */}
          <select
            value={triviaStatusFilter}
            onChange={(e) => setTriviaStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Trivia: Todos ({participants.length})</option>
            <option value="COMPLETED">Completados 15/15 ({metrics.completedCount})</option>
            <option value="PARTIAL">En Curso / Parcial ({metrics.partialCount})</option>
            <option value="NOT_PLAYED">Sin Jugar ({metrics.notPlayedCount})</option>
          </select>

          {/* Contador de resultados */}
          <span className="ml-auto text-slate-400 font-medium">
            Mostrando <strong className="text-white">{filteredParticipants.length}</strong> de{' '}
            <strong className="text-white">{participants.length}</strong>
          </span>
        </div>
      </div>

      {/* =========================================================================
          TABLA DE PARTICIPANTES
          ========================================================================= */}
      <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw size={36} className="animate-spin text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-bold">Cargando nómina de participantes...</p>
            <p className="text-xs text-slate-400 mt-1">Consultando base de datos segura</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users size={44} className="text-slate-500 mx-auto mb-3" />
            <h4 className="text-white font-bold text-base">No se encontraron participantes</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchTerm ||
                sectorFilter !== 'ALL' ||
                emailStatusFilter !== 'ALL' ||
                hashStatusFilter !== 'ALL' ||
                triviaStatusFilter !== 'ALL'
                ? 'No hay registros que coincidan con los filtros aplicados. Prueba limpiar la búsqueda.'
                : 'Aún no hay participantes cargados. Agrega uno nuevo o importa una lista CSV.'}
            </p>
            {(searchTerm || sectorFilter !== 'ALL' || emailStatusFilter !== 'ALL' || hashStatusFilter !== 'ALL' || triviaStatusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSectorFilter('ALL');
                  setEmailStatusFilter('ALL');
                  setHashStatusFilter('ALL');
                  setTriviaStatusFilter('ALL');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/15 text-[11px] font-black uppercase tracking-wider text-slate-300">
                  <th className="py-3.5 px-4">Participante</th>
                  <th className="py-3.5 px-4">Sector</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4 text-center">Link de Acceso / Hash</th>
                  <th className="py-3.5 px-4 text-center">Email Enviado</th>
                  <th className="py-3.5 px-4 text-center">Estado Trivia</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {paginatedParticipants.map((p) => {
                  const hasHash = Boolean(p.token_hash);
                  const isCopied = copiedLegajo === p.legajo;
                  const isRowLoading = actionLoadingLegajo === p.legajo;
                  const participationUrl = hasHash ? buildParticipationUrl(p.token_hash) : '';
                  const triviaStatus = getParticipantTriviaStatus(p);

                  return (
                    <tr
                      key={p.legajo}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* Participante */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                            {p.nombre ? p.nombre[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {p.apellido}, {p.nombre}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-yellow-300 font-mono text-[10px] font-black border border-white/10">
                                Legajo {p.legajo}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold text-[11px]">
                          {p.sector || 'Sin Sector'}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {p.email ? (
                          <span className="truncate block max-w-[180px]" title={p.email}>
                            {p.email}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No especificado</span>
                        )}
                      </td>

                      {/* Link de Acceso / Hash */}
                      <td className="py-3.5 px-4 text-center">
                        {hasHash ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-xl border border-white/15">
                            {/* Botón Copiar Link */}
                            <button
                              onClick={() => handleCopyLink(p)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${isCopied
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'hover:text-white hover:bg-white/10'
                                }`}
                              title="Copiar enlace de acceso directo único"
                            >
                              {isCopied ? <Check size={14} /> : <Copy size={14} />}

                            </button>

                            {/* Abrir en nueva pestaña */}
                            <a
                              href={participationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Probar enlace en nueva pestaña"
                            >
                              <ExternalLink size={14} />
                            </a>

                            {/* Regenerar Hash */}
                            <button
                              onClick={() => handleRegenerateHash(p)}
                              disabled={isRowLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-300 hover:bg-white/10 transition-colors cursor-pointer"
                              title="Regenerar Token Hash"
                            >
                              <KeyRound size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegenerateHash(p)}
                            disabled={isRowLoading}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                          >
                            <Zap size={14} />
                            <span>Generar Hash</span>
                          </button>
                        )}
                      </td>

                      {/* Email Enviado Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleEmail(p)}
                          disabled={isRowLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${p.email_enviado
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800/80 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
                            }`}
                          title={p.email_enviado ? 'Click para marcar como NO enviado' : 'Click para marcar como ENVIADO'}
                        >
                          {p.email_enviado ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-400" />
                              <span>Enviado</span>
                            </>
                          ) : (
                            <>
                              <Mail size={14} />
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Estado Trivia (Corregido y con estados Parcial/Completado/Sin jugar) */}
                      <td className="py-3.5 px-4 text-center">
                        {triviaStatus.code === 'COMPLETED' ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]"
                            title="Completó las 15 preguntas de la trivia"
                          >
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>Completado ({triviaStatus.count}/15)</span>
                          </div>
                        ) : triviaStatus.code === 'PARTIAL' ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px]"
                            title={`En curso: respondió ${triviaStatus.count} de 15 preguntas`}
                          >
                            <Zap size={13} className="text-amber-400" />
                            <span>Parcial ({triviaStatus.count}/15)</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Sin jugar (0/15)</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Enviar / Reenviar Correo de Invitación */}
                          <button
                            onClick={() => handleSendSingleEmail(p)}
                            disabled={!p.email || isRowLoading}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${!p.email
                              ? 'text-slate-600 opacity-40 cursor-not-allowed'
                              : p.email_enviado
                                ? 'text-purple-300 hover:text-white hover:bg-purple-500/20'
                                : 'text-amber-400 hover:text-white hover:bg-amber-500/20'
                              }`}
                            title={
                              !p.email
                                ? 'Sin correo electrónico cargado'
                                : p.email_enviado
                                  ? `Reenviar invitación a ${p.email}`
                                  : `Enviar invitación a ${p.email}`
                            }
                          >
                            <Send size={15} />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Editar datos del participante"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Resetear Trivia */}
                          <button
                            onClick={() => {
                              setResetModalParticipant(p);
                              setResetPhaseOption('ACTIVE');
                            }}
                            className="p-2 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Resetear trivia para este usuario (permite volver a jugar)"
                          >
                            <RotateCcw size={15} />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => setDeleteModalParticipant(p)}
                            className="p-2 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Eliminar participante y sus respuestas"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginador */}
        {filteredParticipants.length > pageSize && (
          <div className="p-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Página <strong className="text-white">{currentPage}</strong> de{' '}
              <strong className="text-white">{totalPages}</strong> ({filteredParticipants.length} participantes)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: CREAR / EDITAR PARTICIPANTE (PORTAL ROOT)
          ========================================================================= */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            {/* Header fijo */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600/30 text-red-400 flex items-center justify-center border border-red-500/40">
                  {editingParticipant ? <Edit3 size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingParticipant ? 'Editar Participante' : 'Registrar Nuevo Participante'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingParticipant
                      ? `Modificando legajo ${editingParticipant.legajo}`
                      : 'Agrega un participante a la nómina de la trivia'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y footer fijo */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-modal-scrollbar text-xs">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-600/30 border border-red-500/50 text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Legajo */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Legajo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingParticipant)}
                    value={formData.legajo}
                    onChange={(e) => setFormData({ ...formData, legajo: e.target.value.trim() })}
                    placeholder="Ej: 1042"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  />
                  {editingParticipant && (
                    <p className="text-[10px] text-slate-400 mt-0.5">El número de legajo es identificador único y no puede cambiarse.</p>
                  )}
                </div>

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Nombre <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Juan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Apellido <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      placeholder="Ej: Pérez"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                  </div>
                </div>

                {/* Sector */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Sector / Área</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ej: Producción, Calidad, Logística..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email Corporativo / Personal</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ej: jperez@donyeyo.com.ar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>

                {/* Checkbox Auto-generar Hash (solo al crear) */}
                {!editingParticipant && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={formData.autoGenerateHash}
                        onChange={(e) => setFormData({ ...formData, autoGenerateHash: e.target.checked })}
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-white/20"
                      />
                      <span className="font-semibold text-xs">
                        Generar enlace único (token hash) automáticamente con la frase semilla
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Footer fijo con botones de acción */}
              <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-slate-950/70 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingForm}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingForm && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingParticipant ? 'Guardar Cambios' : 'Crear Participante'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL 2: RESETEAR TRIVIA PARA UN USUARIO (PORTAL ROOT)
          ========================================================================= */}
      {resetModalParticipant && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Resetear Trivia</h3>
                <p className="text-xs text-amber-200">
                  {resetModalParticipant.nombre} {resetModalParticipant.apellido} (Legajo:{' '}
                  {resetModalParticipant.legajo})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Esta acción eliminará las respuestas grabadas para este participante, permitiéndole ingresar nuevamente al
              enlace y responder la trivia desde cero como si fuera su primera vez.
            </p>

            {/* Opciones de Reset */}
            <div className="space-y-2 mb-6">
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetPhaseOption === 'ACTIVE'
                  ? 'bg-amber-500/15 border-amber-500/60 text-white'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <input
                    type="radio"
                    name="resetOption"
                    value="ACTIVE"
                    checked={resetPhaseOption === 'ACTIVE'}
                    onChange={() => setResetPhaseOption('ACTIVE')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Solo Fase Actual (Fase {activePhase})</span>
                </div>
                <span className="text-[10px] text-amber-300 uppercase font-black">Recomendado</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetPhaseOption === 'ALL'
                  ? 'bg-red-500/15 border-red-500/60 text-white'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <input
                    type="radio"
                    name="resetOption"
                    value="ALL"
                    checked={resetPhaseOption === 'ALL'}
                    onChange={() => setResetPhaseOption('ALL')}
                    className="text-red-500 focus:ring-red-500"
                  />
                  <span>Todas las Fases (1, 2, 3...)</span>
                </div>
                <span className="text-[10px] text-red-400 font-bold">Borrado Total</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResetModalParticipant(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetTrivia}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isResetting && <RefreshCw size={14} className="animate-spin" />}
                <span>Confirmar y Resetear</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL 3: ELIMINAR PARTICIPANTE (PORTAL ROOT)
          ========================================================================= */}
      {deleteModalParticipant && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-red-500/40 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-600/25 text-red-400 flex items-center justify-center border border-red-500/40">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Eliminar Participante</h3>
                <p className="text-xs text-red-300">
                  {deleteModalParticipant.nombre} {deleteModalParticipant.apellido} (Legajo:{' '}
                  {deleteModalParticipant.legajo})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              ¿Estás seguro de que deseas eliminar este participante? Se borrarán sus datos de la nómina y todas las
              respuestas que haya enviado en la trivia. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModalParticipant(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={14} className="animate-spin" />}
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL 4: PANEL INTEGRAL DE MAILING Y REENVÍO (SUPABASE) (PORTAL ROOT)
          ========================================================================= */}
      {isMailingModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="glass-panel w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            {/* Header fijo */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 border border-purple-400/40 shrink-0">
                  <Mail size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Centro de Despacho de Mailing</h3>
                  <p className="text-xs text-purple-200">
                    Envíos y reenvíos automáticos con plantilla oficial Don Yeyo e hipervínculos únicos de acceso
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isMailingRunning) setIsMailingModalOpen(false);
                }}
                disabled={isMailingRunning}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo con scroll interno */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-modal-scrollbar text-xs">

            {/* Resumen de Métricas de Mailing */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Nómina</p>
                <p className="text-xl font-black text-white mt-0.5">{metrics.total}</p>
                <p className="text-[10px] text-slate-500">{metrics.withEmail} con email</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
                <p className="text-[10px] uppercase font-bold text-yellow-300">Con Token Hash</p>
                <p className="text-xl font-black text-white mt-0.5">{metrics.withHash}</p>
                <p className="text-[10px] text-yellow-300/70">
                  {metrics.withoutHash > 0 ? `${metrics.withoutHash} pendientes` : '100% listos'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-[10px] uppercase font-bold text-emerald-300">Emails Enviados</p>
                <p className="text-xl font-black text-emerald-300 mt-0.5">{metrics.emailSentCount}</p>
                <p className="text-[10px] text-emerald-200/60">{metrics.emailSentPct}% despachado</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                <p className="text-[10px] uppercase font-bold text-purple-300">Pendientes</p>
                <p className="text-xl font-black text-purple-300 mt-0.5">
                  {Math.max(0, metrics.withEmail - metrics.emailSentCount)}
                </p>
                <p className="text-[10px] text-purple-200/60">con email listo</p>
              </div>
            </div>

            {/* Banner Informativo */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5 mb-6">
              <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                El sistema lee los participantes directamente de <strong>Supabase</strong>, genera el enlace seguro con su token hash, e inserta las credenciales en la plantilla HTML responsive oficial de la <strong>Semana de la Inocuidad 2026</strong>.
              </div>
            </div>

            {/* Sección 1: Enviar Correo de Prueba */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3 mb-5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Eye size={15} className="text-yellow-400" />
                <span>1. Enviar Correo de Prueba (Previsualización Real)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Envía un correo de muestra a cualquier casilla para verificar cómo se renderiza el diseño y los botones antes de enviar masivamente.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Ingresa tu correo (ej: tu-nombre@donyeyo.com.ar)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || isMailingRunning}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{isSendingTest ? 'Enviando...' : 'Enviar Prueba'}</span>
                </button>
              </div>
            </div>

            {/* Sección 2: Despacho Masivo / Reenvío */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4 mb-5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <SendHorizontal size={15} className="text-emerald-400" />
                <span>2. Despacho Masivo a Participantes</span>
              </div>

              {isMailingRunning && (
                <div className="p-3.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-3 animate-pulse">
                  <RefreshCw size={16} className="animate-spin text-purple-300" />
                  <div className="flex-1">
                    <p className="font-bold text-white">{mailingStatusMsg}</p>
                    <p className="text-[11px] text-purple-300 mt-0.5">
                      Enviados: {mailingProgress.sent} | Fallidos: {mailingProgress.failed}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Botón Enviar a Pendientes */}
                <button
                  type="button"
                  onClick={() => handleBatchMailing('PENDING')}
                  disabled={isMailingRunning || isSendingTest}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <MailCheck size={16} />
                  <span>
                    Enviar a Pendientes ({Math.max(0, metrics.withEmail - metrics.emailSentCount)})
                  </span>
                </button>

                {/* Botón Reenviar a Todos */}
                <button
                  type="button"
                  onClick={() => handleBatchMailing('ALL')}
                  disabled={isMailingRunning || isSendingTest}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  title="Reenvía el enlace a todos los participantes con correo cargado"
                >
                  <RefreshCw size={16} />
                  <span>Reenviar a Todos ({metrics.withEmail})</span>
                </button>
              </div>
            </div>

            {/* Sección 3: Acciones Rápidas de Marcas en Base de Datos */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Settings2 size={15} className="text-slate-400" />
                <span>3. Sincronización Masiva de Marcas (Sin enviar correos)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Útil para auditoría o para marcar todos como completados si ya se enviaron por otra plataforma:
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleMarkAllEmails(true)}
                  disabled={isMailingRunning}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Marcar TODOS como Enviados
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllEmails(false)}
                  disabled={isMailingRunning}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/15 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Marcar TODOS como Pendientes
                </button>
              </div>
            </div>
          </div>

            {/* Pie de modal fijo */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsMailingModalOpen(false)}
                disabled={isMailingRunning}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
