import { GENERIC_QUIZ_LOGO_PREMIUM } from './genericLogoSvg';

export const QUIZ_CONFIG = {
  appName: 'Geral Quiz',
  storagePrefix: 'generic-quiz',
  theme: {
    primaryColor: '#4287f5',
    accentColor: '#F7D33C',
  },
  customLogo: GENERIC_QUIZ_LOGO_PREMIUM,
  systemPrompt: `Você é um Mestre de Quiz profissional, carismático e especializado em conhecimentos gerais. 
Sua base de conhecimento abrange ciência, história, artes, entretenimento, geografia, esportes e tecnologia.

DIRETRIZES DE LINGUAGEM E DIFICULDADE:
1. Linguagem Simples: Use frases curtas, diretas e vocabulário acessível.
2. Dificuldade por Profundidade:
   - Fácil: Temas populares, cultura pop mainstream, fatos geográficos básicos.
   - Médio: Detalhes históricos menos conhecidos, descobertas científicas específicas.
   - Difícil: Temas de nicho, detalhes técnicos profundos, eventos históricos raros.

DIRETRIZES:
1. Neutralidade: Seja totalmente neutro e imparcial. Sem opiniões políticas ou religiosas.
2. Verificabilidade: Baseie as perguntas em fatos históricos e científicos amplamente aceitos.
3. Precisão: Garanta que todas as respostas estejam corretas.
4. Formato: Gere estritamente JSON.
5. Proibido: Não use fontes religiosas, doutrinas específicas ou sites confessionais (como jw.org).`,
  topicModes: [
    { value: 'GENERAL', label: 'Acadêmico', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', subtopics: ["Geral", "Ciência", "História", "Matemática", "Geografia", "Literatura", "Filosofia"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ENTERTAINMENT', label: 'Entretenimento', icon: 'M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z M21 12a9 9 0 11-18 0 9 9 0 0118 0z', subtopics: ["Geral", "Cinema", "Música", "Games", "Séries", "Cultura Pop", "Esportes"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ARTS_CULTURE', label: 'Arte & Cultura', icon: 'M9.53 16.122a3 3 0 00-3.012 3.011 3 3 0 003.011 3.012c1.233 0 2.304-.74 2.766-1.808a2.99 2.99 0 01.245-1.204 2.996 2.996 0 013.33-1.637 3.003 3.003 0 003.11-2.063 2.994 2.994 0 00-1.807-3.714l-1.442-.48a.75.75 0 01-.482-.96l.48-1.441a2.994 2.994 0 00-3.713-3.713l-1.441.48a.75.75 0 01-.96-.482l-.48-1.442A2.994 2.994 0 005.474 4.53L9.53 16.122z', subtopics: ["Geral", "Gastronomia", "Pintura", "Arquitetura", "Tradições", "Moda", "Teatro"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'GEOPOLITICS', label: 'Geopolítica', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3', subtopics: ["Geral", "Países", "Capitais", "Bandeiras", "Conflitos Históricos", "Economia"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ANIMALS', label: 'Mundo Animal', icon: 'M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm6.75 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z', subtopics: ["Geral", "Biologia", "Natureza", "Animais de Estimação", "Vida Marinha", "Ecossistemas"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'OTHER', label: 'Outro Assunto', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10', hasCustomInput: true, customInputLabel: "Qual o tema livre?", customInputPlaceholder: "Ex: Foguetes e a Apollo 11..." }
  ]
};
