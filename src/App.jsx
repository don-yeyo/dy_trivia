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
import { ShieldCheck, KeyRound, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  // Parámetros de entorno configurables
  const activePhase = parseInt(import.meta.env.VITE_ACTIVE_PHASE || '1', 10);
  const shuffleQuestions = import.meta.env.VITE_SHUFFLE_QUESTIONS === 'true';
  const timePerQuestion = parseInt(import.meta.env.VITE_TIME_PER_QUESTION || '45', 10);
  const maxTotalTime = parseInt(import.meta.env.VITE_MAX_TIME_TOTAL || '600', 10);

  // Estados de la Aplicación
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

  // Inicialización y Validación de Token
  useEffect(() => {
    async function initApp() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('hash') || urlParams.get('legajo');

      // Si no se proporcionó token en URL, usamos el usuario demo para facilitar pruebas visuales
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

      // Cargar preguntas de la fase activa
      const loadedQuestions = await loadTriviaQuestions(activePhase, shuffleQuestions);
      setQuestions(loadedQuestions);
      setGameState('SPLASH');
    }

    initApp();
  }, [activePhase, shuffleQuestions]);

  // Manejo de sonido
  const handleToggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Iniciar Trivia
  const handleStartGame = () => {
    setGameState('PLAYING');
    setGameStartTime(Date.now());
  };

  // Registro de cada respuesta
  const handleAnswerSubmit = (answerData) => {
    if (answerData.isCorrect) {
      setUserScore(prev => prev + answerData.pointsEarned);
      setCorrectAnswersCount(prev => prev + 1);
    }
    setAnswersLog(prev => [...prev, answerData]);
  };

  // Finalizar Trivia y Guardar
  const handleFinishGame = async () => {
    const elapsedSeconds = gameStartTime ? Math.max(1, Math.round((Date.now() - gameStartTime) / 1000)) : 0;
    setTotalElapsedTime(elapsedSeconds);

    // Guardar fecha, hora y resultados
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
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-radial">
      {/* Fondo con detalles gráficos sutiles */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Header superior */}
      <Header
        activePhase={activePhase}
        score={userScore}
        questionIndex={answersLog.length}
        totalQuestions={questions.length}
        timeRemaining={null}
        showTimer={false}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        isGameActive={gameState === 'PLAYING'}
      />

      {/* Contenido Principal según el estado */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
        {gameState === 'LOADING' && (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-24 h-24 rounded-3xl p-3 bg-white/10 border border-white/20 shadow-2xl flex items-center justify-center animate-pulse-heart">
              <img src="/favicon.svg" alt="Cargando" className="w-16 h-16 object-contain" />
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-200">
              <RefreshCw size={16} className="animate-spin text-red-400" />
              <span>Preparando Trivia de Inocuidad...</span>
            </div>
          </div>
        )}

        {gameState === 'SPLASH' && (
          <SplashIntro
            user={currentUser}
            activePhase={activePhase}
            totalQuestions={questions.length}
            onStartGame={handleStartGame}
          />
        )}

        {gameState === 'PLAYING' && (
          <TriviaGame
            questions={questions}
            timePerQuestion={timePerQuestion}
            maxTotalTime={maxTotalTime}
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
            activePhase={activePhase}
          />
        )}

        {gameState === 'LOCKED' && (
          <PhaseLocked
            user={currentUser}
            activePhase={activePhase}
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
      <footer className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/10 z-20">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white/80">Don Yeyo S.A.</span>
          <span>&bull;</span>
          <span>Inocuidad 2026</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-1 text-blue-300 hover:text-white transition-colors cursor-pointer"
            title="Ver Enlaces de Participantes (RRHH)"
          >
            <KeyRound size={13} />
            <span className="hidden sm:inline">Enlaces RRHH</span>
          </button>
          <span>v1.0.0</span>
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
