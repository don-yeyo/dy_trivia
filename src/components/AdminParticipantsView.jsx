// ==============================================================================
// GESTIÓN INTEGRAL DE PARTICIPANTES (PANEL DE ADMINISTRACIÓN)
// Don Yeyo S.A. | Semana de la Inocuidad 2026
// ==============================================================================
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Settings2,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Download,
  UserCheck,
  UserX,
  Eraser,
  ChevronDown,
  FolderPlus,
  Folder,
  Tag,
  Plus,
  BookmarkPlus,
  Layers
} from 'lucide-react';
import {
  fetchParticipantsAdmin,
  fetchParticipantsAndGroups,
  fetchGroups,
  createGroup,
  deleteGroup,
  assignGroupBatch,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  regenerateParticipantHash,
  generateAllMissingHashes,
  toggleEmailSent,
  resetParticipantTrivia,
  resetParticipantTriviaBatch,
  buildParticipationUrl,
  toggleParticipantActive,
  setParticipantsActiveBatch,
  clearParticipantHash,
  clearParticipantHashBatch,
  regenerateParticipantHashBatch,
  toggleEmailSentBatch
} from '../services/participantsService';
import {
  sendSingleParticipantEmail,
  sendTestEmail,
  sendBatchMailing,
  markAllEmailsSent
} from '../services/mailingService';
import { exportSelectedParticipantsToExcel } from '../services/exportExcelService';

