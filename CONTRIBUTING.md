# Guia de Contribuição — Avalia Quiz

Obrigado pelo seu interesse em contribuir para o projeto **Avalia Quiz**! Este projeto é mantido sob a licença **GPLv3**.

---

## 🛠️ Como Começar

### 1. Pré-requisitos
- **Node.js**: v22.0.0 ou superior recomendada.
- **npm**: v10.0.0 ou superior.

### 2. Configurando o Ambiente

```bash
# Clone o repositório
git clone https://github.com/paulojacomelli/avalia-quiz.git
cd avalia-monorepo

# Instale as dependências na raiz do monorepo
npm install
```

### 3. Executando Localmente

- **Avalia Quiz (Genérico)**:
  ```bash
  npm run dev:generic
  ```
- **Avalia Quiz Canary**:
  ```bash
  npm run build:dev:generic
  ```

---

## 📐 Diretrizes de Desenvolvimento e Código

### Monorepo
O projeto utiliza **Turborepo**. A estrutura é dividida em:
- `apps/`: Aplicativos finais.
- `packages/`: Pacotes compartilhados (`@avalia/core`, `@avalia/design-system`, `@avalia/game-engine`, `@avalia/services`, etc.).

### Regras de Código:
1. **Tipagem Estrita**: Todo novo código TypeScript deve ser devidamente tipado sem utilizar `any` genérico desnecessário.
2. **Sem Credenciais Hardcoded**: Nunca adicione chaves de API, senhas ou tokens no código-fonte. Utilize arquivos `.env` baseados em `.env.example`.
3. **Isolamento de Marcas**: Mantenha novos recursos focados no software genérico `avalia-quiz`. Ativos proprietários ou marcas registradas não devem ser adicionados sem autorização explícita.
4. **Sem CSS Inline Infundado**: Utilize o sistema de design ou classes utilitárias compartilhadas. CSS inline só é permitido para cálculos dinâmicos runtime.

---

## 🧪 Testes e Validação

Antes de enviar sua contribuição, certifique-se de que os testes e verificações estáticas passam sem erros:

```bash
# Na raiz de avalia-monorepo:
npm run typecheck
npm run lint
npm run test:e2e
```

---

## 📩 Processo de Pull Request (PR)

1. Crie uma branch a partir de `dev`:
   `git checkout -b feature/sua-funcionalidade` ou `fix/nome-da-correcao`
2. Garanta que todas as modificações foram devidamente testadas.
3. Faça commits claros seguindo o padrão Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`).
4. Abra o Pull Request apontando para a branch `dev`.
