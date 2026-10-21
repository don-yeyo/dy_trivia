import React, { useState, useEffect, useRef, useCallback } from 'react';
import OptionButton from './OptionButton';
import { sounds } from '../services/soundEffects';
import { loadTriviaQuestions } from '../services/triviaService';
import { Zap, RefreshCw } from 'lucide-react';

export default function TriviaGame({
  questions = [],
  totalQuestionsCount = 10,
  initialQuestionIndex = 0,
  timePerQuestion = 45,
  userLegajo,
  userToken = '',
  activePhase = 1,
  onFinishGame,
  onAnswerSubmit,
  onQuestionStart
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion > 0 ? timePerQuestion : 45);

  // Pregunta activa actual (soporta modo individual Zero-Trust y modo array legado)
  const [activeQuestion, setActiveQuestion] = useState(() => {
    return (questions && questions.length > 0) ? questions[0] : null;
  });

  const timerRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());
  const isAnswerLockedRef = useRef(false);
  const activeQuestionRef = useRef(activeQuestion);

  // Mantener activeQuestionRef siempre sincronizado para evitar cierres obsoletos en callbacks
  useEffect(() => {
    activeQuestionRef.current = activeQuestion;
  }, [activeQuestion]);

  // Si llegan las preguntas por primera vez
  useEffect(() => {
    if (!activeQuestion && questions && questions.length > 0) {
      setActiveQuestion(questions[0]);
    }
  }, [questions, activeQuestion]);

  // Geometría de la dona SVG
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63

  // Transición suave hacia la siguiente pregunta
  const transitionToNext = useCallback((nextQuestion) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    // Iniciar animación de salida elegante con fade y desplazamiento
    setIsAnimatingOut(true);

    setTimeout(() => {
      if (nextQuestion) {
        setActiveQuestion(nextQuestion);
        setCurrentIndex(prev => prev + 1);
        setSelectedOptionId(null);
        setIsAnswerLocked(false);
        isAnswerLockedRef.current = false;
        isTransitioningRef.current = false;
        setTimeLeft(timePerQuestion > 0 ? timePerQuestion : 45);
        questionStartTimeRef.current = Date.now();
        setIsAnimatingOut(false);
      } else {
        onFinishGame();
      }
    }, 350);
  }, [timePerQuestion, onFinishGame]);

  // Manejo inteligente del avance de pregunta garantizando Zero-Trust
  const handleAdvanceQuestion = useCallback(async (submitResult) => {
    // 1. Si el servidor confirma explícitamente que la fase o trivia ha concluido
    if (submitResult?.isFinished) {
      onFinishGame();
      return;
    }

    // 2. Si el servidor entregó la siguiente pregunta en el payload (Zero-Latency)
    if (submitResult?.nextQuestion) {
      transitionToNext(submitResult.nextQuestion);
      return;
    }

    // 3. Fallback: Si estamos en modo array completo (modo local / admin) y hay más preguntas en `questions`
    const nextIdx = currentIndex + 1;
    if (questions && nextIdx < questions.length && questions[nextIdx]) {
      transitionToNext(questions[nextIdx]);
      return;
    }

    // 4. Si aún no alcanzamos el total de preguntas pero el servidor no adjuntó nextQuestion
    // (ej: retardo de red móvil o paquete truncado), consultar proactivamente la siguiente pregunta al backend
    const totalQ = totalQuestionsCount || 10;
    const currentStep = (initialQuestionIndex || 0) + currentIndex + 1;
    if (currentStep < totalQ && userToken) {
      try {
        const rescueData = await loadTriviaQuestions(activePhase, false, userToken);
        if (rescueData?.question && !rescueData.isPhaseCompleted) {
          transitionToNext({
            ...rescueData.question,
            questionToken: rescueData.questionToken
          });
          return;
        }
      } catch (err) {
        console.warn('Error en intento de rescate de pregunta siguiente:', err);
      }
    }

    // 5. No hay más preguntas: finalizar juego
    onFinishGame();
  }, [currentIndex, questions, totalQuestionsCount, initialQuestionIndex, userToken, activePhase, onFinishGame, transitionToNext]);

  // Manejo de tiempo agotado
  const handleTimeExpired = useCallback(async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    sounds.playSelect();

    const q = activeQuestionRef.current;
    let submitResult = null;
    if (q) {
      submitResult = await onAnswerSubmit({
        questionId: q.id,
        questionText: q.question,
        selectedOptionId: null,
        questionToken: q.questionToken,
        isCorrect: false,
        pointsEarned: 0,
        timeSpent: timePerQuestion
      });
    }

    // Breve pausa para notar el tiempo cumplido antes de avanzar
    setTimeout(() => {
      handleAdvanceQuestion(submitResult);
    }, 300);
  }, [timePerQuestion, onAnswerSubmit, handleAdvanceQuestion]);

  // Iniciar temporizador por pregunta y registrar listeners antitrampa
  useEffect(() => {
    if (!activeQuestion) return;

    // Resetear estados al cambiar de pregunta
    setTimeLeft(timePerQuestion > 0 ? timePerQuestion : 45);
    setIsAnswerLocked(false);
    isAnswerLockedRef.current = false;
    setSelectedOptionId(null);
    setIsAnimatingOut(false);
    isTransitioningRef.current = false;
    questionStartTimeRef.current = Date.now();

    // 🛡️ Mecanismo Antitrampa 1: Registrar inmediatamente en servidor que la pregunta fue abierta
    if (onQuestionStart && activeQuestion.id) {
      onQuestionStart(activeQuestion.id);
    }

    // 🛡️ Mecanismo Antitrampa 2: Advertir si intenta recargar o salir
    const handleBeforeUnload = (e) => {
      if (!isAnswerLockedRef.current && activeQuestionRef.current) {
        e.preventDefault();
        e.returnValue = 'Si sales o recargas la pantalla, perderás esta pregunta con 0 puntos.';
        return e.returnValue;
      }
    };

    // 🛡️ Mecanismo Antitrampa 3: Si se concreta la recarga o abandono, asentar pérdida definitiva
    const handlePageHide = () => {
      const q = activeQuestionRef.current;
      if (!isAnswerLockedRef.current && q && userLegajo) {
        const payload = JSON.stringify({
          legajo: String(userLegajo),
          userToken: userToken || '',
          questionToken: q.questionToken || '',
          phase: parseInt(activePhase, 10),
          questionId: q.id,
          selectedOptionId: null,
          timeSpent: timePerQuestion,
          isAborted: true
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/submit-answer', new Blob([payload], { type: 'application/json' }));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (timePerQuestion > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [activeQuestion?.id, timePerQuestion, handleTimeExpired, onQuestionStart, userLegajo, activePhase, userToken]);

  // Manejo de selección de opción con feedback visual y transición fluida
  const handleOptionSelect = async (optionId) => {
    const q = activeQuestionRef.current;
    if (isAnswerLocked || isTransitioningRef.current || !q) return;
    isTransitioningRef.current = true;
    isAnswerLockedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Bloquear y mostrar inmediatamente la opción seleccionada con iluminación
    setIsAnswerLocked(true);
    setSelectedOptionId(optionId);
    sounds.playSelect();

    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));

    // Enviar respuesta al backend seguro con questionToken HMAC
    const submitResult = await onAnswerSubmit({
      questionId: q.id,
      questionText: q.question,
      selectedOptionId: optionId,
      questionToken: q.questionToken,
      timeSpent
    });

    // Pausa visual agradable (~380ms) para que el usuario aprecie su selección antes de transicionar
    setTimeout(() => {
      handleAdvanceQuestion(submitResult);
    }, 380);
  };

  if (!activeQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white">
        <RefreshCw size={24} className="animate-spin text-red-400 mb-3" />
        <span className="font-semibold">Cargando preguntas de la trivia...</span>
      </div>
    );
  }

  // Cálculos para arcos de dona SVG
  const totalQuestions = totalQuestionsCount || 10;
  const currentStep = (initialQuestionIndex || 0) + currentIndex + 1;
  const progressRatio = Math.min(1, currentStep / totalQuestions);
  const progressDashoffset = circumference - (progressRatio * circumference);

  const timeRatio = timePerQuestion > 0 ? timeLeft / timePerQuestion : 1;
  const timeDashoffset = circumference - (timeRatio * circumference);

  const isLowTime = timeLeft <= 10;

  return (
    <div className={`w-full flex-1 flex flex-col justify-between z-10 ${
      isAnimatingOut ? 'animate-question-out' : 'animate-question-in'
    }`}>
      {/* Indicadores Circulares Tipo Dona en la Misma Línea */}
      <div id="barra-estado-donas" className="circular-status-bar">
        {/* Dona 1: Avance Circular */}
        <div id="card-dona-preguntas" className="donut-card">
          <div className="donut-container">
            <svg className="donut-svg" viewBox="0 0 80 80">
              <circle
                className="donut-bg-ring"
                cx="40"
                cy="40"
                r={radius}
              />
              <circle
                className="donut-progress-ring"
                cx="40"
                cy="40"
                r={radius}
                stroke="#E5353B"
                strokeDasharray={circumference}
                strokeDashoffset={progressDashoffset}
              />
            </svg>
            <div className="donut-center-content">
              <span className="font-extrabold text-sm sm:text-base text-white leading-none">
                {currentStep} de {totalQuestions}
              </span>
            </div>
          </div>
          <span className="donut-label-title">Preguntas</span>
        </div>

        {/* Dona 2: Tiempo Restante Circular */}
        {timePerQuestion > 0 && (
          <div id="card-dona-tiempo" className={`donut-card ${isLowTime ? 'animate-donut-vibrate' : ''}`}>
            <div className={`donut-container ${isLowTime ? 'border-2 border-red-500/80 shadow-lg shadow-red-500/40' : ''}`}>
              <svg className="donut-svg" viewBox="0 0 80 80">
                <circle
                  className="donut-bg-ring"
                  cx="40"
                  cy="40"
                  r={radius}
                />
                <circle
                  className="donut-progress-ring"
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={isLowTime ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#10b981'}
                  strokeDasharray={circumference}
                  strokeDashoffset={timeDashoffset}
                />
              </svg>
              <div className="donut-center-content">
                <span className={`font-black text-base sm:text-lg leading-none ${isLowTime ? 'text-red-400 font-extrabold' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <span className={`donut-label-title ${isLowTime ? 'text-red-400' : ''}`}>Tiempo</span>
          </div>
        )}
      </div>

      {/* Tarjeta de la Pregunta de Alto Contraste */}
      <div id="card-pregunta" className="casual-card text-left">
        <div className="flex items-center gap-2 text-sm sm:text-base font-black text-red-600 uppercase tracking-wider mb-3">
          <Zap size={18} className="text-red-600 fill-red-600" />
          <span>Pregunta {currentStep} de {totalQuestions}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-950 leading-snug tracking-tight">
          {activeQuestion.question}
        </h2>
      </div>

      {/* Opciones de Respuesta */}
      <div id="contenedor-opciones" className="space-y-3 sm:space-y-4 mb-4">
        {activeQuestion.options && activeQuestion.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <OptionButton
              key={`q${activeQuestion.id}-opt${option.id}-${currentStep}-${idx}`}
              index={idx}
              option={option}
              isSelected={isSelected}
              isDisabled={isAnswerLocked}
              onClick={handleOptionSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
