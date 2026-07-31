# Auditoria de Fallbacks: Violações do Princípio de Integridade Operacional

**Data**: 30/07/2026  
**Foco**: Identificar fallbacks que alteram autoridade, identidade ou semântica da operação

---

## PRINCÍPIO DE INTEGRIDADE OPERACIONAL

> **O objetivo do sistema não é simplesmente produzir um resultado.**  
> **O objetivo é produzir o resultado usando exatamente os recursos, credenciais, provider, modelo e modo de operação autorizados pelo contexto da solicitação.**

### Regra Fundamental

Quando uma dependência obrigatória falhar, o sistema deve **falhar explicitamente** e informar o erro.

### É PROIBIDO introduzir fallback silencioso para:

- ❌ Outra API Key
- ❌ Outra credencial
- ❌ Credencial administrativa
- ❌ Outro provider
- ❌ Outro modelo
- ❌ Outro modo de autenticação
- ❌ Outro backend
- ❌ Conteúdo fictício/mock
- ❌ Valor default inexistente
- ❌ Configuração artificial

### Exceção Única

Um fallback só é permitido quando fizer parte **explicitamente do contrato funcional** do sistema (ex: Modo "Auto" configurado pelo usuário).

---

## CATEGORIA ESPECIAL: 🔴 FALLBACK DE PRIVILÉGIO

**Definição**: Fallback que **eleva a autoridade da operação** para fazê-la funcionar.

### Exemplos Críticos:

```
Credencial do usuário (BYOK)
    ↓ falha
    ↓ ❌ VIOLAÇÃO
Credencial administrativa
```

```
Provider configurado pelo usuário
    ↓ falha  
    ↓ ❌ VIOLAÇÃO
Provider pago pela aplicação
```

```
Modelo autorizado pelo usuário
    ↓ indisponível
    ↓ ❌ VIOLAÇÃO  
Modelo administrativo
```

---

## ANÁLISE DO CÓDIGO AVALIA


### 🔴 VIOLAÇÃO CRÍTICA #1: Cloud Function → Direct API

**Arquivo**: `packages/services/src/geminiService.ts` (linha ~746)

```typescript
const isDirectApiKey = apiKey.startsWith("AIza") || 
                       apiKey.startsWith("sk-") || 
                       apiKey.startsWith("gsk_");

if (!isDirectApiKey) {
  // PIN/Token opaco → deve usar Cloud Function Proxy
  try {
    const functionUrl = "https://us-central1-avalia-jw-quiz.cloudfunctions.net/generateQuizProxy";
    const resp = await fetch(functionUrl, { ... });
    if (resp.ok) return await resp.json().quiz;
  } catch (err) {
    // ⚠️ VIOLAÇÃO: Se Cloud Function falha, tenta API direto
    return await executeSingleQuizRequest(apiKey, config, ...);
  }
}
```

**Diagnóstico**: 🔴 **FALLBACK DE PRIVILÉGIO**

**Violação**:
- **Contexto Esperado**: Credencial administrativa via Cloud Function (segura, server-side)
- **Fallback Executado**: Credencial exposta no browser (insegura, client-side)
- **Autoridade Mudou**: Server-side → Client-side

**Consequências**:
1. PIN/Token administrativo exposto no Network tab do browser
2. Violação de política de segurança
3. Credentials podem ser capturadas por loggers/interceptors
4. Usuário não sabe que credencial foi exposta

**Contrato Violado**:
- Usuário usa "Código de Acesso" → Espera segurança server-side
- Sistema falha no proxy → Executa client-side SEM avisar

**Ação Requerida**: ❌ **REMOVER COMPLETAMENTE**
```typescript
// CORRETO:
if (!isDirectApiKey) {
  const functionUrl = "...";
  const resp = await fetch(functionUrl, { ... });
  if (!resp.ok) {
    throw new Error("Cloud Function indisponível. Tente novamente ou use chave API direta.");
  }
  return await resp.json().quiz;
}
// Sem fallback para API direta
```

---

### 🔴 VIOLAÇÃO CRÍTICA #2: Auto-Connection Provider Swap

**Arquivo**: `packages/services/src/resolveAutoConnection.ts` (linha ~119)

```typescript
export const resolveAutoConnection = async (firestoreData): Promise<ResolvedConnection> => {
  const orderedCandidates = orderProviders(rawCandidates, auto_provider_order);
  
  for (const candidate of orderedCandidates) {
    try {
      await validateApiKey(candidate.apiKey, candidate.provider, candidate.model);
      // ⚠️ Retorna primeiro que funcionar
      return {
        provider: candidate.provider,  // Provider pode ser diferente do esperado
        apiKey: candidate.apiKey,
        model: candidate.model,
        attempts
      };
    } catch (err) {
      attempts.push({ provider, model, success: false, error: msg });
    }
  }
}
```

