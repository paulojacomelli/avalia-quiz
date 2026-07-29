# Avalia - Ecossistema Modular & Agnóstico de Quizzes com IA (v1.9.48)

O **Avalia** é uma plataforma e **Monorepo** agnóstico projetado para construção, execução e gerenciamento de aplicações de quiz interativas impulsionadas por Inteligência Artificial. Gerido via **Turborepo** e **NPM Workspaces**, o ecossistema separa estritamente a infraestrutura, o motor de jogo e o design system de qualquer contexto de domínio ou marca.

---

## 🏗️ Arquitetura Agnóstica & Filosofia de Design

A arquitetura do projeto foi desenhada sob a diretriz de **Zero Contexto de Domínio nos Pacotes**:

1. **Pacotes Base (`packages/`)**: Totalmente neutros e reutilizáveis. Não possuem regras de negócio específicas, termos hardcoded ou preferências visuais fixas.
2. **Aplicativos Consumidores (`apps/`)**: Funcionam como **modelos e implementações de referência** (ex: *Avalia Quiz*, *Avalia JW Quiz*, *Avalia Kids*), injetando suas próprias configurações (`appConfig`), paletas, ícones e dicionários de temas (`themeLabelMap`) nos motores compartilhados.

---

## 🌟 Funcionalidades da Plataforma

- **Motor de IA Multi-Provedor**: Suporte agnóstico e resiliente aos principais modelos do mercado:
  - **Google Gemini** (Gemini 3.6 Flash / Pro e Gemini Live API)
  - **DeepSeek**
  - **Groq** (Inferência de altíssima velocidade)
  - **OpenRouter** (Acesso a centenas de modelos)
- **Chat Contínuo de IA no QuizCard**: Módulo conversacional reutilizável para esclarecimentos sobre perguntas em tempo real.
- **Painel Administrativo Agnóstico (`AdminDashboard`)**:
  - **Gerenciamento de Quizzes**: Leitura e exclusão segura de conteúdos gerados.
  - **Persistência de Estado**: Restauração automática de abas ao atualizar a página (F5).
  - **Telemetria & Tratamento Sanitizado de Erros**: Mapeamento limpo de códigos HTTP (`500`) e logs operacionais.
- **Segurança Integrada**: Proteção contra ataques de força bruta no login via Rate Limiter expansivo por cliente/IP.
- **Acessibilidade Universal**: Integração nativa com o ecossistema VLibras (avatar e glosas).
- **Gerenciamento de Marcas & Assets (Canary)**: Scripts automatizados para injeção de identidades visuais de desenvolvimento e produção.

---

## 🚀 Estrutura do Monorepo

O repositório é estruturado no diretório `avalia-monorepo/`:

- `packages/` — **Infraestrutura e Motores Compartilhados**:
  - `@avalia/core`: Tipagens, contratos e interfaces agnósticas.
  - `@avalia/services`: Integrações com LLMs, Firebase, telemetria e rate limiters.
  - `@avalia/design-system`: Componentes visuais desacoplados (`QuizCard`, `AdminDashboard`, `ReadyCheck`).
  - `@avalia/game-engine`: Motor de regras do quiz e gerenciamento de estado (`useGameLoop`).
- `apps/` — **Aplicações e Modelos de Referência**:
  - `avalia-quiz`: Instância modelo genérica do aplicativo.
  - `avalia-jw-quiz`: Instância modelo especializada via injeção de configuração.
  - `avalia-kids`: Instância modelo voltada para o público infantil.
- `functions/` — Backend serverless e funções de apoio em nuvem.
- `scripts/` — Ferramental de automação de compilação e substituição de ativos.

---

## 🛠️ Instalação e Execução

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) (v22+ recomendada).
* Conta no Firebase e chaves de API dos provedores desejados.

### 2. Instalação

```bash
# Clone o repositório
git clone https://github.com/paulojacomelli/avalia-quiz.git
cd avalia-monorepo

# Instale as dependências na raiz do monorepo
npm install
```

### 3. Executando as Aplicações Modelo

Na raiz do diretório `avalia-monorepo/`:
- `npm run dev:generic`: Inicia a aplicação modelo **Avalia Quiz**.
- `npm run dev:jw`: Inicia a aplicação modelo **Avalia JW Quiz**.
- `npm run dev:kids`: Inicia a aplicação modelo **Avalia Kids**.
- `npm run dev`: Executa todos os modelos simultaneamente via Turborepo.

### 4. Compilação e Deploy

- `npm run build`: Compila todos os pacotes e aplicativos.
- `npm run deploy:generic`: Compila e realiza o deploy do target genérico no Firebase Hosting.
- `npm run deploy:jw`: Compila e realiza o deploy do target específico no Firebase Hosting.

