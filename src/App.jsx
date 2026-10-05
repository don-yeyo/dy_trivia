import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SplashIntro from './components/SplashIntro';
import CountdownIntro from './components/CountdownIntro';
import TriviaGame from './components/TriviaGame';
import GameOver from './components/GameOver';
import PhaseLocked from './components/PhaseLocked';
import SunburstBackground from './components/SunburstBackground';
import AdminClassificationView from './components/AdminClassificationView';
import PublicClassificationView from './components/PublicClassificationView';
import ProjectionView from './components/ProjectionView';
import { validateUserToken, recordPhaseQuestionAnswer, markQuestionStarted } from './services/authService';
import { loadTriviaQuestions } from './services/triviaService';
import { fetchUserProgressFromResults } from './services/googleSheetsService';
import { fetchAppConfig, DEFAULT_CONFIG } from './services/configService';
import { RefreshCw } from 'lucide-react';

export default function App() {
  // Configuración dinámica gobernada por Google Sheets (Backend First)
  const [appConfig, setAppConfig] = useState(DEFAULT_CONFIG);

  // Selector de vista principal: GAME | ADMIN | PUBLIC_CLASSIFICATION | PROJECTION
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    if (params.get('proyeccion') === '1' || params.get('view') === 'proyeccion' || path === '/proyeccion') {
      return 'PROJECTION';
    }
    if (params.get('admin') === '1' || params.get('admin') === 'true' || params.get('view') === 'admin' || path === '/admin') {
      return 'ADMIN';
    }
    if (params.get('clasificacion') === '1' || params.get('view') === 'clasificacion' || params.get('ranking') === '1' || path === '/clasificacion') {
      return 'PUBLIC_CLASSIFICATION';
    }
    return 'GAME';
  });

  const [gameState, setGameState] = useState('LOADING'); // LOADING | SPLASH | COUNTDOWN | PLAYING | FINISHED | LOCKED | PHASE_CLOSED | INVALID_TOKEN
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

  // Sincronizar cambios en la barra de URL o historial
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      if (params.get('proyeccion') === '1' || params.get('view') === 'proyeccion' || path === '/proyeccion') {
        setCurrentView('PROJECTION');
      } else if (params.get('admin') === '1' || params.get('admin') === 'true' || params.get('view') === 'admin' || path === '/admin') {
        setCurrentView('ADMIN');
      } else if (params.get('clasificacion') === '1' || params.get('view') === 'clasificacion' || params.get('ranking') === '1' || path === '/clasificacion') {
        setCurrentView('PUBLIC_CLASSIFICATION');
      } else {
        setCurrentView('GAME');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    async function initApp() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('hash') || urlParams.get('legajo');
      const allowSessionReset = import.meta.env.VITE_ALLOW_SESSION_RESET === 'true';
      const effectiveToken = token || (allowSessionReset ? 'demo' : null);

      // 1. Cargar la configuración autorizada desde la pestaña 'Configuracion' de Google Sheets
      const config = await fetchAppConfig();
      setAppConfig(config);

      // 🛡️ Si la fase activa está marcada como cerrada en Google Sheets
      if (config.isPhaseClosed) {
        if (effectiveToken) {
          const quickVal = await validateUserToken(effectiveToken, config.activePhase);
          if (quickVal.isValid) setCurrentUser(quickVal.user);
        }
        setGameState('PHASE_CLOSED');
        return;
      }

      // 2. Validar token del colaborador
      const validation = await validateUserToken(effectiveToken, config.activePhase);

      if (!validation.isValid) {
        setGameState('INVALID_TOKEN');
        return;
      }

      setCurrentUser(validation.user);

      // 3. Cargar todas las preguntas sanitizadas de la fase activa
      const allPhaseQuestions = await loadTriviaQuestions(config.activePhase, config.shuffleQuestions);
      setTotalPhaseQuestionsCount(allPhaseQuestions.length);

      // El progreso ya viene verificado desde el backend seguro
      const progress = validation.progress || { hasRecord: false, answers: [] };

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
  }, []);

  // Al presionar Comenzar, iniciar cuenta regresiva
  const handleTriggerCountdown = async () => {
    if (!questions || questions.length === 0) {
      const loaded = await loadTriviaQuestions(appConfig.activePhase, appConfig.shuffleQuestions);
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

  // Tras responder cada pregunta individual, enviar al backend para evaluación segura
  const handleAnswerSubmit = async (answerData) => {
    const timeSpent = answerData.timeSpent || 0;
    setTotalElapsedTime(prev => prev + timeSpent);
    setAnswersLog(prev => [...prev, answerData]);

    if (currentUser?.legajo) {
      const serverResult = await recordPhaseQuestionAnswer(currentUser.legajo, appConfig.activePhase, answerData);
      if (serverResult && serverResult.isCorrect) {
        setUserScore(prev => prev + (serverResult.pointsEarned || 0));
        setCorrectAnswersCount(prev => prev + 1);
      }
    }
  };

  // 🛡️ Mecanismo Antitrampa: Asentar en el servidor el inicio de la pregunta
  const handleQuestionStart = async (questionId) => {
    if (currentUser?.legajo) {
      await markQuestionStarted(currentUser.legajo, appConfig.activePhase, questionId);
    }
  };

  const handleResetSession = async () => {
    setUserScore(0);
    setCorrectAnswersCount(0);
    setAnswersLog([]);
    setPlayedDate(null);
    setGameSessionId(Date.now());

    const loadedQuestions = await loadTriviaQuestions(appConfig.activePhase, appConfig.shuffleQuestions);
    setQuestions(loadedQuestions);
    setGameState('SPLASH');
  };

  const handleFinishGame = async () => {
    setGameState('FINISHED');
  };

  // Si está en modo PROYECCIÓN: Pantalla completa cinematográfica 100% limpia para proyector
  if (currentView === 'PROJECTION') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden text-white font-sans selection:bg-red-500 selection:text-white">
        <SunburstBackground screenKey="PROJECTION" />
        <ProjectionView
          appConfig={appConfig}
          onOpenConfig={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'admin');
            window.history.pushState({}, '', url.toString());
            setCurrentView('ADMIN');
          }}
          onBackToGame={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('proyeccion');
            url.searchParams.delete('view');
            window.history.pushState({}, '', url.toString());
            setCurrentView('GAME');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-layout relative overflow-hidden">
      {/* Fondo de rayos rectos giratorios reactivo en todas las pantallas */}
      <SunburstBackground screenKey={currentView === 'GAME' ? gameState : currentView} />

      {/* Header superior con botones de navegación */}
      <Header
        currentView={currentView}
        onOpenClassification={() => setCurrentView('PUBLIC_CLASSIFICATION')}
      />

      {/* Contenido Principal según Vista Activa */}
      <main className={`app-main ${currentView !== 'GAME' ? 'app-main--wide' : ''}`}>
        {/* ================================================================= */}
        {/* VISTA 1: PANEL DE ADMINISTRACIÓN                                   */}
        {/* ================================================================= */}
        {currentView === 'ADMIN' && (
          <AdminClassificationView
            appConfig={appConfig}
            onBackToGame={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('admin');
              url.searchParams.delete('view');
              window.history.pushState({}, '', url.toString());
              setCurrentView('GAME');
            }}
          />
        )}

        {/* ================================================================= */}
        {/* VISTA 2: CLASIFICACIÓN PÚBLICA Y PODIO                             */}
        {/* ================================================================= */}
        {currentView === 'PUBLIC_CLASSIFICATION' && (
          <PublicClassificationView
            appConfig={appConfig}
            onBackToGame={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('clasificacion');
              url.searchParams.delete('ranking');
              url.searchParams.delete('view');
              window.history.pushState({}, '', url.toString());
              setCurrentView('GAME');
            }}
          />
        )}

        {/* ================================================================= */}
        {/* VISTA 3: TRIVIA / JUEGO TRADICIONAL                                */}
        {/* ================================================================= */}
        {currentView === 'GAME' && (
          <>
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
                timePerQuestion={appConfig.timePerQuestion}
                userLegajo={currentUser?.legajo}
                activePhase={appConfig.activePhase}
                onFinishGame={handleFinishGame}
                onAnswerSubmit={handleAnswerSubmit}
                onQuestionStart={handleQuestionStart}
              />
            )}

            {gameState === 'FINISHED' && (
              <GameOver
                user={currentUser}
                totalQuestions={totalPhaseQuestionsCount || questions.length}
                answeredQuestions={answersLog.filter(a => a.selectedOptionId !== null && a.selectedOptionId !== undefined).length}
                totalTime={totalElapsedTime}
                hideAnswered={appConfig.hideSummaryAnswered}
                hideTime={appConfig.hideSummaryTime}
                onViewClassification={() => setCurrentView('PUBLIC_CLASSIFICATION')}
              />
            )}

            {(gameState === 'LOCKED' || gameState === 'PHASE_CLOSED') && (
              <PhaseLocked
                user={currentUser}
                playedDate={playedDate}
                isTokenInvalid={false}
                isPhaseClosed={gameState === 'PHASE_CLOSED'}
                phaseNumber={appConfig.activePhase}
                allowReset={import.meta.env.VITE_ALLOW_SESSION_RESET === 'true'}
                onResetSession={handleResetSession}
              />
            )}

            {gameState === 'INVALID_TOKEN' && (
              <PhaseLocked
                isTokenInvalid={true}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
