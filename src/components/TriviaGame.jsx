import React, { useState, useEffect, useRef } from 'react';
import OptionButton from './OptionButton';
import { sounds } from '../services/soundEffects';
import { Zap, Clock, HelpCircle } from 'lucide-react';

export default function TriviaGame({
  questions = [],
  timePerQuestion = 45,
  onFinishGame,
  onAnswerSubmit
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion > 0 ? timePerQuestion : 45);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const timerRef = useRef(null);
  const currentQuestion = questions[currentIndex];

  // Geometría del círculo SVG
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63

  // Iniciar temporizador por pregunta
  useEffect(() => {
    if (timePerQuestion > 0) {
      setTimeLeft(timePerQuestion);
      setQuestionStartTime(Date.now());
      setIsAnswerLocked(false);
      setSelectedOptionId(null);

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

  // Manejo de tiempo agotado
  const handleTimeExpired = () => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    sounds.playSelect();

    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedOptionId: null,
      isCorrect: false,
      pointsEarned: 0,
      timeSpent: timePerQuestion
    });

    setIsAnimatingOut(true);
    setTimeout(() => {
      goToNextQuestion();
    }, 450);
  };

  // Manejo de selección de opción (SIN REVELAR RESPUESTA CORRECTA)
  const handleOptionSelect = (optionId) => {
    if (isAnswerLocked) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswerLocked(true);
    setSelectedOptionId(optionId);
    sounds.playSelect();

    const isCorrect = optionId === currentQuestion.correctOptionId;
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    
    // Cálculo interno de puntos (guardado en silencio sin mostrar en pantalla)
    let pointsEarned = 0;
    if (isCorrect) {
      const speedBonus = timePerQuestion > 0 ? Math.round((timeLeft / timePerQuestion) * 50) : 0;
      pointsEarned = currentQuestion.points + speedBonus;
    }

    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedOptionId: optionId,
      isCorrect,
      pointsEarned,
      timeSpent
    });

    // Transición suave con fade y vibración out
    setIsAnimatingOut(true);
    setTimeout(() => {
      goToNextQuestion();
    }, 400);
  };

  const goToNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setIsAnimatingOut(false);
    } else {
      onFinishGame();
    }
  };

  if (!currentQuestion) return null;

  // Cálculos para arcos de dona SVG
  const totalQuestions = questions.length;
  const currentStep = currentIndex + 1;
  const progressRatio = currentStep / totalQuestions;
  const progressDashoffset = circumference - (progressRatio * circumference);

  const timeRatio = timePerQuestion > 0 ? timeLeft / timePerQuestion : 1;
  const timeDashoffset = circumference - (timeRatio * circumference);

  const isLowTime = timeLeft <= 10;

  return (
    <div className={`w-full flex-1 flex flex-col justify-between z-10 ${
      isAnimatingOut ? 'animate-fade-vibrate-out' : 'animate-casual-in'
    }`}>
      {/* Indicadores Circulares Tipo Dona en la Misma Línea */}
      <div className="circular-status-bar">
        {/* Dona 1: Avance Circular con texto "X de N" adentro */}
        <div className="donut-card">
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

        {/* Dona 2: Tiempo Restante Circular con cuenta regresiva en segundos y vibración */}
        {timePerQuestion > 0 && (
          <div className={`donut-card ${isLowTime ? 'animate-donut-vibrate' : ''}`}>
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

      {/* Tarjeta de la Pregunta */}
      <div className="casual-card text-left">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-red-600 uppercase tracking-wider mb-3">
          <Zap size={16} className="text-red-500" />
          <span>Pregunta {currentStep}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-snug">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Opciones de Respuesta Casual (Sin revelar respuestas correctas) */}
      <div className="space-y-4 mb-4">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <OptionButton
              key={option.id}
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
