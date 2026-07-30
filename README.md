# Avalia

> **Plataforma e Monorepo Agnóstico para Construção de Aplicações de Quiz Interativas com Inteligência Artificial.**

`v1.9.49-beta` · Turborepo + NPM Workspaces · Licença GPLv3

---

## 🎯 O que é o Avalia?

O Avalia é uma infraestrutura completa e modular para criação de ecossistemas de quizzes dinâmicos. Em vez de construir um aplicativo isolado para cada projeto ou marca, o Avalia funciona como um **motor reutilizável**: separa rigorosamente a lógica de jogo, a geração por IA e os componentes de interface do contexto de negócio ou identidade visual.

O Avalia não é um quiz convencional com recursos de IA adicionados — é uma plataforma **nativamente impulsionada por IA em todas as pontas da jornada do usuário**. Da criação do quiz à interação durante a partida, cada camada da experiência é mediada por modelos cognitivos.

Isso é sustentado pela diretriz central do projeto — **Zero Contexto de Domínio nos Pacotes**: nenhum pacote compartilhado conhece marcas, regras de negócio restritas ou temas fixos. Quem fornece esse contexto são as aplicações em `apps/`, que injetam suas configurações nos motores compartilhados.

### Principais Casos de Uso
- **Quizzes Genéricos** — testes de conhecimentos gerais com geração e suporte por IA.
- **Aplicações Especializadas** — ambientes de estudo customizados com glossários e regras de domínio específicas.
- **Aplicações Infantis / Educacionais** — interfaces adaptadas e simplificadas para públicos específicos.

Hoje o ecossistema roda três aplicações-modelo: **Avalia Quiz** (genérico), **Avalia JW Quiz** (especializado) e **Avalia Kids** (infantil).

---

## ✨ Funcionalidades

### 🧠 A IA como Espinha Dorsal da Experiência
- **Geração Dinâmica de Conteúdo** — criação instantânea de títulos, perguntas, alternativas, gabaritos e referências a partir de qualquer tema ou prompt.
- **Dicas & Explicações Contextuais** — orientações pedagógicas geradas sob demanda para cada questão.
- **Chat Contextual no `QuizCard`** — assistente conversacional integrado diretamente no card da pergunta para o jogador tirar dúvidas em tempo real.
- **Modo Resposta Aberta (Dissertativo)** — avaliação inteligente de respostas digitadas pelo usuário, analisando semântica e acurácia sem exigir múltipla escolha.
- **Narração e Voz Sintética (TTS)** — síntese de fala gerada por IA para acessibilidade auditiva e imersão.
- **Tradução Gramatical para Libras** — geração de texto em estrutura de glosa para renderização nativa no avatar 3D do VLibras.

> **Motor Multi-Provedor Agnóstico**: Todas as camadas de IA funcionam de forma transparente sobre qualquer provedor configurado (**Google Gemini**, **DeepSeek**, **Groq** ou **OpenRouter**).

### 🎮 Game Engine & Design System
- Motor de jogo desacoplado com gerenciamento centralizado do ciclo de vida das perguntas via `useGameLoop`.
- Componentes visuais reutilizáveis, prontos para injeção de temas e paletas por marca.
- Suporte a acessibilidade universal via integração nativa com o **VLibras**.

### 🛠️ Painel Administrativo (`AdminDashboard`)
- Gerenciamento e exclusão segura de quizzes gerados.
- Persistência de estado das abas (sobrevive a um F5).
- Telemetria operacional com tratamento sanitizado de erros (mapeamento de códigos HTTP como `500`).

### 🔒 Segurança & Proteção de Dados
- **Proteção contra Força Bruta**: Rate Limiter expansivo por cliente/IP no fluxo de autenticação.
- **Privacidade Operacional**: Proteção estrita contra enumeração de administradores por UID/e-mail no Firestore.
- **Controle de Acesso Fino**: Regras de segurança nativas do Cloud Firestore (`firestore.rules`) para restrição de escrita, auditoria e gerenciamento de quizzes.

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

**`auth/config`** — documento de configuração global e autenticação:
- `secret_code`: PIN de autenticação do sistema (ex: `"1234"`)
- `admin_model_*`: identificadores de configuração dos modelos padrão liberados
- `admin_key_*`: ⛔ **NÃO EXISTE NO FIRESTORE** (gerenciadas exclusivamente pelo backend via Google Secret Manager)

> 🛡️ **Segurança de Credenciais**: O PIN oficial (`secret_code`) e as chaves de API privadas dos provedores (`admin_key_*`) são mantidos 100% privados no servidor. O código de acesso digitado pelo usuário é enviado exclusivamente à Cloud Function serverless (`generateQuizProxy`) via HTTPS para validação server-side e inferência protegida contra força bruta.

<details>
<summary><b>📄 Exemplo completo do documento <code>auth/config</code></b></summary>

```json
{
  "secret_code": "1234",
  "admin_model_google_ai": "gemini-3.6-flash",
  "admin_model_groq": "groq/compound",
  "admin_model_openrouter": "openrouter/auto:free",
  "admin_model_deepseek": "deepseek-reasoner",
  "admin_model_openai": "gpt-5.6",
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