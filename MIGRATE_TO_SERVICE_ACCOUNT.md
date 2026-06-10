# 🔄 Migrar de Token para Service Account

O Firebase está deprecando autenticação com token. Vamos usar Service Account (mais seguro).

## 📋 Como Gerar Service Account

1. Abra [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **avalia-jw-quiz**
3. Clique em **⚙️ Project Settings** (gear icon no canto inferior esquerdo)
4. Vá para a aba **Service Accounts**
5. Clique em **Generate New Private Key**
6. Salve o arquivo JSON (ex: `serviceAccountKey.json`)

## 🔐 Adicionar no GitHub

1. Abra seu repositório no GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
5. **Value:** Abra o arquivo JSON e copie TODO o conteúdo
6. Clique em **Add secret**

## ✅ Pronto!

Os workflows agora usarão Service Account em vez de token. Muito mais seguro! 🎉

**IMPORTANTE:** Você AINDA pode manter o `FIREBASE_DEPLOY_TOKEN` no GitHub (não prejudica nada), mas ele não será mais usado.
