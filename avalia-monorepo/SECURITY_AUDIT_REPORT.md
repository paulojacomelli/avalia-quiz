# 🔒 Relatório de Auditoria de Segurança - Avalia Monorepo

**Data da Auditoria:** 30 de Julho de 2026  
**Avaliador:** Kiro Security Audit  
**Versão do Projeto:** 1.0.0

---

## 📊 Resumo Executivo

| Categoria | Status | Prioridade |
|-----------|--------|------------|
| Credenciais Expostas | 🔴 CRÍTICO | P0 |
| Controle de Versão | 🔴 CRÍTICO | P0 |
| Vulnerabilidades de Dependências | 🟠 ALTO | P1 |
| Configurações de Segurança | 🟡 MÉDIO | P2 |
| Práticas de Código | 🟢 BOM | P3 |

**Score Geral: 45/100** ⚠️ **REQUER AÇÃO IMEDIATA**

---

## 🔴 PROBLEMAS CRÍTICOS (P0)

### 1. ❌ Arquivo .gitignore Ausente

**Severidade:** CRÍTICA  
**Risco:** Exposição de credenciais, chaves de API e dados sensíveis no repositório

**Descoberta:**
- Não existe arquivo `.gitignore` na raiz do projeto
- Arquivos `.env` com credenciais Firebase estão expostos:
  - `apps/avalia-jw-quiz/.env`
  - `apps/avalia-kids-quiz/.env`

**Credenciais Expostas:**
```env
VITE_FIREBASE_API_KEY="AIzaSyCPAeHhZc9NtO5o4gfKP9K-hLHvDVBwm8s"
VITE_FIREBASE_AUTH_DOMAIN="avalia-jw-quiz.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="avalia-jw-quiz"
VITE_FIREBASE_STORAGE_BUCKET="avalia-jw-quiz.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="524494397074"
VITE_FIREBASE_APP_ID="1:524494397074:web:023f5bc417595aebf5904b"
VITE_FIREBASE_MEASUREMENT_ID="G-MBET4030MP"
```

**Impacto:**
- Se este repositório estiver no GitHub/GitLab, suas credenciais Firebase estão PÚBLICAS
- Qualquer pessoa pode acessar seu Firestore, Storage e Analytics
- Risco de abuso de quota e custos não autorizados
- Possível violação de dados dos usuários

**Ação Requerida:** IMEDIATA

---

### 2. ❌ Chaves Firebase em Arquivos .env Commitados

**Severidade:** CRÍTICA  
**Risco:** Acesso não autorizado aos serviços Firebase

**Problema:**
- Arquivos `.env` com credenciais reais estão presentes no repositório
- Ambos os apps (`jw-quiz` e `kids-quiz`) compartilham as mesmas credenciais
- Sem controle de versão adequado (.gitignore), esses arquivos podem ter sido commitados

**Contexto Firebase:**
As chaves de API do Firebase para web são consideradas "públicas" pela Google (ficam expostas no bundle JavaScript), mas devem ser protegidas por:
1. **Firebase Security Rules** - VERIFIQUE se suas rules estão restritivas
2. **App Check** - Para prevenir abuso de bots
3. **Domínios autorizados** - Para prevenir uso em sites não autorizados

**Ação Requerida:**
1. Verificar se o repositório já foi commitado com esses arquivos
2. Se sim, considerar rotação das chaves Firebase
3. Implementar Firebase Security Rules restritivas
4. Configurar Firebase App Check

---

## 🟠 PROBLEMAS DE ALTA PRIORIDADE (P1)

### 3. ⚠️ Vulnerabilidades em Dependências NPM

**Severidade:** ALTA  
**Risco:** Exploits conhecidos em bibliotecas de terceiros

**Descoberta:**
```
Total de vulnerabilidades: 19
- Info: 0
- Low: 2
- Moderate: 12
- High: 5
- Critical: 0
```

**Impacto:**
- 5 vulnerabilidades de severidade ALTA podem ser exploradas
- 12 vulnerabilidades moderadas representam riscos secundários
- Dependências desatualizadas podem ter patches de segurança disponíveis

**Ação Requerida:**
```bash
npm audit fix
npm audit fix --force  # Se necessário (pode quebrar compatibilidade)
```

---

### 4. ⚠️ Ausência de Validação de Entrada em API Proxy

