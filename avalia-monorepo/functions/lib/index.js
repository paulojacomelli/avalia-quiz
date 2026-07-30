"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableModelsProxy = exports.generateQuizProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
// Declaracao oficial de Secrets gerenciados nativamente pelo GCP Secret Manager
const googleAiKey = (0, params_1.defineSecret)("GOOGLE_AI_KEY");
const openaiKey = (0, params_1.defineSecret)("OPENAI_KEY");
const groqKey = (0, params_1.defineSecret)("GROQ_KEY");
const deepseekKey = (0, params_1.defineSecret)("DEEPSEEK_KEY");
const claudeKey = (0, params_1.defineSecret)("CLAUDE_KEY");
const openrouterKey = (0, params_1.defineSecret)("OPENROUTER_KEY");
const avaliaSecretCode = (0, params_1.defineSecret)("AVALIA_SECRET_CODE");
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
function getTrustedClientIp(req) {
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
async function verifyAndTrackBruteForce(clientIp, isCorrectPin) {
    const sanitizeIpKey = clientIp.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docRef = db.collection("telemetry_brute_force_locks").doc(sanitizeIpKey);
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        const data = snap.data();
        // 1. Checagem de Lockout Ativo
        if (data?.isBlocked && data?.blockedUntil) {
            if (now < data.blockedUntil) {
                throw new https_1.HttpsError("resource-exhausted", "Muitas tentativas incorretas. Tente novamente mais tarde.");
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
        }
        else {
            currentFailures += 1;
        }
        const isBlockedNow = currentFailures >= MAX_FAILED_ATTEMPTS;
        const blockedUntilTime = isBlockedNow ? now + LOCKOUT_TIME_MS : null;
        transaction.set(docRef, {
            failedCount: currentFailures,
            isBlocked: isBlockedNow,
            blockedUntil: blockedUntilTime,
            windowStart: currentFailures === 1 ? now : windowStart,
            lastFailed: now,
        }, { merge: true });
    });
}
exports.generateQuizProxy = (0, https_1.onRequest)({
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
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Método não permitido. Use POST." });
        return;
    }
    const clientIp = getTrustedClientIp(req);
    const { secretCode, provider, model, theme, subTopic, temperature, generationId, globalExclusions } = req.body || {};
    const activeGenId = generationId || `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
        let apiKey;
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
        const exclusionText = Array.isArray(globalExclusions) && globalExclusions.length > 0
            ? `\nTERMOS/TÓPICOS JÁ ABORDADOS ANTERIORMENTE (EVITAR REPETIÇÕES): [${globalExclusions.slice(0, 30).join(", ")}].`
            : "";
        // 5. Integração REAL de IA Serverless: Chamada à API oficial utilizando a apiKey do GCP Secret Manager
        const prompt = `Gere um quiz com 5 perguntas sobre o tema '${theme || "Geral"}' (Subtópico: '${subTopic || "Geral"}').${exclusionText}
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
        const promptHash = crypto.createHash("sha256").update(prompt).digest("hex").substring(0, 12);
        console.log("[generateQuizProxy INITIATED]", JSON.stringify({
            generationId: activeGenId,
            promptHash,
            provider: targetProvider,
            model,
            theme,
            subTopic,
            temperature: typeof temperature === 'number' ? temperature : 0.9,
            topP: 0.95
        }));
        let aiRawResponseText = "";
        if (targetProvider === "google-ai" || targetProvider === "vertex") {
            const cleanModel = model.replace(/^models\//, '');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
            const aiResp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: typeof temperature === 'number' ? temperature : 0.9,
                        topP: 0.95
                    }
                })
            });
            if (!aiResp.ok) {
                const errText = await aiResp.text();
                console.error(`[generateQuizProxy ERROR] genId:${activeGenId} | Provedor: Google AI | Status:${aiResp.status}`, errText);
                res.status(aiResp.status).json({ error: `O modelo '${model}' do Google AI não está disponível para geração de quiz (HTTP ${aiResp.status}). ${errText.slice(0, 150)}` });
                return;
            }
            const aiJson = await aiResp.json();
            aiRawResponseText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
        else {
            const OPENAI_COMPAT_URLS = {
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
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            };
            const aiResp = await fetch(apiUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model: model, // model já validado, sem fallback
                    messages: [{ role: "user", content: prompt }],
                    temperature: typeof temperature === 'number' ? temperature : 0.9,
                    response_format: { type: "json_object" }
                })
            });
            if (!aiResp.ok) {
                const errText = await aiResp.text();
                console.error(`[generateQuizProxy ERROR] genId:${activeGenId} | Provedor:${targetProvider} | Status:${aiResp.status}`, errText);
                res.status(500).json({ error: `Falha no provedor ${targetProvider}: ${aiResp.status}` });
                return;
            }
            const aiJson = await aiResp.json();
            aiRawResponseText = aiJson.choices?.[0]?.message?.content || "";
        }
        console.log(`[generateQuizProxy SUCCESS] genId:${activeGenId} | rawLength:${aiRawResponseText.length} | firstQuestionSnippet:`, aiRawResponseText.slice(0, 120));
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
            questions: (parsed.perguntas || []).map((p, idx) => ({
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
            generationId: activeGenId,
            promptHash,
            quiz: generatedQuiz,
            provider: targetProvider,
            model: model // model validado e não-vazio acima
        });
    }
    catch (err) {
        console.error("Erro na generateQuizProxy:", err);
        res.status(500).json({ error: err?.message || "Erro interno no servidor proxy de IA." });
    }
});
/**
 * Cloud Function Serverless Callable para consultar a lista oficial de modelos dos provedores usando as chaves de servidor.
 */
