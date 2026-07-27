// Local type definitions to replace @avalia/core imports

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
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText: string;
  reference: string;
  explanation: string;
  glosa: string;
  hint: string;
}

export interface GeneratedQuiz {
  title: string;
  keywords: string[];
  focalTheme: string;
  questions: QuizQuestion[];
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export interface QuizConfig {
  mode: TopicMode;
  subTopic?: string;
  specificTopic?: string;
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
  tts: {
    enabled: boolean;
    autoRead: boolean;
    engine: 'gemini';
    gender: 'female' | 'male';
    rate: number;
    volume: number;
  };
  usedTopics?: string[];
  librasEnabled?: boolean;
  systemPrompt?: string;
}