**Diagnóstico**: 🟡 **POTENCIAL FALLBACK DE PRIVILÉGIO** (depende do contexto)

**Análise**:

#### Cenário 1: Modo "Auto" Explícito ✅
```
Usuário seleciona: "Auto" no dropdown
Sistema tenta: Google AI → OpenRouter → Claude
Resultado: Claude funcionou
UI mostra: "Quiz gerado com Claude"
```
**Válido**: Funcionalidade explícita do modo Auto

#### Cenário 2: Substituição Silenciosa ❌
```
Usuário seleciona: "Google AI" + "gemini-2.0-flash"
Sistema detecta: Google AI indisponível
Sistema tenta: OpenRouter automaticamente
Resultado: Quiz gerado com OpenRouter
UI mostra: "Quiz gerado" (sem indicar provider diferente)
```
**Violação**: Semântica mudou sem consentimento

**Verificação Necessária**:
- ✅ Se `resolveAutoConnection()` só é chamado quando `provider === 'auto'` → OK
- ❌ Se é chamado como fallback quando provider específico falha → VIOLAÇÃO

**Ação Requerida**: 
1. Garantir que `resolveAutoConnection()` **NUNCA** é chamado exceto quando `provider === 'auto'`
2. Se provider específico falha → erro explícito
3. UI deve sempre mostrar qual provider foi usado

---

### 🔴 VIOLAÇÃO CRÍTICA #3: Discovery Duplo Fallback

**Arquivo**: `packages/services/src/resolveAutoConnection.ts` (linha ~41)

```typescript
const discoverConfiguredProviders = (firestoreData) => {
  // Fonte 1: Array de providers do Firestore
  if (Array.isArray(firestoreData.providers) && length > 0) {
    return firestoreData.providers.filter(...).map(...);
  }

  // ⚠️ FALLBACK: Mapa explícito de provedores (credenciais antigas)
  const supportedProviders = ['google-ai', 'openrouter', 'groq', ...];
  for (const prov of supportedProviders) {
    const key = firestoreData[`admin_key_${slug}`] || 
                (prov === 'google-ai' ? firestoreData.admin_key : undefined);
    // Usa credenciais do mapa legado
  }
};
```

**Diagnóstico**: 🔴 **FALLBACK DE CONFIGURAÇÃO/CREDENCIAL**

**Violação**:
- **Fonte Canônica**: Array `providers` no Firestore
- **Fallback**: Mapa legado `admin_key_${provider}`
- **Autoridade Mudou**: Config nova → Config antiga (possivelmente revogada)

**Consequências**:
1. Credenciais antigas/revogadas podem ser usadas
2. Provider desativado em `providers[]` pode ser ativado via mapa legado
3. Sem rastreamento de qual fonte foi usada

**Ação Requerida**: ❌ **REMOVER FALLBACK**
```typescript
const discoverConfiguredProviders = (firestoreData) => {
  if (!Array.isArray(firestoreData.providers) || firestoreData.providers.length === 0) {
    throw new Error("Nenhum provedor configurado. Configure em Admin > Providers.");
  }
  
  return firestoreData.providers
    .filter(p => p && p.enabled !== false && p.id && p.key && p.model)
    .map(p => ({ provider: p.id, apiKey: p.key, model: p.model }));
}
// Sem fallback para mapa legado
```

---

### 🔴 VIOLAÇÃO CRÍTICA #4: Fallback Evaluation (String Match)

**Arquivo**: `packages/services/src/geminiService.ts` (linha ~1039)

```typescript
const fallbackEvaluate = (question, modelAnswer, userAnswer): EvaluationResult => {
  const normUser = userAnswer.trim().toLowerCase();
  const normModel = modelAnswer.trim().toLowerCase();
  
  return {
    score: normUser === normModel ? 1.0 : 0.0,
    feedback: "",
    isCorrect: normUser === normModel
  };
};

export const evaluateFreeResponse = async (...) => {
  try {
    return await evaluateViaApi(...);  // IA avalia
  } catch (error) {
    console.error("AI Error, applying fallback:", error);
    // ⚠️ VIOLAÇÃO: API falha → retorna avaliação por string match
    return fallbackEvaluate(question, modelAnswer, userAnswer);
  }
};
```

**Diagnóstico**: 🔴 **FALLBACK DE NEGÓCIO/CONTEÚDO**

**Violação**:
- **Método Esperado**: Avaliação semântica por IA
- **Fallback**: Comparação exata de strings (case-insensitive)
- **Semântica Mudou**: IA → Regex simples

