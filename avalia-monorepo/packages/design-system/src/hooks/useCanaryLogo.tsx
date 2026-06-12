/**
 * Hook para carregar logos canary em ambiente de desenvolvimento
 * 
 * Uso:
 * const { logoPath, isCanary } = useCanaryLogo();
 * 
 * {isCanary && <img src={logoPath} alt="Logo Canary" />}
 */

import { useMemo } from 'react';

interface CanaryLogoConfig {
  enabled: boolean;
  appName: string;
}

/**
 * Hook que detecta e fornece acesso ao logo canary
 * Retorna o caminho do logo e um flag indicando se é um logo canary
 */
export function useCanaryLogo() {
  return useMemo(() => {
    // Tenta importar a configuração de logo canary
    // Se não existir, o build não vai gerar o arquivo e isso vai falhar silenciosamente
    let canaryConfig: CanaryLogoConfig | null = null;
    
    try {
      // Esta tentativa de import só funciona se o arquivo foi gerado
      // Em builds normais (sem canary), o arquivo não existe
      canaryConfig = require('../config/canary-logo')?.CANARY_LOGO_CONFIG || null;
    } catch {
      // Arquivo não existe - build normal sem canary assets
      canaryConfig = null;
    }

    return {
      // Caminho do logo canary
      logoPath: '/logo.svg',
      
      // Flag indicando se está usando assets canary
      isCanary: canaryConfig?.enabled ?? false,
      
      // Caminho alternativo para diferentes temas
      logoDarkPath: '/logo-dark.svg',
      logoLightPath: '/logo-light.svg',
      
      // Nome do app em modo canary
      appName: canaryConfig?.appName ?? null,
      
      // Config completa para casos avançados
      config: canaryConfig
    };
  }, []);
}

/**
 * Componente wrapper para usar o logo canary
 * Renderiza condicionalmenteo logo canary ou um fallback
 */
export interface CanaryLogoProps {
  /** Componente ou função a renderizar quando em modo canary */
  render?: (logoPath: string) => React.ReactNode;
  
  /** Componente fallback quando não está em modo canary */
  fallback?: React.ReactNode;
  
  /** Classes CSS customizadas */
  className?: string;
  
  /** Usar logo escuro */
  dark?: boolean;
}

export function CanaryLogo({ 
  render, 
  fallback, 
  className = 'h-8 w-auto',
  dark = false 
}: CanaryLogoProps) {
  const { isCanary, logoPath, logoDarkPath } = useCanaryLogo();
  
  if (!isCanary) {
    return <>{fallback}</>;
  }

  const path = dark ? logoDarkPath : logoPath;

  if (render) {
    return <>{render(path)}</>;
  }

  return (
    <img 
      src={path}
      alt="Logo"
      className={className}
    />
  );
}
