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
    REGRAS: Busque fatos curiosos e condizentes com a dificuldade solicitada. O título deve ser cativante.
    IMPORTANTE: Responda APENAS com o JSON estruturado abaixo.
    
    A resposta deve obrigatoriamente seguir este formato JSON exatamente:
    {
      "titulo": "O título cativante do quiz.",
      "palavrasChave": ["Termos principais que definem o foco temático"],
      "perguntas": [
        {
          "id": "Identificador único da pergunta (UUID curto)",
          "enunciado": "O texto da pergunta.",
          "opcoes": ["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4"], // ou array vazio se Resposta Livre
          "indiceRespostaCorreta": 0, // Índice da alternativa correta no array de opcoes (usar -1 para Resposta Livre)
          "textoRespostaCorreta": "O texto da resposta correta.",
          "referencia": "Fonte, link ou contexto que embasa a resposta correta.",
          "justificativa": "A explicação do porquê a resposta está correta.",
          "glosa": "Tradução adaptada para a estrutura gramatical da Língua Brasileira de Sinais.",
          "dica": "Uma dica curta para ajudar o jogador."
        }
      ]
    }
  `;
}