**Severidade:** ALTA  
**Risco:** Injeção de código, SSRF (Server-Side Request Forgery)

**Código em Risco:**
```typescript
// packages/services/src/geminiService.ts:747-760
const isDirectApiKey = apiKey.startsWith("AIza") || apiKey.startsWith("sk-") || apiKey.startsWith("gsk_");

if (!isDirectApiKey) {
  const functionUrl = "https://us-central1-avalia-jw-quiz.cloudfunctions.net/generateQuizProxy";
  const resp = await fetch(functionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secretCode: apiKey,  // ⚠️ Sem validação ou sanitização
      provider: effectiveProvider,
      model,
      theme: config.mode,
      subTopic: config.subTopic || config.specificTopic
    })
  });
}
```

**Problemas:**
- Parâmetro `apiKey` (renomeado para `secretCode`) é enviado sem validação
- Parâmetro `model` pode ser manipulado para injeção de comandos
- Sem timeout configurado para o fetch
- Sem rate limiting aparente

**Recomendação:**
```typescript
// Adicionar validação
if (!apiKey || apiKey.length < 10 || apiKey.length > 100) {
  throw new Error("API key inválida");
}

// Adicionar timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

const resp = await fetch(functionUrl, {
  method: "POST",
  signal: controller.signal,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secretCode: apiKey.trim(),
    provider: effectiveProvider,
    model: model.trim(),
    theme: config.mode,
    subTopic: config.subTopic || config.specificTopic
  })
});

clearTimeout(timeout);
```

---

### 5. ⚠️ Falta de Proteção CSRF em Firebase Functions

**Severidade:** ALTA  
**Risco:** Cross-Site Request Forgery

**Contexto:**
- O proxy Cloud Function não parece ter verificação de origem (CORS)
- Sem verificação de tokens CSRF ou nonce
- Qualquer site pode fazer requisições para sua Cloud Function

**Impacto:**
- Abuso de quota da API de IA
- Custos não autorizados
- DDoS via proxy

**Recomendação:**
- Implementar Firebase App Check
- Adicionar verificação de origem (referer/origin)
- Implementar rate limiting por IP/clientId
- Considerar uso de reCAPTCHA para requisições anônimas

---

## 🟡 PROBLEMAS DE PRIORIDADE MÉDIA (P2)

### 6. ⚠️ Armazenamento de Client ID no localStorage

**Severidade:** MÉDIA  
**Risco:** Session fixation, tracking persistente

**Código:**
```typescript
// packages/services/src/firebase.ts:60-75
export const getClientId = (): string => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'ssr-client';
    }
    try {
        let clientId = localStorage.getItem('avalia_client_id');
        if (!clientId) {
            clientId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('avalia_client_id', clientId);
        }
        return clientId;
    } catch {
        return 'unknown-client';
    }
};
```

**Problemas:**
- localStorage persiste mesmo após logout
- Pode ser usado para tracking entre sessões
- Não há opção de opt-out para usuários preocupados com privacidade

**Recomendação:**
- Adicionar política de privacidade clara
- Permitir que usuários desabilitem tracking
- Considerar sessionStorage para dados menos persistentes
- Adicionar consentimento LGPD/GDPR

---

### 7. ⚠️ Falta de Sanitização de Glosas VLibras

**Severidade:** MÉDIA  
**Risco:** Possível injeção via tokens maliciosos

**Código:**
```typescript
// packages/core/src/vlibras-dictionary-validator.ts
// Tokens são convertidos para uppercase mas não há validação de caracteres especiais
```

**Recomendação:**
```typescript
export function sanitizeGlosaStrict(glosa: string): string {
  if (!glosa || typeof glosa !== 'string') return '';
  
  return glosa
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limita tamanho
}
```

---

### 8. ⚠️ Ausência de Content Security Policy (CSP)

**Severidade:** MÉDIA  
**Risco:** XSS (Cross-Site Scripting), injeção de scripts maliciosos

**Descoberta:**
- Não há configuração de CSP no `index.html` ou headers HTTP
- Sem proteção contra inline scripts maliciosos
- VLibras carrega scripts externos (`vlibras-player.js`)

**Recomendação:**
Adicionar ao `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vlibras.gov.br https://*.googleapis.com https://*.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net https://dicionario2.vlibras.gov.br;
  font-src 'self' data:;
  frame-src 'none';
">
```

