import React from 'react';

/**
 * Exemplo de Logo para o Sports Quiz
 */
const SportsLogo = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="opacity-20" />
    <path d="M30 30 Q50 50 70 70 M70 30 Q50 50 30 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <circle cx="50" cy="50" r="15" fill="#FF5733" />
  </svg>
);

export const QUIZ_CONFIG = {
  appName: 'Avalia Sports Quiz',
  appTitle: (
    <>
      Aval<span className="text-[#FF5733]">ia</span> Sports
    </>
  ),
  storagePrefix: 'sports-quiz',
  theme: {
    primaryColor: '#1a1a2e',
    accentColor: '#FF5733',
  },
  customLogo: <SportsLogo />,
  
  // O segredo está aqui: o System Prompt define o "personagem" do app
  systemPrompt: `Você é um Comentarista Esportivo lendário e especialista em estatísticas. 
Sua base de conhecimento cobre: Futebol, Basquete (NBA), Tênis, F1 e Olimpíadas.

DIRETRIZES DE PERSONAGEM:
1. LINGUAGEM: Use gírias esportivas, seja enérgico e apaixonado.
2. PRECISÃO: Cite recordes, datas e nomes de estádios.
3. NEUTRALIDADE: Não demonstre favoritismo por times específicos, foque em fatos esportivos.
4. FORMATO: Retorne exclusivamente JSON.

DIFICULDADE:
- Fácil: Jogadores famosos (Messi, LeBron), regras básicas.
- Médio: Títulos históricos de seleções, recordes mundiais conhecidos.
- Difícil: Estatísticas de nicho, história de times fundadores, detalhes técnicos de equipamentos.`,

  topicModes: [
    { 
      value: 'FOOTBALL', 
      label: 'Futebol', 
      glosa: 'FUTEBOL', 
      icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 3v18 M3 12h18', // Exemplo de path
      subtopics: ["Copa do Mundo", "Champions League", "Brasileirão", "Libertadores"],
      subtopicsLabel: "Escolha a Competição" 
    },
    { 
      value: 'NBA', 
      label: 'Basquete NBA', 
      glosa: 'BASQUETE', 
      icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z', 
      subtopics: ["Draft", "Playoffs", "Maiores Pontuadores", "Times Clássicos"] 
    },
    { 
      value: 'MOTORSPORT', 
      label: 'Velocidade', 
      glosa: 'CORRIDA CARRO', 
      icon: 'M15.75 6a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h1.5z',
      subtopics: ["Fórmula 1", "MotoGP", "Rally", "História de Senna"] 
    },
    { 
      value: 'OTHER', 
      label: 'Outro Esporte', 
      glosa: 'OUTRO ESPORTE', 
      icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
      hasCustomInput: true, 
      customInputLabel: "Qual esporte?", 
      customInputPlaceholder: "Ex: Tênis de Mesa, Surf, Skate..." 
    }
  ]
};
