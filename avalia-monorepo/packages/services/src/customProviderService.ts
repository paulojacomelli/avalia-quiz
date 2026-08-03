import { CustomProviderConfig } from '@avalia/core';

const STORAGE_KEY = 'avalia_custom_providers';

/**
 * Recupera todos os provedores personalizados salvos no localStorage.
 */
export const getCustomProviders = (): CustomProviderConfig[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler provedores personalizados do localStorage:', err);
    return [];
  }
};

/**
 * Busca um provedor personalizado específico pelo seu ID.
 */
export const getCustomProviderById = (id: string): CustomProviderConfig | undefined => {
  if (!id) return undefined;
  const providers = getCustomProviders();
  return providers.find(p => p.id === id);
};

/**
 * Salva ou atualiza um provedor personalizado no localStorage.
 */
export const saveCustomProvider = (config: CustomProviderConfig): void => {
  if (!config || !config.id) {
    throw new Error('Configuração de provedor inválida: ID é obrigatório.');
  }

  const cleanId = config.id.trim().toLowerCase();
  const cleanConfig: CustomProviderConfig = {
    ...config,
    id: cleanId,
    name: config.name.trim(),
    baseURL: config.baseURL.trim(),
    apiKey: config.apiKey ? config.apiKey.trim() : '',
    models: Array.isArray(config.models) ? config.models.map(m => ({ id: m.id.trim(), name: m.name.trim() })) : [],
    headers: Array.isArray(config.headers) ? config.headers.filter(h => h.name.trim() !== '').map(h => ({ name: h.name.trim(), value: h.value.trim() })) : []
  };

  const providers = getCustomProviders();
  const index = providers.findIndex(p => p.id === cleanId);

  if (index >= 0) {
    providers[index] = cleanConfig;
  } else {
    providers.push(cleanConfig);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  }
};

/**
 * Remove um provedor personalizado do localStorage pelo ID.
 */
export const deleteCustomProvider = (id: string): void => {
  if (!id) return;
  const cleanId = id.trim().toLowerCase();
  const providers = getCustomProviders().filter(p => p.id !== cleanId);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  }
};
