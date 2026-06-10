# 🔧 VLibras: Corrigindo Métodos e Implementando Runtime Safeguard

**Status**: ✅ IMPLEMENTADO  
**Data**: Junho 10, 2026  
**Versão**: 1.4.5-beta  

---

## 📋 O QUE FOI FEITO

### 1. **Corrigir Chamadas de Método: `playGlosa()` → `play()`**

**Problema**: Interface `VLibrasHandle` nunca exportou `playGlosa()`, apenas `play(glosa)`.

**Arquivos Corrigidos**:
- ✅ `packages/game-engine/src/GameEngine.tsx` (4 chamadas)
  - Linha ~468: Setup intro glosa
  - Linha ~588: Pergunta em PLAYING
  - Linha ~601: Ready check glosa
  - Linha ~617-619: Countdown glosas

- ✅ `packages/design-system/src/components/VLibrasTest.tsx` (2 chamadas)
  - Linha ~28: Teste inicial
  - Linha ~34: Loop de teste

**Resultado**: Todos os métodos agora chamam `play(glosa)` corretamente.

---

### 2. **Implementar Runtime Safeguard (Validação Determinística)**

**Arquivo Novo**: `packages/core/src/vlibras-dictionary-validator.ts`

**Funções Exportadas**:

```typescript
// 1. Carrega dicionário da API oficial (lazy loading + cache)
export async function loadVLibrasDictionary(): Promise<Set<string>>

// 2. Valida token individual com fallbacks
export function isTokenValid(token: string, dictionary: Set<string>): boolean

// 3. Sanitiza glosa inteira (remove tokens inválidos)
export function sanitizeGlosaStrict(glosa: string, dictionary: Set<string>): string

// 4. Inicializa validador (chama em background)
export function initializeVLibrasValidator(): void

// 5. Debug: testa quais tokens estão no dicionário
export async function debugDictionary(tokensToCheck: string[]): Promise<void>

// 6. Status do cache
export function getDictionaryStatus(): { cached, loading, tokenCount }
```

**Estratégia de Validação**:
1. Tenta token exato: `"BEM_VINDO"` ✅
2. Remove sufixo de variação: `"DOIS.1"` → `"DOIS"` ✅
3. Remove desambiguação: `"BANCO&DINHEIRO"` → `"BANCO"` ✅
4. Valida marcadores: `"[PONTO]"`, `"[INTERROGACAO]"` ✅
5. Se nenhuma estratégia funcionar: **DESCARTA token** (evita soletração)

---

### 3. **Integrar Validador no GameEngine**

**Mudanças**:

```typescript
// Importações adicionadas
import {
  loadVLibrasDictionary,
  sanitizeGlosaStrict,
  initializeVLibrasValidator
} from '@avalia/core';

// Estado novo
const [vlibrasDict, setVlibrasDict] = useState<Set<string> | null>(null);

// Hook de inicialização (carrega dicionário em background)
useEffect(() => {
  const loadDict = async () => {
    const dict = await loadVLibrasDictionary();
    setVlibrasDict(dict);
  };
  loadDict();
}, []);

// Helper: sanitiza e reproduz glosa com segurança
const playGlosaSegura = (glosa: string, emotion?: string) => {
  let sanitized = glosa;
  if (vlibrasDict?.size > 0) {
    sanitized = sanitizeGlosaStrict(glosa, vlibrasDict);
  } else {
    sanitized = sanitizarGlosa(glosa); // fallback simples
  }
  
  if (!sanitized?.trim()) return; // Glosa vazia = não envia
  
  vlibrasRef.current?.play(sanitized);
  if (emotion) vlibrasRef.current?.setEmotion(emotion);
};
```

**Todos os `useEffect` que reproduzem glosas agora usam `playGlosaSegura()`:**
- Setup: Boas-vindas + instruções
- READY_CHECK: "PREPARAR COMEÇAR JOGO"
- PLAYING: Perguntas
- COUNTDOWN: Números

---

## 🔍 Como Funciona a Validação

### Cenário 1: Token Válido ✅
```
Entrada: "BEM_VINDO"
         ↓
Dicionário: { "BEM_VINDO", "OI", "JOGO", ... }
         ↓
Token encontrado?  SIM ✅
         ↓
Enviado para Unity: "BEM_VINDO"
         ↓
Resultado: SINALIZAÇÃO normal
```

### Cenário 2: Token com Sufixo ✅
```
Entrada: "DOIS.1"
         ↓
Token exato encontrado?  NÃO ❌
         ↓
Remover sufixo: "DOIS"
         ↓
Base "DOIS" encontrada?  SIM ✅
         ↓
Enviado para Unity: "DOIS"
         ↓
Resultado: SINALIZAÇÃO normal (variação .1 será aplicada pela Unity)
```

