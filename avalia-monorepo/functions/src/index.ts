import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Declaracao oficial de Secrets gerenciados nativamente pelo GCP Secret Manager
const googleAiKey = defineSecret("GOOGLE_AI_KEY");
const openaiKey = defineSecret("OPENAI_KEY");
const groqKey = defineSecret("GROQ_KEY");
const deepseekKey = defineSecret("DEEPSEEK_KEY");
const claudeKey = defineSecret("CLAUDE_KEY");
const openrouterKey = defineSecret("OPENROUTER_KEY");
const avaliaSecretCode = defineSecret("AVALIA_SECRET_CODE");

const ALL_SECRETS = [
  googleAiKey,
  openaiKey,
  groqKey,
  deepseekKey,
  claudeKey,
  openrouterKey,
  avaliaSecretCode
];

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueio
const FAILURE_WINDOW_MS = 60 * 60 * 1000; // 1 hora de janela para contagem de falhas

/**
 * Extrai o IP real do cliente conforme a especificação oficial das Cloud Functions v2 / GCP Cloud Run.
 * 
 * ⚠️ PREMISSA DE INFRAESTRUTURA:
 * Esta implementação pressupõe que a Function é acessada DIRETA e EXCLUSIVAMENTE pelo seu endpoint padrão
 * da GCP (https://us-central1-<project-id>.cloudfunctions.net/...), sem proxies intermediários ou CDNs.
 * Se futuramente for adicionada uma camada de Cloudflare, Fastly, Nginx ou Load Balancer customizado, 
 * este método DEVE ser reavaliado para ler o cabeçalho correspondente desse proxy intermediário.
 */
function getTrustedClientIp(req: any): string {
  // 1. req.ip nativo configurado pela runtime do Firebase v2 / Express
  if (typeof req.ip === "string" && req.ip.trim() && req.ip !== "::1" && req.ip !== "127.0.0.1") {
    return req.ip.trim();
  }

  // 2. Primeiro IP da cadeia X-Forwarded-For (padrao oficial da GCP para Cloud Functions v2)
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const ips = forwarded.split(",").map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[0]; // Primeiro IP da lista = cliente de origem no padrao GCP Functions v2
    }
  }

  return req.socket?.remoteAddress || "unknown_ip";
}

/**
 * Registra e valida tentativas incorretas de PIN no servidor por IP em uma transacao atomica.
 */
async function verifyAndTrackBruteForce(clientIp: string, isCorrectPin: boolean): Promise<void> {
  const sanitizeIpKey = clientIp.replace(/[^a-zA-Z0-9_-]/g, "_");
  const docRef = db.collection("telemetry_brute_force_locks").doc(sanitizeIpKey);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    const data = snap.data();

    // 1. Checagem de Lockout Ativo
    if (data?.isBlocked && data?.blockedUntil) {
      if (now < data.blockedUntil) {
        throw new HttpsError("resource-exhausted", "Muitas tentativas incorretas. Tente novamente mais tarde.");
      }
      // Se o tempo de lockout expirou, reseta o estado do bloqueio na transacao
      transaction.set(docRef, { failedCount: 0, isBlocked: false, windowStart: now });
    }

    // 2. Se o PIN estiver correto, limpa o historico de falhas desse IP
    if (isCorrectPin) {
      if (snap.exists && (data?.failedCount > 0 || data?.isBlocked)) {
        transaction.set(docRef, { failedCount: 0, isBlocked: false, lastSuccess: now });
      }
      return;
    }

    // 3. Se o PIN estiver incorreto, calcula o incremento com base na janela de tempo de 1 hora
    const windowStart = data?.windowStart || now;
    let currentFailures = data?.failedCount || 0;

    // Se a janela de 1 hora expirou desde o primeiro erro, reseta a contagem
    if (now - windowStart > FAILURE_WINDOW_MS) {
      currentFailures = 1;
    } else {
      currentFailures += 1;
    }

    const isBlockedNow = currentFailures >= MAX_FAILED_ATTEMPTS;
    const blockedUntilTime = isBlockedNow ? now + LOCKOUT_TIME_MS : null;

    transaction.set(
      docRef,
      {
        failedCount: currentFailures,
        isBlocked: isBlockedNow,
        blockedUntil: blockedUntilTime,
        windowStart: currentFailures === 1 ? now : windowStart,
        lastFailed: now,
      },
      { merge: true }
    );
  });
}

