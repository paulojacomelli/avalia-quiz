import React from 'react';
import { QuizQuestion } from '@avalia/core';

interface QuizOptionsProps {
  question: QuizQuestion;
  selectedOption: number | null;
  internalSelectedOption: number | null;
  showAnswerKey: boolean;
  hasConfirmed: boolean;
  isTimeUp: boolean;
  isSkipping: boolean;
  isVoided: boolean;
  isAnsweredOrFinished: boolean;
  activeTeamColor?: string;
  onSelect: (idx: number) => void;
  onConfirm: () => void;
  onHover: () => void;
}

export const QuizOptions: React.FC<QuizOptionsProps> = ({
  question,
  selectedOption,
  internalSelectedOption,
  showAnswerKey,
  hasConfirmed,
  isTimeUp,
  isSkipping,
  isVoided,
  isAnsweredOrFinished,
  activeTeamColor,
  onSelect,
  onConfirm,
  onHover
}) => {
  const getOptionStyle = (optIndex: number) => {
    const baseStyle = "group w-full p-3 md:p-4 rounded-lg text-left transition-all duration-200 text-sm md:text-base relative flex items-center";
    
    if (showAnswerKey) {
      if (optIndex === question.correctAnswerIndex) return `${baseStyle} bg-green-900/30 border border-green-700 text-green-300`;
      if (optIndex === selectedOption && selectedOption !== question.correctAnswerIndex) return `${baseStyle} bg-red-900/30 border border-red-700 text-red-300`;
      return `${baseStyle} bg-brand-card border border-transparent opacity-50`;
    }
    
    if (hasConfirmed || isTimeUp) {
       if (optIndex === question.correctAnswerIndex) return `${baseStyle} bg-green-900/40 border border-green-600 text-green-200`;
       if (optIndex === selectedOption && selectedOption !== question.correctAnswerIndex) return `${baseStyle} bg-red-900/40 border border-red-800 text-red-200`;
       return `${baseStyle} bg-brand-card border border-transparent opacity-40`;
    }
    
    if (internalSelectedOption === optIndex) return `${baseStyle} bg-brand-blue text-white shadow-md transform scale-[1.01] border border-transparent`;
    
    return `${baseStyle} bg-brand-card hover:bg-brand-hover text-brand-text border border-transparent hover:border-gray-500/50 ${isSkipping ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            onMouseEnter={() => !hasConfirmed && !isTimeUp && !isSkipping && internalSelectedOption !== idx && onHover()}
            className={getOptionStyle(idx)}
            disabled={isAnsweredOrFinished || isSkipping || isVoided}
          >
            <span
              className={`w-8 h-8 rounded-md flex items-center justify-center text-sm mr-3 md:mr-4 shrink-0 transition-colors ${
                (internalSelectedOption === idx || (showAnswerKey && idx === question.correctAnswerIndex))
                  ? 'bg-white text-brand-blue'
                  : 'bg-gray-700/50 group-hover:bg-brand-text group-hover:text-brand-dark'
              }`}
              style={(internalSelectedOption === idx) ? { color: activeTeamColor || 'var(--accent-primary)' } : {}}
            >
              {String.fromCharCode(65 + idx)}
            </span>
            <span>{option}</span>
          </button>
        ))}
      </div>
      {!isAnsweredOrFinished && internalSelectedOption !== null && (
        <div className="flex justify-end animate-fade-in-up pt-2">
          <button
            onClick={onConfirm}
            className="bg-brand-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-opacity-90 transition-transform active:scale-95 flex items-center gap-2"
          >
            Confirmar Resposta
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
