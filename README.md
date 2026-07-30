# Avalia

> **Plataforma e Monorepo Agnóstico para Construção de Aplicações de Quiz Interativas com Inteligência Artificial.**

`v1.9.49-beta` · Turborepo + NPM Workspaces · Licença GPLv3

---

## 🎯 O que é o Avalia?

O Avalia é uma infraestrutura completa e modular para criação de ecossistemas de quizzes dinâmicos baseados em IA. Em vez de construir um aplicativo isolado para cada projeto ou marca, o Avalia funciona como um **motor reutilizável**: separa rigorosamente a lógica de jogo, a geração por IA e os componentes de interface do contexto de negócio ou identidade visual.

Isso é feito através da diretriz central do projeto — **Zero Contexto de Domínio nos Pacotes**: nenhum pacote compartilhado conhece marcas, regras de negócio restritas ou temas fixos. Quem conhece essas coisas são as aplicações em `apps/`, que injetam essa configuração nos motores compartilhados.

### Principais Casos de Uso
- **Quizzes Genéricos** — testes de conhecimentos gerais com suporte a múltiplos provedores de IA.
- **Aplicações Especializadas** — ambientes de estudo customizados com glossários e regras de domínio específicas.
- **Aplicações Infantis / Educacionais** — interfaces adaptadas e simplificadas para públicos específicos.

Hoje o ecossistema roda três aplicações-modelo: **Avalia Quiz** (genérico), **Avalia JW Quiz** (especializado) e **Avalia Kids** (infantil).

---

## ✨ Funcionalidades

### 🤖 Motor de IA Multi-Provedor
- Suporte agnóstico e resiliente a **Google Gemini** (3.6 Flash/Pro + Gemini Live API), **DeepSeek**, **Groq** e **OpenRouter**.
- Chat contínuo de IA embutido no `QuizCard`, para esclarecimentos em tempo real sobre as perguntas.

### 🎮 Game Engine & Design System
- Motor de jogo desacoplado, com gerenciamento centralizado do ciclo de vida das perguntas via `useGameLoop`.
- Componentes visuais reutilizáveis, prontos para injeção de temas e paletas por marca.
- Acessibilidade universal via integração nativa com o **VLibras** (avatar e glosas).

### 🛠️ Painel Administrativo (`AdminDashboard`)
- Gerenciamento e exclusão segura de quizzes gerados.
- Persistência de estado das abas (sobrevive a um F5).
- Telemetria com tratamento sanitizado de erros (mapeamento limpo de códigos HTTP como `500`).

### 🔒 Segurança
- Rate Limiter por cliente/IP contra ataques de força bruta no login.
- Proteção estrita contra enumeração de administradores por UID/e-mail no Firestore.

### 🎨 Gerenciamento de Marca (Canary)
- Scripts automatizados para injeção de identidade visual (ícones, paletas, assets) por ambiente de desenvolvimento e produção.

---

## 🏗️ Arquitetura do Monorepo

