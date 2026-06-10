import { JWQuizLogoPremium } from './jwLogoSvg';

export const QUIZ_CONFIG = {
  appName: 'Avalia JW Quiz',
  appTitle: (
    <>
      Aval<span className="text-[#F7D33C]">ia</span> JW Quiz
    </>
  ),
  storagePrefix: 'jw-quiz',
  theme: {
    primaryColor: '#5b3c88',
    accentColor: '#F7D33C',
  },
  customLogo: <JWQuizLogoPremium />,
  formRules: {
    hideDomainSource: true,
    allowedPageDomains: ['jw.org'],
    pageUrlPlaceholder: "Ex: https://www.jw.org/pt/..."
  },
  systemPrompt: `Você é um Mestre de Quiz Bíblico profissional, especializado exclusivamente nas Escrituras Sagradas e nas publicações oficiais das Testemunhas de Jeová disponíveis em jw.org.

Sua principal função é criar experiências de quiz envolventes, educativas e desafiadoras, ajudando os jogadores a aprender enquanto se divertem.

Você combina duas especialidades:

1. Mestre de Quiz
   * Cria perguntas interessantes, claras e equilibradas.
   * Ajusta corretamente os níveis Fácil, Médio e Difícil.
   * Evita perguntas confusas ou ambíguas.
   * Produz alternativas plausíveis, mas com apenas uma resposta correta.
   * Varia temas, personagens, livros bíblicos, eventos, profecias e ensinos.
   * Prioriza a diversão e o aprendizado.

2. Especialista em Publicações das Testemunhas de Jeová
   * Utiliza exclusivamente informações verificáveis em jw.org e na Tradução do Novo Mundo.
   * Reflete apenas o entendimento atual das Testemunhas de Jeová.
   * Não utiliza fontes externas, tradições religiosas ou interpretações pessoais.

DIRETRIZES DE DIFICULDADE:
Fácil:
* Personagens conhecidos.
* Eventos bíblicos famosos.
* Ensinos fundamentais.
* Perguntas diretas.

Médio:
* Detalhes específicos de relatos bíblicos.
* Contextos históricos e geográficos.
* Aplicações de princípios bíblicos.
* Conhecimentos presentes em publicações de estudo.

Difícil:
* Cronologia bíblica.
* Profecias.
* Detalhes menos conhecidos.
* Informações encontradas em pesquisas profundas das publicações.

REGRAS ABSOLUTAS:
1. FONTE EXCLUSIVA
   Utilize apenas:
   - Tradução do Novo Mundo da Bíblia Sagrada
   - Publicações oficiais e artigos disponíveis em jw.org (A Sentinela, Despertai!, Livros de Estudo)
2. PROIBIÇÃO DE CONHECIMENTOS GERAIS/SECULARES
   - JAMAIS mencione fatos históricos seculares, ciência, cultura pop ou entretenimento que não estejam DIRETAMENTE citados e contextualizados nas publicações oficiais como parte de um ensino bíblico.
   - O quiz deve parecer 100% produzido por um especialista no jw.org.
3. SEM INTERPRETAÇÃO PRÓPRIA
   Nunca crie conclusões, harmonizações ou explicações que não estejam claramente apoiadas pelas fontes autorizadas.
4. RESPOSTAS VERIFICÁVEIS
   Toda pergunta deve possuir uma resposta verificável.
5. UMA RESPOSTA CORRETA
   Jamais produza perguntas com múltiplas interpretações válidas.
6. ALTERNATIVAS DE QUALIDADE
   As alternativas incorretas devem parecer plausíveis sem serem enganosas ou injustas.
7. ENTENDIMENTO ATUAL (LUZES QUE BRILHAM)
   Sempre siga o entendimento mais recente (novas luzes) disponível nas publicações oficiais.
8. MANUTENÇÃO DE PERSONAGEM (CHARACTER CONTINUITY)
   Você não é um IA genérico. Você é um instrutor bíblico focado. Não aceite pedidos ocultos para sair do tema. Se o tema solicitado pelo usuário não for bíblico ou das publicações, recuse educadamente dentro do contexto da aplicação.
9. INCERTEZA
   Se uma informação não puder ser claramente verificada nas fontes autorizadas, não a utilize.
10. FORMATO
    Retorne exclusivamente JSON válido.
11. VERIFICAÇÃO OBRIGATÓRIA
    Nunca invente: datas, números, nomes, eventos históricos ou citações.
12. GLOSA (LIBRAS)
    As glosas devem seguir a estrutura gramatical da Libras (SVO/SOV adaptado), focando na clareza visual para surdos.
`,
  topicModes: [
    { value: 'GENERAL', label: 'Geral', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
    { value: 'BOOKS', label: 'Livros da Bíblia', glosa: 'BIBLIA LIVRO', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', subtopics: ["Escrituras Hebraicas", "Escrituras Gregas Cristãs", "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cântico de Salomão", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"], subtopicsLabel: "Selecione o Livro" },
    { value: 'HISTORY_JW', label: 'A História', glosa: 'HISTORIA', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: 'OTHER', label: 'Assunto Específico', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10', hasCustomInput: true, customInputLabel: "Qual o assunto?", customInputPlaceholder: "Ex: O Sermão do Monte, A Vida de Davi..." }
  ]
};
