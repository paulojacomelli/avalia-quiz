# Avalia Quiz - Ecossistema de Quizzes com IA (v1.7.6)

Bem-vindo ao repositório unificado do **Avalia Quiz**. Este projeto é um **Monorepo** moderno que centraliza múltiplas variantes do aplicativo (Avalia Quiz e Avalia JW Quiz) sob uma arquitetura totalmente agnóstica, escalável e de alto desempenho.

---

## 🌟 Funcionalidades Principais

- **Multi-Provider AI**: Suporte integrado e resiliente para os principais provedores de IA do mercado:
  - **Google Gemini** (Nativo com Gemini 3.6 Flash / Pro e Gemini Live API)
  - **DeepSeek**
  - **Groq** (Inferência Ultra-Rápida)
  - **OpenRouter** (Acesso a centenas de modelos)
- **Chat Contínuo de IA no QuizCard**: Conversação e tirada de dúvidas persistente com a IA sobre a pergunta atual.
- **Painel Administrativo Completo (`AdminDashboard`)**:
  - **Gerenciamento Completo de Quizzes**: Visualização de perguntas e opção de exclusão definitiva de quizzes do banco Firestore.
  - **Persistência de Abas**: O estado das abas navegadas e sub-abas é restaurado automaticamente ao recarregar a página (F5).
  - **Telemetria e Logs Sanitizados**: Mapeamento rigoroso de exceções (`500`) e isolamento de erros reais sem ruídos.
- **Segurança & Proteção (Rate Limiter)**: Proteção ativa contra tentativas de força bruta no Login com cooldowns expansivos e bloqueios IP/Client.
- **Arquitetura 100% Agnóstica (/avalia)**: Zero acoplamento de domínio nos pacotes compartilhados (`@avalia/design-system`, `@avalia/game-engine`, `@avalia/services`). Rótulos e marcas são totalmente injetados via `appConfig` e `themeLabelMap`.
- **Acessibilidade (VLibras)**: Integração nativa com o avatar do VLibras e dicionário de glosas em Libras.

---

## 🚀 Estrutura do Projeto

O projeto está organizado no diretório `avalia-monorepo/`:
- `apps/`: Aplicativos consumidores (`avalia-quiz`, `avalia-jw-quiz`).
- `packages/`: Lógica compartilhada, motores de jogo, design system e serviços de IA:
  - `@avalia/core`: Tipagens, interfaces e utilitários agnósticos.
  - `@avalia/services`: Firebase, integração com LLMs, telemetria e rate limiters.
  - `@avalia/design-system`: Componentes reutilizáveis sem contexto de domínio (`QuizCard`, `AdminDashboard`, `ReadyCheck`).
  - `@avalia/game-engine`: Engine principal do jogo, hooks de estado (`useGameLoop`) e controle de partidas.
- `scripts/`: Automação de assets e manutenção.

---

## 🛠️ Instalação e Desenvolvimento

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) (v22+ recomendada).
* Conta no Firebase e chaves de API dos provedores desejados.

### 2. Configuração

```bash
# Clone o repositório
git clone https://github.com/paulojacomelli/avalia-quiz.git
cd avalia-monorepo

# Instale as dependências na raiz do monorepo
npm install
```

### 3. Execução

Utilize os comandos na raiz de `avalia-monorepo/`:
- `npm run dev:generic`: Inicia o **Avalia Quiz**.
- `npm run dev:jw`: Inicia o **Avalia JW Quiz**.

---

## ⚙️ Variáveis de Ambiente

Cada app em `apps/` possui seu próprio arquivo `.env`. Configure-os seguindo os modelos fornecidos para habilitar os provedores de IA e a integração com Firebase.

---

## 📜 Licença

Este projeto é distribuído sob a licença **GPLv3**.
Você é livre para usar, estudar e modificar o software, mantendo-o open source.

---

## 🔖 Release Atual: v1.7.6
- Chat contínuo com a IA por pergunta.
- Exclusão completa de quizzes no Admin Dashboard.
- Persistência no recarregamento de abas administrativas.
- Rate Limiter de login contra força bruta.
- Agnosticismo total do monorepo e sanitização dos códigos de erro (`500`).
