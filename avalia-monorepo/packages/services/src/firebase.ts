import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { GeneratedQuiz, QuizQuestion, TelemetryLogEntry } from "../types";

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
export const auth = getAuth(app);

const QUIZZES_COLLECTION = "generated_quizzes";
const TELEMETRY_COLLECTION = "telemetry_logs";

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User | null> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Erro no login com Google:", error);
        throw error;
    }
};

export const logoutGoogle = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    }
};

export const subscribeAuthState = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Remove recursivamente propriedades com valor undefined para evitar erros no Firestore.
 */
function cleanUndefined(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    // Preservar objetos FieldValue (como serverTimestamp) sem destructurar suas propriedades internas
    if (typeof obj === 'object' && (obj._methodName || obj.constructor?.name === 'FieldValue' || '_delegate' in obj)) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (item !== null && typeof item === 'object') {
                return cleanUndefined(item);
            }
            return item;
        });
    }
    if (typeof obj === 'object') {
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
                if (obj[key] !== null && typeof obj[key] === 'object') {
                    newObj[key] = cleanUndefined(obj[key]);
                } else {
                    newObj[key] = obj[key];
                }
            }
        });
        return newObj;
    }
    return obj;
}

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
    subTopic?: string,
    metadata?: { clientId?: string | null; userAgent?: string; aiModel?: string }
): Promise<string | null> => {
    try {
        const rawData = {
            title: quiz.title,
            focalTheme: quiz.focalTheme,
            keywords: quiz.keywords,
            keywordList: quiz.keywords || [],
            appName,
            theme: theme || "Geral",
            subTopic: subTopic || "",
            createdAt: serverTimestamp(),
            clientId: metadata?.clientId || null,
            userAgent: metadata?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
            aiModel: metadata?.aiModel || null,
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
        };
        const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), cleanUndefined(rawData));
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

/**
 * Salva um evento de telemetria / log no Firestore e mantem um backup local no localStorage.
 */
export const logTelemetryEvent = async (entry: TelemetryLogEntry): Promise<void> => {
    const isoDate = new Date().toISOString();
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const localEntry: TelemetryLogEntry = {
        ...entry,
        id: localId,
        isoDate,
        timestamp: isoDate,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // 1. Backup em localStorage
    try {
        const storedStr = localStorage.getItem('avalia_telemetry_logs_backup') || '[]';
        const storedLogs: TelemetryLogEntry[] = JSON.parse(storedStr);
        storedLogs.unshift(localEntry);
        if (storedLogs.length > 250) storedLogs.pop();
        localStorage.setItem('avalia_telemetry_logs_backup', JSON.stringify(storedLogs));
    } catch {
        // ignora se localStorage falhar
    }

    // 2. Persistencia no Firestore
    try {
        const payload = cleanUndefined({
            ...entry,
            isoDate,
            createdAt: serverTimestamp(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        });
        await addDoc(collection(db, TELEMETRY_COLLECTION), payload);
    } catch (error) {
        console.warn("Falha ao gravar no Firestore, mantido backup local:", error);
    }
};

/**
 * Busca logs recentes de telemetria para o Painel Administrativo (mesclando Firestore + backup local).
 */
export const fetchTelemetryLogs = async (limitCount: number = 100): Promise<TelemetryLogEntry[]> => {
    let remoteLogs: TelemetryLogEntry[] = [];
    try {
        let snapshot;
        try {
            const q = query(
                collection(db, TELEMETRY_COLLECTION),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
            snapshot = await getDocs(q);
        } catch {
            const qSimple = query(collection(db, TELEMETRY_COLLECTION), limit(limitCount));
            snapshot = await getDocs(qSimple);
        }

        remoteLogs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.isoDate || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Recente')
            };
        }) as TelemetryLogEntry[];
    } catch (error) {
        console.warn("Erro ao carregar logs remotos:", error);
    }

    let localLogs: TelemetryLogEntry[] = [];
    try {
        const storedStr = localStorage.getItem('avalia_telemetry_logs_backup') || '[]';
        localLogs = JSON.parse(storedStr);
    } catch {
        localLogs = [];
    }

    const logMap = new Map<string, TelemetryLogEntry>();
    remoteLogs.forEach(item => { if (item.id) logMap.set(item.id, item); });
    localLogs.forEach(item => {
        if (item.id && !logMap.has(item.id)) {
            logMap.set(item.id, item);
        }
    });

    const combined = Array.from(logMap.values());
    combined.sort((a, b) => {
        const dateA = String(a.isoDate || a.timestamp || '');
        const dateB = String(b.isoDate || b.timestamp || '');
        return dateB.localeCompare(dateA);
    });

    return combined.slice(0, limitCount);
};

/**
 * Busca todos os quizzes salvos no Firestore para o Painel Administrativo.
 */
export const fetchSavedQuizzes = async (limitCount: number = 100): Promise<any[]> => {
    try {
        const q = query(
            collection(db, QUIZZES_COLLECTION),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Erro ao buscar quizzes salvos:", error);
        return [];
    }
};
