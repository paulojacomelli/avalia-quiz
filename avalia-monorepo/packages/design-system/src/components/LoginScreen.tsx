import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateApiKey } from '@avalia/services';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ApiErrorDetail, AiProvider } from '@avalia/core';

interface LoginScreenProps {
  onPlayPrebuilt: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  apiError?: ApiErrorDetail | null;
  onClearError?: () => void;
  title?: React.ReactNode;
  onLoginWithCode: (code: string, provider: AiProvider) => Promise<void>;
  onLoginWithApiKey: (key: string, provider: AiProvider) => Promise<void>;
}

interface ModelOption {
  value: string;
  label: string;
  status?: string;
  icon?: React.ReactNode;
}

const TEXT_MODELS: ModelOption[] = [
  { value: "gemini-3.5-flash", label: "gemini-3.5-flash" },
  { value: "gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite" },
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash", status: "Legado" },
  { value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite", status: "Legado" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro", status: "Legado" }
];

const DEEPSEEK_MODELS: ModelOption[] = [
  { value: "deepseek-chat", label: "deepseek-chat (V3)" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner (R1)" }
];

const GROQ_MODELS: ModelOption[] = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Rápido)" }
];

const OPENROUTER_MODELS: ModelOption[] = [
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Grátis)", status: "Grátis" },
  { value: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (Grátis)", status: "Grátis" },
  { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", status: "Pago" },
  { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", status: "Pago" },
  { value: "~anthropic/claude-fable-latest", label: "Claude Fable Latest", status: "Pago" },
  { value: "anthropic/claude-fable-5", label: "Claude Fable 5", status: "Pago" },
  { value: "nex-agi/nex-n2-pro:free", label: "Nex-N2-Pro (Grátis)", status: "Grátis" },
  { value: "nvidia/nemotron-3.5-content-safety:free", label: "Nemotron 3.5 Content Safety (Grátis)", status: "Grátis" },
  { value: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra (Grátis)", status: "Grátis" },
  { value: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra", status: "Pago" },
  { value: "qwen/qwen3.7-plus", label: "Qwen 3.7 Plus", status: "Pago" },
  { value: "qwen/qwen3.7-max", label: "Qwen 3.7 Max", status: "Pago" },
  { value: "minimax/minimax-m3", label: "MiniMax M3", status: "Pago" },
  { value: "stepfun/step-3.7-flash", label: "Step 3.7 Flash", status: "Pago" },
  { value: "anthropic/claude-opus-4.8-fast", label: "Claude Opus 4.8 Fast", status: "Pago" },
  { value: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", status: "Pago" },
  { value: "anthropic/claude-opus-4.7-fast", label: "Claude Opus 4.7 Fast", status: "Pago" },
  { value: "x-ai/grok-build-0.1", label: "Grok Build 0.1", status: "Pago" },
  { value: "perceptron/perceptron-mk1", label: "Perceptron MK1", status: "Pago" },
  { value: "inclusionai/ring-2.6-1t", label: "Ring 2.6 1T", status: "Pago" }
];

const TTS_MODELS: ModelOption[] = [
  { value: "gemini-3.1-flash-tts-preview", label: "gemini-3.1-flash-tts-preview", status: "Pré-lançamento" },
  { value: "gemini-2.5-flash-preview-tts", label: "gemini-2.5-flash-preview-tts", status: "Legado" },
  { value: "gemini-2.5-pro-preview-tts", label: "gemini-2.5-pro-preview-tts", status: "Legado" }
];

const LIVE_MODELS: ModelOption[] = [
  { value: "gemini-3.1-flash-live-preview", label: "gemini-3.1-flash-live-preview", status: "Pré-lançamento" },
  { value: "gemini-2.5-flash-native-audio-preview-12-2025", label: "gemini-2.5-flash-native-audio-preview", status: "Legado" }
];

const CODE_TEXT_MODELS: ModelOption[] = [
  { value: "gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite" }
];

const CODE_TTS_MODELS: ModelOption[] = [
  { value: "gemini-3.1-flash-tts-preview", label: "gemini-3.1-flash-tts-preview", status: "Pré-lançamento" }
];

const CODE_LIVE_MODELS: ModelOption[] = [
  { value: "gemini-3.1-flash-live-preview", label: "gemini-3.1-flash-live-preview", status: "Pré-lançamento" }
];

const getStatusColor = (status: string) => {
  if (status === 'Estável' || status === 'Grátis' || status.includes('0.00') || status.toLowerCase().includes('grátis')) {
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  }
  if (status === 'Pré-lançamento') {
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
  if (status === 'Legado') {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
  if (status === 'Pago' || status.includes('$') || status.includes('/') || /\d/.test(status)) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const CustomSelect = ({ value, onChange, options, placeholder, disableCustom = false }: { value: string, onChange: (v: string) => void, options: ModelOption[], placeholder?: string, disableCustom?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium flex justify-between items-center"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0 flex items-center justify-center">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : (value === 'custom' ? 'Outro Modelo (Personalizado)' : placeholder)}
          {selectedOption?.status && selectedOption.status !== 'Estável' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(selectedOption.status)} shrink-0 uppercase tracking-wider font-bold`}>
              {selectedOption.status}
            </span>
          )}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-white/5 last:border-0 ${value === opt.value ? 'bg-jw-blue/10 text-jw-blue' : 'text-gray-300'}`}
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                  {opt.label}
                </span>
                {opt.status && opt.status !== 'Estável' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(opt.status)} uppercase tracking-wider font-bold`}>
                    {opt.status}
                  </span>
                )}
              </button>
            ))}
            {!disableCustom && (
              <button
                type="button"
                onClick={() => { onChange('custom'); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/10 flex items-center gap-2 ${value === 'custom' ? 'bg-jw-blue/10 text-jw-blue' : 'text-gray-400'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span className="text-sm font-medium italic">Outro Modelo (Personalizado)</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onPlayPrebuilt,
  isLoading = false,
  loadingMessage = "Carregando...",
  apiError = null,
  onClearError,
  title = <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">Aval<span className="text-[#F7D33C]">ia</span> Quiz</h1>,
  onLoginWithCode,
  onLoginWithApiKey
}) => {
  const [loginMode, setLoginMode] = useState<'code' | 'api'>('code');
  const [provider, setProvider] = useState<AiProvider>('google-ai');
  const [accessCode, setAccessCode] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>(OPENROUTER_MODELS);

  useEffect(() => {
    const fetchOpenRouterPrices = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) return;
        const json = await response.json();
        if (json && Array.isArray(json.data)) {
          const apiModels = json.data;
          setOpenRouterModels(prev => 
            prev.map(model => {
              const apiMatch = apiModels.find((m: any) => m.id === model.value);
              if (apiMatch && apiMatch.pricing) {
                const promptPrice = parseFloat(apiMatch.pricing.prompt) * 1000000;
                const completionPrice = parseFloat(apiMatch.pricing.completion) * 1000000;
                if (promptPrice === 0 && completionPrice === 0) {
                  return { ...model, status: 'Grátis' };
                } else {
                  const format = (val: number) => {
                    if (val === 0) return '0';
                    if (val < 0.01) return val.toFixed(4);
                    if (val < 0.1) return val.toFixed(3);
                    return val.toFixed(2);
                  };
                  return { 
                    ...model, 
                    status: `$${format(promptPrice)}/$${format(completionPrice)}` 
                  };
                }
              }
              return model;
            })
          );
        }
      } catch (err) {
        console.warn('Erro ao carregar preços do OpenRouter:', err);
      }
    };

    fetchOpenRouterPrices();
  }, []);

  const [textModelOption, setTextModelOption] = useState(() => {
    const saved = localStorage.getItem('gemini_text_model');
    return TEXT_MODELS.some(m => m.value === saved) ? saved || 'gemini-3.5-flash' : (saved ? 'custom' : 'gemini-3.5-flash');
  });
  const [customTextModel, setCustomTextModel] = useState(() => {
    const saved = localStorage.getItem('gemini_text_model');
    return TEXT_MODELS.some(m => m.value === saved) || !saved ? '' : saved;
  });

  const [ttsModelOption, setTtsModelOption] = useState(() => {
    const saved = localStorage.getItem('gemini_tts_model');
    return TTS_MODELS.some(m => m.value === saved) ? saved || 'gemini-2.5-flash-preview-tts' : (saved ? 'custom' : 'gemini-2.5-flash-preview-tts');
  });
  const [customTtsModel, setCustomTtsModel] = useState(() => {
    const saved = localStorage.getItem('gemini_tts_model');
    return TTS_MODELS.some(m => m.value === saved) || !saved ? '' : saved;
  });

  const [liveModelOption, setLiveModelOption] = useState(() => {
    const saved = localStorage.getItem('gemini_live_model');
    return LIVE_MODELS.some(m => m.value === saved) ? saved || 'gemini-3.1-flash-live-preview' : (saved ? 'custom' : 'gemini-3.1-flash-live-preview');
  });
  const [customLiveModel, setCustomLiveModel] = useState(() => {
    const saved = localStorage.getItem('gemini_live_model');
    return LIVE_MODELS.some(m => m.value === saved) || !saved ? '' : saved;
  });

  useEffect(() => {
    const modelToSave = textModelOption === 'custom' ? customTextModel : textModelOption;
    if (modelToSave) localStorage.setItem('gemini_text_model', modelToSave);
  }, [textModelOption, customTextModel]);

  useEffect(() => {
    const modelToSave = ttsModelOption === 'custom' ? customTtsModel : ttsModelOption;
    if (modelToSave) localStorage.setItem('gemini_tts_model', modelToSave);
  }, [ttsModelOption, customTtsModel]);

  useEffect(() => {
    const modelToSave = liveModelOption === 'custom' ? customLiveModel : liveModelOption;
    if (modelToSave) localStorage.setItem('gemini_live_model', modelToSave);
  }, [liveModelOption, customLiveModel]);

  // Modelos do modo código agora são definidos de forma flexível pelo usuário na tela

  // Auto-detecção de provedor baseada no prefixo da chave
  useEffect(() => {
    if (loginMode === 'api' && inputKey.trim()) {
      const key = inputKey.trim();
      if (key.startsWith('AIzaSy')) {
        setProvider('google-ai');
      } else if (key.startsWith('gsk_')) {
        setProvider('groq');
      } else if (key.startsWith('sk-or-')) {
        setProvider('openrouter');
      } else if (key.startsWith('sk-')) {
        setProvider('deepseek');
      }
    }
  }, [inputKey, loginMode]);

  // Sincroniza o modelo padrão se o provedor mudar
  useEffect(() => {
    let models = TEXT_MODELS;
    if (provider === 'deepseek') models = DEEPSEEK_MODELS;
    else if (provider === 'groq') models = GROQ_MODELS;
    else if (provider === 'openrouter') models = openRouterModels;

    const isModelValid = models.some(m => m.value === textModelOption) || textModelOption === 'custom';
    if (!isModelValid && models.length > 0) {
      setTextModelOption(models[0].value);
    }
  }, [provider, textModelOption, openRouterModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginMode === 'code') {
      const cleanedCode = accessCode.trim();
      if (!cleanedCode) {
        setError('Por favor, insira o código de acesso.');
        return;
      }

      setIsValidating(true);
      try {
        await onLoginWithCode(cleanedCode, provider);
      } catch (err: any) {
        setError(err.message || 'Erro ao validar o código.');
      } finally {
        setIsValidating(false);
      }
    } else {
      const cleanedKey = inputKey.trim();
      if (!cleanedKey) {
        setError('Por favor, insira uma chave de API.');
        return;
      }

      
      setIsValidating(true);
      try {
        await onLoginWithApiKey(cleanedKey, provider);
      } catch (err: any) {
        setError(err.message || 'Erro ao validar a chave. Verifique sua conexão.');
      } finally {
        setIsValidating(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#0d0d0d] p-4 py-8 sm:py-12 animate-fade-in font-sans overflow-y-auto">
      <div className="bg-[#1a1a1a] w-full max-w-md my-auto p-10 md:p-12 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center relative overflow-hidden shrink-0">

        {/* Borda superior decorativa com brilho */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent-primary)] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>

        {/* Ícone de Escudo em destaque (Wrapper) */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 border border-white/5 relative" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}>
          <div className="absolute inset-0 rounded-full blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}></div>
          <div className="relative w-14 h-14 rounded-full border flex items-center justify-center text-[var(--accent-primary)]" style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8" style={{ filter: 'drop-shadow(0 0 8px var(--accent-primary))' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        {title}
        <p className="text-sm text-gray-400 font-medium mb-10 text-center opacity-80">Acesse o sistema para começar o quiz.</p>

        {/* Barra de Abas: Alterna entre Login por Código ou Chave de API */}
        <div className="w-full bg-black/40 p-1 rounded-2xl flex gap-1 mb-10 border border-white/5">
          <button
            onClick={() => { setLoginMode('code'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'code' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            Código
          </button>
          <button
            onClick={() => { setLoginMode('api'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'api' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Chave API
          </button>
        </div>


        <form onSubmit={handleSubmit} className="w-full space-y-8">
          <div className="animate-fade-in flex flex-col text-left space-y-6">
            {loginMode === 'code' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Código de Acesso</label>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                  placeholder="Digite o código..."
                  className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium"
                />
                <p className="mt-2 text-[11px] text-gray-500 font-medium opacity-60">Não tem um código? Solicite ao administrador do sistema.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Provedor de API</label>
              <CustomSelect
                value={provider}
                onChange={(val) => {
                  const nextProvider = val as AiProvider;
                  setProvider(nextProvider);
                  let models = TEXT_MODELS;
                  if (nextProvider === 'deepseek') models = DEEPSEEK_MODELS;
                  else if (nextProvider === 'groq') models = GROQ_MODELS;
                  else if (nextProvider === 'openrouter') models = openRouterModels;
                  
                  if (models.length > 0) {
                    setTextModelOption(models[0].value);
                  }
                }}
                options={[
                  { 
                    value: "google-ai", 
                    label: "Google",
                    icon: (
                      <svg viewBox="0 0 24 24" className="w-4 h-4">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )
                  },
                  { 
                    value: "deepseek", 
                    label: "DeepSeek",
                    icon: (
                      <img src="/deepseek-01.svg" className="w-4 h-4 object-contain" alt="DeepSeek" />
                    )
                  },
                  { 
                    value: "groq", 
                    label: "Groq",
                    icon: (
                      <img src="/groq.svg" className="w-4 h-4 object-contain" alt="Groq" />
                    )
                  },
                  { 
                    value: "openrouter", 
                    label: "OpenRouter",
                    icon: (
                      <img src="/openrouter.svg" className="w-4 h-4 object-contain" alt="OpenRouter" />
                    )
                  }
                ]}
                placeholder="Selecione o provedor..."
                disableCustom={true}
              />
            </div>

            {loginMode === 'api' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">
                  {provider === 'deepseek' ? "Chave de API do DeepSeek" : provider === 'groq' ? "Chave de API do Groq" : provider === 'openrouter' ? "Chave de API do OpenRouter" : "Chave de API do Google"}
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => { setInputKey(e.target.value); setError(''); }}
                  placeholder={provider === 'deepseek' ? "sk-..." : provider === 'groq' ? "gsk_..." : provider === 'openrouter' ? "sk-or-..." : "AIzaSy..."}
                  className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium mb-3"
                />
                <div className="flex justify-end">
                  <a
                    href={provider === 'deepseek' ? "https://platform.deepseek.com/api_keys" : provider === 'groq' ? "https://console.groq.com/keys" : provider === 'openrouter' ? "https://openrouter.ai/keys" : "https://aistudio.google.com/app/api-keys"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#F7D33C] hover:opacity-80 flex items-center gap-1 transition-opacity"
                  >
                    Obter chave
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Seletores de Modelos - Apenas na aba de Chave API */}
          {loginMode !== 'code' && (
            <div className="animate-fade-in flex flex-col relative z-20 mt-4 space-y-4">
            {/* Text Model Selection */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Agente de Texto</label>
              <CustomSelect
                value={textModelOption}
                onChange={setTextModelOption}
                options={provider === 'deepseek' ? DEEPSEEK_MODELS : provider === 'groq' ? GROQ_MODELS : provider === 'openrouter' ? openRouterModels : TEXT_MODELS}
                placeholder="Selecione um modelo..."
              />
              {textModelOption === 'custom' && (
                  <input
                    type="text"
                    value={customTextModel}
                    onChange={(e) => setCustomTextModel(e.target.value)}
                    placeholder={
                      provider === 'deepseek' ? "Digite o nome do modelo (ex: deepseek-chat)" :
                      provider === 'groq' ? "Digite o nome do modelo (ex: llama-3.3-70b-versatile)" :
                      provider === 'openrouter' ? "Digite o nome do modelo (ex: google/gemini-2.5-flash)" :
                      "Digite o nome do modelo (ex: gemini-4.0-flash)"
                    }
                    className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium"
                  />
                )}
              </div>

              {provider !== 'deepseek' && provider !== 'groq' && provider !== 'openrouter' && (
                <>
                  {/* TTS Model Selection */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Motor de Voz (TTS)</label>
                    <CustomSelect
                      value={ttsModelOption}
                      onChange={setTtsModelOption}
                      options={TTS_MODELS}
                      placeholder="Selecione um modelo TTS..."
                    />
                    {ttsModelOption === 'custom' && (
                      <input
                        type="text"
                        value={customTtsModel}
                        onChange={(e) => setCustomTtsModel(e.target.value)}
                        placeholder="Digite o nome do modelo TTS"
                        className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium"
                      />
                    )}
                  </div>

                  {/* Live Model Selection */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2 tracking-wide text-left">
                      Modo Live (Multimodal)
                      <span className="bg-gray-700/30 border border-gray-600/50 text-[9px] px-1.5 py-0.5 rounded text-gray-400">Em Breve</span>
                    </label>
                    <CustomSelect
                      value={liveModelOption}
                      onChange={setLiveModelOption}
                      options={LIVE_MODELS}
                      placeholder="Selecione um modelo Live..."
                    />
                    {liveModelOption === 'custom' && (
                      <input
                        type="text"
                        value={customLiveModel}
                        onChange={(e) => setCustomLiveModel(e.target.value)}
                        placeholder="Digite o nome do modelo Live"
                        className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-bold animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-jw-blue text-white font-bold text-base py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-jw-blue/20 disabled:opacity-50 flex justify-center items-center"
          >
            {isValidating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Entrar"}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-8">
          <div className="flex-1 h-[1px] bg-white/5"></div>
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">ou</span>
          <div className="flex-1 h-[1px] bg-white/5"></div>
        </div>

        <button
          onClick={onPlayPrebuilt}
          className="w-full group relative overflow-hidden bg-white/5 border border-white/10 hover:border-jw-blue/30 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-jw-blue/0 via-jw-blue/5 to-jw-blue/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#F7D33C]">
            <path d="M11.584 2.376a.75.75 0 01.832 0l8.32 5.547a.75.75 0 01.416.677V20.25a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V8.6a.75.75 0 01.416-.677l8.32-5.547zM12 4.732 5.25 9.232V19.5h13.5V9.232L12 4.732z" />
          </svg>
          Explorar Biblioteca
        </button>

        <div className="mt-14 text-[10px] uppercase font-bold tracking-[0.10em] text-gray-600 opacity-60">
          Nenhuma informação pessoal sua será armazenada
        </div>
      </div>

      {/* Tela de Sobreposição de Carregamento (Exibida durante ações demoradas) */}
      {
        isLoading && (
          <div className="fixed inset-0 z-[60] bg-[#121212]/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in text-center px-4 cursor-wait">
            <div className="relative mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-gray-800 rounded-full"></div>
              <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-t-jw-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-6 tracking-wide">Aguarde...</h2>
            <p className="text-gray-400 text-sm md:text-base max-w-lg italic font-serif opacity-80 leading-relaxed animate-pulse">
              "{loadingMessage}"
            </p>
          </div>
        )
      }

      {/* Modal de Erro Global (Exibe mensagens de erro vindas da API ou Firebase) */}
      {
        apiError && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1e1e1e] max-w-md w-full rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden">
              <div className="bg-red-900/20 p-6 border-b border-red-500/20 flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-200">{apiError.title}</h3>
                  <p className="text-red-300/70 text-sm font-mono mt-1">Código: {apiError.code}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-300 opacity-90 leading-relaxed">{apiError.message}</p>
                <div className="bg-black/30 p-4 rounded-lg text-sm opacity-80 border border-gray-600/30 text-gray-400">
                  <strong>Sugestão:</strong> {apiError.solution}
                </div>
                <button
                  onClick={onClearError}
                  className="w-full py-3 bg-jw-blue hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors shadow-lg"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};
