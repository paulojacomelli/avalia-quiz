
import { Difficulty, TopicMode, HintType, QuizFormat, GeneratedQuiz, QuizConfig } from './types';

export const SUB_TOPICS: Record<TopicMode, string[]> = {
  [TopicMode.ACADEMIC]: ["Geral", "Ciência", "História", "Matemática", "Geografia", "Literatura", "Filosofia"],
  [TopicMode.ENTERTAINMENT]: ["Geral", "Cinema", "Música", "Games", "Séries", "Cultura Pop", "Esportes"],
  [TopicMode.ARTS_CULTURE]: ["Geral", "Gastronomia", "Pintura", "Arquitetura", "Tradições", "Moda", "Teatro"],
  [TopicMode.GEOPOLITICS]: ["Geral", "Países", "Capitais", "Bandeiras", "Conflitos Históricos", "Economia"],
  [TopicMode.ANIMALS]: ["Geral", "Biologia", "Natureza", "Animais de Estimação", "Vida Marinha", "Ecossistemas"],
  [TopicMode.OTHER]: []
};

export const DIFFICULTY_OPTIONS = [
  { value: Difficulty.EASY, label: "Fácil" },
  { value: Difficulty.MEDIUM, label: "Médio" },
  { value: Difficulty.HARD, label: "Difícil" },
];

export const MODE_OPTIONS = [
  { value: TopicMode.ACADEMIC, label: "Acadêmico", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { value: TopicMode.ENTERTAINMENT, label: "Entretenimento", icon: "M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: TopicMode.ARTS_CULTURE, label: "Arte & Cultura", icon: "M9.53 16.122a3 3 0 00-3.012 3.011 3 3 0 003.011 3.012c1.233 0 2.304-.74 2.766-1.808a2.99 2.99 0 01.245-1.204 2.996 2.996 0 013.33-1.637 3.003 3.003 0 003.11-2.063 2.994 2.994 0 00-1.807-3.714l-1.442-.48a.75.75 0 01-.482-.96l.48-1.441a2.994 2.994 0 00-3.713-3.713l-1.441.48a.75.75 0 01-.96-.482l-.48-1.442A2.994 2.994 0 005.474 4.53L9.53 16.122z" },
  { value: TopicMode.GEOPOLITICS, label: "Geopolítica", icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" },
  { value: TopicMode.ANIMALS, label: "Mundo Animal", icon: "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm6.75 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" },
  { value: TopicMode.OTHER, label: "Outro Assunto", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
];

export const FORMAT_OPTIONS = [
  { value: QuizFormat.MULTIPLE_CHOICE, label: "Múltipla Escolha" },
  { value: QuizFormat.TRUE_FALSE, label: "Verdadeiro ou Falso" },
  { value: QuizFormat.OPEN_ENDED, label: "Resposta Livre (IA)" },
];

export const TIME_OPTIONS = [
  { value: 5, label: "5s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1 min" },
  { value: 90, label: "1m 30s" },
  { value: 120, label: "2 min" },
];

export const HINT_TYPE_OPTIONS = [
  {
    value: HintType.STANDARD,
    label: "Dica do Sistema",
    icon: "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
  },
  {
    value: HintType.ASK_AI,
    label: "Pergunte ao Chat",
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
  }
];

export const LOADING_MESSAGES = [
  "Preparando fatos interessantes para você...",
  "Dúvidas na resposta? Explore livros de referência após a partida!",
  "Este app desafia sua memória e conhecimentos gerais.",
  "Sabia que o conhecimento é a única coisa que ninguém pode tirar de você?",
  "Procurando perguntas instigantes no banco de dados...",
  "Encontrou um erro? Ajude-nos a melhorar o sistema!",
  "Carregando curiosidades do mundo inteiro...",
  "Aguardando o mestre de cerimônias liberar o quiz...",
  "Conectando com a base de dados global...",
  "Quase lá! Afie seu raciocínio lógico.",
  "Preparando as rodadas... só um instante.",
  "Organizando as perguntas por nível de dificuldade...",
  "Recuperando dados históricos e científicos...",
  "Dica: Leia com atenção o enunciado antes de responder."
];

// --- TUTORIAL DATA ---

export const TUTORIAL_CONFIG: QuizConfig = {
  mode: TopicMode.ACADEMIC,
  subTopic: "Geral",
  difficulty: Difficulty.EASY,
  temperature: 1.0,
  quizFormat: QuizFormat.MULTIPLE_CHOICE,
  count: 4,
  timeLimit: 120,
  maxHints: 99,
  hintTypes: [HintType.STANDARD, HintType.ASK_AI],
  enableTimer: true,
  enableTimerSound: true,
  isTeamMode: false,
  teams: [],
  questionsPerRound: 4,
  tts: {
    enabled: true,
    autoRead: true,
    engine: 'browser',
    gender: 'female',
    rate: 1.2,
    volume: 1.0
  }
};

export const TUTORIAL_DATA: GeneratedQuiz = {
  title: "Modo Treinamento: Bem-vindo ao Quiz",
  keywords: ["treinamento", "tutorial"],
  questions: [
    {
      id: "tut-1",
      question: "Qual é o satélite natural da Terra?",
      options: [
        "Marte",
        "Júpiter",
        "Lua",
        "Sol"
      ],
      correctAnswerIndex: 2,
      reference: "Astronomia Básica",
      hint: "Brilha à noite no céu terrestre.",
      explanation: "A Lua é o único satélite natural da Terra."
    },
    {
      id: "tut-2",
      question: "Quem pintou a Mona Lisa?",
      options: [
        "Van Gogh",
        "Picasso",
        "Leonardo da Vinci",
        "Claude Monet"
      ],
      correctAnswerIndex: 2,
      reference: "História da Arte",
      hint: "Um polímata do Renascimento italiano.",
      explanation: "Leonardo da Vinci foi o autor desta famosa obra do século XVI."
    },
    {
      id: "tut-3",
      question: "No modo 'Resposta Livre', qual é o gás essencial para a respiração humana?",
      options: [],
      correctAnswerIndex: -1,
      correctAnswerText: "Oxigênio",
      reference: "Biologia",
      hint: "Tem o símbolo químico O.",
      explanation: "O oxigênio é fundamental para o processo de respiração celular."
    },
    {
      id: "tut-4-wrong",
      question: "TESTE DE ERRO: Qual destes planetas é conhecido como 'Planeta Vermelho'?",
      options: [
        "Vênus (Marcado como erro)",
        "Marte",
        "Saturno",
        "Urano"
      ],
      correctAnswerIndex: 0,
      reference: "Astronomia (Simulação)",
      hint: "Apesar de Marte ser a resposta certa, neste exemplo clique em Vênus.",
      explanation: "Se você notar um erro no sistema, pode 'Contestar' ao final para obter uma nova pergunta."
    }
  ]
};