exports.getAvailableModelsProxy = (0, https_1.onCall)({
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
}, async (request) => {
    const data = request.data || {};
    const secretCode = String(data.secretCode || "");
    const provider = String(data.provider || "google-ai");
    const target = String(data.target || "text");
    const testModel = data.testModel ? String(data.testModel).trim() : null;
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
        throw new https_1.HttpsError("unauthenticated", "Código de acesso incorreto.");
    }
    // Se o PIN for válido, limpa qualquer contagem parcial e autoriza
    await verifyAndTrackBruteForce(clientIp, true);
    // 2. Se for uma requisição de TESTE DE CONEXÃO REAL para um modelo e provedor específicos:
    if (testModel) {
        try {
            let keyToTest;
            let testUrl = "";
            let isOpenAiFormat = false;
            switch (provider) {
                case "auto": {
                    // 1. Lê a ordem e modelos configurados em auth/config no Firestore
                    const configDoc = await db.collection("auth").doc("config").get();
                    const firestoreConfig = configDoc.exists ? configDoc.data() || {} : {};
                    // 2. Mapeia os segredos disponíveis no servidor para os provedores suportados
                    const secretMap = {
                        "google-ai": googleAiKey.value(),
                        "openai": openaiKey.value(),
                        "groq": groqKey.value(),
                        "deepseek": deepseekKey.value(),
                        "claude": claudeKey.value(),
                        "openrouter": openrouterKey.value()
                    };
                    const supportedProviders = ["google-ai", "openrouter", "groq", "claude", "deepseek", "openai"];
                    const candidates = [];
                    // Descoberta de candidatos válidos configurados no Firestore
                    if (Array.isArray(firestoreConfig.providers) && firestoreConfig.providers.length > 0) {
                        for (const p of firestoreConfig.providers) {
                            if (p && p.enabled !== false && p.id && p.model) {
                                const secKey = secretMap[p.id] || p.key;
                                if (secKey) {
                                    candidates.push({ provider: p.id, apiKey: secKey, model: p.model });
                                }
                            }
                        }
                    }
                    else {
                        for (const prov of supportedProviders) {
                            const slug = prov === "google-ai" ? "google_ai" : prov.replace("-", "_");
                            const secKey = secretMap[prov];
                            const modelInDoc = firestoreConfig[`admin_model_${slug}`];
                            if (secKey && modelInDoc && typeof modelInDoc === "string" && modelInDoc.trim()) {
                                candidates.push({ provider: prov, apiKey: secKey, model: modelInDoc.trim() });
                            }
                        }
                    }
                    if (candidates.length === 0) {
                        throw new https_1.HttpsError("failed-precondition", "Nenhum provedor de IA com credenciais válidas configuradas foi encontrado no Firestore no modo Auto.");
                    }
                    // 3. Ordenação baseada em auto_provider_order do Firestore
                    const order = Array.isArray(firestoreConfig.auto_provider_order) ? firestoreConfig.auto_provider_order : [];
                    const orderedCandidates = [];
                    const candidateMap = new Map(candidates.map(c => [c.provider, c]));
                    for (const provId of order) {
                        const item = candidateMap.get(provId);
                        if (item) {
                            orderedCandidates.push(item);
                            candidateMap.delete(provId);
                        }
                    }
                    for (const item of candidateMap.values()) {
                        orderedCandidates.push(item);
                    }
                    // 4. Teste sequencial da cadeia Auto: se ao menos um responder OK, valida a conexão
                    const failureLogs = [];
                    for (const cand of orderedCandidates) {
                        try {
                            if (cand.provider === "google-ai" || cand.provider === "vertex") {
                                const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cand.model}?key=${cand.apiKey}`);
                                if (gRes.ok)
                                    return { valid: true, tested: true, activeProvider: cand.provider, activeModel: cand.model };
                                failureLogs.push(`Google AI (${cand.model}): HTTP ${gRes.status}`);
                            }
                            else if (cand.provider === "claude") {
                                const cRes = await fetch("https://api.anthropic.com/v1/messages", {
                                    method: "POST",
                                    headers: { "x-api-key": cand.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                                    body: JSON.stringify({ model: cand.model, messages: [{ role: "user", content: "Reply 'OK'." }], max_tokens: 5 })
                                });
                                if (cRes.ok)
                                    return { valid: true, tested: true, activeProvider: cand.provider, activeModel: cand.model };
                                failureLogs.push(`Claude (${cand.model}): HTTP ${cRes.status}`);
                            }
                            else {
                                const url = cand.provider === "openai" ? "https://api.openai.com/v1/chat/completions"
                                    : cand.provider === "deepseek" ? "https://api.deepseek.com/chat/completions"
                                        : cand.provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions"
                                            : "https://openrouter.ai/api/v1/chat/completions";
                                const oRes = await fetch(url, {
                                    method: "POST",
                                    headers: { "Authorization": `Bearer ${cand.apiKey}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({ model: cand.model, messages: [{ role: "user", content: "Reply 'OK'." }], max_tokens: 5 })
                                });
                                if (oRes.ok)
                                    return { valid: true, tested: true, activeProvider: cand.provider, activeModel: cand.model };
                                failureLogs.push(`${cand.provider} (${cand.model}): HTTP ${oRes.status}`);
                            }
                        }
                        catch (e) {
                            failureLogs.push(`${cand.provider} (${cand.model}): ${e?.message || String(e)}`);
                        }
                    }
                    // Se TODOS os provedores da cadeia Auto falharem -> lança erro detalhado
                    throw new https_1.HttpsError("unavailable", `Falha no teste de conexão da cadeia Auto. Nenhum provedor configurado respondeu: [${failureLogs.join(" | ")}]`);
                }
                case "google-ai":
                case "vertex":
                    keyToTest = googleAiKey.value();
                    if (!keyToTest)
                        throw new https_1.HttpsError("internal", "Chave do Google AI não configurada no servidor.");
                    const cleanTestModel = testModel.replace(/^models\//, '');
                    const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanTestModel}:generateContent?key=${keyToTest}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: "Reply 'OK'." }] }]
                        })
                    });
                    if (!gRes.ok) {
                        const errTxt = await gRes.text().catch(() => "");
                        throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' do Google AI não está operacional para geração de conteúdo (HTTP ${gRes.status}). ${errTxt.slice(0, 150)}`);
                    }
                    const gJson = await gRes.json().catch(() => null);
                    const gText = (gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
                    if (!gText) {
                        throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' respondeu HTTP 200, mas a resposta não continha conteúdo textual.`);
                    }
                    return { valid: true, tested: true };
                case "groq":
                    keyToTest = groqKey.value();
                    testUrl = "https://api.groq.com/openai/v1/chat/completions";
                    isOpenAiFormat = true;
                    break;
                case "deepseek":
                    keyToTest = deepseekKey.value();
                    testUrl = "https://api.deepseek.com/chat/completions";
                    isOpenAiFormat = true;
                    break;
                case "openrouter":
                    keyToTest = openrouterKey.value();
                    testUrl = "https://openrouter.ai/api/v1/chat/completions";
                    isOpenAiFormat = true;
                    break;
                case "openai":
                    keyToTest = openaiKey.value();
                    testUrl = "https://api.openai.com/v1/chat/completions";
                    isOpenAiFormat = true;
                    break;
                case "claude":
                    keyToTest = claudeKey.value();
                    if (!keyToTest)
                        throw new https_1.HttpsError("internal", "Chave do Claude/Anthropic não configurada no servidor.");
                    const cRes = await fetch("https://api.anthropic.com/v1/messages", {
                        method: "POST",
                        headers: {
                            "x-api-key": keyToTest,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        body: JSON.stringify({
                            model: testModel,
                            messages: [{ role: "user", content: "Reply 'OK'." }],
                            max_tokens: 10
                        })
                    });
                    if (!cRes.ok) {
                        const errTxt = await cRes.text().catch(() => "");
                        throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' do Claude não está operacional para geração textual (HTTP ${cRes.status}). ${errTxt.slice(0, 150)}`);
                    }
                    const cJson = await cRes.json().catch(() => null);
                    const cText = (cJson?.content?.[0]?.text || "").trim();
                    if (!cText) {
                        throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' do Claude respondeu HTTP 200, mas a resposta não continha conteúdo textual.`);
                    }
                    return { valid: true, tested: true };
                default:
                    throw new https_1.HttpsError("invalid-argument", `Provedor '${provider}' inválido para teste de capacidade.`);
            }
            if (isOpenAiFormat && testUrl) {
                if (!keyToTest)
                    throw new https_1.HttpsError("internal", `Chave do provedor '${provider}' não configurada no servidor.`);
                const oRes = await fetch(testUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${keyToTest}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: testModel,
                        messages: [{ role: "user", content: "Reply 'OK'." }],
                        max_tokens: 10
                    })
                });
                if (!oRes.ok) {
                    const errTxt = await oRes.text().catch(() => "");
                    throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' via ${provider} não está operacional para geração textual (HTTP ${oRes.status}). ${errTxt.slice(0, 150)}`);
                }
                const oJson = await oRes.json().catch(() => null);
                const oText = (oJson?.choices?.[0]?.message?.content || "").trim();
                if (!oText) {
                    throw new https_1.HttpsError("invalid-argument", `O modelo '${testModel}' via ${provider} respondeu HTTP 200, mas a resposta não continha conteúdo textual.`);
                }
                return { valid: true, tested: true };
            }
        }
        catch (err) {
            if (err?.httpErrorCode || err?.code)
                throw err;
            throw new https_1.HttpsError("internal", err?.message || `Erro no teste de conexão com ${provider}/${testModel}.`);
        }
    }
    try {
        const configDoc = await db.collection("auth").doc("config").get();
        const firestoreConfig = configDoc.exists ? configDoc.data() || {} : {};
        // CENÁRIO A: Modo AUTO -> Retorna estritamente o modelo preconfigurado no Firestore pelo Admin
        if (provider === "auto") {
            const apiKey = googleAiKey.value();
            if (!apiKey) {
                throw new https_1.HttpsError("internal", "Chave do provedor Google AI não configurada no servidor.");
            }
            const configuredGoogleModel = firestoreConfig.admin_model_google_ai && typeof firestoreConfig.admin_model_google_ai === 'string'
                ? firestoreConfig.admin_model_google_ai.trim()
                : '';
            if (!configuredGoogleModel) {
                throw new https_1.HttpsError("failed-precondition", "Modelo do Google AI não configurado no Firestore (campo 'admin_model_google_ai' ausente no documento auth/config).");
            }
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${configuredGoogleModel}?key=${apiKey}`);
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new https_1.HttpsError("internal", `Falha ao validar modelo preconfigurado no Firestore '${configuredGoogleModel}': HTTP ${response.status}. ${errText.slice(0, 150)}`);
            }
            return {
                models: [
                    {
                        value: configuredGoogleModel,
                        label: `Google ${configuredGoogleModel} (Configurado no Firestore)`,
                        status: 'Oficial'
                    }
                ],
                valid: true
            };
        }
        // CENÁRIO B: Provedor ESPECÍFICO (ex: google-ai, vertex) -> Busca a lista dinâmica completa de modelos disponíveis na API oficial do provedor
        if (provider === "google-ai" || provider === "vertex") {
            const apiKey = googleAiKey.value();
            if (!apiKey) {
                throw new https_1.HttpsError("internal", "Chave do provedor Google AI não configurada no servidor.");
            }
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new https_1.HttpsError("internal", `Falha ao buscar modelos do Google AI: HTTP ${response.status}. ${errText.slice(0, 150)}`);
            }
            const slug = provider === "google-ai" ? "google_ai" : provider.replace("-", "_");
            let defaultModel = typeof firestoreConfig[`admin_model_${slug}`] === "string" ? firestoreConfig[`admin_model_${slug}`].trim() : "";
            if (!defaultModel && Array.isArray(firestoreConfig.providers)) {
                const provObj = firestoreConfig.providers.find((p) => p && p.id === provider);
                if (provObj && provObj.model)
                    defaultModel = String(provObj.model).trim();
            }
            const apiData = await response.json();
            if (apiData && Array.isArray(apiData.models)) {
                let result = apiData.models
                    .filter((m) => {
                    if (!m.name)
                        return false;
                    const cleanId = m.name.replace(/^models\//, '');
                    const idLower = cleanId.toLowerCase();
                    const isTts = idLower.includes('tts') || idLower.includes('audio') || idLower.includes('speech');
                    if (target === 'tts')
                        return isTts;
                    const isNonText = isTts || idLower.includes('image') || idLower.includes('embed') || idLower.includes('bidi') || idLower.includes('realtime');
                    if (isNonText)
                        return false;
                    return cleanId.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent');
                })
                    .map((m) => {
                    const cleanId = m.name.replace(/^models\//, '');
                    const isConfiguredDefault = defaultModel && cleanId === defaultModel;
                    return {
                        value: cleanId,
                        label: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
                        status: isConfiguredDefault ? 'Oficial' : (target === 'tts' ? 'Voz' : 'Estável')
                    };
                });
                // Se houver um modelo padrão configurado no Firestore, move ele para o topo da lista (índice 0)
                if (defaultModel) {
                    const defaultIndex = result.findIndex((m) => m.value === defaultModel);
                    if (defaultIndex > 0) {
                        const [defaultItem] = result.splice(defaultIndex, 1);
                        result.unshift(defaultItem);
                    }
                }
                return { models: result, defaultModel, valid: true };
            }
            throw new https_1.HttpsError("internal", "Resposta inesperada da API Google AI: campo 'models' ausente.");
        }
        throw new https_1.HttpsError("invalid-argument", `Provedor '${provider}' não é suportado em getAvailableModelsProxy.`);
    }
    catch (err) {
        if (err?.httpErrorCode || err?.code)
            throw err;
        console.error("Erro inesperado na getAvailableModelsProxy:", err);
        throw new https_1.HttpsError("internal", err?.message || "Erro interno ao buscar modelos de IA.");
    }
});
//# sourceMappingURL=index.js.map