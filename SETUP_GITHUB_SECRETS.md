# 🔐 Configurar Secrets do GitHub para Deploy Automático

## Opção 1: Usar Token de CI (Recomendado - Simples)

Execute no seu terminal:

```bash
firebase login:ci
```

1. Uma URL será exibida
2. Abra a URL no navegador
3. Autorize o Firebase
4. Copie o token exibido

Este token é usado para autenticação no GitHub Actions.

**Salve este token para a próxima etapa.**

---

## Opção 2: Usar Service Account Key (Alternativa)

Se a Opção 1 não funcionar:

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **avalia-jw-quiz**
3. Clique em **⚙️ Project Settings** (gear icon)
4. Vá para a aba **Service Accounts**
5. Clique em **Generate New Private Key**
6. Salve o arquivo JSON

---

## Adicionar Secrets no GitHub

### Passo 1: Abra seu repositório no GitHub

### Passo 2: Vá para Settings → Secrets and variables → Actions

### Passo 3: Clique em "New repository secret"

---

### 📌 Secret 1: `FIREBASE_DEPLOY_TOKEN` (Opção 1)

Se você seguiu a **Opção 1**:

1. **Name:** `FIREBASE_DEPLOY_TOKEN`
2. **Value:** Cole o token gerado por `firebase login:ci`

Clique em **Add secret**

---

### 📌 Secret 2: `FIREBASE_SERVICE_ACCOUNT_KEY` (Opção 2)

Se você seguiu a **Opção 2**:

1. **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
2. **Value:** Abra o arquivo JSON baixado e copie TUDO (todo o conteúdo)

Clique em **Add secret**

---

## ✅ Verificar se está funcionando

1. Faça um commit e push para a branch `main`
2. Vá para a aba **Actions** do repositório
3. Você deve ver o workflow `Deploy to Firebase Hosting` executando
4. Verifique se o deploy foi bem-sucedido

---

## 🚀 Agora você pode fazer push para main e o deploy será automático!

```bash
git add .
git commit -m "Setup Firebase deployment"
git push origin main
```

Os apps serão deployados em:
- https://avalia-quiz.web.app
- https://avalia-jw-quiz.web.app
