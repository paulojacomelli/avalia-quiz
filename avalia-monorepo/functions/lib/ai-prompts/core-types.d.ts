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
export declare function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion;
export declare function shuffleQuizOptions(quiz: GeneratedQuiz, format?: QuizFormat): GeneratedQuiz;
//# sourceMappingURL=core-types.d.ts.map