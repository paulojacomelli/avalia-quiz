# 📘 Guia Consolidado de Integração e Correção do VLibras

**Data de Atualização**: 27 de Julho de 2026  
**Versão Atual**: `1.4.5-beta` → `1.4.7`  
**Status**: 🟢 Produção / Validado

---

## 📌 1. Visão Geral & Arquitetura

O ecossistema **VLibras** no Avalia Monorepo fornece a tradução de interface e o suporte de acessibilidade em Libras (Língua Brasileira de Sinais). Este guia consolida o histórico de correções do motor Unity, o ajuste nos métodos de reprodução e o funcionamento do **Runtime Safeguard** (validador de dicionário).

### Diagrama de Arquitetura da Solução
```
┌──────────────────────────────────────────────────────────────┐
│ GameEngine / Design System (UI do Quiz)                      │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ Validador de Dicionário (Runtime Safeguard)                   │
│ - packages/core/src/vlibras-dictionary-validator.ts         │
│ - Sanitiza glosas e remove tokens inválidos (evita 404)      │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ Componente VLibras / VLibrasHandle                           │
│ - packages/design-system/src/components/VLibras.tsx          │
│ - Chama player.play(glosaSanitizada)                        │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ Motor Unity / Player WebGL (CDN Oficial / Bridge JS)        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 2. Correção do Motor Unity (Script Error & Fallback)

### Problema Histórico
Erros do tipo `"An error occurred running the Unity content on this page. Script error."` ocorriam devido à desincronização entre o bundle local `vlibras-player.js` e a estrutura de pacotes do UnityLoader.

### Soluções Aplicadas
1. **Monkey Patch de Métodos Internos**:
   - Sobrescrita de `_getTargetScript()` e `_initializeTarget()` no `VLibras.tsx` apontando para a CDN oficial do governo (`https://vlibras.gov.br`).
2. **Fallback Automático via CDN**:
   - Se o script local falhar ou apresentar bloqueio, o componente migra silenciosamente para o script remoto oficial `https://vlibras.gov.br/app/vlibras-plugin.js`.
3. **Cabeçalhos de Origem e CORS**:
   - Adicionada a propriedade `crossOrigin = 'anonymous'` ao elemento `<script>` dinâmico.

---

## 🛠️ 3. Correção de Métodos & Runtime Safeguard

### A. Correção da API de Reprodução (`playGlosa()` → `play()`)
- **Falha Anterior**: Vários arquivos chamavam o método inexistente `playGlosa()`.
- **Correção**: Toda a camada do `GameEngine` e componentes de teste chamam estritamente o método nativo da ponte:
  ```typescript
  vlibrasRef.current?.play(glosaSanitizada);
  ```

### B. Funcionamento do Runtime Safeguard
O módulo `vlibras-dictionary-validator.ts` impede a soletração (datilologia) causada por tokens inexistentes na CDN oficial do governo.

#### Estratégia de Validação Determinística:
1. **Verificação Exata**: Checa se o token completo existe no dicionário (ex: `"BEM_VINDO"`).
2. **Remoção de Sufixo de Variação**: Transforma `"DOIS.1"` em `"DOIS"`.
3. **Remoção de Desambiguação**: Transforma `"BANCO&DINHEIRO"` em `"BANCO"`.
4. **Respeito a Marcadores**: Preserva marcadores de pontuação (`"[PONTO]"`, `"[INTERROGACAO]"`).
5. **Rejeição**: Se todas as estratégias falharem, o token é removido para prevenir datilologia.

---

## 📊 4. Matriz de Componentes e ArquivosAfetados

| Módulo / Arquivo | Responsabilidade | Status |
|------------------|-------------------|--------|
| `packages/core/src/vlibras-dictionary-validator.ts` | Validação determinística de glosas contra a API oficial. | ✅ Implementado |
| `packages/design-system/src/components/VLibras.tsx` | Componente React com monkey patch e suporte WebGL. | ✅ Estável |
| `packages/game-engine/src/GameEngine.tsx` | Orquestração dos estados do jogo e envio de glosas limpas. | ✅ Integrado |
| `packages/design-system/src/components/VLibrasControls.tsx` | UI dos controles flutuantes de velocidade, avatar e replay. | ✅ Integrado |

---

## 🧪 5. Guia de Teste e Validação

Para validar o funcionamento correto da integração do VLibras:

1. Inicie a aplicação localmente:
   ```powershell
   npm run dev --prefix avalia-monorepo
   ```
2. Abra o aplicativo em `http://localhost:5173` ou `http://localhost:5174`.
3. Ative o modo **LIBRAS** no painel de configurações.
4. Abra o DevTools (Console) e verifique os logs do validador:
   - Status do cache: `[VLibras Validator] Dicionário oficial carregado com sucesso.`
   - Confirmar ausência de chamadas 404 e ausência de soletração letra-por-letra.
