import React from 'react';

export function KidsQuizLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="url(#kidsGrad)" stroke="#FFFFFF" strokeWidth="4"/>
      <path d="M35 38C35 32 40 28 50 28C60 28 65 32 65 38C65 44 58 46 54 50C51 53 50 56 50 62H44C44 54 47 50 51 46C55 42 58 40 58 37C58 34 54 33 50 33C45 33 42 35 41 38H35Z" fill="#FFFFFF"/>
      <circle cx="47" cy="72" r="4" fill="#FFFFFF"/>
      <defs>
        <linearGradient id="kidsGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7D33C" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}
