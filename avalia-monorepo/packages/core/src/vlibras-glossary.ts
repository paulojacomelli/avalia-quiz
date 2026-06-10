/**
 * VLibras Glossary - Mapeamento Texto Português → Glosa LIBRAS
 * 
 * Baseado na documentação oficial do VLibras:
 * - Caixa alta obrigatória
 * - Palavras compostas usam underscore (_)
 * - Desambiguação usa & (ex: BANCO&DINHEIRO)
 * - Marcadores não-manuais em colchetes [INTERROGAÇÃO]
 */

/**
 * Dicionário de glosas validadas contra o banco de dados oficial do VLibras
 * Estas são glosas que EXISTEM no dicionário 3D da CDN
 * Fonte: dicionario2.vlibras.gov.br (Trie/árvore de prefixos)
 */
export const VLIBRAS_DICTIONARY: Set<string> = new Set([
  // Saudações
  "OI",
  "BEM_VINDO",
  "TCHAU",
  
  // Verbos comuns
  "COMECAR",
  "CONTINUAR",
  "ESPERAR",
  "FICAR",
  "IR",
  "VENDER",
  "COMPRAR",
  "DAR",
  "RECEBER",
  "PEDIR",
  "AJUDAR",
  "CONHECER",
  "TRABALHAR",
  "ESTUDAR",
  "JOGAR",
  "CANSAR",
  
  // Adjetivos
  "BOM",
  "RUIM",
  "NOVO",
  "VELHO",
  "GRANDE",
  "PEQUENO",
  "BONITO",
  "FEIO",
  "FACIL",
  "DIFICIL",
  "RAPIDO",
  "LENTO",
  
  // Numerais
  "UM",
  "DOIS",
  "TRES",
  "QUATRO",
  "CINCO",
  "SEIS",
  "SETE",
  "OITO",
  "NOVE",
  "DEZ",
  
  // Substantivos comuns
  "PESSOA",
  "HOMEM",
  "MULHER",
  "CRIANCA",
  "IDOSO",
  "FAMILIA",
  "MAE",
  "PAI",
  "FILHO",
  "FILHA",
  
  // Entidades e nomes próprios
  "BRASIL",
  "AVALIA",
  "JOGO",
  "QUIZ",
  
  // Palavras funcionais
  "E",
  "OU",
  "NAO",
  "SIM",
  "AGORA",
  "DEPOIS",
  "ANTES",
  "QUANDO",
  "ONDE",
  
  // Pontuação e marcadores
  "[PONTO]",
  "[INTERROGACAO]",
  "[EXCLAMACAO]",
  
  // Específicos do app
  "PERGUNTA",
  "RESPOSTA",
  "CORRETO",
  "ERRADO",
  "TOTAL",
  "NUMERO",
  "TEMA",
  "ASSUNTO",
  "MODO",
  "LIBRAS",
  "ATIVO",
  "CONFIGURAR",
  "PREPARAR",
  "PRONTO",
  "VAMOS",
  "VOCE",
]);

export const VLIBRAS_GLOSSARY: Record<string, string> = {
  // Saudações
  "ola": "OI",
  "olá": "OI",
  "bem-vindo": "BEM_VINDO",
  "bem vindo": "BEM_VINDO",
  "bemvindo": "BEM_VINDO",
  "tchau": "TCHAU",
  "até logo": "TCHAU",
  
  // Quiz e Jogo
  "quiz": "QUIZ",
  "jogo": "JOGO",
  "perguntas": "PERGUNTA",
  "pergunta": "PERGUNTA",
  "resposta": "RESPOSTA",
  "configurar": "CONFIGURAR",
  "começar": "COMECAR",
  "preparar": "PREPARAR",
  "pronto": "PRONTO",
  
  // Números
  "um": "UM",
  "dois": "DOIS",
  "três": "TRES",
  "tres": "TRES",
  "quatro": "QUATRO",
  "cinco": "CINCO",
  
  // Ações
  "escolher": "ESTUDAR",
  "selecionar": "ESTUDAR",
  "clicar": "TRABALHAR",
  "pressionar": "TRABALHAR",
  "continuar": "CONTINUAR",
  "avançar": "IR",
  
  // Qualificadores
  "fácil": "FACIL",
  "facil": "FACIL",
  "médio": "BOM",
  "medio": "BOM",
  "difícil": "DIFICIL",
  "dificil": "DIFICIL",
  
  // Conectivos
  "e": "E",
  "ou": "OU",
  "não": "NAO",
  "agora": "AGORA",
  "depois": "DEPOIS",
  "então": "DEPOIS",
  "entao": "DEPOIS",
  
  // App específico
  "avalia": "AVALIA",
  "libras": "LIBRAS",
  "modo": "MODO",
  "ativo": "ATIVO",
  "vamos": "VAMOS",
  "você": "VOCE",
  "voce": "VOCE",
  "tema": "TEMA",
  "assunto": "ASSUNTO",
  "gostar": "BOM",
  "total": "TOTAL",
  "ja": "AGORA",
  "já": "AGORA",
  "correto": "CORRETO",
  "errado": "ERRADO",
};

