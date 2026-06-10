import React, { useImperativeHandle, forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ARQUITETURA — VLibras Avalia JW Quiz(Player Puro)
 *
 * O bundle oficial vlibras-plugin.js exporta window.VLibras = { Player, Widget, Plugin }.
 * Usamos apenas VLibras.Player — a camada primitiva de renderização WebGL — sem instanciar
 * o Widget ou Plugin, evitando poluição de DOM e overhead desnecessário.
 */

declare global {
  interface Window {
    VLibras: {
      Player: any;
      Widget: any;
      Plugin: any;
    };
  }
}

export interface VLibrasHandle {
  play: (glosa: string) => void;
  setEmotion: (emotion: 'pensa' | 'feliz' | 'triste' | 'duvida') => void;
  setRegion: (region: string) => void;
  setSpeed: (speed: number) => void;
  changeAvatar: (avatar: string) => void;
  pause: () => void;
  continue: () => void;
  repeat: () => void;
  isReady: boolean;
}

interface VLibrasProps {
  active: boolean;
  containerId?: string;
  avatar?: string;
  onReady?: (ready: boolean) => void;
}

// URL única e estável para Assets (WebGL/Unity) — Mantida na CDN do Governo
const VLIBRAS_CDN = 'https://vlibras.gov.br/app';

// Script local compilado a partir do vlibras-player-webjs
const VLIBRAS_SCRIPT_URL = '/js/vlibras-player.js';

// Singleton: evita reinjetar o script em re-renders ou HMR
let scriptLoaded = false;

    const carregarScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (scriptLoaded || window.VLibras?.Player) {
      scriptLoaded = true;
      resolve();
      return;
    }

    if (document.querySelector(`script[src="${VLIBRAS_SCRIPT_URL}"]`)) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const s = document.createElement('script');
    s.src = VLIBRAS_SCRIPT_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => { 
      scriptLoaded = true; 
      resolve(); 
    };
    s.onerror = () => {
      console.warn('Falha ao carregar vlibras-player.js local, tentando CDN oficial...');
      // Fallback para CDN oficial se o script local falhar
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      fallbackScript.async = true;
      fallbackScript.crossOrigin = 'anonymous';
      fallbackScript.onload = () => {
        scriptLoaded = true;
        resolve();
      };
      fallbackScript.onerror = () => reject(new Error('Falha ao carregar vlibras-plugin.js de ambas as fontes'));
      document.body.appendChild(fallbackScript);
    };
    document.body.appendChild(s);
  });

