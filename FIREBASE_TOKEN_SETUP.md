# 🔐 Setup Firebase Token para GitHub Actions

O workflow de deploy para dev usa autenticação via `FIREBASE_TOKEN` environment variable.

## ⚠️ O que precisa ser feito AGORA:

### 1. Gerar o Token Firebase Localmente

Execute em seu terminal (na pasta do projeto):
```bash
firebase login:ci
```

Este comando vai:
- Abrir o navegador para você fazer login no Firebase
- Gerar um token de autenticação longo
- **Copie este token inteiro** - você vai precisar dele

Exemplo de token (NÃO use este, é só exemplo):
```
1//0gGZz... [token muito longo] ...abcdef123456
```

### 2. ⭐ Adicionar o Token como Secret no GitHub

**PASSO CRÍTICO - SEM ISSO NÃO VAI FUNCIONAR!**

1. Vá para: https://github.com/paulojacomelli/avalia-quiz/settings/secrets/actions
2. Clique em **"New repository secret"** (botão verde)
3. **Name**: `FIREBASE_TOKEN` (exatamente assim, maiúsculas)
4. **Secret**: Cole o token gerado no passo anterior
5. Clique em **"Add secret"**

### 3. Verificar se foi adicionado

Depois de adicionar, você deve ver `FIREBASE_TOKEN` na lista de secrets.

### 4. Testar o Deploy

Faça um push qualquer para `dev`:
```bash
git add .
git commit -m "test: trigger deploy workflow"
git push origin dev
```

Vá para: https://github.com/paulojacomelli/avalia-quiz/actions

Veja se a workflow rodou com sucesso!

## 🔍 Debugar se não funcionar

1. **"Failed to authenticate"?**
   - Verifique se o secret foi adicionado corretamente
   - O nome DEVE ser `FIREBASE_TOKEN` (case-sensitive)
   - Regenere o token com `firebase login:ci` novamente

2. **Token expirou?**
   - Firebase tokens têm validade indefinida
   - Mas às vezes precisam ser regenerados
   - Execute `firebase login:ci` de novo

3. **Acessos insuficientes?**
   - Verifique se sua conta Firebase tem permissão para deploy
   - A conta precisa ser "Owner" ou ter role "Firebase Admin"

## 📚 Verificação Local

Para testar se o token funciona:
```bash
firebase deploy --token "SEU_TOKEN_AQUI" --only hosting:avaliaquizdev,hosting:avaliajwquizdev
```

## 🎯 Resumo do que o workflow faz:

1. Faz checkout do código
2. Setup Node.js 22
3. Instala dependências com `npm ci`
4. Aplica ícones canary com o script
5. Setup variáveis de ambiente
6. Faz build dos apps
7. **Faz deploy com o FIREBASE_TOKEN**

## ✅ Checklist

- [ ] Executei `firebase login:ci` localmente
- [ ] Copiei o token gerado
- [ ] Adicionei como secret `FIREBASE_TOKEN` no GitHub
- [ ] Fiz push para `dev`
- [ ] Workflow executou com sucesso

Sem completar estes passos, o deploy não vai funcionar!
