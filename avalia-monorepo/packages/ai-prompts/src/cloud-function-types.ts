import { QuizConfig } from "@avalia/core";
import { GeneratedQuiz, QuizQuestion, EvaluationResult } from "@avalia/core";

export interface GenerateQuizRequest {
  config: QuizConfig;
  globalExclusions: string[];
  systemPrompt?: string;
  librasEnabled?: boolean;
}

export interface GenerateQuizResponse extends GeneratedQuiz {
  _meta?: { model: string; group: string };
}

export interface GenerateReplacementRequest {
  config: QuizConfig;
  avoidQuestionText: string;
  systemPrompt?: string;
  librasEnabled?: boolean;
}

export interface GenerateReplacementResponse extends QuizQuestion {
  _meta?: { model: string; group: string };
}

export interface EvaluateFreeResponseRequest {
  question: string;
  modelAnswer: string;
  userAnswer: string;
  systemPrompt?: string;
}

export interface EvaluateFreeResponseResponse extends EvaluationResult {
  _meta?: { model: string; group: string };
}