import React from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';

export default function App() {
  return (
    <AuthProvider storageKeyPrefix="generic_quiz">
      <GameEngine appConfig={QUIZ_CONFIG} />
    </AuthProvider>
  );
}
