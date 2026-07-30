import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as crypto from "node:crypto";

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

    const SUPPORTED_PROVIDERS = ["google-ai", "vertex", "openai", "groq", "deepseek", "openrouter", "claude"];

    try {
      // Validação estrita de entrada — sem fallbacks
      if (!secretCode || typeof secretCode !== "string" || !secretCode.trim()) {
        res.status(400).json({ error: "Campo obrigatório ausente: secretCode." });
        return;
      }

      if (!provider || typeof provider !== "string" || !provider.trim()) {
        res.status(400).json({ error: "Campo obrigatório ausente: provider." });
        return;
      }

      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        res.status(400).json({ error: `Provedor '${provider}' não é suportado. Provedores válidos: ${SUPPORTED_PROVIDERS.join(", ")}.` });
        return;
      }

      if (!model || typeof model !== "string" || !model.trim()) {
        res.status(400).json({ error: "Campo obrigatório ausente: model. Informe o identificador exato do modelo de IA." });
        return;
      }

      // 1. Leitura do PIN oficial diretamente do GCP Secret Manager (sem nenhum fallback)
      const actualSecretCode = (avaliaSecretCode.value() || "").trim();
      const isPinValid = actualSecretCode === secretCode.trim();

      // 2. Transacao Atomica de Forca Bruta
      if (!isPinValid) {
        await verifyAndTrackBruteForce(clientIp, false);
        res.status(401).json({ error: "Código de acesso incorreto." });
        return;
      }

      // 3. Se o PIN estiver correto, valida o estado de bloqueio e limpa o contador
      await verifyAndTrackBruteForce(clientIp, true);

      // 4. Resgate seguro da chave de API exclusivamente do Secret Manager (provider já validado acima)
      const targetProvider = provider;
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

      // 5. Integração REAL de IA Serverless: Chamada à API oficial utilizando a apiKey do GCP Secret Manager
      const prompt = `Gere um quiz com 5 perguntas sobre o tema '${theme || "Geral"}' (Subtópico: '${subTopic || "Geral"}').
IMPORTANTE: Responda APENAS em formato JSON estrito respeitando a estrutura:
{
  "titulo": "Título do Quiz",
  "palavrasChave": ["Tema1", "Tema2"],
  "perguntas": [
    {
      "id": "q1",
      "enunciado": "Pergunta aqui...",
      "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "indiceRespostaCorreta": 0,
      "textoRespostaCorreta": "Opção A",
      "justificativa": "Explicação curta",
      "dica": "Dica útil"
    }
  ]
}`;

      let aiRawResponseText = "";

      if (targetProvider === "google-ai" || targetProvider === "vertex") {
        // model já validado como não-vazio antes de chegar aqui
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const aiResp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error("[generateQuizProxy] Erro na API do Google AI:", errText);
          res.status(500).json({ error: `Falha no provedor Google AI (modelo: ${model}): ${aiResp.status}` });
          return;
        }

        const aiJson = await aiResp.json();
        aiRawResponseText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const OPENAI_COMPAT_URLS: Record<string, string> = {
          openai: "https://api.openai.com/v1/chat/completions",
          deepseek: "https://api.deepseek.com/chat/completions",
          groq: "https://api.groq.com/openai/v1/chat/completions",
          openrouter: "https://openrouter.ai/api/v1/chat/completions",
          claude: "https://api.anthropic.com/v1/messages"
        };
        const apiUrl = OPENAI_COMPAT_URLS[targetProvider];
        if (!apiUrl) {
          res.status(400).json({ error: `URL de API não mapeada para o provedor '${targetProvider}'.` });
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        };

        const aiResp = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model, // model já validado, sem fallback
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[generateQuizProxy] Erro na API do ${targetProvider}:`, errText);
          res.status(500).json({ error: `Falha no provedor ${targetProvider}: ${aiResp.status}` });
          return;
        }

        const aiJson = await aiResp.json();
        aiRawResponseText = aiJson.choices?.[0]?.message?.content || "";
      }

      if (!aiRawResponseText) {
        res.status(500).json({ error: "O provedor de IA não retornou conteúdo." });
        return;
      }

      // Limpeza de blocos de markdown e parse JSON
      const cleanJsonStr = aiRawResponseText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanJsonStr);

      const generatedQuiz = {
        title: parsed.titulo || `Quiz sobre ${theme || "Geral"}`,
        keywords: parsed.palavrasChave || [theme || "Geral"],
        focalTheme: parsed.palavrasChave?.[0] || theme || "Geral",
        questions: (parsed.perguntas || []).map((p: any, idx: number) => ({
          id: p.id || `q-${idx + 1}-${Date.now()}`,
          question: p.enunciado,
          options: p.opcoes || [],
          correctAnswerIndex: p.indiceRespostaCorreta ?? 0,
          correctAnswerText: p.textoRespostaCorreta || (p.opcoes ? p.opcoes[p.indiceRespostaCorreta || 0] : ""),
          explanation: p.justificativa || "",
          hint: p.dica || ""
        }))
      };

      res.status(200).json({
        success: true,
        quiz: generatedQuiz,
        provider: targetProvider,
        model: model // model validado e não-vazio acima
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
  async (request) => {
    const data = request.data || {};
    const secretCode = String(data.secretCode || "");
    const provider = String(data.provider || "google-ai");
    const target = String(data.target || "text");

    const clientIp = getTrustedClientIp(request.rawRequest || {});

    // 1. Validação de PIN diretamente do GCP Secret Manager (sem nenhum fallback)
    const actualSecretCode = (avaliaSecretCode.value() || "").trim();
    const cleanReceivedPin = secretCode.trim();
    const isPinValid = actualSecretCode === cleanReceivedPin;

    if (!isPinValid) {
      const secretHash = crypto.createHash("sha256").update(actualSecretCode).digest("hex").substring(0, 8);
      const receivedHash = crypto.createHash("sha256").update(cleanReceivedPin).digest("hex").substring(0, 8);
      console.log(`[PIN Validation Failed] SecretLen: ${actualSecretCode.length} (hash:${secretHash}), ReceivedLen: ${cleanReceivedPin.length} (hash:${receivedHash})`);
      await verifyAndTrackBruteForce(clientIp, false);
      throw new HttpsError("unauthenticated", "Código de acesso incorreto.");
    }

    // Se o PIN for válido, limpa qualquer contagem parcial e autoriza
    await verifyAndTrackBruteForce(clientIp, true);

    try {
      if (provider === "google-ai" || provider === "vertex" || provider === "auto") {
        const apiKey = googleAiKey.value();
        if (!apiKey) {
          // Secret não configurado — falha de infraestrutura real, não lista vazia
          throw new HttpsError("internal", "Chave do provedor Google AI não configurada no servidor.");
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new HttpsError("internal", `Falha ao buscar modelos do Google AI: HTTP ${response.status}. ${errText}`);
        }

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

        // apiData veio mas sem campo 'models' — resposta inesperada da API
        throw new HttpsError("internal", "Resposta inesperada da API Google AI: campo 'models' ausente.");
      }

      // Provider não suportado nesta função (apenas google-ai/vertex são aceitos por ora)
      throw new HttpsError("invalid-argument", `Provedor '${provider}' não é suportado em getAvailableModelsProxy.`);
    } catch (err: any) {
      // Se já é um HttpsError, relanaça diretamente sem encapsular
      if (err?.httpErrorCode || err?.code) throw err;
      console.error("Erro inesperado na getAvailableModelsProxy:", err);
      throw new HttpsError("internal", err?.message || "Erro interno ao buscar modelos de IA.");
    }
  }
);