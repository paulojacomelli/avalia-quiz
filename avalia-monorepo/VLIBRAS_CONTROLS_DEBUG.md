# 🐛 Debug: Controles VLibras

## Problema
Os botões flutuantes aparecem, mas não funcionam quando clicados.

## Métodos Disponíveis no Player
Confirmado no `vlibras-player.js`:
- ✅ `changeAvatar(avatarName)` - linha 238
- ✅ `setSpeed(speed)` - linha 226
- ✅ `pause()` - linha 218
- ✅ `continue()` - linha 210
- ✅ `repeat()` - linha 214

## Console Logs Adicionados

### VLibras.tsx
```typescript
console.log('[VLibras] changeAvatar:', avatar, 'playerRef:', playerRef.current);
console.log('[VLibras] setSpeed:', speed);
console.log('[VLibras] pause');
console.log('[VLibras] continue');
console.log('[VLibras] repeat');
```

### GameEngine.tsx
```typescript
console.log('[GameEngine] Changing avatar from', vlibrasAvatar, 'to', nextAvatar);
console.log('[GameEngine] vlibrasRef.current:', vlibrasRef.current);
```

## Como Testar

### 1. Abrir DevTools
```
F12 ou Ctrl+Shift+I
```

### 2. Ir para aba Console

### 3. Clicar no botão de Avatar (👤)

### 4. Verificar os logs:
```
[GameEngine] Changing avatar from icaro to hosana
[GameEngine] vlibrasRef.current: {...}
[VLibras] changeAvatar: hosana playerRef: {...}
```

## Possíveis Causas

### 1. Player não está pronto
- `isLibrasReady` pode estar `false`
- Solução: Verificar se os botões aparecem apenas quando `isLibrasReady === true`

### 2. Ref não está conectado
- `vlibrasRef.current` pode estar `null`
- Solução: Verificar se `<VLibras ref={vlibrasRef}>` está correto

### 3. PlayerRef interno está null
- `playerRef.current` dentro do VLibras pode estar `null`
- Solução: Aguardar evento 'load' do player

### 4. Método não existe
- `changeAvatar` pode não estar disponível na instância
- Solução: Verificar `typeof playerRef.current.changeAvatar`

## Correções Implementadas

### VLibras.tsx - Verificação robusta
```typescript
changeAvatar: (avatar: string) => {
  console.log('[VLibras] changeAvatar:', avatar, 'playerRef:', playerRef.current);
  if (playerRef.current?.changeAvatar) {
    playerRef.current.changeAvatar(avatar);
  } else {
    console.warn('[VLibras] changeAvatar não disponível no player');
  }
},
```

### GameEngine.tsx - Debug detalhado
```typescript
onClick={() => {
  console.log('[GameEngine] Changing avatar...');
  console.log('[GameEngine] vlibrasRef.current:', vlibrasRef.current);
  if (vlibrasRef.current?.changeAvatar) {
    vlibrasRef.current.changeAvatar(nextAvatar);
  } else {
    console.error('[GameEngine] changeAvatar not available');
  }
}}
```

## Próximos Passos

1. ✅ Abrir navegador no `localhost:5175`
2. ✅ Selecionar idioma LIBRAS
3. ✅ Aguardar VLibras carregar
4. ✅ Abrir DevTools (F12)
5. ✅ Clicar no botão de Avatar
6. 📋 Compartilhar os logs do console

## Comandos Úteis

```bash
# Dev server
npm run dev

# Build
npm run build

# Verificar erros no console do browser
# Pressione F12 e vá para aba Console
```

---
**Status**: 🔍 Em investigação  
**Versão**: 1.4.4-beta
