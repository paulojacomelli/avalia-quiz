# 🚀 Deploy por Branch - Main vs Dev

## 📊 Configuração Atual

Agora você tem 2 workflows diferentes:

### Branch `main` → Production
```
git push origin main
    ↓
Deploy automático para:
- https://avalia-quiz.web.app
- https://avalia-jw-quiz.web.app
```

### Branch `dev` → Development
```
git push origin dev
    ↓
Deploy automático para:
- https://avaliaquizdev.web.app
- https://avaliajwquizdev.web.app
```

---

## 📁 Arquivos Criados

```
.github/workflows/
├── deploy-firebase.yml         # Para branch main
└── deploy-firebase-dev.yml     # Para branch dev

avalia-monorepo/
├── firebase.json               # Atualizado com 4 targets
└── .firebaserc                 # Atualizado com targets dev
```

---

## 🎯 Como Usar

### Desenvolver (branch dev)

```bash
# Fazer suas alterações
git checkout dev
git add .
git commit -m "feat: nova feature"
git push origin dev
```

Automaticamente fará deploy em:
- https://avaliaquizdev.web.app
- https://avaliajwquizdev.web.app

### Liberar para Produção (branch main)

```bash
# Merge para main
git checkout main
git merge dev
git push origin main
```

Automaticamente fará deploy em:
- https://avalia-quiz.web.app
- https://avalia-jw-quiz.web.app

---

## ✅ Sites Criados

```
Production (main):
├── avalia-quiz → https://avalia-quiz.web.app
└── avalia-jw-quiz → https://avalia-jw-quiz.web.app

Development (dev):
├── avaliaquizdev → https://avaliaquizdev.web.app
└── avaliajwquizdev → https://avaliajwquizdev.web.app
```

---

## 🔑 Secrets Necessários

No GitHub, você precisa adicionar (se ainda não fez):

1. `FIREBASE_DEPLOY_TOKEN` - Token de autenticação Firebase
   **OU**
   `FIREBASE_SERVICE_ACCOUNT_KEY` - Arquivo JSON da Service Account

Ambos os workflows usam esses mesmos secrets.

---

## 📊 Fluxo Recomendado

```
1. Feature Branch
   ↓
2. Pull Request para dev
   ↓
3. Deploy automático em avaliaquizdev.web.app
   ↓
4. Teste em dev
   ↓
5. Merge para main (quando pronto)
   ↓
6. Deploy automático em avalia-quiz.web.app (produção)
```

---

## 🆘 Acompanhar o Deploy

Vá para a aba **Actions** do GitHub e você verá:

- ✅ `Deploy to Firebase Hosting` - quando fizer push para `main`
- ✅ `Deploy to Firebase Hosting (Dev)` - quando fizer push para `dev`

Clique para ver os detalhes e logs do deploy.

---

## 💡 Dicas

### Só precisa recriar sites se necessário
```bash
firebase hosting:sites:create seusite
```

### Ver status dos deployments
```bash
firebase hosting:channels:list
```

### Deploy manual local (se precisar)
```bash
cd avalia-monorepo

# Dev sites
firebase deploy --only hosting:avaliaquizdev,hosting:avaliajwquizdev

# Production sites
firebase deploy --only hosting:avalia-quiz,hosting:avalia-jw-quiz
```

---

## ✨ Pronto!

Agora você tem um fluxo profissional:
- **Dev** → Testes em ambiente de desenvolvimento
- **Main** → Produção com apps ao vivo

Sempre que fizer push, o deploy é automático! 🎉
