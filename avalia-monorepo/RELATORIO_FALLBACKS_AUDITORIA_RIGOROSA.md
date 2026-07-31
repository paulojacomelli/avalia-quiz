# Auditoria Rigorosa de Fallbacks - Avalia Monorepo

**Abordagem**: Identificar apenas fallbacks que mascaram falhas reais ou inventam valores de negócio  
**Data**: 30/07/2026  
**Classificação**: 🔴 Prohibido vs 🟢 Permitido

---

## MATRIZ DE CLASSIFICAÇÃO

| Categoria | Comportamento | Política | Exemplos |
|-----------|--------------|----------|----------|
| **Fallback de Negócio** | Escolhe outro modelo/provider | 🔴 Proibir | Auto-select, provider alternativo |
| **Fallback de Credencial** | Procura outra fonte de chave | 🔴 Proibir | API Key alternativa, Secret Manager fallback |
| **Fallback de Configuração** | Cria valor artificial | 🔴 Proibir | model = "default", theme = "Geral" |
| **Fallback de Conteúdo** | Retorna conteúdo fake | 🔴 Proibir | Quiz fictício, pergunta genérica |
| **Fallback de Infraestrutura** | Executa por outro caminho | 🔴 Proibir | Cloud Function → Direct Browser API |
| **Retry Técnico** | Repete mesma operação | 🟢 Permitir | Retry com backoff, reconexão |
| **Error Handling** | Trata erro explicitamente | 🟢 Permitir | Try-catch com logging, throw |
| **Defensive Programming** | Evita undefined/crash | 🟢 Permitir | Optional chaining, nullish coalescing |
| **Cleanup** | Libera recursos após erro | 🟢 Permitir | Try-finally, close connections |
| **Observabilidade** | Registra sem mascarar | 🟢 Permitir | Telemetry, logging, alerting |

---

## ANÁLISE CRÍTICA DOS 40 FALLBACKS


## FALLBACKS 🔴 PERIGOSOS (Mascarar Falhas)

### 1️⃣ **Auto-Connection: Provider Alternativo Silencioso**

**Arquivo**: `packages/services/src/resolveAutoConnection.ts`

```typescript
export const resolveAutoConnection = async (firestoreData): Promise<ResolvedConnection> => {
  const orderedCandidates = orderProviders(rawCandidates, auto_provider_order);
  
  for (const candidate of orderedCandidates) {
    try {
      await validateApiKey(candidate.apiKey, candidate.provider, candidate.model);
      return {  // ⚠️ Retorna primeiro que funcionar
        provider: candidate.provider,
        apiKey: candidate.apiKey,
        model: candidate.model,
        attempts
      };
    } catch (err) {
      // Tenta próximo silenciosamente
      attempts.push({ provider, model, success: false, error: msg });
    }
  }
  throw new AutoConnectionError(attempts);
};
```

**Diagnóstico**: 🔴 **PERIGOSO**

**Por quê**: 
- Usuário selecionou "Auto" e espera fallback
- MAS: Sem "Auto" explícito, sistema escolhe provider/modelo sem consentimento
- Transforma: "Provider indisponível" → "Usando Google AI em vez de Claude"

**Risco**: Semântica mudou sem autorização. Resultado pode ser diferentes, custo diferente.

**Recomenação**: ✅ Válido SE:
- Modo "Auto" explicitamente selecionado pelo usuário
- UI mostra qual provider foi usado no resultado
- Usuário pode revisar e rejeitar

---

### 2️⃣ **Discovery: Fallback para Mapa Explícito**

**Arquivo**: `packages/services/src/resolveAutoConnection.ts`

```typescript
const discoverConfiguredProviders = (firestoreData) => {
  // Fallback 1: Array de providers do Firestore
  if (Array.isArray(firestoreData.providers) && length > 0) {
    return firestoreData.providers...
  }

  // Fallback 2: Mapa explícito de provedores (se Array falha)
  const supportedProviders = ['google-ai', 'openrouter', 'groq', 'claude', ...];
  for (const prov of supportedProviders) {
    const slug = prov === 'google-ai' ? 'google_ai' : prov.replace('-', '_');
    const key = firestoreData[`admin_key_${slug}`] || (prov === 'google-ai' ? firestoreData.admin_key : undefined);
    // Tenta descobrir credenciais
  }
};
```

