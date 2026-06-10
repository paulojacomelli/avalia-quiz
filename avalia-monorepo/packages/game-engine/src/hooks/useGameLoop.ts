import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GeneratedQuiz, QuizConfig, Team, ApiErrorDetail, LOADING_MESSAGES, TUTORIAL_CONFIG, TUTORIAL_DATA, Difficulty 
} from '@avalia/core';
import { 
  generateQuizContent, generateReplacementQuestion, preGenerateQuizAudio,
  playSound, playTimerTick, playCountdownTick, playGoSound, startLoadingDrone, stopLoadingDrone, resumeAudioContext,
  getGlobalKeywords, saveGeneratedQuiz, getRandomPrebuiltQuiz, getAvailableLibraryThemes, uploadQuizAudiosToStorage
} from '@avalia/services';

type GameState = 'START_SCREEN' | 'SETUP' | 'READY_CHECK' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_SUMMARY' | 'FINISHED';

interface UseGameLoopProps {
  storagePrefix: string;
  appName: string;
  apiKey: string | null;
  clientId: string | null;
  provider?: string;
  ttsEnabled: boolean;
  ttsConfig: any;
  usedTopics: string[];
  setUsedTopics: (topics: string[]) => void;
  onAnswerLibrasEmotion?: (isCorrect: boolean) => void;
  stopSpeech: () => void;
  speakText: any;
  logout: () => void;
}

