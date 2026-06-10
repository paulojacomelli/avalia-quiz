# ⚡ VLibras: Quick Start Guide

**Versão**: 1.4.5-beta  
**Para**: Desenvolvedores & Testers

---

## 🚀 Build & Deploy

```bash
# Build tudo
npm run build

# Verificar tipos
npm run type-check

# Iniciar dev (se necessário)
npm run dev
```

---

## 🧪 Testar Rapidamente

### Opção 1: Local Development
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Abrir browser
# http://localhost:5173 (ou porta exibida)
```

### Opção 2: Production Build
```bash
npm run build
# Artifacts em:
# - apps/avalia-quiz/dist
# - apps/avalia-jw-quiz/dist
```

---

## 🎯 Test Scenario

1. **Abrir app**
   - URL: http://localhost:5173

2. **Login (ou Skip)**
   - Usuário: qualquer
   - Senha: qualquer

3. **Settings → Language**
   - Mudar para: **LIBRAS**

4. **Aguardar**
   - 1.5 segundos para dicionário carregar
   - Avatar deve aparecer à esquerda/topo

5. **Verificar**
   - Avatar deve fazer **sinais fluidos**
   - Console (F12 → Console):
     ```
     [GameEngine] ✅ Dicionário VLibras carregado: 1234 tokens
     [VLibras] play: OI BEM_VINDO AVALIA JOGO
     ```

6. **❌ Problema?**
   - Avatar faz "B-E-M---V-I-N-D-O"?
   - Abrir `TESTING_CHECKLIST.md` → "Bug Report"

---

## 📁 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `vlibras-dictionary-validator.ts` | 🔑 Runtime Safeguard |
| `GameEngine.tsx` | 🎮 Integração |
| `VLIBRAS_FIX_METHODS_AND_VALIDATION.md` | 📚 Docs Técnicas |
| `TESTING_CHECKLIST.md` | 🧪 Testes |
| `RELEASE_NOTES_1.4.5.md` | 📋 Changelog |

---

## 🔍 Debug Console

### Ver Status do Dicionário
```javascript
import { getDictionaryStatus } from '@avalia/core';
const status = getDictionaryStatus();
console.log(status);
// { cached: true, loading: false, tokenCount: 1234 }
```

### Testar Token Específico
```javascript
import { debugDictionary } from '@avalia/core';
await debugDictionary(["BEM_VINDO", "TESTE", "OI"]);
// Mostra ✅ ou ❌ para cada um
```

### Ver Logs de Reprodução
```javascript
// F12 → Console
// Filter por: "VLibras"
// Deve ver:
// [VLibras] play: OI BEM_VINDO ...
```

---

## 💡 Key Points

✅ **O que foi feito**:
- Corrigir método: `playGlosa()` → `play()`
- Implementar validador determinístico
- Evitar soletração (404 → fallback)

⚡ **Performance**:
- Dicionário carrega em background
- Cache mantém em memória
- Validação é O(n) por glosa

🔒 **Segurança**:
- API oficial `.gov.br`
- Validação local (sem transmissão)

---

## ❓ FAQ

### P: Preciso fazer algo?
**R**: Testar! Veja "Test Scenario" acima. Build já foi feito.

### P: Como reportar bug?
**R**: Veja `TESTING_CHECKLIST.md` → "Bug Report Template"

### P: Por que às vezes não reproduz glosa?
**R**: Causas:
1. Dicionário ainda carregando (wait 2s)
2. Token inválido (check console logs)
3. VLibras não pronto (check DevTools)
4. Race condition (increase delay 1500 → 2500ms)

### P: E se dicionário não carregar?
**R**: Fallback para validação simples (`sanitizarGlosa`). Sem garantia de evitar soletração.

### P: Posso usar em produção?
**R**: ✅ SIM. Build passou. Recomendado fazer testes em staging primeiro.

---

## 📞 Suporte Rápido

1. **Console com erro?**
   - Copiar log completo
   - Abrir `VLIBRAS_FIX_METHODS_AND_VALIDATION.md` → "Possíveis Problemas"

2. **Avatar soletração?**
   - Aguardar 2s (dicionário carregando)
   - Se persistir, check `TESTING_CHECKLIST.md` → "Test Suite 5"

3. **Tudo certo?**
   - Ótimo! Avisar @dev para deploy

---

## ✅ Checklist Final

- [ ] Build rodou sem erros
- [ ] Console não tem erros vermelhos
- [ ] Avatar renderiza
- [ ] Glosas tocam SEM soletração
- [ ] Dicionário carregou (check console log)
- [ ] Todos os 4 controles funcionam (se houver)
- [ ] Sem hangs/lags durante jogo

Se tudo ✅, você está pronto!

