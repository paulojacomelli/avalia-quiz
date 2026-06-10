import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { 
  GeneratedQuiz, QuizConfig, Team, HintType, Difficulty, TTSConfig, TopicMode, ApiErrorDetail,
  LOADING_MESSAGES, TUTORIAL_CONFIG, TUTORIAL_DATA, GLOSAS_VALIDADAS, textoParaGlosa, sanitizarGlosa,
  loadVLibrasDictionary, sanitizeGlosaStrict, initializeVLibrasValidator
} from '@avalia/core';
import { 
  generateQuizContent, generateReplacementQuestion, preGenerateQuizAudio,
  playSound, playTimerTick, setGlobalSoundState, playCountdownTick, playGoSound, startLoadingDrone, stopLoadingDrone, resumeAudioContext,
  speakText, stopSpeech, getQuestionReadAloudText,
  getGlobalKeywords, saveGeneratedQuiz, uploadQuizAudiosToStorage, getRandomPrebuiltQuiz, getAvailableLibraryThemes, db
} from '@avalia/services';
import { 
  CookieBanner, PrivacyPolicyModal, ReadyCheck,
  SetupForm, QuizCard, LoginScreen,
  TourOverlay, TourStep,
  SettingsMenu, ThemeMode, TtsMode,
  VLibras, VLibrasHandle, VLibrasTest
} from '@avalia/design-system';
import { doc, getDoc } from 'firebase/firestore';

type GameState = 'START_SCREEN' | 'SETUP' | 'READY_CHECK' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_SUMMARY' | 'FINISHED';
type Theme = 'light' | 'dark' | 'system';

// Palette for Teams: Blue, Red, Green, Amber
const TEAM_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

// Interface de Erro Estruturado movida para types.ts

interface GameEngineProps {
  appConfig?: any;
  defaultLanguage?: 'pt' | 'libras';
  title?: React.ReactNode;
}

