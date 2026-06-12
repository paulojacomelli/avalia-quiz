import React from 'react';
import { TopicMode } from '@avalia/core';

/**
 * 🎨 CONFIGURAÇÃO DE IDENTIDADE E REGRAS DO QUIZ
 * 
 * Este arquivo é o coração da personalização. Para criar um novo quiz,
 * basta modificar os valores abaixo.
 */
export const QUIZ_CONFIG = {
  // 1. Identidade do App
  appName: 'Avalia Exemplo',
  customLogo: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  ),
  appTitle: (
    <>
      Aval<span className="text-[#FFD700]">ia</span> Exemplo
    </>
  ),
  storagePrefix: 'exemplo-quiz',
  
  // 2. Estética (Cores e Logo)
  theme: {
    primaryColor: '#1a1a1a', // Cor de fundo principal
    accentColor: '#FFD700',  // Cor de destaque (ex: botões, foco)
  },
  
  // 3. Engenharia de Prompt (A "Alma" do Quiz)
  // Defina aqui como a IA deve se comportar e qual o tom de voz.
  systemPrompt: `Você é um instrutor especialista em [INSIRA SEU TEMA AQUI].
  
DIRETRIZES DE PERSONAGEM:
1. TOM DE VOZ: Seja [Educativo/Divertido/Sério].
2. LINGUAGEM: Use vocabulário adequado para [Público-Alvo].
3. REGRAS: [Ex: Use apenas fontes históricas / Proibido citar política].

FORMATO: Retorne estritamente JSON conforme as especificações do motor.`,

  // 4. Modos de Tópico e Temas (Configuração da UI de Setup)
  topicModes: [
    { 
      value: TopicMode.ACADEMIC, 
      label: 'Conhecimento', 
      glosa: 'ESTUDAR', // Sinal de Libras ao clicar
      icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
      subtopics: ["Geral", "História", "Ciência"],
      subtopicsLabel: "Subtemas" 
    },
    { 
      value: TopicMode.OTHER, 
      label: 'Tema Livre', 
      glosa: 'OUTRO', 
      icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
      hasCustomInput: true, 
      customInputLabel: "Qual o assunto?", 
      customInputPlaceholder: "Digite qualquer tema..." 
    }
  ]
};
