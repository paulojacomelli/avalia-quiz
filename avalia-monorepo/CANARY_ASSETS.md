# 🎨 Canary Assets (Ícones de Desenvolvimento)

Este documento explica como os ícones canary são automaticamente aplicados aos apps de desenvolvimento quando você faz push para a branch `dev`.

## 📁 Estrutura

```
apps/
├── quiz-canary/              # Ícones canary para avalia-quiz
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── masked-icon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
│
├── jwquiz-canary/            # Ícones canary para avalia-jw-quiz
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── masked-icon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
│
├── avalia-quiz/
│   └── public/               # ← Ícones copiados aqui automaticamente
│
└── avalia-jw-quiz/
    └── public/               # ← Ícones copiados aqui automaticamente
```

## 🔄 Como Funciona

### Fluxo Automático (GitHub Actions)

1. Você faz **push para a branch `dev`**
2. GitHub Actions dispara o workflow `deploy-firebase-dev.yml`
3. Antes de fazer o build, o script `apply-canary-assets.js` é executado
4. Os ícones canary são copiados para as pastas `public` dos apps
5. Os apps são buildados e deployados com os ícones canary

### Scripts Disponíveis

#### Aplicar ícones canary (local)
```bash
npm run apply-canary-assets
```

#### Build com ícones canary
```bash
npm run build:dev              # Build de todos os apps
npm run build:dev:generic      # Build apenas avalia-quiz
npm run build:dev:jw           # Build apenas avalia-jw-quiz
```

## 🚀 Uso Local

Se você quer testar localmente com os ícones canary:

```bash
# 1. Aplicar os ícones canary
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

## 📝 Notas

- Os ícones canary **não afetam** os builds normais (sem passar pelo script)
- Os ícones canary **sobrescrevem** os ícones padrão apenas quando o script é executado
- O workflow de dev sempre aplica os ícones canary automaticamente
- Para manter os ícones padrão em produção, o workflow `deploy-firebase.yml` não executa este script

## 🔧 Adicionando Novos Arquivos

Se precisar adicionar novos tipos de ícones:

1. Adicione os arquivos nas pastas canary:
   ```
   apps/quiz-canary/seu-novo-icone.png
   apps/jwquiz-canary/seu-novo-icone.png
   ```

2. Edite o script `scripts/apply-canary-assets.js` e adicione o arquivo à array `ICON_FILES`
