import React from 'react';
import { PawPrint, Palette, Globe, PuzzlePiece, MagicWand } from '@phosphor-icons/react';

export const QUIZ_CONFIG = {
  appName: 'Avalia Kids',
  storagePrefix: 'kids-quiz',
  theme: {
    primaryColor: '#F7D33C',
  },
  systemPrompt: `Você é o Mestre Amigo, um apresentador de quiz infantil profissional, carismático e animado.
Sua missão é criar um quiz de conhecimento básico divertido e educativo para crianças (de 6 a 12 anos).

DIRETRIZES DE LINGUAGEM E ESTILO:
1. Linguagem infantil e acessível: Use frases curtas, palavras simples e amigáveis, com entusiasmo. Não utilize emojis no texto.
2. Nível de Dificuldade:
   - Fácil: Perguntas bem simples sobre animais de estimação, cores primárias, frutas e historinhas clássicas.
   - Médio: Perguntas sobre o planeta, estações do ano, continhas de somar fáceis, insetos e dinossauros.
   - Difícil: Curiosidades sobre ciência infantil, corpo humano, espaço e geografia básica.
3. Resposta e Dicas: A dica ("hint") deve ser encorajadora e dar uma pista útil. A explicação ("explanation") deve explicar o porquê da resposta de forma didática e positiva.
4. Tema Livre: Se o usuário pedir um tema livre (ex: "Peppa Pig", "Desenhos Animados", "Dinossauros"), foque nesse universo de forma lúdica.
5. FORMATO: Gere estritamente JSON válido.
`,
  topicModes: [
    { 
      value: 'ANIMALS', 
      label: 'Mundo Animal', 
      icon: <PawPrint weight="duotone" className="w-10 h-10" />,
      subtopics: ["Geral", "Sons dos Animais", "Animais da Fazenda", "Vida Marinha", "Aves e Insetos", "Dinossauros", "Animais de Estimação"],
      subtopicsLabel: "Escolha o tipo de bicho"
    },
    { 
      value: 'COLORS_SHAPES', 
      label: 'Cores e Formas', 
      icon: <Palette weight="duotone" className="w-10 h-10" />,
      subtopics: ["Geral", "Mistura de Cores", "Formas Geométricas", "Objetos do Dia a Dia", "Desenhos e Pintura"],
      subtopicsLabel: "Escolha o assunto"
    },
    { 
      value: 'NATURE', 
      label: 'Planeta & Natureza', 
      icon: <Globe weight="duotone" className="w-10 h-10" />,
      subtopics: ["Geral", "Plantas e Árvores", "Estações do Ano", "Espaço e Planetas", "O Sol e a Lua", "Cuidados com o Planeta"],
      subtopicsLabel: "Escolha o tema"
    },
    { 
      value: 'NUMBERS_LOGIC', 
      label: 'Contagem & Lógica', 
      icon: <PuzzlePiece weight="duotone" className="w-10 h-10" />,
      subtopics: ["Geral", "Contar até 20", "Somar e Subtrair Fáceis", "Charadas Divertidas", "Sequências de Cores"],
      subtopicsLabel: "Escolha o desafio"
    },
    { 
      value: 'OTHER', 
      label: 'Outro Tema Divertido', 
      icon: <MagicWand weight="duotone" className="w-10 h-10" />, 
      hasCustomInput: true, 
      customInputLabel: "Qual o tema infantil?", 
      customInputPlaceholder: "Ex: Super-heróis, Desenhos animados, Fadas..." 
    }
  ]
};
