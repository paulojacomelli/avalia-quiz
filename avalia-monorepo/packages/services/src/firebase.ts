import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, getDoc, serverTimestamp, where, doc, updateDoc } from "firebase/firestore";
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
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
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
        await addDoc(collection(db, TELEMETRY_COLLECTION), payload);
    } catch (error) {
        console.warn("Falha ao gravar evento no Firestore, salvando no backup local:", error);
        try {
            const existingStr = localStorage.getItem('avalia_telemetry_logs_backup');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const localEntry = {
                ...entry,
                isoDate,
                timestamp: isoDate,
                userAgent,
            };
            existing.push(localEntry);
            localStorage.setItem('avalia_telemetry_logs_backup', JSON.stringify(existing));
        } catch (e) {
            console.warn("Falha ao salvar log no localStorage:", e);
        }
    }
};

/**
 * Migra os logs guardados no localStorage para o Firestore (executado uma única vez ao carregar).
 */
export const syncLocalLogsToFirestore = async (): Promise<void> => {
    try {
        const storedStr = localStorage.getItem('avalia_telemetry_logs_backup');
        if (!storedStr) return;
        
        const localLogs: TelemetryLogEntry[] = JSON.parse(storedStr);
        if (!Array.isArray(localLogs) || localLogs.length === 0) return;

        if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
        }

        console.log(`Migrando ${localLogs.length} logs do localStorage para o Firestore...`);
        for (const entry of localLogs) {
            const { id, ...cleanEntry } = entry;
            const payload = cleanUndefined({
                ...cleanEntry,
                isoDate: cleanEntry.isoDate || new Date().toISOString(),
                createdAt: serverTimestamp(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            });
            await addDoc(collection(db, TELEMETRY_COLLECTION), payload);
        }

        // Limpa o localStorage após a migração bem-sucedida para o Firestore
        localStorage.removeItem('avalia_telemetry_logs_backup');
        console.log("Migração de logs locais para o Firestore concluída com sucesso.");
    } catch (error) {
        console.warn("Erro ao migrar logs locais para o Firestore:", error);
    }
};

/**
 * Busca logs de telemetria diretamente do Firestore (fonte única da verdade) com fallback local.
 */
export const fetchTelemetryLogs = async (limitCount: number = 1000): Promise<TelemetryLogEntry[]> => {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
        }

        // Tenta sincronizar registros pendentes do localStorage antes da busca
        await syncLocalLogsToFirestore();

        const qSimple = query(collection(db, TELEMETRY_COLLECTION), orderBy("createdAt", "desc"), limit(limitCount));
        const snapshot = await getDocs(qSimple);

        const remoteLogs = snapshot.docs.map(doc => {
            const data = doc.data();
            const tsVal = data.isoDate || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (data.timestamp || 'Recente'));
            return {
                id: doc.id,
                ...data,
                timestamp: tsVal
            };
        }) as TelemetryLogEntry[];

        const localBackupStr = localStorage.getItem('avalia_telemetry_logs_backup');
        let localLogs: TelemetryLogEntry[] = [];
        if (localBackupStr) {
            try {
                localLogs = JSON.parse(localBackupStr);
            } catch {}
        }

        return [...localLogs, ...remoteLogs];
    } catch (error) {
        console.warn("Erro ao carregar logs remotos do Firestore, utilizando backup local:", error);
        const localBackupStr = localStorage.getItem('avalia_telemetry_logs_backup');
        if (localBackupStr) {
            try {
                return JSON.parse(localBackupStr);
            } catch {}
        }
        return [];
    }
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
 * Verifica se o usuário autenticado possui credencial de administrador cadastrada no Firebase.
 */
export const checkIsUserAdmin = async (email?: string | null): Promise<boolean> => {
    if (!email) return false;
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const adminDocRef = doc(db, 'admins', normalizedEmail);
        const docSnap = await getDoc(adminDocRef);
        if (docSnap.exists() && docSnap.data()?.active !== false) {
            return true;
        }
        // Se a coleção 'admins' não contiver documentos, autoriza por padrão qualquer usuário autenticado via Firebase Auth
        const adminsCollSnap = await getDocs(query(collection(db, 'admins'), limit(1)));
        return adminsCollSnap.empty;
    } catch (error) {
        console.warn("Aviso ao validar permissão de admin no Firestore:", error);
        return true;
    }
};

