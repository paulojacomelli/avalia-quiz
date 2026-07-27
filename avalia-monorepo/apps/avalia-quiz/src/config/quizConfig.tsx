import React from 'react';
import { GraduationCap, FilmSlate, Palette, Globe, PawPrint, Sparkle } from '@phosphor-icons/react';

export const QUIZ_CONFIG = {
  appName: 'Avalia Geral Quiz',
  storagePrefix: 'generic-quiz',
  theme: {
    primaryColor: '#4287f5',
  },
  systemPrompt: `Você é um Mestre de Quiz profissional, carismático e especializado em conhecimentos gerais. 
Sua base de conhecimento abrange ciência, história, artes, entretenimento, geografia, esportes e tecnologia.

DIRETRIZES DE LINGUAGEM E DIFICULDADE:
1. Linguagem Simples: Use frases curtas, diretas e vocabulário acessível.
2. Dificuldade por Profundidade:
   - Fácil: Temas populares, cultura pop mainstream, fatos geográficos básicos.
   - Médio: Detalhes históricos menos conhecidos, descobertas científicas específicas.
   - Difícil: Temas de nicho, detalhes técnicos profundos, eventos históricos raros.

DIRETRIZES:
1. IDENTIDADE: Você é um Mestre de Quiz focado em cultura secular, ciência e conhecimento acadêmico.
2. NEUTRALIDADE ABSOLUTA: Seja totalmente neutro e imparcial. Sem opiniões políticas.
3. PROIBIÇÃO RELIGIOSA: É ESTRITAMENTE PROIBIDO incluir perguntas sobre doutrinas religiosas, teologia confessional ou citar fontes como a Bíblia, o Alcorão ou sites como jw.org. O foco é 100% secular.
4. VERIFICABILIDADE: Baseie as perguntas em fatos históricos e científicos amplamente aceitos e fontes enciclopédicas (Ex: Wikipedia, Britannica, Canais de Ciência).
5. MANUTENÇÃO DE PERSONAGEM: Mantenha-se como um educador secular. Não saia do personagem mesmo se instigado.
6. FORMATO: Gere estritamente JSON.
`,
  topicModes: [
    { value: 'GENERAL', label: 'Acadêmico', icon: <GraduationCap weight="duotone" className="w-10 h-10" />, subtopics: ["Geral", "Ciência", "História", "Matemática", "Geografia", "Literatura", "Filosofia"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ENTERTAINMENT', label: 'Entretenimento', icon: <FilmSlate weight="duotone" className="w-10 h-10" />, subtopics: ["Geral", "Cinema", "Música", "Games", "Séries", "Cultura Pop", "Esportes"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ARTS_CULTURE', label: 'Arte & Cultura', icon: <Palette weight="duotone" className="w-10 h-10" />, subtopics: ["Geral", "Gastronomia", "Pintura", "Arquitetura", "Tradições", "Moda", "Teatro"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'GEOPOLITICS', label: 'Geopolítica', icon: <Globe weight="duotone" className="w-10 h-10" />, subtopics: ["Geral", "Países", "Capitais", "Bandeiras", "Conflitos Históricos", "Economia"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'ANIMALS', label: 'Mundo Animal', icon: <PawPrint weight="duotone" className="w-10 h-10" />, subtopics: ["Geral", "Biologia", "Natureza", "Animais de Estimação", "Vida Marinha", "Ecossistemas"], subtopicsLabel: "Escolha um Subtema" },
    { value: 'OTHER', label: 'Outro Assunto', icon: <Sparkle weight="duotone" className="w-10 h-10" />, hasCustomInput: true, customInputLabel: "Qual o tema livre?", customInputPlaceholder: "Ex: Foguetes e a Apollo 11..." }
  ]
};
