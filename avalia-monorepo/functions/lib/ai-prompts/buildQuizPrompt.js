"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopicPrompt = getTopicPrompt;
exports.getFormatInstruction = getFormatInstruction;
exports.buildQuizPrompt = buildQuizPrompt;
const core_types_1 = require("./core-types");
const MODE_LABELS = {
    [core_types_1.TopicMode.ACADEMIC]: "Acadêmico (Estudos, Ciência, História, Literatura, Filosofia, etc.)",
    [core_types_1.TopicMode.ENTERTAINMENT]: "Entretenimento (Filmes, Séries, Games, Música, Esportes, etc.)",
    [core_types_1.TopicMode.ARTS_CULTURE]: "Arte & Cultura (Gastronomia, Pintura, Teatro, Arquitetura, Tradições, etc.)",
    [core_types_1.TopicMode.GEOPOLITICS]: "Geopolítica & Mundo (Países, Capitais, Bandeiras, Economia, etc.)",
    [core_types_1.TopicMode.ANIMALS]: "Mundo Animal & Natureza (Biologia, Ecossistemas, Vida Marinha, etc.)"
};
function getTopicPrompt(config) {
    if (config.mode === core_types_1.TopicMode.OTHER) {
        return `Tema Livre Obrigatório: "${config.specificTopic}".`;
    }
    const modeLabel = MODE_LABELS[config.mode] || config.mode;
    return `Área Principal: ${modeLabel}. Subcategoria Solicitada: ${config.subTopic || 'Geral'}.`;
}
function getFormatInstruction(config) {
    if (config.quizFormat === core_types_1.QuizFormat.TRUE_FALSE)
        return `FORMATO: VERDADEIRO OU FALSO. options: ["Verdadeiro", "Falso"].`;
    if (config.quizFormat === core_types_1.QuizFormat.OPEN_ENDED)
        return `FORMATO: RESPOSTA LIVRE. options: []. correctAnswerIndex: -1. Preencha correctAnswerText.`;
    return `FORMATO: MÚLTIPLA ESCOLHA. 4 alternativas.`;
}
function buildQuizPrompt(config, globalExclusions = []) {
    const topicPrompt = getTopicPrompt(config);
    const formatInstruction = getFormatInstruction(config);
    const userTopics = Array.isArray(config.usedTopics) ? config.usedTopics : [];
    const globalExcl = Array.isArray(globalExclusions) ? globalExclusions : [];
    const allExclusions = Array.from(new Set([...userTopics, ...globalExcl]))
        .filter((t) => typeof t === 'string' && !!t.trim())
        .slice(0, 40);
    const exclusionList = allExclusions.length > 0
        ? `PROIBIDO / TEMAS JÁ JOGADOS (NÃO REPETIR OU ABORDAR DIRETAMENTE): [${allExclusions.join(', ')}].`
        : '';
    return `
    Crie um quiz com ${config.count} perguntas.
    CATEGORIA SOLICITADA: ${topicPrompt}.
    Dificuldade Solicitada: ${config.difficulty} (Texto de leitura simples, dificuldade por profundidade de tema).
    ${formatInstruction}
    ${exclusionList}
    
    REGRA MANDATÓRIA DE ESPECIFICIDADE DE TEMA:
    - O quiz DEVE se basear em um TEMA ESPECÍFICO, CONCRETO E DELIMITADO sorteado dentro da categoria/subcategoria informada.
    - É ESTREITAMENTE PROIBIDO gerar um quiz genérico com título ou conteúdo igual ao próprio nome da categoria (exemplo: se a categoria for "Acadêmico - Geral" ou "Acadêmico - História", NUNCA gere um quiz genérico sobre "Conhecimentos Gerais" ou "História Geral". Em vez disso, sorteie um tema específico concreto como "Grandes descobertas científicas da humanidade" ou "A Descoberta do Brasil").
    - TODAS as ${config.count} perguntas devem tratar EXCLUSIVAMENTE do tema específico sorteado.
    - O campo "titulo" no JSON retornado DEVE ser o nome descritivo e cativante desse tema específico sorteado.

    PALAVRAS-CHAVE: Ao final, extraia no array "palavrasChave" os 2 a 5 termos principais (keywords) que definem esse tema específico sorteado.
    
    REGRAS DE INTEGRIDADE DO QUIZ:
    Cada pergunta deve ser internamente consistente:
    - 'textoRespostaCorreta' deve ser exatamente igual ao conteúdo de 'opcoes[indiceRespostaCorreta]'.
    - A 'justificativa' não pode contradizer a alternativa indicada por 'indiceRespostaCorreta'.
    - A 'referencia' deve embasar a resposta correta quando existir uma referência aplicável.
    - Todas as alternativas devem ser completas, coerentes, gramaticalmente corretas e plausíveis dentro do contexto da pergunta.
    - Nunca gere alternativas sem sentido, contraditórias ou incompletas.

    IMPORTANTE: Responda APENAS com o JSON estruturado abaixo.
    
    A resposta deve obrigatoriamente seguir este formato JSON exatamente:
    {
      "titulo": "O título específico e cativante do tema sorteado.",
      "palavrasChave": ["Termos principais que definem o foco temático"],
      "perguntas": [
        {
          "id": "Identificador único da pergunta (UUID curto)",
          "enunciado": "O texto da pergunta.",
          "opcoes": ["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4"],
          "indiceRespostaCorreta": 0,
          "textoRespostaCorreta": "Texto exatamente idêntico a opcoes[indiceRespostaCorreta]",
          "referencia": "Fonte, link ou contexto que embasa a resposta correta.",
          "justificativa": "A explicação do porquê a resposta está correta.",
          "glosa": "Tradução adaptada para a estrutura gramatical da Língua Brasileira de Sinais.",
          "dica": "Uma dica curta para ajudar o jogador."
        }
      ]
    }
  `;
}
//# sourceMappingURL=buildQuizPrompt.js.map