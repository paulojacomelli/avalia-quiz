import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { 
  GeneratedQuiz, QuizConfig, Team, HintType, ApiErrorDetail,
  TUTORIAL_CONFIG, TUTORIAL_DATA, GLOSAS_VALIDADAS
} from '@avalia/core';
import { 
  playSound, speakText, stopSpeech, db
} from '@avalia/services';
import { 
  CookieBanner, PrivacyPolicyModal, ReadyCheck,
  SetupForm, QuizCard, LoginScreen,
  TourOverlay, TourStep,
  SettingsMenu, ThemeMode,
  VLibras, VLibrasTest
} from '@avalia/design-system';
import { doc, getDoc } from 'firebase/firestore';

// Hooks Customizados
import { useGameSettings } from './hooks/useGameSettings';
import { useGameShortcuts } from './hooks/useGameShortcuts';
import { useNarration } from './hooks/useNarration';
import { useSignLanguage } from './hooks/useSignLanguage';
import { useGameLoop } from './hooks/useGameLoop';

interface GameEngineProps {
  appConfig?: any;
  defaultLanguage?: 'pt' | 'libras';
  title?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="setup"]', content: "Aqui você configura o seu quiz." },
  { target: '[data-tour="tts"]', content: "Ative a narração para uma experiência mais acessível." }
];