```
avalia-monorepo/
├── packages/                    # 📦 Infraestrutura e motores compartilhados (agnósticos)
│   ├── @avalia/core             # Tipagens, contratos e interfaces base
│   ├── @avalia/services         # Conectores de IA, Firebase, telemetria e rate limiters
│   ├── @avalia/design-system    # Componentes visuais (QuizCard, AdminDashboard, ReadyCheck)
│   └── @avalia/game-engine      # Regras de jogo e gerenciamento de estado (useGameLoop)
│
├── apps/                        # 📱 Aplicações-modelo (injetam marca e configurações)
│   ├── avalia-quiz               # Instância genérica
│   ├── avalia-jw-quiz             # Instância especializada
│   └── avalia-kids                # Instância infantil
│
├── functions/                   # ⚡ Backend serverless
└── scripts/                     # 🛠️ Automação de build e injeção de identidades visuais
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- [Node.js](https://nodejs.org/) v22+
- Conta no Firebase com Firestore habilitado
- Chaves de API dos provedores de IA que for utilizar

### Instalação

```bash
git clone https://github.com/paulojacomelli/avalia-quiz.git
cd avalia-monorepo
npm install
```

### Rodando as aplicações-modelo

| Comando | Ação |
|---|---|
| `npm run dev:generic` | Inicia o **Avalia Quiz** |
| `npm run dev:jw` | Inicia o **Avalia JW Quiz** |
| `npm run dev:kids` | Inicia o **Avalia Kids** |
| `npm run dev` | Inicia todas as apps simultaneamente via Turborepo |

### Build e Deploy

| Comando | Ação |
|---|---|
| `npm run build` | Compila todos os pacotes e aplicativos |
| `npm run deploy:generic` | Compila e publica o target genérico no Firebase Hosting |
| `npm run deploy:jw` | Compila e publica o target JW no Firebase Hosting |

### Variáveis de Ambiente

Cada aplicação em `apps/` define suas próprias credenciais em seu `.env`. Use os arquivos `.env.example` de cada app como referência para tokens de IA e configuração do Firebase.

---

## ⚙️ Configuração de Banco de Dados (Cloud Firestore)

O ecossistema usa o Firestore como banco NoSQL para autenticação, telemetria e acervo de quizzes. As coleções abaixo precisam existir para o funcionamento correto da plataforma.

### Coleções

**`auth/access_control`** — configuração global gerenciada pelo painel admin:
- `secret_code`: chave de acesso (ex: `"1234"`)
- Chaves de API por provedor: `admin_key_google_ai`, `admin_key_groq`, `admin_key_deepseek`, `admin_key_openrouter`, `admin_key_openai`, `admin_key_claude`
- Modelos padrão liberados: `admin_model_google_ai`, `admin_model_groq`, `admin_model_deepseek`, `admin_model_openrouter`, `admin_model_openai`, `admin_model_claude`, `admin_model_live`, `admin_model_tts`, `admin_model_tts_openai`

<details>
<summary><b>📄 Exemplo completo do documento <code>auth/access_control</code></b></summary>

```json
{
  "secret_code": "1234",

  "admin_key_google_ai": "AIzaSy...",
  "admin_model_google_ai": "gemini-3.6-flash",

  "admin_key_groq": "gsk_...",
  "admin_model_groq": "groq/compound",

  "admin_key_openrouter": "sk-or-v1-...",
  "admin_model_openrouter": "openrouter/auto:free",

  "admin_key_deepseek": "sk-...",
  "admin_model_deepseek": "deepseek-reasoner",

  "admin_key_openai": "sk-proj-...",
  "admin_model_openai": "gpt-5.6",

  "admin_key_claude": "sk-ant-...",
  "admin_model_claude": "claude-fable-5",

  "admin_model_live": "gemini-3.1-flash-live-preview",
  "admin_model_tts": "gemini-3.1-flash-tts-preview",
  "admin_model_tts_openai": "gpt-4o-mini-tts"
}
```
</details>

**Modelos válidos por provedor (exemplos):**

| Provedor | Campo | Exemplos de Modelos Válidos |
|---|---|---|
| Google AI | `admin_model_google_ai` | `gemini-3.6-flash`, `gemini-3.5-flash` |
| Groq | `admin_model_groq` | `groq/compound`, `llama-3.3-70b-versatile` |
| OpenRouter | `admin_model_openrouter` | `openrouter/auto:free`, `deepseek/deepseek-v4-flash` |
| DeepSeek | `admin_model_deepseek` | `deepseek-reasoner`, `deepseek-chat` |
| OpenAI | `admin_model_openai` | `gpt-5.6`, `gpt-4o-mini` |

**`admins/`** — IDs de documento = UID ou e-mail do administrador. Campos: `active` (boolean), `email` (string).

**`generated_quizzes/`** — acervo de quizzes gerados. Campos: `appName`, `topic`, `subTopic`, `title`, `questions`, `createdAt`, `clientId`, `aiModel`.

**`telemetry_logs/`** — telemetria em tempo real (conexões de IA, acessos, execuções do modo auto, erros). Campos: `isoDate`, `eventType`, `appName`, `clientId`, `errorCode`, `errorMessage`.

<details>
<summary><b>🛡️ Regras de Segurança (<code>firestore.rules</code>)</b></summary>

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isEmailUser() { return isAuthenticated() && request.auth.token.email != null && request.auth.token.email_verified == true; }
    function isAdmin() { return isEmailUser(); }

    match /auth/{document=**} { allow read: if true; allow write: if isAdmin(); }
    match /admins/{adminId} {
      allow read: if isAuthenticated() && (request.auth.uid == adminId || request.auth.token.email == adminId);
      allow write: if isAdmin();
    }
    match /telemetry_logs/{logId} {
      allow create: if isAuthenticated() && request.resource.data.keys().hasAny(['isoDate', 'eventType', 'appName']);
      allow read:   if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    match /generated_quizzes/{quizId} {
      allow read:          if true;
      allow create:        if isAuthenticated() && request.resource.data.keys().hasAny(['title', 'questions', 'appName']);
      allow update, delete: if isAdmin();
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```
</details>

---

## 📜 Licença

Distribuído sob **GPLv3**. Livre para estudar, modificar e estender, mantendo a transparência open-source.

---

## Release Atual — v1.9.49-beta

- Métrica de usuários criadores e média de quizzes por criador no Bento Grid.
- Proteção estrita contra enumeração de administradores por UID/e-mail no Firestore.
- Deduplicação de telemetria de acessos.
- Workflow automático de publicação para GitHub Pages (`deploy-pages.yml`).
- Suporte a Gemini 3.6 Flash/Pro e Gemini Live API.
- Chat contínuo com IA por pergunta.
- Exclusão completa de quizzes e persistência de abas administrativas.
- Rate Limiter contra força bruta.