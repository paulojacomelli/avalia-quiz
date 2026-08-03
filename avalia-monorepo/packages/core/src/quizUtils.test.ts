import { describe, it, expect } from 'vitest';
import { shuffleQuestionOptions, shuffleQuizOptions, validateUrlDomain, validateTrueFalseBalance } from './quizUtils';
import { QuizQuestion, GeneratedQuiz, QuizFormat } from './types';

describe('quizUtils - shuffleQuestionOptions', () => {
  it('deve manter o texto da resposta correta no novo índice após o shuffle', () => {
    const question: QuizQuestion = {
      id: 'q1',
      question: 'Qual a capital do Brasil?',
      options: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'],
      correctAnswerIndex: 0,
      reference: '',
      hint: '',
      explanation: ''
    };

    const originalCorrectText = question.options[question.correctAnswerIndex]; // 'Brasília'

    for (let i = 0; i < 50; i++) {
      const shuffled = shuffleQuestionOptions(question, QuizFormat.MULTIPLE_CHOICE);
      const shuffledCorrectText = shuffled.options[shuffled.correctAnswerIndex];
      expect(shuffledCorrectText).toBe(originalCorrectText);
      expect(shuffled.options.length).toBe(4);
    }
  });

  it('não deve alterar a pergunta se for Resposta Livre ou tiver 1 ou 0 opções', () => {
    const openEndedQuestion: QuizQuestion = {
      id: 'q2',
      question: 'Explique a teoria da relatividade.',
      options: [],
      correctAnswerIndex: -1,
      reference: '',
      hint: '',
      explanation: ''
    };

    const shuffled = shuffleQuestionOptions(openEndedQuestion, QuizFormat.OPEN_ENDED);
    expect(shuffled).toEqual(openEndedQuestion);
  });

  it('preserva a ordem das opções e a integridade semântica do gabarito em perguntas do tipo Verdadeiro ou Falso', () => {
    const trueFalseQuestion: QuizQuestion = {
      id: 'q-tf',
      question: 'A Terra é plana?',
      options: ['Verdadeiro', 'Falso'],
      correctAnswerIndex: 1,
      reference: '',
      hint: '',
      explanation: ''
    };

    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(trueFalseQuestion, QuizFormat.TRUE_FALSE);
      expect(shuffled.options).toEqual(['Verdadeiro', 'Falso']);
      expect(shuffled.correctAnswerIndex).toBe(1);
    }
  });

  it('valida a distribuição semântica via validateTrueFalseBalance sem adulterar a veracidade dos fatos', () => {
    const quizAllTrue: GeneratedQuiz = {
      title: 'Quiz Teste V/F',
      keywords: ['teste'],
      focalTheme: 'Teste',
      questions: [
        { id: '1', question: 'P1', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' },
        { id: '2', question: 'P2', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' },
        { id: '3', question: 'P3', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' },
        { id: '4', question: 'P4', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' }
      ]
    };

    const isValid = validateTrueFalseBalance(quizAllTrue, 0.8);
    expect(isValid).toBe(false); // Detecta viés excessivo (100% V)

    const quizBalanced: GeneratedQuiz = {
      title: 'Quiz Teste V/F Equilibrado',
      keywords: ['teste'],
      focalTheme: 'Teste',
      questions: [
        { id: '1', question: 'P1', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' },
        { id: '2', question: 'P2', options: ['V', 'F'], correctAnswerIndex: 1, reference: '', hint: '', explanation: '' },
        { id: '3', question: 'P3', options: ['V', 'F'], correctAnswerIndex: 0, reference: '', hint: '', explanation: '' },
        { id: '4', question: 'P4', options: ['V', 'F'], correctAnswerIndex: 1, reference: '', hint: '', explanation: '' }
      ]
    };

    expect(validateTrueFalseBalance(quizBalanced, 0.8)).toBe(true);
  });

  it('deve distribuir os índices da resposta correta entre 0, 1, 2 e 3 em 100 execuções', () => {
    const question: QuizQuestion = {
      id: 'q3',
      question: 'Pergunta de teste',
      options: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      correctAnswerIndex: 0,
      reference: '',
      hint: '',
      explanation: ''
    };

    const indexCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (let i = 0; i < 200; i++) {
      const shuffled = shuffleQuestionOptions(question, QuizFormat.MULTIPLE_CHOICE);
      indexCounts[shuffled.correctAnswerIndex]++;
    }

    // Garante que a resposta correta não ficou fixa 100% das vezes em 0
    expect(indexCounts[0]).toBeLessThan(190);
    expect(Object.values(indexCounts).filter(count => count > 0).length).toBeGreaterThan(1);
  });
});

describe('quizUtils - validateUrlDomain', () => {
  it('retorna true se não houver restrição de domínios', () => {
    expect(validateUrlDomain('https://exemplo.com', null)).toBe(true);
    expect(validateUrlDomain('https://exemplo.com', [])).toBe(true);
  });

  it('valida domínios permitidos corretamente (incluindo subdomínios)', () => {
    const allowed = ['example.com'];
    expect(validateUrlDomain('https://www.example.com/pt/biblioteca', allowed)).toBe(true);
    expect(validateUrlDomain('https://example.com', allowed)).toBe(true);
    expect(validateUrlDomain('www.example.com/en', allowed)).toBe(true);
  });

  it('rejeita esquemas de protocolo inseguros ou proibidos (javascript:, ftp:, file:)', () => {
    const allowed = ['example.com'];
    expect(validateUrlDomain('javascript:alert(1)', allowed)).toBe(false);
    expect(validateUrlDomain('ftp://example.com/files', allowed)).toBe(false);
    expect(validateUrlDomain('file:///C:/example.com', allowed)).toBe(false);
  });

  it('rejeita domínios não permitidos ou URLs malformadas', () => {
    const allowed = ['example.com'];
    expect(validateUrlDomain('https://wikipedia.org', allowed)).toBe(false);
    expect(validateUrlDomain('https://example.com.phishing.com', allowed)).toBe(false);
    expect(validateUrlDomain('', allowed)).toBe(false);
  });
});