**Consequências**:
1. Avaliação completamente errada
2. "sim" ≠ "Sim, concordo" (ambos deveriam ser corretos)
3. "não" ≠ "Não concordo" (string match muito rígido)
4. Usuário não sabe que avaliação foi por fallback fraco
5. Fabrica resultado de "sucesso" quando operação falhou

**Ação Requerida**: ❌ **REMOVER FALLBACK**
```typescript
export const evaluateFreeResponse = async (...) => {
  try {
    return await evaluateViaApi(...);
  } catch (error) {
    throw new Error(
      "Erro ao avaliar resposta livre. " +
      "Verifique sua conexão e tente novamente. " +
      "Se o erro persistir, selecione outro provedor ou modelo."
    );
  }
}
// Sem fallback para string match
```

---

### 🟡 VIOLAÇÃO MÉDIA #5: Model || "default"

**Arquivo**: `packages/services/src/geminiService.ts` (múltiplos locais)

```typescript
// Exemplo encontrado:
const effectiveProvider = provider === 'auto' ? 'openrouter' : provider;

// Potencial em outros locais:
const model = selectedModel || 'gemini-2.0-flash';  // ⚠️ Se existir
const provider = selectedProvider || 'google-ai';    // ⚠️ Se existir
```

**Diagnóstico**: 🔴 **FALLBACK DE CONFIGURAÇÃO**

**Violação**:
- **Configuração Esperada**: Modelo selecionado pelo usuário
- **Fallback**: Modelo default fictício
- **Semântica Mudou**: Modelo escolhido → Modelo arbitrário

**Consequências**:
1. Usuário não sabe qual modelo foi usado
2. Custo pode ser diferente
3. Qualidade de resposta diferente
4. Impossível debugar "qual modelo gerou isso?"

**Ação Requerida**: ❌ **REMOVER TODOS os defaults**
```typescript
// CORRETO:
if (!model || !model.trim()) {
  throw new Error("Modelo de IA não foi selecionado. Selecione um modelo antes de gerar o quiz.");
}
if (!provider || !provider.trim()) {
  throw new Error("Provedor de IA não foi selecionado. Selecione um provedor antes de continuar.");
}
// Forçar seleção explícita no UI
```

---

### 🟢 NÃO É VIOLAÇÃO #1: TTS Cascata

**Arquivo**: `packages/services/src/tts.ts`

```typescript
// 1. URL Storage
if (audioUrl) {
  await playAudioUrl(audioUrl);
  return;
}

// 2. Base64 pré-gerado
if (preGeneratedAudio) {
  await playAudioData(preGeneratedAudio);
  return;
}

// 3. Gemini TTS
if (apiKey) {
  const audioBase64 = await generateSpeech(apiKey, text);
  await playAudioData(audioBase64);
  return;
}
```

**Diagnóstico**: 🟢 **NÃO É FALLBACK DE PRIVILÉGIO**

**Por quê**:
- ✅ Mesma semântica: "reproduzir áudio da pergunta"
- ✅ Mesma autoridade: usa credenciais do usuário
- ✅ Sem elevação de privilégio
- ✅ Cascata técnica de otimização (cache → geração)

**Melhoria Sugerida**: 
- Adicionar indicador visual se audio falha
- Callback `onTtsFailure()` para UI avisar

---

### 🟢 NÃO É VIOLAÇÃO #2: Rate Limiting

**Arquivo**: `packages/services/src/rateLimiter.ts`

```typescript
if (newAttempts >= 10) {
  blockSeconds = 3600;
  delayMs = 5000;
}
```

**Diagnóstico**: 🟢 **NÃO É FALLBACK**

**Por quê**:
- ✅ Controle de segurança legítimo
- ✅ Sem mudança de semântica
- ✅ Falha é explícita (bloqueio)
- ✅ Não mascara erro

---

### 🟢 NÃO É VIOLAÇÃO #3: Firebase Empty Values

**Arquivo**: `packages/services/src/firebase.ts`

```typescript
export const getGlobalKeywords = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(...);
    return keywords;
  } catch (error) {
    console.error("Erro ao buscar keywords:", error);
    return [];  // Empty array
  }
};
```

**Diagnóstico**: 🟢 **NÃO É FALLBACK DE PRIVILÉGIO**

**Por quê**:
- ✅ Não cria dados fictícios
- ✅ `[]` significa "nenhum dado disponível"
- ✅ Código cliente trata corretamente
- ✅ Sem elevação de autoridade

---

## RESUMO EXECUTIVO: Violações Encontradas

