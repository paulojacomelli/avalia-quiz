import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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

const MAPPING = {
  // avalia-quiz
  'GENERAL':        'Acadêmico',
  'Geral':          'Acadêmico',
  'General':        'Acadêmico',
  'Academico':      'Acadêmico',
  'ACADEMIC':       'Acadêmico',

  'ENTERTAINMENT':  'Entretenimento',
  'Entretenimento': 'Entretenimento',

  'ARTS_CULTURE':   'Arte & Cultura',
  'Arte & Cultura': 'Arte & Cultura',
  'ARTS':           'Arte & Cultura',

  'GEOPOLITICS':    'Geopolítica',
  'Geopolitica':    'Geopolítica',

  'ANIMALS':        'Mundo Animal',
  'Mundo Animal':   'Mundo Animal',

  'OTHER':          'Outro Assunto',
  'Outro Assunto':  'Outro Assunto',
  'Assunto Específico': 'Outro Assunto',
  'Outro':          'Outro Assunto',

  // avalia-jw-quiz
  'BOOKS':               'Livros da Bíblia',
  'Livros da Biblia':    'Livros da Bíblia',

  'HISTORY_JW':          'A História',
  'A Historia':          'A História',

  // avalia-kids-quiz
  'COLORS_SHAPES':       'Cores & Formas',
  'Cores & Formas':      'Cores & Formas'
};

async function run() {
    console.log("🔐 Autenticando com Firebase Auth (Anônimo)...");
    await signInAnonymously(auth);
    console.log("✅ Autenticado com sucesso.");

    console.log("🔍 Buscando quizzes gravados em generated_quizzes...");
    const colRef = collection(db, "generated_quizzes");
    const snapshot = await getDocs(colRef);
    console.log(`📊 Encontrados ${snapshot.size} documentos.`);

    let updatedCount = 0;
    let batch = writeBatch(db);
    let operationInBatch = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const currentTheme = data.theme;

        if (!currentTheme) continue;

        const targetTheme = MAPPING[currentTheme];

        if (targetTheme && targetTheme !== currentTheme) {
            console.log(`✏️ [${docSnap.id}] Alterando theme: "${currentTheme}" -> "${targetTheme}"`);
            batch.update(docSnap.ref, { theme: targetTheme });
            updatedCount++;
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

    console.log(`\n🎉 Finalizado! ${updatedCount} documentos foram atualizados com sucesso.`);
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Erro:", err);
    process.exit(1);
});