export function useGameLoop({
  storagePrefix,
  appName,
  apiKey,
  clientId,
  provider,
  ttsEnabled,
  ttsConfig,
  usedTopics,
  setUsedTopics,
  onAnswerLibrasEmotion,
  stopSpeech,
  speakText,
  logout
}: UseGameLoopProps) {
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
    if (saved === 'COUNTDOWN') return _session?.quizData ? 'READY_CHECK' : 'START_SCREEN';
    return saved || 'START_SCREEN';
  });

  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(_session?.quizConfig ?? null);
  const [quizData, setQuizData] = useState<GeneratedQuiz | null>(_session?.quizData ?? null);
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState<ApiErrorDetail | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(_session?.currentQuestionIndex ?? 0);
  const [timeLimit, setTimeLimit] = useState(_session?.timeLimit ?? 60);
  const [timeLeft, setTimeLeft] = useState(_session?.timeLeft ?? 60);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>(_session?.userAnswers ?? []);
  const [isCurrentQuestionAnswered, setIsCurrentQuestionAnswered] = useState(_session?.isCurrentQuestionAnswered ?? false);

  const [isTutorialMode, setIsTutorialMode] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [voidedIndices, setVoidedIndices] = useState<Set<number>>(new Set());

  const [teams, setTeams] = useState<Team[]>(_session?.teams ?? []);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(_session?.currentTeamIndex ?? 0);
  const [currentRound, setCurrentRound] = useState(_session?.currentRound ?? 1);
  const [hintsRemaining, setHintsRemaining] = useState<number>(_session?.hintsRemaining ?? -1);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [isPrebuiltQuiz, setIsPrebuiltQuiz] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<Record<string, string[]>>({});
  const [interfaceLanguage, setInterfaceLanguage] = useState<'pt' | 'libras'>(
    (_session?.interfaceLanguage as 'pt' | 'libras') || 'pt'
  );
  
  const [pendingAction, setPendingAction] = useState<'RESET' | 'LOGOUT' | 'CLEAR_HISTORY' | null>(null);
  const [globalExclusions, setGlobalExclusions] = useState<string[]>([]);

  // --- Session Persistence ---
  useEffect(() => {
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
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  }, [
    gameState, interfaceLanguage, quizData, quizConfig,
    currentQuestionIndex, timeLimit, timeLeft, userAnswers,
    isCurrentQuestionAnswered, teams, currentTeamIndex,
    currentRound, hintsRemaining, SESSION_KEY
  ]);

  // --- Handlers ---

  const handleApiError = useCallback((err: any) => {
    const msg = (err?.message || String(err)).toLowerCase();
    let parsed: ApiErrorDetail;

    if (msg.includes('429') || msg.includes('quota')) {
      parsed = { 
        code: '429', 
        title: 'Limite Excedido', 
        message: 'A cota gratuita da API foi atingida temporariamente.', 
        solution: 'O sistema entrará em pausa por 60s.' 
      };
      setCooldownTime(60);
      stopSpeech();
    } else if (msg.includes('400') || msg.includes('403')) {
      parsed = { code: '403', title: 'Chave Inválida', message: 'A chave foi rejeitada.', solution: 'Verifique sua chave.' };
    } else if (msg.includes('safety') || msg.includes('blocked')) {
      parsed = { code: 'SAFETY', title: 'Conteúdo Bloqueado', message: 'IA recusou gerar por filtros de segurança.', solution: 'Mude o tema.' };
    } else {
      parsed = { code: 'UNKNOWN', title: 'Erro', message: msg, solution: 'Tente novamente.' };
    }
    setErrorDetail(parsed);
    setLoading(false);
  }, [stopSpeech]);

  const handlePlayPrebuilt = useCallback(async () => {
    setLoading(true);
    setLoadingMessage("Consultando temas disponíveis...");
    try {
      const themes = await getAvailableLibraryThemes(appName);
      setAvailableThemes(themes);
      setIsPrebuiltQuiz(true);
      setGameState('SETUP');
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [appName, handleApiError]);

  const handleGenerate = useCallback(async (config: QuizConfig) => {
    setLoading(true);
    setLoadingMessage(isPrebuiltQuiz ? "Buscando quiz..." : "Gerando perguntas...");
    setErrorDetail(null);
    setQuizData(null);

    try {
      resumeAudioContext();
      const finalConfig: QuizConfig = { 
        ...config, 
        tts: ttsConfig, 
        usedTopics,
        librasEnabled: interfaceLanguage === 'libras'
      };
      setQuizConfig(finalConfig);
      setTimeLimit(finalConfig.timeLimit);
      setHintsRemaining(finalConfig.maxHints);

      let tempTeams: Team[] = finalConfig.isTeamMode 
        ? finalConfig.teams.map((name, idx) => ({ 
            id: `team-${idx}`, name, color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][idx % 4], 
            score: 0, correctCount: 0, wrongCount: 0, hintsUsed: 0 
          }))
        : [{ id: 'solo', name: 'Você', color: '#4287f5', score: 0, correctCount: 0, wrongCount: 0, hintsUsed: 0 }];
      
      setTeams(tempTeams);

      let data;
      if (isPrebuiltQuiz) {
        data = await getRandomPrebuiltQuiz(appName, finalConfig.mode, finalConfig.subTopic);
        if (!data) throw new Error("Quiz não encontrado.");
        data.questions = data.questions.slice(0, finalConfig.count);
        
        if (ttsEnabled && finalConfig.tts.engine === 'gemini' && apiKey) {
          const needed = data.questions.filter(q => !q.audioUrl);
          if (needed.length > 0) {
            setLoadingMessage("Gerando áudio...");
            data = await preGenerateQuizAudio(apiKey, data, finalConfig.tts, tempTeams.map(t => t.name));
          }
        }
      } else {
        data = await generateQuizContent(apiKey!, finalConfig, globalExclusions, provider);
        if (ttsEnabled && finalConfig.tts.engine === 'gemini' && apiKey) {
          setLoadingMessage("Gerando áudio...");
          data = await preGenerateQuizAudio(apiKey, data, finalConfig.tts, tempTeams.map(t => t.name));
        }
        const docId = await saveGeneratedQuiz(
          data, 
          appName, 
          finalConfig.mode, 
          finalConfig.subTopic || finalConfig.specificTopic,
          { clientId }
        );
        if (docId && data.questions.some(q => q.audioBase64)) {
          setLoadingMessage("Salvando áudios...");
          data = await uploadQuizAudiosToStorage(data, docId);
        }
      }

      setQuizData(data);
      if (data.keywords) {
        const updated = [...data.keywords, ...usedTopics].slice(0, 50);
        setUsedTopics(updated);
        localStorage.setItem(`${storagePrefix}-used-keywords`, JSON.stringify(updated));
      }
      setGameState('READY_CHECK');
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [isPrebuiltQuiz, ttsConfig, usedTopics, apiKey, globalExclusions, ttsEnabled, handleApiError, setUsedTopics, appName, interfaceLanguage, provider, storagePrefix]);

  const handleConfirmStart = useCallback(() => {
    setGameState('COUNTDOWN');
    setCountdownValue(3);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setTimeLeft(quizConfig?.timeLimit ?? 60);
    setIsCurrentQuestionAnswered(false);
    setIsReviewing(false);
    setCurrentTeamIndex(0);
    setCurrentRound(1);
    setIsSkipping(false);
    setVoidedIndices(new Set());
    playSound('click');
    resumeAudioContext();
  }, [quizConfig, playSound]);

  const handleAnswer = useCallback((result: { score: number, isCorrect: boolean, selectedIndex?: number | null, textAnswer?: string }) => {
    stopSpeech();
    const targetIndex = isReviewing ? reviewIndex : currentQuestionIndex;
    const targetTeamIdx = isReviewing ? (reviewIndex % teams.length) : currentTeamIndex;

    playSound(result.isCorrect || result.score > 0.6 ? 'correct' : 'wrong');

    setTeams(prev => prev.map((t, i) => i === targetTeamIdx ? {
      ...t, 
      score: parseFloat((t.score + result.score).toFixed(1)),
      correctCount: result.isCorrect ? t.correctCount + 1 : t.correctCount,
      wrongCount: !result.isCorrect ? t.wrongCount + 1 : t.wrongCount
    } : t));

    const newAnswers = [...userAnswers];
    newAnswers[targetIndex] = result.selectedIndex ?? result.textAnswer ?? "Respondido";
    setUserAnswers(newAnswers);

    if (!isReviewing && ttsEnabled) {
      const feedback = result.score === 0 ? "Incorreta." : (result.score === 1 ? "Correta!" : "Parcial.");
      speakText(feedback, ttsConfig, apiKey || undefined, undefined, provider);
    }

    if (!isReviewing) setIsCurrentQuestionAnswered(true);
    if (onAnswerLibrasEmotion) onAnswerLibrasEmotion(result.isCorrect);
  }, [isReviewing, reviewIndex, teams.length, currentQuestionIndex, currentTeamIndex, playSound, userAnswers, ttsEnabled, onAnswerLibrasEmotion, stopSpeech, speakText, ttsConfig, apiKey, provider]);

  const handleNextQuestion = useCallback(() => {
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
      setIsCurrentQuestionAnswered(false);
      setTimeLeft(timeLimit);
      if (quizConfig.isTeamMode) {
        setCurrentTeamIndex(prev => (prev + 1) % teams.length);
      }
    } else {
      setGameState('FINISHED');
    }
  }, [quizData, quizConfig, currentQuestionIndex, timeLimit, teams.length, playSound, stopSpeech]);

  const handleNextRound = useCallback(() => {
    playSound('click');
    if (quizConfig?.isTeamMode) {
      setCurrentTeamIndex(prev => (prev + 1) % teams.length);
    }
    setCurrentRound(prev => prev + 1);
    setCurrentQuestionIndex(prev => prev + 1);
    setTimeLeft(timeLimit);
    setGameState('COUNTDOWN');
    setCountdownValue(3);
  }, [quizConfig, timeLimit, playSound]);

  const handleReplaceQuestion = useCallback(async (index: number) => {
    if (!quizData || !quizConfig || !apiKey) return;
    setLoading(true);
    setLoadingMessage("Substituindo pergunta...");
    playSound('click');

    try {
      const oldQ = quizData.questions[index];
      const newQ = await generateReplacementQuestion(apiKey, quizConfig, oldQ.question, provider);

      if (ttsEnabled && ttsConfig.engine === 'gemini') {
        const teamName = quizConfig.isTeamMode ? teams[index % teams.length].name : undefined;
        const mini: GeneratedQuiz = { title: "", questions: [newQ], keywords: [] };
        const processed = await preGenerateQuizAudio(apiKey, mini, ttsConfig, teamName ? [teamName] : []);
        newQ.audioBase64 = processed.questions[0].audioBase64;
      }

      const newQuestions = [...quizData.questions];
      newQuestions[index] = newQ;
      setQuizData({ ...quizData, questions: newQuestions });

      const newUserAnswers = [...userAnswers];
      newUserAnswers[index] = null;
      setUserAnswers(newUserAnswers);
      setTimeLeft(timeLimit);
      setIsCurrentQuestionAnswered(false);
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }, [quizData, quizConfig, apiKey, provider, ttsEnabled, ttsConfig, teams, userAnswers, timeLimit, playSound, handleApiError]);

  const handleSkipQuestion = useCallback(async () => {
    if (!quizData || !quizConfig || isSkipping || !apiKey) return;
    stopSpeech();
    setIsSkipping(true);
    playSound('click');

    try {
      const currentQ = quizData.questions[currentQuestionIndex];
      const nextDiff = quizConfig.difficulty === Difficulty.EASY ? Difficulty.MEDIUM : Difficulty.HARD;
      const tempConfig = { ...quizConfig, difficulty: nextDiff };
      const newQ = await generateReplacementQuestion(apiKey, tempConfig, currentQ.question, provider);

      if (ttsEnabled && ttsConfig.engine === 'gemini') {
        const teamName = quizConfig.isTeamMode ? teams[currentTeamIndex % teams.length].name : undefined;
        const mini: GeneratedQuiz = { title: "", questions: [newQ], keywords: [] };
        const processed = await preGenerateQuizAudio(apiKey, mini, ttsConfig, teamName ? [teamName] : []);
        newQ.audioBase64 = processed.questions[0].audioBase64;
      }

      const newQuestions = [...quizData.questions];
      newQuestions[currentQuestionIndex] = newQ;
      setQuizData({ ...quizData, questions: newQuestions });
      setIsCurrentQuestionAnswered(false);
      setTimeLeft(timeLimit);
    } catch (e) {
      handleApiError(e);
    } finally {
      setIsSkipping(false);
    }
  }, [quizData, quizConfig, isSkipping, apiKey, stopSpeech, playSound, provider, ttsEnabled, ttsConfig, teams, currentTeamIndex, currentQuestionIndex, timeLimit, handleApiError]);

  const handleStartTutorial = useCallback(() => {
    playSound('click');
    setLoading(true);
    setLoadingMessage("Preparando tutorial...");
    setTimeout(() => {
      setIsTutorialMode(true);
      const tutConfig = { ...TUTORIAL_CONFIG, tts: { ...TUTORIAL_CONFIG.tts, enabled: ttsEnabled } };
      setQuizConfig(tutConfig);
      setQuizData(TUTORIAL_DATA);
      setTeams([{ id: 'solo', name: 'Você', color: '#10b981', score: 0, correctCount: 0, wrongCount: 0, hintsUsed: 0 }]);
      setTimeLimit(tutConfig.timeLimit);
      setHintsRemaining(tutConfig.maxHints);
      setGameState('READY_CHECK');
      setLoading(false);
    }, 800);
  }, [ttsEnabled, playSound]);

  const executeReset = useCallback(() => {
    stopSpeech();
    setQuizData(null);
    setErrorDetail(null);
    setGameState('SETUP');
    setIsReviewing(false);
    setIsSkipping(false);
    setCooldownTime(0);
    setIsTutorialMode(false);
    setLoading(false);
    setPendingAction(null);
    setIsPrebuiltQuiz(false);
  }, [stopSpeech]);

  const handleUseHint = useCallback(() => {
    if (hintsRemaining > 0) {
      setHintsRemaining(prev => prev - 1);
      setTeams(prev => prev.map((t, i) => i === currentTeamIndex ? { ...t, hintsUsed: t.hintsUsed + 1 } : t));
    }
  }, [hintsRemaining, currentTeamIndex]);

  // --- Effects for Global Keywords ---
  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const gkw = await getGlobalKeywords(35, appName);
        setGlobalExclusions(gkw);
      } catch (err) { console.error("Global keywords failed:", err); }
    };
    fetchGlobal();
  }, [appName]);

  return {
    gameState, setGameState,
    quizConfig, setQuizConfig,
    quizData, setQuizData,
    loading, setLoading,
    errorDetail, setErrorDetail,
    currentQuestionIndex, setCurrentQuestionIndex,
    timeLimit, setTimeLimit,
    timeLeft, setTimeLeft,
    userAnswers, setUserAnswers,
    isCurrentQuestionAnswered, setIsCurrentQuestionAnswered,
    isTutorialMode, setIsTutorialMode,
    isSkipping, setIsSkipping,
    voidedIndices, setVoidedIndices,
    teams, setTeams,
    currentTeamIndex, setCurrentTeamIndex,
    currentRound, setCurrentRound,
    hintsRemaining, setHintsRemaining,
    isReviewing, setIsReviewing,
    reviewIndex, setReviewIndex,
    countdownValue,
    cooldownTime, setCooldownTime,
    loadingMessage, setLoadingMessage,
    isPrebuiltQuiz, setIsPrebuiltQuiz,
    availableThemes, setAvailableThemes,
    interfaceLanguage, setInterfaceLanguage,
    pendingAction, setPendingAction,
    handleGenerate,
    handleConfirmStart,
    handleAnswer,
    handleNextQuestion,
    handleNextRound,
    handleReplaceQuestion,
    handleSkipQuestion,
    handleStartTutorial,
    handlePlayPrebuilt,
    executeReset,
    handleUseHint
  };
}
