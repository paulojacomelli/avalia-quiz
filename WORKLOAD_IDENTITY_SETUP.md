# 🔐 Setup Workload Identity Federation (Seguro Permanente)

Este é o método recomendado pelo Google/Firebase. Sem chaves armazenadas!

## 📋 Passo 1: Ativar a API necessária

1. Abra [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o projeto **avalia-jw-quiz**
3. Vá para **APIs & Services** → **Library**
4. Procure por `Cloud Resource Manager API`
5. Clique em **Enable**

Espere 1-2 minutos para ativar.

---

## 📋 Passo 2: Criar Workload Identity Pool

1. Vá para **APIs & Services** → **Credentials**
2. Clique em **Create Credentials** → **Workload Identity Provider**
3. Selecione **OpenID Connect (OIDC)**
4. Preencha:
   - **Provider name:** `github`
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github`

(Encontre seu Project Number em **Project Settings**)

5. Clique em **Create**

---

## 📋 Passo 3: Criar Service Account

1. Vá para **IAM & Admin** → **Service Accounts**
2. Clique em **Create Service Account**
3. Preencha:
   - **Service account name:** `github-actions`
   - **Service account ID:** `github-actions`
4. Clique em **Create and Continue**
5. Atribua a role: **Editor** (ou mais restritiva: **Firebase Admin**)
6. Clique em **Continue** → **Done**

---

## 📋 Passo 4: Configurar Workload Identity Binding

1. Vá para **IAM & Admin** → **Workload Identity Pools**
2. Clique em **github-pool** (criada no Passo 2)
3. Clique em **Providers** → **github**
4. Clique em **Grant Access**
5. Em **Service account selection**, selecione `github-actions@avalia-jw-quiz.iam.gserviceaccount.com`
6. Configure o mapeamento:
   - **Attribute Condition:** 
   ```
   assertion.repository_owner == 'paulojacomelli'
   ```
7. Clique em **Save**

---

## 📋 Passo 5: Obter Workload Identity Provider Resource Name

1. Vá para **Workload Identity Pools** → **github-pool** → **Providers** → **github**
2. Copie o **Resource Name** (começa com `projects/...`)

Vai parecer assim:
```
projects/524494397074/locations/global/workloadIdentityPools/github-pool/providers/github
```

---

## 🔐 Passo 6: Adicionar Secrets no GitHub

Você vai precisar de 2 coisas:

1. **Workload Identity Provider Resource Name** (copiou no Passo 5)
2. **Service Account Email:** `github-actions@avalia-jw-quiz.iam.gserviceaccount.com`

No GitHub:
1. **Settings** → **Secrets and variables** → **Actions**
2. Adicione 2 novos secrets:

### Secret 1: `WORKLOAD_IDENTITY_PROVIDER`
Valor: (Resource Name do Passo 5)

### Secret 2: `SERVICE_ACCOUNT_EMAIL`
Valor: `github-actions@avalia-jw-quiz.iam.gserviceaccount.com`

---

## ✅ Pronto!

Os workflows agora vão usar Workload Identity (sem chaves armazenadas) 🎉

Depois que você fizer tudo isso, me avisa que eu atualizo os workflows!
