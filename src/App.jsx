import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SplashIntro from './components/SplashIntro';
import TriviaGame from './components/TriviaGame';
import GameOver from './components/GameOver';
import PhaseLocked from './components/PhaseLocked';
import AdminLinksModal from './components/AdminLinksModal';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { validateUserToken, recordPhaseAccess } from './services/authService';
import { loadTriviaQuestions } from './services/triviaService';
import { sounds } from './services/soundEffects';
import { RefreshCw, KeyRound } from 'lucide-react';

export default function App() {
  const activePhase = parseInt(import.meta.env.VITE_ACTIVE_PHASE || '1', 10);
  const shuffleQuestions = import.meta.env.VITE_SHUFFLE_QUESTIONS === 'true';
  const timePerQuestion = parseInt(import.meta.env.VITE_TIME_PER_QUESTION || '45', 10);

  const [gameState, setGameState] = useState('LOADING'); // LOADING | SPLASH | PLAYING | FINISHED | LOCKED | INVALID_TOKEN
  const [currentUser, setCurrentUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userScore, setUserScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answersLog, setAnswersLog] = useState([]);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [playedDate, setPlayedDate] = useState(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    async function initApp() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('hash') || urlParams.get('legajo');
      const effectiveToken = token || 'demo';

      const validation = await validateUserToken(effectiveToken, activePhase);

      if (!validation.isValid) {
        setGameState('INVALID_TOKEN');
        return;
      }

      setCurrentUser(validation.user);

      if (validation.alreadyPlayed) {
        setPlayedDate(validation.playedDate);
        setGameState('LOCKED');
        return;
      }

      const loadedQuestions = await loadTriviaQuestions(activePhase, shuffleQuestions);
      setQuestions(loadedQuestions);
      setGameState('SPLASH');
    }

    initApp();
  }, [activePhase, shuffleQuestions]);

  const handleToggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  const handleStartGame = () => {
    setGameState('PLAYING');
    setGameStartTime(Date.now());
  };

  const handleAnswerSubmit = (answerData) => {
    if (answerData.isCorrect) {
      setUserScore(prev => prev + answerData.pointsEarned);
      setCorrectAnswersCount(prev => prev + 1);
    }
    setAnswersLog(prev => [...prev, answerData]);
  };

  const handleFinishGame = async () => {
    const elapsedSeconds = gameStartTime ? Math.max(1, Math.round((Date.now() - gameStartTime) / 1000)) : 0;
    setTotalElapsedTime(elapsedSeconds);

    if (currentUser) {
      await recordPhaseAccess(currentUser.legajo, activePhase, {
        score: userScore,
        correctCount: correctAnswersCount,
        totalTime: elapsedSeconds,
        answers: answersLog
      });
    }

    setGameState('FINISHED');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden">
      {/* Header superior limpio sin 'Fase 1' */}
      <Header
        score={userScore}
        questionIndex={answersLog.length}
        totalQuestions={questions.length}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        isGameActive={gameState === 'PLAYING'}
      />

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
        {gameState === 'LOADING' && (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-20 h-20 rounded-3xl p-3 bg-white shadow-xl flex items-center justify-center animate-soft-pulse">
              <img src="/logo-donyeyo.svg" alt="Cargando" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
              <RefreshCw size={16} className="animate-spin text-red-400" />
              <span>Cargando Trivia de Inocuidad...</span>
            </div>
          </div>
        )}

        {gameState === 'SPLASH' && (
          <SplashIntro
            user={currentUser}
            totalQuestions={questions.length}
            onStartGame={handleStartGame}
          />
        )}

        {gameState === 'PLAYING' && (
          <TriviaGame
            questions={questions}
            timePerQuestion={timePerQuestion}
            onFinishGame={handleFinishGame}
            onAnswerSubmit={handleAnswerSubmit}
          />
        )}

        {gameState === 'FINISHED' && (
          <GameOver
            user={currentUser}
            score={userScore}
            correctCount={correctAnswersCount}
            totalQuestions={questions.length}
            totalTime={totalElapsedTime}
          />
        )}

        {gameState === 'LOCKED' && (
          <PhaseLocked
            user={currentUser}
            playedDate={playedDate}
            isTokenInvalid={false}
          />
        )}

        {gameState === 'INVALID_TOKEN' && (
          <PhaseLocked
            isTokenInvalid={true}
          />
        )}
      </main>

      {/* Footer corporativo Don Yeyo */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-[11px] text-slate-300 z-20">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="font-bold text-white">Don Yeyo S.A.</span>
          <span>&bull;</span>
          <span>Semana de la Inocuidad 2026</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-1 text-slate-200 hover:text-white transition-colors cursor-pointer bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs"
            title="Ver Enlaces de Participantes (RRHH)"
          >
            <KeyRound size={12} className="text-yellow-300" />
            <span className="hidden sm:inline">Enlaces RRHH</span>
          </button>
          <span className="opacity-75">v1.1.0</span>
        </div>
      </footer>

      {/* Modal de enlaces para RRHH / Pruebas */}
      <AdminLinksModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Prompt PWA para instalación */}
      <PwaInstallPrompt />
    </div>
  );
}
