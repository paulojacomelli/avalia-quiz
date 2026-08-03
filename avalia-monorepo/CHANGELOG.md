# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.9.58] - 2026-08-03

### Adicionado
- Telemetria `model_validation` em `validateApiKey` — registra validações de chaves de API (sucesso e falha) no Firestore com provider, model e duração
- Evento `model_validation` adicionado ao union type `TelemetryEventType`

### Alterado
- Runtime das Cloud Functions: Node.js 20 → Node.js 22 (`firebase.json` + `functions/package.json`)
- `engines.node` das functions: `"22"` → `">=22"` (forward-compatible com Node 24+)
- Autenticação CI/CD: `FIREBASE_TOKEN` (deprecated) → `GOOGLE_APPLICATION_CREDENTIALS` (Service Account)
- `package-lock.json` atualizado (invalida cache antigo do runner com entrada `functions@1.0.0`)

### Removido
- Bloco legado de leitura de `admin_key_*` e `admin_key` do Firestore em `resolveAutoConnection.ts` — campos migrados para GCP Secret Manager
- Import morto de `resolveAutoConnection` em `GameEngine.tsx` (função nunca foi chamada)

### Corrigido
- Deploy paralelo `dev` + `main` causando HTTP 409 nas Cloud Functions — estabelecido fluxo sequencial
- `EBADENGINE` de `functions@1.0.0` no CI causado por cache stale do runner

### Segurança
- Migração completa de autenticação Firebase para Service Account JSON via GitHub Secrets

---

## [1.9.57] - 2026-07-31

### Adicionado
- Sistema de `customProviderService.ts` com CRUD completo para provedores de IA personalizados
- `CustomProviderModal.tsx` para criação e edição de provedores customizados

### Corrigido
- Rules of Hooks violation em `GameEngine.tsx` (early returns antes dos hooks)
- `resolveAiModelLabel()` lançando exceção quando `provider` é `undefined` em `useGameLoop`

---

## [1.9.52] - 2026-07-25

### Adicionado
- Design system atualizado com componentes de glassmorphism e micro-animações
- Suporte a múltiplos provedores de IA: OpenRouter, Groq, Claude, DeepSeek, OpenAI

### Alterado
- Chaves de API migradas do Firestore para GCP Secret Manager
- Arquitetura de Cloud Functions: `generateQuizProxy` e `getAvailableModelsProxy`

---

_Releases anteriores a 1.9.52 não foram documentadas retroativamente._