export default function AdminParticipantsView({ activePhase = 1, onOpenImportCsv }) {
  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL'); // 'ALL' | 'NO_GROUP' | '<nombre>'
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [classificationFilter, setClassificationFilter] = useState('ALL'); // 'ALL' | 'QUALIFIED' | 'NOT_QUALIFIED'
  const [emailStatusFilter, setEmailStatusFilter] = useState('ALL');
  const [hashStatusFilter, setHashStatusFilter] = useState('ALL');
  const [triviaStatusFilter, setTriviaStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'PARTIAL' | 'NOT_PLAYED'

  // Ordenamiento por columnas
  const [sortColumn, setSortColumn] = useState('participante');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Selección múltiple y acciones masivas
  const [selectedLegajos, setSelectedLegajos] = useState(new Set());
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState('');
  const presetsRef = useRef(null);

  // Cerrar menú de preseteo al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setIsPresetsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    grupo: '',
    email: '',
    activo: true,
    autoGenerateHash: true
  });
  const [formError, setFormError] = useState('');
  const [isSavingForm, setIsSavingForm] = useState(false);

  // 2. Modal Reset Trivia (Soporta individual o masivo)
  const [resetModalParticipants, setResetModalParticipants] = useState([]);
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

  // 5. Modal Asignar / Crear Grupo
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [assignGroupTargetLegajos, setAssignGroupTargetLegajos] = useState([]);
  const [selectedGroupChoice, setSelectedGroupChoice] = useState(''); // '' = desasignar / sin grupo, o '__NEW__', o nombre de grupo
  const [newGroupNameInput, setNewGroupNameInput] = useState('');
  const [newGroupColorInput, setNewGroupColorInput] = useState('#3b82f6');
  const [newGroupDescInput, setNewGroupDescInput] = useState('');
  const [isAssigningGroupLoading, setIsAssigningGroupLoading] = useState(false);

  // Bloquear scroll de la página cuando algún modal esté abierto
  useEffect(() => {
    const isAnyModalOpen =
      isEditModalOpen ||
      resetModalParticipants.length > 0 ||
      Boolean(deleteModalParticipant) ||
      isMailingModalOpen ||
      isAssignGroupModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isEditModalOpen, resetModalParticipants, deleteModalParticipant, isMailingModalOpen, isAssignGroupModalOpen]);

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
      const data = await fetchParticipantsAndGroups(activePhase);
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (err) {
      console.error('Error cargando participantes y grupos:', err);
      setErrorMsg('No se pudo cargar la lista de participantes. Revisa la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, [activePhase]);

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

      // Filtro de Grupo
      if (groupFilter !== 'ALL') {
        if (groupFilter === 'NO_GROUP') {
          if (p.grupo && p.grupo.trim() !== '') return false;
        } else {
          if ((p.grupo || '').trim().toLowerCase() !== groupFilter.trim().toLowerCase()) return false;
        }
      }

      // Filtro de Activo / Inactivo
      if (activeStatusFilter === 'ACTIVE' && p.activo === false) return false;
      if (activeStatusFilter === 'INACTIVE' && p.activo !== false) return false;

      // Filtro de Clasificación
      if (classificationFilter === 'QUALIFIED' && (!p.isQualified || !p.hasPlayed)) return false;
      if (classificationFilter === 'NOT_QUALIFIED' && (p.isQualified || !p.hasPlayed)) return false;

      // Filtro de Email Enviado (Invitación o Resultados)
      if (emailStatusFilter === 'INV_SENT' && !p.email_enviado) return false;
      if (emailStatusFilter === 'INV_PENDING' && p.email_enviado) return false;
      if (emailStatusFilter === 'RES_SENT' && !p.email_resultado_enviado) return false;
      if (emailStatusFilter === 'RES_PENDING' && p.email_resultado_enviado) return false;
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
  }, [
    participants,
    searchTerm,
    sectorFilter,
    groupFilter,
    activeStatusFilter,
    classificationFilter,
    emailStatusFilter,
    hashStatusFilter,
    triviaStatusFilter
  ]);

  // Ordenamiento gamer dinámico por cualquiera de las columnas
  const sortedParticipants = useMemo(() => {
    const list = [...filteredParticipants];
    if (!sortColumn) return list;

    list.sort((a, b) => {
      let res = 0;
      switch (sortColumn) {
        case 'participante': {
          const valA = `${a.apellido || ''} ${a.nombre || ''}`.trim().toLowerCase();
          const valB = `${b.apellido || ''} ${b.nombre || ''}`.trim().toLowerCase();
          res = valA.localeCompare(valB);
          break;
        }
        case 'legajo': {
          const numA = parseInt(a.legajo, 10);
          const numB = parseInt(b.legajo, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            res = numA - numB;
          } else {
            res = String(a.legajo || '').localeCompare(String(b.legajo || ''));
          }
          break;
        }
        case 'grupo': {
          const valA = String(a.grupo || '').trim().toLowerCase();
          const valB = String(b.grupo || '').trim().toLowerCase();
          if (!valA && valB) res = 1;
          else if (valA && !valB) res = -1;
          else res = valA.localeCompare(valB);
          break;
        }
        case 'sector': {
          const valA = String(a.sector || '').toLowerCase();
          const valB = String(b.sector || '').toLowerCase();
          res = valA.localeCompare(valB);
          break;
        }
        case 'activo': {
          const actA = a.activo !== false ? 1 : 0;
          const actB = b.activo !== false ? 1 : 0;
          res = actB - actA; // Activos primero en asc
          break;
        }
        case 'puntaje': {
          const scA = Number(a.score || 0);
          const scB = Number(b.score || 0);
          res = scA - scB;
          break;
        }
        case 'clasificado': {
          const getWeight = (p) => {
            if (!p.hasPlayed) return 1;
            return p.isQualified ? 3 : 2;
          };
          const wA = getWeight(a);
          const wB = getWeight(b);
          if (wA !== wB) {
            res = wB - wA; // Clasificados primero en asc
          } else {
            const rA = a.rank || 99999;
            const rB = b.rank || 99999;
            res = rA - rB;
          }
          break;
        }
        case 'hash': {
          const hA = a.token_hash ? 1 : 0;
          const hB = b.token_hash ? 1 : 0;
          res = hB - hA;
          break;
        }
        case 'trivia': {
          const stA = getParticipantTriviaStatus(a);
          const stB = getParticipantTriviaStatus(b);
          const wA = stA.code === 'COMPLETED' ? 3 : (stA.code === 'PARTIAL' ? 2 : 1);
          const wB = stB.code === 'COMPLETED' ? 3 : (stB.code === 'PARTIAL' ? 2 : 1);
          res = wB - wA;
          break;
        }
        case 'invitacion': {
          const invA = a.email_enviado ? 1 : 0;
          const invB = b.email_enviado ? 1 : 0;
          res = invB - invA;
          break;
        }
        case 'resultados': {
          const resA = a.email_resultado_enviado ? 1 : 0;
          const resB = b.email_resultado_enviado ? 1 : 0;
          res = resB - resA;
          break;
        }
        default:
          res = 0;
      }
      return sortDirection === 'asc' ? res : -res;
    });

    return list;
  }, [filteredParticipants, sortColumn, sortDirection]);

  // Manejador de clic en encabezados para ordenar
  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection(colKey === 'puntaje' ? 'desc' : 'asc');
    }
  };

  // Paginación calculada sobre la lista ordenada
  const totalPages = Math.ceil(sortedParticipants.length / pageSize) || 1;
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedParticipants.slice(start, start + pageSize);
  }, [sortedParticipants, currentPage, pageSize]);

  // Si cambiamos de filtro y quedamos en una página inexistente, volver a la 1
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Métricas para tarjetas KPI
  const metrics = useMemo(() => {
    const total = participants.length;
    const activeCount = participants.filter((p) => p.activo !== false).length;
    const inactiveCount = total - activeCount;
    const qualifiedCount = participants.filter((p) => p.isQualified && p.hasPlayed).length;
    const withHash = participants.filter((p) => Boolean(p.token_hash)).length;
    const withoutHash = total - withHash;
    const withEmail = participants.filter((p) => Boolean(p.email && p.email.trim())).length;
    const emailSentCount = participants.filter((p) => Boolean(p.email_enviado)).length;
    const emailResultSentCount = participants.filter((p) => Boolean(p.email_resultado_enviado)).length;

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
      activeCount,
      inactiveCount,
      qualifiedCount,
      withHash,
      withoutHash,
      withEmail,
      emailSentCount,
      emailSentPct: total > 0 ? Math.round((emailSentCount / total) * 100) : 0,
      emailResultSentCount,
      emailResultSentPct: total > 0 ? Math.round((emailResultSentCount / total) * 100) : 0,
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

  // 2. Toggle Email Enviado (Invitación o Resultados)
  const handleToggleEmail = async (p, tipo = 'INVITACION') => {
    const isResult = tipo === 'RESULTADOS';
    const currentVal = isResult ? Boolean(p.email_resultado_enviado) : Boolean(p.email_enviado);
    const newStatus = !currentVal;
    setActionLoadingLegajo(p.legajo);

    // Optimistic update
    setParticipants((prev) =>
      prev.map((item) => {
        if (item.legajo !== p.legajo) return item;
        return isResult
          ? { ...item, email_resultado_enviado: newStatus }
          : { ...item, email_enviado: newStatus };
      })
    );

    const res = await toggleEmailSent(p.legajo, newStatus, tipo);
    setActionLoadingLegajo(null);

    const tipoLabel = isResult ? 'Resultados' : 'Invitación';
    if (res.success) {
      notify(
        newStatus
          ? `✅ Marcado como "${tipoLabel} Enviado" para ${p.nombre} ${p.apellido}`
          : `⏳ Marcado como "${tipoLabel} Pendiente" para ${p.nombre} ${p.apellido}`
      );
    } else {
      // Revert on error
      setParticipants((prev) =>
        prev.map((item) => {
          if (item.legajo !== p.legajo) return item;
          return isResult
            ? { ...item, email_resultado_enviado: currentVal }
            : { ...item, email_enviado: currentVal };
        })
      );
      alert(`Error al actualizar estado de email: ${res.error}`);
    }
  };

  // =========================================================================
  // GESTIÓN DE SELECCIÓN MÚLTIPLE Y ACCIONES MASIVAS
  // =========================================================================

  // Alternar selección de un participante individual
  const handleToggleSelect = (legajo) => {
    const key = String(legajo);
    setSelectedLegajos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Alternar selección de todos los participantes listados/filtrados
  const handleSelectAllFiltered = () => {
    if (sortedParticipants.length === 0) return;
    const allFilteredKeys = sortedParticipants.map((p) => String(p.legajo));
    const allSelected = allFilteredKeys.every((k) => selectedLegajos.has(k));

    if (allSelected) {
      // Deseleccionar los visibles
      setSelectedLegajos((prev) => {
        const next = new Set(prev);
        allFilteredKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      // Seleccionar todos los visibles
      setSelectedLegajos((prev) => {
        const next = new Set(prev);
        allFilteredKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  // Aplicar preseteo de selección múltiple
  const handleApplyPreset = (presetKey) => {
    setIsPresetsOpen(false);
    const newSelected = new Set();

    switch (presetKey) {
      case 'ALL_FILTERED':
        sortedParticipants.forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'QUALIFIED':
        sortedParticipants.filter((p) => p.isQualified && p.hasPlayed).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'NOT_QUALIFIED':
        sortedParticipants.filter((p) => !p.isQualified && p.hasPlayed).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'INV_SENT':
        sortedParticipants.filter((p) => p.email_enviado).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'INV_PENDING':
        sortedParticipants.filter((p) => !p.email_enviado && p.email).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'RES_SENT':
        sortedParticipants.filter((p) => p.email_resultado_enviado).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'RES_PENDING':
        sortedParticipants.filter((p) => !p.email_resultado_enviado && p.email).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'PLAYED':
        sortedParticipants.filter((p) => p.hasPlayed).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'NOT_PLAYED':
        sortedParticipants.filter((p) => !p.hasPlayed).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'ACTIVE':
        sortedParticipants.filter((p) => p.activo !== false).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'INACTIVE':
        sortedParticipants.filter((p) => p.activo === false).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'WITH_HASH':
        sortedParticipants.filter((p) => Boolean(p.token_hash)).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'WITHOUT_HASH':
        sortedParticipants.filter((p) => !p.token_hash).forEach((p) => newSelected.add(String(p.legajo)));
        break;
      case 'CLEAR':
        break;
      default:
        break;
    }

    setSelectedLegajos(newSelected);
    if (newSelected.size > 0) {
      notify(`🎯 Selección rápida aplicada: ${newSelected.size} participante(s) seleccionados.`);
    } else {
      notify('🧹 Selección limpiada.');
    }
  };

  // Alternar estado activo individual (toggle con optimistic update)
  const handleToggleActive = async (p) => {
    const newActive = p.activo === false; // Si era false pasa a true, si era true/undefined pasa a false
    setActionLoadingLegajo(p.legajo);

    setParticipants((prev) =>
      prev.map((item) => (item.legajo === p.legajo ? { ...item, activo: newActive } : item))
    );

    const res = await toggleParticipantActive(p.legajo, newActive);
    setActionLoadingLegajo(null);

    if (res.success) {
      notify(
        newActive
          ? `🟢 Participante ${p.nombre} ${p.apellido} ACTIVADO exitosamente.`
          : `🔴 Participante ${p.nombre} ${p.apellido} DESACTIVADO. Se omitirá en todos los envíos de correos.`
      );
    } else {
      setParticipants((prev) =>
        prev.map((item) => (item.legajo === p.legajo ? { ...item, activo: !newActive } : item))
      );
      alert(`Error al actualizar estado activo: ${res.error}`);
    }
  };

  // ACCIÓN MASIVA 1: Exportar la selección a Excel
  const handleExportSelection = () => {
    const selectedList = participants.filter((p) => selectedLegajos.has(String(p.legajo)));
    if (selectedList.length === 0) {
      alert('No hay participantes seleccionados para exportar.');
      return;
    }
    try {
      const res = exportSelectedParticipantsToExcel({
        participants: selectedList,
        activePhase,
        adminUsername: 'admin'
      });
      notify(`📥 Planilla Excel descargada exitosamente con ${res.count} participantes seleccionados.`);
    } catch (err) {
      alert(`Error al exportar selección a Excel: ${err.message}`);
    }
  };

  // ACCIÓN MASIVA 2 & 3: Enviar emails (Invitación o Resultados) únicamente a los activos
  const handleBatchSendEmail = async (tipo = 'INVITACION') => {
    const isResult = tipo === 'RESULTADOS';
    const tipoLabel = isResult ? 'Resultados y Podio' : 'Invitación';
    const selectedList = participants.filter((p) => selectedLegajos.has(String(p.legajo)));

    // 🛡️ REGLA: El envío de emails de cualquier tipo siempre debe ser sobre los activados únicamente (ignorar desactivados)
    const activeTargets = selectedList.filter((p) => p.activo !== false && p.email && p.email.includes('@'));
    const inactiveCount = selectedList.filter((p) => p.activo === false).length;
    const noEmailCount = selectedList.filter((p) => p.activo !== false && (!p.email || !p.email.includes('@'))).length;

    if (activeTargets.length === 0) {
      let msg = `No hay destinatarios aptos para enviar ${tipoLabel}.`;
      if (inactiveCount > 0) {
        msg += `\n\n🛡️ ${inactiveCount} participante(s) seleccionados se encuentran DESACTIVADOS y el sistema los ignora por seguridad.`;
      }
      if (noEmailCount > 0) {
        msg += `\n⚠️ ${noEmailCount} participante(s) no tienen email registrado.`;
      }
      alert(msg);
      return;
    }

    let confirmMsg = `¿Deseas enviar los correos de ${tipoLabel} a los ${activeTargets.length} participante(s) ACTIVOS seleccionados?`;
    if (inactiveCount > 0) {
      confirmMsg += `\n\n🛡️ REGLA DE SEGURIDAD: ${inactiveCount} participante(s) DESACTIVADOS serán ignorados automáticamente.`;
    }
    if (noEmailCount > 0) {
      confirmMsg += `\n⚠️ ${noEmailCount} participante(s) sin correo electrónico serán omitidos.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setIsBulkActionRunning(true);
    setBulkActionStatus(`Enviando ${tipoLabel}...`);

    try {
      const legajosList = activeTargets.map((p) => String(p.legajo));
      const res = await sendBatchMailing({
        legajos: legajosList,
        emailTipo: tipo,
        limit: legajosList.length,
        resendAll: true
      });

      setIsBulkActionRunning(false);
      setBulkActionStatus('');

      if (res.success) {
        let successReport = `🎉 Envío de ${tipoLabel} completado: ${res.sentCount} correos despachados.`;
        if (inactiveCount > 0) {
          successReport += ` (Se ignoraron ${inactiveCount} participantes inactivos).`;
        }
        notify(successReport);
        await loadParticipants();
      } else {
        alert(`Error en el envío de correos: ${res.error}`);
      }
    } catch (err) {
      setIsBulkActionRunning(false);
      setBulkActionStatus('');
      alert(`Error inesperado al enviar correos: ${err.message}`);
    }
  };

  // ACCIÓN MASIVA 4: Activar o Desactivar seleccionados
  const handleBatchSetActive = async (activo) => {
    const legajosArray = Array.from(selectedLegajos);
    if (legajosArray.length === 0) return;
    const actionText = activo ? 'ACTIVAR' : 'DESACTIVAR';

    if (!window.confirm(`¿Confirmas que deseas ${actionText} a los ${legajosArray.length} participante(s) seleccionados?`)) {
      return;
    }

    setIsBulkActionRunning(true);
    // Optimistic update
    setParticipants((prev) =>
      prev.map((item) => (legajosArray.includes(String(item.legajo)) ? { ...item, activo } : item))
    );

    const res = await setParticipantsActiveBatch(legajosArray, activo);
    setIsBulkActionRunning(false);

    if (res.success) {
      notify(`✅ Se ${activo ? 'activaron' : 'desactivaron'} ${res.updatedCount || legajosArray.length} participantes exitosamente.`);
    } else {
      alert(`Error al actualizar estado masivo: ${res.error}`);
      await loadParticipants();
    }
  };

  // ACCIÓN MASIVA 5: Reestablecer Hash de la selección
  const handleBatchRegenerateHash = async () => {
    const legajosArray = Array.from(selectedLegajos);
    if (legajosArray.length === 0) return;

    if (
      !window.confirm(
        `🔑 ¿Confirmas que deseas REESTABLECER / REGENERAR el hash de acceso para los ${legajosArray.length} participante(s) seleccionados?\n\nLos enlaces anteriores quedarán inválidos.`
      )
    ) {
      return;
    }

    setIsBulkActionRunning(true);
    const res = await regenerateParticipantHashBatch(legajosArray);
    setIsBulkActionRunning(false);

    if (res.success) {
      notify(`🔑 Se reestablecieron con éxito los hashes de ${res.updatedCount || legajosArray.length} participantes.`);
      await loadParticipants();
    } else {
      alert(`Error al reestablecer hashes: ${res.error}`);
    }
  };

  // ACCIÓN MASIVA 6: Blanquear Hash de la selección
  const handleBatchClearHash = async () => {
    const legajosArray = Array.from(selectedLegajos);
    if (legajosArray.length === 0) return;

    if (
      !window.confirm(
        `⚠️ ATENCIÓN: ¿Seguro que deseas BLANQUEAR / BORRAR el hash de acceso de los ${legajosArray.length} participante(s) seleccionados?\n\nLos colaboradores no podrán acceder a la trivia hasta que se les genere un nuevo hash.`
      )
    ) {
      return;
    }

    setIsBulkActionRunning(true);
    // Optimistic update
    setParticipants((prev) =>
      prev.map((item) => (legajosArray.includes(String(item.legajo)) ? { ...item, token_hash: '' } : item))
    );

    const res = await clearParticipantHashBatch(legajosArray);
    setIsBulkActionRunning(false);

    if (res.success) {
      notify(`🧹 Se blanqueó exitosamente el hash de ${res.updatedCount || legajosArray.length} participante(s).`);
    } else {
      alert(`Error al blanquear hashes: ${res.error}`);
      await loadParticipants();
    }
  };

  // ACCIÓN MASIVA: Resetear trivia de los seleccionados
  const handleBatchResetTrivia = () => {
    const selectedList = participants.filter((p) => selectedLegajos.has(String(p.legajo)));
    if (selectedList.length === 0) {
      alert('Debes seleccionar al menos un participante para resetear la trivia.');
      return;
    }
    setResetModalParticipants(selectedList);
    setResetPhaseOption('ACTIVE');
  };

  // ACCIÓN MASIVA 7 & INDIVIDUAL: Abrir modal de asignación de grupo
  const handleOpenAssignGroupModal = (targetLegajos = null, currentGroup = '') => {
    let legajosList = [];
    if (targetLegajos && Array.isArray(targetLegajos)) {
      legajosList = targetLegajos.map(String);
    } else {
      legajosList = Array.from(selectedLegajos);
    }

    if (legajosList.length === 0) {
      alert('Debes seleccionar al menos un participante para asignar grupo.');
      return;
    }

    setAssignGroupTargetLegajos(legajosList);
    setSelectedGroupChoice(currentGroup || (groups.length > 0 ? groups[0].nombre : '__NEW__'));
    setNewGroupNameInput('');
    setNewGroupDescInput('');
    setNewGroupColorInput('#3b82f6');
    setIsAssignGroupModalOpen(true);
  };

  // Confirmar y ejecutar asignación de grupo
  const handleConfirmAssignGroup = async (e) => {
    if (e) e.preventDefault();
    if (assignGroupTargetLegajos.length === 0) return;

    let targetGroupName = '';
    if (selectedGroupChoice === '__NONE__') {
      targetGroupName = ''; // Quitar de grupo
    } else if (selectedGroupChoice === '__NEW__') {
      const cleanName = newGroupNameInput.trim();
      if (!cleanName) {
        alert('Por favor ingresa un nombre para el nuevo grupo.');
        return;
      }
      setIsAssigningGroupLoading(true);
      try {
        await createGroup({
          nombre: cleanName,
          descripcion: newGroupDescInput.trim(),
          color: newGroupColorInput
        });
      } catch (err) {
        console.warn('Nota al crear grupo previo:', err);
      }
      targetGroupName = cleanName;
    } else {
      targetGroupName = selectedGroupChoice.trim();
    }

    setIsAssigningGroupLoading(true);

    // Optimistic update
    setParticipants((prev) =>
      prev.map((item) =>
        assignGroupTargetLegajos.includes(String(item.legajo)) ? { ...item, grupo: targetGroupName } : item
      )
    );

    const res = await assignGroupBatch(assignGroupTargetLegajos, targetGroupName);
    setIsAssigningGroupLoading(false);
    setIsAssignGroupModalOpen(false);

    if (res.success) {
      if (targetGroupName) {
        notify(
          `🏷️ Grupo "${targetGroupName}" asignado con éxito a ${res.updatedCount || assignGroupTargetLegajos.length} participante(s).`
        );
      } else {
        notify(
          `🧹 Se desasignó el grupo para ${res.updatedCount || assignGroupTargetLegajos.length} participante(s).`
        );
      }
      await loadParticipants();
    } else {
      alert(`Error al asignar grupo: ${res.error}`);
      await loadParticipants();
    }
  };

  // Eliminar un grupo del catálogo
  const handleDeleteGroupConfirm = async (groupName) => {
    if (!window.confirm(`¿Confirmas que deseas eliminar el grupo "${groupName}"?\n\nLos participantes asignados quedarán sin grupo.`)) {
      return;
    }
    const res = await deleteGroup(groupName);
    if (res.success) {
      notify(`🗑️ Grupo "${groupName}" eliminado.`);
      await loadParticipants();
    } else {
      alert(`Error al eliminar grupo: ${res.error}`);
    }
  };

  // 3. Enviar / Reenviar Email Individual (Invitación o Resultados)
  const handleSendSingleEmail = async (p, tipo = 'INVITACION') => {
    // 🛡️ REGLA: El envío de emails de cualquier tipo siempre debe ser sobre los activados únicamente
    if (p.activo === false) {
      alert(
        `⚠️ ACCIÓN DENEGADA: El participante ${p.nombre} ${p.apellido} (Legajo: ${p.legajo}) se encuentra DESACTIVADO.\n\n🛡️ Por política de seguridad, el envío de correos electrónicos solo está permitido para participantes en estado ACTIVO. Activa al colaborador para poder despacharle el correo.`
      );
      return;
    }

    if (!p.email) {
      alert(`El participante ${p.nombre} ${p.apellido} no tiene email registrado.`);
      return;
    }
    if (!p.token_hash) {
      alert(`El participante ${p.nombre} ${p.apellido} no tiene token hash generado. Genera su hash primero.`);
      return;
    }

    const isResult = tipo === 'RESULTADOS';
    const isAlreadySent = isResult ? Boolean(p.email_resultado_enviado) : Boolean(p.email_enviado);
    const actionText = isAlreadySent ? 'reenviar' : 'enviar';
    const tipoLabel = isResult ? 'el reporte de resultados y podio' : 'la invitación de la trivia';

    if (
      !window.confirm(
        `¿Deseas ${actionText} ${tipoLabel} a:\n\n${p.nombre} ${p.apellido}\nEmail: ${p.email}\nLegajo: ${p.legajo}`
      )
    ) {
      return;
    }

    setActionLoadingLegajo(p.legajo);
    const res = await sendSingleParticipantEmail(p.legajo, tipo);
    setActionLoadingLegajo(null);

    if (res.success) {
      setParticipants((prev) =>
        prev.map((item) => {
          if (item.legajo !== p.legajo) return item;
          return isResult
            ? { ...item, email_resultado_enviado: true }
            : { ...item, email_enviado: true };
        })
      );
      notify(`✉️ Correo de ${isResult ? 'Resultados' : 'Invitación'} despachado exitosamente a ${p.email}`);
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
    // 🛡️ REGLA: El envío de emails de cualquier tipo siempre debe ser sobre los activados únicamente
    const targetCount = isPending
      ? participants.filter((p) => p.activo !== false && p.email && !p.email_enviado).length
      : participants.filter((p) => p.activo !== false && p.email).length;

    if (targetCount === 0) {
      alert(
        isPending
          ? 'No hay participantes ACTIVOS pendientes de envío con email válido.'
          : 'No hay participantes ACTIVOS con email válido.'
      );
      return;
    }

    const confirmMsg = isPending
      ? `¿Iniciar envío masivo de invitaciones a los ${targetCount} participantes ACTIVOS pendientes?`
      : `⚠️ ATENCIÓN: Se REENVIARÁ el correo de invitación a TODOS los ${targetCount} participantes ACTIVOS con email registrado.\n\n¿Deseas continuar?`;

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
      grupo: '',
      email: '',
      activo: true,
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
      grupo: p.grupo || '',
      email: p.email || '',
      activo: p.activo !== false,
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
        grupo: formData.grupo,
        email: formData.email,
        activo: formData.activo
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
        grupo: formData.grupo,
        email: formData.email,
        activo: formData.activo,
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

  // 8. Confirmar y Ejecutar Reset Trivia (Individual o Masivo)
  const handleConfirmResetTrivia = async () => {
    if (resetModalParticipants.length === 0) return;
    setIsResetting(true);

    const phaseParam = resetPhaseOption === 'ACTIVE' ? activePhase : null;
    const targetText = resetPhaseOption === 'ACTIVE' ? `la Fase ${activePhase}` : 'todas las fases';

    if (resetModalParticipants.length === 1) {
      const p = resetModalParticipants[0];
      const res = await resetParticipantTrivia(p.legajo, phaseParam);
      setIsResetting(false);

      if (res.success) {
        notify(`🔄 Trivia reseteada para ${p.nombre} ${p.apellido} en ${targetText}. Ahora puede volver a responder.`);
        setResetModalParticipants([]);
        await loadParticipants();
      } else {
        alert(`Error reseteando trivia: ${res.error}`);
      }
    } else {
      const legajosList = resetModalParticipants.map((p) => String(p.legajo));
      const res = await resetParticipantTriviaBatch(legajosList, phaseParam);
      setIsResetting(false);

      if (res.success) {
        notify(`🔄 Trivia reseteada para ${res.updatedCount || legajosList.length} participante(s) en ${targetText}. Ahora pueden volver a responder.`);
        setResetModalParticipants([]);
        await loadParticipants();
      } else {
        alert(`Error reseteando trivias masivamente: ${res.error}`);
      }
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

  // Helper para renderizar indicador de ordenamiento en columnas
  const renderSortIcon = (colKey) => {
    if (sortColumn !== colKey) {
      return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-80 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-yellow-400" />
    ) : (
      <ArrowDown size={12} className="text-yellow-400" />
    );
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
            <p className="text-[11px] text-slate-400 mt-0.5">
              Invitaciones: {metrics.emailSentCount} • Resultados: {metrics.emailResultSentCount}
            </p>
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
      <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl space-y-4 relative z-20">
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

            <button
              onClick={() => handleOpenAssignGroupModal()}
              className="px-3.5 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs transition-all shadow border border-indigo-400/40 cursor-pointer flex items-center gap-2"
              title="Asignar participantes seleccionados a un grupo o crear uno nuevo"
            >
              <FolderPlus size={16} />
              <span>{selectedLegajos.size > 0 ? `Asignar Grupo (${selectedLegajos.size})` : 'Grupos'}</span>
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
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold">
            <Filter size={14} />
            <span>Filtros:</span>
          </div>

          {/* Filtro Grupo */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-indigo-500/30 text-indigo-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">🏷️ Grupos: Todos ({participants.length})</option>
            <option value="NO_GROUP">Sin Grupo ({participants.filter(p => !p.grupo).length})</option>
            {groups.map((g) => {
              const gName = typeof g === 'string' ? g : g.nombre;
              const count = participants.filter(p => (p.grupo || '').toLowerCase() === gName.toLowerCase()).length;
              return (
                <option key={g.id || gName} value={gName}>
                  🏷️ {gName} ({count})
                </option>
              );
            })}
          </select>

          {/* Filtro Sector */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Todos los Sectores ({participants.length})</option>
            {availableSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Filtro Estado Participante (Activo / Inactivo) */}
          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Estado: Todos ({metrics.total})</option>
            <option value="ACTIVE">✅ Activos ({metrics.activeCount})</option>
            <option value="INACTIVE">🚫 Inactivos ({metrics.inactiveCount})</option>
          </select>

          {/* Filtro Clasificación */}
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Clasificación: Todos</option>
            <option value="QUALIFIED">🏆 Clasificados ({metrics.qualifiedCount})</option>
            <option value="NOT_QUALIFIED">No Clasificados ({metrics.total - metrics.qualifiedCount})</option>
          </select>

          {/* Filtro Estado Email */}
          <select
            value={emailStatusFilter}
            onChange={(e) => setEmailStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Emails: Todos</option>
            <option value="INV_SENT">Invitación: Enviada ({metrics.emailSentCount})</option>
            <option value="INV_PENDING">Invitación: Pendiente ({metrics.total - metrics.emailSentCount})</option>
            <option value="RES_SENT">Resultados: Enviado ({metrics.emailResultSentCount})</option>
            <option value="RES_PENDING">Resultados: Pendiente ({metrics.total - metrics.emailResultSentCount})</option>
          </select>

          {/* Filtro Estado Hash */}
          <select
            value={hashStatusFilter}
            onChange={(e) => setHashStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Hash: Todos</option>
            <option value="WITH_HASH">Con Hash ({metrics.withHash})</option>
            <option value="WITHOUT_HASH">Sin Hash ({metrics.withoutHash})</option>
          </select>

          {/* Filtro Estado Trivia */}
          <select
            value={triviaStatusFilter}
            onChange={(e) => setTriviaStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/15 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="ALL">Trivia: Todos</option>
            <option value="COMPLETED">Completados 15/15 ({metrics.completedCount})</option>
            <option value="PARTIAL">En Curso / Parcial ({metrics.partialCount})</option>
            <option value="NOT_PLAYED">Sin Jugar ({metrics.notPlayedCount})</option>
          </select>

          {/* Menú Dropdown Presets de Selección Rápida */}
          <div className="relative z-30" ref={presetsRef}>
            <button
              onClick={() => setIsPresetsOpen((prev) => !prev)}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Selección rápida por criterios predefinidos"
            >
              <CheckSquare size={13} className="text-indigo-400" />
              <span>Presets Selección</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isPresetsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPresetsOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-slate-950/98 border border-indigo-500/50 shadow-2xl backdrop-blur-2xl z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-white/10">
                  Selección Rápida
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('QUALIFIED')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-yellow-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Award size={13} className="text-yellow-400" />
                  <span>🏆 Clasificados ({metrics.qualifiedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('NOT_QUALIFIED')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <XCircle size={13} className="text-slate-400" />
                  <span>❌ No Clasificados</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ACTIVE')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-emerald-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck size={13} className="text-emerald-400" />
                  <span>✅ Participantes Activos ({metrics.activeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('INACTIVE')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-red-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <UserX size={13} className="text-red-400" />
                  <span>🚫 Participantes Inactivos ({metrics.inactiveCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('INV_SENT')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <MailCheck size={13} className="text-emerald-400" />
                  <span>✉️ Email Invitación Enviado ({metrics.emailSentCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('INV_PENDING')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Clock size={13} className="text-amber-400" />
                  <span>⏳ Email Invitación Pendiente</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('RES_SENT')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Award size={13} className="text-purple-400" />
                  <span>🏅 Email Resultados Enviado ({metrics.emailResultSentCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('RES_PENDING')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Clock size={13} className="text-purple-300" />
                  <span>⏳ Email Resultados Pendiente</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('PLAYED')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-emerald-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Play size={13} className="text-emerald-400" />
                  <span>🎮 Participaron (Trivia respondida)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('NOT_PLAYED')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-400 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Clock size={13} className="text-slate-500" />
                  <span>💤 Sin Jugar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('WITH_HASH')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-yellow-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound size={13} className="text-yellow-400" />
                  <span>🔑 Con Hash ({metrics.withHash})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('WITHOUT_HASH')}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-amber-300 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Zap size={13} className="text-amber-400" />
                  <span>⚡ Sin Hash ({metrics.withoutHash})</span>
                </button>
                <div className="pt-1 mt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('CLEAR')}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-300 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Eraser size={13} className="text-red-400" />
                    <span>Deseleccionar todos</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          <span className="ml-auto text-slate-400 font-medium flex items-center gap-2">
            <span>
              Mostrando <strong className="text-white">{sortedParticipants.length}</strong> de{' '}
              <strong className="text-white">{participants.length}</strong>
            </span>
            {selectedLegajos.size > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 font-bold border border-red-500/40 text-[11px]">
                {selectedLegajos.size} seleccionados
              </span>
            )}
          </span>
        </div>

        {/* Barra Contextual de Acciones Masivas (visible en la propia sección superior al seleccionar) */}
        {selectedLegajos.size > 0 && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border border-red-500/50 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow">
                {selectedLegajos.size}
              </span>
              <div>
                <span className="font-bold text-white">
                  {selectedLegajos.size} participante{selectedLegajos.size > 1 ? 's' : ''} seleccionado{selectedLegajos.size > 1 ? 's' : ''}
                </span>
                <span className="text-slate-400 hidden sm:inline ml-2 text-[11px]">
                  (Acciones masivas disponibles)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Botón Asignar a Grupo */}
              <button
                type="button"
                onClick={() => handleOpenAssignGroupModal()}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Asignar seleccionados a un grupo"
              >
                <FolderPlus size={13} />
                <span>Asignar a Grupo</span>
              </button>

              {/* Botón Exportar */}
              <button
                type="button"
                onClick={handleExportSelection}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Exportar seleccionados a Excel (.xlsx)"
              >
                <Download size={13} />
                <span>Exportar (.xlsx)</span>
              </button>

              {/* Botón Enviar Invitación */}
              <button
                type="button"
                onClick={() => handleBatchSendEmail('INVITACION')}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Enviar email de invitación a los seleccionados activos"
              >
                <SendHorizontal size={13} />
                <span>Enviar Invitación</span>
              </button>

              {/* Botón Enviar Resultados */}
              <button
                type="button"
                onClick={() => handleBatchSendEmail('RESULTADOS')}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Enviar email de resultados a los seleccionados activos"
              >
                <Award size={13} />
                <span>Enviar Resultados</span>
              </button>

              {/* Botón Activar */}
              <button
                type="button"
                onClick={() => handleBatchSetActive(true)}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-100 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Activar seleccionados"
              >
                <UserCheck size={13} />
                <span>Activar</span>
              </button>

              {/* Botón Desactivar */}
              <button
                type="button"
                onClick={() => handleBatchSetActive(false)}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-red-700/40 hover:bg-red-700/60 text-red-100 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Desactivar seleccionados"
              >
                <UserX size={13} />
                <span>Desactivar</span>
              </button>

              {/* Botón Reestablecer Hash */}
              <button
                type="button"
                onClick={handleBatchRegenerateHash}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Reestablecer hash de los seleccionados"
              >
                <KeyRound size={13} />
                <span>Reestablecer Hash</span>
              </button>

              {/* Botón Blanquear Hash */}
              <button
                type="button"
                onClick={handleBatchClearHash}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/15 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Blanquear hash de los seleccionados"
              >
                <Eraser size={13} />
                <span>Blanquear Hash</span>
              </button>

              {/* Botón Resetear Trivia */}
              <button
                type="button"
                onClick={handleBatchResetTrivia}
                disabled={isBulkActionRunning}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow"
                title="Resetear trivia para los participantes seleccionados (permite que vuelvan a responder)"
              >
                <RotateCcw size={13} />
                <span>Resetear Trivia</span>
              </button>

              {/* Botón Deseleccionar */}
              <button
                type="button"
                onClick={() => setSelectedLegajos(new Set())}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Cancelar selección"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          TABLA DE PARTICIPANTES CON ORDENAMIENTO Y ACCIONES MASIVAS
          ========================================================================= */}
      <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative z-10">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw size={36} className="animate-spin text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-bold">Cargando nómina de participantes...</p>
            <p className="text-xs text-slate-400 mt-1">Consultando base de datos segura</p>
          </div>
        ) : sortedParticipants.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users size={44} className="text-slate-500 mx-auto mb-3" />
            <h4 className="text-white font-bold text-base">No se encontraron participantes</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchTerm ||
              sectorFilter !== 'ALL' ||
              groupFilter !== 'ALL' ||
              activeStatusFilter !== 'ALL' ||
              classificationFilter !== 'ALL' ||
              emailStatusFilter !== 'ALL' ||
              hashStatusFilter !== 'ALL' ||
              triviaStatusFilter !== 'ALL'
                ? 'No hay registros que coincidan con los filtros aplicados. Prueba limpiar la búsqueda.'
                : 'Aún no hay participantes cargados. Agrega uno nuevo o importa una lista CSV.'}
            </p>
            {(searchTerm ||
              sectorFilter !== 'ALL' ||
              groupFilter !== 'ALL' ||
              activeStatusFilter !== 'ALL' ||
              classificationFilter !== 'ALL' ||
              emailStatusFilter !== 'ALL' ||
              hashStatusFilter !== 'ALL' ||
              triviaStatusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSectorFilter('ALL');
                  setGroupFilter('ALL');
                  setActiveStatusFilter('ALL');
                  setClassificationFilter('ALL');
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
                  {/* Checkbox de Selección Masiva */}
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={sortedParticipants.length > 0 && selectedLegajos.size === sortedParticipants.length}
                      onChange={handleSelectAllFiltered}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-white/20 bg-slate-900 cursor-pointer"
                      title={
                        selectedLegajos.size === sortedParticipants.length
                          ? 'Deseleccionar todos los participantes listados'
                          : 'Seleccionar todos los participantes listados'
                      }
                    />
                  </th>

                  {/* Participante */}
                  <th
                    onClick={() => handleSort('participante')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Nombre / Apellido"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Participante</span>
                      {renderSortIcon('participante')}
                    </div>
                  </th>

                  {/* Sector */}
                  <th
                    onClick={() => handleSort('sector')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Sector"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Sector</span>
                      {renderSortIcon('sector')}
                    </div>
                  </th>

                  {/* Columna Grupo */}
                  <th
                    onClick={() => handleSort('grupo')}
                    className="py-3.5 px-3 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Grupo"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Grupo</span>
                      {renderSortIcon('grupo')}
                    </div>
                  </th>

                  {/* Estado (Activo / Inactivo) */}
                  <th
                    onClick={() => handleSort('activo')}
                    className="py-3.5 px-3 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Estado Activo/Inactivo"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Estado</span>
                      {renderSortIcon('activo')}
                    </div>
                  </th>

                  {/* Puntaje */}
                  <th
                    onClick={() => handleSort('puntaje')}
                    className="py-3.5 px-3 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Puntaje"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Puntaje</span>
                      {renderSortIcon('puntaje')}
                    </div>
                  </th>

                  {/* Clasificación */}
                  <th
                    onClick={() => handleSort('clasificado')}
                    className="py-3.5 px-3 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Clasificación"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Clasificación</span>
                      {renderSortIcon('clasificado')}
                    </div>
                  </th>

                  {/* Link de Acceso / Hash */}
                  <th
                    onClick={() => handleSort('hash')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Link / Hash"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Link / Hash</span>
                      {renderSortIcon('hash')}
                    </div>
                  </th>

                  {/* Emails Despachados */}
                  <th
                    onClick={() => handleSort('invitacion')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por estado de envío de Invitación"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Emails</span>
                      {renderSortIcon('invitacion')}
                    </div>
                  </th>

                  {/* Estado Trivia */}
                  <th
                    onClick={() => handleSort('trivia')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                    title="Clic para ordenar por Estado de la Trivia"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Trivia</span>
                      {renderSortIcon('trivia')}
                    </div>
                  </th>

                  {/* Acciones */}
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {paginatedParticipants.map((p) => {
                  const hasHash = Boolean(p.token_hash);
                  const isCopied = copiedLegajo === p.legajo;
                  const isRowLoading = actionLoadingLegajo === p.legajo;
                  const isSelected = selectedLegajos.has(String(p.legajo));
                  const participationUrl = hasHash ? buildParticipationUrl(p.token_hash) : '';
                  const triviaStatus = getParticipantTriviaStatus(p);
                  const isActive = p.activo !== false;

                  return (
                    <tr
                      key={p.legajo}
                      className={`hover:bg-white/5 transition-colors group ${
                        isSelected ? 'bg-red-950/20' : ''
                      } ${!isActive ? 'opacity-70 bg-black/20' : ''}`}
                    >
                      {/* Checkbox de fila */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.legajo)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-white/20 bg-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* Participante (con email integrado abajo del nombre) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow ${
                              isActive
                                ? 'bg-gradient-to-br from-red-600 to-amber-600 text-white'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {p.nombre ? p.nombre[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                              <span>
                                {p.apellido}, {p.nombre}
                              </span>
                              {!isActive && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-500/30 font-bold">
                                  Inactivo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-yellow-300 font-mono text-[10px] font-bold border border-white/10 shrink-0">
                                Leg. {p.legajo}
                              </span>
                              {p.email ? (
                                <span
                                  className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]"
                                  title={p.email}
                                >
                                  {p.email}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Sin email</span>
                              )}
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

                      {/* Grupo */}
                      <td className="py-3.5 px-3 text-center">
                        {p.grupo ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignGroupModal([p.legajo], p.grupo)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all cursor-pointer shadow-sm group-hover:border-indigo-400"
                            title={`Grupo: ${p.grupo}. Clic para cambiar de grupo`}
                          >
                            <Tag size={11} className="text-indigo-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{p.grupo}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignGroupModal([p.legajo], '')}
                            className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-colors italic cursor-pointer"
                            title="Clic para asignar a un grupo"
                          >
                            + Asignar grupo
                          </button>
                        )}
                      </td>

                      {/* Estado: Activo o Inactivo (Toggle directo) */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          disabled={isRowLoading}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                          }`}
                          title={
                            isActive
                              ? 'Participante Activo. Clic para desactivar (quedará excluido de envíos de email)'
                              : 'Participante Inactivo (no recibe emails). Clic para reactivar'
                          }
                        >
                          {isActive ? (
                            <>
                              <UserCheck size={12} className="text-emerald-400" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <UserX size={12} className="text-red-400" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Puntaje */}
                      <td className="py-3.5 px-3 text-center">
                        {p.hasPlayed ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-yellow-500/15 text-yellow-300 font-mono font-bold text-xs border border-yellow-500/30">
                            <Award size={12} className="text-yellow-400" />
                            <span>{(p.score || 0).toLocaleString()} pts</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Clasificación */}
                      <td className="py-3.5 px-3 text-center">
                        {p.hasPlayed ? (
                          p.isQualified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px] font-black shadow-sm">
                              <span>🏆 Clasificado</span>
                              {p.rank && <span className="text-[10px] opacity-80">#{p.rank}</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-white/10 text-[10px] font-semibold">
                              No clasificado
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Sin jugar</span>
                        )}
                      </td>

                      {/* Link de Acceso / Hash */}
                      <td className="py-3.5 px-4 text-center">
                        {hasHash ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-xl border border-white/15">
                            {/* Botón Copiar Link */}
                            <button
                              onClick={() => handleCopyLink(p)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCopied
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

                            {/* Blanquear Hash individual */}
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `¿Deseas blanquear el hash del participante ${p.nombre} ${p.apellido}?\nEl participante se quedará sin enlace de acceso hasta que se le vuelva a generar.`
                                  )
                                ) {
                                  return;
                                }
                                setActionLoadingLegajo(p.legajo);
                                const res = await clearParticipantHash(p.legajo);
                                setActionLoadingLegajo(null);
                                if (res.success) {
                                  notify(`🧹 Hash blanqueado para ${p.nombre} ${p.apellido}.`);
                                  await loadParticipants();
                                } else {
                                  alert(`Error al blanquear hash: ${res.error}`);
                                }
                              }}
                              disabled={isRowLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                              title="Blanquear Hash (quitar hash)"
                            >
                              <Eraser size={14} />
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

                      {/* Emails Despachados (Invitación y Resultados) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/10">
                          {/* Icono Invitación */}
                          <button
                            onClick={() => handleToggleEmail(p, 'INVITACION')}
                            disabled={isRowLoading}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                              p.email_enviado
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                                : 'bg-slate-800/40 text-slate-600 border-white/5 opacity-50 hover:opacity-100 hover:text-slate-300'
                            }`}
                            title={
                              p.email_enviado
                                ? 'Invitación: Enviada (clic para alternar)'
                                : 'Invitación: No enviada (clic para alternar)'
                            }
                          >
                            <Mail size={16} />
                          </button>

                          {/* Icono Resultados */}
                          <button
                            onClick={() => handleToggleEmail(p, 'RESULTADOS')}
                            disabled={isRowLoading}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                              p.email_resultado_enviado
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10'
                                : 'bg-slate-800/40 text-slate-600 border-white/5 opacity-50 hover:opacity-100 hover:text-slate-300'
                            }`}
                            title={
                              p.email_resultado_enviado
                                ? 'Resultados: Enviado (clic para alternar)'
                                : 'Resultados: No enviado (clic para alternar)'
                            }
                          >
                            <Award size={16} />
                          </button>
                        </div>
                      </td>

                      {/* Estado Trivia */}
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
                          {/* Reenviar Correo de Invitación */}
                          <button
                            onClick={() => handleSendSingleEmail(p, 'INVITACION')}
                            disabled={!p.email || isRowLoading || !isActive}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              !isActive
                                ? 'text-slate-600 opacity-30 cursor-not-allowed'
                                : !p.email
                                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                                : p.email_enviado
                                ? 'text-purple-300 hover:text-white hover:bg-purple-500/20'
                                : 'text-emerald-400 hover:text-white hover:bg-emerald-500/20'
                            }`}
                            title={
                              !isActive
                                ? 'Participante inactivo: active el usuario para permitir envío de emails'
                                : !p.email
                                ? 'Sin correo electrónico cargado'
                                : p.email_enviado
                                ? `Reenviar Invitación a ${p.email}`
                                : `Enviar Invitación a ${p.email}`
                            }
                          >
                            <SendHorizontal size={15} />
                          </button>

                          {/* Reenviar Correo de Resultados */}
                          <button
                            onClick={() => handleSendSingleEmail(p, 'RESULTADOS')}
                            disabled={!p.email || isRowLoading || !isActive}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              !isActive
                                ? 'text-slate-600 opacity-30 cursor-not-allowed'
                                : !p.email
                                ? 'text-slate-600 opacity-40 cursor-not-allowed'
                                : p.email_resultado_enviado
                                ? 'text-amber-300 hover:text-white hover:bg-amber-500/20'
                                : 'text-amber-500 hover:text-white hover:bg-amber-500/20'
                            }`}
                            title={
                              !isActive
                                ? 'Participante inactivo: active el usuario para permitir envío de emails'
                                : !p.email
                                ? 'Sin correo electrónico cargado'
                                : p.email_resultado_enviado
                                ? `Reenviar Resultados a ${p.email}`
                                : `Enviar Resultados a ${p.email}`
                            }
                          >
                            <Award size={15} />
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
                              setResetModalParticipants([p]);
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
        {sortedParticipants.length > pageSize && (
          <div className="p-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Página <strong className="text-white">{currentPage}</strong> de{' '}
              <strong className="text-white">{totalPages}</strong> ({sortedParticipants.length} participantes)
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

                {/* Sector y Grupo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Grupo Asignado</label>
                    <input
                      type="text"
                      list="grupos-datalist"
                      value={formData.grupo}
                      onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                      placeholder="Ej: Grupo Alfa, Turno Noche..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <datalist id="grupos-datalist">
                      {groups.map((g) => (
                        <option key={g.id || g.nombre} value={g.nombre} />
                      ))}
                    </datalist>
                  </div>
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

                {/* Estado Activo / Inactivo */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-white/20"
                    />
                    <span className="font-semibold text-xs text-white">
                      Participante Activo (habilitado para jugar y recibir emails)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 ml-6.5 mt-0.5">
                    Si se desactiva, queda estrictamente excluido de cualquier proceso de envío de correos (invitación o resultados).
                  </p>
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
          MODAL 2: RESETEAR TRIVIA (INDIVIDUAL O MASIVO) (PORTAL ROOT)
          ========================================================================= */}
      {resetModalParticipants.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-amber-500/30 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 shrink-0">
                <RotateCcw size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-white truncate">
                  {resetModalParticipants.length === 1
                    ? 'Resetear Trivia'
                    : `Resetear Trivia Masivamente (${resetModalParticipants.length})`}
                </h3>
                <p className="text-xs text-amber-200 truncate">
                  {resetModalParticipants.length === 1
                    ? `${resetModalParticipants[0].nombre} ${resetModalParticipants[0].apellido} (Legajo: ${resetModalParticipants[0].legajo})`
                    : `${resetModalParticipants.length} participantes seleccionados en nómina`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {resetModalParticipants.length === 1
                ? 'Esta acción eliminará las respuestas grabadas para este participante, permitiéndole ingresar nuevamente al enlace y responder la trivia desde cero como si fuera su primera vez.'
                : 'Esta acción eliminará las respuestas grabadas para todos los participantes seleccionados, permitiéndoles ingresar nuevamente y responder la trivia desde cero.'}
            </p>

            {/* Listado de participantes si es masivo */}
            {resetModalParticipants.length > 1 && (
              <div className="max-h-24 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex flex-wrap gap-1.5 mb-4 text-[11px]">
                {resetModalParticipants.map((p) => (
                  <span
                    key={p.legajo}
                    className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/30 inline-flex items-center gap-1 font-mono text-[10px]"
                  >
                    <span className="font-sans font-bold text-white">{p.nombre} {p.apellido}</span>
                    <span className="opacity-70">({p.legajo})</span>
                  </span>
                ))}
              </div>
            )}

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
                onClick={() => setResetModalParticipants([])}
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
                <span>
                  {resetModalParticipants.length > 1
                    ? `Confirmar y Resetear (${resetModalParticipants.length})`
                    : 'Confirmar y Resetear'}
                </span>
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

      {/* =========================================================================
          MODAL 5: ASIGNAR / CREAR GRUPO A PARTICIPANTES (PORTAL ROOT)
          ========================================================================= */}
      {isAssignGroupModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            {/* Header fijo */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center border border-indigo-500/40 shadow-lg shadow-indigo-600/20">
                  <FolderPlus size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Asignar a Grupo</h3>
                  <p className="text-xs text-indigo-200/80">
                    {assignGroupTargetLegajos.length} participante{assignGroupTargetLegajos.length > 1 ? 's' : ''} seleccionado{assignGroupTargetLegajos.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAssignGroupModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <form onSubmit={handleConfirmAssignGroup} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-modal-scrollbar text-xs">
                {/* Resumen de seleccionados */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300">
                  <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-400" />
                    <span>Participantes que se asignarán:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {assignGroupTargetLegajos.map((leg) => {
                      const p = participants.find((item) => String(item.legajo) === String(leg));
                      return (
                        <span
                          key={leg}
                          className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/30 text-[11px] text-indigo-200 font-mono"
                        >
                          Leg. {leg} {p ? `(${p.nombre} ${p.apellido})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Selección del Tipo de Asignación */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold">Selecciona una opción de grupo:</label>

                  {/* Opción 1: Grupo Existente */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedGroupChoice !== '__NEW__' && selectedGroupChoice !== '__NONE__'
                        ? 'bg-indigo-950/50 border-indigo-500/80 ring-1 ring-indigo-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="groupChoiceMode"
                      checked={selectedGroupChoice !== '__NEW__' && selectedGroupChoice !== '__NONE__'}
                      onChange={() => {
                        if (groups.length > 0) {
                          setSelectedGroupChoice(groups[0].nombre);
                        } else {
                          setSelectedGroupChoice('__NEW__');
                        }
                      }}
                      className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-white/20 bg-slate-900 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Folder size={15} className="text-indigo-400" />
                        <span>Elegir un Grupo Existente</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Selecciona uno de los grupos ya creados en el catálogo.
                      </p>

                      {selectedGroupChoice !== '__NEW__' && selectedGroupChoice !== '__NONE__' && (
                        <div className="mt-3">
                          {groups.length === 0 ? (
                            <p className="text-[11px] text-amber-300/80 italic">
                              Aún no hay grupos creados. Elige la opción de "Crear Nuevo Grupo".
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={selectedGroupChoice}
                                onChange={(e) => setSelectedGroupChoice(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/40 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              >
                                {groups.map((g) => {
                                  const gName = typeof g === 'string' ? g : g.nombre;
                                  const count = participants.filter((p) => (p.grupo || '').toLowerCase() === gName.toLowerCase()).length;
                                  return (
                                    <option key={g.id || gName} value={gName}>
                                      🏷️ {gName} ({count} participante{count !== 1 ? 's' : ''})
                                    </option>
                                  );
                                })}
                              </select>

                              {/* Botón para eliminar el grupo seleccionado si se desea */}
                              {selectedGroupChoice && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteGroupConfirm(selectedGroupChoice)}
                                    className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    <span>Eliminar grupo "{selectedGroupChoice}"</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Opción 2: Crear Nuevo Grupo */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedGroupChoice === '__NEW__'
                        ? 'bg-indigo-950/50 border-indigo-500/80 ring-1 ring-indigo-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="groupChoiceMode"
                      checked={selectedGroupChoice === '__NEW__'}
                      onChange={() => setSelectedGroupChoice('__NEW__')}
                      className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-white/20 bg-slate-900 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Plus size={15} className="text-emerald-400" />
                        <span>Crear un Nuevo Grupo</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Define un nuevo nombre de grupo y asígnalo inmediatamente.
                      </p>

                      {selectedGroupChoice === '__NEW__' && (
                        <div className="mt-3 space-y-3 pt-2 border-t border-indigo-500/30">
                          <div>
                            <label className="block text-slate-300 font-bold mb-1">
                              Nombre del Grupo <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required={selectedGroupChoice === '__NEW__'}
                              value={newGroupNameInput}
                              onChange={(e) => setNewGroupNameInput(e.target.value)}
                              placeholder="Ej: Equipo Alfa, Sector Calidad, Turno Noche..."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 font-bold mb-1">
                              Descripción (opcional)
                            </label>
                            <input
                              type="text"
                              value={newGroupDescInput}
                              onChange={(e) => setNewGroupDescInput(e.target.value)}
                              placeholder="Ej: Grupo para la competencia por sector"
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Opción 3: Quitar de Grupo */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedGroupChoice === '__NONE__'
                        ? 'bg-red-950/40 border-red-500/70 ring-1 ring-red-500/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="groupChoiceMode"
                      checked={selectedGroupChoice === '__NONE__'}
                      onChange={() => setSelectedGroupChoice('__NONE__')}
                      className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500 border-white/20 bg-slate-900 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-red-300 flex items-center gap-2">
                        <Eraser size={15} className="text-red-400" />
                        <span>Sin Grupo (Desasignar grupo actual)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Quita a los participantes seleccionados de cualquier grupo al que pertenezcan.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer con botones */}
              <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignGroupModalOpen(false)}
                  disabled={isAssigningGroupLoading}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAssigningGroupLoading || (selectedGroupChoice === '__NEW__' && !newGroupNameInput.trim())}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigningGroupLoading && <RefreshCw size={14} className="animate-spin" />}
                  <span>Confirmar Asignación</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
