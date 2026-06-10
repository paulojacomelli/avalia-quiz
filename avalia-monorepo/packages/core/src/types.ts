
export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Médio',
  HARD = 'Difícil'
}

export enum TopicMode {
  ACADEMIC = 'Acadêmico',
  ENTERTAINMENT = 'Entretenimento',
  ARTS_CULTURE = 'Arte & Cultura',
  GEOPOLITICS = 'Geopolítica',
  ANIMALS = 'Mundo Animal',
  OTHER = 'Outro Assunto'
}

export enum QuizFormat {
  MULTIPLE_CHOICE = 'Múltipla Escolha',
  TRUE_FALSE = 'Verdadeiro ou Falso',
  OPEN_ENDED = 'Resposta Livre (IA)'
}

export enum HintType {
  STANDARD = 'Dica Padrão',
  ASK_AI = 'Pergunte ao Chat'
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // Opções para Múltipla Escolha (4) ou VF (2), vazio para Resposta Livre
  correctAnswerIndex: number; // Índice da resposta correta (0-3 ou 0-1) - Ignorado na Resposta Livre
  correctAnswerText?: string; // Texto da resposta canônica (usado na validação da Resposta Livre)
  reference: string;
  hint: string; // Dica amigável para ajudar o jogador
  explanation: string; // Explicação breve e didática do porquê a resposta é correta
  glosa?: string; // Glosa em Libras formatada para o VLibras (MAIÚSCULAS, sem artigos/preposições)
  audioBase64?: string; // Áudio da pergunta pré-gerado via TTS, codificado em Base64 (temporário — descartado após upload)
  audioUrl?: string;    // URL permanente no Firebase Storage (substitui audioBase64 após upload)
}

export interface Team {
  id: string;
  name: string;
  color: string; // Código Hexadecimal para a identidade visual da equipe
  score: number;
  correctCount: number;
  wrongCount: number;
  hintsUsed: number;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  engine: 'browser' | 'gemini';
  gender: 'female' | 'male';
  rate: number; // 0.5 to 2
  volume: number; // 0 to 1
}

export interface QuizConfig {
  mode: TopicMode;
  subTopic?: string;
  specificTopic?: string; // Para TopicMode.OTHER

  difficulty: Difficulty;
  temperature: number;
  quizFormat: QuizFormat;
  openEndedMode?: 'normal' | 'live';
  count: number;
  timeLimit: number;
  maxHints: number;
  hintTypes: HintType[];
  enableTimer: boolean;
  enableTimerSound: boolean;

  isTeamMode: boolean;
  teams: string[];
  questionsPerRound: number;

  tts: TTSConfig;
  // Histórico para evitar repetições
  usedTopics?: string[];

  // Configuração de Libras (Geração de Glosa)
  librasEnabled?: boolean;

  // System prompt customizado injetado pelo app consumidor (ex: JW Quiz)
  systemPrompt?: string;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
  keywords: string[]; // Palavras-chave temáticas dinâmicas para aumentar a entropia nas próximas gerações
  focalTheme?: string;
}

export interface EvaluationResult {
  score: number; // Pontuação de 0.0 a 1.0
  feedback: string;
  isCorrect: boolean;
}

export interface ApiErrorDetail {
  title: string;
  message: string;
  solution: string;
  code: string;
}

export type AiProvider = 'google-ai' | 'vertex' | 'deepseek' | 'groq' | 'openrouter';

export interface AppConfig {
  appName: string;
  storagePrefix: string;
  appTitle: React.ReactNode;
  themeColors: {
    primary: string;
  };
  promptProfile: {
    systemInstruction: string;
  };
  setupTopics: {
    id: string;
    label: string;
    icon?: any;
    subtopics?: string[];
    subtopicsLabel?: string;
    hasCustomInput?: boolean;
    customInputLabel?: string;
    customInputPlaceholder?: string;
  }[];
  /**
   * Logo customizável (SVG em string ou React component)
   * Usado na tela de login/setup
   */
  customLogo?: React.ReactNode | string;
}

