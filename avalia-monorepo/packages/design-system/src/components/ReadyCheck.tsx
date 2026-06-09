import React from 'react';

export interface ReadyCheckProps {
    isVisible: boolean;
    title: string;
    onConfirm: () => void;
    onDiscard: () => void;
}

export function ReadyCheck({ isVisible, title, onConfirm, onDiscard }: ReadyCheckProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl text-center border border-gray-800 max-w-sm w-full flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-jw-blue flex items-center justify-center mb-6 text-jw-blue shadow-[0_0_15px_rgba(66,135,245,0.3)]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6">Preparado?</h2>
                <div className="w-full mb-8">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TEMA</span>
                    <h3 className="text-lg font-medium text-gray-200 mt-2 leading-tight">{title}</h3>
                </div>
                <button 
                    onClick={onConfirm} 
                    className="w-full py-3 bg-jw-blue text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    Estou Pronto
                </button>
                <button 
                    onClick={onDiscard} 
                    className="mt-4 text-sm text-gray-500 hover:text-white transition-colors"
                >
                    Descartar Partida
                </button>
            </div>
        </div>
    );
}
