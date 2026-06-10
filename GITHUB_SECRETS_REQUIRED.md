# 🔐 Secrets Necessários no GitHub

## 📋 Lista de Secrets a Adicionar

No repositório GitHub, vá para:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Adicione os seguintes secrets:

---

### 1. `FIREBASE_DEPLOY_TOKEN`
**Valor:** Cole o token gerado por `firebase login:ci` (você já gerou)

---

### 2-8. Variáveis do Firebase

Copie as variáveis do seu arquivo `.env` local:

| Nome da Secret | Valor do .env |
|---|---|
| `VITE_FIREBASE_API_KEY` | Cole o valor de `VITE_FIREBASE_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Cole o valor de `VITE_FIREBASE_AUTH_DOMAIN` |
| `VITE_FIREBASE_PROJECT_ID` | Cole o valor de `VITE_FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cole o valor de `VITE_FIREBASE_STORAGE_BUCKET` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cole o valor de `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_FIREBASE_APP_ID` | Cole o valor de `VITE_FIREBASE_APP_ID` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Cole o valor de `VITE_FIREBASE_MEASUREMENT_ID` |

---

## ✅ Passo a Passo

1. Abra seu repositório no GitHub: https://github.com/paulojacomelli/avalia-quiz

2. Clique em **Settings** (canto superior direito)

3. No menu esquerdo, clique em **Secrets and variables** → **Actions**

4. Clique em **New repository secret**

5. Para cada secret acima:
   - Copie o **Nome** (ex: `FIREBASE_DEPLOY_TOKEN`)
   - Copie o **Valor** (do seu `.env` local ou do token Firebase)
   - Clique em **Add secret**

6. Repita para todos os 8 secrets

---

## 📊 Total de Secrets

- **1x** Token Firebase (`FIREBASE_DEPLOY_TOKEN`)
- **7x** Variáveis do Firebase (`VITE_FIREBASE_*`)

**Total: 8 secrets**

---

## 📁 Copiar Valores do `.env`

Abra estes arquivos locais para copiar os valores:

- `avalia-monorepo/apps/avalia-quiz/.env`
- `avalia-monorepo/apps/avalia-jw-quiz/.env`

Ambos têm as mesmas credenciais Firebase.

---

## ✨ Depois de Adicionar Todos os Secrets

Os workflows rodará com as credenciais corretas sempre que você fizer push! 🚀

---

## 🛡️ Segurança

Esses valores estão seguros no GitHub:
- Não aparecem nos logs
- Só são injetados durante o build
- Cada workflow tem acesso apenas aos secrets necessários

Pronto! ✅

