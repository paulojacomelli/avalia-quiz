/**
 * Logo customizado para JW Quiz
 * Este é um SVG em string que será renderizado como logo da aplicação
 */

export const JW_QUIZ_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(91,60,136,0.6)]">
  <!-- Círculos concêntricos representando conhecimento/sabedoria -->
  <circle cx="12" cy="12" r="2" fill="currentColor" />
  <circle cx="12" cy="12" r="5" fill="none" />
  <circle cx="12" cy="12" r="8" fill="none" opacity="0.5" />
  
  <!-- Símbolo da coroa (representando estudos bíblicos) -->
  <path d="M8 16h8M7 10l2-3 3-2 3 2 2 3" fill="none" />
  <circle cx="9" cy="9" r="1.5" fill="currentColor" />
  <circle cx="15" cy="9" r="1.5" fill="currentColor" />
</svg>
`;

/**
 * Logo alternativo mais simples para JW Quiz
 */
export const JW_QUIZ_LOGO_SIMPLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <!-- Escudo com cruz -->
  <path d="M12 2C12 2 4 6 4 12c0 6 8 10 8 10s8-4 8-10c0-6-8-10-8-10z" opacity="0.3" />
  <path d="M12 4C12 4 6 7 6 12c0 5 6 8 6 8s6-3 6-8c0-5-6-8-6-8z" stroke="currentColor" fill="none" strokeWidth="1.5" />
  
  <!-- Letra W em estilo moderno -->
  <text x="12" y="14" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
    JW
  </text>
</svg>
`;

/**
 * Logo premium para JW Quiz com design mais refinado
 */
export const JW_QUIZ_LOGO_PREMIUM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Fundo circular com gradient -->
  <defs>
    <radialGradient id="jwGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:rgba(91,60,136,0.2);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(91,60,136,0.05);stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Círculo de fundo -->
  <circle cx="50" cy="50" r="48" fill="url(#jwGradient)" />
  <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" opacity="0.3" />
  
  <!-- Escudo estilizado -->
  <path d="M 50 20 L 30 35 L 30 55 Q 50 75 50 75 Q 50 75 70 55 L 70 35 Z" 
        stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
  
  <!-- Círculos internos representando estudo -->
  <circle cx="50" cy="45" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  <circle cx="50" cy="45" r="6" fill="currentColor" />
</svg>
`;