### Cenário 3: Token Inválido ❌
```
Entrada: "BEMVINDO"  (sem underscore)
         ↓
Token exato encontrado?  NÃO ❌
         ↓
Remover sufixo (.X):  "BEMVINDO" (sem sufixo)
         ↓
Remover desambiguação (&):  "BEMVINDO" (sem &)
         ↓
Todas as estratégias falharam?  SIM
         ↓
Token DESCARTADO
         ↓
Log: "[VLibras Validator] ❌ Token rejeitado: "BEMVINDO""
         ↓
Se toda glosa ficar vazia: NÃO ENVIA para Unity
         ↓
Resultado: EVITA SOLETRAÇÃO
```

---

## 🧪 Testando a Implementação

### Test 1: Verificar Dicionário Carregado
```javascript
// No console do app
const status = getDictionaryStatus();
console.log(status);
// Output: { cached: true, loading: false, tokenCount: 1234 }
```

### Test 2: Debug de Tokens
```javascript
import { debugDictionary } from '@avalia/core';

await debugDictionary([
  "BEM_VINDO",   // ✅ Esperado: válido
  "BEMVINDO",    // ❌ Esperado: inválido
  "DOIS.1",      // ✅ Esperado: válido
  "OI"           // ✅ Esperado: válido
]);
```

### Test 3: Verificar Glosas de Interface
- Ativa LIBRAS no interface language
- Entra em SETUP
- Aguarda 1.5s para `stop:welcome` event
- Verifica console: deve ter logs `[VLibras] play: ...` SEM soletração

---

## 🚨 Possíveis Problemas e Soluções

### Problema 1: "Dicionário não carregou"
**Causa**: API `dicionario2.vlibras.gov.br` indisponível ou timeout

**Comportamento**:
- Fallback para `sanitizarGlosa()` (validação simples)
- Log: `[VLibras Validator] ❌ Erro ao carregar dicionário`
- Glosas ainda funcionam mas sem garantia de evitar soletração

**Solução**: Implementar retry automático em `loadVLibrasDictionary()`

---

### Problema 2: "Glosa inteira virou vazia após sanitização"
**Causa**: Nenhum token da glosa existe no dicionário

**Exemplo**:
```
Entrada: "BEMVINDO BEMVINDO BEMVINDO"
Resultado: "" (vazio)
Ação: Não envia para Unity
Log: "[VLibras Validator] ⚠️  GLOSA VAZIA"
```

**Solução**: Revisar glossário e usar tokens reconhecidos

---

### Problema 3: "Está soletrand ainda"
**Causas Possíveis**:
1. Glosa contém tokens não reconhecidos
2. Dicionário ainda carregando (Estado `loading: true`)
3. Token existe mas com grafia diferente
4. Race condition: glosa enviada antes de `stop:welcome` event

**Debug**:
```javascript
// Adicionar ao GameEngine
console.log('[VLibras] playGlosaSegura chamada com:', { glosa, isReady: vlibrasRef.current?.isReady, dictSize: vlibrasDict?.size });
```

---

## 📁 Arquivos Modificados

| Arquivo | Mudança | Linhas |
|---------|---------|--------|
| `packages/core/src/vlibras-dictionary-validator.ts` | ✨ **NOVO** | 1-250 |
| `packages/core/src/index.ts` | Exporta validador | +1 |
| `packages/game-engine/src/GameEngine.tsx` | Integra validador + helper | +40 ~65 linhas |
| `packages/design-system/src/components/VLibrasTest.tsx` | `playGlosa()` → `play()` | 2 chamadas |
| `packages/design-system/src/index.ts` | ✅ Remove duplicata | -2 linhas |

---

## 🎯 Próximas Etapas

### Priority 1: Testar em Produção
- [ ] Fazer login em LIBRAS
- [ ] Abrir SETUP
- [ ] Aguardar glosas iniciais
- [ ] Verificar console para logs de validação
- [ ] Confirmar SEM soletração

### Priority 2: Expandir Glossário
- [ ] Pesquisar tokens oficiais em dicionario2.vlibras.gov.br
- [ ] Adicionar compostos válidos (ex: `JOGO_QUIZ`, `MODO_LIBRAS`)
- [ ] Testar cada novo token contra dicionário

### Priority 3: Otimizações
- [ ] Implementar Trie data structure para validação O(1)
- [ ] Cache results para glosas repetidas
- [ ] Retry automático para dicionário com backoff exponencial

---

## 📚 Referências

- [VLibras Official Dictionary](https://dicionario2.vlibras.gov.br)
- [VLibras Player API](https://vlibras.gov.br/docs)
- Documentação anterior: `VLIBRAS_IMPLEMENTATION_SUMMARY.md`

