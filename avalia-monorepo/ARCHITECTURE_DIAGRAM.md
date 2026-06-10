# 🏗️ VLibras Architecture Diagram

**Versão**: 1.4.5-beta  
**Contexto**: Runtime Safeguard Implementation

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GameEngine (React)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  useEffect: SETUP, READY_CHECK, PLAYING, COUNTDOWN    │   │
│  │  [Dispara glosas baseado em game state]                │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │                                            │
│                      ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  playGlosaSegura(glosa: string, emotion?: string)      │   │
│  │  [Helper novo — sanitiza + reproduz]                    │   │
│  │                                                           │   │
│  │  1. Verifica vlibrasDict existe?                        │   │
│  │     - SIM: Usa sanitizeGlosaStrict()                    │   │
│  │     - NÃO: Usa sanitizarGlosa() fallback               │   │
│  │  2. Glosa vazia após sanitização?                       │   │
│  │     - SIM: Retorna (não envia)                          │   │
│  │     - NÃO: Envia para vlibrasRef.current.play()        │   │
│  │  3. Aplica emoção se necessário                         │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │                                            │
│                      ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  vlibrasRef.current.play(sanitized_glosa)              │   │
│  │  [Interface VLibras importada de design-system]         │   │
│  └───────────────────┬──────────────────────────────────────┘   │
│                      │                                            │
└──────────────────────┼────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    ┌───────────────┐          ┌──────────────────┐
    │  VLibras.tsx  │          │ Backend Parallel │
    │  (Component)  │          │  (useEffect)     │
    │               │          │                  │
    │ playerRef:    │          │ loadDict()       │
    │ window        │          │ setVlibrasDict() │
    │ .VLibras      │          │                  │
    │ .Player       │          │ [Lazy Loading]   │
    └───────┬───────┘          └────────┬─────────┘
            │                           │
            ▼                           ▼
    ┌─────────────────┐      ┌──────────────────────────────┐
    │  WebGL Motor    │      │ vlibras-dictionary-validator │
    │  (Unity C#)     │      │                              │
    │                 │      │ loadVLibrasDictionary()      │
    │ • Busca token   │      │ ├─ HTTP GET .gov.br/api/dict │
    │ • Toca animação │      │ └─ Set<string> (cache)       │
    │ • Se 404 →      │      │                              │
    │   Soletração ❌ │      │ sanitizeGlosaStrict()        │
    │                 │      │ ├─ Valida cada token         │
    │ • Se 200 →      │      │ └─ Remove inválidos          │
    │   Sinalização ✅│      │                              │
    └─────────────────┘      └──────────────────────────────┘
```

---

## 🔐 Validation Strategy (Decision Tree)

```
                    ┌─────────────────────┐
                    │  Token: "BEMVINDO"  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Dicionário tem?     │
                    │ "BEMVINDO"          │
                    │ (exato)             │
                    └──┬─────────────┬────┘
                   NÃO │             │ SIM
                       │             ▼
                       │        ✅ VÁLIDO
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Remove sufixo (.1, .2)?          │
        │ "BEMVINDO".split('.')[0] =       │
        │ "BEMVINDO" (sem sufixo)          │
        └──┬──────────────────────┬────────┘
      NÃO │                       │ DIFERENTE
         │                        │
         ▼                        ▼
   ┌──────────────┐        ┌──────────────────────┐
   │ Remove & ?   │        │ "BEMVINDO" no dict?  │
   │ "&CONTEXTO"  │        └────┬────────────┬────┘
   └──┬───────┬───┘           SIM│            │NÃO
    NÃO│       │DIFERENTE        ▼            │
      │       ▼                  ✅ VÁLIDO   │
      │ ┌──────────────────┐               │
      │ │ "BEMVINDO"       │               │
      │ │ no dict?         │               │
      │ └──┬─────────┬─────┘               │
      │ NÃO│         │ SIM                 │
      │    │         ▼                     │
      │    │      ✅ VÁLIDO                │
      │    │                               │
      └────┼───────────────────────────────┘
           │
           ▼
        ❌ INVÁLIDO (DESCARTADO)
           │
           └─ LOG: "[VLibras Validator] ❌ Token rejeitado"
```

---

## 🎯 Class/Interface Diagram

```
┌──────────────────────────────────────────────────┐
│  GameEngine (React Component)                     │
├──────────────────────────────────────────────────┤
│  STATE:                                          │
│  ├─ vlibrasDict: Set<string> | null             │
│  ├─ vlibrasRef: useRef<VLibrasHandle>           │
│  └─ ... (outros estados)                        │
│                                                  │
│  METHODS:                                        │
│  ├─ playGlosaSegura(glosa, emotion?)            │
│  ├─ useEffect[isLibrasReady] → loadDict()       │
│  └─ ... (outros métodos)                        │
└────────┬─────────────────────────────────────────┘
         │ imports
         ▼
┌──────────────────────────────────────────────────┐
│  VLibrasHandle (Interface)                        │
├──────────────────────────────────────────────────┤
│  Methods:                                         │
│  ├─ play(glosa: string): void  ✅                │
│  ├─ setEmotion(emotion): void                    │
│  ├─ setSpeed(speed): void                        │
│  ├─ changeAvatar(avatar): void                   │
│  ├─ pause(): void                                │
│  ├─ continue(): void                             │
│  └─ isReady: boolean                             │
└────────┬─────────────────────────────────────────┘
         │ implemented by
         ▼
┌──────────────────────────────────────────────────┐
│  VLibras.tsx (React Component + useImperative)   │
├──────────────────────────────────────────────────┤
│  REF (playerRef):                                │
│  └─ window.VLibras.Player (WebGL Motor)         │
│                                                  │
│  USES:                                           │
│  ├─ createPortal() → #gameContainer             │
│  └─ useImperativeHandle() → exports interface   │
└────────┬─────────────────────────────────────────┘
         │ instantiates
         ▼
┌──────────────────────────────────────────────────┐
│  window.VLibras (Global - vlibras-plugin.js)     │
├──────────────────────────────────────────────────┤
│  .Player                                         │
│  ├─ Constructor(config)                          │
│  ├─ play(glosa, fromTranslation): void          │
│  ├─ applyEmotion(emotion): void                  │
│  └─ ... (outros métodos Unity)                   │
└────────┬─────────────────────────────────────────┘
         │ communicates with
         ▼
┌──────────────────────────────────────────────────┐
│  WebGL Canvas + Unity C# (Motor Unity)            │
├──────────────────────────────────────────────────┤
│  • Recebe glosa string                            │
│  • Busca token no banco 3D da CDN                │
│  • Se encontrado → Toca animação                 │
│  • Se 404 → Fallback soletração ❌               │
└──────────────────────────────────────────────────┘
```

---

## 📡 API Calls Flow

```
┌────────────────────────────────────────────────────────────┐
│  GameEngine monta                                           │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  loadDict() chamado (no useEffect)                          │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  loadVLibrasDictionary()                                   │
│  └─ fetch('https://dicionario2.vlibras.gov.br/api/dict')  │
└────────┬────────────────┬────────────────────────────────┘
         │                │
      200 OK          ERROR 404/503/CORS
         │                │
         ▼                ▼
    ┌─────────┐      ┌─────────────┐
    │ Parse   │      │ Log error   │
    │ JSON    │      │ Fallback:   │
    │ Build   │      │ dicionário  │
    │ Set<>   │      │ vazio       │
    └────┬────┘      └─────────────┘
         │
         ▼
    setState(vlibrasDict)
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  Pronto para validar glosas              │
    │  playGlosaSegura() agora funciona        │
    └─────────────────────────────────────────┘
```

---

## 🚀 Execution Timeline (Single Glosa)

```
T=0ms:    User triggers setup
          ├─ useEffect[gameState===SETUP] fires
          └─ playGlosaSegura("BEM_VINDO AVALIA") called

T=10ms:   playGlosaSegura() executes
          ├─ Check: vlibrasDict?.size > 0?
          │  └─ YES → call sanitizeGlosaStrict()
          ├─ sanitizeGlosaStrict() splits tokens
          │  ├─ "BEM_VINDO" → isTokenValid() → YES ✅
          │  └─ "AVALIA" → isTokenValid() → YES ✅
          └─ Result: "BEM_VINDO AVALIA" (no change)

T=20ms:   vlibrasRef.current?.play("BEM_VINDO AVALIA")
          ├─ Calls window.VLibras.Player.play()
          └─ Passes string to C# layer

T=30ms:   Unity C# Motor receives glosa
          ├─ Split into tokens: ["BEM_VINDO", "AVALIA"]
          ├─ For each token:
          │  ├─ BEM_VINDO: fetch CDN → 200 OK ✅
          │  │              Load animation mesh
          │  │              Play sign
          │  └─ AVALIA: fetch CDN → 200 OK ✅
          │              Load animation mesh
          │              Play sign
          ├─ No 404 errors → No soletração ✅
          └─ Result: Avatar faz sinais fluidos

T=2000ms: Animation completa
          └─ Avatar pausa, pronto para próxima glosa
```

---

## 🛡️ Error Handling Flow

```
                  ┌─ Glosa recebida ─┐
                  │                   │
                  ▼
        ┌─────────────────────┐
        │ vlibrasDict        │
        │ carregado?         │
        └─┬─────────────┬────┘
         SIM           NÃO
         │              │
         ▼              ▼
    ┌─────────┐  ┌────────────────┐
    │ Usa     │  │ Usa fallback:  │
    │ STRICT  │  │ sanitizarGlosa │
    │ (Trie)  │  │ (simples)      │
    └────┬────┘  └────────┬───────┘
         │                │
         └────────┬───────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Glosa sanitizada    │
        └─────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ Vazia?                  │
        │ (Nenhum token válido?)  │
        └─┬─────────────┬─────────┘
         NÃO           SIM
         │              │
         ▼              ▼
    ┌────────┐    ┌──────────┐
    │ Envia  │    │ Não envia│
    │ Unity  │    │ Log warn │
    └────────┘    └──────────┘
```

---

## 📊 State Transition Diagram

```
┌────────────┐
│   IDLE     │ (App loaded, before login)
└──────┬─────┘
       │ login
       ▼
┌────────────┐
│  LIBRAS    │ (Language: LIBRAS selected)
│   MODE     │ ← vlibrasDict starts loading
└──────┬─────┘
       │ dictionário loaded
       ▼
┌────────────┐
│  SETUP     │ ← playGlosaSegura() available now
│  SCREEN    │
└──────┬─────┘
       │ form submitted
       ▼
┌────────────────┐
│  READY_CHECK   │ ← Play "PREPARAR COMEÇAR JOGO"
│  SCREEN        │
└──────┬─────────┘
       │ confirmed
       ▼
┌────────────────┐
│  COUNTDOWN     │ ← Play "TRÊS", "DOIS", "UM", "JÁ"
│  SCREEN        │
└──────┬─────────┘
       │ finished
       ▼
┌────────────────┐
│  PLAYING       │ ← Play question glosa
│  SCREEN        │
└──────┬─────────┘
       │ question answered
       ▼
┌────────────────┐
│  ROUND_SUMMARY │ (or FINISHED)
│  SCREEN        │
└────────────────┘
```

---

## 🔑 Key Components

### Core Validator
```typescript
// File: packages/core/src/vlibras-dictionary-validator.ts
export async function loadVLibrasDictionary(): Promise<Set<string>>
export function sanitizeGlosaStrict(glosa, dict): string
export function isTokenValid(token, dict): boolean
```

### GameEngine Integration
```typescript
// File: packages/game-engine/src/GameEngine.tsx
const playGlosaSegura = (glosa, emotion?) => {
  let sanitized = vlibrasDict?.size > 0 
    ? sanitizeGlosaStrict(glosa, vlibrasDict)
    : sanitizarGlosa(glosa);
  if (!sanitized?.trim()) return;
  vlibrasRef.current?.play(sanitized);
}
```

### VLibras Component
```typescript
// File: packages/design-system/src/components/VLibras.tsx
export interface VLibrasHandle {
  play: (glosa: string) => void;
  setEmotion: (emotion: string) => void;
  // ... outros
}
```

---

## 📈 Performance Metrics

```
Operation          Time    Memory    Network
─────────────────────────────────────────────
Load Dictionary    ~500ms  ~100KB    1 API call
Parse JSON         ~50ms   ~50KB     —
Build Trie/Set     ~100ms  ~200KB    —
Validate Token     O(1)    ~1KB      —
Sanitize Glosa     O(n)    ~5KB      —
Play Glosa (total) ~600ms  ~50KB     —

Per Glosa (after init):
Validate & Play    ~20ms   <1KB      —
```

---

## 🎓 Legend

```
✅ = Implementado, funcionando
🧪 = Necessário testar
❌ = Não implementado, problema
→  = Fluxo, próximo passo
|  = Conexão, fluxo vertical
└─ = Conexão, fluxo horizontal
```

---

**Diagrama atualizado**: Junho 10, 2026  
**Versão**: 1.4.5-beta

