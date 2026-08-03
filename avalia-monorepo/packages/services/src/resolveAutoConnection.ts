import { AiProvider } from '@avalia/core';
import { validateApiKey } from './geminiService';

export interface ProviderCandidate {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface ConnectionAttempt {
  provider: AiProvider;
  model: string;
  success: boolean;
  error?: string;
}

export interface ResolvedConnection {
  provider: AiProvider;
  apiKey: string;
  model: string;
  attempts: ConnectionAttempt[];
}

export class AutoConnectionError extends Error {
  attempts: ConnectionAttempt[];

  constructor(attempts: ConnectionAttempt[]) {
    const summary = attempts.map(a => `${a.provider}: ${a.error}`).join(' | ');
    super(`Nenhum dos provedores de IA configurados respondeu no momento. (${summary})`);
    this.name = 'AutoConnectionError';
    this.attempts = attempts;
  }
}

/**
 * 1. Descoberta explícita de provedores configurados.
 * Se houver array `providers` explícito no Firestore, consome dele.
 * Caso contrário, verifica os nomes de provedores oficialmente suportados.
 */
export const discoverConfiguredProviders = (firestoreData: Record<string, any>): ProviderCandidate[] => {
  if (Array.isArray(firestoreData.providers) && firestoreData.providers.length > 0) {
    return firestoreData.providers
      .filter((p: any) => p && p.enabled !== false && p.id && p.key && p.model)
      .map((p: any) => ({
        provider: p.id as AiProvider,
        apiKey: p.key as string,
        model: p.model as string
      }));
  }

  return [];
};

/**
 * 2. Ordenação de provedores baseada em `auto_provider_order` configurável do Firestore.
 */
export const orderProviders = (candidates: ProviderCandidate[], order?: string[]): ProviderCandidate[] => {
  if (!order || !Array.isArray(order) || order.length === 0) {
    return candidates;
  }

  const sorted: ProviderCandidate[] = [];
  const candidateMap = new Map(candidates.map(c => [c.provider, c]));

  // Adiciona na ordem configurada
  for (const provId of order) {
    const item = candidateMap.get(provId as AiProvider);
    if (item) {
      sorted.push(item);
      candidateMap.delete(provId as AiProvider);
    }
  }

  // Inclui remanescentes que não estavam listados no order
  for (const item of candidateMap.values()) {
    sorted.push(item);
  }

  return sorted;
};

/**
 * Caso de Uso: Resolução Pura do Provedor de IA para o Modo Auto.
 * Tenta conectar sequencialmente aos provedores configurados e retorna a conexão funcional e o histórico.
 */
export const resolveAutoConnection = async (firestoreData: Record<string, any>): Promise<ResolvedConnection> => {
  const rawCandidates = discoverConfiguredProviders(firestoreData);

  if (rawCandidates.length === 0) {
    throw new AutoConnectionError([{
      provider: 'auto' as AiProvider,
      model: 'none',
      success: false,
      error: 'Nenhum provedor de IA com credenciais válidas foi encontrado no Firestore.'
    }]);
  }

  const orderedCandidates = orderProviders(rawCandidates, firestoreData.auto_provider_order);
  const attempts: ConnectionAttempt[] = [];

  for (const candidate of orderedCandidates) {
    try {
      await validateApiKey(candidate.apiKey, candidate.provider, candidate.model);
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        success: true
      });

      return {
        provider: candidate.provider,
        apiKey: candidate.apiKey,
        model: candidate.model,
        attempts
      };
    } catch (err: any) {
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        success: false,
        error: err.message || String(err)
      });
    }
  }

  throw new AutoConnectionError(attempts);
};
