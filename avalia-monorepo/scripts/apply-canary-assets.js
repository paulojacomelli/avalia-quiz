#!/usr/bin/env node

/**
 * Script para aplicar os ícones canary aos apps de dev
 * Copia os ícones e logos da pasta canary para as pastas public dos apps
 */

const fs = require('fs');
const path = require('path');

const CANARY_APPS = [
  {
    source: 'apps/quiz-canary',
    target: 'apps/avalia-quiz/public',
    configTarget: 'apps/avalia-quiz/src/config',
    name: 'avalia-quiz'
  },
  {
    source: 'apps/jwquiz-canary',
    target: 'apps/avalia-jw-quiz/public',
    configTarget: 'apps/avalia-jw-quiz/src/config',
    name: 'avalia-jw-quiz'
  }
];

const ICON_FILES = [
  'apple-touch-icon.png',
  'favicon.ico',
  'masked-icon.svg',
  'pwa-192x192.png',
  'pwa-512x512.png'
];

const LOGO_FILES = [
  'logo.svg',
  'logo-dark.svg',
  'logo-light.svg'
];

function copyFile(source, destination) {
  try {
    // Criar diretório se não existir
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.copyFileSync(source, destination);
    console.log(`✓ Copiado: ${path.relative('.', destination)}`);
  } catch (error) {
    console.error(`✗ Erro ao copiar ${path.relative('.', source)}: ${error.message}`);
    process.exit(1);
  }
}

function createLogoConfig(appName, hasLogo) {
  return `// Auto-generated canary logo config
export const CANARY_LOGO_CONFIG = {
  enabled: ${hasLogo},
  appName: '${appName}'
};
`;
}

console.log('🎨 Aplicando ícones e logos canary para os apps de dev...\n');

CANARY_APPS.forEach(app => {
  console.log(`📦 Processando ${app.name}...`);
  
  const publicDir = app.target;
  const configDir = app.configTarget;
  
  // Criar diretórios se não existirem
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Copiar ícones
  console.log('  📷 Ícones:');
  ICON_FILES.forEach(file => {
    const sourceFile = path.join(app.source, file);
    const targetFile = path.join(publicDir, file);
    
    if (fs.existsSync(sourceFile)) {
      copyFile(sourceFile, targetFile);
    }
  });
  
  // Copiar logos
  console.log('  🎨 Logos:');
  let hasLogoAssets = false;
  LOGO_FILES.forEach(file => {
    const sourceFile = path.join(app.source, file);
    const targetFile = path.join(publicDir, file);
    
    if (fs.existsSync(sourceFile)) {
      copyFile(sourceFile, targetFile);
      hasLogoAssets = true;
    }
  });
  
  // Criar arquivo de configuração do logo canary
  const logoConfigFile = path.join(configDir, 'canary-logo.ts');
  const logoConfig = createLogoConfig(app.name, hasLogoAssets);
  try {
    fs.writeFileSync(logoConfigFile, logoConfig);
    console.log(`✓ Configuração: ${path.relative('.', logoConfigFile)}`);
  } catch (error) {
    console.warn(`⚠ Erro ao criar config: ${error.message}`);
  }
  
  console.log();
});

console.log('✅ Assets canary aplicados com sucesso!');
