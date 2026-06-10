# 🔄 REINÍCIO DO PROJETO - VLibras Motor Unity

**Status**: 🆕 Fresh Start  
**Versão Target**: 1.5.0-beta  
**Data Início**: Junho 10, 2026

---

## 📌 O QUE SABEMOS (Documentação Oficial)

### Método Correto
- ✅ **play(glosa, fromTranslation)**
- ❌ ~playGlosa()~ (não existe)
- ❌ ~translate()~ (não recomendado - CORS, fallback português)

### Formato de Glosa Correto
```
REGRA 1: Caixa Alta Obrigatória
✅ "BEM_VINDO" ✅ "OI" ✅ "TRES"
❌ "bem_vindo" ❌ "Bem Vindo" ❌ "bem vindo"

REGRA 2: Palavras Compostas = Underscore
✅ "GUARDA_ROUPA" ✅ "JOHN_LENNON"
❌ "GUARDA-ROUPA" ❌ "GUARDA ROUPA"

REGRA 3: Desambiguação = Operador &
✅ "BANCO&DINHEIRO" (instituição financeira)
✅ "BANCO&ASSENTO" (móvel)
❌ "BANCO" (ambíguo - 404 → soletração)

REGRA 4: Separação de Sinais = Espaço Simples
✅ "OI BEM_VINDO AVALIA QUIZ"
❌ "OI-BEM_VINDO-AVALIA-QUIZ"

REGRA 5: Variações = Sufixo Numérico
✅ "DOIS.1" ✅ "VÁRIOS.2"
❌ "DOIS" "VÁRIOS"

REGRA 6: Marcadores Não-Manuais = Colchetes
✅ "[PONTO]" ✅ "[INTERROGAÇÃO]" ✅ "[EXCLAMAÇÃO]"
```

### Causa da Soletração
```
Quando enviar uma glosa:
  1. VLibras busca token no banco 3D
  2. Se encontrado (200) → renderiza sinal ✅
  3. Se NÃO encontrado (404) → fallback SILENCIOSO → SOLETRAÇÃO ❌
```

---

## 🎯 SOLUÇÃO ARQUITETÔNICA

### Runtime Safeguard (Sanitização Determinística)

```
┌────────────────────────────────────────┐
│ ENTRADA: Glosa do jogo                 │
│ Ex: "BEMVINDO CONFIGURAR QUIZ"         │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ 1. VALIDAR CONTRA TRIE                 │
│    - Carregar dicionário na memória    │
│    - Verificar cada token              │
│    - Se inválido: remover/substituir   │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ 2. SANITIZAR                           │
│    - Remove sufixos incompatíveis      │
│    - Trunca tags inválidas             │
│    - Aplica fallback seguro            │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ SAÍDA: Glosa Validada                  │
│ Ex: "OI CONFIGURAR JOGO"               │
│ (tokens garantidamente no dicionário)  │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ player.play(glosaSanitizada, false)    │
│ ✅ Resultado: SINALIZAÇÃO (não letra)  │
└────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DO RESTART

### FASE 1: Setup Infrastructure
- [ ] Criar `VLibrasSanitizer.ts` - Classe de sanitização
- [ ] Implementar `VLibrasDictionary.ts` - Cache do dicionário
- [ ] Atualizar `VLibrasHandle` interface (remover ~playGlosa~)
- [ ] Correção: `play()` em vez de `playGlosa()`

### FASE 2: Implementar Dicionário
- [ ] Fetch oficial: `dicionario2.vlibras.gov.br`
- [ ] Build Trie em memória
- [ ] Cache persistente (localStorage)
- [ ] Validação de tokens

### FASE 3: Sanitização
- [ ] Remover sufixos incompatíveis
- [ ] Truncar tags inválidas
- [ ] Aplicar fallbacks seguros
- [ ] Log de tokens rejeitados

### FASE 4: Integração
- [ ] Atualizar VLibras.tsx
- [ ] Atualizar GameEngine.tsx
- [ ] Usar `play()` em vez de `playGlosa()`
- [ ] Adicionar guards antes de enviar

### FASE 5: Testes
- [ ] Testar cada glosa por contexto
- [ ] Validar sem soletração
- [ ] Monitorar console (404s)
- [ ] Verificar emoções

---

## 🗑️ O QUE REMOVER

```typescript
❌ REMOVER:
- vlibrasRef.current?.playGlosa(glosa)  // NÃO EXISTE
- player.translate(texto)                // NÃO RECOMENDADO
- BEMVINDO, OLA, BEMVINDO               // TOKENS INVÁLIDOS

✅ MANTER:
- player.play(glosa, false)              // CORRETO
- Split-screen layout
- Controles flutuantes
- Emoções (feliz, triste, pensa)
- Estados (SETUP, READY_CHECK, etc)
```

---

## 📝 Novos Arquivos a Criar

### 1. `packages/core/src/vlibras-sanitizer.ts`
```typescript
// Sanitização determinística de glosas
// - Validar tokens contra Trie
// - Remover sufixos incompatíveis
// - Aplicar fallbacks
```

### 2. `packages/core/src/vlibras-dictionary.ts`
```typescript
// Gerenciar dicionário
// - Fetch de dicionario2.vlibras.gov.br
// - Build Trie
// - Cache
```

### 3. `packages/core/src/vlibras-tokens.ts`
```typescript
// Tokens válidos confirmados
// - BEM_VINDO, OI, TRÊS, DOIS, UM, etc
// - Desambiguações (& operador)
// - Marcadores não-manuais
```

---

## 🔄 Fluxo Corrigido

```
ANTES (ERRADO):
GameEngine → playGlosa("BEMVINDO") → 404 → SOLETRAÇÃO ❌

DEPOIS (CORRETO):
GameEngine → sanitizar("BEMVINDO") → "OI" → play("OI") → SINALIZAÇÃO ✅
```

---

## 🎬 Começar Agora?

1. **Criar `VLibrasSanitizer.ts`** ← PRÓXIMO PASSO
2. Implementar validação de tokens
3. Integrar no GameEngine
4. Remover `playGlosa()` everywhere
5. Testar até não ter soletração

---

**Ready to start? (Y/N)**
