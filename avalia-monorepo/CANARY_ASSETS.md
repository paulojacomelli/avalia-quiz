# 🎨 Canary Assets (Ícones e Logos de Desenvolvimento)

Este documento explica como os ícones e logos canary são automaticamente aplicados aos apps de desenvolvimento quando você faz push para a branch `dev`.

## 📁 Estrutura

```
apps/
├── quiz-canary/                      # Assets canary para avalia-quiz
│   ├── apple-touch-icon.png          # Ícone iOS
│   ├── favicon.ico                   # Ícone browser
│   ├── masked-icon.svg               # Ícone adaptável
│   ├── pwa-192x192.png               # PWA pequeno
│   ├── pwa-512x512.png               # PWA grande
│   ├── logo.svg                      # Logo genérico (opcional)
│   ├── logo-dark.svg                 # Logo escuro (opcional)
│   └── logo-light.svg                # Logo claro (opcional)
│
├── jwquiz-canary/                    # Assets canary para avalia-jw-quiz
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── masked-icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── logo.svg                      # Logo JW Quiz (NOVO!)
│   ├── logo-dark.svg                 # Logo JW escuro (opcional)
│   └── logo-light.svg                # Logo JW claro (opcional)
│
├── avalia-quiz/
│   ├── public/                       # Ícones e logos copiados aqui automaticamente
│   └── src/config/
│       └── canary-logo.ts            # Configuração de logo gerada automaticamente
│
└── avalia-jw-quiz/
    ├── public/                       # Ícones e logos copiados aqui automaticamente
    └── src/config/
        └── canary-logo.ts            # Configuração de logo gerada automaticamente
```

## 🔄 Como Funciona

### Fluxo Automático (GitHub Actions)

1. Você faz **push para a branch `dev`**
2. GitHub Actions dispara o workflow `deploy-firebase-dev.yml`
3. Antes de fazer o build, o script `apply-canary-assets.js` é executado
4. Os ícones canary são copiados para as pastas `public` dos apps
5. Os logos canary são copiados e um arquivo de configuração é gerado
6. Os apps são buildados e deployados com os ícones e logos canary

### Scripts Disponíveis

#### Aplicar ícones e logos canary (local)
```bash
npm run apply-canary-assets
```

#### Restaurar ícones e logos oficiais (local, pré-commit)
```bash
npm run apply-official-assets
```
> [!IMPORTANT]
> Execute `npm run apply-official-assets` localmente antes de realizar commits ou pushes. Isso garante que os assets oficiais estejam commitados no Git, de modo que o deploy da branch `main` use os ícones corretos de produção.

#### Build com ícones e logos canary
```bash
npm run build:dev              # Build de todos os apps
npm run build:dev:generic      # Build apenas avalia-quiz
npm run build:dev:jw           # Build apenas avalia-jw-quiz
```

## 🚀 Uso Local

Se você quer testar localmente com os ícones e logos canary:

```bash
# 1. Aplicar os ícones e logos canary
npm run apply-canary-assets

# 2. Fazer build
npm run build:dev

# 3. Preview
npm run preview
```

## ✏️ Atualizando os Ícones Canary

Para atualizar os ícones canary:

1. Vá para a pasta do canary app:
   ```bash
   # Para quiz
   cd apps/quiz-canary

   # OU para jw-quiz
   cd apps/jwquiz-canary
   ```

2. Substitua os arquivos `.png`, `.ico`, `.svg` pelos novos

3. Quando você fizer push para `dev`, os ícones serão automaticamente copiados

## 🎨 Adicionando Logos Canary

Para usar logos customizados por app (NOVO!):

1. **Crie os arquivos de logo** nas pastas canary:
   ```
   apps/quiz-canary/logo.svg           # Logo padrão
   apps/quiz-canary/logo-dark.svg      # Logo versão escura
   apps/quiz-canary/logo-light.svg     # Logo versão clara
   
   apps/jwquiz-canary/logo.svg         # Logo para JW Quiz
   apps/jwquiz-canary/logo-dark.svg    # Logo JW escuro
   apps/jwquiz-canary/logo-light.svg   # Logo JW claro
   ```

2. **Execute o script** para copiar:
   ```bash
   npm run apply-canary-assets
   ```

3. **Os logos serão copiados** para:
   ```
   apps/avalia-quiz/public/logo.svg
   apps/avalia-jw-quiz/public/logo.svg
   ```

4. **Use no seu componente**:
   ```tsx
   import { CANARY_LOGO_CONFIG } from './config/canary-logo';
   
   export function Header() {
     if (CANARY_LOGO_CONFIG.enabled) {
       return (
         <img 
           src="/logo.svg" 
           alt="Logo Canary" 
           className="h-8 w-auto" 
         />
       );
     }
     // Fallback para logo padrão
     return <DefaultLogo />;
   }
   ```

## 📝 O que o Script Faz

1. **Copia ícones**:
   - apple-touch-icon.png
   - favicon.ico
   - masked-icon.svg
   - pwa-192x192.png
   - pwa-512x512.png

2. **Copia logos** (se existirem):
   - logo.svg
   - logo-dark.svg
   - logo-light.svg

3. **Gera configuração**:
   - Cria `src/config/canary-logo.ts` com flag `enabled` e nome do app

## ✅ Checklist para Usar Logos Canary

- [ ] Criar arquivos de logo nas pastas `quiz-canary/` e `jwquiz-canary/`
- [ ] Executar `npm run apply-canary-assets` localmente para testar
- [ ] Verificar se os logos aparecem em `public/logo*.svg`
- [ ] Atualizar componentes para usar `CANARY_LOGO_CONFIG`
- [ ] Fazer push para `dev` - o GitHub Actions cuida do resto!

## 🔧 Notas

- Os ícones canary **não afetam** os builds normais (sem passar pelo script)
- Os ícones canary **sobrescrevem** os ícones padrão apenas quando o script é executado
- O workflow de dev sempre aplica os ícones canary automaticamente
- Para manter os ícones padrão em produção, o workflow `deploy-firebase.yml` não executa este script
- Os logos são opcionais - se não existirem, o script apenas ignora

## 📖 Próximos Passos

1. Crie os arquivos de logo SVG nas pastas canary
2. Teste localmente com `npm run apply-canary-assets`
3. Atualize os componentes para usar os logos
4. Commit e push para `dev`
