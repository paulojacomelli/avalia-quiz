import React, { useEffect, useState, useRef } from 'react';
import VLibras from './VLibras';

/**
 * Página de teste da integração nativa do VLibras.
 * Rota: /vlibras
 * 
 * Valida:
 * - Carregamento do motor WebGL via window.VLibras.Player
 * - Aplicação do Monkey Patch de rota do UnityLoader
 * - Sinalização imperativa via ref.play()
 */
const VLibrasTest: React.FC = () => {
    const [counter, setCounter]     = useState(0);
    const [pronto, setPronto]       = useState(false);
    const vlibrasRef                = useRef<any>(null);
    const intervalRef               = useRef<any>(null);

    // Dispara uma glosa de teste assim que o player fica pronto,
    // verificando a cada segundo se o ref já está disponível
    useEffect(() => {
        const verificar = setInterval(() => {
            if (vlibrasRef.current?.isReady) {
                clearInterval(verificar);
                setPronto(true);

                // Dispara imediatamente ao ficar pronto
                vlibrasRef.current.play('OI');
                setCounter(1);

                // Continua a cada 10 segundos
                intervalRef.current = setInterval(() => {
                    vlibrasRef.current?.play('OI');
                    setCounter(prev => prev + 1);
                }, 10000);
            }
        }, 1000);

        return () => {
            clearInterval(verificar);
            clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-4 z-[9999] overflow-auto">
            <div className="max-w-4xl w-full flex flex-col items-center">

                <header className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
                        VLibras <span className="text-blue-500">Native Test</span>
                    </h1>
                    <p className="text-slate-400 text-lg">Validando inicialização WebGL e sinalização de glosa</p>
                </header>

                {/* Área do avatar — o VLibras gerencia o #gameContainer internamente */}
                <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <VLibras
                        ref={vlibrasRef}
                        active={true}
                        containerId="vlibras-test-container"
                        avatar="icaro"
                    />

                    {/* Indicador de status baseado no estado real do player */}
                    <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className={`w-3 h-3 rounded-full ${pronto ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-yellow-500'} animate-pulse`}></div>
                        <span className="text-white font-mono text-sm font-bold uppercase tracking-wider">
                            {pronto ? `Sinalizando: "Olá" (${counter})` : 'Aguardando player...'}
                        </span>
                    </div>
                </div>

                {/* Cards explicativos da arquitetura */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-blue-400 font-bold mb-2">Motor WebGL</h3>
                        <p className="text-slate-400 text-sm">Instanciado via new window.VLibras.Player() com Monkey Patch na rota do UnityLoader.</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-blue-400 font-bold mb-2">Persistência</h3>
                        <p className="text-slate-400 text-sm">Instância única mantida via CSS (display none/flex) para evitar re-carregamento da Unity.</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-blue-400 font-bold mb-2">Sinalização</h3>
                        <p className="text-slate-400 text-sm">Glosa enviada via player.play() somente após isReady = true.</p>
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-10 text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Voltar para o Quiz
                </button>
            </div>
        </div>
    );
};

export default VLibrasTest;
