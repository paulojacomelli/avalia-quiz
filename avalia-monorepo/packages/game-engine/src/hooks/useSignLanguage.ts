import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GeneratedQuiz, GLOSAS_VALIDADAS, sanitizarGlosa, sanitizeGlosaStrict, loadVLibrasDictionary 
} from '@avalia/core';
import { VLibrasHandle } from '@avalia/design-system';

interface UseSignLanguageProps {
  interfaceLanguage: string;
  isLibrasReady: boolean;
  gameState: string;
  setupStep: number;
  quizData: GeneratedQuiz | null;
  currentQuestionIndex: number;
  countdownValue: number;
  onReadyChange: (ready: boolean) => void;
}

export function useSignLanguage({
  interfaceLanguage,
  isLibrasReady,
  gameState,
  setupStep,
  quizData,
  currentQuestionIndex,
  countdownValue,
  onReadyChange
}: UseSignLanguageProps) {
  const vlibrasRef = useRef<VLibrasHandle>(null);
  const [vlibrasDict, setVlibrasDict] = useState<Set<string> | null>(null);
  const [vlibrasSpeed, setVlibrasSpeed] = useState(1);
  const [vlibrasAvatar, setVlibrasAvatar] = useState('icaro');
  const [vlibrasPlaying, setVlibrasPlaying] = useState(true);

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

  // --- Dictionary Loading ---
  useEffect(() => {
    const loadDict = async () => {
      try {
        const dict = await loadVLibrasDictionary();
        setVlibrasDict(dict);
        console.log(`[SignLanguage] ✅ Dicionário carregado: ${dict.size} tokens`);
      } catch (err) {
        console.error('[SignLanguage] ❌ Falha ao carregar dicionário:', err);
      }
    };
    loadDict();
  }, []);

  const playGlosaSegura = useCallback((glosa: string, emotion?: string) => {
    if (!vlibrasRef.current || !glosa || glosa.trim().length === 0) return;

    let sanitized = glosa;
    if (vlibrasDict && vlibrasDict.size > 0) {
      sanitized = sanitizeGlosaStrict(glosa, vlibrasDict);
    } else {
      sanitized = sanitizarGlosa(glosa);
    }

    if (!sanitized || sanitized.trim().length === 0) return;

    vlibrasRef.current.play(sanitized);
    if (emotion) vlibrasRef.current.setEmotion(emotion);
  }, [vlibrasDict]);

  const handleAnswerLibrasEmotion = useCallback((isCorrect: boolean) => {
    if (interfaceLanguage === 'libras' && vlibrasRef.current) {
      vlibrasRef.current.setEmotion(isCorrect ? 'feliz' : 'triste');
      setTimeout(() => vlibrasRef.current?.setEmotion('pensa'), 3000);
    }
  }, [interfaceLanguage]);

  // --- Automated Glosas ---
  useEffect(() => {
    if (interfaceLanguage === 'libras' && isLibrasReady && gameState === 'SETUP') {
      const timer = setTimeout(() => {
        playGlosaSegura(`${GLOSAS_VALIDADAS.BOAS_VINDAS} ${GLOSAS_VALIDADAS.MODO_LIBRAS} ${GLOSAS_VALIDADAS.CONFIGURAR_QUIZ}`, 'feliz');
        setTimeout(() => {
          const stepGlosa = SETUP_GLOSAS[setupStep];
          if (stepGlosa) playGlosaSegura(stepGlosa, 'pensa');
        }, 5000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLibrasReady, interfaceLanguage, gameState, setupStep, playGlosaSegura]);

  useEffect(() => {
    if (interfaceLanguage === 'libras' && gameState === 'SETUP' && isLibrasReady) {
      const glosa = SETUP_GLOSAS[setupStep];
      if (glosa) {
        const timer = setTimeout(() => playGlosaSegura(glosa), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [setupStep, interfaceLanguage, gameState, isLibrasReady, playGlosaSegura]);

  useEffect(() => {
    if (gameState === 'PLAYING' && interfaceLanguage === 'libras' && quizData?.questions[currentQuestionIndex]) {
      const glosa = quizData.questions[currentQuestionIndex].glosa;
      if (glosa) {
        const timer = setTimeout(() => playGlosaSegura(glosa, 'duvida'), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentQuestionIndex, interfaceLanguage, gameState, quizData, playGlosaSegura]);

  useEffect(() => {
    if (gameState === 'READY_CHECK' && interfaceLanguage === 'libras' && isLibrasReady && quizData) {
      const timer = setTimeout(() => {
        playGlosaSegura(`${GLOSAS_VALIDADAS.PREPARAR} TOTAL ${quizData.questions.length} PERGUNTAS ${GLOSAS_VALIDADAS.CONFIRMAR}`, 'feliz');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, interfaceLanguage, isLibrasReady, quizData, playGlosaSegura]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN' && interfaceLanguage === 'libras' && isLibrasReady) {
      const timer = setTimeout(() => {
        if (countdownValue > 0) {
          playGlosaSegura(countdownValue === 3 ? GLOSAS_VALIDADAS.TRES : countdownValue === 2 ? GLOSAS_VALIDADAS.DOIS : GLOSAS_VALIDADAS.UM);
        } else if (countdownValue === 0) {
          playGlosaSegura(GLOSAS_VALIDADAS.JA, 'feliz');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gameState, countdownValue, interfaceLanguage, isLibrasReady, playGlosaSegura]);

  return {
    vlibrasRef,
    vlibrasSpeed, setVlibrasSpeed,
    vlibrasAvatar, setVlibrasAvatar,
    vlibrasPlaying, setVlibrasPlaying,
    playGlosaSegura,
    handleAnswerLibrasEmotion
  };
}
