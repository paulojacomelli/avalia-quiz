import { useState, useEffect, useCallback, useRef } from 'react';
import { TTSConfig, GeneratedQuiz, Team, QuizConfig } from '@avalia/core';
import { speakText, stopSpeech, getQuestionReadAloudText } from '@avalia/services';

interface UseNarrationProps {
  storagePrefix: string;
  provider?: string;
  apiKey?: string | null;
  gameState: string;
  quizData: GeneratedQuiz | null;
  quizConfig: QuizConfig | null;
  currentQuestionIndex: number;
  teams: Team[];
  currentTeamIndex: number;
  isCurrentQuestionAnswered: boolean;
  isSkipping: boolean;
  cooldownTime: number;
}

export function useNarration({
  storagePrefix,
  provider,
  apiKey,
  gameState,
  quizData,
  quizConfig,
  currentQuestionIndex,
  teams,
  currentTeamIndex,
  isCurrentQuestionAnswered,
  isSkipping,
  cooldownTime
}: UseNarrationProps) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: false,
    autoRead: true,
    engine: 'gemini',
    gender: 'female',
    rate: 1.5,
    volume: 1.0
  });
  const [isTTSMenuOpen, setIsTTSMenuOpen] = useState(false);

  // Initialize from storage
  useEffect(() => {
    const savedTTS = localStorage.getItem(`${storagePrefix}-tts`);
    const isTTSActive = (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') ? false : savedTTS === 'true';
    setTtsEnabled(isTTSActive);
    
    setTtsConfig(prev => ({
      ...prev,
      enabled: isTTSActive
    }));
  }, [storagePrefix, provider]);

  // Helper to centralize TTS config updates
  const updateTTSConfig = useCallback((engine: 'gemini', enabled: boolean) => {
    const newConfig: TTSConfig = {
      enabled: enabled,
      autoRead: true,
      engine: engine,
      gender: 'female',
      rate: 1.5,
      volume: 1.0
    };
    setTtsConfig(newConfig);
    localStorage.setItem(`${storagePrefix}-tts-engine`, engine);
  }, [storagePrefix]);

  const handleTTSSelection = useCallback((selection: 'gemini' | 'off') => {
    if (selection === 'off') {
      setTtsEnabled(false);
      localStorage.setItem(`${storagePrefix}-tts`, 'false');
      stopSpeech();
    } else {
      if (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') return;
      setTtsEnabled(true);
      localStorage.setItem(`${storagePrefix}-tts`, 'true');
      updateTTSConfig('gemini', true);
    }
    setIsTTSMenuOpen(false);
  }, [storagePrefix, provider, updateTTSConfig]);

  // Force disable for specific providers
  useEffect(() => {
    if ((provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') && ttsEnabled) {
      setTtsEnabled(false);
      localStorage.setItem(`${storagePrefix}-tts`, 'false');
      stopSpeech();
    }
  }, [provider, ttsEnabled, storagePrefix]);

  // Narration Effect
  useEffect(() => {
    const shouldRead = ttsEnabled && ttsConfig.autoRead;

    if (gameState === 'PLAYING' && quizData && shouldRead && !isCurrentQuestionAnswered && !isSkipping && cooldownTime === 0) {
      const timeout = setTimeout(() => {
        const q = quizData.questions[currentQuestionIndex];
        const teamIntro = quizConfig?.isTeamMode ? teams[currentTeamIndex].name : undefined;

        const textToRead = getQuestionReadAloudText(q, teamIntro);
        speakText(textToRead, ttsConfig, apiKey || undefined, q.audioBase64, undefined, q.audioUrl);
      }, 500);
      
      return () => {
        clearTimeout(timeout);
        stopSpeech();
      };
    }
  }, [currentQuestionIndex, gameState, quizData, isCurrentQuestionAnswered, isSkipping, ttsEnabled, ttsConfig, cooldownTime, apiKey, quizConfig, teams, currentTeamIndex]);

  return {
    ttsEnabled,
    setTtsEnabled,
    ttsConfig,
    setTtsConfig,
    isTTSMenuOpen,
    setIsTTSMenuOpen,
    handleTTSSelection,
    updateTTSConfig
  };
}
