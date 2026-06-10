import { useEffect } from 'react';

interface UseGameShortcutsProps {
  gameState: string;
  isCurrentQuestionAnswered: boolean;
  isReviewing: boolean;
  reviewIndex: number;
  totalQuestions: number;
  cooldownTime: number;
  hasError: boolean;
  hasPendingAction: boolean;
  onConfirmStart: () => void;
  onNextQuestion: () => void;
  onNextRound: () => void;
  onReviewNext: () => void;
  playSound: (sound: string) => void;
}

export function useGameShortcuts({
  gameState,
  isCurrentQuestionAnswered,
  isReviewing,
  reviewIndex,
  totalQuestions,
  cooldownTime,
  hasError,
  hasPendingAction,
  onConfirmStart,
  onNextQuestion,
  onNextRound,
  onReviewNext,
  playSound
}: UseGameShortcutsProps) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Allow Space or Enter
      if (e.code === 'Space' || e.key === 'Enter') {
        // Avoid scrolling/triggering if user is typing in a textarea/input
        const tagName = (e.target as HTMLElement).tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

        // Prevent action if in cooldown or error state
        if (cooldownTime > 0 || hasError) return;

        // Prevent if modal is open
        if (hasPendingAction) return;

        // Prevent page scroll for space and button clicks for enter to avoid double triggering
        e.preventDefault();

        // Context-aware action
        if (gameState === 'READY_CHECK') {
          onConfirmStart();
        } else if (gameState === 'PLAYING' && isCurrentQuestionAnswered) {
          onNextQuestion();
        } else if (gameState === 'ROUND_SUMMARY') {
          onNextRound();
        } else if (isReviewing && reviewIndex < totalQuestions - 1) {
          onReviewNext();
          playSound('click');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    gameState, isCurrentQuestionAnswered, isReviewing, reviewIndex, 
    totalQuestions, cooldownTime, hasError, hasPendingAction,
    onConfirmStart, onNextQuestion, onNextRound, onReviewNext, playSound
  ]);
}
