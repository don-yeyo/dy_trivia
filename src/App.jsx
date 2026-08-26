import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SplashIntro from './components/SplashIntro';
import TriviaGame from './components/TriviaGame';
import GameOver from './components/GameOver';
import PhaseLocked from './components/PhaseLocked';
import AdminLinksModal from './components/AdminLinksModal';
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

  const handleResetSession = () => {
    if (currentUser?.legajo) {
      localStorage.removeItem(`dy_trivia_access_${currentUser.legajo}_fase${activePhase}`);
    }
    localStorage.removeItem(`dy_trivia_access_9999_fase${activePhase}`);
    localStorage.removeItem(`dy_trivia_access_1001_fase${activePhase}`);
    localStorage.removeItem(`dy_trivia_access_1002_fase${activePhase}`);
    localStorage.removeItem(`dy_trivia_access_1003_fase${activePhase}`);
    localStorage.removeItem(`dy_trivia_access_1004_fase${activePhase}`);
    localStorage.removeItem(`dy_trivia_access_1005_fase${activePhase}`);
    
    setUserScore(0);
    setCorrectAnswersCount(0);
    setAnswersLog([]);
    setPlayedDate(null);
    setGameState('SPLASH');
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
    <div className="app-layout">
      {/* Header superior limpio */}
      <Header
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
      />

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
            totalQuestions={questions.length}
            totalTime={totalElapsedTime}
          />
        )}

        {gameState === 'LOCKED' && (
          <PhaseLocked
            user={currentUser}
            playedDate={playedDate}
            isTokenInvalid={false}
            onResetSession={handleResetSession}
          />
        )}

        {gameState === 'INVALID_TOKEN' && (
          <PhaseLocked
            isTokenInvalid={true}
          />
        )}
      </main>

      {/* Footer limpio sin textos innecesarios */}
      <footer className="app-footer justify-end">
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors cursor-pointer bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-full backdrop-blur-md font-medium text-xs shadow-sm ml-auto"
          title="Ver Enlaces de Participantes (RRHH)"
        >
          <KeyRound size={13} className="text-yellow-300" />
          <span>Enlaces RRHH</span>
        </button>
      </footer>

      {/* Modal de enlaces para RRHH / Pruebas */}
      <AdminLinksModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}
