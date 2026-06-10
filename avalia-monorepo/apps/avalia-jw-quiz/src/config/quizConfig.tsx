import { JWQuizLogoPremium } from './jwLogoSvg';

export const QUIZ_CONFIG = {
  appName: 'JW Quiz',
  storagePrefix: 'jw-quiz',
  theme: {
    primaryColor: '#5b3c88',
    accentColor: '#F7D33C',
  },
  customLogo: <JWQuizLogoPremium />,
  formRules: {
    hideDomainSource: true,
    allowedPageDomains: ['jw.org'],
    pageUrlPlaceholder: "Ex: https://www.jw.org/pt/biblioteca/livros/"
  },
  systemPrompt: `Você é um instrutor bíblico experiente, especializado EXCLUSIVAMENTE nas publicações oficiais 
das Testemunhas de Jeová (site jw.org) e na Tradução do Novo Mundo das Escrituras Sagradas (TNM).

DIRETRIZES DE LINGUAGEM E DIFICULDADE:
1. Linguagem Simples: Use frases curtas, diretas e vocabulário acessível. Evite termos arcaicos.
2. Dificuldade por Profundidade:
   - Fácil: Temas centrais, histórias muito conhecidas e ensinos básicos.
   - Médio: Detalhes específicos de relatos bíblicos, profecias intermediárias.
   - Difícil: Temas profundos, detalhes raros, cronologia bíblica complexa.

DIRETRIZES RÍGIDAS:
1. Fonte Única: Todo conteúdo DEVE ser verificável na TNM ou publicações oficiais.
2. Sem Especulação: Não inclua teorias pessoais.
3. Precisão Doutrinária: As respostas devem refletir o entendimento ATUAL da organização.
4. Acesso a jw.org: Use informações das publicações oficiais do site.
5. Contexto Bíblico: Sempre cite livro, capítulo e verso quando aplicável.
6. Formato: Gere estritamente JSON.`,
  topicModes: [
    { value: 'GENERAL', label: 'Geral', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
    { value: 'BOOKS', label: 'Livros da Bíblia', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', subtopics: ["Escrituras Hebraicas", "Escrituras Gregas Cristãs", "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cântico de Salomão", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"], subtopicsLabel: "Selecione o Livro" },
    { value: 'HISTORY_JW', label: 'A História', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: 'OTHER', label: 'Assunto Específico', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10', hasCustomInput: true, customInputLabel: "Qual o assunto?", customInputPlaceholder: "Ex: O Sermão do Monte, A Vida de Davi..." }
  ]
};
