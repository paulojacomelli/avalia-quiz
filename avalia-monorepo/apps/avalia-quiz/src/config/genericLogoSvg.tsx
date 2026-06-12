/**
 * Logo customizado para Avalia Quiz (genérico)
 * Componentes React para renderizar os logos
 */

export const GenericQuizLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(66,135,245,0.6)]">
    {/* Círculos concêntricos representando conhecimento */}
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="5" fill="none" />
    <circle cx="12" cy="12" r="8" fill="none" opacity="0.5" />
    
    {/* Símbolo de questionário */}
    <path d="M8 16h8M7 10l2-3 3-2 3 2 2 3" fill="none" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Logo alternativo com escudo e engrenagem (conhecimento técnico)
 */
export const GenericQuizLogoTech = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(66,135,245,0.6)]">
    {/* Escudo */}
    <path d="M12 2C12 2 4 6 4 12c0 6 8 10 8 10s8-4 8-10c0-6-8-10-8-10z" opacity="0.3" />
    <path d="M12 4C12 4 6 7 6 12c0 5 6 8 6 8s6-3 6-8c0-5-6-8-6-8z" stroke="currentColor" fill="none" strokeWidth="1.5" />
    
    {/* Engrenagem */}
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 6v2M12 16v2M18 12h-2M8 12H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Logo premium para Avalia Quiz com design refinado
 */
export const GenericQuizLogoPremium = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className={className}>
    <defs>
      <radialGradient id="genericGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{stopColor: 'rgba(66,135,245,0.2)', stopOpacity: 1}} />
        <stop offset="100%" style={{stopColor: 'rgba(66,135,245,0.05)', stopOpacity: 1}} />
      </radialGradient>
    </defs>
    
    {/* Círculo de fundo */}
    <circle cx="50" cy="50" r="48" fill="url(#genericGradient)" />
    <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    
    {/* Escudo */}
    <path d="M 50 20 L 30 35 L 30 55 Q 50 75 50 75 Q 50 75 70 55 L 70 35 Z" 
          stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    
    {/* Símbolo de conhecimento - livro aberto */}
    <path d="M 50 40 L 45 45 L 50 50 L 55 45 Z" fill="currentColor" />
    <circle cx="50" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
  </svg>
);