**Diagnóstico**: 🔴 **PERIGOSO**

**Por quê**:
- Se descoberta via `providers` array falha → tenta mapa alternativo
- Pode misturar credenciais de diferentes épocas
- Sem validação de qual fonte foi usada

**Risco**: 
- Provider ativado em Firestore pode ser substituído por config antiga no mapa
- Credencial antiga pode ser usada sem que admin saiba

**Recomendação**: ❌ Remover fallback
- Use APENAS a fonte canônica (Firestore `providers` array ou mapa, não ambos)
- Se discovery falha, falhe explicitamente

---

### 3️⃣ **TTS Audio Upload: Fallback Local Base64**

**Arquivo**: `packages/services/src/firebase.ts`

```typescript
const uploadQuizAudiosToStorage = async (quiz, docId) => {
  const updatedQuestions = await Promise.all(
    quiz.questions.map(async (question, index) => {
      if (!question.audioBase64) return question;
      
      try {
        const audioRef = ref(storage, `quiz-audio/${docId}/q_${index}.mp3`);
        await uploadString(audioRef, question.audioBase64, 'base64');
        const audioUrl = await getDownloadURL(audioRef);
        return { ...question, audioUrl, audioBase64: undefined };
      } catch (error) {
        console.error(`Erro no upload do áudio da questão ${index}:`, error);
        // ⚠️ Fallback: Mantém audioBase64 local
        return question;  // Não lança, retorna com Base64 intacto
      }
    })
  );
  return { ...quiz, questions: updatedQuestions };
};
```

**Diagnóstico**: 🟡 **PERMITIDO COM CUIDADO**

**Por quê**:
- ✅ Bom: Não quebra o quiz se upload falha
- ✅ Bom: Base64 funciona localmente (playback direto)
- ⚠️ Problema: Sem indicação visual que audio não foi persistido

**Risco**:
- Quiz salvo com audioBase64 (não é persistido em Firestore)
- Se usuario fecha sem fazer upload → audio perdido
- Próxima sessão não tem audio

**Recomendação**: 🟢 Manter fallback, MAS:
- Adicionar flag `audioNotPersisted: boolean` na questão
- Mostrar aviso na UI: "Audio em memória (não salvo)"
- Tentar re-upload periodicamente

---

### 4️⃣ **Rate Limiter: Backoff Exponencial (Defensive)**

**Arquivo**: `packages/services/src/rateLimiter.ts`

```typescript
const registerFailedCodeAttempt = async () => {
  const newAttempts = state.attempts + 1;
  let blockSeconds = 0, delayMs = 0;
  
  if (newAttempts >= 10) {
    blockSeconds = 3600;  // 1 hora
    delayMs = 5000;       // Delay artificial
  } else if (newAttempts >= 7) {
    blockSeconds = 600;   // 10 minutos
    delayMs = 3000;
  } else if (newAttempts >= 5) {
    blockSeconds = 120;   // 2 minutos
    delayMs = 2000;
  } else if (newAttempts >= 3) {
    blockSeconds = 30;    // 30 segundos
    delayMs = 1000;
  } else {
    delayMs = newAttempts * 300;  // 300ms, 600ms, ...
  }
  
  // Aplica atraso artificial
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Defesa legítima contra brute force
- ✅ Delay artificial desestimula tentativas rápidas
- ✅ Bloqueio temporário, não permanente
- ✅ Sem mascara falha: falha é explícita

**Não é "fallback de negócio"**: É controle de segurança

---

### 5️⃣ **LiveAPI Mic: Diagnóstico por DOMException Name**

**Arquivo**: `packages/services/src/liveApiService.ts`

```typescript
try {
  await this._setupMicrophone();
} catch (err: any) {
  const name: string = err?.name || '';
  let msg: string;
  
  if (name === 'NotFoundError') {
    msg = 'Nenhum microfone encontrado...';
  } else if (name === 'NotAllowedError') {
    msg = 'Permissão de microfone negada...';
  } else if (name === 'NotReadableError') {
    msg = 'Microfone em uso por outro aplicativo...';
  } else {
    msg = 'Erro ao acessar microfone: ' + (err?.message || String(err));
  }
  
  this.callbacks.onError(msg);
  this.setPhase('error');
  return;  // Não tenta fallback
}
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Não tenta usar outro microfone
- ✅ Não mascara falha como sucesso
- ✅ Diagnóstico explícito para o usuário
- ✅ Falha claramente indicada

