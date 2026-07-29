/**
 * Utilitário de Proteção contra Força Bruta (Rate Limiter e Backoff Exponencial)
 * 
 * Implementa 3 camadas complementares de segurança:
 * 1. Bloqueio progressivo local (localStorage persistent).
 * 2. Backoff Exponencial (delay progressivo em cada falha).
 * 3. Preparado para verificação de IP/Token em endpoints de backend.
 */

const STORAGE_KEY = 'avalia_auth_attempts';

interface RateLimitState {
  attempts: number;
  blockedUntil: number;
  lastAttemptTs: number;
}

const getRateLimitState = (): RateLimitState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, blockedUntil: 0, lastAttemptTs: 0 };
    const parsed = JSON.parse(raw);
    return {
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : 0,
      lastAttemptTs: typeof parsed.lastAttemptTs === 'number' ? parsed.lastAttemptTs : 0
    };
  } catch {
    return { attempts: 0, blockedUntil: 0, lastAttemptTs: 0 };
  }
};

const saveRateLimitState = (state: RateLimitState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Erro ao salvar estado de rate limit:", e);
  }
};

/**
 * Retorna se o acesso por código está bloqueado e quantos segundos restam.
 */
export const checkAccessCodeLock = (): { isBlocked: boolean; remainingSeconds: number; attempts: number } => {
  const state = getRateLimitState();
  const now = Date.now();

  if (state.blockedUntil > now) {
    const remainingSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    return { isBlocked: true, remainingSeconds, attempts: state.attempts };
  }

  return { isBlocked: false, remainingSeconds: 0, attempts: state.attempts };
};

/**
 * Registra uma tentativa incorreta e aplica a penalidade exponencial + delay.
 */
export const registerFailedCodeAttempt = async (): Promise<{ remainingSeconds: number; delayMs: number }> => {
  const state = getRateLimitState();
  const newAttempts = state.attempts + 1;
  const now = Date.now();

  // Cálculo de penalidade em segundos baseada no número de tentativas
  let blockSeconds = 0;
  let delayMs = 0;

  if (newAttempts >= 10) {
    blockSeconds = 3600; // 1 hora de bloqueio
    delayMs = 5000;
  } else if (newAttempts >= 7) {
    blockSeconds = 600; // 10 minutos de bloqueio
    delayMs = 3000;
  } else if (newAttempts >= 5) {
    blockSeconds = 120; // 2 minutos de bloqueio
    delayMs = 2000;
  } else if (newAttempts >= 3) {
    blockSeconds = 30; // 30 segundos de bloqueio
    delayMs = 1000;
  } else {
    // Backoff Exponencial simples para as primeiras tentativas (300ms, 600ms...)
    delayMs = newAttempts * 300;
  }

  const blockedUntil = blockSeconds > 0 ? now + (blockSeconds * 1000) : 0;

  saveRateLimitState({
    attempts: newAttempts,
    blockedUntil,
    lastAttemptTs: now
  });

  // Aplica o atraso artificial (Backoff Exponencial)
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return { remainingSeconds: blockSeconds, delayMs };
};

/**
 * Reseta o histórico de tentativas com sucesso na autenticação.
 */
export const resetFailedCodeAttempts = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Erro ao resetar histórico de rate limit:", e);
  }
};