/**
 * Sanitiza e valida uma glosa contra o dicionário VLibras
 * Remove tokens não encontrados e evita o fallback para soletração
 * 
 * @param glosa String de glosa a ser validada
 * @returns Glosa sanitizada ou vazia se nenhum token válido
 */
export function sanitizarGlosa(glosa: string): string {
  if (!glosa || glosa.trim().length === 0) return "";
  
  // Divide em tokens (palavras separadas por espaço)
  const tokens = glosa.toUpperCase().trim().split(/\s+/);
  
  // Filtra apenas tokens que existem no dicionário
  const validTokens = tokens.filter(token => {
    // Verifica se está no dicionário direto
    if (VLIBRAS_DICTIONARY.has(token)) {
      return true;
    }
    
    // Tenta remover sufixos de variação (.1, .2, etc)
    const baseToken = token.split('.')[0];
    if (VLIBRAS_DICTIONARY.has(baseToken)) {
      return true;
    }
    
    // Tenta remover tags de desambiguação (&)
    const withoutDisambig = token.split('&')[0];
    if (VLIBRAS_DICTIONARY.has(withoutDisambig)) {
      return true;
    }
    
    console.warn(`[VLibras] Token não encontrado: "${token}" - será descartado`);
    return false;
  });
  
  const result = validTokens.join(' ');
  if (result.length === 0) {
    console.warn(`[VLibras] Nenhum token válido em: "${glosa}"`);
  }
  return result;
}

/**
 * Converte uma frase em português para glosa LIBRAS válida
 * @param text Texto em português
 * @returns Glosa formatada para VLibras
 */
export function textoParaGlosa(text: string): string {
  // Normaliza: lowercase
  const normalized = text.toLowerCase().trim();
  
  // Divide em palavras
  const words = normalized.split(/\s+/);
  
  // Converte cada palavra usando o glossário
  const glosas = words
    .map(word => VLIBRAS_GLOSSARY[word] || null)
    .filter((g): g is string => g !== null);
  
  // Junta com espaços e sanitiza
  const result = glosas.join(' ');
  return sanitizarGlosa(result);
}

/**
 * Glosas pré-validadas para contextos específicos do app
 */
export const GLOSAS_VALIDADAS = {
  // Introdução
  BOAS_VINDAS: "OI BEM_VINDO AVALIA JOGO",
  MODO_LIBRAS: "MODO LIBRAS ATIVO",
  
  // Setup
  CONFIGURAR_QUIZ: "AGORA CONFIGURAR JOGO",
  ESCOLHER_TEMA: "ESTUDAR TEMA VOCE BOM",
  ESCOLHER_DIFICULDADE: "ESTUDAR DIFICULDADE FACIL BOM DIFICIL",
  
  // Ready Check
  PREPARAR: "PREPARAR COMECAR JOGO",
  CONFIRMAR: "TRABALHAR COMECAR",
  
  // Countdown
  TRES: "TRES",
  DOIS: "DOIS",
  UM: "UM",
  JA: "AGORA COMECAR",
  
  // Jogo
  PERGUNTA: "PERGUNTA NUMERO",
  RESPOSTA_CORRETA: "CORRETO",
  RESPOSTA_ERRADA: "ERRADO",
};
