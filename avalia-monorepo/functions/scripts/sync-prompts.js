import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../packages/ai-prompts/src');
const targetDir = path.resolve(__dirname, '../src/ai-prompts');

if (!fs.existsSync(sourceDir)) {
  console.error(`[sync-prompts] Diretorio de origem nao encontrado: ${sourceDir}`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(sourceDir);
let count = 0;

for (const file of files) {
  if (!file.endsWith('.ts')) continue;

  const sourceFilePath = path.join(sourceDir, file);
  const targetFilePath = path.join(targetDir, file);

  let content = fs.readFileSync(sourceFilePath, 'utf-8');

  // Ajusta os imports para o ambiente de Cloud Functions (substitui @avalia/core por ./core-types)
  content = content.replace(/from ["']@avalia\/core["']/g, 'from "./core-types"');

  fs.writeFileSync(targetFilePath, content, 'utf-8');
  count++;
}

console.log(`[sync-prompts] ${count} arquivos de prompt sincronizados com sucesso de packages/ai-prompts/src para functions/src/ai-prompts`);