---

## ⚙️ Variáveis de Ambiente

Cada aplicação em `apps/` define suas credenciais em seu respectivo `.env`. Consulte os arquivos `.env.example` para configurar os tokens de IA e conexões do Firebase.

---

## 🗄️ Estrutura do Banco de Dados (Firebase Firestore)

O ecossistema utiliza o **Cloud Firestore** como banco de dados NoSQL. Para o funcionamento correto da autenticação, auditoria, telemetria e biblioteca de quizzes, o banco deve ser inicializado no console do Firebase com a seguinte estrutura de coleções:

### 1. Coleções Principais

- **`auth/access_control`** (ou subdocumento de configuração da coleção `auth`):
  - Contém o código de acesso e as chaves/modelos globais gerenciados pelo painel administrativo:
    - **Chave de Acesso**: `secret_code` (ex: `"1914"`).
    - **Chaves de API dos Provedores (Admin)**: `admin_key_google_ai`, `admin_key_groq`, `admin_key_deepseek`, `admin_key_openrouter`, `admin_key_openai`, `admin_key_claude`.
    - **Modelos Padrão Liberados (Admin)**: `admin_model_google_ai`, `admin_model_groq`, `admin_model_deepseek`, `admin_model_openrouter`, `admin_model_openai`, `admin_model_claude`, `admin_model_live`, `admin_model_tts`, `admin_model_tts_openai`.
  - *Acesso*: Leitura pública (necessário para o login de código de acesso) / Escrita restrita a administradores.

- **`admins/`**:
  - Documentos contendo IDs ou e-mails com privilégios administrativos.
  - *Acesso*: Leitura para e-mails autenticados via Google / Escrita para administradores.

- **`generated_quizzes/`**:
  - Armazena o acervo de quizzes gerados (título, tema, perguntas, opções e áudios).
  - *Campos obrigatórios*: `appName`, `topic`, `subTopic`, `title`, `questions`, `createdAt`, `clientId`, `aiModel`.
  - *Acesso*: Leitura/Criação para usuários autenticados / Exclusão restrita a admins.

- **`telemetry_logs/`**:
  - Registra a telemetria em tempo real: conexões de IA, acessos, execuções do modo auto e logs de erros (`500`).
  - *Campos obrigatórios*: `isoDate`, `eventType`, `appName`, `clientId`, `errorCode`, `errorMessage`.
  - *Acesso*: Criação por clientes autenticados / Leitura e gerenciamento restrito a admins.

---

### 2. Regras de Segurança (`firestore.rules`)

Suba as regras contidas no arquivo `avalia-monorepo/firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isEmailUser() { return isAuthenticated() && request.auth.token.email != null && request.auth.token.email_verified == true; }
    function isAdmin() { return isEmailUser(); }

    match /auth/{document=**} { allow read: if true; allow write: if isAdmin(); }
    match /admins/{adminId} { allow read: if isEmailUser(); allow write: if isAdmin(); }
    match /telemetry_logs/{logId} {
      allow create: if isAuthenticated() && request.resource.data.keys().hasAny(['isoDate', 'eventType', 'appName']);
      allow read, update, delete: if isAdmin();
    }
    match /generated_quizzes/{quizId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}
```

---

### 3. Índices Compostos Necessários

Para consultas otimizadas no `AdminDashboard` e recuperação de quizzes por tema, crie os seguintes índices compostos no Firestore:

| Coleção | Campos Indexados (Ordem) | Função |
| :--- | :--- | :--- |
| `generated_quizzes` | `appName` (Asc), `createdAt` (Desc) | Listagem cronológica de quizzes por app |
| `generated_quizzes` | `appName` (Asc), `topic` (Asc), `createdAt` (Desc) | Filtro por temas no acervo de quizzes |
| `telemetry_logs` | `appName` (Asc), `isoDate` (Desc) | Exibição de logs de telemetria no Admin |
| `telemetry_logs` | `eventType` (Asc), `isoDate` (Desc) | Filtro da aba Erros & Falhas |

---

## 📜 Licença

Este projeto é distribuído sob a licença **GPLv3**.
Você é livre para estudar, modificar e estender a plataforma mantendo a transparência open-source.

---

## 🔖 Release Atual: v1.9.48
- Arquitetura agnóstica completa e modularização de pacotes.
- Suporte a Gemini 3.6 Flash / Pro e Gemini Live API.
- Chat contínuo com a IA por pergunta.
- Exclusão completa de quizzes e persistência de abas administrativas.
- Rate Limiter contra força bruta.
