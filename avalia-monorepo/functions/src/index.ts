import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueio
const FAILURE_WINDOW_MS = 60 * 60 * 1000; // 1 hora de janela para contagem de falhas

/**
 * Extrai o IP real do cliente no ambiente Google Cloud Functions v2 / Cloud Run.
 * No GCP:
 * 1. O GCP injeta o IP validado do cliente no cabecalho seguro 'x-appengine-userip' (infalsificavel na borda GCP).
 * 2. Na cadeia 'x-forwarded-for', o GCP concatena o IP real do cliente antes dos proxies internos do GFE (penultimo IP).
 */
function getTrustedClientIp(req: any): string {
  // 1. Cabecalho direto injetado pelo ambiente de borda da infraestrutura GCP
  const gcpUserIp = req.headers["x-appengine-userip"] || req.headers["fastly-client-ip"];
  if (typeof gcpUserIp === "string" && gcpUserIp.trim()) {
    return gcpUserIp.trim();
  }

  // 2. Analise do x-forwarded-for gerenciado pelo Google Front End (GFE)
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const ips = forwarded.split(",").map(ip => ip.trim()).filter(Boolean);
    // Se a cadeia possuir múltiplos IPs, o penultimo (ips[ips.length - 2]) e o IP real do cliente anexado pelo GFE
    if (ips.length >= 2) {
      return ips[ips.length - 2];
    }
    if (ips.length === 1) {
      return ips[0];
    }
  }

  // 3. Fallback nativo do framework
  return req.ip || req.socket?.remoteAddress || "unknown_ip";
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
      "GOOGLE_AI_KEY",
      "GROQ_KEY",
      "DEEPSEEK_KEY",
      "OPENROUTER_KEY",
      "OPENAI_KEY",
      "CLAUDE_KEY"
    ]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido. Use POST." });
      return;
    }

    const clientIp = getTrustedClientIp(req);
    const { secretCode, provider, model, theme, subTopic } = req.body || {};

    // Log estruturado de diagnóstico seguro (para auditoria de IP de borda da GCP)
    console.log(`[DIAGNOSTIC] Client IP extraído: ${clientIp} | raw req.ip: ${req.ip} | x-forwarded-for: ${req.headers["x-forwarded-for"]}`);

    try {
      if (!secretCode || typeof secretCode !== "string") {
        res.status(400).json({ error: "Código de acesso (secretCode) é obrigatório." });
        return;
      }

      // 1. Leitura do PIN oficial no Firestore
      const configSnap = await db.doc("auth/config").get();
      const actualSecretCode = configSnap.exists ? configSnap.data()?.secret_code : null;
      const isPinValid = actualSecretCode === secretCode;

      // 2. Transacao Atomica de Forca Bruta
      if (!isPinValid) {
        await verifyAndTrackBruteForce(clientIp, false);
        res.status(401).json({ error: "Código de acesso incorreto." });
        return;
      }

      // 3. Se o PIN estiver correto, valida o estado de bloqueio e limpa o contador
      await verifyAndTrackBruteForce(clientIp, true);

      // 4. Resgate seguro da chave de API do Secret Manager
      const targetProvider = provider || "google-ai";
      let apiKey: string | undefined;

      switch (targetProvider) {
        case "google-ai":
          apiKey = process.env.GOOGLE_AI_KEY;
          break;
        case "groq":
          apiKey = process.env.GROQ_KEY;
          break;
        case "deepseek":
          apiKey = process.env.DEEPSEEK_KEY;
          break;
        case "openrouter":
          apiKey = process.env.OPENROUTER_KEY;
          break;
        case "openai":
          apiKey = process.env.OPENAI_KEY;
          break;
        case "claude":
          apiKey = process.env.CLAUDE_KEY;
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
      if (err instanceof HttpsError || err.message?.includes("Muitas tentativas")) {
        res.status(429).json({ error: "Muitas tentativas incorretas. Tente novamente mais tarde." });
        return;
      }
      console.error("[PROXY SERVER ERROR]", err);
      res.status(500).json({ error: "Erro interno no servidor de geração de quiz." });
    }
  }
);