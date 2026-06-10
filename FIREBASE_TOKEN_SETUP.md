# 🔐 Setup Firebase Token para GitHub Actions

O workflow de deploy para dev agora usa autenticação por token em vez de arquivo JSON.

## ⚠️ O que precisa ser feito:

### 1. Gerar o Token Firebase Localmente

Execute o comando:
```bash
firebase login:ci
```

Este comando vai:
- Abrir o navegador para você fazer login no Firebase
- Gerar um token de autenticação
- Exibir um token longo (salve este token!)

### 2. Adicionar o Token como Secret no GitHub

1. Vá para seu repositório no GitHub
2. Acesse **Settings → Secrets and variables → Actions**
3. Clique em **"New repository secret"**
4. Nome: `FIREBASE_TOKEN`
5. Valor: Cole o token gerado no passo anterior
6. Clique em **"Add secret"**

### 3. Verificar se funciona

Faça um push para a branch `dev`:
```bash
git add .
git commit -m "test: trigger deploy"
git push origin dev
```

Vá para **Actions** no GitHub e veja se o workflow executa com sucesso!

## 🔑 O que é o FIREBASE_TOKEN?

- É um token de autenticação pessoal para o Firebase
- Permite que o GitHub Actions acesse sua conta Firebase sem arquivo JSON
- Tem validade indefinida (mas pode ser revogado a qualquer momento)
- Está armazenado de forma segura no GitHub (encriptado)

## ⚡ Verificação Rápida

Para verificar se o token está funcionando localmente:
```bash
firebase deploy --token "SEU_TOKEN_AQUI" --only hosting:avaliaquizdev,hosting:avaliajwquizdev --non-interactive
```

## 🚨 Se algo der errado

1. **Token expirou?** Gere um novo com `firebase login:ci`
2. **Acessos insuficientes?** Verifique as permissões do seu usuário Firebase
3. **Projeto errado?** Verifique se o projeto está correto no `firebase.json` com `.firebaserc`

## 📚 Referências

- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