| # | Tipo | Arquivo | Linha | Severidade | Status |
|---|------|---------|-------|------------|--------|
| 1 | Cloud Function → Direct API | geminiService.ts | ~746 | 🔴 CRÍTICO | REMOVER |
| 2 | Auto-Connect Provider Swap | resolveAutoConnection.ts | ~119 | 🟡 VERIFICAR | REVISAR |
| 3 | Discovery Duplo Fallback | resolveAutoConnection.ts | ~41 | 🔴 CRÍTICO | REMOVER |
| 4 | Fallback Evaluation String Match | geminiService.ts | ~1039 | 🔴 CRÍTICO | REMOVER |
| 5 | Model/Provider Defaults | geminiService.ts | múltiplos | 🔴 CRÍTICO | REMOVER |

---

## AÇÕES IMEDIATAS REQUERIDAS

### 1. REMOVER: Cloud Function → Direct API Fallback

**Impacto**: CRÍTICO - Expõe credenciais administrativas no browser

```typescript
// ANTES (PERIGOSO):
if (!isDirectApiKey) {
  try {
    return await cloudFunctionProxy();
  } catch {
    return await directApi();  // ❌ REMOVE
  }
}

// DEPOIS (SEGURO):
if (!isDirectApiKey) {
  const resp = await cloudFunctionProxy();
  if (!resp.ok) {
    throw new Error("Cloud Function indisponível. Tente novamente em alguns segundos.");
  }
  return resp;
}
```

### 2. REMOVER: Discovery Duplo Fallback

**Impacto**: CRÍTICO - Usa credenciais antigas/revogadas

```typescript
// ANTES (PERIGOSO):
if (Array.isArray(providers)) return providers;
return legacyMapFallback();  // ❌ REMOVE

// DEPOIS (SEGURO):
if (!Array.isArray(providers) || providers.length === 0) {
  throw new Error("Nenhum provedor configurado no Firestore.");
}
return providers;
```

### 3. REMOVER: Fallback Evaluation

**Impacto**: CRÍTICO - Retorna avaliação incorreta

```typescript
// ANTES (PERIGOSO):
try {
  return await aiEvaluation();
} catch {
  return stringMatch();  // ❌ REMOVE
}

// DEPOIS (SEGURO):
try {
  return await aiEvaluation();
} catch (error) {
  throw new Error("Falha ao avaliar resposta. Tente novamente.");
}
```

### 4. REMOVER: Model/Provider Defaults

**Impacto**: CRÍTICO - Muda semântica sem consentimento

```typescript
// ANTES (PERIGOSO):
const model = userModel || 'default';  // ❌ REMOVE

// DEPOIS (SEGURO):
if (!userModel || !userModel.trim()) {
  throw new Error("Selecione um modelo antes de continuar.");
}
const model = userModel;
```

### 5. VERIFICAR: resolveAutoConnection Contexto

**Impacto**: MÉDIO - Pode violar se usado como fallback

**Verificar**:
- ✅ Só é chamado quando `provider === 'auto'`?
- ❌ É chamado como fallback quando provider específico falha?

**Se usado como fallback** → REMOVER uso, manter apenas para modo "Auto"

---

## REGRA ARQUITETURAL PARA O PROJETO

### Documento: `.kiro/steering/integridade-operacional.md`

```markdown
# Princípio de Integridade Operacional

## Regra Fundamental

O sistema NUNCA deve substituir silenciosamente:
- Credenciais (BYOK → Admin Key)
- Providers (OpenAI → Google AI)
- Modelos (gpt-4 → gpt-3.5)
- Modos de autenticação (CODE → BYOK)
- Backends (Cloud Function → Direct API)

## Quando Falhar

Se uma dependência obrigatória falhar, o sistema deve:
1. Falhar explicitamente
2. Informar o erro ao usuário
3. Sugerir ação corretiva

## Exceção Única

Fallback é permitido APENAS quando:
1. Faz parte do contrato funcional (Modo "Auto")
2. Está explicitamente documentado
3. UI mostra qual recurso foi usado
4. Usuário pode revisar e rejeitar

## Proibido

- ❌ Fallback de credencial
- ❌ Fallback de provider (exceto modo Auto)
- ❌ Fallback de modelo (exceto modo Auto)
- ❌ Fallback de backend
- ❌ Valores default fictícios
- ❌ Conteúdo mock/fake

## Permitido

- ✅ Try-catch defensivo
- ✅ Retry técnico (mesma operação)
- ✅ Error boundaries
- ✅ Cleanup de recursos
- ✅ Valores vazios (`[]`, `null`, `{}`)
```

---

## MÉTRICA ARQUITETURAL

**Pergunta correta**: 
> Quais caminhos alternativos podem alterar a **autoridade**, **identidade** ou **semântica** da operação?

**NÃO**: "Quantos fallbacks existem?"

---

**Fim da Auditoria de Fallbacks de Privilégio**  
Data: 30/07/2026  
**Total de Violações Críticas**: 4  
**Total de Violações Médias**: 1  
**Ações Requeridas**: 5 remoções imediatas
