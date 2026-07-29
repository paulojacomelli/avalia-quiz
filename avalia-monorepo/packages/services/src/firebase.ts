import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, getDoc, serverTimestamp, where, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
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
 * Obtém ou gera um Visitor Client ID único (estilo Google Analytics / MS Clarity)
 * Persistido no localStorage do navegador para identificar dispositivos/visitantes únicos.
 */
export const getClientId = (): string => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'ssr-client';
    }
    try {
        let clientId = localStorage.getItem('avalia_client_id');
        if (!clientId) {
            clientId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('avalia_client_id', clientId);
        }
        return clientId;
    } catch {
        return 'unknown-client';
    }
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
            clientId: metadata?.clientId || getClientId(),
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
                limit(100)
            );
        } else {
            q = query(
                collection(db, QUIZZES_COLLECTION),
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
/**
 * Salva um evento de telemetria / log no Firestore.
 */
export const logTelemetryEvent = async (entry: TelemetryLogEntry): Promise<void> => {
    const isoDate = new Date().toISOString();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }

    const anonymousUid = auth.currentUser?.uid ?? null;
    const clientId = entry.clientId || getClientId();
    const payload = cleanUndefined({
        ...entry,
        isoDate,
        createdAt: serverTimestamp(),
        userAgent,
        anonymousUid,
        clientId,
    });

    try {
        await addDoc(collection(db, TELEMETRY_COLLECTION), payload);
        console.log('[TELEMETRY] Log gravado com sucesso no Firestore:', entry.eventType, clientId, userAgent);
    } catch (error) {
        console.error('[TELEMETRY ERROR] Erro ao salvar log no Firestore:', error);
        throw error;
    }
};

/**
 * Busca todos os logs de telemetria no Firestore para o Painel Administrativo.
 */
export const fetchTelemetryLogs = async (limitCount: number = 1000): Promise<TelemetryLogEntry[]> => {
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }

    try {
        const qSimple = query(collection(db, TELEMETRY_COLLECTION), orderBy("createdAt", "desc"), limit(limitCount));
        const snapshot = await getDocs(qSimple);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const tsVal = data.isoDate || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (data.timestamp || 'Recente'));
            return {
                id: doc.id,
                ...data,
                timestamp: tsVal
            };
        }) as TelemetryLogEntry[];
    } catch (error) {
        console.error('[TELEMETRY ERROR] Erro ao buscar logs do Firestore:', error);
        throw error;
    }
};

/**
 * Escuta os logs de telemetria no Firestore em tempo real.
 */
export const subscribeTelemetryLogs = (
    onLogsUpdate: (logs: TelemetryLogEntry[]) => void,
    limitCount: number = 1000
): (() => void) => {
    const q = query(collection(db, TELEMETRY_COLLECTION), orderBy("createdAt", "desc"), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            const tsVal = data.isoDate || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (data.timestamp || 'Recente'));
            return {
                id: doc.id,
                ...data,
                timestamp: tsVal
            };
        }) as TelemetryLogEntry[];
        onLogsUpdate(logs);
    }, (error) => {
        console.error('[TELEMETRY REALTIME ERROR] Erro no listener em tempo real:', error);
    });
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



/**
 * Atualiza a lista de perguntas de um quiz no Firestore (por exemplo, ao descartar uma questão no admin).
 */
export const updateSavedQuizQuestions = async (quizId: string, updatedQuestions: any[]): Promise<boolean> => {
    try {
        if (quizId && !quizId.startsWith('local_')) {
            const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
            await updateDoc(quizRef, { questions: updatedQuestions });
        }
        return true;
    } catch (error) {
        console.error("Erro ao atualizar questões do quiz no Firestore:", error);
        return false;
    }
};

/**
 * Exclui um quiz por completo do Firestore.
 */
export const deleteSavedQuiz = async (quizId: string): Promise<boolean> => {
    try {
        if (quizId && !quizId.startsWith('local_')) {
            const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
            await deleteDoc(quizRef);
        }
        return true;
    } catch (error) {
        console.error("Erro ao excluir quiz do Firestore:", error);
        return false;
    }
};

/**
 * Verifica se o usuário autenticado possui credencial de administrador cadastrada no Firestore.
 */
export const checkIsUserAdmin = async (email?: string | null, uid?: string | null): Promise<boolean> => {
    if (!email && !uid) return false;

    // 1. Tenta por UID direto do documento (ex: /admins/89oIauVjACPcLkhW0yq030VFNlk2)
    if (uid) {
        try {
            const adminUidRef = doc(db, 'admins', uid);
            const uidSnap = await getDoc(adminUidRef);
            if (uidSnap.exists() && uidSnap.data()?.active !== false) {
                return true;
            }
        } catch (e) {
            console.warn("Aviso ao validar admin por UID:", e);
        }
    }

    // 2. Tenta por E-mail no ID do documento (ex: /admins/paulo.jacomelli2001@gmail.com)
    if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        try {
            const adminDocRef = doc(db, 'admins', normalizedEmail);
            const docSnap = await getDoc(adminDocRef);
            if (docSnap.exists() && docSnap.data()?.active !== false) {
                return true;
            }
        } catch (e) {
            console.warn("Aviso ao validar admin por E-mail:", e);
        }
    }

    return false;
};

