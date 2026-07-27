import React from 'react';

/**
 * Biblioteca Central de Ícones no Padrão Oficial FontAwesome DUOTONE (fad)
 * Camada Primária (.fa-primary): 100% de opacidade com var(--accent-primary)
 * Camada Secundária (.fa-secondary): 40% de opacidade (opacity: 0.4) com var(--accent-primary)
 */

interface IconProps {
  className?: string;
}

// 1. Patinha Duotone (fad fa-paw)
export const FaDuotonePaw: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    {/* Camada Secundária FontAwesome Duotone (Opacity 0.4) */}
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <circle cx="112" cy="176" r="48" />
      <circle cx="208" cy="112" r="48" />
      <circle cx="304" cy="112" r="48" />
      <circle cx="400" cy="176" r="48" />
    </g>
    {/* Camada Primária FontAwesome Duotone (Opacity 1.0) */}
    <g fill="var(--accent-primary, #4287f5)">
      <path d="M 256 224 C 170 224 128 300 160 380 C 190 450 322 450 352 380 C 384 300 342 224 256 224 Z" />
    </g>
  </svg>
);

// 2. Paleta Duotone (fad fa-palette)
export const FaDuotonePalette: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <circle cx="160" cy="192" r="32" />
      <circle cx="256" cy="144" r="32" />
      <circle cx="352" cy="192" r="32" />
      <circle cx="192" cy="320" r="32" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <path d="M 256 32 C 132.3 32 32 132.3 32 256 C 32 379.7 132.3 480 256 480 C 291.3 480 320 451.3 320 416 C 320 400.4 314.4 386.1 305 375 C 295.4 363.6 288 348.6 288 332 C 288 296.7 316.7 268 352 268 L 400 268 C 444.2 268 480 232.2 480 188 C 480 102 380 32 256 32 Z" />
    </g>
  </svg>
);

// 3. Globo Duotone (fad fa-globe)
export const FaDuotoneGlobe: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <ellipse cx="256" cy="256" rx="224" ry="96" fill="none" stroke="var(--accent-primary, #4287f5)" strokeWidth="40" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <circle cx="256" cy="256" r="160" />
    </g>
  </svg>
);

// 4. Acadêmico Duotone (fad fa-graduation-cap)
export const FaDuotoneGraduationCap: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <polygon points="256,64 32,176 256,288 480,176" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <path d="M 112 250 L 112 368 C 112 368 176 432 256 432 C 336 432 400 368 400 368 L 400 250 L 256 320 Z" />
    </g>
  </svg>
);

// 5. Entretenimento Duotone (fad fa-film)
export const FaDuotoneFilm: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <rect x="48" y="96" width="416" height="320" rx="32" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <polygon points="208,192 336,256 208,320" />
    </g>
  </svg>
);

// 6. Cubos / Lógica Duotone (fad fa-cubes)
export const FaDuotoneCubes: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <rect x="240" y="80" width="192" height="192" rx="32" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <rect x="80" y="240" width="192" height="192" rx="32" />
    </g>
  </svg>
);

// 7. Estrela Mágica Duotone (fad fa-star)
export const FaDuotoneStar: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <circle cx="96" cy="96" r="32" />
      <circle cx="416" cy="416" r="36" />
      <circle cx="416" cy="96" r="28" />
    </g>
    <g fill="var(--accent-primary, #4287f5)">
      <path d="M 256 32 L 320 180 L 480 200 L 360 310 L 390 468 L 256 380 L 122 468 L 152 310 L 32 200 L 192 180 Z" />
    </g>
  </svg>
);

// 8. Bíblia / Livro Duotone (fad fa-book)
export const FaDuotoneBook: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <path d="M 96 64 L 256 128 L 416 64 L 416 416 L 256 468 L 96 416 Z" />
    </g>
    <g stroke="var(--accent-primary, #4287f5)" strokeWidth="32" strokeLinecap="round" fill="none">
      <path d="M 256 128 L 256 468 M 160 180 L 224 200 M 160 260 L 224 280" />
    </g>
  </svg>
);

// 9. Relógio Duotone (fad fa-clock)
export const FaDuotoneClock: React.FC<IconProps> = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 512 512" className={className}>
    <g opacity="0.4" fill="var(--accent-primary, #4287f5)">
      <circle cx="256" cy="256" r="208" />
    </g>
    <g stroke="var(--accent-primary, #4287f5)" strokeWidth="36" strokeLinecap="round" fill="none">
      <polyline points="256,128 256,256 352,304" />
      <circle cx="256" cy="256" r="208" strokeWidth="28" />
    </g>
  </svg>
);
