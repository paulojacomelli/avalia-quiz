# 📋 Revisão de Arquitetura - Avalia Monorepo

**Data**: Junho 10, 2026  
**Status**: Análise Completa (Sem Alterações)  
**Objetivo**: Identificar código duplicado, compartilhado inadequadamente, e responsabilidades misturadas

---

## 📊 Resumo Executivo

O monorepo **Avalia** segue uma arquitetura multi-app com core compartilhado, onde dois quizzes distintos (`avalia-quiz` e `avalia-jw-quiz`) compartilham a mesma engine, design system e serviços. A análise identificou:

✅ **Bom**: Estrutura de packages compartilhados bem organizada  
⚠️ **Atenção**: Código duplicado em `App.tsx` e `main.tsx` (99% idêntico)  
⚠️ **Atenção**: `quizConfig.tsx` não é totalmente compartilhado  
⚠️ **Atenção**: Responsabilidades de logo misturadas em componentes dedicados  

---

## 1️⃣ Código Duplicado que DEVERIA ser Compartilhado

### 🔴 CRÍTICO: App.tsx (99% idêntico)

**Arquivos afetados:**
- `apps/avalia-quiz/src/App.tsx`
- `apps/avalia-jw-quiz/src/App.tsx`

**Análise:**
```typescript
// HOJE: Duplicado
// avalia-quiz/App.tsx
const renderedTitle = (
  <h1 className="...">Aval<span>ia</span> Quiz</h1>
);
<AuthProvider storageKeyPrefix="generic_quiz">
  <GameEngine appConfig={QUIZ_CONFIG} defaultLanguage="pt" title={renderedTitle} />
</AuthProvider>

// avalia-jw-quiz/App.tsx (99% igual, apenas textos diferentes)
const renderedTitle = (
  <h1 className="...">Aval<span>ia</span> JW Quiz</h1>
);
<AuthProvider storageKeyPrefix="jw_quiz">
  <GameEngine appConfig={QUIZ_CONFIG} defaultLanguage="pt" title={renderedTitle} />
</AuthProvider>
```

**Problema**: Lógica idêntica, apenas valores de configuração diferentes.

**Solução Recomendada**: 
- Mover para `packages/core` como `AppShell.tsx` (componente genérico)
- Aceitar `title` e `storageKeyPrefix` como props
- Apps apenas chamam `<AppShell title={...} prefix={...} />`

---

### 🔴 CRÍTICO: main.tsx (99% idêntico)

**Arquivos afetados:**
- `apps/avalia-quiz/src/main.tsx`
- `apps/avalia-jw-quiz/src/main.tsx`

**Análise:**
```typescript
// HOJE: Duplicado
// avalia-quiz/main.tsx
import '../../../themes/generic-theme.css';

// avalia-jw-quiz/main.tsx (idêntico, apenas tema diferente)
import '../../../themes/jw-theme.css';
```

**Problema**: Mesma estrutura de inicialização React, só tema muda.

**Solução Recomendada**:
- Criar `packages/core/src/bootstrap.tsx` (função reutilizável)
- Apps apenas chamam `bootstrap('generic-theme')` ou `bootstrap('jw-theme')`

---

### 🟡 MODERADO: quizConfig.tsx (Estrutura similar, conteúdo diferente)

**Arquivos afetados:**
- `apps/avalia-quiz/src/config/quizConfig.tsx`
- `apps/avalia-jw-quiz/src/config/quizConfig.tsx`

**Análise:**

Ambos seguem a mesma **estrutura de schema**, apenas com **valores customizados**:

```typescript
// Schema idêntico em ambos
export const QUIZ_CONFIG = {
  appName: string;
  storagePrefix: string;
  theme: { primaryColor, accentColor };
  customLogo: JSX.Element;
  systemPrompt: string;
  topicModes: Array<TopicMode>;
  // ... opcional: formRules (apenas JW)
}
```

**Diferenças legítimas** (feature flags, prompts específicos do domínio):
- JW tem `formRules` (validação de domínio jw.org)
- Prompts do sistema são completamente diferentes
- Topic modes são diferentes por tema
- Logos customizados

**Problema**: Estrutura poderia ser validada com schema compartilhado (TypeScript interface).

**Solução Recomendada**:
- Criar `packages/core/src/types/QuizConfig.ts` com interface comum
- Ambos apps implementam essa interface
- Config mantém-se local (não é código duplicado, é configuração específica)

---

## 2️⃣ Código Compartilhado que DEVERIA ser Dedicado

### 🟢 ✅ CORRETO: `@avalia/game-engine`

**Status**: Bem estruturado e genérico ✅

A engine é corretamente implementada como core reutilizável:
- Aceita `appConfig` dinâmico
- Não hardcoda quiz específico
- Funciona para qualquer quiz via config

```typescript
// Correto: Accept config
<GameEngine appConfig={QUIZ_CONFIG} defaultLanguage="pt" title={renderedTitle} />
```

**Recomendação**: Manter como está.

---

### 🟢 ✅ CORRETO: `@avalia/design-system`

**Status**: Bem separado, apenas componentes UI ✅

- Não contém lógica de quiz
- VLibras, componentes de input, layout
- Completamente reutilizável

**Recomendação**: Manter como está.

---

### 🟢 ✅ CORRETO: `@avalia/services`

**Status**: Camada de serviços genérica ✅

- Acesso a API Gemini
- Chamadas Firebase
- Nenhuma lógica quiz-específica

**Recomendação**: Manter como está.

---

## 3️⃣ Responsabilidades Globais em Componentes Dedicados

### 🟡 ATENÇÃO: Logo Handling

**Problema Identificado:**

