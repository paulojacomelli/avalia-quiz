import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { 
  GeneratedQuiz, QuizConfig, Team, HintType, ApiErrorDetail,
  TUTORIAL_CONFIG, TUTORIAL_DATA, GLOSAS_VALIDADAS, AiProvider
} from '@avalia/core';
import { 
  playSound, speakText, stopSpeech, db, resolveAiModelLabel, validateApiKey, resolveAutoConnection, logTelemetryEvent, getClientId,
  checkAccessCodeLock, registerFailedCodeAttempt, resetFailedCodeAttempts
} from '@avalia/services';
import { 
  Translate, HandsClapping, SpeakerHigh, SpeakerSlash, House, CornersOut
} from '@phosphor-icons/react';
import { 
  CookieBanner, PrivacyPolicyModal, ReadyCheck,
  SetupForm, QuizCard, LoginScreen,
  TourOverlay, TourStep,
  SettingsMenu, ThemeMode,
  VLibras, VLibrasTest, AdminDashboard,
  AppLogo, renderFormattedAppTitle
} from '@avalia/design-system';
import { doc, getDoc } from 'firebase/firestore';

// Hooks Customizados
import { useGameSettings } from './hooks/useGameSettings';
import { useGameShortcuts } from './hooks/useGameShortcuts';
import { useNarration, getInitialTTSState } from './hooks/useNarration';
import { useSignLanguage } from './hooks/useSignLanguage';
import { useGameLoop } from './hooks/useGameLoop';

interface GameEngineProps {
  appConfig?: QuizConfig;
}

const TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="setup"]', content: "Aqui você configura o seu quiz." },
  { target: '[data-tour="tts"]', content: "Ative a narração para uma experiência mais acessível." }
];

