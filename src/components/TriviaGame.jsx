import React, { useState, useEffect, useRef } from 'react';
import OptionButton from './OptionButton';
import { sounds } from '../services/soundEffects';
import { HelpCircle, Zap } from 'lucide-react';

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
  const [timeLeft, setTimeLeft] = useState(timePerQuestion > 0 ? timePerQuestion : null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);

  const timerRef = useRef(null);
  const currentQuestion = questions[currentIndex];

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

  const handleTimeExpired = () => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    sounds.playIncorrect();
    setShowFeedback(true);

    onAnswerSubmit({
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedOptionId: null,
      isCorrect: false,
      pointsEarned: 0,
      timeSpent: timePerQuestion
    });

    setTimeout(() => {
      goToNextQuestion();
    }, 1800);
  };

  const handleOptionSelect = (optionId) => {
    if (isAnswerLocked) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswerLocked(true);
    setSelectedOptionId(optionId);
    sounds.playSelect();

    const isCorrect = optionId === currentQuestion.correctOptionId;
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    
    let pointsEarned = 0;
    if (isCorrect) {
      const speedBonus = timePerQuestion > 0 ? Math.round((timeLeft / timePerQuestion) * 50) : 0;
      pointsEarned = currentQuestion.points + speedBonus;
      setTimeout(() => sounds.playCorrect(), 150);
    } else {
      setTimeout(() => sounds.playIncorrect(), 150);
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
    }, 250);
  };

  if (!currentQuestion) return null;

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const timeBarPercent = timePerQuestion > 0 ? (timeLeft / timePerQuestion) * 100 : 100;

  return (
    <div className={`w-full max-w-xl mx-auto px-4 py-4 flex-1 flex flex-col justify-between z-10 ${
      isAnimatingOut ? 'animate-casual-out' : 'animate-casual-in'
    }`}>
      {/* Progreso & Temporizador Casual */}
      <div className="w-full mb-4">
        <div className="flex justify-between items-center text-xs text-white/90 mb-1.5 font-semibold">
          <span>Pregunta {currentIndex + 1} de {questions.length}</span>
          <span className="text-yellow-300 font-bold">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-2.5">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-yellow-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Barra de tiempo por pregunta */}
        {timePerQuestion > 0 && (
          <div className="casual-timer-track">
            <div 
              className={`casual-timer-fill ${
                timeLeft <= 10 ? 'bg-red-500 shadow-md shadow-red-500/50' : timeLeft <= 20 ? 'bg-yellow-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${timeBarPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Tarjeta de la Pregunta (Limpia, Blanca, Soft Shadows) */}
      <div className="casual-card p-6 sm:p-7 w-full mb-4 text-left">
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
          <Zap size={14} className="text-red-500" />
          <span>Valor: {currentQuestion.points} pts</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Opciones de Respuesta Casual */}
      <div className="space-y-2.5 mb-4">
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

      {/* Explicación pedagógica de inocuidad */}
      {showFeedback && currentQuestion.explanation && (
        <div className="casual-card p-4 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5 animate-casual-in mb-2">
          <HelpCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Fundamento de Inocuidad:</span>
            {currentQuestion.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
