import React from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';
import { CANARY_LOGO_CONFIG } from './config/canary-logo';

export default function App() {
  return (
    <AuthProvider storageKeyPrefix="jw_quiz">
      <GameEngine appConfig={QUIZ_CONFIG} isCanary={CANARY_LOGO_CONFIG.enabled} />
    </AuthProvider>
  );
}