const VLibras = forwardRef<VLibrasHandle, VLibrasProps>(
  ({ active, containerId, avatar = 'icaro', onReady }, ref) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [erroMsg, setErroMsg] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

    // Efeito para localizar o container do portal de forma reativa e persistente
    useEffect(() => {
      if (!containerId || !active) {
        setPortalElement(null);
        return;
      }

      let mounted = true;
      let attempts = 0;

      const findContainer = () => {
        if (!mounted) return;
        const el = document.getElementById(containerId);
        if (el) {
          setPortalElement(el);
        } else if (attempts < 20) { // Tenta por até 2 segundos (20 * 100ms)
          attempts++;
          setTimeout(findContainer, 100);
        }
      };

      findContainer();
      return () => { mounted = false; };
    }, [containerId, active]);

    useEffect(() => {
      if (playerRef.current) {
        setIsReady(true);
        setStatus('ready');
        return;
      }

      let cancelado = false;
      setStatus('loading');
      setErroMsg(null);

      const bootstrap = async () => {
        try {
          await carregarScript();
          const player: any = await new Promise((resolve, reject) => {
            const inicio = Date.now();
            const checar = () => {
              if (cancelado) { reject(new Error('Cancelado')); return; }
              if (window.VLibras?.Player) { resolve(window.VLibras.Player); return; }
              if (Date.now() - inicio > 15_000) {
                reject(new Error('window.VLibras.Player não encontrado após 15s.'));
                return;
              }
              setTimeout(checar, 400);
            };
            checar();
          });

          // Redireciona o carregador Unity para a CDN oficial.
          // Sem esse override, o player busca /target/UnityLoader.js localmente (404).
          player.prototype._getTargetScript = function () {
            return `${VLIBRAS_CDN}/target/UnityLoader.js`;
          };

          // Também faz override do _initializeTarget para garantir que targetPath está correto
          player.prototype._initializeTarget = function () {
            const targetSetup = `${VLIBRAS_CDN}/target/playerweb.json`;
            const targetScript = document.createElement('script');

            targetScript.src = this._getTargetScript();
            targetScript.onload = () => {
              if (typeof UnityLoader !== 'undefined') {
                this.player = UnityLoader.instantiate('gameContainer', targetSetup, {
                  compatibilityCheck: (_, accept, deny) => {
                    if (UnityLoader.SystemInfo.hasWebGL) {
                      return accept();
                    }
                    console.error('Seu navegador não suporta WEBGL');
                    deny();
                  },
                });
                this.playerManager.setPlayerReference(this.player);
              }
            };

            targetScript.onerror = () => {
              console.error('Falha ao carregar UnityLoader de:', this._getTargetScript());
            };

            document.body.appendChild(targetScript);
          };

          const instancia = new player({
            targetPath: VLIBRAS_CDN + '/target',
            avatar,
          });

          const wrapperNode = containerRef.current;
          if (!wrapperNode) throw new Error('Container não disponível.');

          instancia.on('load', () => {
            if (cancelado) return;
            setIsReady(true);
            setStatus('ready');
          });

          instancia.load(wrapperNode);
          playerRef.current = instancia;

        } catch (err: any) {
          if (cancelado) return;
          console.error('VLibras: Falha na inicialização:', err);
          setStatus('error');
          setErroMsg(err?.message ?? 'Erro ao inicializar o VLibras. Verifique a conexão com a CDN do VLibras (vlibras.gov.br).');
        }
      };

      bootstrap();
      return () => { cancelado = true; };
    }, [retry, avatar]);

    useImperativeHandle(ref, () => ({
      play: (glosa: string) => {
        if (playerRef.current && isReady) {
          console.log('[VLibras] play:', glosa);
          playerRef.current.play(glosa, false);
        } else {
          console.warn('[VLibras] Player not ready or glosa is empty');
        }
      },
      setEmotion: (emotion: string) => {
        console.log('[VLibras] setEmotion:', emotion);
        playerRef.current?.applyEmotion?.(emotion);
      },
      setRegion: (region: string) => {
        console.log('[VLibras] setRegion:', region);
        playerRef.current?.setRegion?.(region);
      },
      setSpeed: (speed: number) => {
        console.log('[VLibras] setSpeed:', speed);
        playerRef.current?.setSpeed?.(speed);
      },
      changeAvatar: (avatar: string) => {
        console.log('[VLibras] changeAvatar:', avatar);
        if (playerRef.current?.changeAvatar) {
          playerRef.current.changeAvatar(avatar);
        } else {
          console.warn('[VLibras] changeAvatar não disponível');
        }
      },
      pause: () => {
        console.log('[VLibras] pause');
        playerRef.current?.pause?.();
      },
      continue: () => {
        console.log('[VLibras] continue');
        playerRef.current?.continue?.();
      },
      repeat: () => {
        console.log('[VLibras] repeat');
        playerRef.current?.repeat?.();
      },
      isReady,
    }), [isReady]);

    // Efeito para disparar onReady quando o player estiver pronto
    useEffect(() => {
      if (isReady && onReady) {
        onReady(true);
      }
    }, [isReady, onReady]);

    // Efeito para garantir que o avatar ocupe todo o espaço (ResizeObserver para suportar trocas de container)
    useEffect(() => {
      if (!isReady || !containerRef.current) return;

      const resize = () => {
        const wrapper = containerRef.current;
        if (!wrapper) return;
        const canvas = wrapper.querySelector('canvas');
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'cover';
          canvas.style.display = 'block';
          canvas.setAttribute('width', wrapper.clientWidth.toString());
          canvas.setAttribute('height', wrapper.clientHeight.toString());
        }
      };

      // Executa imediatamente
      resize();

      // Observa mudanças de tamanho no wrapper
      const observer = new ResizeObserver(resize);
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, [isReady, containerId]);

    const playerUI = (
      <div
        style={{
          display: active ? 'flex' : 'none',
          width: '100%',
          height: '100%',
          minHeight: '150px',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          ref={containerRef}
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'absolute', 
            top: 0, 
            left: 0,
            overflow: 'hidden'
          }}
        />
        {active && status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {status === 'error' ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <span className="text-red-400 text-xs font-bold">{erroMsg}</span>
                <button
                  type="button"
                  onClick={() => { playerRef.current = null; scriptLoaded = false; setRetry(p => p + 1); }}
                  className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="opacity-30 animate-pulse text-white text-[10px] uppercase tracking-widest">
                Carregando Avatar...
              </div>
            )}
          </div>
        )}
      </div>
    );

    // Se houver um portalElement definido, teleporta o player para lá
    if (active && portalElement) {
      return createPortal(playerUI, portalElement);
    }

    return playerUI;
  }
);

export default VLibras;
