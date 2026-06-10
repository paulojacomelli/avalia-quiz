import React from 'react';
import { GameEngine } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';

/**
 * App Entry Point
 * 
 * Note como o App.tsx é extremamente simples. Toda a complexidade
 * de lógica, animações, chat IA e integração com Libras já está 
 * encapsulada no GameEngine. Nós apenas injetamos a configuração.
 */
function App() {
  return (
    <div className="avalia-app-container">
      <GameEngine 
        appConfig={QUIZ_CONFIG} 
        environment="production" 
      />
    </div>
  );
}

export default App;
