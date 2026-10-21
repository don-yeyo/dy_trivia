import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchClassification, getStoredAdminToken } from './services/adminService';
import { calculateScore } from './utils/scoreCalculator';
import { RefreshCw } from 'lucide-react';

export default function App() {
  // Configuración dinámica gobernada por Google Sheets (Backend First)
  const [appConfig, setAppConfig] = useState(DEFAULT_CONFIG);

  // Selector de vista principal: GAME | ADMIN | PUBLIC_CLASSIFICATION | PROJECTION
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const token = getStoredAdminToken();

    // La vista de proyección es exclusiva del administrador autenticado
    if (params.get('proyeccion') === '1' || params.get('view') === 'proyeccion' || path === '/proyeccion') {
      return token ? 'PROJECTION' : 'ADMIN';
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
  const [currentUserToken, setCurrentUserToken] = useState('');
  const [questions, setQuestions] = useState([]);
  const [totalPhaseQuestionsCount, setTotalPhaseQuestionsCount] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [userRawPoints, setUserRawPoints] = useState(0);
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
      const token = getStoredAdminToken();

      if (params.get('proyeccion') === '1' || params.get('view') === 'proyeccion' || path === '/proyeccion') {
        setCurrentView(token ? 'PROJECTION' : 'ADMIN');
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

      // 🛡️ Comprobar si la clasificación ya fue publicada oficialmente para esta fase
      let isPublished = config.isClassificationPublished || false;
      try {
        const classCheck = await fetchClassification(config.activePhase);
        if (classCheck && classCheck.isPublished) {
          isPublished = true;
          config.isClassificationPublished = true;
          setAppConfig({ ...config, isClassificationPublished: true });
        }
      } catch (e) {}

      // 🛡️ Si la fase activa está marcada como cerrada o ya fue publicada la clasificación
      if (config.isPhaseClosed || isPublished) {
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
      setCurrentUserToken(effectiveToken || '');

      // El progreso ya viene verificado desde el backend seguro
      const progress = validation.progress || { hasRecord: false, answers: [] };

      // 3. Cargar pregunta activa de la fase con token de usuario (Zero-Trust individual)
      const questionsData = await loadTriviaQuestions(config.activePhase, config.shuffleQuestions, effectiveToken);

      // Si ya completó la fase
      if (questionsData && questionsData.isPhaseCompleted) {
        setPlayedDate(progress.fechaHora || new Date().toISOString());
        setGameState('LOCKED');
        return;
      }

      // Si el servidor entregó la pregunta actual individual con su questionToken
      if (questionsData && questionsData.question) {
        setTotalPhaseQuestionsCount(questionsData.totalQuestions || 10);
        setQuestions([{
          ...questionsData.question,
          questionToken: questionsData.questionToken
        }]);

        const currentRawPoints = progress.rawPoints || progress.correctCount || 0;
        const currentTotalTime = progress.totalTime || 0;
        setUserRawPoints(currentRawPoints);
        setTotalElapsedTime(currentTotalTime);
        setUserScore(progress.score || calculateScore(currentRawPoints, currentTotalTime));
        setCorrectAnswersCount(progress.correctCount || 0);
        setAnswersLog(progress.answers || []);
        setGameState('SPLASH');
      } else if (Array.isArray(questionsData) && questionsData.length > 0) {
        // Fallback para modo array completo (admin o desarrollo)
        setTotalPhaseQuestionsCount(questionsData.length);
        const answeredIds = (progress.answers || []).map(a => a.questionId);
        const pendingQuestions = questionsData.filter(q => !answeredIds.includes(q.id));

        if (pendingQuestions.length === 0) {
          setPlayedDate(progress.fechaHora || new Date().toISOString());
          setGameState('LOCKED');
          return;
        }

        setQuestions(pendingQuestions);
        const currentRawPoints = progress.rawPoints || progress.correctCount || 0;
        const currentTotalTime = progress.totalTime || 0;
        setUserRawPoints(currentRawPoints);
        setTotalElapsedTime(currentTotalTime);
        setUserScore(progress.score || calculateScore(currentRawPoints, currentTotalTime));
        setCorrectAnswersCount(progress.correctCount || 0);
        setAnswersLog(progress.answers || []);
        setGameState('SPLASH');
      } else {
        setQuestions([]);
        setUserScore(0);
        setUserRawPoints(0);
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
      const loaded = await loadTriviaQuestions(appConfig.activePhase, appConfig.shuffleQuestions, currentUserToken);
      if (loaded?.question) {
        setQuestions([{ ...loaded.question, questionToken: loaded.questionToken }]);
        setTotalPhaseQuestionsCount(loaded.totalQuestions || 10);
      } else if (Array.isArray(loaded)) {
        setQuestions(loaded);
        setTotalPhaseQuestionsCount(loaded.length);
      }
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
  const handleAnswerSubmit = useCallback(async (answerData) => {
    const declaredTime = answerData.timeSpent || 0;
    let updatedTotalTime = 0;
    setTotalElapsedTime(prev => {
      updatedTotalTime = prev + declaredTime;
      return updatedTotalTime;
    });
    setAnswersLog(prev => [...prev, answerData]);

    if (currentUser?.legajo) {
      const serverResult = await recordPhaseQuestionAnswer(
        currentUser.legajo,
        appConfig.activePhase,
        answerData,
        answerData.questionToken,
        currentUserToken
      );

      // Sincronizar tiempo real medido en servidor si difiere
      const realTime = serverResult?.timeSpent ?? declaredTime;
      if (serverResult?.serverVerified && realTime !== declaredTime) {
        setTotalElapsedTime(prev => prev - declaredTime + realTime);
        updatedTotalTime = updatedTotalTime - declaredTime + realTime;
      }

      if (serverResult && serverResult.isCorrect) {
        setCorrectAnswersCount(prev => prev + 1);
        setUserRawPoints(prevPoints => {
          const newPoints = prevPoints + (serverResult.pointsEarned || 1);
          setUserScore(calculateScore(newPoints, updatedTotalTime));
          return newPoints;
        });
      } else {
        setUserRawPoints(prevPoints => {
          setUserScore(calculateScore(prevPoints, updatedTotalTime));
          return prevPoints;
        });
      }

      // 🛡️ Si el servidor entregó la siguiente pregunta en el payload (Zero-Latency):
      if (serverResult?.nextQuestion) {
        setQuestions(prev => {
          const already = prev.some(q => q.id === serverResult.nextQuestion.id);
          if (!already) {
            return [...prev, serverResult.nextQuestion];
          }
          return prev;
        });
      }

      return serverResult;
    }

    return {
      success: true,
      isFinished: false,
      nextQuestion: null
    };
  }, [currentUser?.legajo, appConfig.activePhase, currentUserToken]);

  // 🛡️ Mecanismo Antitrampa: Asentar en el servidor el inicio de la pregunta
  const handleQuestionStart = useCallback(async (questionId) => {
    if (currentUser?.legajo) {
      await markQuestionStarted(currentUser.legajo, appConfig.activePhase, questionId);
    }
  }, [currentUser?.legajo, appConfig.activePhase]);

  const handleResetSession = async () => {
    setUserScore(0);
    setUserRawPoints(0);
    setCorrectAnswersCount(0);
    setAnswersLog([]);
    setPlayedDate(null);
    setGameSessionId(Date.now());

    const loadedQuestions = await loadTriviaQuestions(appConfig.activePhase, appConfig.shuffleQuestions);
    setQuestions(loadedQuestions);
    setGameState('SPLASH');
  };

  const handleFinishGame = useCallback(async () => {
    setGameState('FINISHED');
  }, []);

  // Determina si el jugador se encuentra activamente jugando
  const isGameActive = currentView === 'GAME' && (gameState === 'PLAYING' || gameState === 'COUNTDOWN');

  // Si está en modo PROYECCIÓN: Pantalla completa cinematográfica 100% limpia para proyector (exclusivo admin)
  if (currentView === 'PROJECTION') {
    const adminToken = getStoredAdminToken();
    if (!adminToken) {
      // Redirigir a login de administración si no está autenticado
      return (
        <div className="app-layout relative overflow-hidden">
          <SunburstBackground screenKey="ADMIN" />
          <Header />
          <main className="app-main app-main--wide">
            <AdminClassificationView
              appConfig={appConfig}
              onBackToGame={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('admin');
                url.searchParams.delete('view');
                url.searchParams.delete('proyeccion');
                window.history.pushState({}, '', url.toString());
                setCurrentView('GAME');
              }}
            />
          </main>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen w-full overflow-hidden text-white font-sans selection:bg-red-500 selection:text-white">
        <SunburstBackground screenKey="PROJECTION" />
        <ProjectionView
          appConfig={appConfig}
          onOpenConfig={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'admin');
            url.searchParams.delete('proyeccion');
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

      {/* Header superior limpio */}
      <Header />

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
                pendingQuestionsCount={Math.max(1, (totalPhaseQuestionsCount || questions.length) - (answersLog ? answersLog.length : 0))}
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
                totalQuestionsCount={totalPhaseQuestionsCount}
                initialQuestionIndex={answersLog.length}
                timePerQuestion={appConfig.timePerQuestion}
                userLegajo={currentUser?.legajo}
                userToken={currentUserToken}
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
                isClassificationPublished={appConfig.isClassificationPublished}
                phaseNumber={appConfig.activePhase}
                allowReset={import.meta.env.VITE_ALLOW_SESSION_RESET === 'true'}
                onResetSession={handleResetSession}
                onViewClassification={() => setCurrentView('PUBLIC_CLASSIFICATION')}
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
