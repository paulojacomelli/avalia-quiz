
# Avalia Quiz - Ecossistema de Quizzes com IA (v1.4.6)

Bem-vindo ao repositório unificado do **Avalia Quiz**. Este projeto evoluiu para um **Monorepo** moderno, centralizando múltiplas variantes do aplicativo (Avalia Quiz e Avalia JW Quiz) sob uma única arquitetura robusta e escalável.

---

## 🌟 Funcionalidades Principais

-   **Multi-Provider AI**: Suporte integrado para os principais provedores de IA do mercado:
    *   **Google Gemini** (Nativo)
    *   **DeepSeek**
    *   **Groq** (Inferência Ultra-Rápida)
    *   **OpenRouter** (Acesso a centenas de modelos)
-   **Arquitetura Monorepo**: Gerido via **Turborepo** para builds rápidos e pacotes compartilhados (`@avalia/core`, `@avalia/design-system`, etc).
-   **PWA Premium**: Aplicativo instalável com suporte offline, ícones otimizados para dispositivos móveis (anti-masking) e experiência de usuário fluida.
-   **Acessibilidade (VLibras)**: Integração nativa com VLibras para garantir inclusão.
-   **Modo Canary**: Versões de desenvolvimento automatizadas com identidade visual e nomenclatura distintas (**Avalia Quiz Canary**).

---

## 🚀 Estrutura do Projeto

O projeto está organizado no diretório `avalia-monorepo/`:
-   `apps/`: Aplicativos finais (`avalia-quiz`, `avalia-jw-quiz`).
-   `packages/`: Lógica compartilhada, componentes de interface e serviços de IA.
-   `scripts/`: Automação de assets e manutenção.

---

## 🛠️ Instalação e Desenvolvimento

### 1. Pré-requisitos
*   [Node.js](https://nodejs.org/) (v22+ recomendada).
*   Conta no Firebase e chaves de API dos provedores desejados.

### 2. Configuração

```bash
# Clone o repositório
git clone https://github.com/paulojacomelli/avalia-quiz.git
cd avalia-quiz/avalia-monorepo

# Instale as dependências na raiz do monorepo
npm install
```

### 3. Execução

Utilize os comandos na raiz de `avalia-monorepo/`:
-   `npm run dev:generic`: Inicia o **Avalia Quiz**.
-   `npm run dev:jw`: Inicia o **Avalia JW Quiz**.

---

## ⚙️ Variáveis de Ambiente

Cada app em `apps/` possui seu próprio arquivo `.env`. Configure-os seguindo os modelos fornecidos para habilitar os provedores de IA e a integração com Firebase.

---

## 📜 Licença

Este projeto é distribuído sob a licença **GPLv3**.
Você é livre para usar, estudar e modificar o software, mantendo-o open source.

---

## 🔖 Release Atual: v1.4.6
- Suporte a DeepSeek, Groq e OpenRouter.
- Nomenclatura dinâmica Canary.
- Correção de ícones PWA para Android.
- Limpeza e otimização do workspace.
