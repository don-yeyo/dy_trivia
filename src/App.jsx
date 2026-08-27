import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SplashIntro from './components/SplashIntro';
import CountdownIntro from './components/CountdownIntro';
import TriviaGame from './components/TriviaGame';
import GameOver from './components/GameOver';
import PhaseLocked from './components/PhaseLocked';
import SunburstBackground from './components/SunburstBackground';
import { validateUserToken, recordPhaseQuestionAnswer } from './services/authService';
import { loadTriviaQuestions } from './services/triviaService';
import { fetchUserProgressFromResults } from './services/googleSheetsService';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const activePhase = parseInt(import.meta.env.VITE_ACTIVE_PHASE || '1', 10);
  const shuffleQuestions = import.meta.env.VITE_SHUFFLE_QUESTIONS === 'true';
  const timePerQuestion = parseInt(import.meta.env.VITE_TIME_PER_QUESTION || '45', 10);

  const [gameState, setGameState] = useState('LOADING'); // LOADING | SPLASH | COUNTDOWN | PLAYING | FINISHED | LOCKED | INVALID_TOKEN
  const [currentUser, setCurrentUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [totalPhaseQuestionsCount, setTotalPhaseQuestionsCount] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answersLog, setAnswersLog] = useState([]);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [playedDate, setPlayedDate] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(Date.now());

  useEffect(() => {
    async function initApp() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('hash') || urlParams.get('legajo');
      const allowSessionReset = import.meta.env.VITE_ALLOW_SESSION_RESET === 'true';
      const effectiveToken = token || (allowSessionReset ? 'demo' : null);

      const validation = await validateUserToken(effectiveToken, activePhase);

      if (!validation.isValid) {
        setGameState('INVALID_TOKEN');
        return;
      }

      setCurrentUser(validation.user);

      // Cargar todas las preguntas de la fase activa
      const allPhaseQuestions = await loadTriviaQuestions(activePhase, shuffleQuestions);
      setTotalPhaseQuestionsCount(allPhaseQuestions.length);

      // Consultar el progreso de respuestas en Google Sheets (Fuente de Verdad)
      const progress = await fetchUserProgressFromResults(validation.user.legajo, activePhase);

      if (progress.hasRecord && progress.answers && progress.answers.length > 0) {
        const answeredIds = progress.answers.map(a => a.questionId);
        const pendingQuestions = allPhaseQuestions.filter(q => !answeredIds.includes(q.id));

        // Si ya respondió todas las preguntas de esta fase
        if (pendingQuestions.length === 0) {
          setPlayedDate(progress.fechaHora || new Date().toISOString());
          setGameState('LOCKED');
          return;
        }

        // Si le quedan preguntas pendientes por responder
        setQuestions(pendingQuestions);
        setUserScore(progress.score || 0);
        setCorrectAnswersCount(progress.correctCount || 0);
        setAnswersLog(progress.answers || []);
        setTotalElapsedTime(progress.totalTime || 0);
        setGameState('SPLASH');
      } else {
        // Primera vez o preguntas reseteadas en la planilla
        setQuestions(allPhaseQuestions);
        setUserScore(0);
        setCorrectAnswersCount(0);
        setAnswersLog([]);
        setTotalElapsedTime(0);
        setGameState('SPLASH');
      }
    }

    initApp();
  }, [activePhase, shuffleQuestions]);

  // Al presionar Comenzar, iniciar cuenta regresiva
  const handleTriggerCountdown = async () => {
    if (!questions || questions.length === 0) {
      const loaded = await loadTriviaQuestions(activePhase, shuffleQuestions);
      setQuestions(loaded);
    }
    setGameSessionId(Date.now());
    setGameState('COUNTDOWN');
  };

  // Al finalizar cuenta regresiva, iniciar el juego
  const handleStartGame = () => {
    setGameState('PLAYING');
    setGameStartTime(Date.now());
  };

  // Tras responder cada pregunta individual, actualizar estado y persistir en Google Sheets
  const handleAnswerSubmit = (answerData) => {
    const isCorrect = Boolean(answerData.isCorrect);
    const pointsEarned = answerData.pointsEarned || 0;
    const timeSpent = answerData.timeSpent || 0;

    if (isCorrect) {
      setUserScore(prev => prev + pointsEarned);
      setCorrectAnswersCount(prev => prev + 1);
    }
    setTotalElapsedTime(prev => prev + timeSpent);
    setAnswersLog(prev => [...prev, answerData]);

    // Persistencia inmediata en Google Sheets para esta pregunta
    if (currentUser?.legajo) {
      recordPhaseQuestionAnswer(currentUser.legajo, activePhase, answerData);
    }
  };

  const handleResetSession = async () => {
    setUserScore(0);
    setCorrectAnswersCount(0);
    setAnswersLog([]);
    setPlayedDate(null);
    setGameSessionId(Date.now());

    const loadedQuestions = await loadTriviaQuestions(activePhase, shuffleQuestions);
    setQuestions(loadedQuestions);
    setGameState('SPLASH');
  };

  const handleFinishGame = async () => {
    setGameState('FINISHED');
  };

  return (
    <div className="app-layout relative overflow-hidden">
      {/* Fondo de rayos rectos giratorios reactivo en todas las pantallas */}
      <SunburstBackground screenKey={gameState} />

      {/* Header superior limpio */}
      <Header />

      {/* Contenido Principal */}
      <main className="app-main">
        {gameState === 'LOADING' && (
          <div className="flex flex-col items-center gap-5 text-white py-16">
            <div className="w-24 h-24 rounded-3xl p-4 bg-white shadow-2xl flex items-center justify-center animate-soft-pulse">
              <img src="/logo-donyeyo.svg" alt="Cargando" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-3 text-base text-slate-100 font-semibold tracking-wide mt-2">
              <RefreshCw size={18} className="animate-spin text-red-500" />
              <span>Cargando Trivia de Inocuidad...</span>
            </div>
          </div>
        )}

        {gameState === 'SPLASH' && (
          <SplashIntro
            user={currentUser}
            totalQuestions={totalPhaseQuestionsCount || questions.length}
            pendingQuestionsCount={questions.length}
            isResuming={answersLog && answersLog.length > 0}
            onStartGame={handleTriggerCountdown}
          />
        )}

        {gameState === 'COUNTDOWN' && (
          <CountdownIntro
            onCountdownComplete={handleStartGame}
          />
        )}

        {gameState === 'PLAYING' && (
          <TriviaGame
            key={gameSessionId}
            questions={questions}
            timePerQuestion={timePerQuestion}
            onFinishGame={handleFinishGame}
            onAnswerSubmit={handleAnswerSubmit}
          />
        )}

        {gameState === 'FINISHED' && (
          <GameOver
            user={currentUser}
            totalQuestions={totalPhaseQuestionsCount || questions.length}
            answeredQuestions={answersLog.filter(a => a.selectedOptionId !== null && a.selectedOptionId !== undefined).length}
            totalTime={totalElapsedTime}
          />
        )}

        {gameState === 'LOCKED' && (
          <PhaseLocked
            user={currentUser}
            playedDate={playedDate}
            isTokenInvalid={false}
            allowReset={import.meta.env.VITE_ALLOW_SESSION_RESET === 'true'}
            onResetSession={handleResetSession}
          />
        )}

        {gameState === 'INVALID_TOKEN' && (
          <PhaseLocked
            isTokenInvalid={true}
          />
        )}
      </main>
    </div>
  );
}
