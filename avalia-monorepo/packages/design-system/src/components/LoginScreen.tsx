import React, { useState, useEffect } from 'react';
import { validateApiKey, db } from '@avalia/services';
import { doc, getDoc } from 'firebase/firestore';
import { ApiErrorDetail, AiProvider } from '@avalia/core';
import { AppLogo } from './AppLogo';
import { renderFormattedAppTitle } from './FormattedTitle';

interface LoginScreenProps {
  onPlayPrebuilt: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  apiError?: ApiErrorDetail | null;
  onClearError?: () => void;
  appName?: string;
  title?: React.ReactNode;
  logo?: React.ReactNode;
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
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash (Novo)", status: "Alta Performance" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash", status: "Recomendado" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", status: "Rápido" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", status: "Econômico" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", status: "Estável" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", status: "Estável" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", status: "Avançado" }
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
        className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium flex justify-between items-center"
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
                className={`w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-white/5 last:border-0 ${value === opt.value ? 'bg-brand-blue/10 text-brand-blue' : 'text-gray-300'}`}
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
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-t border-white/10 flex items-center gap-2 ${value === 'custom' ? 'bg-brand-blue/10 text-brand-blue' : 'text-gray-400'}`}
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
  appName = 'Avalia Quiz',
  title,
  logo,
  onPlayPrebuilt,
  isLoading = false,
  loadingMessage = 'Carregando...',
  apiError = null,
  onClearError,
  onLoginWithCode,
  onLoginWithApiKey
}) => {
  const [provider, setProvider] = useState<AiProvider>('google-ai');
  const [loginMode, setLoginMode] = useState<'code' | 'api'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string>('');
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
    return TEXT_MODELS.some(m => m.value === saved) ? saved || 'gemini-2.5-flash' : (saved ? 'custom' : 'gemini-2.5-flash');

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

        {/* Logo oficial padronizado do ecossistema */}
        <div className="mb-8">
          <AppLogo className="w-28 h-28" />
        </div>

        {title || (
          <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">
            {renderFormattedAppTitle(appName)}
          </h1>
        )}
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
                  className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium"
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
                      <svg viewBox="0 0 500 500" className="w-4 h-4 object-contain">
                        <path fill="#4d6bfe" d="M435.32,143.14c-6.24-1.12-11.87,15.99-28.34,14.98-12.14-.74-23.36,3.27-31.93,12.24-3.2-13.98-11.1-19.75-23.6-24.83-13.18-5.36-11.1-17.02-15.92-22.72-8.45-9.98-29.94,44.83,7.82,75.95,2.72,2.24,5.78,4.13,7.98,7.25l-5.98,17.07c-13.03-4.74-23.99-12.85-33.5-23-12.38-13.22-24.45-26.22-39.88-36.03-5.45-3.47-10.66-8.77-9.57-15.82,1.08-7.05,6.97-11.73,13.36-14.84-.02-2.16-2.6-3.91-4.73-4.39-22.48-5.09-46.26,10.9-55.15,10.34l-26.92-1.7c-20.26.4-39.97,3.89-56.99,15.4-29.76,20.14-46.47,53.96-46.1,89.94.37,34.86,12.71,67.42,36.35,92.77,15.39,16.5,33.16,29.44,54.18,37.72,23.53,9.28,47.79,10.45,72.78,7.12,21.39-2.85,40.48-11.26,57.22-26.01,16.06,7.23,39.57,7.85,54.92,2.86,4.69-1.52,8.21-9.45,3.76-12.38-7.71-5.09-16.69-7.69-25.14-11.18-2.49-1.03-4.83-1.12-6.39-4l6.85-7.51c11.99-13.15,22.22-27.14,29.1-43.77,7.63-18.44,12.3-37.35,14.21-57.35.26-2.75-2.14-7.68.85-9.73,34.48-3.6,55.7-28.94,55.62-63.25,0-2.78-3.13-4.82-4.88-5.13ZM254.8,341.17c-11.82-9.54-44.52-34.79-52.49-29.47-4.47,2.98-1,13.35,4.19,20.83,1.32,1.9,2.22,4.42,1.35,6.65-2.45,6.24-17.59,6.42-27.64,1.4-42.11-21.02-66.79-65.87-70.41-112.54-.24-3.1-.98-8.72,2.05-10.13,6.63-3.08,14.69-3.43,22.25-2.74,30.73,2.79,58.23,16.23,80.93,36.8,12.39,11.22,21.66,24.16,31.03,38.03,15.11,23.47,32.09,45.86,55.25,61.66-17.33,2.12-33.45.07-46.52-10.48ZM271.98,247.89c0-2.43,1.97-4.4,4.4-4.4s4.4,1.97,4.4,4.4-1.97,4.4-4.4,4.4-4.4-1.97-4.4-4.4ZM297.46,270.24c-15.39-10.88-4.09-21.41-9.53-28.62-5.67-7.51-16.81-2.97-17.88-8.81-.81-4.41,4.24-7.19,8.42-7.45,15.03-.95,27.48,13.49,35.8,26.42,3.24,5.04,6.54,9.89,7.59,16.04-6.45,6.78-16.71,7.84-24.39,2.42Z"/>
                      </svg>
                    )
                  },
                  { 
                    value: "groq", 
                    label: "Groq",
                    icon: (
                      <svg viewBox="0 0 453 453" className="w-4 h-4 object-contain">
                        <path fill="#f45036" d="M251.67,0c103.8,5.06,199.26,98.29,201.33,203.35v50.33c-6.37,102.84-98.84,197.34-203.35,199.32h-50.33C95.98,446.6,5.11,355.41,0,251.67v-52.35C6.35,96.23,98.84,2.44,203.35,0h48.32Z"/>
                        <path fill="#fefefe" d="M286.92,278.53l.23-97.15c.08-33.19-29.12-58.48-60.62-58.53-32.91-.05-60.07,26.74-60.96,59.35s24.54,62.06,58.32,62.5l35.46.47-.03,36.62-29.83.02c-34.44.02-65.78-16.13-84.12-42.56-20.1-28.97-23.75-64.93-9.1-96.98,18.95-41.47,61.99-64.73,107.23-57.01,41.53,7.09,78.06,42.57,80.23,87.86l.28,102.83c.12,43.58-31.75,80.31-73.05,91.47-33.74,9.12-67.39-.85-92.26-25.34l25.89-26.03c17.89,17.14,41.58,22.95,64.87,13.57,18.89-7.6,37.39-26.49,37.45-51.09Z"/>
                      </svg>
                    )
                  },
                  { 
                    value: "openrouter", 
                    label: "OpenRouter",
                    icon: (
                      <svg viewBox="0 0 362.15 306.13" className="w-4 h-4 object-contain">
                        <path fill="#93a3b8" d="M251.94,306.13l-.79-28.35c-47.94,2.45-89.25-4.54-128.56-32.25l-24.23-17.07c-15.07-11.05-30.2-20.77-46.88-29.41-16.87-6.67-33.79-11.31-51.48-14.19v-63.31c33.64-4.42,59.4-14.46,86.77-33.83l42.63-29.84c36.07-25.25,80.45-31.84,124.15-29.23l.22-28.65,108.38,62.85-108,62.53-.67-32.05c-17.69-1.89-34.89-1.98-52.25,1.45-15.53,3.52-28.85,10.34-41.72,19.55-19.26,13.78-37.97,27.21-57.78,39.58,20.5,12.82,38.33,25.77,56.99,39.15,19.46,13.96,40.87,22,64.87,21.18l27.62-.94.64-32.4,108.42,62.74-108.34,62.48Z"/>
                      </svg>
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
                  className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium mb-3"
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
                    className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium"
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
                        className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium"
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
                        className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium"
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
            className="w-full text-white font-bold text-base py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex justify-center items-center"
            style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}
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
          className="w-full group relative overflow-hidden bg-white/5 border border-white/10 hover:border-brand-blue/30 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/0 via-brand-blue/5 to-brand-blue/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
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
              <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-t-brand-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
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
                  className="w-full py-3 bg-brand-blue hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors shadow-lg"
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
