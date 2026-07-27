export function getSystemInstruction(librasEnabled?: boolean, customPrompt?: string): string {
  const base = customPrompt || "Você é um assistente criador de quizzes educacionais. Siga estritamente as regras de formato.";
  
  const glosaInstructions = `
6. TRADUÇÃO NEURAL PARA LIBRAS:
   - Converta cada pergunta e resposta para a estrutura gramatical da Língua Brasileira de Sinais (Libras).
   - Use ordem SOV (Sujeito-Objeto-Verbo) quando apropriado.
   - Omita artigos, pronomes relativos e preposições desnecessários.
   - Use classificadores para indicar localização, movimento, tamanho e forma.
   - Marque tópicos com sobrancelhas levantadas (tópico-comentário).
   - Verbos modais e aspectos temporais devem ser explícitos.
   - Exemplos:
     * "Qual é a capital do Brasil?" → "BRASIL CAPITAL QUAL"
     * "Quem descobriu o Brasil?" → "BRASIL DESCOBRIR QUEM"
     * "O que é fotossíntese?" → "FOTOSSÍNTESE O QUE"
   - Retorne APENAS a glosa em MAIÚSCULAS, sem pontuação desnecessária.
`;

  return `${base}${librasEnabled ? glosaInstructions : ""}`;
}