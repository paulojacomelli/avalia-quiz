import React, { useState, useEffect } from 'react';
import { validateApiKey, db, fetchClaudeModels, fetchDynamicModels, functions, httpsCallable } from '@avalia/services';
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
  onLoginWithCode: (code: string, provider: AiProvider, model?: string) => Promise<void>;
  onLoginWithApiKey: (key: string, provider: AiProvider, model?: string) => Promise<void>;
}

interface ModelOption {
  value: string;
  label: string;
  status?: string;
  icon?: React.ReactNode;
}

interface ModelOption {
  value: string;
  label: string;
  status?: string;
  icon?: React.ReactNode;
}








const getStatusColor = (status: string) => {
  const lower = status.toLowerCase();
  if (status === 'Grátis' || lower === '$0.00/1m' || lower.includes('grátis')) {
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  }
  if (status === 'Estável') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (status === 'Pré-lançamento') {
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
  if (status === 'Legado') {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
  if (status.startsWith('$') || status === 'Pago' || status.includes('/') || /\d/.test(status)) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const CustomSelect = ({ value, onChange, options, placeholder, disableCustom = false }: { value: string, onChange: (v: string) => void, options: ModelOption[], placeholder?: string, disableCustom?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery('');
        }}
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
          <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 flex flex-col">
            {options.length > 5 && (
              <div className="p-2 border-b border-white/10 bg-[#222]">
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar modelo..."
                    className="w-full bg-[#161616] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-56 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearchQuery(''); }}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-white/5 last:border-0 ${value === opt.value ? 'bg-brand-blue/10 text-brand-blue' : 'text-gray-300'}`}
                  >
                    <span className="text-sm font-medium flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0 flex items-center justify-center">{opt.icon}</span>}
                      {opt.label}
                    </span>
                    {opt.status && opt.status !== 'Estável' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(opt.status)} shrink-0 uppercase tracking-wider font-bold`}>
                        {opt.status}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-xs text-gray-500 text-center italic">
                  Nenhum modelo encontrado para "{searchQuery}"
                </div>
              )}
            </div>

            {!disableCustom && (
              <button
                type="button"
                onClick={() => { onChange('custom'); setIsOpen(false); setSearchQuery(''); }}
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
  const [provider, setProvider] = useState<AiProvider>('auto');
  const [isProvidersExpanded, setIsProvidersExpanded] = useState(false);
  const [loginMode, setLoginMode] = useState<'code' | 'api'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);


  const [textModelOption, setTextModelOption] = useState(() => {
    return localStorage.getItem('gemini_text_model') || 'default';
  });
  const [customTextModel, setCustomTextModel] = useState('');

  const [ttsModelOption, setTtsModelOption] = useState(() => {
    return localStorage.getItem('gemini_tts_model') || 'default';
  });
  const [customTtsModel, setCustomTtsModel] = useState('');



  useEffect(() => {
    const modelToSave = textModelOption === 'custom' ? customTextModel : textModelOption;
    if (modelToSave) localStorage.setItem('gemini_text_model', modelToSave);
  }, [textModelOption, customTextModel]);

  useEffect(() => {
    const modelToSave = ttsModelOption === 'custom' ? customTtsModel : ttsModelOption;
    if (modelToSave) localStorage.setItem('gemini_tts_model', modelToSave);
  }, [ttsModelOption, customTtsModel]);

  const [dynamicModels, setDynamicModels] = useState<ModelOption[]>([]);
  const [dynamicTtsModels, setDynamicTtsModels] = useState<ModelOption[]>([]);



  const [adminDefaultModel, setAdminDefaultModel] = useState<string>('');

  // Busca dinâmica de modelos em tempo real para qualquer provedor (Texto e TTS)
  useEffect(() => {
    const keyToUse = loginMode === 'api' ? (inputKey ? inputKey.trim() : '') : 'openrouter-free';

    if (loginMode === 'api' && keyToUse) {
      fetchDynamicModels(provider, keyToUse, 'text').then(fetched => {
        setDynamicModels(fetched && fetched.length > 0 ? fetched : []);
      });

      fetchDynamicModels(provider, keyToUse, 'tts').then(fetchedTts => {
        if (fetchedTts && fetchedTts.length > 0) {
          setDynamicTtsModels(fetchedTts);
          setTtsModelOption(prev => {
            const exists = fetchedTts.some(m => m.value === prev);
            return exists ? prev : fetchedTts[0].value;
          });
        } else {
          setDynamicTtsModels([]);
        }
      });
    } else {
      setDynamicModels([]);
      setDynamicTtsModels([]);
      setAdminDefaultModel('');
    }
  }, [provider, inputKey, loginMode]);

  // Obtém as opções consolidadas de modelos de texto para o CustomSelect (sem opções fictícias como 'default')
  // No modo 'code': modelos vêm EXCLUSIVAMENTE de getAvailableModelsProxy (populado após validação do PIN)
  // No modo 'api': modelos vêm de fetchDynamicModels via chave direta
  const textModelOptions = React.useMemo(() => {
    // Modelos reais do servidor têm prioridade máxima
    if (dynamicModels.length > 0) {
      return dynamicModels;
    }

    // No modo 'api' com openrouter, oferece opções estáticas conhecidas
    if (loginMode === 'api' && provider === 'openrouter') {
      return [
        { value: "openrouter/auto:free", label: "Modelos gratuitos", status: "Grátis" },
        { value: "openrouter/auto", label: "Modo automático", status: "Estável" }
      ];
    }

    // Em qualquer outro caso (incluindo modo 'code' aguardando resposta do servidor),
    // retorna lista vazia — nenhum fallback hardcoded.
    return [];
  }, [provider, loginMode, dynamicModels]);

  // Sincroniza o modelo de texto quando os modelos dinâmicos são carregados
  useEffect(() => {
    if (textModelOptions.length > 0) {
      setTextModelOption(prev => {
        // Se ainda não há modelo selecionado ou o modelo atual não existe na lista real, seleciona o primeiro
        if (!prev) return textModelOptions[0].value;
        const exists = textModelOptions.some(m => m.value === prev);
        return exists ? prev : textModelOptions[0].value;
      });
    }
  }, [provider, textModelOptions]);

  // Sincroniza o modelo TTS quando os modelos dinâmicos são carregados
  useEffect(() => {
    if (dynamicTtsModels.length > 0) {
      setTtsModelOption(prev => {
        const exists = dynamicTtsModels.some(m => m.value === prev);
        return exists ? prev : dynamicTtsModels[0].value;
      });
    } else {
      setTtsModelOption('');
    }
  }, [provider, dynamicTtsModels]);

  const [codeStep, setCodeStep] = useState<'code_input' | 'provider_select'>('code_input');

  const handleValidateCodeOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanedCode = accessCode.trim();
    if (!cleanedCode) {
      setError('Por favor, insira o código de acesso.');
      return;
    }

    setIsValidating(true);

    try {
      // 1. Valida o PIN via Cloud Function de forma serverless isolada
      const getModelsCallable = httpsCallable<{ secretCode: string; provider: string; target: string }, { models: ModelOption[]; valid?: boolean }>(functions, 'getAvailableModelsProxy');

      const textRes = await getModelsCallable({ secretCode: cleanedCode, provider: 'google-ai', target: 'text' });
      setDynamicModels(Array.isArray(textRes.data?.models) ? textRes.data.models : []);

      try {
        const ttsRes = await getModelsCallable({ secretCode: cleanedCode, provider: 'google-ai', target: 'tts' });
        setDynamicTtsModels(Array.isArray(ttsRes.data?.models) ? ttsRes.data.models : []);
      } catch {
        setDynamicTtsModels([]);
      }

      // Se validou com sucesso sem erro, avança exclusivamente a UI para a Etapa 2
      setCodeStep('provider_select');
      setError('');
    } catch (err: any) {
      if (err.message && (err.message.includes('offline') || err.code === 'unavailable')) {
        setError("Não foi possível conectar ao servidor. Utilize a aba 'Chave API' para entrar com sua chave.");
      } else {
        const cleanMsg = err.message ? err.message.replace(/^internal\s*/i, '').trim() : '';
        setError(cleanMsg || 'Código de acesso incorreto ou falha na conexão.');
      }
    } finally {
      setIsValidating(false);
    }
  };

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
        const customSelectedModel = textModelOption && textModelOption.trim() && textModelOption !== 'default' ? textModelOption.trim() : null;
        if (!customSelectedModel) {
          setError('Selecione um modelo de IA antes de entrar.');
          setIsValidating(false);
          return;
        }
        await onLoginWithCode(cleanedCode, provider, customSelectedModel);
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

      const selectedModel = textModelOption === 'custom' ? customTextModel : textModelOption;
      if (!selectedModel || !selectedModel.trim()) {
        setError('Por favor, selecione ou informe um modelo de IA.');
        return;
      }

      setIsValidating(true);
      try {
        await validateApiKey(cleanedKey, provider, selectedModel.trim());
        await onLoginWithApiKey(cleanedKey, provider, selectedModel.trim());
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

        {title || (
          <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight mt-2">
            {renderFormattedAppTitle(appName)}
          </h1>
        )}
        <p className="text-sm text-gray-400 font-medium mb-10 text-center opacity-80">Acesse o sistema para começar o quiz.</p>

        {/* Barra de Abas: Alterna entre Login por Código ou Chave de API */}
        <div className="w-full bg-black/40 p-1 rounded-2xl flex gap-1 mb-10 border border-white/5">
          <button
            onClick={() => {
              setLoginMode('code');
              setError('');
              setProvider('auto');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'code' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            Código
          </button>
          <button
            onClick={() => {
              setLoginMode('api');
              setError('');
              if (provider === 'auto') setProvider('google-ai');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'api' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Chave API
          </button>
        </div>


        <form onSubmit={loginMode === 'code' && codeStep === 'code_input' ? handleValidateCodeOnly : handleSubmit} className="w-full space-y-8">
          <div className="animate-fade-in flex flex-col text-left space-y-6">
            {loginMode === 'code' && codeStep === 'code_input' && (
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

            {(loginMode === 'api' || (loginMode === 'code' && codeStep === 'provider_select')) && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block tracking-wide text-left">Provedor de API</label>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      {
                        value: "auto",
                        label: "Auto",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" className="text-amber-400 fill-amber-400" />
                          </svg>
                        )
                      },
                      {
                        value: "google-ai",
                        label: "Google",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        )
                      },
                      {
                        value: "openai",
                        label: "OpenAI",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.372L15.115 7.2a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.403-.662zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                          </svg>
                        )
                      },
                      {
                        value: "deepseek",
                        label: "DeepSeek",
                        icon: (
                          <svg viewBox="0 0 500 500" className="w-4 h-4 shrink-0 object-contain">
                            <path fill="#4d6bfe" d="M435.32,143.14c-6.24-1.12-11.87,15.99-28.34,14.98-12.14-.74-23.36,3.27-31.93,12.24-3.2-13.98-11.1-19.75-23.6-24.83-13.18-5.36-11.1-17.02-15.92-22.72-8.45-9.98-29.94,44.83,7.82,75.95,2.72,2.24,5.78,4.13,7.98,7.25l-5.98,17.07c-13.03-4.74-23.99-12.85-33.5-23-12.38-13.22-24.45-26.22-39.88-36.03-5.45-3.47-10.66-8.77-9.57-15.82,1.08-7.05,6.97-11.73,13.36-14.84-.02-2.16-2.6-3.91-4.73-4.39-22.48-5.09-46.26,10.9-55.15,10.34l-26.92-1.7c-20.26.4-39.97,3.89-56.99,15.4-29.76,20.14-46.47,53.96-46.1,89.94.37,34.86,12.71,67.42,36.35,92.77,15.39,16.5,33.16,29.44,54.18,37.72,23.53,9.28,47.79,10.45,72.78,7.12,21.39-2.85,40.48-11.26,57.22-26.01,16.06,7.23,39.57,7.85,54.92,2.86,4.69-1.52,8.21-9.45,3.76-12.38-7.71-5.09-16.69-7.69-25.14-11.18-2.49-1.03-4.83-1.12-6.39-4l6.85-7.51c11.99-13.15,22.22-27.14,29.1-43.77,7.63-18.44,12.3-37.35,14.21-57.35.26-2.75-2.14-7.68.85-9.73,34.48-3.6,55.7-28.94,55.62-63.25,0-2.78-3.13-4.82-4.88-5.13Z" />
                          </svg>
                        )
                      },
                      {
                        value: "groq",
                        label: "Groq",
                        icon: (
                          <svg viewBox="0 0 453 453" className="w-4 h-4 shrink-0 object-contain">
                            <path fill="#f45036" d="M251.67,0c103.8,5.06,199.26,98.29,201.33,203.35v50.33c-6.37,102.84-98.84,197.34-203.35,199.32h-50.33C95.98,446.6,5.11,355.41,0,251.67v-52.35C6.35,96.23,98.84,2.44,203.35,0h48.32Z" />
                            <path fill="#fefefe" d="M286.92,278.53l.23-97.15c.08-33.19-29.12-58.48-60.62-58.53-32.91-.05-60.07,26.74-60.96,59.35s24.54,62.06,58.32,62.5l35.46.47-.03,36.62-29.83.02c-34.44.02-65.78-16.13-84.12-42.56-20.1-28.97-23.75-64.93-9.1-96.98,18.95-41.47,61.99-64.73,107.23-57.01,41.53,7.09,78.06,42.57,80.23,87.86l.28,102.83c.12,43.58-31.75,80.31-73.05,91.47-33.74,9.12-67.39-.85-92.26-25.34l25.89-26.03c17.89,17.14,41.58,22.95,64.87,13.57,18.89-7.6,37.39-26.49,37.45-51.09Z" />
                          </svg>
                        )
                      },
                      {
                        value: "openrouter",
                        label: "OpenRouter",
                        icon: (
                          <svg viewBox="0 0 362.15 306.13" className="w-4 h-4 shrink-0 object-contain">
                            <path fill="#C8FF00" d="M251.94,306.13l-.79-28.35c-47.94,2.45-89.25-4.54-128.56-32.25l-24.23-17.07c-15.07-11.05-30.2-20.77-46.88-29.41-16.87-6.67-33.79-11.31-51.48-14.19v-63.31c33.64-4.42,59.4-14.46,86.77-33.83l42.63-29.84c36.07-25.25,80.45-31.84,124.15-29.23l.22-28.65,108.38,62.85-108,62.53-.67-32.05c-17.69-1.89-34.89-1.98-52.25,1.45-15.53,3.52-28.85,10.34-41.72,19.55-19.26,13.78-37.97,27.21-57.78,39.58,20.5,12.82,38.33,25.77,56.99,39.15,19.46,13.96,40.87,22,64.87,21.18l27.62-.94.64-32.4,108.42,62.74-108.34,62.48Z" />
                          </svg>
                        )
                      },
                      {
                        value: "claude",
                        label: "Claude",
                        icon: (
                          <svg viewBox="0 0 46.08 46.08" className="w-4 h-4 shrink-0 object-contain">
                            <path fill="#d97454" d="M30.13,37.27c.66.17,1.06.16,1.58-.07.3-.14.43-.49.39-.84l-.15-1.25-3.91-5.87c-.04-.06,0-.19.02-.22.02-.02.13-.02.17.01l3.94,3.33,2.76,2.11c.2.15.51.36.77.22.5-.45.5-.76.23-1.41l-6.36-5.87c-.55-.5-1.08-.94-1.54-1.64l9.8,2.32,1.73-.84c.04-.22.18-.54.07-.73-.16-.29-.34-.64-.61-.83l-1.14-.78-4.41-.29c-1.78-.04-3.48.03-5.32-.34l5.12-1.22c1.96-.47,3.88-.77,5.82-1.32l.38-.9c.09-.22.11-.67-.12-.79l-1.06-.52c-2.94.45-5.81,1.01-8.71,1.68-.17.04-.3.04-.46-.09l1.09-1.87,4.53-5.97.48-1.63-1.06-1.57c-.45.04-.99-.12-1.41.04-.82.31-3.06,2.97-3.88,4.04l-2.91,3.74c-.16.2-.35.33-.58.28l1.26-6.71.52-3.33-.71-.94c-.18-.24-.52-.28-.83-.4l-.97.72c-.23.37-.51.88-.55,1.33l-.45,4.72c-.18,1.89-.43,3.74-.52,5.59-.19.05-.24-.05-.28-.16l-.44-1.38-2.75-5.43-2.33-5.13c-.34-.75-2.18-.91-2.57-.5s-.75.91-1.03,1.39c.05.67.16,1.42.49,2.01l4.81,8.4c.05.08.19.23.14.32-.04.06-.19.1-.26.1-.07,0-.13-.12-.2-.17l-3.62-2.68-4.14-3.15c-.44-.24-1.04-.08-1.53-.17l-.85,1.01c.02.75.13,1.64.67,2.03l2.89,2.07,7.09,4.77c.13.09.14.2.11.28-.05.11-.19.09-.3.08l-3.61-.34-8.71-.61c-.6.27-.94.73-.7,1.02.57.71.44,1.04,1.76,1.09l9.98.4,1.4.08c.16,0,.17.4,0,.5l-6.59,3.73-2.73,1.86c-.25.17-.32.43-.31.73.01.42-.29.57.67,1.26l1.57-.22,8.89-5.8c.14.1.07.24-.02.35l-1.21,1.42-4.67,6.02c-.7.9-1.53,1.7-1.3,2.63.55.44,1.16.69,1.56.26l2.34-2.53,5.05-6.82c.08-.11.29-.14.27-.07-.14.56-.28,1.08-.35,1.64-.15,1.26-.38,2.44-.64,3.67l-1.09,5.15c.16.37.2.84.49,1.07l.81.64.98-.39c.18-.07.38-.34.48-.54l.94-9.95c.02-.18.06-.34.23-.32,1.67,2.98,3.52,5.8,5.55,8.5Z" />
                          </svg>
                        )
                      }
                    ] as { value: string; label: string; icon: React.ReactNode }[]
                  )
                    .filter(opt => loginMode !== 'api' || opt.value !== 'auto')
                    .filter(opt => isProvidersExpanded || opt.value === provider)
                    .map(opt => {
                      const isSelected = provider === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (!isProvidersExpanded) {
                              setIsProvidersExpanded(true);
                              return;
                            }
                            const nextProvider = opt.value as AiProvider;
                            setProvider(nextProvider);
                            setIsProvidersExpanded(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left border-0 outline-none
                          ${isSelected
                              ? 'bg-brand-blue/10 ring-1 ring-brand-blue/30 text-white'
                              : 'bg-[#1c1c1c] text-gray-400 hover:bg-white/4 hover:text-gray-200'
                            }`}
                        >
                          <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${isSelected ? 'bg-brand-blue/15' : 'bg-white/5'}`}>
                            {opt.icon}
                          </span>
                          <span className="flex-1">{opt.label}</span>
                          {!isProvidersExpanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          ) : isSelected ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-blue shrink-0">
                              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {loginMode === 'api' && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">
                  {provider === 'openai' ? "Chave de API da OpenAI" : provider === 'deepseek' ? "Chave de API do DeepSeek" : provider === 'groq' ? "Chave de API do Groq" : provider === 'openrouter' ? "Chave de API do OpenRouter" : provider === 'claude' ? "Chave de API do Claude (Anthropic)" : "Chave de API do Google"}
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => { setInputKey(e.target.value); setError(''); }}
                  placeholder="Cole sua chave de API aqui..."
                  className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium mb-3"
                />
                <div className="flex justify-end">
                  <a
                    href={provider === 'openai' ? "https://platform.openai.com/api-keys" : provider === 'deepseek' ? "https://platform.deepseek.com/api_keys" : provider === 'groq' ? "https://console.groq.com/keys" : provider === 'openrouter' ? "https://openrouter.ai/keys" : provider === 'claude' ? "https://console.anthropic.com/settings/keys" : "https://aistudio.google.com/app/api-keys"}
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

          {/* Seletores de Modelos - Exibidos quando um provedor específico for selecionado */}
          {provider !== 'auto' && (
            <div className="animate-fade-in flex flex-col relative z-20 mt-4 space-y-4">
              {/* Text Model Selection */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Agente de Texto</label>
                <CustomSelect
                  value={textModelOption}
                  onChange={setTextModelOption}
                  options={textModelOptions}
                  placeholder={
                    loginMode === 'code'
                      ? "Selecione um modelo..."
                      : !inputKey.trim() && provider !== 'openrouter'
                        ? "Insira sua Chave de API para ver os modelos disponíveis"
                        : textModelOptions.length === 0
                          ? "Carregando modelos do provedor..."
                          : "Selecione um modelo..."
                  }
                  disableCustom={loginMode === 'code'}
                />
                {textModelOption === 'custom' && (
                  <input
                    type="text"
                    value={customTextModel}
                    onChange={(e) => setCustomTextModel(e.target.value)}
                    placeholder={
                      provider === 'openai' ? "Digite o nome do modelo (ex: gpt-5.6-sol)" :
                        provider === 'deepseek' ? "Digite o nome do modelo (ex: deepseek-chat)" :
                          provider === 'groq' ? "Digite o nome do modelo (ex: llama-3.3-70b-versatile)" :
                            provider === 'openrouter' ? "Digite o nome do modelo" :
                              "Digite o nome do modelo (ex: gemini-4.0-flash)"
                    }
                    className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition-all text-sm font-medium"
                  />
                )}
              </div>

              {(provider === 'google-ai' || provider === 'auto' || provider === 'openai') && (
                <>
                  {/* TTS Model Selection */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block tracking-wide text-left">Motor de Voz (TTS)</label>
                    <CustomSelect
                      value={ttsModelOption}
                      onChange={setTtsModelOption}
                      options={dynamicTtsModels}
                      placeholder={
                        loginMode === 'code'
                          ? "Selecione um modelo de voz..."
                          : !inputKey.trim()
                            ? "Insira sua Chave de API para ver os modelos de voz..."
                            : "Selecione um modelo TTS..."
                      }
                      disableCustom={false}
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


                </>
              )}
            </div>
          )}

          {error && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
              <div className="bg-[#1f1f1f] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Falha de Conexão</h3>
                <p className="text-xs text-gray-300 mb-6 leading-relaxed font-medium">{error}</p>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg text-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full text-white font-bold text-base py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 flex justify-center items-center"
            style={{ backgroundColor: 'var(--accent-primary, #4287f5)' }}
          >
            {isValidating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              loginMode === 'code' && codeStep === 'code_input' ? "Validar Código" : "Entrar"
            )}
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
