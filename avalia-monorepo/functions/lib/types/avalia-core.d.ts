export declare enum Difficulty {
    EASY = "F\u00E1cil",
    MEDIUM = "M\u00E9dio",
    HARD = "Dif\u00EDcil"
}
export declare enum TopicMode {
    ACADEMIC = "Acad\u00EAmico",
    ENTERTAINMENT = "Entretenimento",
    ARTS_CULTURE = "Arte & Cultura",
    GEOPOLITICS = "Geopol\u00EDtica",
    ANIMALS = "Mundo Animal",
    OTHER = "Outro Assunto"
}
export declare enum QuizFormat {
    MULTIPLE_CHOICE = "M\u00FAltipla Escolha",
    TRUE_FALSE = "Verdadeiro ou Falso",
    OPEN_ENDED = "Resposta Livre (IA)"
}
export declare enum HintType {
    STANDARD = "Dica Padr\u00E3o",
    ASK_AI = "Pergunte ao Chat"
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
export type AiProvider = 'google-ai' | 'vertex' | 'deepseek' | 'groq' | 'openrouter' | 'openai' | 'claude';
//# sourceMappingURL=avalia-core.d.ts.map