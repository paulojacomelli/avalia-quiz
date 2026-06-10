# 🚀 Avalia Exemplo (Template Oficial)

Este é o template oficial para criação de novos quizes no ecossistema **Avalia**. 

## 📝 Como criar um novo Quiz?

1. **Copie esta pasta**: Dê o nome do seu novo projeto (ex: `avalia-cinema-quiz`).
2. **Edite o `package.json`**: Altere o campo `"name"` (ex: `"@avalia/cinema-quiz"`).
3. **Personalize a "Alma"**: Abra `src/config/quizConfig.tsx` e altere:
   - `appName` e `appTitle`: Nome que aparece na tela.
   - `theme`: Cores principais e de destaque.
   - `systemPrompt`: Instruções para a IA (o passo mais importante!).
   - `topicModes`: Os botões de categoria que aparecem no início.

## 🏗️ Estrutura do Projeto

- `src/config/quizConfig.tsx`: **O ÚNICO ARQUIVO QUE VOCÊ REALMENTE PRECISA EDITAR.**
- `src/App.tsx`: Ponto de entrada que consome o `GameEngine`.
- `src/main.tsx`: Inicialização do React e temas.

---

**Dica**: Ao editar o `systemPrompt`, seja específico sobre o tom de voz e as fontes de informação que a IA deve usar. Isso garante que o quiz seja autêntico e profissional.
