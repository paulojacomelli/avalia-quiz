import React from 'react';
import { GameEngine, AuthProvider } from '@avalia/game-engine';
import { QUIZ_CONFIG } from './config/quizConfig';

/**
 * 🚀 PONTO DE ENTRADA DO APLICATIVO
 * 
 * Este arquivo conecta a sua configuração ao motor de jogo (GameEngine).
 * Geralmente você NÃO precisa mexer aqui, a menos que queira adicionar
 * novos contextos ou wrappers globais.
 */
function App() {
  return (
    <AuthProvider storageKeyPrefix="exemplo_quiz">
      <div className="avalia-app-container">
        <GameEngine 
          appConfig={QUIZ_CONFIG} 
        />
      </div>
    </AuthProvider>
  );
}

export default App;
