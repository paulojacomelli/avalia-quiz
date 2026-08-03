import React, { useState } from 'react';
import { CustomProviderConfig, CustomProviderModel, CustomProviderHeader } from '@avalia/core';
import { saveCustomProvider } from '@avalia/services';

interface CustomProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (provider: CustomProviderConfig) => void;
  initialData?: CustomProviderConfig | null;
}

export const CustomProviderModal: React.FC<CustomProviderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData
}) => {
  const [id, setId] = useState(initialData?.id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [baseURL, setBaseURL] = useState(initialData?.baseURL || '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey || '');
  const [models, setModels] = useState<CustomProviderModel[]>(
    initialData?.models && initialData.models.length > 0
      ? initialData.models
      : [{ id: '', name: '' }]
  );
  const [headers, setHeaders] = useState<CustomProviderHeader[]>(
    initialData?.headers || []
  );
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleAddModel = () => {
    setModels(prev => [...prev, { id: '', name: '' }]);
  };

  const handleRemoveModel = (index: number) => {
    setModels(prev => prev.filter((_, i) => i !== index));
  };

  const handleModelChange = (index: number, field: 'id' | 'name', value: string) => {
    setModels(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddHeader = () => {
    setHeaders(prev => [...prev, { name: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(prev => prev.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'name' | 'value', value: string) => {
    setHeaders(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanId = id.trim().toLowerCase();
    if (!cleanId) {
      setError('Por favor, informe o ID do Provedor.');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleanId)) {
      setError('ID do Provedor inválido. Use apenas letras minúsculas, números, hífens ou sublinhados.');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Por favor, informe o Nome de Exibição.');
      return;
    }

    const cleanBaseUrl = baseURL.trim();
    if (!cleanBaseUrl) {
      setError('Por favor, informe a URL Base.');
      return;
    }

    const validModels = models
      .map(m => ({ id: m.id.trim(), name: m.name.trim() || m.id.trim() }))
      .filter(m => m.id !== '');

    if (validModels.length === 0) {
      setError('Adicione pelo menos um modelo com ID válido.');
      return;
    }

    const validHeaders = headers
      .map(h => ({ name: h.name.trim(), value: h.value.trim() }))
      .filter(h => h.name !== '');

    const config: CustomProviderConfig = {
      id: cleanId,
      name: cleanName,
      baseURL: cleanBaseUrl,
      apiKey: apiKey.trim(),
      models: validModels,
      headers: validHeaders
    };

    try {
      saveCustomProvider(config);
      onSaved(config);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o provedor personalizado.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#1f1f23]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Provedor personalizado</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold uppercase tracking-wider">
                Recurso Alpha
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-left">
          
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0 text-amber-400 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <strong className="font-bold block">Recurso Experimental (Alpha)</strong>
              <span>Os provedores personalizados utilizam a API compatível com OpenAI. Alguns recursos avançados ou servidores específicos podem variar no suporte a cabeçalhos e parâmetros.</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Configure um provedor compatível com OpenAI. Veja a{' '}
            <a
              href="https://opencode.ai/docs/providers/#custom-provider"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue underline hover:opacity-80"
            >
              documentação de configuração do provedor
            </a>.
          </p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* ID do Provedor */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">ID do Provedor</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="meuprovedor"
              disabled={!!initialData}
              className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium disabled:opacity-50"
            />
            <p className="text-[11px] text-gray-400 font-semibold mt-1.5">
              Letras minúsculas, números, hífens ou sublinhados
            </p>
          </div>

          {/* Nome de Exibição */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">Nome de exibição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu Provedor de IA"
              className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
            />
          </div>

          {/* URL Base */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">URL Base</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.meuprovedor.com/v1"
              className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
            />
          </div>

          {/* Chave de API */}
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">Chave de API</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Chave de API"
              className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
            />
            <p className="text-[11px] text-gray-400 font-semibold mt-1.5">
              Opcional. Deixe em branco se gerenciar autenticação via cabeçalhos.
            </p>
          </div>

          {/* Lista de Modelos */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-gray-300 block">Modelos</label>
            {models.map((model, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={model.id}
                  onChange={(e) => handleModelChange(idx, 'id', e.target.value)}
                  placeholder="id-do-modelo"
                  className="flex-1 bg-[#27272a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
                />
                <input
                  type="text"
                  value={model.name}
                  onChange={(e) => handleModelChange(idx, 'name', e.target.value)}
                  placeholder="Nome de Exibição"
                  className="flex-1 bg-[#27272a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
                />
                {models.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveModel(idx)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddModel}
              className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors pt-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Adicionar modelo
            </button>
          </div>

          {/* Lista de Cabeçalhos */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-gray-300 block">Cabeçalhos (opcional)</label>
            {headers.map((header, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={header.name}
                  onChange={(e) => handleHeaderChange(idx, 'name', e.target.value)}
                  placeholder="Nome-Do-Cabeçalho"
                  className="flex-1 bg-[#27272a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                  placeholder="valor"
                  className="flex-1 bg-[#27272a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue/50 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHeader(idx)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddHeader}
              className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors pt-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Adicionar cabeçalho
            </button>
          </div>

          {/* Enviar Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-auto px-6 py-2.5 bg-white text-black hover:bg-gray-200 font-bold text-sm rounded-xl transition-all active:scale-[0.98] shadow-lg"
            >
              Enviar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
