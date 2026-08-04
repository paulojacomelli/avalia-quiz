import React, { useState } from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';
import { CANARY_LOGO_CONFIG } from './config/canary-logo';
import { NativePwaUpdater } from '@avalia/design-system';

export default function App() {
  const [gameState, setGameState] = useState('idle');

  return (
    <AuthProvider storageKeyPrefix="jw_quiz">
      <NativePwaUpdater gameState={gameState} />
      <GameEngine 
        appConfig={QUIZ_CONFIG} 
        isCanary={CANARY_LOGO_CONFIG.enabled} 
        onGameStateChange={setGameState} 
      />
    </AuthProvider>
  );
}

