# ✅ VLibras Testing Checklist

**Versão**: 1.4.5-beta  
**Data**: Junho 10, 2026  

---

## 🎯 Testes Manuais

### Test Suite 1: Build & Deployment ✅

- [ ] **Build sem erros**
  ```bash
  npm run build
  ```
  Esperado: `Exit Code: 0`

- [ ] **Nenhum erro de compilação de tipos**
  ```bash
  npm run type-check
  ```

- [ ] **App inicia sem erros de console**
  - Abrir Chrome DevTools (F12)
  - Verificar console para erros vermelhos

---

### Test Suite 2: VLibras Motor & Initialization

- [ ] **Motor Unity carrega corretamente**
  - Abrir `/vlibras` route (test page)
  - Aguardar 5 segundos
  - Verificar avatar renderizado (avatar de Ícaro visível)
  - Status indicator muda para "Sinalizando: Olá (1)"

- [ ] **Script VLibras injeta sem erros**
  - Inspecionar Network tab
  - Ver `/js/vlibras-player.js` com status 200
  - Se falhar, validar fallback para CDN oficial

- [ ] **Dicionário carrega em background**
  - Abrir console
  - Procurar por: `[GameEngine] ✅ Dicionário VLibras carregado: XXX tokens`
  - Se vazio: `[GameEngine] ❌ Falha ao carregar dicionário VLibras`

---

### Test Suite 3: LIBRAS Interface

#### Setup Phase

- [ ] **Ativar modo LIBRAS**
  - Fazer login ou continuar sem login
  - Menu → Settings/Preferences
  - Selecionar Language: LIBRAS
  - App reinicia com interface em LIBRAS

- [ ] **Avatar aparece em split-screen**
  - **Mobile (Portrait)**: Avatar no topo (250px), conteúdo abaixo
  - **Desktop (Landscape)**: Avatar à esquerda (33%), conteúdo à direita (67%)
  - Avatar **NUNCA** sai da tela durante scroll

- [ ] **Glosas iniciais tocam SEM soletração**
  - Aguardar 1.5s após page load (event `stop:welcome`)
  - Ouvir avatar "dizendo" (animação de boca/sinais)
  - **❌ Não deve**: Soletrar palavra por palavra
  - **✅ Deve**: Fazer sinais fluidos, gestos expressivos

#### Setup Form

- [ ] **Glosa "CONFIGURAR QUIZ" aparece**
  - Avatar anima com expressão "pensa"
  - Console log: `[VLibras] play: CONFIGURAR QUIZ`

- [ ] **Glosa muda quando step muda**
  - Step 1 → 2 → 3
  - Avatar reproduz glosa correspondente
  - Nenhuma soletração

---

### Test Suite 4: Quiz States

#### Ready Check

- [ ] **Glosa pronta funciona**
  - Depois de configurar quiz
  - Chegar em READY_CHECK screen
  - Avatar: "PREPARAR COMEÇAR JOGO"
  - Expressão: "feliz"
  - Console: `[VLibras] play: PREPARAR COMEÇAR JOGO`

#### Countdown

- [ ] **Números sinalizados corretamente**
  - Clicar "PRONTO"
  - Aguardar countdown:
    - 3: Avatar sinaliza "TRÊS"
    - 2: Avatar sinaliza "DOIS"
    - 1: Avatar sinaliza "UM"
    - 0: Avatar sinaliza "JÁ" (expressão: "feliz")

#### Question (Playing)

- [ ] **Glosa da pergunta reproduz**
  - Quiz começa em PLAYING state
  - Avatar reproduz glosa da pergunta
  - Sem soletração
  - Expressão: "duvida"

---

### Test Suite 5: Validation & Safeguard

#### Console Logs

- [ ] **Procurar por logs de validação**
  ```
  [VLibras Validator] Carregando dicionário oficial...
  [VLibras Validator] ✅ Dicionário carregado: 1234 tokens
  ```

- [ ] **Procurar por tokens rejeitados** (se houver)
  ```
  [VLibras Validator] ❌ Token rejeitado: "BEMVINDO"
  [VLibras Validator] ✅ Token válido: "BEM_VINDO"
  ```

#### Debug Tokens

Execute no console (F12 → Console):
```javascript
import { debugDictionary } from '@avalia/core';
await debugDictionary([
  "BEM_VINDO",
  "OI",
  "JOGO",
  "PERGUNTAS",
  "CORRETO",
  "ERRADO"
]);
```

Esperado: todos com ✅

#### Salsa Test (Força Soletração Propositalmente)

```javascript
import { sanitizeGlosaStrict } from '@avalia/core';
import { loadVLibrasDictionary } from '@avalia/core';

const dict = await loadVLibrasDictionary();
const result = sanitizeGlosaStrict("BEMVINDO TESTE", dict);
console.log("Resultado:", result);  // Esperado: "" (vazio)
```

---

### Test Suite 6: Controls (Se Implementados)

- [ ] **Botões flutuantes aparecem**
  - Avatar pronto (isLibrasReady = true)
  - 4 ícones no canto inferior direito do avatar

- [ ] **Speed Control**
  - Clica 🎚️
  - Seleciona 1.5x
  - Avatar acelera sinais

- [ ] **Play/Pause**
  - Clica ⏯️
  - Avatar pausa
  - Clica novamente: resumo

- [ ] **Avatar Switcher**
  - Clica 👤
  - Seleciona Ícaro → Hosana → Guga
  - Avatar muda

- [ ] **Replay**
  - Clica 🔄
  - Avatar repete última glosa

---

## 🐛 Bug Report Template

Se encontrar problema, reporte com:

```markdown
### Issue: [Título]
**Severity**: 🔴 Critical / 🟠 Major / 🟡 Minor

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected**:
Avatar sinaliza "BEM_VINDO" sem soletração

**Actual**:
Avatar faz datilologia letra por letra

**Console Logs**:
```
[Paste console logs here]
```

**Environment**:
- Browser: Chrome 125
- OS: Windows 11
- Screen Size: 1920x1080
```

---

## 📊 Success Criteria

| Critério | Status |
|----------|--------|
| Build sem erros | ✅ |
| Métodos corrigidos `play()` | ✅ |
| Validador implementado | ✅ |
| Avatar renderiza | 🧪 *Teste* |
| Glosas tocam SEM soletração | 🧪 *Teste* |
| Controles funcionam | 🧪 *Teste* |
| Sem erros em console | 🧪 *Teste* |

---

## 📞 Support

Se encontrar problemas:
1. Checar `VLIBRAS_FIX_METHODS_AND_VALIDATION.md`
2. Executar tests da section 5 (Console Logs)
3. Procurar por logs de erro específicos
4. Reportar issue com template acima

