// ==============================================================================
// GESTOR CRUD DE PREGUNTAS (ESTÁNDAR DON YEYO S.A.)
// Definición de preguntas, opciones dinámicas, fase numérica y explicación pedagógica
// Don Yeyo S.A. | Trivia Inocuidad 2026 | Referencia dy_shigma
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Save,
  RefreshCw,
  BookOpen,
  Award,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { getStoredAdminToken } from '../../services/adminService.js';

export default function AdminQuestionsView({ initialPhase = 1 }) {
  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');

  // Estados del modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null = Crear nueva

  // Estado del formulario
  const [formData, setFormData] = useState({
    id: '',
    fase: initialPhase,
    pregunta: '',
    puntos: 100,
    respuesta_correcta: 1,
    explicacion: '',
    opciones: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' }
    ]
  });

  // Modal de confirmación de eliminación
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar preguntas de la fase seleccionada
  const fetchQuestions = async (phaseNum) => {
    setIsLoading(true);
    try {
      const token = getStoredAdminToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin-questions?phase=${phaseNum}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      } else {
        showStatus('Error al cargar preguntas desde la base de datos', 'error');
      }
    } catch (e) {
      console.error('Error cargando preguntas:', e);
      showStatus('Error de conexión al cargar preguntas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(selectedPhase);
  }, [selectedPhase]);

  // Bloquear scroll de la página cuando algún modal esté abierto
  useEffect(() => {
    if (isModalOpen || Boolean(deletingQuestion)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deletingQuestion]);

  const showStatus = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: 'success' }), 6000);
  };

  // Abrir modal para Crear
  const handleOpenCreate = () => {
    // Calcular siguiente ID sugerido
    const maxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    setEditingQuestion(null);
    setFormData({
      id: maxId + 1,
      fase: selectedPhase,
      pregunta: '',
      puntos: 100,
      respuesta_correcta: 1,
      explicacion: '',
      opciones: [
        { id: 1, text: '' },
        { id: 2, text: '' },
        { id: 3, text: '' },
        { id: 4, text: '' }
      ]
    });
    setIsModalOpen(true);
  };

  // Abrir modal para Editar
  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    const parsedOptions = Array.isArray(q.opciones)
      ? q.opciones.map((opt, idx) => typeof opt === 'string' ? { id: idx + 1, text: opt } : opt)
      : [
          { id: 1, text: '' },
          { id: 2, text: '' }
        ];

    setFormData({
      id: q.id,
      fase: q.fase,
      pregunta: q.pregunta || '',
      puntos: q.puntos || 100,
      respuesta_correcta: q.respuesta_correcta || (parsedOptions[0]?.id || 1),
      explicacion: q.explicacion || '',
      opciones: parsedOptions
    });
    setIsModalOpen(true);
  };

  // Agregar opción al formulario
  const handleAddOption = () => {
    setFormData(prev => {
      const nextId = prev.opciones.reduce((max, opt) => Math.max(max, opt.id || 0), 0) + 1;
      return {
        ...prev,
        opciones: [...prev.opciones, { id: nextId, text: '' }]
      };
    });
  };

  // Eliminar opción del formulario
  const handleRemoveOption = (optId) => {
    if (formData.opciones.length <= 2) {
      alert('La pregunta debe contar con al menos 2 opciones de respuesta.');
      return;
    }
    setFormData(prev => {
      const filtered = prev.opciones.filter(o => o.id !== optId);
      let newCorrect = prev.respuesta_correcta;
      if (newCorrect === optId) {
        newCorrect = filtered[0]?.id || 1;
      }
      return {
        ...prev,
        opciones: filtered,
        respuesta_correcta: newCorrect
      };
    });
  };

  // Cambiar texto de una opción
  const handleOptionTextChange = (optId, newText) => {
    setFormData(prev => ({
      ...prev,
      opciones: prev.opciones.map(o => o.id === optId ? { ...o, text: newText } : o)
    }));
  };

  // Guardar pregunta (Crear o Editar)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();

    if (!formData.pregunta.trim()) {
      alert('Por favor escribe el enunciado de la pregunta.');
      return;
    }

    const filledOptions = formData.opciones.filter(o => o.text.trim().length > 0);
    if (filledOptions.length < 2) {
      alert('Debes completar al menos 2 opciones de respuesta no vacías.');
      return;
    }

    setIsSaving(true);
    try {
      const token = getStoredAdminToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const isEditing = !!editingQuestion;
      const payload = {
        action: isEditing ? 'UPDATE' : 'CREATE',
        fase: formData.fase,
        id: formData.id,
        question: {
          id: formData.id,
          fase: formData.fase,
          pregunta: formData.pregunta.trim(),
          puntos: parseInt(formData.puntos, 10) || 100,
          respuesta_correcta: formData.respuesta_correcta,
          explicacion: formData.explicacion.trim(),
          opciones: filledOptions
        }
      };

      const res = await fetch('/api/admin-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showStatus(isEditing ? 'Pregunta actualizada exitosamente' : 'Pregunta creada exitosamente en Supabase');
        setIsModalOpen(false);
        fetchQuestions(selectedPhase);
      } else {
        alert(data.error || 'Error al guardar la pregunta');
      }
    } catch (e) {
      console.error('Error guardando pregunta:', e);
      alert('Error de conexión al guardar pregunta');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar pregunta
  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;
    setIsDeleting(true);
    try {
      const token = getStoredAdminToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch('/api/admin-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'DELETE',
          fase: deletingQuestion.fase,
          id: deletingQuestion.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showStatus(`Pregunta #${deletingQuestion.id} eliminada exitosamente`);
        setDeletingQuestion(null);
        fetchQuestions(selectedPhase);
      } else {
        alert(data.error || 'Error eliminando la pregunta');
      }
    } catch (e) {
      console.error('Error eliminando pregunta:', e);
      alert('Error de conexión al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado de preguntas por búsqueda
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(item => {
      const inText = (item.pregunta || '').toLowerCase().includes(q);
      const inExpl = (item.explicacion || '').toLowerCase().includes(q);
      const inOpts = (item.opciones || []).some(o => (typeof o === 'string' ? o : o.text || '').toLowerCase().includes(q));
      const inNum = String(item.id).includes(q);
      return inText || inExpl || inOpts || inNum;
    });
  }, [questions, searchQuery]);

  return (
    <div className="w-full space-y-6 animate-casual-in">
      {/* Barra Superior de Control de la Sección */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
              Banco de Preguntas
            </span>
            <span className="text-xs text-slate-400">
              {questions.length} preguntas en Fase {selectedPhase}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
            Gestión de Preguntas por Fase
          </h2>
        </div>

        {/* Selector de Fase + Botón Nueva Pregunta */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Fase */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-white/10">
            {[1, 2, 3].map(phaseNum => (
              <button
                key={phaseNum}
                onClick={() => setSelectedPhase(phaseNum)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedPhase === phaseNum
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Fase {phaseNum}
              </button>
            ))}
          </div>

          {/* Botón Nueva Pregunta */}
          <button
            onClick={handleOpenCreate}
            type="button"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Nueva Pregunta</span>
          </button>
        </div>
      </div>

      {/* Notificación de Estado */}
      {statusMessage.text && (
        <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-xl backdrop-blur-md animate-casual-in ${
          statusMessage.type === 'error'
            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
            : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage({ text: '', type: 'success' })}
            className="text-xs underline cursor-pointer ml-3 opacity-80 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Buscador de Preguntas */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por texto, palabra clave o explicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => fetchQuestions(selectedPhase)}
          type="button"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
          title="Recargar lista de preguntas"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lista de Preguntas */}
      {isLoading ? (
        <div className="p-16 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400">
          <RefreshCw size={36} className="animate-spin mx-auto text-blue-400 mb-3" />
          <p className="font-bold text-sm">Cargando preguntas de Fase {selectedPhase}...</p>
        </div>
      ) : filteredQuestions.length > 0 ? (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const optionsList = Array.isArray(q.opciones) ? q.opciones : [];
            const correctOpt = optionsList.find(o => o.id === q.respuesta_correcta);

            return (
              <div
                key={`${q.fase}_${q.id}`}
                className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg hover:border-blue-500/30 transition-all space-y-4"
              >
                {/* Cabecera de la Tarjeta de Pregunta */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black text-sm flex items-center justify-center shrink-0">
                      #{q.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                          Fase {q.fase}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {q.puntos || 100} Puntos
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                        {q.pregunta}
                      </h3>
                    </div>
                  </div>

                  {/* Acciones de la Pregunta */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <button
                      onClick={() => handleOpenEdit(q)}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
                      title="Editar pregunta"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeletingQuestion(q)}
                      type="button"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Opciones de Respuesta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                  {optionsList.map((opt, idx) => {
                    const optId = typeof opt === 'object' ? opt.id : (idx + 1);
                    const optText = typeof opt === 'object' ? opt.text : opt;
                    const isCorrect = optId === q.respuesta_correcta;

                    return (
                      <div
                        key={optId}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold shadow-sm'
                            : 'bg-slate-950/40 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black ${
                          isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="flex-1">
                          <p>{optText}</p>
                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-black mt-1">
                              <CheckCircle2 size={10} />
                              <span>Opción Correcta</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explicación Pedagógica de la Respuesta Correcta */}
                {q.explicacion && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px] uppercase tracking-wide">
                      <BookOpen size={13} />
                      <span>Explicación de la Respuesta Correcta:</span>
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      {q.explicacion}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl bg-slate-900/50 border border-white/10 text-slate-400">
          <HelpCircle size={40} className="mx-auto text-blue-400/40 mb-3" />
          <h3 className="font-bold text-white text-base">No hay preguntas cargadas en la Fase {selectedPhase}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Comienza haciendo clic en <strong>"Nueva Pregunta"</strong> para agregar enunciados, opciones y explicaciones.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase cursor-pointer"
          >
            Agregar Primera Pregunta
          </button>
        </div>
      )}

      {/* =====================================================================
          MODAL DE CREAR / EDITAR PREGUNTA
          ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header fijo del Modal */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-black text-white">
                    {editingQuestion ? `Editar Pregunta #${formData.id}` : 'Crear Nueva Pregunta'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fase {formData.fase} &bull; Parámetros y opciones en Supabase
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y footer fijo */}
            <form onSubmit={handleSaveQuestion} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-modal-scrollbar">
              {/* Fila 1: Fase, Número de Pregunta y Puntos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wide mb-1.5">
                    Fase Numérica
                  </label>
                  <select
                    value={formData.fase}
                    onChange={(e) => setFormData({ ...formData, fase: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Fase 1</option>
                    <option value={2}>Fase 2</option>
                    <option value={3}>Fase 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wide mb-1.5">
                    Número de Pregunta (ID)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.id}
                    disabled={!!editingQuestion}
                    onChange={(e) => setFormData({ ...formData, id: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wide mb-1.5">
                    Puntos Otorgados
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.puntos}
                    onChange={(e) => setFormData({ ...formData, puntos: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Enunciado de la Pregunta */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wide mb-1.5">
                  Enunciado de la Pregunta *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escribe la pregunta aquí..."
                  value={formData.pregunta}
                  onChange={(e) => setFormData({ ...formData, pregunta: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Opciones de Respuesta */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wide">
                    Opciones de Respuesta (Marca la opción correcta) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Agregar Opción</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.opciones.map((opt, idx) => {
                    const isCorrect = formData.respuesta_correcta === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-500/60'
                            : 'bg-slate-950 border-white/10'
                        }`}
                      >
                        {/* Selector de Opción Correcta (Radio) */}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, respuesta_correcta: opt.id })}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs transition-all cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title={isCorrect ? 'Esta es la respuesta correcta' : 'Marcar como respuesta correcta'}
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>

                        {/* Input de texto de la opción */}
                        <input
                          type="text"
                          required
                          placeholder={`Texto de la opción ${String.fromCharCode(65 + idx)}...`}
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                          className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
                        />

                        {/* Indicador de Correcta */}
                        {isCorrect && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 size={11} />
                            <span>Correcta</span>
                          </span>
                        )}

                        {/* Botón Eliminar Opción */}
                        {formData.opciones.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Eliminar opción"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explicación Pedagógica de la Respuesta Correcta */}
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wide mb-1.5">
                  Explicación de la Respuesta Correcta (Opcional - para mailing pedagógico)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explica brevemente por qué esta es la respuesta correcta según la normativa de inocuidad..."
                  value={formData.explicacion}
                  onChange={(e) => setFormData({ ...formData, explicacion: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer fijo con Botones de Acción */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-slate-950/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingQuestion ? 'Actualizar Pregunta' : 'Crear Pregunta'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
          ===================================================================== */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center">
              <Trash2 size={28} />
            </div>

            <h3 className="text-lg font-heading font-black text-white">
              ¿Eliminar Pregunta #{deletingQuestion.id}?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará la pregunta de la Fase {deletingQuestion.fase} en Supabase.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