---

### 9. ⚠️ Configuração de Permissões do Firebase

**Severidade:** MÉDIA  
**Risco:** Acesso não autorizado ao Firestore/Storage

**Ação Requerida:**
Verificar as Firebase Security Rules em `firestore.rules`:

```javascript
// RUIM (exemplo do que NÃO fazer)
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ INSEGURO!
    }
  }
}

// BOM (exemplo recomendado)
service cloud.firestore {
  match /databases/{database}/documents {
    // Quizzes - Leitura pública, escrita apenas autenticada
    match /generated_quizzes/{quiz} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.anonymousUid || 
         get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.active == true);
    }
    
    // Telemetria - Escrita apenas autenticada, leitura apenas admin
    match /telemetry_logs/{log} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.active == true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Admins - Apenas leitura para verificação de permissões
    match /admins/{admin} {
      allow read: if request.auth != null;
      allow write: if false; // Gerenciar via console
    }
  }
}
```

---

## 🟢 PONTOS POSITIVOS

### ✅ Boas Práticas Implementadas

1. **Sem uso de `eval()`** - Código não utiliza `eval()`, `Function()` ou similares
2. **Sem `dangerouslySetInnerHTML`** - Componentes React não usam HTML inseguro
3. **Sem credenciais hardcoded** - Chaves de API são carregadas via variáveis de ambiente
4. **TypeScript** - Tipagem estática reduz erros em tempo de execução
5. **Firebase Auth** - Autenticação delegada ao Firebase (segura)
6. **HTTPS obrigatório** - Firebase Hosting força HTTPS
7. **Sanitização parcial** - Função `cleanUndefined()` previne dados inválidos no Firestore
8. **Rate Limiting básico** - Arquivo `rateLimiter.ts` implementa proteção contra abuso

---

## 📋 PLANO DE AÇÃO RECOMENDADO

### Fase 1: URGENTE (Fazer HOJE)

- [ ] **Criar arquivo `.gitignore` completo**
- [ ] **Verificar se `.env` foi commitado no Git**
- [ ] **Se sim, rotacionar chaves Firebase**
- [ ] **Implementar Firebase Security Rules restritivas**
- [ ] **Adicionar `.env.example` com valores placeholder**

### Fase 2: ALTA PRIORIDADE (Esta semana)

- [ ] **Executar `npm audit fix` para corrigir vulnerabilidades**
- [ ] **Configurar Firebase App Check**
- [ ] **Adicionar rate limiting na Cloud Function**
- [ ] **Implementar validação de entrada no proxy**
- [ ] **Adicionar timeout em requisições HTTP**

### Fase 3: MÉDIA PRIORIDADE (Próximas 2 semanas)

- [ ] **Implementar Content Security Policy (CSP)**
- [ ] **Adicionar política de privacidade**
- [ ] **Implementar consentimento LGPD/GDPR**
- [ ] **Melhorar sanitização de glosas VLibras**
- [ ] **Adicionar logs de auditoria de segurança**

### Fase 4: MELHORIAS CONTÍNUAS

- [ ] **Configurar dependabot para alertas de segurança**
- [ ] **Implementar testes de segurança automatizados**
- [ ] **Realizar penetration testing**
- [ ] **Configurar alertas de Firebase para uso anômalo**
- [ ] **Implementar rotação automática de secrets**

---

## 📝 ARQUIVOS ESPECÍFICOS PARA CRIAR

Veja os próximos passos no final deste relatório para criação automática de:
1. `.gitignore` completo
2. `.env.example` com valores seguros
3. `SECURITY.md` com política de segurança
4. `firestore.rules` exemplo seguro

---

## 🔗 REFERÊNCIAS

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 📞 PRÓXIMOS PASSOS

Para corrigir os problemas críticos imediatamente, posso criar os arquivos necessários. Deseja que eu:

1. ✅ Crie o arquivo `.gitignore` completo?
2. ✅ Crie `.env.example` com valores placeholder?
3. ✅ Crie exemplo de `firestore.rules` seguro?
4. ✅ Crie `SECURITY.md` com política de divulgação responsável?

**Responda com "sim" para criar todos os arquivos de segurança.**

---

*Este relatório foi gerado por análise automatizada. Recomenda-se revisão manual por especialista em segurança para ambientes de produção.*
