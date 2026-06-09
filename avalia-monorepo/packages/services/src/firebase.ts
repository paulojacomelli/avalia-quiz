import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { GeneratedQuiz, QuizQuestion } from "../types";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const QUIZZES_COLLECTION = "generated_quizzes";

/**
 * Faz upload dos áudios TTS (base64) para o Firebase Storage.
 * Retorna o quiz com audioUrl preenchido e audioBase64 removido.
 * Falhas individuais de upload são silenciadas (a questão fica sem URL).
 */
export const uploadQuizAudiosToStorage = async (
    quiz: GeneratedQuiz,
    docId: string
): Promise<GeneratedQuiz> => {
    const updatedQuestions: QuizQuestion[] = await Promise.all(
        quiz.questions.map(async (question, index) => {
            if (!question.audioBase64) return question;

            try {
                const storagePath = `quiz-audio/${docId}/q_${index}.mp3`;
                const audioRef = ref(storage, storagePath);

                // uploadString aceita base64 puro (sem prefixo data:)
                await uploadString(audioRef, question.audioBase64, 'base64', {
                    contentType: 'audio/mpeg',
                });

                const audioUrl = await getDownloadURL(audioRef);

                return {
                    ...question,
                    audioUrl,
                    audioBase64: undefined, // libera memória — URL é a fonte de verdade
                };
            } catch (error) {
                console.error(`Erro no upload do áudio da questão ${index}:`, error);
                // Mantém audioBase64 como fallback local se o upload falhar
                return question;
            }
        })
    );

    return { ...quiz, questions: updatedQuestions };
};

/**
 * Salva um quiz gerado no Firestore.
 * Retorna o docId para uso no upload de áudios.
 * audioBase64 nunca é persistido no Firestore — apenas audioUrl.
 */
export const saveGeneratedQuiz = async (
    quiz: GeneratedQuiz,
    appName: string,
    theme?: string,
    subTopic?: string
): Promise<string | null> => {
    try {
        const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), {
            title: quiz.title,
            focalTheme: quiz.focalTheme,
            keywords: quiz.keywords,
            keywordList: quiz.keywords || [],
            appName,
            theme: theme || "Geral",
            subTopic: subTopic || "",
            createdAt: serverTimestamp(),
            // Persiste questões sem audioBase64 — apenas texto e audioUrl (se houver)
            questions: quiz.questions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex,
                correctAnswerText: q.correctAnswerText,
                reference: q.reference,
                hint: q.hint,
                explanation: q.explanation,
                glosa: q.glosa,
                audioUrl: q.audioUrl,   // URL do Storage (se já foi feito upload)
                // audioBase64 deliberadamente omitido
            })),
        });
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar quiz no Firestore:", error);
        return null;
    }
};

/**
 * Fetches the latest unique keywords from the community to improve variety.
 */
export const getGlobalKeywords = async (max: number = 35, appName?: string): Promise<string[]> => {
    try {
        let q;
        if (appName) {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                orderBy("createdAt", "desc"),
                limit(100)
            );
        } else {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                orderBy("createdAt", "desc"),
                limit(100)
            );
        }
        const snapshot = await getDocs(q);
        const keywordsSet = new Set<string>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.keywordList && Array.isArray(data.keywordList)) {
                data.keywordList.forEach((kw: string) => {
                    if (keywordsSet.size < max) keywordsSet.add(kw);
                });
            }
        });

        return Array.from(keywordsSet);
    } catch (error) {
        console.error("Error fetching global keywords:", error);
        return [];
    }
};

/**
 * Returns a random quiz from the community library, optionally filtered by theme or subTopic.
 */
export const getRandomPrebuiltQuiz = async (appName: string, theme?: string, subTopic?: string): Promise<GeneratedQuiz | null> => {
    try {
        let q;
        if (theme && subTopic) {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                where("theme", "==", theme),
                where("subTopic", "==", subTopic),
                limit(50)
            );
        } else if (theme) {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                where("theme", "==", theme),
                limit(50)
            );
        } else {
            q = query(
                collection(db, QUIZZES_COLLECTION),
                where("appName", "==", appName),
                limit(100)
            );
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const randomIndex = Math.floor(Math.random() * snapshot.docs.length);
        const data = snapshot.docs[randomIndex].data() as any;

        return {
            title: data.title,
            questions: data.questions, // inclui audioUrl se já foi salvo
            keywords: data.keywordList || [],
            focalTheme: data.focalTheme || "Comunidade"
        } as GeneratedQuiz;
    } catch (error) {
        console.error("Error fetching prebuilt quiz:", error);
        return null;
    }
};

/**
 * Identifies which themes and subtopics have available quizzes.
 */
export const getAvailableLibraryThemes = async (appName: string): Promise<Record<string, string[]>> => {
    try {
        const q = query(
            collection(db, QUIZZES_COLLECTION),
            where("appName", "==", appName),
            limit(200)
        );
        const snapshot = await getDocs(q);
        const themesMap: Record<string, Set<string>> = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data() as any;
            const theme = data.theme || "Geral";
            const sub = data.subTopic || "";

            if (!themesMap[theme]) themesMap[theme] = new Set();
            if (sub) themesMap[theme].add(sub);
        });

        const result: Record<string, string[]> = {};
        Object.keys(themesMap).forEach(key => {
            result[key] = Array.from(themesMap[key]);
        });

        return result;
    } catch (error) {
        console.error("Error identifying available themes:", error);
        return {};
    }
};
