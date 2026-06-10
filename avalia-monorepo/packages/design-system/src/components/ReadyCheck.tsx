import React, { useState, useEffect, useRef } from 'react';
import { AiProvider } from '@avalia/core';
import { LiveApiSession, LiveSessionPhase } from '@avalia/services';

export interface ReadyCheckProps {
    isVisible: boolean;
    title: string;
    onConfirm: () => void;
    onDiscard: () => void;
    openEndedMode?: 'normal' | 'live';
    apiKey?: string | null;
    provider?: AiProvider;
}

export function ReadyCheck({ 
    isVisible, 
    title, 
    onConfirm, 
    onDiscard,
    openEndedMode = 'normal',
    apiKey = null,
    provider = 'google-ai'
}: ReadyCheckProps) {
    const [livePhase, setLivePhase] = useState<LiveSessionPhase>('idle');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');
    const liveSessionRef = useRef<LiveApiSession | null>(null);
    const hasTriggeredRef = useRef(false);

    // Resetar estado de controle se o modal se torna visivel/invisivel
    useEffect(() => {
        if (!isVisible) {
            cleanupLiveSession();
        } else {
            hasTriggeredRef.current = false;
        }
    }, [isVisible]);

    useEffect(() => {
        return () => {
            cleanupLiveSession();
        };
    }, []);

    const cleanupLiveSession = () => {
        if (liveSessionRef.current) {
            liveSessionRef.current.stop();
            liveSessionRef.current = null;
        }
        setLivePhase('idle');
        setLiveTranscript('');
        setLiveModelTranscript('');
    };

    const triggerStartGame = () => {
        if (hasTriggeredRef.current) return;
        hasTriggeredRef.current = true;
        cleanupLiveSession();
        onConfirm();
    };

    const isStartCommand = (text: string) => {
        const normalized = text.toLowerCase().trim();
        const startKeywords = ['iniciar', 'começar', 'comecar', 'sim', 'bora', 'vamos', 'confirmar', 'start', 'go', 'pronto'];
        return startKeywords.some(keyword => normalized.includes(keyword));
    };

    const startLiveSession = () => {
        if (!apiKey) {
            console.warn('API Key necessária para iniciar o modo Live.');
            return;
        }
        cleanupLiveSession();
        setLivePhase('connecting');
        setLiveTranscript('');
        setLiveModelTranscript('');

        const session = new LiveApiSession({
            onPhaseChange: (phase) => setLivePhase(phase),
            onTranscript: (text, isFinal) => {
                setLiveTranscript(text);
                if (isStartCommand(text)) {
                    triggerStartGame();
                }
            },
            onModelTranscript: (text) => {
                setLiveModelTranscript(text);
                if (text.toUpperCase().includes('INICIAR')) {
                    triggerStartGame();
                }
            },
            onEvaluationReady: (userTranscript) => {
                if (isStartCommand(userTranscript)) {
                    triggerStartGame();
                }
            },
            onError: (msg) => {
                console.error('Erro na conexão Live preliminar:', msg);
                setLivePhase('error');
            },
        });

        liveSessionRef.current = session;
        const liveModel = localStorage.getItem('gemini_live_model') || undefined;

        // Custom instruction para a IA iniciar a conversa e pedir confirmacao
        const systemInstruction = [
            'Você é o assistente de introdução do quiz.',
            'Diga de forma curta e simpática que está pronto e solicite que o usuário confirme dizendo "Iniciar" ou "Começar" para darmos a largada.',
            'Quando ele disser "Iniciar", "Começar" ou algo que expresse a confirmação de início, responda EXCLUSIVAMENTE com a palavra "INICIAR" em caixa alta, e absolutamente nada mais.',
            'Seja extremamente conciso e breve.'
        ].join(' ');

        session.start(apiKey, 'Olá! Peça confirmação para iniciar.', liveModel, systemInstruction);
    };

    if (!isVisible) return null;

    const isLive = openEndedMode === 'live';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl text-center border border-gray-800 max-w-sm w-full flex flex-col items-center">
                
                {/* ICON / STATUS INDICATOR */}
                {!isLive || livePhase === 'idle' ? (
                    <div className="w-12 h-12 rounded-full border-2 border-brand-blue flex items-center justify-center mb-6 text-brand-blue shadow-[0_0_15px_rgba(66,135,245,0.3)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </div>
                ) : livePhase === 'connecting' ? (
                    <div className="w-12 h-12 rounded-full border-2 border-brand-blue/30 border-t-brand-blue flex items-center justify-center mb-6 animate-spin">
                    </div>
                ) : livePhase === 'speaking' ? (
                    <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-6 animate-pulse border border-brand-blue/30 shadow-[0_0_15px_rgba(66,135,245,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-blue">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                    </div>
                ) : livePhase === 'listening' ? (
                    <div className="w-12 h-12 rounded-full bg-red-600/10 border-2 border-red-500 flex items-center justify-center mb-6 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-red-400">
                            <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-red-500/50 flex items-center justify-center mb-6 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-6">
                    {isLive ? 'Modo Live' : 'Preparado?'}
                </h2>

                <div className="w-full mb-8">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TEMA</span>
                    <h3 className="text-lg font-medium text-gray-200 mt-2 leading-tight">{title}</h3>
                </div>

                {/* INTERFACE DO MODO LIVE */}
                {isLive ? (
                    <div className="w-full space-y-4">
                        {livePhase === 'idle' && (
                            <button 
                                onClick={startLiveSession} 
                                className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                                Iniciar Modo Live
                            </button>
                        )}

                        {livePhase === 'connecting' && (
                            <div className="py-2 text-sm text-gray-400">
                                Conectando ao modo Live...
                            </div>
                        )}

                        {livePhase === 'speaking' && (
                            <div className="space-y-2 py-2">
                                <div className="text-sm text-gray-400">Dando instruções por voz...</div>
                                {liveModelTranscript && (
                                    <div className="text-xs text-gray-500 italic max-w-xs mx-auto">
                                        "{liveModelTranscript}"
                                    </div>
                                )}
                            </div>
                        )}

                        {livePhase === 'listening' && (
                            <div className="space-y-3 w-full">
                                <div className="text-sm text-red-400 font-bold tracking-wide animate-pulse">
                                    Ouvindo... Diga "Iniciar"
                                </div>
                                {liveTranscript && (
                                    <div className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-xs italic text-gray-300 min-h-[40px] flex items-center justify-center">
                                        "{liveTranscript}"
                                    </div>
                                )}
                            </div>
                        )}

                        {livePhase === 'error' && (
                            <div className="space-y-3">
                                <div className="text-xs text-red-400">Falha ao conectar por voz.</div>
                                <button 
                                    onClick={startLiveSession} 
                                    className="w-full py-2 bg-red-900/30 border border-red-700 text-red-300 font-bold rounded-lg text-sm hover:bg-opacity-80 transition-all"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}

                    </div>
                ) : (
                    /* INTERFACE NORMAL */
                    <button 
                        onClick={onConfirm} 
                        className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        Estou Pronto
                    </button>
                )}

                <button 
                    onClick={() => {
                        cleanupLiveSession();
                        onDiscard();
                    }} 
                    className="mt-6 text-sm text-gray-500 hover:text-white transition-colors"
                >
                    Descartar Partida
                </button>
            </div>
        </div>
    );
}
