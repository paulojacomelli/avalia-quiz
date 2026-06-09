# Avalia Monorepo

Este é o repositório unificado para as variantes do sistema Avalia (Avalia Quiz e Avalia JW Quiz). A arquitetura é gerida via **Turborepo** e **NPM/Yarn Workspaces**.

## Regras Arquiteturais Absolutas

Para mantermos a integridade e escalabilidade do projeto sem criar dívida técnica silenciosa, a seguinte regra matriz deve ser respeitada inegociavelmente no Code Review:

> **Zero Contexto de Domínio nos Pacotes.**
> Nenhum arquivo dentro de `packages/` tem permissão de conhecer a identidade de quem o consome. É estritamente proibido o uso de verificações como `if (APP === 'JW_QUIZ')` ou `if (theme === 'jw')` nos pacotes base. Se um pacote precisa se comportar diferente, o aplicativo consumidor (`apps/*`) deve injetar essa diferença via propriedades (Props), Injeção de Dependências (Tokens/Providers) ou Hooks.

Adicionalmente, note o contrato de `ILlmClient` em `@avalia/llm-client`:
O método opcional `generateStream` **deve** ser implementado antes de qualquer solicitação ou feature de tempo real ser inserida nas views, garantindo o suporte oficial por interface.

## Fases de Migração (Status Atual)

- [x] Fase 0: Inicialização do Monorepo, Tooling e Contratos.
- [ ] Fase 1: Isolamento de Acessibilidade (`packages/accessibility/vlibras-core`)
- [ ] Fase 2: Extração do Engine Base (`packages/engine/quiz-core`) -> *Critério de Conclusão: Zero lógicas de score/time no `App.tsx`.*
- [ ] Fase 3: Design System e Tokens (`packages/ui/design-system`)
- [ ] Fase 4: O Cliente LLM (`packages/infrastructure/llm-client`)
- [ ] Fase 5: Limpeza e Estabilização dos Apps

## Como Rodar (Desenvolvimento)
Graças à configuração centralizada no TurboRepo, evite entrar nas pastas dos aplicativos individuais. Na **raiz do monorepo**, utilize os comandos abaixo:
- **`npm run dev:generic`**: Inicia o servidor Vite para o App Avalia Quiz genérico.
- **`npm run dev:jw`**: Inicia o servidor Vite para o App Avalia JW Quiz.

## Build e Deploy (Firebase Hosting)
Os projetos compartilham uma única infraestrutura via os alvos (targets) do `firebase.json` localizado na raiz. 

Para realizar deploy:
1. Certifique-se de que configurou os targets localmente:
   `firebase target:apply hosting generic avalia-quiz`
   `firebase target:apply hosting jw avalia-jw-quiz`
2. **Execute os comandos de deploy diretamente na raiz**:
   - **`npm run deploy:generic`**: Faz o build com TurboRepo e empurra a pasta dist do quiz-generic para a URL.
   - **`npm run deploy:jw`**: Faz o build com TurboRepo e empurra a pasta dist do quiz-jw para a respectiva URL.
