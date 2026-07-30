import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AiProvider } from '../types';

interface AuthContextType {
  apiKey: string | null;
  provider: AiProvider;
  model: string;
  clientId: string | null;
  isAuthenticated: boolean;
  login: (key: string, provider?: AiProvider, model?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  storageKeyPrefix?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, storageKeyPrefix = 'avalia_quiz' }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiProvider>('' as AiProvider);
  const [model, setModel] = useState<string>('');
  const [clientId, setClientId] = useState<string | null>(null);

  const keyName = `${storageKeyPrefix}_api_key`;
  const providerName = `${storageKeyPrefix}_ai_provider`;
  const modelNameKey = `${storageKeyPrefix}_ai_model`;
  const clientKeyName = `${storageKeyPrefix}_client_id`;

  useEffect(() => {
    const storedKey = localStorage.getItem(keyName);
    const storedProvider = localStorage.getItem(providerName) as AiProvider;
    const storedModel = localStorage.getItem(modelNameKey);
    let storedClientId = localStorage.getItem(clientKeyName);
    
    if (!storedClientId) {
      storedClientId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
      localStorage.setItem(clientKeyName, storedClientId);
    }
    
    setClientId(storedClientId);

    // Só restaura a sessão se todos os campos forem válidos.
    // Um storedModel vazio ou marcador artificial ('default') invalida a sessão persistida.
    const isModelValid = storedModel && storedModel.trim() && storedModel !== 'default';
    if (storedKey && storedProvider && isModelValid) {
      setApiKey(storedKey);
      setProvider(storedProvider);
      setModel(storedModel!.trim());
    } else {
      // Sessão inválida ou incompleta: limpa o localStorage para evitar reutilização futura
      localStorage.removeItem(keyName);
      localStorage.removeItem(providerName);
      localStorage.removeItem(modelNameKey);
    }
  }, [keyName, providerName, modelNameKey, clientKeyName]);

  const login = (key: string, newProvider: AiProvider, newModel: string) => {
    if (!newModel || !newModel.trim() || newModel === 'default') {
      throw new Error('Modelo de IA inválido. Informe um identificador real de modelo.');
    }
    // Invalida a sessão anterior do jogo no sessionStorage para forçar o início de um jogo novo
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`${storageKeyPrefix}-session-v1`);
    }
    localStorage.setItem(keyName, key);
    localStorage.setItem(providerName, newProvider);
    localStorage.setItem(modelNameKey, newModel.trim());
    setModel(newModel.trim());
    setApiKey(key);
    setProvider(newProvider);
  };

  const logout = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`${storageKeyPrefix}-session-v1`);
    }
    localStorage.removeItem(keyName);
    localStorage.removeItem(providerName);
    localStorage.removeItem(modelNameKey);
    setApiKey(null);
    setProvider('' as AiProvider);
    setModel('');
  };

  return (
    <AuthContext.Provider value={{ apiKey, provider, model, clientId, isAuthenticated: !!apiKey, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