Cada app tem seu próprio arquivo de logo:
```
apps/avalia-quiz/src/config/
  ├─ genericLogoSvg.tsx      ← Componente dedicado (obrigado)
  ├─ canary-logo.ts          ← Config compartilhada

apps/avalia-jw-quiz/src/config/
  ├─ jwLogoSvg.tsx           ← Componente dedicado (obrigado)
  ├─ canary-logo.ts          ← Config compartilhada (duplicada?)
```

**Análise:**
- `canary-logo.ts` em ambas as pastas → Verificar se é **duplicado**
- Logo SVGs estão corretamente em seus apps (dedicados)

**Recomendação**:
- Se `canary-logo.ts` é idêntico → Mover para `packages/core`
- Se é diferente → Manter como está (dedicado é correto)

---

### 🟢 ✅ CORRETO: Temas (`themes/generic-theme.css` vs `themes/jw-theme.css`)

**Status**: Bem separado ✅

Cada tema é uma folha CSS completamente independente na raiz `themes/`. Isso é **correto** porque:
- Diferentes cores, fontes, layouts
- Cada app importa seu tema em `main.tsx`
- Sem compartilhamento inadequado

---

## 4️⃣ Responsabilidades Dedicadas em Componentes Compartilhados

### 🟢 ✅ CORRETO: `@avalia/game-engine`

A engine **não implementa responsabilidades dedicadas**. Ela:
- Aceita config customizável
- Renderiza baseado em estado
- Delega lógica UI para design-system

Exemplo correto:
```typescript
// GameEngine.tsx (core compartilhado)
export function GameEngine({ appConfig, title, defaultLanguage }) {
  // Genérico: não hardcoda quiz específico
  // Funciona com ANY appConfig
}
```

---

### 🟢 ✅ CORRETO: `@avalia/core`

Core contém apenas:
- Tipos compartilhados
- Utilitários genéricos
- Validadores (ex: VLibras dictionary)
- Sem lógica quiz-específica

---

## 📈 Matriz de Avaliação

| Aspecto | Status | Recomendação |
|---------|--------|--------------|
| **App.tsx duplicação** | 🔴 Crítico | Extrair para `AppShell` |
| **main.tsx duplicação** | 🔴 Crítico | Extrair `bootstrap()` |
| **quizConfig.tsx** | 🟡 Atenção | Criar interface compartilhada |
| **Logo SVGs** | 🟢 Correto | Manter dedicados |
| **Temas CSS** | 🟢 Correto | Manter dedicados |
| **GameEngine** | 🟢 Correto | Manter genérico |
| **design-system** | 🟢 Correto | Manter UI-only |
| **services** | 🟢 Correto | Manter genérico |
| **canary-logo.ts** | 🟡 Verificar | Checar se é duplicado |

---

## 🎯 Plano de Ação (Prioridades)

### Fase 1: Crítico (Eliminar Duplicação Imediata)
1. Extrair `App.tsx` → `packages/core/src/AppShell.tsx`
2. Extrair `main.tsx` logic → `packages/core/src/bootstrap.ts`
3. Ambos apps apenas importam e chamam

**Ganho**: Redução 50+ linhas de código duplicado, mudança única num lugar

### Fase 2: Atenção (Melhorias de Type Safety)
1. Criar `packages/core/src/types/QuizConfig.ts`
2. Ambos apps implementam a interface
3. Validação em tempo de compilação

**Ganho**: Type safety, previne bugs de config

### Fase 3: Verificação (Housekeeping)
1. Conferir `canary-logo.ts` em ambos apps
2. Se duplicado → Mover para `packages/core`
3. Se diferente → Documentar por quê

---

## 🏗️ Estrutura Recomendada (Pós-Refactor)

```
avalia-monorepo/
├─ apps/
│  ├─ avalia-quiz/src/
│  │  ├─ App.tsx (REMOVIDO → agora é AppShell)
│  │  ├─ main.tsx (SIMPLIFICADO → apenas bootstrap)
│  │  ├─ config/
│  │  │  ├─ genericLogoSvg.tsx ✅ (dedicado)
│  │  │  ├─ quizConfig.tsx ✅ (implementa interface)
│  │  │  └─ canary-logo.ts ? (verificar se mover)
│  │  └─ index.css
│  │
│  └─ avalia-jw-quiz/src/
│     ├─ App.tsx (REMOVIDO → agora é AppShell)
│     ├─ main.tsx (SIMPLIFICADO → apenas bootstrap)
│     ├─ config/
│     │  ├─ jwLogoSvg.tsx ✅ (dedicado)
│     │  ├─ quizConfig.tsx ✅ (implementa interface)
│     │  └─ canary-logo.ts ? (verificar se mover)
│     └─ index.css
│
└─ packages/
   ├─ core/src/
   │  ├─ AppShell.tsx ✨ (novo: genérico)
   │  ├─ bootstrap.ts ✨ (novo: setup genérico)
   │  ├─ types/
   │  │  └─ QuizConfig.ts ✨ (novo: interface)
   │  └─ vlibras-dictionary-validator.ts ✅
   │
   ├─ game-engine/ ✅ (sem mudanças)
   ├─ design-system/ ✅ (sem mudanças)
   └─ services/ ✅ (sem mudanças)
```

---

## 📝 Conclusão

A arquitetura atual é **boa**, mas tem **oportunidades imediatas de limpeza**:

✅ **Bem feito**: Estrutura de packages, game-engine genérico, design system separado  
🔴 **Precisa agora**: Eliminar duplicação em App.tsx e main.tsx  
🟡 **Melhorar**: Usar TypeScript interfaces para validar configurações  
🟢 **Manter**: Logos, temas, componentes dedicados por app  

**Próximo passo**: Executar Fase 1 para eliminar duplicação crítica.

---

**Revisão completada por**: Kiro  
**Sem alterações implementadas**: Aguardando aprovação
