// Minimal type declarations for @avalia/core used by Cloud Functions

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
  correctAnswerText?: string;
  reference: string;
  hint: string;
  explanation: string;
  glosa?: string;
  audioBase64?: string;
  audioUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  hintsUsed: number;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  engine: 'gemini';
  gender: 'female' | 'male';
  rate: number;
  volume: number;
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
  tts: TTSConfig;
  usedTopics?: string[];
  librasEnabled?: boolean;
  systemPrompt?: string;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
  keywords: string[];
  focalTheme?: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export interface ApiErrorDetail {
  title: string;
  message: string;
  solution: string;
  code: string;
}

export type AiProvider = 'google-ai' | 'vertex' | 'deepseek' | 'groq' | 'openrouter' | 'openai';