export default function GameEngine({ appConfig, defaultLanguage = 'pt', title }: GameEngineProps) {
  if (window.location.pathname === '/vlibras') {
    return <VLibrasTest />;
  }

  // --- App Identity (driven by appConfig, never hardcoded) ---
  const appName: string = appConfig?.appName ?? 'Avalia Quiz';
  const storagePrefix: string = appConfig?.storagePrefix ?? 'quiz';
  const primaryColor: string = appConfig?.theme?.primaryColor ?? '#4287f5';

  const { isAuthenticated, apiKey, provider, login, logout } = useAuth();
  const SESSION_KEY = `${storagePrefix}-session-v1`;

  const readSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const _session = readSession();

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = _session?.gameState as GameState | null;
    // COUNTDOWN é transitório — restaura como READY_CHECK se houver dados
    if (saved === 'COUNTDOWN') return _session?.quizData ? 'READY_CHECK' : 'START_SCREEN';
    return saved || 'START_SCREEN';
  });

  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(_session?.quizConfig ?? null);
  const [quizData, setQuizData] = useState<GeneratedQuiz | null>(_session?.quizData ?? null);
  const [loading, setLoading] = useState(false);

  // Replaced generic string error with structured object
  const [errorDetail, setErrorDetail] = useState<ApiErrorDetail | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem(`${storagePrefix}-theme`) as ThemeMode) || 'system');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(`${storagePrefix}-soundEnabled`) !== 'false');
  const [zoomLevel, setZoomLevel] = useState(() => parseFloat(localStorage.getItem(`${storagePrefix}-zoomLevel`) || '1.0'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Histórico de temas focais (Evita repetição de assuntos recentes)
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const [globalExclusions, setGlobalExclusions] = useState<string[]>([]);

  // Estado Global do TTS (Texto para Fala)
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: false,
    autoRead: true,
    engine: 'gemini', // Default to Natural
    gender: 'female',
    rate: 1.5, // Requested speed
    volume: 1.0
  });

  // Estado do Menu de Opções de Voz (TTS)
  const [isTTSMenuOpen, setIsTTSMenuOpen] = useState(false);
  const ttsMenuRef = useRef<HTMLDivElement>(null);

  // Estados de Controle de Fluxo do Jogo
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(_session?.currentQuestionIndex ?? 0);
  const [timeLimit, setTimeLimit] = useState(_session?.timeLimit ?? 60);
  const [timeLeft, setTimeLeft] = useState(_session?.timeLeft ?? 60);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>(_session?.userAnswers ?? []);
  const [isCurrentQuestionAnswered, setIsCurrentQuestionAnswered] = useState(_session?.isCurrentQuestionAnswered ?? false);

  // Estado do Modo Tutorial
  const [isTutorialMode, setIsTutorialMode] = useState(false);

  // Estado do Formulário de Configuração (Controlado externamente para o Guia)
  const [setupStep, setSetupStep] = useState(1);

  // Estado do Guia Interativo (Tour)
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Estado da Política de Privacidade
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  // Skip State
  const [isSkipping, setIsSkipping] = useState(false);

  // Voided Questions State
  const [voidedIndices, setVoidedIndices] = useState<Set<number>>(new Set());

  // Teams State
  const [teams, setTeams] = useState<Team[]>(_session?.teams ?? []);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(_session?.currentTeamIndex ?? 0);

  // Round State
  const [currentRound, setCurrentRound] = useState(_session?.currentRound ?? 1);

  // Hint State
  const [hintsRemaining, setHintsRemaining] = useState<number>(_session?.hintsRemaining ?? -1);

  // Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Countdown State
  const [countdownValue, setCountdownValue] = useState(3);

  // API Quota Cooldown State
  const [cooldownTime, setCooldownTime] = useState(0);

  // Loading Message State
  const [loadingMessage, setLoadingMessage] = useState("");

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<'RESET' | 'LOGOUT' | 'CLEAR_HISTORY' | null>(null);
  const [isPrebuiltQuiz, setIsPrebuiltQuiz] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<Record<string, string[]>>({});
  const [interfaceLanguage, setInterfaceLanguage] = useState<'pt' | 'libras'>(
    (_session?.interfaceLanguage as 'pt' | 'libras') || 'pt'
  );
  const [isLibrasLoading, setIsLibrasLoading] = useState(false);
  const [isLibrasReady, setIsLibrasReady] = useState(false);
  const [vlibrasSpeed, setVlibrasSpeed] = useState(1);
  const [vlibrasAvatar, setVlibrasAvatar] = useState('icaro');
  const [vlibrasPlaying, setVlibrasPlaying] = useState(true);
  const [vlibrasDict, setVlibrasDict] = useState<Set<string> | null>(null);

  // Log de diagnóstico para rastrear o estado pós-login
  console.log("App Render State:", { isAuthenticated, apiKey: !!apiKey, provider, interfaceLanguage });

  // Hook customizado para detecção reativa de Desktop (lg: 1024px)
  const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    useEffect(() => {
      const handler = () => setIsDesktop(window.innerWidth >= 1024);
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, []);
    return isDesktop;
  };
  const isDesktop = useIsDesktop();

  // Audio/TTS Refs
  const questionReadRef = useRef(false);
  const vlibrasRef = useRef<VLibrasHandle>(null);


  // Silenciador de Logs da Unity (Limpeza de Console solicitada pelo usuário)
  useEffect(() => {
    const originalLog = window.console.log;
    const originalWarn = window.console.warn;
    const silentPatterns = [
      '[UnityCache]', 
      'Initialize engine version', 
      'Creating WebGL 2.0 context',
      'Renderer:', 'Vendor:', 'Version:', 'GLES:',
      'EXT_clip_control', 'OES_texture_float_linear',
      'OPENGL LOG:', 'UnloadTime:',
      'AnimationClip', 'Default clip could not be found',
      'Unloading 5 Unused Serialized files',
      'Unloading 12 unused Assets',
      '[AnimatedObjects]',
      'Base Url is now',
      'SET BASE URL TO',
      '(Filename:',
      'Total:',
      'MarkObjects',
      'DeleteObjects',
      'CreateObjectMapping'
    ];

    window.console.log = (...args: any[]) => {
      const msg = args[0];
      if (typeof msg === 'string' && silentPatterns.some(p => msg.includes(p))) return;
      originalLog.apply(console, args);
    };

    window.console.warn = (...args: any[]) => {
      const msg = args[0];
      if (typeof msg === 'string' && silentPatterns.some(p => msg.includes(p))) return;
      originalWarn.apply(console, args);
    };

    return () => {
      window.console.log = originalLog;
      window.console.warn = originalWarn;
    };
  }, []);

  // --- TOUR CONFIGURATION ---
  const TOUR_STEPS: TourStep[] = [
    {
      title: "Bem-vindo ao Tutorial",
      content: "Vamos ver rapidinho como configurar e jogar o Avalia Quiz.",
      position: 'center'
    },
    {
      targetId: 'btn-theme',
      title: "Visual do Jogo",
      content: "Mude para modo Claro ou Escuro para jogar com mais conforto.",
      position: 'bottom'
    },
    {
      targetId: 'btn-sound',
      title: "Sons do Jogo",
      content: "Ative os efeitos sonoros para uma partida mais animada.",
      position: 'bottom'
    },
    {
      targetId: 'btn-tts',
      title: "Narração de Partida",
      content: "Escolha uma voz para ler as perguntas automaticamente.",
      position: 'bottom'
    },
    {
      targetId: 'btn-home',
      title: "Reiniciar Partida",
      content: "Volte para o início para configurar um novo desafio.",
      position: 'bottom'
    },
    {
      targetId: 'field-mode',
      title: "Escolher Tema",
      content: "Selecione o tema. O sistema sorteia variações para cada partida ser única!",
      position: 'top',
      onEnter: () => setSetupStep(1)
    },
    {
      title: "Vamos Jogar!",
      content: "O Modo Tutorial iniciará para você testar na prática.",
      position: 'center'
    }
  ];

  // --- Session Persistence (snapshot completo) ---
  useEffect(() => {
    // Não salva estados transitórios ou de carregamento
    const skipStates: GameState[] = ['COUNTDOWN'];
    if (skipStates.includes(gameState)) return;

    const snapshot = {
      gameState,
      interfaceLanguage,
      quizData,
      quizConfig,
      currentQuestionIndex,
      timeLimit,
      timeLeft,
      userAnswers,
      isCurrentQuestionAnswered,
      teams,
      currentTeamIndex,
      currentRound,
      hintsRemaining,
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch (e) {
      // sessionStorage cheio (raro) — ignora silenciosamente
      console.warn('Session snapshot failed:', e);
    }
  }, [
    gameState, interfaceLanguage, quizData, quizConfig,
    currentQuestionIndex, timeLimit, timeLeft, userAnswers,
    isCurrentQuestionAnswered, teams, currentTeamIndex,
    currentRound, hintsRemaining
  ]);

  useEffect(() => {
    sessionStorage.setItem(`${storagePrefix}-session-lang`, interfaceLanguage);
  }, [interfaceLanguage, storagePrefix]);

  // --- Inactivity Timeout (30 min) ---
  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Sessão expirada por inatividade
        sessionStorage.removeItem(`${storagePrefix}-session-state`);
        sessionStorage.removeItem(`${storagePrefix}-session-lang`);
        setGameState('START_SCREEN');
        setQuizData(null);
        setQuizConfig(null);
      }, TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Inicia o timer ao montar

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [storagePrefix]);

  // --- Initialization ---

  useEffect(() => {
    const savedTheme = localStorage.getItem(`${storagePrefix}-theme`) as Theme;
    const savedSound = localStorage.getItem(`${storagePrefix}-sound`);
    const savedTTS = localStorage.getItem(`${storagePrefix}-tts`);
    const savedEngine = localStorage.getItem(`${storagePrefix}-tts-engine`);
    const savedFocalHistory = localStorage.getItem(`${storagePrefix}-used-keywords`);

    if (savedTheme) setTheme(savedTheme);
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      setGlobalSoundState(isEnabled);
    }

    if (savedFocalHistory) {
      try {
        setUsedTopics(JSON.parse(savedFocalHistory));
      } catch (e) {
        setUsedTopics([]);
      }
    }

    // Restore TTS Settings
    const isTTSActive = (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') ? false : savedTTS === 'true';
    setTtsEnabled(isTTSActive);

    // Apply logic for engine/gender/rate based on default
    const initialEngine = 'gemini';
    updateTTSConfigState(initialEngine, isTTSActive);

    // Listener to update state if user presses Esc
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Click outside listener for TTS Menu
    const handleClickOutside = (event: MouseEvent) => {
      if (ttsMenuRef.current && !ttsMenuRef.current.contains(event.target as Node)) {
        setIsTTSMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Carrega o dicionário VLibras em background para validação de glosas
    const loadDict = async () => {
      try {
        const dict = await loadVLibrasDictionary();
        setVlibrasDict(dict);
        console.log(`[GameEngine] ✅ Dicionário VLibras carregado: ${dict.size} tokens`);
      } catch (err) {
        console.error('[GameEngine] ❌ Falha ao carregar dicionário VLibras:', err);
      }
    };
    loadDict();

    const fetchGlobal = async () => {
      try {
        const gkw = await getGlobalKeywords(35, appName);
        setGlobalExclusions(gkw);
      } catch (err) {
        console.error("Failed to fetch global keywords:", err);
      }
    };
    fetchGlobal();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }

    localStorage.setItem(`${storagePrefix}-theme`, theme);
  }, [theme]);

  // --- LIBRAS GUIDED LOGIC ---
  const SETUP_GLOSAS: Record<number, string> = {
    1: GLOSAS_VALIDADAS.CONFIGURAR_QUIZ,
    2: GLOSAS_VALIDADAS.ESCOLHER_TEMA,
    3: "DIGITAR TEMA ESPECIFICO AQUI",
    4: GLOSAS_VALIDADAS.ESCOLHER_DIFICULDADE,
    5: "CRIATIVIDADE IA CONSERVADOR OU CRIATIVO",
    6: "FORMATO PERGUNTA MULTIPLA_ESCOLHA VERDADEIRO_FALSO RESPOSTA_LIVRE",
    7: "CONFIGURAR TIMES E QUANTIDADE PERGUNTAS",
    8: "ATIVAR AJUDAS DICA OU CHAT IA"
  };

  /**
   * Helper para reproduzir glosa com sanitização rigorosa
   * Valida contra o dicionário antes de enviar para o Unity
   */
  const playGlosaSegura = (glosa: string, emotion?: string) => {
    if (!vlibrasRef.current || !glosa || glosa.trim().length === 0) {
      return;
    }

    let sanitized = glosa;
    
    // Se o dicionário está carregado, usa sanitização stricta
    if (vlibrasDict && vlibrasDict.size > 0) {
      sanitized = sanitizeGlosaStrict(glosa, vlibrasDict);
    } else {
      // Fallback para sanitização simples se dicionário ainda não carregou
      sanitized = sanitizarGlosa(glosa);
    }

    // Se a glosa ficou vazia após sanitização, não envia
    if (!sanitized || sanitized.trim().length === 0) {
      console.warn(`[GameEngine] ⚠️  Glosa vazia após sanitização: "${glosa}"`);
      return;
    }

    // Envia para reprodução
    vlibrasRef.current.play(sanitized);
    if (emotion) {
      vlibrasRef.current.setEmotion(emotion);
    }
  };

  // Glosas automáticas quando o VLibras fica pronto
  useEffect(() => {
    if (interfaceLanguage === 'libras' && isLibrasReady && gameState === 'SETUP') {
      // Aguarda evento stop:welcome (1500ms de margem)
      const timer = setTimeout(() => {
        if (vlibrasRef.current) {
          // Usa play() com sanitização rigorosa
          const introGlosa = `${GLOSAS_VALIDADAS.BOAS_VINDAS} ${GLOSAS_VALIDADAS.MODO_LIBRAS} ${GLOSAS_VALIDADAS.CONFIGURAR_QUIZ}`;
          playGlosaSegura(introGlosa, 'feliz');
          
          // Após 5 segundos, lê a instrução da tela atual
          setTimeout(() => {
            const stepGlosa = SETUP_GLOSAS[setupStep];
            if (stepGlosa) {
              playGlosaSegura(stepGlosa, 'pensa');
            }
          }, 5000);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isLibrasReady, interfaceLanguage, gameState, setupStep, vlibrasDict]);

  // Lê as glosas quando o step de configuração muda
  useEffect(() => {
    if (interfaceLanguage === 'libras' && gameState === 'SETUP' && isLibrasReady) {
      const glosa = SETUP_GLOSAS[setupStep];
      if (glosa && vlibrasRef.current) {
        const timer = setTimeout(() => {
          playGlosaSegura(glosa);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [setupStep, interfaceLanguage, gameState, isLibrasReady, vlibrasDict]);

  // Loading Sound Effect & Message Logic
  useEffect(() => {
    if (loading) {
      startLoadingDrone();
      // Pick a random message only if not overriding with specific status
      if (!loadingMessage.includes("narração")) {
        const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
        setLoadingMessage(randomMsg);
      }
    } else {
      stopLoadingDrone();
    }
  }, [loading]);

  // Countdown Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (gameState === 'COUNTDOWN') {
      playCountdownTick(countdownValue);

      interval = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          const newVal = prev - 1;
          playCountdownTick(newVal);
          return newVal;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN' && countdownValue === 0) {
      playGoSound();
      setGameState('PLAYING');
    }
  }, [countdownValue, gameState]);

  // Cooldown Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // --- TTS Logic ---

  // Helper to centralize TTS config updates based on engine rules
  const updateTTSConfigState = (engine: 'gemini', enabled: boolean) => {
    const newConfig: TTSConfig = {
      enabled: enabled,
      autoRead: true,
      engine: engine,
      gender: 'female',
      rate: 1.5, // Fixed 1.5x speed as requested
      volume: 1.0
    };
    setTtsConfig(newConfig);
    // Persist engine choice
    localStorage.setItem(`${storagePrefix}-tts-engine`, engine);
  };

  // Forçar TTS desativado quando o provedor for o DeepSeek, Groq ou OpenRouter
  useEffect(() => {
    if ((provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') && ttsEnabled) {
      setTtsEnabled(false);
      localStorage.setItem(`${storagePrefix}-tts`, 'false');
      stopSpeech();
    }
  }, [provider, ttsEnabled, storagePrefix]);

  // Ensure we stop speech if TTS is disabled globally
  useEffect(() => {
    if (!ttsEnabled) {
      stopSpeech();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    // Check both global toggle and config specific toggle (autoRead)
    // Note: quizConfig.tts is a snapshot at generation time, but we should respect global toggle
    const shouldRead = ttsEnabled && ttsConfig.autoRead;

    if (gameState === 'PLAYING' && quizData && shouldRead && !isCurrentQuestionAnswered && !isSkipping && cooldownTime === 0) {
      const timeout = setTimeout(() => {
        const q = quizData.questions[currentQuestionIndex];
        const teamIntro = quizConfig?.isTeamMode ? teams[currentTeamIndex].name : undefined;

        // Reconstruct text for fallback or if needed, but pass audioBase64 if present
        const textToRead = getQuestionReadAloudText(q, teamIntro);

        // Always use the latest global ttsConfig for playback
        speakText(textToRead, ttsConfig, apiKey || undefined, q.audioBase64, undefined, q.audioUrl);

      }, 500);
      return () => {
        clearTimeout(timeout);
        stopSpeech();
      };
    }
  }, [currentQuestionIndex, gameState, quizData, isCurrentQuestionAnswered, isSkipping, ttsEnabled, ttsConfig, cooldownTime, apiKey]);

  // --- VLibras Logic ---
  // --- VLibras Logic ---
  useEffect(() => {
    if (gameState === 'PLAYING' && interfaceLanguage === 'libras' && quizData?.questions[currentQuestionIndex]) {
      const glosa = quizData.questions[currentQuestionIndex].glosa;
      if (glosa && vlibrasRef.current) {
        // Delay para garantir que o player processe a troca se necessário
        setTimeout(() => {
          playGlosaSegura(glosa, 'duvida');
        }, 800);
      }
    }
  }, [currentQuestionIndex, interfaceLanguage, gameState, quizData, vlibrasDict]);

  // Glosa para READY_CHECK
  useEffect(() => {
    if (gameState === 'READY_CHECK' && interfaceLanguage === 'libras' && isLibrasReady && quizData) {
      const timer = setTimeout(() => {
        const readyGlosa = `${GLOSAS_VALIDADAS.PREPARAR} TOTAL ${quizData.questions.length} PERGUNTAS ${GLOSAS_VALIDADAS.CONFIRMAR}`;
        playGlosaSegura(readyGlosa, 'feliz');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, interfaceLanguage, isLibrasReady, quizData, vlibrasDict]);

  // Glosa para COUNTDOWN
  useEffect(() => {
    if (gameState === 'COUNTDOWN' && interfaceLanguage === 'libras' && isLibrasReady) {
      const timer = setTimeout(() => {
        if (countdownValue > 0) {
          const countGlosa = countdownValue === 3 ? GLOSAS_VALIDADAS.TRES : 
                            countdownValue === 2 ? GLOSAS_VALIDADAS.DOIS : 
                            GLOSAS_VALIDADAS.UM;
          playGlosaSegura(countGlosa);
        } else if (countdownValue === 0) {
          playGlosaSegura(GLOSAS_VALIDADAS.JA, 'feliz');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gameState, countdownValue, interfaceLanguage, isLibrasReady, vlibrasDict]);

  const handleAnswerLibrasEmotion = (isCorrect: boolean) => {
    if (interfaceLanguage === 'libras' && vlibrasRef.current) {
      vlibrasRef.current.setEmotion(isCorrect ? 'feliz' : 'triste');
      setTimeout(() => {
        vlibrasRef.current?.setEmotion('pensa');
      }, 3000);
    }
  };

  // --- Auto-Advance in Live Mode ---
  // No modo Live, após a resposta ser avaliada, avança automaticamente para sincronizar
  // com o áudio da IA que já segue em frente na conversa.
  useEffect(() => {
    if (
      gameState === 'PLAYING' &&
      isCurrentQuestionAnswered &&
      quizConfig?.openEndedMode === 'live'
    ) {
      const timeout = setTimeout(() => {
        handleNextQuestion();
      }, 2500);
      return () => clearTimeout(timeout);
    }
    // handleNextQuestion captura o closure correto no momento em que
    // isCurrentQuestionAnswered se torna true — stale closure não é risco aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentQuestionAnswered, gameState, quizConfig?.openEndedMode]);

  // --- Keyboard Shortcuts (Spacebar & Enter to Next) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Allow Space or Enter
      if (e.code === 'Space' || e.key === 'Enter') {
        // Avoid scrolling/triggering if user is typing in a textarea/input
        const tagName = (e.target as HTMLElement).tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

        // Prevent action if in cooldown or error state
        if (cooldownTime > 0 || errorDetail) return;

        // Prevent if modal is open
        if (pendingAction) return;

        // Prevent page scroll for space and button clicks for enter to avoid double triggering
        e.preventDefault();

        // Context-aware action
        if (gameState === 'READY_CHECK') {
          handleConfirmStart();
        } else if (gameState === 'PLAYING' && isCurrentQuestionAnswered) {
          handleNextQuestion();
        } else if (gameState === 'ROUND_SUMMARY') {
          handleNextRound();
        } else if (isReviewing && reviewIndex < (quizData?.questions.length || 0) - 1) {
          setReviewIndex(prev => prev + 1);
          playSound('click');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, isCurrentQuestionAnswered, isReviewing, reviewIndex, quizData, currentQuestionIndex, cooldownTime, errorDetail, pendingAction]);

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setGlobalSoundState(newState);
    localStorage.setItem(`${storagePrefix}-sound`, String(newState));
  };

  const handleThemeToggle = () => {
    playSound('click');
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  };

  const handleTTSSelection = (selection: 'gemini' | 'off') => {
    playSound('click');
    if (selection === 'off') {
      setTtsEnabled(false);
      localStorage.setItem(`${storagePrefix}-tts`, 'false');
      stopSpeech();
    } else {
      if (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') return;
      setTtsEnabled(true);
      localStorage.setItem(`${storagePrefix}-tts`, 'true');
      updateTTSConfigState('gemini', true);
    }
    setIsTTSMenuOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // --- TUTORIAL HANDLER ---
  const handleStartTutorial = () => {
    playSound('click');
    setLoading(true);
    setLoadingMessage("Preparando tutorial...");

    // Simulate brief loading for UX
    setTimeout(() => {
      // Setup Tutorial Mode
      setIsTutorialMode(true);
      // Ensure tutorial uses current TTS config state if enabled globally, but for consistency we use the hardcoded structure 
      // patched with current global TTS enabled state if needed, though quizConfig.tts is mostly a record.
      const tutorialConfig = {
        ...TUTORIAL_CONFIG,
        tts: {
          ...TUTORIAL_CONFIG.tts,
          enabled: ttsEnabled // Match global state to avoid confusion
        }
      };
      setQuizConfig(tutorialConfig);
      setQuizData(TUTORIAL_DATA);

      // Setup Dummy Team
      setTeams([{
        id: 'solo',
        name: 'Você',
        color: '#10b981', // Tutorial green
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }]);

      // Initial States
      setTimeLimit(TUTORIAL_CONFIG.timeLimit);
      setHintsRemaining(TUTORIAL_CONFIG.maxHints);
      setCooldownTime(0);

      setGameState('READY_CHECK');
      setLoading(false);
    }, 800);
  };

  // --- ROBUST ERROR HANDLING ---

  const parseApiError = (err: any): ApiErrorDetail => {
    const msg = (err?.message || String(err)).toLowerCase();

    // 429: Quota Exceededõe
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
      return {
        code: '429',
        title: 'Limite de Uso Excedido',
        message: 'A cota gratuita da API do Google foi atingida temporariamente. Muitas requisições em pouco tempo.',
        solution: 'O sistema entrará em pausa automática por 60 segundos. Aguarde o contador.'
      };
    }
    // 400/403: Invalid Key or Permission
    if (msg.includes('400') || msg.includes('403') || msg.includes('key') || msg.includes('permission') || msg.includes('unauthenticated')) {
      return {
        code: '403',
        title: 'Chave de API Inválida',
        message: 'A chave fornecida foi rejeitada pelo Google. Ela pode estar incorreta, expirada ou o projeto no Google Cloud pode estar sem permissão.',
        solution: 'Tente fazer logout e inserir a chave novamente. Verifique se a chave está ativa no Google AI Studio.'
      };
    }
    // 500/503: Server Errors
    if (msg.includes('500') || msg.includes('503') || msg.includes('overloaded') || msg.includes('internal') || msg.includes('unavailable')) {
      return {
        code: '503',
        title: 'Serviço Indisponível',
        message: 'Os servidores da IA do Google estão instáveis ou sobrecarregados neste momento.',
        solution: 'Isso é temporário. Aguarde alguns instantes e tente novamente.'
      };
    }
    // Safety Blocks
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harmful') || msg.includes('filter')) {
      return {
        code: 'SAFETY',
        title: 'Conteúdo Bloqueado',
        message: 'A IA recusou gerar este conteúdo devido aos filtros de segurança automáticos.',
        solution: 'Tente mudar o tema ou a formulação do tópico para algo mais específico.'
      };
    }
    // Network Errors
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('failed to fetch')) {
      return {
        code: 'NET',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar aos servidores do Google.',
        solution: 'Verifique sua conexão com a internet (Wi-Fi/Dados).'
      };
    }

    // Default / Unknown
    return {
      code: 'UNKNOWN',
      title: 'Erro Desconhecido',
      message: `Ocorreu um erro inesperado: ${msg.substring(0, 150)}...`,
      solution: 'Tente novamente. Se o erro persistir, recarregue a página.'
    };
  }

  const handleApiError = (err: any) => {
    const parsed = parseApiError(err);
    console.error("Parsed Error:", parsed);

    // Special handling for Quota - activate cooldown timer
    if (parsed.code === '429') {
      setCooldownTime(60);
      stopSpeech();
    }
    setErrorDetail(parsed);
    setLoading(false);
  };

  const handlePlayPrebuilt = async () => {
    setLoading(true);
    setLoadingMessage("Consultando temas disponíveis na biblioteca...");
    try {
      const themes = await getAvailableLibraryThemes(appName);
      setAvailableThemes(themes);
      setIsPrebuiltQuiz(true);
      setSetupStep(1);
      setGameState('SETUP');
    } catch (err) {
      console.error(err);
      handleApiError({ title: "Erro de Conexão", message: "Não foi possível carregar a biblioteca.", solution: "Verifique sua internet.", code: "FB-LIB" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (config: QuizConfig) => {
    // 1. Trigger loading UI immediately
    setLoading(true);
    setLoadingMessage(isPrebuiltQuiz ? "Buscando quiz na biblioteca..." : "Gerando perguntas...");
    setErrorDetail(null);
    setQuizData(null);

    // Ensure we have a key (defensive check) - only for AI generation
    if (!apiKey && !isPrebuiltQuiz) {
      setLoading(false);
      setErrorDetail({
        code: 'NO_KEY',
        title: 'Chave Ausente',
        message: 'A chave de API não foi encontrada.',
        solution: 'Faça login novamente.'
      });
      return;
    }

    // Attempt to resume audio context safely
    try {
      resumeAudioContext();
    } catch (e) {
      console.warn("Could not resume audio context", e);
    }

    // INJECT THE GLOBAL TTS CONFIG INTO THE QUIZ CONFIG
    // Include the usedTopics in the config passed to the service
    const finalConfig: QuizConfig = {
      ...config,
      tts: ttsConfig,
      usedTopics: usedTopics,
      librasEnabled: interfaceLanguage === 'libras'
    };

    setQuizConfig(finalConfig);
    setTimeLimit(finalConfig.timeLimit);
    setHintsRemaining(finalConfig.maxHints);
    setCooldownTime(0);

    let tempTeams: Team[] = [];
    if (finalConfig.isTeamMode) {
      tempTeams = finalConfig.teams.map((name, idx) => ({
        id: `team-${idx}`,
        name,
        color: TEAM_COLORS[idx % TEAM_COLORS.length], // Assign color from palette
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }));
    } else {
      tempTeams = [{
        id: 'solo',
        name: 'Você',
        color: primaryColor,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }];
    }
    setTeams(tempTeams);

    try {
      let data;

      if (isPrebuiltQuiz) {
        const fullQuiz = await getRandomPrebuiltQuiz(appName, finalConfig.mode, finalConfig.subTopic);
        if (!fullQuiz) throw new Error("Não encontramos nenhum quiz para este tema na biblioteca.");

        data = {
          ...fullQuiz,
          questions: fullQuiz.questions.slice(0, finalConfig.count)
        };

        finalConfig.count = data.questions.length;
        setQuizConfig({ ...finalConfig });

        // --- PRÉ-GERAR ÁUDIO APENAS PARA QUESTÕES SEM audioUrl SALVO ---
        if (ttsEnabled && finalConfig.tts.engine === 'gemini' && apiKey) {
          const questionsNeedingAudio = data.questions.filter(q => !q.audioUrl);
          if (questionsNeedingAudio.length > 0) {
            setLoadingMessage("Gerando áudio da partida...");
            const teamNameList = tempTeams.map(t => t.name);
            data = await preGenerateQuizAudio(apiKey, data, finalConfig.tts, finalConfig.isTeamMode ? teamNameList : []);
          }
        }
      } else {
        data = await generateQuizContent(apiKey!, finalConfig, globalExclusions, provider);

        // --- PRÉ-GERAR ÁUDIO (antes de salvar para incluir URLs no Firestore) ---
        if (ttsEnabled && finalConfig.tts.engine === 'gemini' && apiKey) {
          setLoadingMessage("Gerando áudio da partida...");
          const teamNameList = tempTeams.map(t => t.name);
          data = await preGenerateQuizAudio(apiKey, data, finalConfig.tts, finalConfig.isTeamMode ? teamNameList : []);
        }

        // --- SALVAR NO FIRESTORE (obtém docId para uso no Storage) ---
        const docId = await saveGeneratedQuiz(data, appName, finalConfig.mode, finalConfig.subTopic || finalConfig.specificTopic);

        // --- UPLOAD DOS ÁUDIOS PARA O STORAGE (se TTS gerou base64) ---
        if (docId && data.questions.some(q => q.audioBase64)) {
          setLoadingMessage("Salvando áudios...");
          data = await uploadQuizAudiosToStorage(data, docId);
        }
      }

      setQuizData(data);

      // --- Update Focal History Keywords ---
      const newKeywords = data.keywords || [];
      if (newKeywords.length > 0) {
        const updatedUsed = [...newKeywords, ...usedTopics].slice(0, 50); // Keep last 50 keywords
        setUsedTopics(updatedUsed);
        localStorage.setItem(`${storagePrefix}-used-keywords`, JSON.stringify(updatedUsed));
      }

      setGameState('READY_CHECK');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setUsedTopics([]);
    localStorage.removeItem(`${storagePrefix}-used-keywords`);
    setPendingAction(null);
    playSound('click');
  };

  const handleRestartSameSettings = () => {
    if (quizConfig) {
      if (isTutorialMode) {
        handleStartTutorial();
      } else {
        stopSpeech();
        handleGenerate(quizConfig);
      }
    }
  };

  const handleConfirmStart = () => {
    if (!quizConfig) return;
    playSound('click');
    resumeAudioContext(); // Double check audio context is active on this click
    startCountdownSequence(quizConfig.timeLimit);
  };

  const startCountdownSequence = (limit: number) => {
    setGameState('COUNTDOWN');
    setCountdownValue(3);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setTimeLeft(limit);
    setIsCurrentQuestionAnswered(false);
    setIsReviewing(false);
    setReviewIndex(0);
    setCurrentTeamIndex(0);
    setCurrentRound(1);
    setIsSkipping(false);
    setVoidedIndices(new Set()); // Reset voided questions
  };

  const resetTimer = () => {
    setTimeLeft(timeLimit);
    setIsCurrentQuestionAnswered(false);
  };

  useEffect(() => {
    if (quizConfig && !quizConfig.enableTimer) return;

    let interval: ReturnType<typeof setInterval>;

    const isReviewPending = isReviewing && userAnswers[reviewIndex] === null;
    const isPlayPending = gameState === 'PLAYING' && !isCurrentQuestionAnswered;

    if ((isPlayPending || isReviewPending) && timeLeft > 0 && !isSkipping && cooldownTime === 0 && !errorDetail) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (quizConfig?.enableTimerSound && newTime > 0) {
            playTimerTick(newTime, timeLimit);
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && (isPlayPending || isReviewPending) && !isSkipping && cooldownTime === 0 && !errorDetail) {
      if (quizConfig?.enableTimerSound) playSound('timeUp');
      handleAnswer({ score: 0, isCorrect: false });
    }

    return () => clearInterval(interval);
  }, [timeLeft, gameState, isCurrentQuestionAnswered, quizConfig, timeLimit, isSkipping, cooldownTime, isReviewing, userAnswers, reviewIndex, errorDetail]);

  // Handle answers (from both Playing and Review modes)
  const handleAnswer = (result: { score: number, isCorrect: boolean, selectedIndex?: number | null, textAnswer?: string }) => {
    stopSpeech();

    const targetIndex = isReviewing ? reviewIndex : currentQuestionIndex;
    const targetTeamIdx = isReviewing ? (reviewIndex % teams.length) : currentTeamIndex;

    // Audio Feedback
    if (result.isCorrect || result.score > 0.6) {
      playSound('correct');
      vlibrasRef.current?.setEmotion('feliz');
    } else {
      playSound('wrong');
    }

    // Update Teams Score
    setTeams(prevTeams => prevTeams.map((team, index) => {
      if (index !== targetTeamIdx) return team;
      return {
        ...team,
        score: parseFloat((team.score + result.score).toFixed(1)),
        correctCount: result.isCorrect ? team.correctCount + 1 : team.correctCount,
        wrongCount: !result.isCorrect ? team.wrongCount + 1 : team.wrongCount
      };
    }));

    // Update User Answers
    const newAnswers = [...userAnswers];
    if (result.selectedIndex !== undefined) {
      newAnswers[targetIndex] = result.selectedIndex;
    } else {
      newAnswers[targetIndex] = result.textAnswer || "Respondido";
    }
    setUserAnswers(newAnswers);

    // TTS Feedback (Only in play mode generally, or if config allows)
    // Fixed: Now respects global ttsEnabled even in Tutorial Mode
    if (!isReviewing && ttsEnabled) {
      const feedback = result.score === 0 ? "Resposta incorreta." : (result.score === 1 ? "Resposta correta!" : `Parcialmente correto. ${result.score} pontos.`);
      // Pass apiKey and provider for Gemini TTS support
      speakText(feedback, ttsConfig, apiKey || undefined, undefined, provider);
    }

    // If in Play Mode, advance state
    if (!isReviewing) {
      setIsCurrentQuestionAnswered(true);
    }
  };

  const handleReplaceQuestion = async (index: number) => {
    if (!quizData || !quizConfig || !apiKey) return;
    setLoading(true);
    setLoadingMessage("Substituindo pergunta...");
    playSound('click');

    try {
      const oldQ = quizData.questions[index];
      const newQ = await generateReplacementQuestion(apiKey, quizConfig, oldQ.question, provider);

      // --- Generate audio for the replacement question if needed ---
      if (ttsEnabled && ttsConfig.engine === 'gemini') {
        setLoadingMessage("Gerando áudio da nova pergunta...");
        const teamName = quizConfig.isTeamMode ? teams[index % teams.length].name : undefined;

        // Generate single item audio via batch function for simplicity
        const miniQuiz: GeneratedQuiz = { title: "", questions: [newQ], keywords: [] };
        const processedMini = await preGenerateQuizAudio(apiKey, miniQuiz, ttsConfig, quizConfig.isTeamMode ? [teams[index % teams.length].name] : []);
        newQ.audioBase64 = processedMini.questions[0].audioBase64;
      }

      const teamIdx = index % teams.length;
      const previousAnswer = userAnswers[index];

      // Revert score stats for this question so the user can "Try Again" with the new question
      let wasCorrect = false;
      let scoreToRevert = 0;

      // Determine if previous answer was correct to deduct stats
      if (oldQ.options && oldQ.options.length > 0) {
        // MC
        if (previousAnswer === oldQ.correctAnswerIndex) {
          wasCorrect = true;
          scoreToRevert = 1;
        }
      }

      if (wasCorrect) {
        setTeams(prev => prev.map((t, i) => {
          if (i !== teamIdx) return t;
          return {
            ...t,
            score: parseFloat((t.score - scoreToRevert).toFixed(1)),
            correctCount: Math.max(0, t.correctCount - 1)
          }
        }));
      } else {
        // If it was counted as wrong, remove from wrong count
        if (previousAnswer !== null && previousAnswer !== undefined) {
          setTeams(prev => prev.map((t, i) => {
            if (i !== teamIdx) return t;
            return {
              ...t,
              wrongCount: Math.max(0, t.wrongCount - 1)
            }
          }));
        }
      }

      // Update Data
      const newQuestions = [...quizData.questions];
      newQuestions[index] = newQ;
      setQuizData({ ...quizData, questions: newQuestions });

      // Reset Answer for this index
      const newUserAnswers = [...userAnswers];
      newUserAnswers[index] = null; // Reset to allow answering
      setUserAnswers(newUserAnswers);

      // Reset Timer
      setTimeLeft(timeLimit);

    } catch (e: any) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUseHint = () => {
    if (hintsRemaining > 0) {
      setHintsRemaining(prev => prev - 1);
      setTeams(prevTeams => prevTeams.map((team, index) => {
        if (index !== currentTeamIndex) return team;
        return { ...team, hintsUsed: team.hintsUsed + 1 };
      }));
    }
  };

  const getNextDifficulty = (currentDiff: Difficulty): Difficulty => {
    if (currentDiff === Difficulty.EASY) return Difficulty.MEDIUM;
    if (currentDiff === Difficulty.MEDIUM) return Difficulty.HARD;
    return Difficulty.HARD;
  };

  const handleSkipQuestion = async () => {
    if (!quizData || !quizConfig || isSkipping || !apiKey) return;

    stopSpeech();
    setIsSkipping(true);
    playSound('click');

    try {
      const currentQ = quizData.questions[currentQuestionIndex];
      const nextDiff = getNextDifficulty(quizConfig.difficulty);
      const tempConfig = { ...quizConfig, difficulty: nextDiff };
      const newQuestion = await generateReplacementQuestion(apiKey, tempConfig, currentQ.question);

      // We are skipping, so we don't necessarily need audio for the next one immediately if we just want to show it,
      // but consistent UX says we should.
      if (ttsEnabled && ttsConfig.engine === 'gemini') {
        const teamName = quizConfig.isTeamMode ? teams[currentTeamIndex % teams.length].name : undefined;
        const miniQuiz: GeneratedQuiz = { title: "", questions: [newQuestion], keywords: [] };
        const processedMini = await preGenerateQuizAudio(apiKey, miniQuiz, ttsConfig, quizConfig.isTeamMode ? [teamName || ""] : []);
        newQuestion.audioBase64 = processedMini.questions[0].audioBase64;
      }

      const newQuestions = [...quizData.questions];
      newQuestions[currentQuestionIndex] = newQuestion;

      setQuizData({
        ...quizData,
        questions: newQuestions
      });

      resetTimer();
      setIsCurrentQuestionAnswered(false);

    } catch (e: any) {
      handleApiError(e);
      // If quota exceeded, we stop skipping state, otherwise allow retry
      setIsSkipping(false);
    } finally {
      if (cooldownTime === 0) setIsSkipping(false);
    }
  };

  const handleNextQuestion = () => {
    stopSpeech();
    playSound('next');
    if (!quizData || !quizConfig) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < quizData.questions.length && nextIndex % quizConfig.questionsPerRound === 0) {
      setGameState('ROUND_SUMMARY');
      return;
    }

    if (nextIndex < quizData.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      if (quizConfig.isTeamMode) {
        setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
      }
      resetTimer();
    } else {
      setGameState('FINISHED');
      setIsReviewing(false);
      setReviewIndex(0);
    }
  };

  const handleNextRound = () => {
    playSound('click');
    if (quizConfig?.isTeamMode) {
      setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
    }
    setCurrentRound(prev => prev + 1);
    setCurrentQuestionIndex(prev => prev + 1);
    resetTimer();
    setGameState('COUNTDOWN');
    setCountdownValue(3);
  };

  // --- ACTIONS WITH CONFIRMATION ---

  const handleResetRequest = () => {
    if (gameState === 'SETUP') {
      // No confirmation needed if already in setup
      executeReset();
    } else {
      setPendingAction('RESET');
    }
  };

  const handleLogoutRequest = () => {
    setPendingAction('LOGOUT');
  };

  const executeReset = () => {
    stopSpeech();
    setQuizData(null);
    setErrorDetail(null);
    setGameState('SETUP');
    setIsReviewing(false);
    setIsSkipping(false);
    setCooldownTime(0);
    setVoidedIndices(new Set());
    setIsTutorialMode(false);
    setSetupStep(1);
    setLoading(false);
    setPendingAction(null);
    setIsPrebuiltQuiz(false);
  };

  const executeLogout = () => {
    logout();
    setPendingAction(null);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  const getTimerStyles = () => {
    if (isCurrentQuestionAnswered && !isReviewing) return 'bg-jw-hover text-gray-400';
    const percentage = (timeLeft / timeLimit) * 100;
    if (percentage > 50) return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]';
    if (percentage > 20) return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse';
    return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-bounce';
  };

  // Get text for current TTS status
  const getTTSStatusText = () => {
    if (!ttsEnabled) return "Sem Narração";
    if (ttsConfig.engine === 'browser') return "Voz Clássica";
    return "Voz Natural";
  };

  const getTTSStatusIcon = () => {
    if (!ttsEnabled) return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-70">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
    );
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
    );
  };

  // Se não autenticado e NÃO for um quiz pré-montado, mostra Login
  if (!isAuthenticated && !isPrebuiltQuiz) {
    return (
      <>
        <LoginScreen
          title={title}
          onPlayPrebuilt={handlePlayPrebuilt}
          isLoading={loading}
          loadingMessage={loadingMessage}
          apiError={errorDetail}
          onClearError={() => setErrorDetail(null)}
          onLoginWithCode={async (code, selectedProvider) => {
            const docRef = doc(db, "auth", "config");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.secret_code === code) {
                // Obter a chave correspondente ao provedor selecionado
                let adminKey = '';
                if (selectedProvider === 'google-ai') {
                  adminKey = data.admin_key_google_ai || data.admin_key || '';
                } else if (selectedProvider === 'deepseek') {
                  adminKey = data.admin_key_deepseek || data.deepseek_key || '';
                } else if (selectedProvider === 'groq') {
                  adminKey = data.admin_key_groq || data.groq_key || '';
                } else if (selectedProvider === 'openrouter') {
                  adminKey = data.admin_key_openrouter || data.openrouter_key || '';
                }

                if (adminKey) {
                  const { validateApiKey } = await import('@avalia/services');
                  const isValid = await validateApiKey(adminKey, selectedProvider);
                  if (isValid) {
                    // Gravar o modelo padrão configurado no Firestore para o respectivo provedor (ou usar o padrão estável)
                    let defaultModel = '';
                    if (selectedProvider === 'google-ai') {
                      defaultModel = data.admin_model_google_ai || data.admin_model || 'gemini-3.5-flash';
                    } else if (selectedProvider === 'deepseek') {
                      defaultModel = data.admin_model_deepseek || 'deepseek-chat';
                    } else if (selectedProvider === 'groq') {
                      defaultModel = data.admin_model_groq || 'llama-3.3-70b-versatile';
                    } else if (selectedProvider === 'openrouter') {
                      defaultModel = data.admin_model_openrouter || 'meta-llama/llama-3.3-70b-instruct:free';
                    }
                    if (defaultModel) {
                      localStorage.setItem('gemini_text_model', defaultModel);
                    }

                    // Se for google-ai, também grava no LocalStorage o TTS e o Live configurados ou os padrões recomendados
                    if (selectedProvider === 'google-ai') {
                      const ttsModel = data.admin_model_tts || 'gemini-3.1-flash-tts-preview';
                      const liveModel = data.admin_model_live || 'gemini-3.1-flash-live-preview';
                      localStorage.setItem('gemini_tts_model', ttsModel);
                      localStorage.setItem('gemini_live_model', liveModel);
                    }

                    login(adminKey, selectedProvider);
                  } else {
                    throw new Error(`Erro técnico: A chave do administrador para o provedor ${selectedProvider} está inválida ou recusada.`);
                  }
                } else {
                  throw new Error(`Erro técnico: Chave do administrador para o provedor ${selectedProvider} não encontrada no Firestore.`);
                }
              } else {
                throw new Error('Código de acesso incorreto.');
              }
            } else {
              throw new Error('Sistema de autenticação não configurado no Firestore.');
            }
          }}
          onLoginWithApiKey={async (key, prov) => {
            const { validateApiKey } = await import('@avalia/services');
            try {
              const isValid = await validateApiKey(key, prov);
              if (isValid) {
                login(key, prov);
              } else {
                throw new Error('Chave incorreta ou recusada pelo provedor selecionado.');
              }
            } catch (err: any) {
              throw new Error(err.message || 'Chave incorreta ou recusada pelo provedor selecionado.');
            }
          }}
        />
        <CookieBanner onOpenPrivacy={() => setIsPrivacyPolicyOpen(true)} />
        <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} appName={appName} />
      </>
    );
  }

  // Calcula se o quiz está ativo para mostrar no cabeçalho ou na lógica
  const isQuizActive = gameState !== 'SETUP';

  return (
    <div className="min-h-screen bg-[#0d0d0d] font-sans text-jw-text overflow-hidden">
      {gameState === 'START_SCREEN' ? (
        <>
          <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] w-full max-w-md p-10 md:p-12 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center relative overflow-hidden">
              {/* Borda superior decorativa com brilho */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-jw-blue shadow-[0_0_15px_rgba(66,135,245,0.5)]"></div>

              {/* Ícone de Escudo em destaque */}
              <div className="w-20 h-20 bg-jw-blue/10 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 rounded-full bg-jw-blue/10 blur-xl"></div>
                <div className="relative w-14 h-14 rounded-full border border-transparent flex items-center justify-center text-jw-blue">
                  {appConfig?.customLogo || (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(66,135,245,0.6)]">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  )}
                </div>
              </div>

              <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">Aval<span style={{ color: '#F7D33C' }}>ia</span> Quiz</h1>
              <p className="text-sm text-gray-400 font-medium mb-10 text-center opacity-80">Selecione o idioma para começar o desafio.</p>

              {/* Seletor de Idioma estilo Abas */}
              <div className="w-full bg-black/40 p-2 rounded-3xl flex gap-3 mb-8 border border-white/5">
                <button
                  onClick={() => { setInterfaceLanguage('pt'); localStorage.setItem(`${storagePrefix}-lang`, 'pt'); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold text-sm ${interfaceLanguage === 'pt' ? 'bg-[#2a2a2a] text-white shadow-lg ring-1 ring-white/10' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  <img src="/brazil.svg" alt="Brasil" className="w-12 h-10 object-contain mb-1 shadow-lg rounded-sm" />
                  <span>Português</span>
                </button>
                <button
                  onClick={() => { setInterfaceLanguage('libras'); localStorage.setItem(`${storagePrefix}-lang`, 'libras'); }}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all font-bold text-sm ${interfaceLanguage === 'libras' ? 'bg-[#2a2a2a] text-white shadow-lg ring-1 ring-white/10' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  <img src="/libras.svg" alt="Libras" className="w-8 h-8 object-contain mb-1" />
                  <span>Libras</span>
                </button>
              </div>

              {/* Botão Principal */}
              <button
                onClick={() => {
                  setGameState('SETUP');
                }}
                className="w-full bg-jw-blue text-white font-bold text-base py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-jw-blue/20 flex justify-center items-center gap-3"
              >
                Iniciar
              </button>

              <div className="mt-14 text-[10px] uppercase font-bold tracking-[0.10em] text-gray-600 opacity-60">
                Nenhuma informação pessoal sua será armazenada
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className="h-screen flex flex-col font-sans bg-jw-dark text-jw-text overflow-hidden transition-all duration-700"
            style={{ zoom: zoomLevel }}
          >
            {/* GLOBAL HEADER - Fixed at Top */}
            <header className="bg-jw-blue text-white h-16 shrink-0 flex items-center shadow-lg z-20 transition-colors relative">
              <div className="container mx-auto px-4 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                  <h1 className="text-base font-semibold tracking-wide truncate">Aval<span style={{ color: '#F7D33C' }}>ia</span> Quiz</h1>
                  {isTutorialMode && (
                    <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ml-2 animate-fade-in shadow-sm hidden md:inline-block">
                      Modo Tutorial
                    </span>
                  )}
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 md:gap-4">
                  <SettingsMenu
                    open={isSettingsOpen}
                    onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
                    onClose={() => setIsSettingsOpen(false)}
                    soundEnabled={soundEnabled}
                    onToggleSound={handleSoundToggle}
                    theme={theme}
                    onThemeChange={(m) => setTheme(m)}
                    ttsMode={ttsEnabled && ttsConfig.engine === 'gemini' ? 'gemini' : 'off'}
                    onTtsChange={(m) => handleTTSSelection(m)}
                    ttsDisabled={provider === 'deepseek' || provider === 'groq' || provider === 'openrouter'}
                    zoomValue={zoomLevel}
                    onZoomIn={() => setZoomLevel(prev => Math.min(1.5, prev + 0.05))}
                    onZoomOut={() => setZoomLevel(prev => Math.max(0.75, prev - 0.05))}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                    onOpenGuide={() => { setIsSettingsOpen(false); setIsGuideOpen(true); }}
                    onGoHome={() => { setIsSettingsOpen(false); handleResetRequest(); }}
                    onLogout={handleLogoutRequest}
                    interfaceLanguage={interfaceLanguage}
                    onLanguageChange={(lang) => { setInterfaceLanguage(lang); playSound('click'); }}
                  />
                </div>
              </div>
            </header>

            {/* SPLIT-SCREEN CONTAINER - Below Header */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* VLIBRAS SECTION - Always Visible */}
              {interfaceLanguage === 'libras' && (
                <div className="w-full lg:w-1/3 h-[250px] lg:h-full bg-[#05050a] relative shrink-0 overflow-hidden animate-fade-in-down border-b lg:border-b-0 lg:border-r border-jw-blue/20">
                  {/* Avatar Container */}
                  <div className="w-full h-full relative">
                    <VLibras 
                      ref={vlibrasRef} 
                      active={true} 
                      onReady={() => setIsLibrasReady(true)}
                    />
                    
                    {/* Floating Controls Overlay */}
                    {isLibrasReady && (
                      <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-30">
                        {/* Speed Control */}
                        <button
                          onClick={() => {
                            const speeds = [0.5, 0.75, 1, 1.25, 1.5];
                            const currentSpeed = speeds.indexOf(vlibrasSpeed);
                            const nextSpeed = speeds[(currentSpeed + 1) % speeds.length];
                            setVlibrasSpeed(nextSpeed);
                            vlibrasRef.current?.setSpeed?.(nextSpeed);
                          }}
                          className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all shadow-lg hover:shadow-xl border border-white/10 group"
                          title={`Velocidade: ${vlibrasSpeed}x`}
                        >
                          <div className="relative w-5 h-5 flex items-center justify-center">
                            <span className="text-xs font-bold">{vlibrasSpeed}x</span>
                          </div>
                        </button>

                        {/* Play/Pause Toggle */}
                        <button
                          onClick={() => {
                            if (vlibrasPlaying) {
                              vlibrasRef.current?.pause?.();
                              setVlibrasPlaying(false);
                            } else {
                              vlibrasRef.current?.continue?.();
                              setVlibrasPlaying(true);
                            }
                          }}
                          className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all shadow-lg hover:shadow-xl border border-white/10"
                          title={vlibrasPlaying ? 'Pausar' : 'Reproduzir'}
                        >
                          {vlibrasPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>

                        {/* Avatar Selector */}
                        <button
                          onClick={() => {
                            const avatars = ['icaro', 'hosana', 'guga'];
                            const currentAvatar = avatars.indexOf(vlibrasAvatar);
                            const nextAvatar = avatars[(currentAvatar + 1) % avatars.length];
                            console.log('[GameEngine] Changing avatar from', vlibrasAvatar, 'to', nextAvatar);
                            console.log('[GameEngine] vlibrasRef.current:', vlibrasRef.current);
                            setVlibrasAvatar(nextAvatar);
                            if (vlibrasRef.current?.changeAvatar) {
                              vlibrasRef.current.changeAvatar(nextAvatar);
                            } else {
                              console.error('[GameEngine] vlibrasRef.current.changeAvatar is not available');
                            }
                          }}
                          className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all shadow-lg hover:shadow-xl border border-white/10"
                          title={`Avatar: ${vlibrasAvatar}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </button>

                        {/* Replay */}
                        <button
                          onClick={() => {
                            vlibrasRef.current?.repeat?.();
                          }}
                          className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all shadow-lg hover:shadow-xl border border-white/10"
                          title="Repetir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MAIN CONTENT SECTION */}
              <div className={`relative z-10 flex flex-col flex-1 overflow-y-auto scroll-smooth custom-scrollbar ${
                interfaceLanguage === 'libras' ? 'h-auto lg:h-full' : 'h-full'
              }`}>
      {/* LOADING SCREEN OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col items-center justify-center animate-fade-in text-center px-4 cursor-wait">
          <div className="relative mb-8">
            {/* Background ring */}
            <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-gray-800 rounded-full"></div>
            {/* Spinning indicator */}
            <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-t-jw-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-6 tracking-wide">Iniciando Partida...</h2>
          <p className="text-gray-400 text-sm md:text-base max-w-lg italic font-serif opacity-80 leading-relaxed animate-pulse">
            "{loadingMessage}"
          </p>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {pendingAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-jw-card max-w-sm w-full rounded-2xl shadow-2xl border border-gray-700 overflow-hidden transform transition-all scale-100 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <h3 className="text-xl font-bold text-jw-text mb-2">
                {pendingAction === 'LOGOUT' ? 'Sair do Aplicativo?' :
                  pendingAction === 'RESET' ? 'Reiniciar Jogo?' :
                    'Limpar Histórico?'}
              </h3>
              <p className="text-sm opacity-70 leading-relaxed">
                {pendingAction === 'LOGOUT'
                  ? 'Deseja realmente sair? Você precisará inserir sua chave novamente.'
                  : pendingAction === 'RESET'
                    ? 'Todo o progresso da partida atual será perdido.'
                    : 'Isso limpará o histórico de focos temáticos usados recentemente.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelPendingAction}
                className="flex-1 py-3 bg-jw-hover text-jw-text rounded-lg font-medium hover:bg-opacity-80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={pendingAction === 'LOGOUT' ? executeLogout :
                  pendingAction === 'RESET' ? executeReset :
                    handleClearHistory}
                className={`flex-1 py-3 text-white rounded-lg font-bold shadow-lg hover:bg-opacity-90 transition-colors ${pendingAction === 'LOGOUT' ? 'bg-red-600' : 'bg-jw-blue'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOUR OVERLAY */}
      <TourOverlay
        steps={TOUR_STEPS}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => {
          setIsGuideOpen(false);
          setTimeout(handleStartTutorial, 100);
        }}
      />

      {/* ERROR MODAL */}
      {errorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-jw-card max-w-md w-full rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden">
            <div className="bg-red-900/20 p-6 border-b border-red-500/20 flex items-start gap-4">
              <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-200">{errorDetail.title}</h3>
                <p className="text-red-300/70 text-sm font-mono mt-1">Código: {errorDetail.code}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-jw-text opacity-90 leading-relaxed">{errorDetail.message}</p>
              <div className="bg-jw-hover p-4 rounded-lg text-sm opacity-80 border border-gray-600/30">
                <strong>Sugestão:</strong> {errorDetail.solution}
              </div>
              <button
                onClick={() => setErrorDetail(null)}
                className="w-full py-3 bg-jw-blue hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors shadow-lg"
              >
                Entendido
              </button>
              {['429', '403', 'NO_KEY'].includes(errorDetail.code) && (
                <button
                  onClick={() => { setErrorDetail(null); logout(); }}
                  className="w-full py-3 mt-2 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-bold rounded-lg transition-colors"
                >
                  Usar Outra Chave de API
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GAME STATUS BAR (Round & Team) */}
      {gameState === 'PLAYING' && quizData && (
        <div className="bg-jw-card border-b border-gray-700/20 py-2 shadow-sm z-10 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 flex justify-between items-center text-xs md:text-sm w-full overflow-x-auto scrollbar-hide">
            <span className="opacity-70 font-mono whitespace-nowrap mr-4">Rodada {currentRound}</span>
            <div className="flex gap-4">
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all whitespace-nowrap border-2 ${idx === currentTeamIndex ? 'text-white font-bold ring-2 ring-offset-2 ring-offset-jw-dark' : 'opacity-50 border-transparent bg-transparent'}`}
                  style={{
                    backgroundColor: idx === currentTeamIndex ? t.color : 'transparent',
                    borderColor: idx === currentTeamIndex ? t.color : 'transparent',
                    '--tw-ring-color': t.color
                  } as React.CSSProperties}
                >
                  <span>{t.name}</span>
                  <span className="bg-black/20 px-1.5 rounded">{t.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      {gameState === 'PLAYING' && quizData && (
        <div className="container mx-auto px-4 md:px-6 pt-4 shrink-0 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 flex gap-1 h-1 mr-4 md:mr-20">
              {quizData.questions.map((_, idx) => {
                let bgColor = 'bg-jw-hover';
                if (idx < currentQuestionIndex) bgColor = 'bg-jw-blue';
                if (idx === currentQuestionIndex) bgColor = theme === 'dark' ? 'bg-white' : 'bg-gray-800';
                return (<div key={idx} className={`flex-1 rounded-full h-full ${bgColor} transition-colors duration-300`}></div>)
              })}
            </div>
            <div className="flex items-center text-xs font-mono opacity-60"><span>{currentQuestionIndex + 1}/{quizData.questions.length}</span></div>
          </div>
        </div>
      )}

      {/* TIMER */}
      {quizConfig?.enableTimer && (gameState === 'PLAYING' || (isReviewing && userAnswers[reviewIndex] === null)) && (
        <div className={`fixed top-24 right-4 md:right-6 px-3 py-1 md:px-4 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg transition-all duration-300 z-40 flex items-center gap-2 ${getTimerStyles()}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-mono">{timeLeft}s</span>
        </div>
      )}

        {/* MAIN CONTENT */}
        <main className="flex-1 container mx-auto px-4 md:px-6 flex flex-col justify-center relative pb-10 min-h-[max-content]">

                {/* SETUP */}
                {gameState === 'SETUP' && (
                  <div className={`flex flex-col items-center max-w-2xl mx-auto w-full animate-fade-in py-6 md:py-10 transition-all duration-500`}>
                    <div className="w-full space-y-6">
                      <div className="text-center mb-6 md:mb-10 px-2">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                          {interfaceLanguage === 'libras' ? 'Configurar Quiz' : 'Teste seu Conhecimento'}
                        </h2>
                        <p className="text-sm md:text-lg text-gray-300">
                          {interfaceLanguage === 'libras'
                            ? 'Siga as orientações do tradutor ao lado para configurar seu jogo personalizado.'
                            : 'Selecione os parâmetros abaixo para gerar um quiz personalizado.'}
                        </p>
                      </div>
                      <div className="bg-jw-dark border border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative min-h-[300px] flex items-center justify-center">
                        {(interfaceLanguage !== 'libras' || isLibrasReady) ? (
                          <div className="w-full max-w-2xl space-y-6">
                            <SetupForm appConfig={appConfig}
                              onGenerate={handleGenerate}
                              isLoading={loading}
                              ttsEnabled={ttsEnabled}
                              forcedStep={setupStep}
                              onStepChange={(step) => setSetupStep(step)}
                              usedTopics={usedTopics}
                              onClearHistory={() => setPendingAction('CLEAR_HISTORY')}
                              isPrebuiltQuiz={isPrebuiltQuiz}
                              availableThemes={availableThemes}
                              onPlayGlosa={playGlosaSegura}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 animate-pulse">
                            <div className="w-12 h-12 border-4 border-jw-blue/30 border-t-jw-blue rounded-full animate-spin"></div>
                            <p className="text-jw-text opacity-50 font-medium text-center">Iniciando tradutor de Libras...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* READY CHECK (CONFIRMATION SCREEN) */}
                <ReadyCheck
                  isVisible={gameState === 'READY_CHECK' && !!quizData}
                  title={quizData?.title || ''}
                  onConfirm={handleConfirmStart}
                  onDiscard={handleResetRequest}
                  openEndedMode={quizConfig?.openEndedMode ?? 'normal'}
                  apiKey={apiKey}
                  provider={provider}
                />

                {/* COUNTDOWN */}
                {gameState === 'COUNTDOWN' && (
                  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in transition-colors duration-500" style={{ backgroundColor: teams[currentTeamIndex]?.color || '#4287f5' }}>
                    <div key={countdownValue} className="text-[12rem] md:text-[16rem] font-black text-white/20 animate-ping absolute scale-150">{countdownValue > 0 ? countdownValue : "JÁ!"}</div>
                    <div key={`static-${countdownValue}`} className="text-[8rem] md:text-[10rem] font-black text-white relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-bounce-short">{countdownValue > 0 ? countdownValue : "JÁ!"}</div>
                    <div className="mt-8 flex flex-col items-center">
                      <p className="text-xl opacity-80 uppercase tracking-[0.5em] font-light text-white mb-2">Prepare-se</p>
                      <div className="text-4xl font-bold text-white bg-black/20 px-6 py-2 rounded-xl">{teams[currentTeamIndex]?.name}</div>
                    </div>
                  </div>
                )}

                {/* PLAYING */}
                {gameState === 'PLAYING' && quizData && (
                  <div className="flex-1 flex flex-col justify-center py-6 md:py-10 animate-fade-in">
                    <QuizCard
                      key={quizData.questions[currentQuestionIndex].id}
                      question={quizData.questions[currentQuestionIndex]}
                      index={currentQuestionIndex}
                      total={quizData.questions.length}
                      timeLeft={timeLeft}
                      onAnswer={(res) => { handleAnswer(res); handleAnswerLibrasEmotion(res.isCorrect); }}
                      isTimeUp={quizConfig?.enableTimer && timeLeft === 0}
                      hintsRemaining={hintsRemaining}
                      onRevealHint={handleUseHint}
                      activeTeamName={quizConfig?.isTeamMode ? teams[currentTeamIndex].name : undefined}
                      activeTeamColor={quizConfig?.isTeamMode ? teams[currentTeamIndex].color : undefined}
                      onVoid={() => handleReplaceQuestion(currentQuestionIndex)}
                      ttsConfig={ttsConfig}
                      allowAskAi={quizConfig?.hintTypes.includes(HintType.ASK_AI)}
                      allowStandardHint={quizConfig?.hintTypes.includes(HintType.STANDARD)}
                      onSkip={handleSkipQuestion}
                      isSkipping={isSkipping}
                      apiKey={apiKey}
                      provider={provider}
                      interfaceLanguage={interfaceLanguage}
                      openEndedMode={quizConfig?.openEndedMode ?? 'normal'}
                    />
                  </div>
                )}

                {/* ROUND SUMMARY */}
                {gameState === 'ROUND_SUMMARY' && (
                  <div className="animate-fade-in py-10 w-full max-w-3xl mx-auto flex flex-col items-center justify-center">
                    <div className="bg-jw-card p-6 md:p-10 rounded-2xl shadow-2xl text-center border border-gray-700/50 w-full">
                      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-jw-blue">Fim da Rodada {currentRound}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {teams.map(t => (
                          <div key={t.id} className="bg-jw-hover p-4 rounded-lg border-l-4" style={{ borderLeftColor: t.color }}>
                            <h3 className="font-bold text-lg mb-2">{t.name}</h3>
                            <div className="text-4xl font-bold text-jw-text mb-1">{t.score}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleNextRound} className="bg-jw-blue text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Próxima Rodada</button>
                    </div>
                  </div>
                )}

                {/* FINISHED */}
                {gameState === 'FINISHED' && quizData && (
                  <div className="animate-fade-in py-10 w-full max-w-5xl mx-auto flex flex-col items-center">
                    {!isReviewing && (
                      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-center">
                        <div className="bg-jw-card border border-jw-hover rounded-2xl p-6 md:p-8 shadow-xl md:col-span-2">
                          <h3 className="opacity-60 uppercase tracking-widest text-sm font-bold mb-4">Placar Final</h3>
                          <div className="flex flex-col md:flex-row gap-6 justify-center">
                            {teams.map(t => (
                              <div key={t.id} className="flex-1 bg-black/20 p-6 rounded-2xl border-b-4" style={{ borderBottomColor: t.color }}>
                                <div className="text-xs font-bold uppercase mb-2 opacity-50">{t.name}</div>
                                <div className="flex items-baseline justify-center gap-2">
                                  <span className="text-5xl font-black text-white">{t.correctCount}</span>
                                  <span className="text-2xl font-bold text-white/40">/ {quizData.questions.length}</span>
                                </div>
                                <div className="mt-3 flex justify-center gap-4 text-sm">
                                  <span className="text-green-400">Acertos: {t.correctCount}</span>
                                  <span className="text-red-400">Erros: {t.wrongCount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-row flex-wrap items-center justify-center gap-3 w-full mt-6 md:col-span-2">
                          <button onClick={() => { setIsReviewing(true); setReviewIndex(0); }} className="py-3 px-6 bg-jw-card border border-gray-700/50 text-jw-text rounded-full font-bold hover:bg-jw-hover transition-all whitespace-nowrap">Revisar Respostas</button>
                          <button onClick={handleRestartSameSettings} className="py-3 px-6 bg-green-600 text-white rounded-full font-bold hover:bg-green-500 transition-all shadow-lg whitespace-nowrap">Jogar Novamente</button>
                          <button onClick={handleResetRequest} className="py-3 px-6 bg-jw-blue text-white rounded-full font-bold hover:bg-opacity-90 transition-all shadow-lg whitespace-nowrap">Novo Quiz</button>
                        </div>
                      </div>
                    )}
                    {isReviewing && (
                      <div className="w-full flex flex-col h-full animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-jw-text">Revisão: Pergunta {reviewIndex + 1}</h2>
                          <button onClick={() => setIsReviewing(false)} className="opacity-60 hover:opacity-100">Fechar</button>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <QuizCard
                            key={quizData.questions[reviewIndex].id}
                            question={quizData.questions[reviewIndex]}
                            index={reviewIndex}
                            total={quizData.questions.length}
                            showAnswerKey={userAnswers[reviewIndex] !== null}
                            forceSelectedOption={typeof userAnswers[reviewIndex] === 'number' ? userAnswers[reviewIndex] as number : null}
                            ttsConfig={ttsConfig}
                            onAnswer={(res) => { handleAnswer(res); handleAnswerLibrasEmotion(res.isCorrect); }}
                            apiKey={apiKey}
                            interfaceLanguage={interfaceLanguage}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-8 pb-4">
                          <button onClick={() => { if (reviewIndex > 0) setReviewIndex(i => i - 1) }} disabled={reviewIndex === 0} className="px-6 py-3 bg-jw-hover text-jw-text rounded-full disabled:opacity-30">Anterior</button>
                          <button onClick={() => setIsReviewing(false)} className="opacity-50 hover:opacity-100">Voltar</button>
                          <button onClick={() => { if (reviewIndex < quizData.questions.length - 1) setReviewIndex(i => i + 1) }} disabled={reviewIndex === quizData.questions.length - 1} className="px-6 py-3 bg-jw-hover text-jw-text rounded-full disabled:opacity-30">Próximo</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>

              <footer className="w-full shrink-0 py-6 text-center text-[10px] opacity-40 hover:opacity-100 transition-opacity flex flex-col gap-1 pb-24 md:pb-12 border-t border-white/5 font-sans">
                <button onClick={handleLogoutRequest} className="hover:text-red-400 underline">Alterar Chave API / Sair</button>
                <div className="flex flex-col gap-0.5">
                  <span>Versão: 1.4.0-beta</span>
                  <span>Copyright © Paulo Jacomelli 2026</span>
                </div>
              </footer>
            </div> {/* Fim Main Content Section */}

            </div> {/* Fim Split-Screen Container */}
          </div> {/* Fim h-screen Container */}
        </>
      )}

      {/* FAB Next — oculto no modo Live (avanço automático) */}
      {gameState === 'PLAYING' && isCurrentQuestionAnswered && quizConfig?.openEndedMode !== 'live' && (
        <div className="fixed bottom-8 right-4 md:right-8 z-50 animate-fade-in-up">
          <button onClick={handleNextQuestion} className="bg-jw-blue text-white font-bold py-3 px-6 md:px-8 rounded-full shadow-lg hover:bg-white hover:text-jw-blue transition-all transform active:scale-95 flex items-center gap-2 text-sm md:text-base">
            {(currentQuestionIndex < (quizData?.questions.length || 0) - 1) && ((currentQuestionIndex + 1) % (quizConfig?.questionsPerRound || 999) !== 0) ? 'Avançar' : 'Concluir Fase'}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </button>
        </div>
      )}


      <CookieBanner onOpenPrivacy={() => setIsPrivacyPolicyOpen(true)} />
      <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} appName={appName} />
    </div>
  );
}