export default function GameEngine({ appConfig, defaultLanguage = 'pt', title }: GameEngineProps) {
  if (window.location.pathname === '/vlibras') {
    return <VLibrasTest />;
  }

  // --- App Identity ---
  const appName: string = appConfig?.appName ?? 'Avalia Quiz';
  const storagePrefix: string = appConfig?.storagePrefix ?? 'quiz';
  const primaryColor: string = appConfig?.theme?.primaryColor ?? '#4287f5';

  const { isAuthenticated, apiKey, clientId, provider, login, logout } = useAuth();
  
  const [setupStep, setSetupStep] = useState(1);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  // --- 1. Hook de Configurações ---
  const settings = useGameSettings({
    storagePrefix,
    onInactivityTimeout: () => {
      game.setGameState('START_SCREEN');
      game.setQuizData(null);
      game.setQuizConfig(null);
    }
  });

  // --- 2. Hook de Narração ---
  const [usedTopics, setUsedTopics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}-used-keywords`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const game = useGameLoop({
    storagePrefix,
    appName,
    apiKey,
    clientId,
    provider: provider || undefined,
    ttsEnabled: false, // Inicialmente falso, atualizado pelo hook reativo
    ttsConfig: {} as any, 
    usedTopics,
    setUsedTopics,
    stopSpeech,
    speakText,
    logout
  });

  // Hook de Narração Reativo
  const narration = useNarration({
    storagePrefix,
    provider: provider || undefined,
    apiKey,
    gameState: game.gameState,
    quizData: game.quizData,
    quizConfig: game.quizConfig,
    currentQuestionIndex: game.currentQuestionIndex,
    teams: game.teams,
    currentTeamIndex: game.currentTeamIndex,
    isCurrentQuestionAnswered: game.isCurrentQuestionAnswered,
    isSkipping: game.isSkipping,
    cooldownTime: game.cooldownTime
  });

  // --- 3. Hook de Libras ---
  const [isLibrasReady, setIsLibrasReady] = useState(false);
  const libras = useSignLanguage({
    interfaceLanguage: game.interfaceLanguage,
    isLibrasReady,
    gameState: game.gameState,
    setupStep,
    quizData: game.quizData,
    currentQuestionIndex: game.currentQuestionIndex,
    countdownValue: game.countdownValue,
    onReadyChange: setIsLibrasReady
  });

  // --- 4. Hook de Atalhos ---
  useGameShortcuts({
    gameState: game.gameState,
    isCurrentQuestionAnswered: game.isCurrentQuestionAnswered,
    isReviewing: game.isReviewing,
    reviewIndex: game.reviewIndex,
    totalQuestions: game.quizData?.questions.length || 0,
    cooldownTime: game.cooldownTime,
    hasError: !!game.errorDetail,
    hasPendingAction: !!game.pendingAction,
    onConfirmStart: game.handleConfirmStart,
    onNextQuestion: game.handleNextQuestion,
    onNextRound: game.handleNextRound,
    onReviewNext: () => game.setReviewIndex(prev => prev + 1),
    playSound
  });

  // --- Helper UI ---
  const getTimerStyles = () => {
    if (game.isCurrentQuestionAnswered && !game.isReviewing) return 'bg-brand-hover text-gray-400';
    const percentage = (game.timeLeft / game.timeLimit) * 100;
    if (percentage > 50) return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]';
    if (percentage > 20) return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse';
    return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-bounce';
  };

  // Unity Log Silencer
  useEffect(() => {
    const originalLog = window.console.log;
    const silentPatterns = ['[UnityCache]', 'Initialize engine version', 'Creating WebGL 2.0 context'];
    window.console.log = (...args: any[]) => {
      if (typeof args[0] === 'string' && silentPatterns.some(p => args[0].includes(p))) return;
      originalLog.apply(console, args);
    };
    return () => { window.console.log = originalLog; };
  }, []);

  // --- Renderização ---

  if (!isAuthenticated && !game.isPrebuiltQuiz) {
    return (
      <>
        <LoginScreen
          title={title}
          logo={appConfig?.customLogo}
          onPlayPrebuilt={game.handlePlayPrebuilt}
          isLoading={game.loading}
          loadingMessage={game.loadingMessage}
          apiError={game.errorDetail}
          onClearError={() => game.setErrorDetail(null)}
          onLoginWithCode={async (code, selectedProvider) => {
            const docSnap = await getDoc(doc(db, "auth", "config"));
            if (docSnap.exists() && docSnap.data().secret_code === code) {
              const data = docSnap.data();
              const adminKey = data[`admin_key_${selectedProvider.replace('-', '_')}`] || data.admin_key;
              if (adminKey) login(adminKey, selectedProvider);
              else throw new Error("Chave não configurada.");
            } else throw new Error("Código incorreto.");
          }}
          onLoginWithApiKey={login}
        />
        <CookieBanner onOpenPrivacy={() => setIsPrivacyPolicyOpen(true)} />
        <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} appName={appName} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] font-sans text-brand-text overflow-hidden">
      {game.gameState === 'START_SCREEN' ? (
        <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1a1a1a] w-full max-w-md p-10 md:p-12 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[var(--accent-primary,#4287f5)] shadow-[0_0_15px_var(--accent-primary,rgba(66,135,245,0.5))]"></div>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 relative border border-white/5" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary, #4287f5) 10%, transparent)' }}>
              <div className="absolute inset-0 rounded-full blur-xl opacity-20" style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}></div>
              <div className="relative w-14 h-14 rounded-full border flex items-center justify-center text-[var(--accent-primary, #4287f5)] [&_svg]:w-10 [&_svg]:h-10 transition-all duration-500" style={{ borderColor: 'color-mix(in srgb, var(--accent-primary, #4287f5) 40%, transparent)' }}>
                {appConfig?.customLogo || (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                  </svg>
                )}
              </div>
            </div>
            {title || (
              <h1 className="text-3xl font-black text-white text-center mb-1">
                {appName.replace(/ia/i, '')}<span className="text-[#F7D33C]">ia</span> {appName.split(' ').slice(1).join(' ')}
              </h1>
            )}
            <p className="text-sm text-gray-400 mb-10">Selecione o idioma para começar.</p>
            
            <div className="w-full bg-black/40 p-2 rounded-3xl flex gap-3 mb-8 border border-white/5">
              <button onClick={() => game.setInterfaceLanguage('pt')} className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold ${game.interfaceLanguage === 'pt' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600'}`}>
                <img src="/brazil.svg" alt="Brasil" className="w-8 h-6 object-contain" />
                <span>Português</span>
              </button>
              <button onClick={() => game.setInterfaceLanguage('libras')} className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold ${game.interfaceLanguage === 'libras' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600'}`}>
                <img src="/libras.svg" alt="Libras" className="w-6 h-6 object-contain" />
                <span>Libras</span>
              </button>
            </div>

            <button onClick={() => game.setGameState('SETUP')} className="w-full bg-brand-blue text-white font-bold py-4 rounded-xl shadow-xl shadow-brand-blue/20">Iniciar</button>
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col font-sans bg-brand-dark text-brand-text overflow-hidden" style={{ zoom: settings.zoomLevel }}>
          <header className="bg-brand-blue text-white h-16 shrink-0 flex items-center shadow-lg z-20">
            <div className="container mx-auto px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-base font-semibold truncate">
                  {appConfig?.appTitle || appName}
                </h1>
                {game.isTutorialMode && <span className="bg-emerald-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Tutorial</span>}
              </div>
              <SettingsMenu
                open={settings.isSettingsOpen}
                onToggle={() => settings.setIsSettingsOpen(!settings.isSettingsOpen)}
                onClose={() => settings.setIsSettingsOpen(false)}
                soundEnabled={settings.soundEnabled}
                onToggleSound={settings.toggleSound}
                theme={settings.theme}
                onThemeChange={settings.setTheme}
                ttsMode={narration.ttsEnabled ? 'gemini' : 'off'}
                onTtsChange={narration.handleTTSSelection}
                zoomValue={settings.zoomLevel}
                onZoomIn={() => settings.setZoomLevel(z => Math.min(1.5, z + 0.05))}
                onZoomOut={() => settings.setZoomLevel(z => Math.max(0.75, z - 0.05))}
                isFullscreen={settings.isFullscreen}
                onToggleFullscreen={settings.toggleFullscreen}
                onGoHome={game.executeReset}
                onLogout={() => game.setPendingAction('LOGOUT')}
                interfaceLanguage={game.interfaceLanguage}
                onLanguageChange={game.setInterfaceLanguage}
              />
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {game.interfaceLanguage === 'libras' && (
              <div className="w-full lg:w-1/3 h-[250px] lg:h-full bg-[#05050a] relative border-b lg:border-r border-brand-blue/20 shrink-0">
                <VLibras ref={libras.vlibrasRef} active={true} onReady={() => setIsLibrasReady(true)} />
                {isLibrasReady && (
                  <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-30">
                    <button onClick={() => {
                      const speeds = [0.5, 0.75, 1, 1.25, 1.5];
                      const next = speeds[(speeds.indexOf(libras.vlibrasSpeed) + 1) % speeds.length];
                      libras.setVlibrasSpeed(next);
                      libras.vlibrasRef.current?.setSpeed?.(next);
                    }} className="p-2.5 rounded-full bg-black/60 text-white border border-white/10 text-xs font-bold w-10 h-10 flex items-center justify-center">{libras.vlibrasSpeed}x</button>
                    <button onClick={() => libras.vlibrasRef.current?.repeat?.()} className="p-2.5 rounded-full bg-black/60 text-white border border-white/10 w-10 h-10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
              {game.loading && (
                <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col items-center justify-center animate-fade-in px-4">
                  <div className="w-16 h-16 border-4 border-gray-800 border-t-brand-blue rounded-full animate-spin mb-6"></div>
                  <h2 className="text-2xl font-bold text-gray-300 mb-2">Processando...</h2>
                  <p className="text-gray-400 italic opacity-80">"{game.loadingMessage}"</p>
                </div>
              )}

              {game.pendingAction && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-brand-card max-w-sm w-full rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold mb-2">Confirmar Ação</h3>
                    <p className="text-sm opacity-70 mb-6">Deseja realmente realizar esta ação?</p>
                    <div className="flex gap-3">
                      <button onClick={() => game.setPendingAction(null)} className="flex-1 py-3 bg-brand-hover rounded-lg">Cancelar</button>
                      <button onClick={() => {
                        if (game.pendingAction === 'LOGOUT') logout();
                        else if (game.pendingAction === 'RESET') game.executeReset();
                        else if (game.pendingAction === 'CLEAR_HISTORY') { setUsedTopics([]); localStorage.removeItem(`${storagePrefix}-used-keywords`); }
                        game.setPendingAction(null);
                      }} className="flex-1 py-3 bg-brand-blue text-white rounded-lg font-bold">Confirmar</button>
                    </div>
                  </div>
                </div>
              )}

              {game.gameState === 'SETUP' && (
                <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl flex flex-col items-center">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Configurar Quiz</h2>
                    <p className="text-gray-400">Personalize seu desafio abaixo.</p>
                  </div>
                  <SetupForm appConfig={appConfig} onGenerate={game.handleGenerate} isLoading={game.loading} ttsEnabled={narration.ttsEnabled}
                    forcedStep={setupStep} onStepChange={setSetupStep}
                    usedTopics={usedTopics} onClearHistory={() => game.setPendingAction('CLEAR_HISTORY')}
                    isPrebuiltQuiz={game.isPrebuiltQuiz} availableThemes={game.availableThemes} onPlayGlosa={libras.playGlosaSegura} />
                </main>
              )}

              {game.gameState === 'READY_CHECK' && (
                <ReadyCheck isVisible={true} title={game.quizData?.title || ''} onConfirm={game.handleConfirmStart} onDiscard={game.executeReset} apiKey={apiKey} />
              )}

              {game.gameState === 'COUNTDOWN' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white" style={{ backgroundColor: game.teams[game.currentTeamIndex]?.color }}>
                  <div className="text-[12rem] font-black animate-ping absolute opacity-20">{game.countdownValue > 0 ? game.countdownValue : 'JÁ!'}</div>
                  <div className="text-[10rem] font-black relative z-10">{game.countdownValue > 0 ? game.countdownValue : 'JÁ!'}</div>
                </div>
              )}

              {game.gameState === 'PLAYING' && game.quizData && (
                <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center mb-6 bg-black/20 p-4 rounded-xl">
                    <div className="flex gap-4">
                      {game.teams.map((t, idx) => (
                        <div key={t.id} className={`px-4 py-1 rounded-full border-2 transition-all ${idx === game.currentTeamIndex ? 'text-white font-bold' : 'opacity-40'}`} style={{ backgroundColor: idx === game.currentTeamIndex ? t.color : 'transparent', borderColor: t.color }}>
                          {t.name}: {t.score}
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-sm">Pergunta {game.currentQuestionIndex + 1}/{game.quizData.questions.length}</div>
                  </div>

                  <QuizCard question={game.quizData.questions[game.currentQuestionIndex]} index={game.currentQuestionIndex} total={game.quizData.questions.length}
                    timeLeft={game.timeLeft} onAnswer={game.handleAnswer} isTimeUp={game.timeLeft === 0}
                    hintsRemaining={game.hintsRemaining} onRevealHint={game.handleUseHint}
                    activeTeamName={game.teams[game.currentTeamIndex]?.name} activeTeamColor={game.teams[game.currentTeamIndex]?.color}
                    onVoid={() => game.handleReplaceQuestion(game.currentQuestionIndex)}
                    ttsConfig={narration.ttsConfig} onSkip={game.handleSkipQuestion} isSkipping={game.isSkipping} apiKey={apiKey}
                    interfaceLanguage={game.interfaceLanguage} />
                </main>
              )}

              {game.gameState === 'ROUND_SUMMARY' && (
                <main className="flex-1 flex items-center justify-center p-6">
                  <div className="bg-brand-card p-10 rounded-3xl shadow-2xl border border-gray-700 text-center max-w-lg w-full">
                    <h2 className="text-3xl font-bold mb-8">Fim da Rodada {game.currentRound}</h2>
                    <div className="space-y-4 mb-10">
                      {game.teams.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border-l-4" style={{ borderLeftColor: t.color }}>
                          <span className="font-bold">{t.name}</span>
                          <span className="text-2xl font-black">{t.score}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={game.handleNextRound} className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg">Próxima Rodada</button>
                  </div>
                </main>
              )}

              {game.gameState === 'FINISHED' && game.quizData && (
                <main className="flex-1 container mx-auto px-4 py-10 flex flex-col items-center">
                  <h2 className="text-4xl font-black mb-10 text-white">Partida Finalizada!</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
                    {game.teams.map(t => (
                      <div key={t.id} className="bg-brand-card p-8 rounded-3xl border-b-8 shadow-2xl" style={{ borderBottomColor: t.color }}>
                        <div className="text-sm font-bold opacity-50 uppercase mb-2">{t.name}</div>
                        <div className="text-6xl font-black mb-4">{t.score}</div>
                        <div className="flex gap-4 text-sm font-medium">
                          <span className="text-emerald-400">Acertos: {t.correctCount}</span>
                          <span className="text-red-400">Erros: {t.wrongCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center">
                    <button onClick={() => game.setIsReviewing(true)} className="px-8 py-4 bg-brand-hover rounded-2xl font-bold transition-colors hover:bg-white/10">Revisar Respostas</button>
                    <button onClick={game.handleConfirmStart} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-500 transition-all active:scale-95">Jogar Novamente</button>
                    <button onClick={game.executeReset} className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95">Menu Inicial</button>
                  </div>

                  {game.isReviewing && (
                    <div className="fixed inset-0 z-[80] bg-[#0a0a0a] p-4 md:p-10 flex flex-col animate-fade-in">
                      <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold">Revisão: Pergunta {game.reviewIndex + 1}</h2>
                        <button onClick={() => game.setIsReviewing(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <QuizCard question={game.quizData.questions[game.reviewIndex]} index={game.reviewIndex} total={game.quizData.questions.length}
                          showAnswerKey={true} forceSelectedOption={typeof game.userAnswers[game.reviewIndex] === 'number' ? game.userAnswers[game.reviewIndex] as number : null}
                          ttsConfig={narration.ttsConfig} apiKey={apiKey} interfaceLanguage={game.interfaceLanguage} />
                      </div>
                      <div className="flex justify-between mt-8 pb-4">
                        <button onClick={() => game.setReviewIndex(i => Math.max(0, i - 1))} disabled={game.reviewIndex === 0} className="px-8 py-3 bg-brand-hover rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors">Anterior</button>
                        <button onClick={() => game.setReviewIndex(i => Math.min(game.quizData!.questions.length - 1, i + 1))} disabled={game.reviewIndex === game.quizData.questions.length - 1} className="px-8 py-3 bg-brand-hover rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors">Próxima</button>
                      </div>
                    </div>
                  )}
                </main>
              )}

              {/* FOOTER */}
              <footer className="w-full shrink-0 py-6 text-center text-[10px] opacity-40 hover:opacity-100 transition-opacity flex flex-col gap-1 pb-24 md:pb-12 border-t border-white/5 font-sans mt-auto">
                <button onClick={() => game.setPendingAction('LOGOUT')} className="hover:text-red-400 underline transition-colors">Alterar Chave API / Sair</button>
                <div className="flex flex-col gap-0.5">
                  <span>Versão: 1.4.0-beta</span>
                  <span>Copyright © Paulo Jacomelli 2026</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer / Floating Next */}
      {game.gameState === 'PLAYING' && game.isCurrentQuestionAnswered && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in-up">
          <button onClick={game.handleNextQuestion} className="bg-brand-blue text-white font-bold py-4 px-10 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
            Avançar
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </button>
        </div>
      )}

      <CookieBanner onOpenPrivacy={() => setIsPrivacyPolicyOpen(true)} />
      <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} appName={appName} />
      <TourOverlay steps={TOUR_STEPS} isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} onComplete={() => { setIsGuideOpen(false); game.handleStartTutorial(); }} />
      
      {/* Floating Timer */}
      {game.quizConfig?.enableTimer && game.gameState === 'PLAYING' && (
        <div className={`fixed top-24 right-6 px-5 py-2 rounded-full font-bold shadow-xl z-40 flex items-center gap-2 ${getTimerStyles()}`}>
          <span className="font-mono text-xl">{game.timeLeft}s</span>
        </div>
      )}
    </div>
  );
}
