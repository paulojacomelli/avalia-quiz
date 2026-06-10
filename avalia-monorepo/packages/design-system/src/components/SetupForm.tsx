import React, { useState, useEffect } from 'react';
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, HINT_TYPE_OPTIONS, FORMAT_OPTIONS, SUB_TOPICS, TIME_OPTIONS } from '@avalia/core';
import { Difficulty, QuizConfig, TopicMode, HintType, QuizFormat } from '@avalia/core';
import { playSound } from '@avalia/services';
import { stopSpeech } from '@avalia/services';

interface SetupFormProps {
  appConfig?: any;
  onGenerate: (config: QuizConfig) => void;
  isLoading: boolean;
  ttsEnabled: boolean;
  forcedStep?: number;
  onStepChange?: (step: number) => void;
  usedTopics?: string[];
  onClearHistory?: () => void;
  isPrebuiltQuiz?: boolean;
  availableThemes?: Record<string, string[]>;
  interfaceLanguage?: 'pt' | 'libras';
  highlightedValue?: string;
  onPlayGlosa?: (glosa: string, emotion?: string) => void;
}

const OPTION_GLOSAS: Record<string, string> = {
  // Categorias / Temas
  'GENERAL': 'GERAL',
  'BOOKS': 'BIBLIA LIVRO',
  'HISTORY_JW': 'HISTORIA',
  'ACADEMIC': 'ESTUDAR',
  'ENTERTAINMENT': 'JOGAR',
  'ARTS_CULTURE': 'ARTE',
  'GEOPOLITICS': 'GEOPOLITICA',
  'ANIMALS': 'ANIMAL',
  'OTHER': 'OUTRO',

  // Dificuldades
  'easy': 'FACIL',
  'medium': 'BOM',
  'hard': 'DIFICIL',

  // Formatos
  'multiple_choice': 'PERGUNTA',
  'true_false': 'VERDADEIRO FALSO',
  'open_ended': 'RESPOSTA',

  // Tipos de dicas
  'standard': 'DICA',
  'ask_ai': 'CONVERSAR',
};