---

### 6️⃣ **TTS Cascata: Storage → Base64 → Gemini → Browser**

**Arquivo**: `packages/services/src/tts.ts`

```typescript
export const speakText = async (text, config, apiKey?, preGeneratedAudio?, provider?, audioUrl?) => {
  // 0a. URL Storage (sucesso anterior)
  if (config.engine === 'gemini' && audioUrl) {
    try {
      await playAudioUrl(audioUrl, config.rate);
      return;  // ✅ Sucesso
    } catch (e) {
      console.error('Error playing audio URL', e);
    }
  }

  // 0b. Base64 em memória (gerado mas não persistido)
  if (config.engine === 'gemini' && preGeneratedAudio) {
    try {
      await playAudioData(preGeneratedAudio, config.rate);
      return;  // ✅ Sucesso
    } catch (e) {
      console.error('Error playing pre-generated audio', e);
    }
  }

  // 1. Gemini TTS (gerar novo)
  if (config.engine === 'gemini' && apiKey) {
    try {
      const audioBase64 = await generateSpeech(apiKey, text, config, provider);
      if (audioBase64) {
        await playAudioData(audioBase64, config.rate);
        return;  // ✅ Sucesso
      }
    } catch (error) {
      console.error("Gemini TTS Failed", error);
    }
  }

  // 2. Browser TTS (Legacy)
  // DESATIVADO por solicitação do usuário
  return;
};
```

**Diagnóstico**: 🟡 **PERMITIDO COM RESSALVAS**

**Por quê**:
- ✅ Bom: Cada etapa tenta mesma semântica (reproduzir audio)
- ✅ Bom: Não tenta servir conteúdo fake
- ⚠️ Problema: Se tudo falha → silenciosamente não lê

**Risco**: 
- Pergunta não é lida, mas quiz continua como se tivesse sido
- Usuário não sabe que TTS falhou

**Recomendação**: 🟡 Manter, MAS:
- Adicionar indicador visual: "Áudio indisponível"
- Callback `onTtsFailure()` para permitir UI avisar

---

### 7️⃣ **Parse Error: JSON → String Original → Truncado**

**Arquivo**: `packages/services/src/geminiService.ts`

```typescript
const parseApiErrorMessage = (errorText: string, status: number): string => {
  let cleanMsg = errorText;
  try {
    const parsed = typeof errorText === 'string' ? JSON.parse(errorText) : errorText;
    cleanMsg = parsed?.error?.message || parsed?.message || parsed?.error || errorText;
  } catch {
    // Mantém string original se não for JSON
  }

  const lowerMsg = String(cleanMsg).toLowerCase();
  
  // Mapeamento status → mensagem amigável
  if (status === 402) return 'Saldo insuficiente...';
  if (status === 429) return 'Limite de requisições excedido...';
  if (status === 401) return 'Chave de API inválida...';
  if (status >= 500) return 'Servidor do provedor temporariamente indisponível...';
  
  return cleanMsg ? String(cleanMsg).slice(0, 250) : `Erro na API (${status})`;
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Não mascara erro como sucesso
- ✅ Tenta extrair mensagem real da API
- ✅ Fallback para string original se JSON falha
- ✅ Trunca para evitar overflow UI
- ✅ Status explícito incluído

---

### 8️⃣ **Firebase Query: Fallback Valores Padrão**

**Arquivo**: `packages/services/src/firebase.ts`

```typescript
export const getGlobalKeywords = async (max: number = 35): Promise<string[]> => {
  try {
    const snapshot = await getDocs(...);
    return keywords;  // ✅ Sucesso
  } catch (error) {
    console.error("Erro ao buscar keywords:", error);
    return [];  // Fallback: array vazio
  }
};

