# 🎬 Layout Split-Screen Responsivo - VLibras

## Resumo das Mudanças

Implementação de um layout responsivo **split-screen** onde o VLibras (tradutor de LIBRAS) **nunca fica oculto**:

### 📱 Telas Verticais (Portrait)
- **Avatar VLibras**: Topo (altura: 250px)
- **Conteúdo**: Abaixo (scroll vertical)
- Layout: `flex-col` (coluna)

### 🖥️ Telas Horizontais (Landscape)
- **Avatar VLibras**: Esquerda (33% da largura / `lg:w-1/3`)
- **Conteúdo**: Direita (67% da largura / `flex-1`)
- Layout: `lg:flex-row` (linha)

## Arquivos Modificados

### 1. **GameEngine.tsx**
```tsx
// Estrutura Principal (antes):
<div className="h-screen flex flex-col">
  <header>...</header>
  <div className="h-[250px]">VLibras</div>
  <main>Conteúdo</main>
</div>

// Estrutura Principal (depois):
<div className="h-screen flex flex-col lg:flex-row">
  {interfaceLanguage === 'libras' && (
    <div className="w-full lg:w-1/3 h-[250px] lg:h-full">
      <VLibras />
    </div>
  )}
  <div className="flex-1 flex flex-col overflow-y-auto">
    <header>...</header>
    <main>Conteúdo</main>
  </div>
</div>
```

### 2. **VLibrasControls.tsx** (NOVO)
Componente de controles do player com botões:
- ▶️ Play
- ⏸️ Pause  
- 🔄 Repeat

### 3. **design-system/index.ts**
Exports adicionados:
```ts
export { default as VLibrasControls } from './components/VLibrasControls';
export type { VLibrasControlsHandle } from './components/VLibrasControls';
```

### 4. **Versionamento**
- `@avalia/quiz`: `1.4.2-beta` → `1.4.3-beta`
- `@avalia/jw-quiz`: `1.4.2-beta` → `1.4.3-beta`

## Comportamento Responsivo

### Pontos de Breakpoint (Tailwind)
- `<lg`: Portrait (VLibras no topo, 250px de altura)
- `≥lg`: Landscape (VLibras à esquerda, 33% da largura)

### CSS Classes Utilizadas
```
Portrait:
- w-full (100% da largura)
- h-[250px] (250px de altura)
- flex-col (layout vertical)
- border-b (borda inferior)

Landscape:
- lg:w-1/3 (33% da largura)
- lg:h-full (altura total)
- lg:flex-row (layout horizontal)
- lg:border-r (borda lateral)
```

## Comportamento Visual

### Animações
- `animate-fade-in-down`: Entrada suave do VLibras
- `overflow-y-auto`: Scroll no conteúdo principal
- Transições suaves com `transition-all duration-700`

### Acessibilidade
- VLibras sempre visível (nunca oculto por scroll)
- Controles sempre acessíveis
- Header fixo no topo (durante scroll em portrait)

## Próximas Etapas

1. **Integrar VLibrasControls** no componente principal
2. **Testar em múltiplos dispositivos**:
   - Mobile (portrait)
   - Tablet (ambas orientações)
   - Desktop (landscape)
3. **Verificar performance** em baixa conexão
4. **Adicionar indicador visual** do status de playback

## Testes Recomendados

```bash
# Build
npm run build

# Dev (localhost:5175)
npm run dev

# Verificar responsividade:
- F12 → Device Toolbar
- Testar orientações
- Verificar scroll em mobile
```

## Notas Técnicas

- **Z-index**: Mantido em 10 para o header (sticky ao scroll em portrait)
- **Overflow**: Controlado com `overflow-hidden` no container principal
- **Flexbox**: Usado `flex-1` para distribuição dinâmica de espaço
- **Media Queries**: `lg:` breakpoint (1024px) é o ponto de transição

---
**Status**: ✅ Implementado e Pronto para Teste  
**Versão**: 1.4.3-beta