export const SetupForm: React.FC<SetupFormProps> = ({
  appConfig,
  onGenerate,
  isLoading,
  ttsEnabled,
  forcedStep,
  onStepChange,
  usedTopics = [],
  onClearHistory,
  isPrebuiltQuiz = false,
  availableThemes = {},
  interfaceLanguage = 'pt',
  highlightedValue,
  onPlayGlosa
}) => {
  // --- Wizard State ---
  const [internalStep, setInternalStep] = useState(1);
  const [librasStep, setLibrasStep] = useState(1); 
  const TOTAL_STEPS = interfaceLanguage === 'libras' ? 8 : 3;

  useEffect(() => {
    if (forcedStep !== undefined) {
      if (interfaceLanguage === 'libras') setLibrasStep(forcedStep);
      else setInternalStep(forcedStep);
    }
  }, [forcedStep, interfaceLanguage]);

  const currentStep = forcedStep !== undefined ? forcedStep : (interfaceLanguage === 'libras' ? librasStep : internalStep);

  const updateStep = (newStep: number) => {
    if (interfaceLanguage === 'libras') setLibrasStep(newStep);
    else setInternalStep(newStep);
    if (onStepChange) onStepChange(newStep);
  };

  // Se o app fornece topicModes customizados, não pré-seleciona nenhum
  const hasCustomModes = !!(appConfig?.topicModes?.length);
  const [mode, setMode] = useState<TopicMode | null>(
    hasCustomModes ? null : TopicMode.ACADEMIC
  );
  const [subTopic, setSubTopic] = useState<string>('Geral');
  const hideDomainSource = appConfig?.formRules?.hideDomainSource || false;
  const allowedPageDomains = appConfig?.formRules?.allowedPageDomains || null;
  const pageUrlPlaceholder = appConfig?.formRules?.pageUrlPlaceholder || "Ex: https://pt.wikipedia.org/wiki/React";

  const [specificTopic, setSpecificTopic] = useState<string>('');
  const [specificTopicType, setSpecificTopicType] = useState<'tema' | 'dominio' | 'pagina'>('tema');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [quizFormat, setQuizFormat] = useState<QuizFormat>(QuizFormat.MULTIPLE_CHOICE);
  const [openEndedMode, setOpenEndedMode] = useState<'normal' | 'live'>('normal');
  const [count, setCount] = useState<number>(10);
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(5);

  const [enableTimer, setEnableTimer] = useState<boolean>(true);
  const [enableTimerSound, setEnableTimerSound] = useState<boolean>(true);
  const [timeLimit, setTimeLimit] = useState<number>(60);

  const [maxHints, setMaxHints] = useState<number>(3);
  const [hintTypes, setHintTypes] = useState<HintType[]>([HintType.STANDARD]);

  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(['Time A', 'Time B']);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (questionsPerRound > count) setQuestionsPerRound(count);
  }, [count, questionsPerRound]);

  const validateStep1 = () => {
    if (!mode) {
      setFormError("Por favor, selecione um tema para continuar.");
      return false;
    }
    if (mode === TopicMode.OTHER) {
      if (!specificTopic.trim()) {
        setFormError(
          specificTopicType === 'tema' ? "Por favor, digite o assunto específico." :
          specificTopicType === 'dominio' ? "Por favor, insira o domínio." :
          "Por favor, insira o link da página."
        );
        return false;
      }
      if (specificTopicType === 'pagina' && allowedPageDomains && allowedPageDomains.length > 0) {
        try {
          const url = new URL(specificTopic);
          const isValidDomain = allowedPageDomains.some((d: string) => url.hostname === d || url.hostname.endsWith(`.${d}`));
          if (!isValidDomain) {
            setFormError(`Apenas links permitidos: ${allowedPageDomains.join(', ')}`);
            return false;
          }
        } catch (e) {
          setFormError("Por favor, insira uma URL válida.");
          return false;
        }
      }
    }
    setFormError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    playSound('click');
    if (currentStep < TOTAL_STEPS) {
      if (interfaceLanguage === 'libras') {
        if (currentStep === 1) {
          if (mode === TopicMode.OTHER) updateStep(3);
          else updateStep(4);
        } else if (currentStep === 3) {
          updateStep(4);
        } else {
          updateStep(currentStep + 1);
        }
      } else {
        updateStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    playSound('click');
    if (currentStep > 1) {
      if (interfaceLanguage === 'libras') {
        if (currentStep === 4) {
          if (mode === TopicMode.OTHER) updateStep(3);
          else updateStep(1);
        } else if (currentStep === 3) {
          updateStep(1);
        } else {
          updateStep(currentStep - 1);
        }
      } else {
        updateStep(currentStep - 1);
      }
    }
  };

  const handleFinalSubmit = () => {
    stopSpeech();
    onGenerate({
      mode: mode!,
      subTopic: mode !== TopicMode.OTHER ? subTopic : undefined,
      specificTopic: mode === TopicMode.OTHER ? (
        specificTopicType === 'dominio' ? `DOMAIN:${specificTopic}` :
        specificTopicType === 'pagina' ? `LINK:${specificTopic}` :
        specificTopic
      ) : undefined,
      difficulty,
      temperature,
      quizFormat,
      openEndedMode: quizFormat === QuizFormat.OPEN_ENDED ? openEndedMode : undefined,
      count,
      enableTimer,
      enableTimerSound,
      timeLimit: enableTimer ? timeLimit : 0,
      maxHints,
      hintTypes: hintTypes.length > 0 ? hintTypes : [HintType.STANDARD],
      isTeamMode,
      teams: isTeamMode ? teamNames : [],
      questionsPerRound: isTeamMode ? questionsPerRound : count,
      systemPrompt: appConfig?.systemPrompt ?? undefined,
      tts: {
        enabled: false,
        autoRead: true,
        engine: 'gemini',
        gender: 'female',
        rate: 1.5,
        volume: 1.0
      }
    });
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < TOTAL_STEPS) handleNextStep();
    else handleFinalSubmit();
  };

  const toggleHintType = (type: HintType) => {
    setHintTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  return (
    <div id="setup-form-container" className="w-full max-w-2xl mx-auto bg-jw-card p-4 md:p-8 rounded-xl shadow-2xl border border-gray-700/30 transition-colors duration-300">
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">
          <span className={currentStep >= 1 ? 'text-jw-blue' : ''}>{isPrebuiltQuiz ? '1. Iniciar' : '1. Conteúdo'}</span>
          <span className={currentStep >= 2 ? 'text-jw-blue' : ''}>2. Configurações</span>
          <span className={currentStep >= 3 ? 'text-jw-blue' : ''}>3. Ajudas</span>
        </div>
        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-jw-blue transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={onFormSubmit} className="space-y-6">
        {/* STEP 1: CONTEÚDO */}
        {((interfaceLanguage === 'pt' && currentStep === 1) || (interfaceLanguage === 'libras' && (currentStep === 1 || currentStep === 3))) && (
          <div className="space-y-6 animate-fade-in">
            {isPrebuiltQuiz ? (
              <>
                <div id="field-mode">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 italic text-jw-blue">Biblioteca da Comunidade: Escolha uma Categoria</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(appConfig?.topicModes || MODE_OPTIONS).filter((opt: any) =>
                      availableThemes[opt.value] !== undefined || Object.keys(availableThemes).length === 0
                    ).map((opt: any) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseEnter={() => playSound('hover')}
                        onClick={() => {
                          setMode(opt.value as TopicMode);
                          if (availableThemes[opt.value] && availableThemes[opt.value].length > 0) {
                            setSubTopic(availableThemes[opt.value][0]);
                          } else if (opt.subtopics && opt.subtopics.length > 0) {
                            setSubTopic(opt.subtopics[0]);
                          } else {
                            setSubTopic('Geral');
                          }
                          if (interfaceLanguage === 'libras') {
                            if (onPlayGlosa) {
                              const glosa = OPTION_GLOSAS[opt.value] || opt.label.toUpperCase();
                              onPlayGlosa(glosa, 'feliz');
                            }
                            handleNextStep();
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${mode === opt.value
                          ? 'bg-jw-blue border-jw-blue text-white shadow-lg shadow-jw-blue/30 transform scale-[1.02]'
                          : 'border-gray-700/20 bg-jw-hover/50 text-gray-400 dark:text-gray-500 hover:border-gray-500/50'
                          } ${highlightedValue === opt.value ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-2 ${mode === opt.value ? 'text-white' : 'opacity-60'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                        </svg>
                        <span className={`text-xs font-bold text-center ${mode === opt.value ? 'text-white' : ''}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const selectedModeConfig = (appConfig?.topicModes || MODE_OPTIONS).find((m: any) => m.value === mode);
                  const isCustomInput = selectedModeConfig?.hasCustomInput || mode === TopicMode.OTHER;
                  const themes = availableThemes[mode];
                  if (!isCustomInput && themes && themes.length > 0) {
                    return (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Subtemas Disponíveis</label>
                        <div className="relative">
                          <select
                            value={subTopic}
                            onChange={(e) => setSubTopic(e.target.value)}
                            className="w-full p-3 pr-10 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none appearance-none"
                          >
                            {themes.map((st: string) => (<option key={st} value={st}>{st}</option>))}
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <p className="text-center text-xs opacity-50 mt-4">
                  Clique em "Próximo" para jogar um quiz já gerado por outro usuário!
                </p>
              </>
            ) : (
              <>
                <div id="field-mode">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Escolha um Tema Principal</label>
                  <div className="grid grid-cols-2 gap-4">
                    {(appConfig?.topicModes || MODE_OPTIONS).map((opt: any) => (
                      <button
                        key={opt.value} type="button" onMouseEnter={() => playSound('hover')}
                        onClick={() => {
                          setMode(opt.value as TopicMode);
                          if (opt.hasCustomInput || opt.value === TopicMode.OTHER) {
                            // custom input mode, don't set subtopic
                          } else if (opt.subtopics && opt.subtopics.length > 0) {
                            setSubTopic(opt.subtopics[0]);
                          } else {
                            setSubTopic('Geral');
                          }
                          if (interfaceLanguage === 'libras') handleNextStep();
                        }}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${mode === opt.value
                          ? 'bg-jw-blue border-jw-blue text-white shadow-lg shadow-jw-blue/30 transform scale-[1.02]'
                          : 'border-gray-700/20 bg-jw-hover/50 text-gray-400'
                          } ${highlightedValue === opt.value ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-3 ${mode === opt.value ? 'text-white' : 'opacity-60'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                        </svg>
                        <span className="text-sm font-bold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const selectedModeConfig = (appConfig?.topicModes || MODE_OPTIONS).find((m: any) => m.value === mode);
                  const isCustomInput = selectedModeConfig?.hasCustomInput || mode === TopicMode.OTHER;
                  const showCustomInput = isCustomInput && (interfaceLanguage === 'pt' || currentStep === 3);
                  
                  if (showCustomInput) {
                    return (
                      <div className="animate-fade-in space-y-3 mt-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Tipo de Fonte</label>
                        <div className="flex gap-2 mb-2">
                          <button type="button" onClick={() => { setSpecificTopicType('tema'); setSpecificTopic(''); setFormError(null); }} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg border transition-colors ${specificTopicType === 'tema' ? 'bg-jw-blue text-white border-transparent' : 'bg-jw-hover text-gray-400 border-gray-600'}`}>Tema</button>
                          {!hideDomainSource && (
                            <button type="button" onClick={() => { setSpecificTopicType('dominio'); setSpecificTopic(''); setFormError(null); }} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg border transition-colors ${specificTopicType === 'dominio' ? 'bg-jw-blue text-white border-transparent' : 'bg-jw-hover text-gray-400 border-gray-600'}`}>Domínio</button>
                          )}
                          <button type="button" onClick={() => { setSpecificTopicType('pagina'); setSpecificTopic(''); setFormError(null); }} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg border transition-colors ${specificTopicType === 'pagina' ? 'bg-jw-blue text-white border-transparent' : 'bg-jw-hover text-gray-400 border-gray-600'}`}>Página Específica</button>
                        </div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                          {specificTopicType === 'tema' ? (selectedModeConfig?.customInputLabel || 'Qual o assunto?') : 
                           specificTopicType === 'dominio' ? 'Insira o domínio base' : 'Insira a URL da página'}
                        </label>
                        <input
                          type={specificTopicType === 'tema' ? 'text' : 'url'}
                          value={specificTopic}
                          onChange={(e) => { setSpecificTopic(e.target.value); if (formError) setFormError(null); }}
                          placeholder={
                            specificTopicType === 'tema' ? (selectedModeConfig?.customInputPlaceholder || "Ex: História do Mundo, Ciência, Cinema...") : 
                            specificTopicType === 'dominio' ? "Ex: meudominio.com.br" : 
                            pageUrlPlaceholder
                          }
                          className="w-full p-3 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none"
                          autoFocus
                        />
                        {formError && <p className="text-red-500 text-xs mt-2 font-bold">{formError}</p>}
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const selectedModeConfig = (appConfig?.topicModes || MODE_OPTIONS).find((m: any) => m.value === mode);
                  const isCustomInput = selectedModeConfig?.hasCustomInput || mode === TopicMode.OTHER;
                  const topics = selectedModeConfig?.subtopics;
                  
                  if (!isCustomInput && topics && topics.length > 0 && (interfaceLanguage === 'pt' || currentStep === 3)) {
                    return (
                      <div className="animate-fade-in mt-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">{selectedModeConfig?.subtopicsLabel || "Escolha um Subtema"}</label>
                    <div className="relative">
                      <select
                        value={subTopic}
                        onChange={(e) => setSubTopic(e.target.value)}
                        className="w-full p-3 pr-10 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none appearance-none"
                      >
                        {topics.map((st: string) => (
                          <option key={st} value={st} className="bg-jw-card">{st}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        )}

        {/* LIBRAS STEPS 4-8 OR PT STEP 2 */}
        {((interfaceLanguage === 'libras' && currentStep >= 4) || (interfaceLanguage === 'pt' && currentStep === 2)) && (
          <div className="space-y-6 animate-fade-in">
            {(currentStep === 4 || (interfaceLanguage === 'pt' && currentStep === 2)) && (
              <div id="field-difficulty">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Dificuldade</label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex-1 cursor-pointer group" onMouseEnter={() => playSound('hover')}>
                      <input type="radio" name="difficulty" value={opt.value} checked={difficulty === opt.value} onChange={() => { setDifficulty(opt.value); if (interfaceLanguage === 'libras') handleNextStep(); }} className="sr-only" />
                      <div className={`text-center py-2 rounded-lg text-sm border transition-all ${difficulty === opt.value ? 'bg-jw-blue text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 hover:border-jw-blue/50'} ${highlightedValue === 'difficulty' && difficulty === opt.value ? 'ring-4 ring-yellow-400' : ''}`}>
                        {opt.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(currentStep === 5 || (interfaceLanguage === 'pt' && currentStep === 2)) && (
              <div id="field-creativity">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Criatividade</label>
                  <span className="text-sm font-mono text-jw-blue">{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range" min="0.5" max="1.5" step="0.1" value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none bg-gray-300 dark:bg-gray-700 accent-jw-blue ${highlightedValue === 'creativity' ? 'ring-4 ring-yellow-400' : ''}`}
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                  <span>Conservador</span>
                  <span>Equilibrado</span>
                  <span>Criativo</span>
                </div>
              </div>
            )}

            {(currentStep === 6 || (interfaceLanguage === 'pt' && currentStep === 2)) && (
              <div id="field-format" className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Formato</label>
                  <div className="flex gap-2">
                    {FORMAT_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex-1 cursor-pointer group">
                        <input type="radio" name="format" value={opt.value} checked={quizFormat === opt.value} onChange={() => setQuizFormat(opt.value as QuizFormat)} className="sr-only" />
                        <div className={`text-center py-2 rounded-lg text-sm border transition-all ${quizFormat === opt.value ? 'bg-jw-blue text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 hover:border-jw-blue/50'} ${highlightedValue === 'format' && quizFormat === opt.value ? 'ring-4 ring-yellow-400' : ''}`}>
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {quizFormat === QuizFormat.OPEN_ENDED && (
                  <div className="p-4 bg-jw-hover/20 rounded-lg animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Modo de Interação Livre</label>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer group">
                        <input type="radio" name="openEndedMode" value="normal" checked={openEndedMode === 'normal'} onChange={() => setOpenEndedMode('normal')} className="sr-only" />
                        <div className={`text-center py-2 rounded-lg text-sm border transition-all ${openEndedMode === 'normal' ? 'bg-jw-blue text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 hover:border-jw-blue/50'}`}>
                          Normal (Texto)
                        </div>
                      </label>
                      <label className="flex-1 cursor-pointer group">
                        <input type="radio" name="openEndedMode" value="live" checked={openEndedMode === 'live'} onChange={() => setOpenEndedMode('live')} className="sr-only" />
                        <div className={`text-center py-2 rounded-lg text-sm border transition-all ${openEndedMode === 'live' ? 'bg-indigo-600 text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 hover:border-indigo-500/50'}`}>
                          Live (Voz & IA)
                        </div>
                      </label>
                    </div>
                    <p className="mt-3 text-xs opacity-70 text-center">
                      {openEndedMode === 'live' 
                        ? 'A IA lerá a pergunta e aguardará sua resposta em voz alta. Você pode até pedir uma dica falando!' 
                        : 'A pergunta será exibida na tela e você avaliará sua própria resposta de texto com ajuda da IA.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(currentStep === 7 || (interfaceLanguage === 'pt' && currentStep === 2)) && (
              <div className="space-y-4">
                {/* Equipes */}
                <div id="field-team-mode" className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg">
                  <span className="text-sm font-bold">Modo Competição (Equipes)</span>
                  <button type="button" onClick={() => setIsTeamMode(!isTeamMode)} className={`w-11 h-6 rounded-full transition-colors ${isTeamMode ? 'bg-jw-blue' : 'bg-gray-500'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${isTeamMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {isTeamMode && (
                  <div className="p-4 bg-jw-hover/20 rounded-lg space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Nomes das Equipes</label>
                    {teamNames.map((name, idx) => (
                      <input 
                        key={idx} type="text" value={name} 
                        onChange={(e) => {
                          const newNames = [...teamNames];
                          newNames[idx] = e.target.value;
                          setTeamNames(newNames);
                        }}
                        className="w-full p-2 text-sm rounded bg-jw-hover border border-gray-600 focus:border-jw-blue outline-none" 
                      />
                    ))}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => teamNames.length < 4 && setTeamNames([...teamNames, `Time ${String.fromCharCode(65 + teamNames.length)}`])} className="text-xs bg-jw-blue/20 text-jw-blue px-3 py-1 rounded hover:bg-jw-blue/30 disabled:opacity-50" disabled={teamNames.length >= 4}>+ Adicionar</button>
                      <button type="button" onClick={() => teamNames.length > 2 && setTeamNames(teamNames.slice(0, -1))} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 disabled:opacity-50" disabled={teamNames.length <= 2}>- Remover</button>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-700/50">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Perguntas por Rodada: {questionsPerRound}</label>
                      <input type="range" min="1" max={count} value={questionsPerRound} onChange={(e) => setQuestionsPerRound(parseInt(e.target.value))} className="w-full h-2 rounded-lg appearance-none bg-gray-300 dark:bg-gray-700 accent-jw-blue" />
                    </div>
                  </div>
                )}

                {/* Timer */}
                <div className="space-y-2">
                  <div id="field-timer" className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg">
                    <span className="text-sm font-bold">Temporizador por Pergunta</span>
                    <button type="button" onClick={() => setEnableTimer(!enableTimer)} className={`w-11 h-6 rounded-full transition-colors ${enableTimer ? 'bg-jw-blue' : 'bg-gray-500'}`}>
                      <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${enableTimer ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {enableTimer && (
                    <div className="p-4 bg-jw-hover/20 rounded-lg space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tempo Limite</label>
                        <div className="flex gap-2">
                          {TIME_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex-1 cursor-pointer">
                              <input type="radio" name="timeLimit" value={opt.value} checked={timeLimit === opt.value} onChange={() => setTimeLimit(opt.value)} className="sr-only" />
                              <div className={`text-center py-1.5 rounded text-xs border transition-all ${timeLimit === opt.value ? 'bg-jw-blue text-white font-bold border-transparent' : 'border-gray-500 text-gray-500 hover:border-jw-blue/50'}`}>
                                {opt.label}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Count */}
                <div id="field-count">
                  <label className="block text-sm font-bold mb-2">Total de Perguntas: {count}</label>
                  <input type="range" min="5" max="50" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full h-2 rounded-lg appearance-none bg-gray-300 dark:bg-gray-700 accent-jw-blue" />
                  {isPrebuiltQuiz && <span className="text-[10px] text-jw-blue block mt-1 font-medium">Na biblioteca, você pode reduzir o total de perguntas, mas não exceder o limite do arquivo original.</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {(currentStep === 8 || (interfaceLanguage === 'pt' && currentStep === 3)) && (
          <div className="space-y-6 animate-fade-in" id="field-hints">
            {/* Hints Config */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Limite de Dicas</label>
                <span className="text-sm font-bold text-jw-blue">{maxHints}</span>
              </div>
              <input
                type="range" min="0" max="10" value={maxHints}
                onChange={(e) => setMaxHints(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Tipos de Ajuda Disponíveis</label>
              <div className="grid grid-cols-2 gap-3">
                {HINT_TYPE_OPTIONS.map((opt) => {
                  const isSelected = hintTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleHintType(opt.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${isSelected
                        ? 'bg-jw-blue text-white border-transparent shadow-md'
                        : 'bg-jw-hover border-transparent text-gray-500 dark:text-gray-400 hover:text-jw-text hover:border-gray-500'
                        } ${highlightedValue === opt.value ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                      title={opt.label}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-2 ${isSelected ? 'text-white' : 'opacity-70'}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                      </svg>
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-xs opacity-70 mt-1">
                        {opt.value === HintType.STANDARD ? "Dica direta gerada automaticamente" : "Chat interativo para tirar dúvidas"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex flex-col gap-2 pt-4 border-t border-gray-700/30">
          {(() => {
            const selectedModeConfig = (appConfig?.topicModes || []).find((m: any) => m.value === mode);
            const modeRequiresInput = selectedModeConfig?.hasCustomInput || mode === TopicMode.OTHER;
            const isStep1Blocked = currentStep === 1 && (
              !mode ||
              (modeRequiresInput && !specificTopic.trim())
            );
            return (
              <>
                {isStep1Blocked && (
                  <p className="flex items-center justify-center gap-1.5 text-center text-sm text-gray-500 animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    {!mode ? 'Selecione um tema para continuar' : 'Preencha o campo acima para continuar'}
                  </p>
                )}
                <div className="flex gap-4">
                  {currentStep > 1 && (
                    <button type="button" onClick={handlePrevStep} className="flex-1 py-3 bg-jw-hover text-jw-text font-bold rounded-full hover:bg-opacity-80 transition-colors">Voltar</button>
                  )}
                  {currentStep < TOTAL_STEPS ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isStep1Blocked}
                      className={`flex-1 py-3 font-bold rounded-full transition-colors shadow-lg ${
                        isStep1Blocked
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-jw-blue text-white hover:bg-opacity-90'
                      }`}
                    >Próximo</button>
                  ) : (
                    <button type="button" onClick={handleFinalSubmit} disabled={isLoading} className="flex-1 py-3 bg-jw-text text-jw-dark font-bold rounded-full hover:bg-opacity-90 flex justify-center items-center shadow-lg text-lg">
                      {isLoading ? "Gerando..." : "Iniciar Quiz"}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>

      </form>
    </div>
  );
};