export const getRandomPrebuiltQuiz = async (appName, theme?, subTopic?): Promise<GeneratedQuiz | null> => {
  try {
    const snapshot = await getDocs(...);
    return randomQuiz;  // ✅ Sucesso
  } catch (error) {
    console.error("Erro ao buscar quiz:", error);
    return null;  // Fallback: null
  }
};

export const getAvailableLibraryThemes = async (appName): Promise<Record<string, string[]>> => {
  try {
    const snapshot = await getDocs(...);
    return themes;  // ✅ Sucesso
  } catch (error) {
    console.error("Erro ao buscar temas:", error);
    return {};  // Fallback: objeto vazio
  }
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Falha Firestore ≠ sucesso da operação
- ✅ Valores vazios sinalizam ausência
- ✅ Código cliente trata [] ou null como "nenhum item"
- ✅ Sem dados fake ou fictícios

**Diferença crítica**: 
- ❌ RUIM: `getGlobalKeywords() → [ficticias]`
- ✅ BOM: `getGlobalKeywords() → []` (vazio significa indisponível)

---

### 9️⃣ **Admin Check: Duplo Fallback (UID → Email)**

**Arquivo**: `packages/services/src/firebase.ts`

```typescript
export const checkIsUserAdmin = async (email?: string | null, uid?: string | null): Promise<boolean> => {
  if (!email && !uid) return false;  // Nenhuma credencial
  
  // Tentativa 1: Por UID
  if (uid) {
    try {
      const adminUidRef = doc(db, 'admins', uid);
      const uidSnap = await getDoc(adminUidRef);
      if (uidSnap.exists() && uidSnap.data()?.active !== false) {
        return true;  // ✅ Encontrou por UID
      }
    } catch {}
  }
  
  // Tentativa 2: Por Email (fallback se UID falha)
  if (email) {
    try {
      const adminDocRef = doc(db, 'admins', normalizedEmail);
      const docSnap = await getDoc(adminDocRef);
      if (docSnap.exists() && docSnap.data()?.active !== false) {
        return true;  // ✅ Encontrou por Email
      }
    } catch {}
  }
  
  return false;  // Nenhuma autorização encontrada
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Retry técnico da mesma operação
- ✅ Usa credenciais diferentes (UID vs Email), ambas válidas
- ✅ Sem mascara falha: retorna false se nenhuma autorização
- ✅ Admin explicitamente marcado como `active !== false`

---

### 🔟 **Cloud Function Proxy → Direct API**

**Arquivo**: `packages/services/src/geminiService.ts`

```typescript
const isDirectApiKey = apiKey.startsWith("AIza") || apiKey.startsWith("sk-") || apiKey.startsWith("gsk_");

if (!isDirectApiKey) {
  // Chave é PIN/token opaco → usa Cloud Function Proxy (seguro)
  try {
    const functionUrl = "https://us-central1-avalia-jw-quiz.cloudfunctions.net/generateQuizProxy";
    const resp = await fetch(functionUrl, { ... });
    if (resp.ok) return await resp.json().quiz;  // ✅ Sucesso via proxy
  } catch (err) {
    // Fallback: Tenta API direto com apiKey (menos seguro)
    return await executeSingleQuizRequest(apiKey, config, ...);
  }
}
```

**Diagnóstico**: 🔴 **MUITO PERIGOSO**

**Por quê**:
- ❌ Se Cloud Function indisponível → usa API direto no navegador
- ❌ Expõe credenciais no cliente que deviam estar privadas no servidor
- ❌ Muda semântica: "Seguro (server-side)" → "Exposto (browser)"
- ❌ Sem consentimento do usuário

**Risco**:
- PIN/Token expostos no Network tab
- Credentials logger podem capturar
- Violação de política de segurança

**Recomendação**: ❌ REMOVER FALLBACK
- Se Cloud Function falha → falhe explicitamente
- Não tente API direto com credenciais de servidor

---

Será continuado no próximo chunk...

### 1️⃣1️⃣ **Quiz Generation: response_format Removal**

**Arquivo**: `packages/services/src/geminiService.ts`

```typescript
if (!resp.ok && resp.status === 400 && payload.response_format) {
  delete payload.response_format;
  // Retenta sem response_format (compatibilidade OpenRouter/Groq)
  const retry = await fetch(apiUrl, { ...payload });  // Sem response_format
}
```

**Diagnóstico**: 🟡 **PERMITIDO MAS DOCUMENTAR**

**Por quê**:
- ✅ Bom: Retry técnico da mesma operação
- ✅ Bom: response_format é otimização, não essencial
- ⚠️ Problema: Modelo pode retornar JSON malformado sem `response_format`

**Risco**:
- Quiz pode chegar mais inconsistente
- Parse pode falhar com mais frequência

**Recomendação**: 🟡 Manter, MAS:
- Log quando fallback acontece
- Adicionar validação rigorosa após retry
- Se retry falha, não retorne valores fictícios

---

### 1️⃣2️⃣ **Fallback Evaluation: String Normalization**

**Arquivo**: `packages/services/src/geminiService.ts`

```typescript
const fallbackEvaluate = (question: string, modelAnswer: string, userAnswer: string): EvaluationResult => {
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
    return await evaluateViaApi(...);  // ✅ Sucesso AI
  } catch (error) {
    console.error("evaluateFreeResponse AI Error, applying fallback:", error);
    return fallbackEvaluate(question, modelAnswer, userAnswer);  // Fallback: string compare
  }
};
```

**Diagnóstico**: 🔴 **PERIGOSO**

**Por quê**:
- ❌ API falha → retorna avaliação por string exact match
- ❌ "Semântica" pode ser completamente diferente
- ❌ Exemplo: "NÃO" vs "não" (case) → diferentes scores
- ❌ Exemplo: "sim " vs "sim" (whitespace) → diferentes scores
- ❌ Fabrica um resultado de sucesso mesmo com falha

**Risco**:
- Avaliação completamente errada
- Pode ser ou muito rígida (rejeita respostas válidas) ou muito flexível
- Sem feedback ao usuário que avaliação foi por fallback fraco

**Recomendação**: ❌ REMOVER FALLBACK
- Se API falha → retorne erro explícito
- Não retorne avaliação de qualidade baixa como se fosse confiável
- Usuário pode tentar novamente

---

### 1️⃣3️⃣ **Model Selection: || "default"**

**Arquivo**: `packages/services/src/geminiService.ts` e múltiplos

```typescript
const effectiveModel = model || 'openrouter/auto';  // ⚠️ Fallback para "auto"
const effectiveProvider = provider === 'auto' ? 'openrouter' : provider;  // ⚠️ Substitui provider

