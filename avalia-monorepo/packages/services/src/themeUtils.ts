/**
 * Normaliza e resolve o rótulo canônico legível de um tema/tópico em Português
 * com base na lista de topicModes configurada pelo próprio aplicativo consumidor.
 */
export const resolveThemeLabel = (
  mode?: string,
  appName?: string,
  topicModes?: Array<{ value: string; label: string }>
): string => {
  if (!mode || typeof mode !== 'string') return '';
  const trimmed = mode.trim();
  if (!trimmed) return '';

  if (topicModes && topicModes.length > 0) {
    const matched = topicModes.find(tm => 
      tm.value.toLowerCase() === trimmed.toLowerCase() || 
      tm.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (matched?.label) return matched.label;
  }

  return trimmed;
};