export default function GameEngine({ appConfig }: GameEngineProps) {
  const isRestrictPath = typeof window !== 'undefined' && (
    window.location.pathname.includes('/restrict') || 
    window.location.hash.includes('/restrict') ||
    window.location.search.includes('route=restrict')
  );

  const [showAdmin, setShowAdmin] = useState(isRestrictPath);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.includes('/restrict') || window.location.hash.includes('/restrict')) {
        setShowAdmin(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- App Identity ---
  const appName: string = appConfig?.appName ?? 'Avalia Quiz';
  const storagePrefix: string = appConfig?.storagePrefix ?? 'quiz';
  const primaryColor: string = appConfig?.theme?.primaryColor ?? '#5b3c88';

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--accent-primary', primaryColor);
      document.documentElement.style.setProperty('--brand-blue', primaryColor);
    }
  }, [primaryColor]);

  const themeLabelMap = (appConfig as any)?.topicModes?.reduce((acc: Record<string, string>, item: any) => {
    if (item.value && item.label) {
      acc[item.value] = item.label;
    }
    return acc;
  }, {}) || {};

  if (showAdmin) {
    return (
      <AdminDashboard 
        appName={appName}
        themeLabelMap={themeLabelMap}
        onReturnToQuiz={() => {
          setShowAdmin(false);
          if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
        }} 
      />
    );
  }

  if (window.location.pathname === '/vlibras') {
    return <VLibrasTest />;
  }

  const getTeamColor = (t?: any): string => {
    if (!t || !t.color || t.color === '#4287f5' || t.color === '#3b82f6') {
      return primaryColor;
    }
    return t.color;
  };

  const { isAuthenticated, apiKey, clientId, provider, model, login, logout } = useAuth();

  // --- Registra Acesso do Visitante (Analytics / GA4 style) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionKey = `app_accessed_${appName}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, 'true');

    const activeClientId = clientId || getClientId();
    logTelemetryEvent({
      eventType: 'app_accessed',
      appName,
      title: 'Acesso à Aplicação',
      clientId: activeClientId
    }).catch(e => console.warn("Falha ao registrar acesso inicial:", e));
  }, [appName]);
  
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

  const initialTTS = getInitialTTSState(storagePrefix, provider || undefined);

  const game = useGameLoop({
    storagePrefix,
    appName,
    apiKey,
    clientId,
    provider: provider || undefined,
    model: model || '',
    ttsEnabled: initialTTS.ttsEnabled,
    ttsConfig: initialTTS.ttsConfig, 
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

  // Estados de Dropdowns Rápidos do Header
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isTtsDropdownOpen, setIsTtsDropdownOpen] = useState(false);

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
          appName={appName}
          logo={appConfig?.customLogo}
          onPlayPrebuilt={game.handlePlayPrebuilt}
          isLoading={game.loading}
          loadingMessage={game.loadingMessage}
          apiError={game.errorDetail}
          onClearError={() => game.setErrorDetail(null)}
          onLoginWithCode={async (code, selectedProvider, selectedModel) => {
            const lockCheck = checkAccessCodeLock();
            if (lockCheck.isBlocked) {
              throw new Error(`Muitas tentativas incorretas. Aguarde ${lockCheck.remainingSeconds} segundo(s) antes de tentar novamente.`);
            }

            try {
              // Validacao de PIN e geracao mediada 100% via servidor/Cloud Function (Cenario A Seguro)
              resetFailedCodeAttempts();
              login('SERVER_PROXY_SESSION', selectedProvider === 'auto' ? 'google-ai' : selectedProvider, selectedModel || 'default');
            } catch (err: any) {
            } catch (err: any) {
              if (err.message && (err.message.includes('offline') || err.code === 'unavailable')) {
                throw new Error("Não foi possível conectar ao servidor (cliente offline ou sem credenciais de Firebase configuradas). Utilize a aba 'Chave API' para entrar diretamente com sua chave.");
              }
              throw err;
            }
          }}
          onLoginWithApiKey={async (key, prov, mod) => login(key, prov, mod)}
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
            <div className="mb-8">
              <AppLogo className="w-28 h-28" />
            </div>
            <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">
              {renderFormattedAppTitle(appName)}
            </h1>
            <p className="text-sm text-gray-400 mb-10">Selecione o idioma para começar.</p>
            
            <div className="w-full bg-black/40 p-2 rounded-3xl flex gap-3 mb-8 border border-white/5">
              <button onClick={() => game.setInterfaceLanguage('pt')} className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold ${game.interfaceLanguage === 'pt' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600'}`}>
                <svg viewBox="0 0 720 504" className="w-8 h-6 object-contain rounded-xs shadow-xs">
                  <rect width="720" height="504" fill="#009933"/>
                  <polygon points="360,54 666,252 360,450 54,252" fill="#ffcc00"/>
                  <circle cx="360" cy="252" r="126" fill="#002776"/>
                </svg>
                <span>Português</span>
              </button>
              <button onClick={() => game.setInterfaceLanguage('libras')} className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold ${game.interfaceLanguage === 'libras' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}>
                <img 
                  src="/libras.svg" 
                  alt="Libras" 
                  className="w-8 h-8 object-contain"
                />
                <span>Libras</span>
              </button>
            </div>

            <button onClick={() => game.setGameState('SETUP')} className="w-full text-white font-bold py-4 rounded-xl shadow-xl transition-all" style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}>Iniciar</button>
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col font-sans bg-brand-dark text-brand-text overflow-hidden" style={{ zoom: settings.zoomLevel }}>
          <header className="bg-[#161616] text-white h-16 shrink-0 flex items-center shadow-lg z-20 border-b border-white/10 relative">
            <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}></div>
            <div className="container mx-auto px-4 flex items-center justify-between">
              {/* Lado Esquerdo: Título + Modelo + Tutorial */}
              <div className="flex items-center gap-3">
                <h1 className="text-base font-semibold truncate">
                  {renderFormattedAppTitle(appName)}
                </h1>
                {model && (
                  <span className="bg-white/10 text-gray-300 text-xs font-mono font-medium px-2.5 py-0.5 rounded-md border border-white/10 shadow-xs flex items-center gap-1.5 shrink-0 hidden md:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {resolveAiModelLabel(provider || 'google-ai', model)}
                  </span>
                )}
                {game.isTutorialMode && <span className="bg-emerald-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Tutorial</span>}
              </div>

              {/* Lado Direito: Ações rápidas (Idioma + TTS + Tela Cheia + Configurações) */}
              <div className="flex items-center gap-2">
                {/* Dropdown de Idioma */}
                <div className="relative">
                  <button
                    onClick={() => {
                      playSound('click');
                      setIsLangDropdownOpen(!isLangDropdownOpen);
                      setIsTtsDropdownOpen(false);
                    }}
                    title="Alternar Idioma"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    {game.interfaceLanguage === 'pt' ? (
                      <svg viewBox="0 0 720 504" className="w-5 h-4 object-contain rounded-xs shadow-xs">
                        <rect width="720" height="504" fill="#009933"/>
                        <polygon points="360,54 666,252 360,450 54,252" fill="#ffcc00"/>
                        <circle cx="360" cy="252" r="126" fill="#002776"/>
                      </svg>
                    ) : (
                      <img src="/libras.svg" alt="Libras" className="w-5 h-5 object-contain" />
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`}>
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isLangDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-44 bg-[#1e1e24] border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100] flex flex-col gap-1 animate-fade-in backdrop-blur-md"
                      onMouseLeave={() => setIsLangDropdownOpen(false)}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 mb-1">
                        Modalidade
                      </div>
                      <button
                        onClick={() => {
                          playSound('click');
                          game.setInterfaceLanguage('pt');
                          setIsLangDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          game.interfaceLanguage === 'pt' ? 'bg-brand-blue text-white' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <svg viewBox="0 0 720 504" className="w-5 h-4 object-contain rounded-xs shadow-xs">
                          <rect width="720" height="504" fill="#009933"/>
                          <polygon points="360,54 666,252 360,450 54,252" fill="#ffcc00"/>
                          <circle cx="360" cy="252" r="126" fill="#002776"/>
                        </svg>
                        <span>Português</span>
                      </button>
                      <button
                        onClick={() => {
                          playSound('click');
                          game.setInterfaceLanguage('libras');
                          setIsLangDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          game.interfaceLanguage === 'libras' ? 'bg-brand-blue text-white' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <img src="/libras.svg" alt="Libras" className="w-5 h-5 object-contain" />
                        <span>Libras</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Dropdown de TTS / Narração */}
                <div className="relative">
                  <button
                    onClick={() => {
                      playSound('click');
                      setIsTtsDropdownOpen(!isTtsDropdownOpen);
                      setIsLangDropdownOpen(false);
                    }}
                    title="Configurações de Narração"
                    className={`p-2 rounded-lg border flex items-center gap-1.5 transition-all ${
                      narration.ttsEnabled 
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {narration.ttsEnabled ? <SpeakerHigh size={18} weight="bold" /> : <SpeakerSlash size={18} weight="bold" />}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform duration-200 ${isTtsDropdownOpen ? 'rotate-180' : ''}`}>
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isTtsDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-48 bg-[#1e1e24] border border-white/10 rounded-xl shadow-2xl p-1.5 z-[100] flex flex-col gap-1 animate-fade-in backdrop-blur-md"
                      onMouseLeave={() => setIsTtsDropdownOpen(false)}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 mb-1">
                        Narração de IA (TTS)
                      </div>
                      <button
                        onClick={() => {
                          playSound('click');
                          narration.handleTTSSelection('gemini');
                          setIsTtsDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          narration.ttsEnabled ? 'bg-purple-600/40 text-purple-200 border border-purple-500/50' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SpeakerHigh size={16} weight="bold" className="text-purple-400" />
                          <span>Ativada (IA)</span>
                        </div>
                        {narration.ttsEnabled && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                      </button>
                      <button
                        onClick={() => {
                          playSound('click');
                          narration.handleTTSSelection('off');
                          setIsTtsDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          !narration.ttsEnabled ? 'bg-white/10 text-white border border-white/20' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SpeakerSlash size={16} weight="bold" className="text-gray-400" />
                          <span>Desativada</span>
                        </div>
                        {!narration.ttsEnabled && <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Alternador Tela Cheia */}
                <button
                  onClick={() => { playSound('click'); settings.toggleFullscreen(); }}
                  title={settings.isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10"
                >
                  <CornersOut size={18} weight="bold" />
                </button>

                {/* Menu de Configurações Complementares */}
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
                  onOpenGuide={() => settings.setIsGuideOpen(true)}
                  onOpenPolicies={() => setIsPrivacyPolicyOpen(true)}
                  onGoHome={game.executeReset}
                  onLogout={() => game.setPendingAction('LOGOUT')}
                  interfaceLanguage={game.interfaceLanguage}
                  onLanguageChange={game.setInterfaceLanguage}
                />
              </div>
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

              {game.errorDetail && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                  <div className="bg-brand-card max-w-md w-full rounded-2xl p-6 border border-red-500/50 shadow-2xl text-white">
                    <div className="flex items-center gap-3 mb-4 text-red-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-xl font-bold">{game.errorDetail.title || "Erro no Quiz"}</h3>
                    </div>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{game.errorDetail.message}</p>
                    {game.errorDetail.solution && (
                      <div className="text-xs text-gray-300 bg-black/40 p-3.5 rounded-xl border border-gray-800 mb-6 font-mono">
                        💡 {game.errorDetail.solution}
                      </div>
                    )}
                    <button
                      onClick={() => game.setErrorDetail(null)}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-xl transition-colors shadow-lg"
                    >
                      Entendi
                    </button>
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
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white" style={{ backgroundColor: getTeamColor(game.teams[game.currentTeamIndex] || game.teams[0]) }}>
                  <div className="text-[12rem] font-black animate-ping absolute opacity-20">{game.countdownValue > 0 ? game.countdownValue : 'JÁ!'}</div>
                  <div className="text-[10rem] font-black relative z-10">{game.countdownValue > 0 ? game.countdownValue : 'JÁ!'}</div>
                </div>
              )}

              {game.gameState === 'PLAYING' && (!game.quizData || !game.quizData.questions || game.quizData.questions.length === 0) && (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 max-w-sm">
                    <p className="text-gray-300 mb-4">Nenhum dado de pergunta encontrado para este quiz.</p>
                    <button onClick={game.executeReset} className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl">Voltar ao Início</button>
                  </div>
                </div>
              )}

              {game.gameState === 'PLAYING' && game.quizData && game.quizData.questions && game.quizData.questions.length > 0 && (
                <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center mb-6 bg-black/20 p-4 rounded-xl">
                    <div className="flex gap-4 items-center">
                      {game.teams.map((t, idx) => (
                        <div key={t.id} className={`px-4 py-1 rounded-full border-2 transition-all ${idx === game.currentTeamIndex ? 'text-white font-bold' : 'opacity-40'}`} style={{ backgroundColor: idx === game.currentTeamIndex ? getTeamColor(t) : 'transparent', borderColor: getTeamColor(t) }}>
                          {t.name}: {t.score}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm opacity-80">Pergunta {Math.min(game.currentQuestionIndex + 1, game.quizData.questions.length)}/{game.quizData.questions.length}</div>
                      {game.quizConfig?.enableTimer && (
                        <div className={`px-4 py-1.5 rounded-full font-bold text-sm shadow-md flex items-center gap-1.5 transition-all ${getTimerStyles()}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-mono">{game.timeLeft}s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <QuizCard question={game.quizData.questions[game.currentQuestionIndex] || game.quizData.questions[0]} index={Math.min(game.currentQuestionIndex, game.quizData.questions.length - 1)} total={game.quizData.questions.length}
                    timeLeft={game.timeLeft} onAnswer={game.handleAnswer} isTimeUp={game.timeLeft === 0}
                    hintsRemaining={game.hintsRemaining} onRevealHint={game.handleUseHint}
                    activeTeamName={game.teams[game.currentTeamIndex]?.name} activeTeamColor={getTeamColor(game.teams[game.currentTeamIndex])}
                    onVoid={() => game.handleReplaceQuestion(game.currentQuestionIndex)}
                    ttsConfig={narration.ttsConfig} onSkip={game.handleSkipQuestion} isSkipping={game.isSkipping} apiKey={apiKey}
                    provider={provider} model={model}
                    interfaceLanguage={game.interfaceLanguage} />
                </main>
              )}

              {game.gameState === 'ROUND_SUMMARY' && (
                <main className="flex-1 flex items-center justify-center p-6">
                  <div className="bg-brand-card p-10 rounded-3xl shadow-2xl border border-gray-700 text-center max-w-lg w-full">
                    <h2 className="text-3xl font-bold mb-8">Fim da Rodada {game.currentRound}</h2>
                    <div className="space-y-4 mb-10">
                      {game.teams.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border-l-4" style={{ borderLeftColor: getTeamColor(t) }}>
                          <span className="font-bold">{t.name}</span>
                          <span className="text-2xl font-black">{t.score}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={game.handleNextRound} className="w-full py-4 text-white rounded-xl font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>Próxima Rodada</button>
                  </div>
                </main>
              )}

              {game.gameState === 'FINISHED' && game.quizData && (
                <main className="flex-1 container mx-auto px-4 py-10 flex flex-col items-center">
                  <h2 className="text-4xl font-black mb-10 text-white">Partida Finalizada!</h2>
                  
                  <div className={`w-full max-w-4xl mb-12 ${game.teams.length === 1 ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
                    {game.teams.map(t => (
                      <div key={t.id} className={`bg-brand-card p-8 rounded-3xl border-b-8 shadow-2xl overflow-hidden ${game.teams.length === 1 ? 'w-full max-w-md' : ''}`} style={{ borderBottomColor: getTeamColor(t) }}>
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
                    <button onClick={game.executeReset} className="px-8 py-4 text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>Menu Inicial</button>
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
                  <span>Versão: {appConfig?.version || '1.4.96'}</span>
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
    </div>
  );
}