// No quiz parsing:
const model = data.adminModel || getDefaultModel();  // ⚠️ Default fictício
```

**Diagnóstico**: 🔴 **MUITO PERIGOSO**

**Por quê**:
- ❌ Usuário selecionou modelo específico → é substituído silenciosamente
- ❌ Sem indicação que modelo foi mudado
- ❌ Resultado pode ser completamente diferente (custo, qualidade, semântica)
- ❌ Usuário pensa que falha foi com modelo selecionado, mas foi com fallback

**Risco**:
- Resposta diferente da esperada
- Custo diferente da estimativa
- Confiabilidade diferente (alguns modelos mais aleatórios)
- Sem rastreamento de qual modelo realmente foi usado

**Recomendação**: ❌ REMOVER FALLBACK
- Se modelo não fornecido → erro explícito
- Forçar seleção no UI antes de permitir quiz
- Não use defaults fictícios

---

### 1️⃣4️⃣ **VLibras Script Loading: Local → CDN**

**Arquivo**: `packages/design-system/src/components/VLibras.tsx`

```typescript
const loadVLibrasScripts = async () => {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/js/vlibras-player.js';  // Script local
    
    s.onerror = () => {
      // Fallback: CDN oficial
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.vlibras.gov.br/vlibras.js';
      fallbackScript.onerror = () => reject(new Error('Ambas as fontes falharam'));
      document.body.appendChild(fallbackScript);
    };
    
    document.body.appendChild(s);
  });
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quç**:
- ✅ Mesma funcionalidade em ambas as fontes
- ✅ Sem mudança semântica
- ✅ Se ambos falham → rejeita claramente
- ✅ Sem mascara falha

