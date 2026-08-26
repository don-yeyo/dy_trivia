import React, { useState, useEffect, useRef } from 'react';
import OptionButton from './OptionButton';
import { sounds } from '../services/soundEffects';
import { HelpCircle, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TriviaGame({
  questions = [],
  timePerQuestion = 45,
  maxTotalTime = 600,
  onFinishGame,
  onAnswerSubmit
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion > 0 ? timePerQuestion : null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);

  const timerRef = useRef(null);
  const currentQuestion = questions[currentIndex];

  // Iniciar / Resetear temporizador por pregunta
  useEffect(() => {
    if (timePerQuestion > 0) {
      setTimeLeft(timePerQuestion);
      setQuestionStartTime(Date.now());
      setIsAnswerLocked(false);
      setSelectedOptionId(null);
      setShowFeedback(false);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, timePerQuestion]);

  // Manejo de tiempo expirado
  const handleTimeExpired = () => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    sounds.playIncorrect();
    setShowFeedback(true);

    const timeSpent = timePerQuestion;
    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedOptionId: null,
      isCorrect: false,
      pointsEarned: 0,
      timeSpent
    });

    // Avanzar tras breve pausa para ver la respuesta correcta
    setTimeout(() => {
      goToNextQuestion();
    }, 1800);
  };

  // Manejo de selección de opción
  const handleOptionSelect = (optionId) => {
    if (isAnswerLocked) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswerLocked(true);
    setSelectedOptionId(optionId);
    sounds.playSelect();

    const isCorrect = optionId === currentQuestion.correctOptionId;
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    
    // Bonificación de puntos por rapidez
    let pointsEarned = 0;
    if (isCorrect) {
      const speedBonus = timePerQuestion > 0 ? Math.round((timeLeft / timePerQuestion) * 50) : 0;
      pointsEarned = currentQuestion.points + speedBonus;
      setTimeout(() => sounds.playCorrect(), 200);
    } else {
      setTimeout(() => sounds.playIncorrect(), 200);
    }

    setShowFeedback(true);

    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedOptionId: optionId,
      isCorrect,
      pointsEarned,
      timeSpent
    });

    // Transición con animación swap out a la siguiente pregunta
    setTimeout(() => {
      goToNextQuestion();
    }, 1600);
  };

  const goToNextQuestion = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setIsAnimatingOut(false);
      } else {
        onFinishGame();
      }
    }, 300);
  };

  if (!currentQuestion) return null;

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const timeBarPercent = timePerQuestion > 0 ? (timeLeft / timePerQuestion) * 100 : 100;

  return (
    <div className={`w-full max-w-2xl mx-auto px-4 py-4 flex-1 flex flex-col justify-between z-10 ${
      isAnimatingOut ? 'animate-swap-out' : 'animate-swap-in'
    }`}>
      {/* Barra de Progreso Global de Preguntas */}
      <div className="w-full mb-3">
        <div className="flex justify-between items-center text-xs text-gray-300 mb-1.5 font-semibold">
          <span>Pregunta {currentIndex + 1} de {questions.length}</span>
          <span className="text-yellow-400 font-bold">{Math.round(progressPercent)}% completado</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Temporizador de Pregunta */}
      {timePerQuestion > 0 && (
        <div className="w-full mb-4">
          <div className="timer-bar-container">
            <div 
              className={`timer-bar-fill ${
                timeLeft <= 10 ? 'bg-red-500 shadow-lg shadow-red-500/50' : timeLeft <= 20 ? 'bg-yellow-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${timeBarPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Tarjeta Glassmorphic de la Pregunta */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl mb-6 shadow-2xl relative border-t border-white/30">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">
          <Zap size={15} className="text-yellow-400" />
          <span>Valor: {currentQuestion.points} pts</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Opciones de Respuesta 3D Glass */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = showFeedback && option.id === currentQuestion.correctOptionId;
          const isIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <OptionButton
              key={option.id}
              index={idx}
              option={option}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              isDisabled={isAnswerLocked}
              onClick={handleOptionSelect}
            />
          );
        })}
      </div>

      {/* Explicación formativa en caso de respuesta */}
      {showFeedback && currentQuestion.explanation && (
        <div className="glass-card p-4 rounded-xl border border-white/20 animate-fade-in text-xs sm:text-sm text-gray-200 flex items-start gap-2.5">
          <HelpCircle size={18} className="text-blue-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Fundamento de Inocuidad:</span>
            {currentQuestion.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
