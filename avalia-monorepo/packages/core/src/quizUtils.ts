import { QuizQuestion, GeneratedQuiz, QuizFormat } from "./types";

/**
 * Embaralha as alternativas de uma pergunta do quiz usando o algoritmo Fisher-Yates.
 * Ignora perguntas do tipo TRUE_FALSE e OPEN_ENDED.
 */
export function shuffleQuestionOptions(question: QuizQuestion, format?: QuizFormat): QuizQuestion {
  // Early return se não houver opções suficientes ou se for Resposta Livre (correctAnswerIndex < 0)
  if (!question.options || question.options.length <= 1 || question.correctAnswerIndex < 0) {
    return question;
  }

  // Decisão baseada estritamente no Enum de tipo da pergunta (QuizFormat)
  if (format === QuizFormat.TRUE_FALSE) {
    return question;
  }

  const options = [...question.options];
  let correctIndex = question.correctAnswerIndex;

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];

    if (correctIndex === i) {
      correctIndex = j;
    } else if (correctIndex === j) {
      correctIndex = i;
    }
  }

  return {
    ...question,
    options,
    correctAnswerIndex: correctIndex
  };
}

/**
 * Embaralha as opções de todas as perguntas de um quiz gerado mantendo a integridade semântica.
 * Não altera nem muta o gabarito (correctAnswerIndex) das perguntas para não comprometer a veracidade dos fatos.
 */
export function shuffleQuizOptions(quiz: GeneratedQuiz, format?: QuizFormat): GeneratedQuiz {
  if (!quiz || !quiz.questions) return quiz;

  return {
    ...quiz,
    questions: quiz.questions.map(q => shuffleQuestionOptions(q, format))
  };
}

/**
 * Validador de Qualidade para Quizzes Verdadeiro ou Falso.
 * Verifica se a distribuição de respostas não está excessivamente enviesada (retorna true se a distribuição for aceitável).
 */
export function validateTrueFalseBalance(quiz: GeneratedQuiz, maxBiasRatio: number = 0.8): boolean {
  if (!quiz || !quiz.questions || quiz.questions.length < 3) return true;

  const trueCount = quiz.questions.filter(q => q.correctAnswerIndex === 0).length;
  const ratio = trueCount / quiz.questions.length;

  // Rejeita se a proporção de respostas Verdadeiro for superior a maxBiasRatio ou inferior a (1 - maxBiasRatio)
  if (ratio > maxBiasRatio || ratio < (1 - maxBiasRatio)) {
    return false;
  }

  return true;
}

/**
 * Valida se uma URL fornecida pertence a uma lista de domínios permitidos
 * e utiliza estritamente os protocolos http ou https.
 */
export function validateUrlDomain(url: string, allowedDomains?: string[] | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  if (!url || typeof url !== 'string') return false;

  try {
    const trimmed = url.trim();
    
    // Se a URL contiver esquemas proibidos (ex: javascript:, file:, ftp:), rejeitar
    if (trimmed.includes(':') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return false;
    }

    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;
      
    const parsed = new URL(withProtocol);

    // Validação estrita de protocolo
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    return allowedDomains.some(domain => {
      const d = domain.toLowerCase().trim();
      return hostname === d || hostname.endsWith('.' + d);
    });
  } catch {
    return false;
  }
}


