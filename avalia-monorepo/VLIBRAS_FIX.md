# 🟢 Correção: Motor Unity para VLibras — Script Error

## Problema Identificado
**Erro**: "An error occurred running the Unity content on this page. Script error."

O erro ocorria porque o componente VLibras estava tentando carregar o motor WebGL/Unity, mas o arquivo local `vlibras-player.js` e a configuração do UnityLoader não estavam sincronizados.

## Causa Raiz
1. **Arquivo local desatualizado**: O bundle `vlibras-player.js` pode estar incompatível com a versão atual da API do VLibras
2. **Erro no monkey patch**: O override da função `_getTargetScript()` não estava sendo aplicado corretamente antes da instanciação
3. **Falta de fallback**: Não havia tratamento de falha para usar a CDN oficial como backup

## Soluções Implementadas

### 1. **Reforço do Monkey Patch** (VLibras.tsx)
```tsx
// Agora aplicamos o override ANTES de instanciar:
player.prototype._getTargetScript = function () {
  return `${VLIBRAS_CDN}/target/UnityLoader.js`;
};

// E também fazemos override do _initializeTarget para garantir
player.prototype._initializeTarget = function () {
  const targetSetup = `${VLIBRAS_CDN}/target/playerweb.json`;
  // ... resto da lógica
};
```

### 2. **Fallback para CDN Oficial**
Se o script local falhar, o componente agora carrega automaticamente da CDN oficial:
```tsx
s.onerror = () => {
  console.warn('Falha ao carregar vlibras-player.js local, tentando CDN oficial...');
  // Carrega de https://vlibras.gov.br/app/vlibras-plugin.js
};
```

### 3. **Melhor Tratamento de Erros**
- Mensagens de erro mais claras
- Botão "Tentar novamente" funcional
- Logs detalhados para troubleshooting

### 4. **Atributos CrossOrigin**
```tsx
s.crossOrigin = 'anonymous';
```
Previne erros CORS ao carregar de CDNs externas.

## Arquivos Modificados
- ✅ `packages/design-system/src/components/VLibras.tsx`
- ✅ `apps/avalia-quiz/package.json` (v1.4.1-beta → v1.4.2-beta)
- ✅ `apps/avalia-jw-quiz/package.json` (v1.4.1-beta → v1.4.2-beta)

## Como Testar
1. Execute o dev server: `npm run dev`
2. Navegue até `localhost:5175`
3. Selecione "LIBRAS" como idioma
4. O avatar deve aparecer sem erros de script
5. Teste `/vlibras` para validação isolada do componente

## Próximos Passos (Opcional)
- Se o erro persistir, considere:
  1. Atualizar `vlibras-player.js` com versão mais recente
  2. Usar apenas a CDN oficial (remover `vlibras-player.js` local)
  3. Verificar firewall/proxy bloqueando `vlibras.gov.br`

## Recursos
- 📚 [VLibras Documentação](https://vlibras.gov.br)
- 🔗 CDN oficial: https://vlibras.gov.br/app/vlibras-plugin.js
- 🧪 Teste: http://localhost:5175/vlibras

---
**Versão**: 1.4.2-beta  
**Componente**: VLibras Avatar Motor Unity  
**Status**: ✅ Corrigido
