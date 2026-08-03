import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../apps/avalia-quiz/.env");

if (existsSync(envPath)) {
  const envConfig = readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?\s*$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("❌ Erro de Segurança: Variáveis de ambiente do Firebase (FIREBASE_API_KEY / FIREBASE_PROJECT_ID) não configuradas.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function resolveThemeLabel(mode) {
    if (!mode || typeof mode !== 'string') return '';
    return mode.trim();
}

async function run() {
    console.log("🔐 Autenticando com Firebase Auth (Anônimo)...");
    await signInAnonymously(auth);
    console.log("✅ Autenticado com sucesso.");

    // 1. Migração da coleção generated_quizzes
    console.log("\n🔍 Buscando quizzes gravados em generated_quizzes...");
    const colRef = collection(db, "generated_quizzes");
    const snapshot = await getDocs(colRef);
    console.log(`📊 Encontrados ${snapshot.size} documentos em generated_quizzes.`);

    let updatedQuizzes = 0;
    let batch = writeBatch(db);
    let operationInBatch = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const currentTheme = data.theme;
        if (!currentTheme) continue;

        const targetTheme = resolveThemeLabel(currentTheme, data.appName);

        if (targetTheme !== currentTheme) {
            console.log(`✏️ [generated_quizzes] [${docSnap.id}] (${data.appName || 'N/A'}) theme: "${currentTheme}" -> "${targetTheme}"`);
            batch.update(docSnap.ref, { theme: targetTheme });
            updatedQuizzes++;
            operationInBatch++;

            if (operationInBatch >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                operationInBatch = 0;
            }
        }
    }

    if (operationInBatch > 0) {
        await batch.commit();
        batch = writeBatch(db);
        operationInBatch = 0;
    }

    // 2. Migração da coleção telemetry_logs
    console.log("\n🔍 Buscando logs gravados em telemetry_logs...");
    const telemetryRef = collection(db, "telemetry_logs");
    const telemetrySnapshot = await getDocs(telemetryRef);
    console.log(`📊 Encontrados ${telemetrySnapshot.size} documentos em telemetry_logs.`);

    let updatedLogs = 0;

    for (const docSnap of telemetrySnapshot.docs) {
        const data = docSnap.data();
        const currentTopic = data.topic;
        if (!currentTopic) continue;

        const targetTopic = resolveThemeLabel(currentTopic, data.appName);

        if (targetTopic !== currentTopic) {
            console.log(`✏️ [telemetry_logs] [${docSnap.id}] (${data.appName || 'N/A'}) topic: "${currentTopic}" -> "${targetTopic}"`);
            batch.update(docSnap.ref, { topic: targetTopic });
            updatedLogs++;
            operationInBatch++;

            if (operationInBatch >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                operationInBatch = 0;
            }
        }
    }

    if (operationInBatch > 0) {
        await batch.commit();
    }

    console.log(`\n🎉 Finalizado! Quizzes atualizados: ${updatedQuizzes} | Logs atualizados: ${updatedLogs}`);
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Erro:", err);
    process.exit(1);
});
