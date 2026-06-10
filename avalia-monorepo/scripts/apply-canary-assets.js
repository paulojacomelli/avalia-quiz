#!/usr/bin/env node

/**
 * Script para aplicar os ícones canary aos apps de dev
 * Copia os ícones da pasta canary para as pastas public dos apps
 */

const fs = require('fs');
const path = require('path');

const CANARY_APPS = [
  {
    source: 'apps/quiz-canary',
    target: 'apps/avalia-quiz/public',
    name: 'avalia-quiz'
  },
  {
    source: 'apps/jwquiz-canary',
    target: 'apps/avalia-jw-quiz/public',
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

function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    console.log(`✓ Copiado: ${path.relative('.', destination)}`);
  } catch (error) {
    console.error(`✗ Erro ao copiar ${path.relative('.', source)}: ${error.message}`);
    process.exit(1);
  }
}

console.log('🎨 Aplicando ícones canary para os apps de dev...\n');

CANARY_APPS.forEach(app => {
  console.log(`📦 Processando ${app.name}...`);
  
  const targetDir = app.target;
  
  // Criar diretório se não existir
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copiar cada ícone
  ICON_FILES.forEach(file => {
    const sourceFile = path.join(app.source, file);
    const targetFile = path.join(targetDir, file);
    
    if (fs.existsSync(sourceFile)) {
      copyFile(sourceFile, targetFile);
    } else {
      console.warn(`⚠ Arquivo não encontrado: ${sourceFile}`);
    }
  });
  
  console.log();
});

console.log('✅ Ícones canary aplicados com sucesso!');
