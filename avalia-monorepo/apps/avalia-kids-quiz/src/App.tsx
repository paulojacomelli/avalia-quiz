import React, { useState } from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';
import { NativePwaUpdater } from '@avalia/design-system';

export default function App() {
  const [gameState, setGameState] = useState('idle');

  return (
    <AuthProvider storageKeyPrefix="kids_quiz">
      <NativePwaUpdater gameState={gameState} />
      <GameEngine 
        appConfig={QUIZ_CONFIG} 
        onGameStateChange={setGameState}
      />
    </AuthProvider>
  );
}
