import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCPAeHhZc9NtO5o4gfKP9K-hLHvDVBwm8s",
    authDomain: "avalia-jw-quiz.firebaseapp.com",
    projectId: "avalia-jw-quiz",
    storageBucket: "avalia-jw-quiz.firebasestorage.app",
    messagingSenderId: "524494397074",
    appId: "1:524494397074:web:023f5bc417595aebf5904b"
};

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
