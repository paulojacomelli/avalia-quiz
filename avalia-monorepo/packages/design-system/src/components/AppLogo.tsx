import React from 'react';

interface AppLogoProps {
  className?: string;
}

/**
 * Componente oficial de Logo do ecossistema Avalia.
 * Encapsula o `/masked-icon.svg` dentro de um container circular estilizado e expandido,
 * que aplica a cor do tema via `var(--accent-primary)`.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ className = "w-28 h-28" }) => {
  return (
    <div 
      className={`rounded-full flex items-center justify-center relative border border-white/10 shrink-0 ${className}`}
      style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary, #4287f5) 12%, transparent)' }}
    >
      {/* Efeito de brilho de fundo expandido (Blur) */}
      <div 
        className="absolute inset-0 rounded-full blur-2xl opacity-40" 
        style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}
      />

      {/* Círculo interno com a borda de destaque */}
      <div 
        className="relative w-20 h-20 rounded-full border flex items-center justify-center transition-all duration-500 shadow-inner" 
        style={{ borderColor: 'color-mix(in srgb, var(--accent-primary, #4287f5) 50%, transparent)' }}
      >
        {/* Ícone mascarado ampliado com a cor primária */}
        <div 
          className="w-14 h-14"
          style={{
            backgroundColor: 'var(--accent-primary, #4287f5)',
            maskImage: 'url(/masked-icon.svg)',
            WebkitMaskImage: 'url(/masked-icon.svg)',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            filter: 'drop-shadow(0 0 12px var(--accent-primary, #4287f5))'
          }}
          role="img"
          aria-label="Ícone do Quiz"
        />
      </div>
    </div>
  );
};
