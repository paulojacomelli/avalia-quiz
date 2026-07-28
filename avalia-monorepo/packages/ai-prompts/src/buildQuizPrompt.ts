import { QuizConfig, TopicMode, QuizFormat } from "@avalia/core";

export function getTopicPrompt(config: QuizConfig): string {
  if (config.mode === TopicMode.OTHER) {
    return `Tema Livre Obrigatório: "${config.specificTopic}".`;
  }
  return `Área: ${config.mode}. Subtema Específico: ${config.subTopic || 'Geral'}.`;
}

export function getFormatInstruction(config: QuizConfig): string {
  if (config.quizFormat === QuizFormat.TRUE_FALSE) return `FORMATO: VERDADEIRO OU FALSO. options: ["Verdadeiro", "Falso"].`;
  if (config.quizFormat === QuizFormat.OPEN_ENDED) return `FORMATO: RESPOSTA LIVRE. options: []. correctAnswerIndex: -1. Preencha correctAnswerText.`;
  return `FORMATO: MÚLTIPLA ESCOLHA. 4 alternativas.`;
}

export function buildQuizPrompt(config: QuizConfig, globalExclusions: string[] = []): string {
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  const allExclusions = Array.from(new Set([...(config.usedTopics || []), ...globalExclusions]));
  const exclusionList = allExclusions.length > 0
    ? `PROIBIDO: Não aborde temas diretamente relacionados a estas palavras-chave: ${allExclusions.join(', ')}.`
    : '';

  return `
    Crie um quiz com ${config.count} perguntas.
    TEMA: ${topicPrompt}.
    Dificuldade Solicitada: ${config.difficulty} (Texto de leitura simples, dificuldade por profundidade de tema).
    ${formatInstruction}
    ${exclusionList}
    VARIAÇÃO: Escolha um subtema criativo e inovador dentro da área especificada.
    PALAVRAS-CHAVE: Ao final, extraia APENAS UM termo (keyword) principal que define o foco deste quiz para controle de entropia futura.
    
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
      "titulo": "O título cativante do quiz.",
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