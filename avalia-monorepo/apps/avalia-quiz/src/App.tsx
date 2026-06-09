import React from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';

export default function App() {
  const renderedTitle = (
    <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">
      Aval<span className="text-[#F7D33C]">ia</span> Quiz
    </h1>
  );

  return (
    <AuthProvider storageKeyPrefix="generic_quiz">
      <GameEngine 
        appConfig={QUIZ_CONFIG}
        defaultLanguage="pt"
        title={renderedTitle}
      />
    </AuthProvider>
  );
}