export const generateQuizProxy = onRequest(
  {
    cors: true,
    secrets: [
      googleAiKey,
      openaiKey,
      groqKey,
      deepseekKey,
      claudeKey,
      openrouterKey,
      avaliaSecretCode
    ]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido. Use POST." });
      return;
    }

    const clientIp = getTrustedClientIp(req);
    const { secretCode, provider, model, theme, subTopic } = req.body || {};

    try {
      if (!secretCode || typeof secretCode !== "string") {
        res.status(400).json({ error: "Código de acesso (secretCode) é obrigatório." });
        return;
      }

      // 1. Leitura do PIN oficial diretamente do GCP Secret Manager (sem nenhum fallback)
      const actualSecretCode = avaliaSecretCode.value();
      const isPinValid = actualSecretCode === secretCode;

      // 2. Transacao Atomica de Forca Bruta
      if (!isPinValid) {
        await verifyAndTrackBruteForce(clientIp, false);
        res.status(401).json({ error: "Código de acesso incorreto." });
        return;
      }

      // 3. Se o PIN estiver correto, valida o estado de bloqueio e limpa o contador
      await verifyAndTrackBruteForce(clientIp, true);

      // 4. Resgate seguro da chave de API exclusivamente do Secret Manager
      const targetProvider = provider || "google-ai";
      let apiKey: string | undefined;

      switch (targetProvider) {
        case "google-ai":
          apiKey = googleAiKey.value();
          break;
        case "groq":
          apiKey = groqKey.value();
          break;
        case "deepseek":
          apiKey = deepseekKey.value();
          break;
        case "openrouter":
          apiKey = openrouterKey.value();
          break;
        case "openai":
          apiKey = openaiKey.value();
          break;
        case "claude":
          apiKey = claudeKey.value();
          break;
      }

      if (!apiKey) {
        res.status(500).json({ error: `Chave secreta do provedor '${targetProvider}' não configurada no servidor.` });
        return;
      }

      // TODO INTEGRACAO REAL: Chamada SDK / REST com a apiKey no servidor
      res.status(200).json({
        success: true,
        quiz: {
          title: `Quiz sobre ${theme || "Geral"}`,
          questions: [
            {
              id: "q1",
              question: `[SERVIDOR] Pergunta gerada para ${theme || "o tema"}?`,
              options: ["Resposta A", "Resposta B", "Resposta C", "Resposta D"],
              correctAnswerIndex: 0,
              correctAnswerText: "Resposta A"
            }
          ]
        },
        provider: targetProvider,
        model: model || "default"
      });
    } catch (err: any) {
      console.error("Erro na generateQuizProxy:", err);
      res.status(500).json({ error: err?.message || "Erro interno no servidor proxy de IA." });
    }
  }
);

/**
 * Cloud Function Serverless Callable para consultar a lista oficial de modelos dos provedores usando as chaves de servidor.
 */
export const getAvailableModelsProxy = onCall(
  {
    cors: ["http://localhost:5173", "http://127.0.0.1:5173", "https://avalia-quiz.web.app", "https://avalia-jw-quiz.web.app", "*"],
    secrets: [
      googleAiKey,
      openaiKey,
      groqKey,
      deepseekKey,
      claudeKey,
      openrouterKey,
      avaliaSecretCode
    ]
  },
  async (request) => {
    const data = request.data || {};
    const secretCode = String(data.secretCode || "");
    const provider = String(data.provider || "google-ai");
    const target = String(data.target || "text");

    const clientIp = getTrustedClientIp(request.rawRequest || {});

    // 1. Validação de PIN diretamente do GCP Secret Manager (sem nenhum fallback)
    const actualSecretCode = avaliaSecretCode.value();
    const isPinValid = actualSecretCode === secretCode;

    // 2. Transação Atômica de Força Bruta por IP
    if (!isPinValid) {
      await verifyAndTrackBruteForce(clientIp, false);
      throw new HttpsError("unauthenticated", "Código de acesso incorreto.");
    }

    // Se o PIN for válido, limpa qualquer contagem parcial e autoriza
    await verifyAndTrackBruteForce(clientIp, true);

    try {
      if (provider === "google-ai" || provider === "vertex" || provider === "auto") {
        const apiKey = googleAiKey.value();
        if (!apiKey) return { models: [], valid: true };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return { models: [], valid: true };

        const apiData = await response.json();
        if (apiData && Array.isArray(apiData.models)) {
          const result = apiData.models
            .filter((m: any) => {
              if (!m.name) return false;
              const cleanId = m.name.replace(/^models\//, '');
              const idLower = cleanId.toLowerCase();
              const isTts = idLower.includes('tts') || idLower.includes('audio') || idLower.includes('speech');
              
              if (target === 'tts') return isTts;
              
              const isNonText = isTts || idLower.includes('image') || idLower.includes('embed') || idLower.includes('bidi') || idLower.includes('realtime');
              if (isNonText) return false;
              
              return cleanId.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent');
            })
            .map((m: any) => {
              const cleanId = m.name.replace(/^models\//, '');
              return {
                value: cleanId,
                label: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
                status: target === 'tts' ? 'Voz' : 'Estável'
              };
            });

          return { models: result, valid: true };
        }
      }

      return { models: [], valid: true };
    } catch (err) {
      console.error("Erro na getAvailableModelsProxy:", err);
      return { models: [], valid: true };
    }
  }
);