# 🚀 Configuração de Deploy Automático Firebase

Este documento descreve como configurar o deploy automático para Firebase Hosting via GitHub Actions.

## ✅ O que foi criado

- `.github/workflows/deploy-firebase.yml` - Workflow do GitHub Actions
- `.firebaserc` - Configuração do Firebase com os targets

## 📋 Passos para Completar a Configuração

### 1️⃣ Gerar Token de Deploy do Firebase

Execute no seu terminal local (pasta raiz do projeto):

```bash
cd avalia-monorepo
firebase login
firebase projects:list
```

Gere um token permanente:

```bash
firebase login:ci
```

Isso retornará um token como: `1234567890abcdefghijk`

**Salve este token**, você vai precisar dele.

---

### 2️⃣ Gerar Chave de Serviço do Firebase

Acesse [Firebase Console](https://console.firebase.google.com/):

1. Selecione o projeto **avalia-quiz**
2. Clique em **⚙️ Configurações do Projeto** (gear icon)
3. Vá para a aba **Contas de Serviço**
4. Clique em **Gerar Nova Chave Privada**
5. Salve o arquivo JSON (ex: `serviceAccountKey.json`)

---

### 3️⃣ Adicionar Secrets no GitHub

No seu repositório GitHub:

1. Vá para **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret** e adicione:

#### Secret 1: `FIREBASE_DEPLOY_TOKEN`
- **Nome:** `FIREBASE_DEPLOY_TOKEN`
- **Valor:** Cole o token gerado no passo 1️⃣

#### Secret 2: `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Nome:** `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Valor:** Cole o conteúdo COMPLETO do arquivo JSON do passo 2️⃣

---

### 4️⃣ Testar o Workflow

Faça um commit e push para a branch `main`:

```bash
git add .
git commit -m "feat: setup automatic firebase deployment"
git push origin main
```

Vá para a aba **Actions** do seu repositório GitHub e verifique se o workflow está executando.

---

## 📱 O que Será Deployado

Quando você fazer push para `main`, o workflow:

1. ✅ Faz checkout do código
2. ✅ Instala Node.js 18
3. ✅ Instala dependências com `npm ci`
4. ✅ Constrói os apps com `npm run build`
5. ✅ Deploy automático para:
   - **avalia-quiz** → https://avalia-quiz.web.app
   - **avalia-jw-quiz** → https://avalia-jw-quiz.web.app

---

## 🔧 Troubleshooting

### ❌ "Deploy token inválido"
- Verifique se o token foi copiado corretamente
- Gere um novo token: `firebase login:ci`
- Atualize o secret no GitHub

### ❌ "Service account key inválido"
- Abra o JSON em um editor de texto
- Copie TUDO (incluindo as chaves)
- Cole exatamente como está no secret do GitHub

### ❌ Build falha
- Verifique se `npm run build` funciona localmente: `cd avalia-monorepo && npm run build`
- Verifique se não há erros de TypeScript: `npm run typecheck`

### ❌ Deploy falha mas build passou
- Verifique se o arquivo `firebase.json` está correto
- Verifique se os targets em `.firebaserc` existem no Firebase Console
- Verifique se você tem permissão para fazer deploy nesses projetos

---

## 📚 Referências

- [Firebase CLI Docs](https://firebase.google.com/docs/cli)
- [GitHub Actions Firebase Deploy](https://github.com/FirebaseExtended/action-hosting-deploy)
- [Firebase Hosting Configuration](https://firebase.google.com/docs/hosting/configure-hosting)

---

## 🎯 Fluxo Final

```
Push para main
    ↓
GitHub Actions dispara
    ↓
Build do Turbo
    ↓
Deploy no Firebase
    ↓
Apps disponíveis em:
- avalia-quiz.web.app
- avalia-jw-quiz.web.app
```
