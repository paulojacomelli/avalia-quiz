#!/usr/bin/env node

/**
 * Script para restaurar os ícones e logos oficiais (produção) aos apps
 * Copia os ícones da pasta official-assets para as pastas public dos apps
 */

const fs = require('fs');
const path = require('path');

const APPS = [
  {
    source: path.resolve(__dirname, '../apps/avalia-quiz/official-assets'),
    target: path.resolve(__dirname, '../apps/avalia-quiz/public'),
    configTarget: path.resolve(__dirname, '../apps/avalia-quiz/src/config'),
    name: 'avalia-quiz'
  },
  {
    source: path.resolve(__dirname, '../apps/avalia-jw-quiz/official-assets'),
    target: path.resolve(__dirname, '../apps/avalia-jw-quiz/public'),
    configTarget: path.resolve(__dirname, '../apps/avalia-jw-quiz/src/config'),
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
  return `// Auto-generated official logo config
export const CANARY_LOGO_CONFIG = {
  enabled: ${hasLogo},
  appName: '${appName}'
};
`;
}

console.log('🎨 Restaurando ícones e logos oficiais para produção...\n');

APPS.forEach(app => {
  console.log(`📦 Processando ${app.name}...`);
  
  const publicDir = app.target;
  const configDir = app.configTarget;
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Copiar ícones oficiais
  console.log('  📷 Ícones Oficiais:');
  ICON_FILES.forEach(file => {
    const sourceFile = path.join(app.source, file);
    const targetFile = path.join(publicDir, file);
    
    if (fs.existsSync(sourceFile)) {
      copyFile(sourceFile, targetFile);
    }
  });
  
  // Copiar logos oficiais
  console.log('  🎨 Logos Oficiais:');
  let hasLogoAssets = false;
  LOGO_FILES.forEach(file => {
    const sourceFile = path.join(app.source, file);
    const targetFile = path.join(publicDir, file);
    
    if (fs.existsSync(sourceFile)) {
      copyFile(sourceFile, targetFile);
      hasLogoAssets = true;
    }
  });
  
  // Criar arquivo de configuração do logo oficial (canary disabled)
  const logoConfigFile = path.join(configDir, 'canary-logo.ts');
  const logoConfig = createLogoConfig(app.name, false); // false para desativar a tag canary em produção
  try {
    fs.writeFileSync(logoConfigFile, logoConfig);
    console.log(`✓ Configuração: ${path.relative('.', logoConfigFile)}`);
  } catch (error) {
    console.warn(`⚠ Erro ao criar config: ${error.message}`);
  }
  
  console.log();
});

console.log('✅ Assets oficiais restaurados com sucesso!');
