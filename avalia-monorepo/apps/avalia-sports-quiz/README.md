# 🏆 Avalia Sports Quiz (Exemplo)

Este é um exemplo de como implementar um novo produto dentro da plataforma **Avalia** seguindo a arquitetura de **Core Neutro**.

## 🏗️ Como Funciona

1. **Configuração over Code**: Em vez de programar novas telas, você apenas define um objeto `QUIZ_CONFIG`.
2. **Injeção de Personalidade**: O `systemPrompt` em `src/config/quizConfig.tsx` transforma o comportamento da IA para o domínio desejado (neste caso, Esportes).
3. **Identidade Visual**: As cores e logos são injetados via Props, garantindo que o `design-system` permaneça agnóstico.
4. **Libras Customizada**: Note o campo `glosa` nos `topicModes`. Ele permite que o avatar de Libras saiba exatamente qual sinal fazer para cada tema, sem que essa informação precise estar no código compartilhado.

## 🚀 Para Iniciar um Novo Quiz

Basta copiar esta pasta, alterar o `appName` e o `systemPrompt` no arquivo de configuração, e você terá um produto totalmente novo rodando sobre a mesma infraestrutura robusta.
