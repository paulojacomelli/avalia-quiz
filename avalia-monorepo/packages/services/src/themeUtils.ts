/**
 * Normaliza e resolve o rótulo canônico legível de um tema/tópico em Português.
 * Evita que enums ou chaves brutas como 'GENERAL', 'ARTS_CULTURE', 'ENTERTAINMENT', etc.,
 * sejam gravados no Firestore ou exibidos na UI.
 */
export const resolveThemeLabel = (
  mode?: string,
  appName?: string,
  customTopicModes?: Array<{ value: string; label: string }>
): string => {
  if (!mode || typeof mode !== 'string') return 'Geral';
  const trimmed = mode.trim();
  if (!trimmed) return 'Geral';

  // 1. Tentar encontrar no customTopicModes se fornecido
  if (customTopicModes && customTopicModes.length > 0) {
    const matched = customTopicModes.find(tm => tm.value === trimmed || tm.label === trimmed);
    if (matched?.label) return matched.label;
  }

  const isJw = appName?.toLowerCase().includes('jw');

  // 2. Mapeamento canônico por chave/enum bruto
  switch (trimmed.toUpperCase()) {
    case 'GENERAL':
    case 'GERAL':
    case 'ACADEMIC':
    case 'ACADÊMICO':
    case 'ACADEMICO':
      return isJw ? 'Geral' : 'Acadêmico';

    case 'ENTERTAINMENT':
    case 'ENTRETENIMENTO':
      return 'Entretenimento';

    case 'ARTS_CULTURE':
    case 'ARTE & CULTURA':
    case 'ARTE E CULTURA':
    case 'ARTS':
      return 'Arte & Cultura';

    case 'GEOPOLITICS':
    case 'GEOPOLÍTICA':
    case 'GEOPOLITICA':
      return 'Geopolítica';

    case 'ANIMALS':
    case 'MUNDO ANIMAL':
    case 'ANIMAL':
      return 'Mundo Animal';

    case 'OTHER':
    case 'OUTRO ASSUNTO':
    case 'ASSUNTO ESPECÍFICO':
    case 'OUTRO':
      return isJw ? 'Assunto Específico' : 'Outro Assunto';

    case 'BOOKS':
    case 'LIVROS DA BÍBLIA':
    case 'LIVROS DA BIBLIA':
      return 'Livros da Bíblia';

    case 'HISTORY_JW':
    case 'A HISTÓRIA':
    case 'A HISTORIA':
      return 'A História';

    case 'COLORS_SHAPES':
    case 'CORES & FORMAS':
    case 'CORES E FORMAS':
      return 'Cores & Formas';

    case 'NATURE':
    case 'PLANETA & NATUREZA':
    case 'PLANETA E NATUREZA':
      return 'Planeta & Natureza';

    default:
      return trimmed;
  }
};
