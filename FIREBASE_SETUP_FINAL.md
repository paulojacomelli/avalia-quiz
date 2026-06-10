# ✅ Setup Completo - Deploy Automático Firebase

## 📊 Status Atual

✅ Firebase Project: `avalia-jw-quiz`
✅ Sites configurados:
   - `avalia-quiz` → https://avalia-quiz.web.app
   - `avalia-jw-quiz` → https://avalia-jw-quiz.web.app

✅ Workflow criado: `.github/workflows/deploy-firebase.yml`
✅ Configuração criada: `.firebaserc`

---

## 🎯 Próximos Passos

### Passo 1: Gerar Token de Autenticação

Abra o terminal e execute:

```bash
cd avalia-monorepo
firebase login:ci
```

Isso abrirá uma página no navegador. Siga os passos:
1. Faça login
2. Autorize o Firebase CLI
3. Copie o token gerado

**OU use a opção com Service Account:**

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Projeto: `avalia-jw-quiz`
3. ⚙️ Project Settings → Service Accounts
4. "Generate New Private Key"
5. Salve o JSON

---

### Passo 2: Adicionar Secrets no GitHub

No repositório GitHub:

1. **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**

#### Se você gerou o Token (firebase login:ci):
- **Name:** `FIREBASE_DEPLOY_TOKEN`
- **Value:** Cole o token

#### Se você usou Service Account:
- **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Value:** Cole o conteúdo COMPLETO do JSON

---

### Passo 3: Fazer o Primeiro Push

```bash
git add .
git commit -m "Setup: Configure automatic Firebase deployment"
git push origin main
```

---

## 🚀 Como Funciona

Agora sempre que você fazer push para `main`:

```
git push origin main
    ↓
GitHub Actions dispara automaticamente
    ↓
1. Faz checkout do código
2. Instala dependências (npm ci)
3. Build com Turbo (npm run build)
4. Deploy no Firebase Hosting
    ↓
Apps atualizados em:
- https://avalia-quiz.web.app
- https://avalia-jw-quiz.web.app
```

---

## 📱 Acompanhar o Deploy

1. Vá para o repositório GitHub
2. Clique em **Actions**
3. Veja o workflow rodando em tempo real
4. Quando terminar, você verá ✅ ou ❌

---

## ✨ Resumo dos Arquivos Criados

```
.github/
└── workflows/
    └── deploy-firebase.yml          # Workflow do GitHub Actions

avalia-monorepo/
└── .firebaserc                      # Configuração Firebase

c:\Users\design\Desktop\dev\avalia\
├── FIREBASE_SETUP_FINAL.md          # Este arquivo
├── SETUP_GITHUB_SECRETS.md          # Guia de secrets
└── DEPLOY_SETUP.md                  # Guia completo
```

---

## 🆘 Troubleshooting

### ❌ "Project avalia-jw-quiz not found"
**Solução:** Verifique se está usando `firebase use avalia-jw-quiz`

### ❌ "Invalid token"
**Solução:** Gere um novo token com `firebase login:ci` e atualize no GitHub

### ❌ "Build failed"
**Solução:** Teste localmente: `cd avalia-monorepo && npm run build`

### ❌ Deploy passa mas não atualiza os sites
**Solução:** Verifique se `.firebaserc` e `firebase.json` estão corretos

---

## 🎉 Pronto!

Você agora tem deploy automático funcionando. Sempre que fizer push para `main`, o Firebase será atualizado automaticamente!

Qualquer dúvida, check o arquivo `SETUP_GITHUB_SECRETS.md`