---

### 1️⃣5️⃣ **Theme Mapping: 5-Layer Fallback**

**Arquivo**: `packages/services/src/themeUtils.ts`

```typescript
export const resolveThemeLabel = (mode: string, appName?, customTopicModes?): string => {
  if (!mode || typeof mode !== 'string') return 'Geral';  // Layer 1
  
  const trimmed = mode.trim();
  if (!trimmed) return 'Geral';  // Layer 2
  
  if (customTopicModes && customTopicModes.length > 0) {  // Layer 3
    const matched = customTopicModes.find(tm => tm.value === trimmed || tm.label === trimmed);
    if (matched?.label) return matched.label;
  }
  
  // Layer 4: Canonical mapping
  const mapping = { 'planeta': 'Planeta & Natureza', ... };
  if (mapping[trimmed.toLowerCase()]) return mapping[trimmed.toLowerCase()];
  
  // Layer 5: Return original
  return trimmed;
};
```

**Diagnóstico**: 🟡 **PERMITIDO MAS REVISAR**

**Por quê**:
- ✅ Bom: Tenta múltiplas fontes de configuração
- ⚠️ Problema: Se nenhuma config encontrada → retorna original (pode não ser label válido)

**Risco**:
- Original pode conter caracteres inválidos ou ser empty string
- UI pode quebrar

**Recomendação**: 🟡 Revisar o Layer 5
- Se não encontra em config → retorne 'Outro' (label genérico válido)
- Não retorne string arbitrária

---

### 1️⃣6️⃣ **Form Error: String Ternária para Mensagem**

**Arquivo**: `packages/design-system/src/components/SetupForm.tsx`

```typescript
const validateStep1 = () => {
  if (mode === TopicMode.OTHER) {
    if (!specificTopic.trim()) {
      setFormError(
        specificTopicType === 'tema' ? "Por favor, digite o assunto específico." :
        specificTopicType === 'dominio' ? "Por favor, insira o domínio." :
        "Por favor, insira uma URL válida."
      );
      return false;
    }
  }
  setFormError(null);  // Limpa erro se válido
  return true;
};
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Não mascara erro
- ✅ Mensagem específica por tipo de erro
- ✅ Sem fallback de negócio

---

### 1️⃣7️⃣ **LocalStorage: Defaults Seguros**

**Arquivo**: `packages/game-engine/src/hooks/useGameSettings.ts`

```typescript
const theme = localStorage.getItem(`${prefix}-theme`) || 'system';
const soundEnabled = localStorage.getItem(`${prefix}-soundEnabled`) !== 'false';
const zoomLevel = parseFloat(localStorage.getItem(`${prefix}-zoomLevel`) || '1.0');

try {
  localStorage.setItem('avalia_admin_main_tab', mainTab);
} catch (e) {
  console.warn("Falha ao salvar mainTab:", e);  // localStorage quota exceeded
}
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Defaults são sensatos ('system', true, 1.0)
- ✅ Não mascara falha de localStorage: trata como "não configurado"
- ✅ Fallback silencioso ao salvar é OK (próxima sessão usa default)

---

### 1️⃣8️⃣ **Inactivity Timeout: 30 Min + Listeners**

**Arquivo**: `packages/game-engine/src/hooks/useGameSettings.ts`

