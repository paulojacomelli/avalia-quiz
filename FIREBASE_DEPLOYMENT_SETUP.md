# 🔐 Firebase Deployment Setup

Este documento descreve como configurar o Firebase Deploy com GitHub Actions.

## ⚠️ AÇÃO NECESSÁRIA

O workflow de deploy está falhando porque falta a autenticação Firebase. Escolha uma das opções abaixo:

---

## Opção 1: Usar FIREBASE_TOKEN (Simples)

### 1. Gerar Token Local
```bash
firebase login:ci
```

### 2. Copie o Token
O terminal vai exibir um token longo. **Copie inteiro**.

### 3. Adicione como Secret no GitHub

**Link direto**: https://github.com/paulojacomelli/avalia-quiz/settings/secrets/actions

Passos:
1. Clique em **"New repository secret"**
2. Nome: `FIREBASE_TOKEN`
3. Cole o token na Secret
4. Clique em **"Add secret"**

### 4. Teste
```bash
git push origin dev
```

---

## Opção 2: Workload Identity Federation (Recomendado para Produção)

Esta opção é mais segura mas requer configuração no Google Cloud.

### Passo 1: Criar Provider no Google Cloud

```bash
# Configurar variáveis
export PROJECT_ID="seu-project-id"
export PROVIDER_NAME="github-provider"

# Criar Workload Identity Provider
gcloud iam workload-identity-pools create "$PROVIDER_NAME" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub"

# Obter o Pool Resource Name
gcloud iam workload-identity-pools describe "$PROVIDER_NAME" \
  --project="$PROJECT_ID" \
  --location="global" \
  --format='value(name)'
```

### Passo 2: Adicionar GitHub como OIDC Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$PROVIDER_NAME" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Passo 3: Criar Service Account

```bash
gcloud iam service-accounts create github-actions \
  --project="$PROJECT_ID" \
  --display-name="GitHub Actions"

# Obtenha o email
gcloud iam service-accounts list --project="$PROJECT_ID" --filter="displayName:GitHub"
```

### Passo 4: Conceder Permissões

```bash
# Firebase Admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

# Hosting Admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.hostingAdmin"
```

### Passo 5: Configurar Trust Relationship

```bash
# Obtenha o Pool Resource Name (do Passo 1)
WORKLOAD_IDENTITY_PROVIDER="projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/PROVIDER_NAME/providers/github"

gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --principal="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/PROVIDER_NAME/attribute.repository/paulojacomelli/avalia-quiz"
```

### Passo 6: Adicionar Secrets no GitHub

Vá para: https://github.com/paulojacomelli/avalia-quiz/settings/secrets/actions

Adicione:
- `WORKLOAD_IDENTITY_PROVIDER`: O valor obtido acima
- `SERVICE_ACCOUNT_EMAIL`: github-actions@PROJECT_ID.iam.gserviceaccount.com

---

## Status Atual

❌ **Firebase Token não configurado**
- Workflow está falhando
- Deploy não está funcionando
- Precisa adicionar o FIREBASE_TOKEN ou Workload Identity

---

## Referências

- [Firebase CLI Authentication](https://firebase.google.com/docs/cli)
- [GitHub Actions with Workload Identity](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