```typescript
useEffect(() => {
  if (!onInactivityTimeout) return;  // Sem callback
  
  const TIMEOUT_MS = 30 * 60 * 1000;
  let inactivityTimer: ReturnType<typeof setTimeout>;
  
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      onInactivityTimeout();  // Logout
    }, TIMEOUT_MS);
  };
  
  ['click', 'mousemove', 'keypress', 'touchstart', 'scroll'].forEach(event => {
    document.addEventListener(event, resetTimer);
  });
  
  return () => {
    clearTimeout(inactivityTimer);
    // Remove listeners...
  };
}, [onInactivityTimeout]);
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Timeout explícito, não mascara falha
- ✅ Sem fallback: se timer reseta por atividade, continua sessão
- ✅ Se timer vence → logout claro

---

### 1️⃣9️⃣ **Telemetry: Try-Catch Silencioso**

**Arquivo**: `packages/services/src/firebase.ts`

```typescript
try {
  await addDoc(collection(db, TELEMETRY_COLLECTION), payload);
} catch (e) {
  console.warn("Falha ao gravar erro na telemetria:", e);
  // Não relança: telemetria não deve derrubar app
}
```

**Diagnóstico**: 🟢 **PERMITIDO**

**Por quê**:
- ✅ Observabilidade nunca mascara falha: apenas registra
- ✅ Se Firestore falha → telemetria falha, mas app continua
- ✅ Sem mascara: erro é conhecida e loggada

---

## RESUMO EXECUTIVO: Fallbacks 🔴 Perigosos Encontrados

| ID | Tipo | Arquivo | Linha | Risco |
|----|------|---------|-------|-------|
| 1 | Auto-Connect: Provider alternativo | resolveAutoConnection.ts | ~133 | 🔴 Crítico |
| 2 | Discovery: Mapa alternativo | resolveAutoConnection.ts | ~51 | 🔴 Crítico |
| 3 | Cloud Function → Direct API | geminiService.ts | ~746 | 🔴 CRÍTICO |
| 4 | Fallback Evaluation (string match) | geminiService.ts | ~1039 | 🔴 Crítico |
| 5 | Model || "default" | geminiService.ts | múltiplas | 🔴 Crítico |
| 6 | Theme fallback genérico | themeUtils.ts | ~80 | 🟡 Médio |
| 7 | Quiz fictício se geração falha | (verificar) | (verificar) | 🔴 ? |

---

## AÇÕES RECOMENDADAS IMEDIATAS

### 🔴 DEVE SER ELIMINADO:

1. **Cloud Function → Direct API Fallback** (~linha 746)
   - Impacto: Crítico (expõe credenciais)
   - Ação: Remover completamente
   - Fallback: Falhar explicitamente se Cloud Function indisponível

2. **Fallback Evaluation (String Normalization)** (~linha 1039)
   - Impacto: Crítico (avaliação incorreta)
   - Ação: Lançar erro ao invés de fallback
   - Razão: API falha ≠ string match é confiável

3. **Model || "default"** (múltiplos)
   - Impacto: Crítico (semântica muda)
   - Ação: Forçar seleção explícita no UI
   - Razão: Usuário não sabe que modelo foi substituído

4. **Provider Auto-Swap** (se sem consentimento)
   - Impacto: Crítico (resultado diferente)
   - Ação: Exigir aprovação explícita
   - Razão: "Auto" modo deve ser explicitamente ativado

### 🟡 DEVE SER MELHORADO:

1. **TTS Cascata**: Adicionar indicador visual quando audio falha
2. **Audio Upload Fallback**: Flag `audioNotPersisted` na questão
3. **Quiz Generation response_format**: Validação rigorosa após retry
4. **Theme Mapping Layer 5**: Retornar 'Outro' ao invés de string arbitrária
5. **Discovery Duplo Fallback**: Usar apenas UMA fonte canônica

### 🟢 ESTÁ OK:

- Try-catch defensivo
- Retry técnico
- Optional chaining / nullish coalescing
- Error boundaries
- Cleanup de recursos
- Telemetria não-bloqueante
- Rate limiting
- Timeout management

---

**Fim da Auditoria**  
Data: 30/07/2026
