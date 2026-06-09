import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AiProvider } from '../types';

interface AuthContextType {
  apiKey: string | null;
  provider: AiProvider;
  isAuthenticated: boolean;
  login: (key: string, provider?: AiProvider) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  storageKeyPrefix?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, storageKeyPrefix = 'jw_quiz' }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<AiProvider>('google-ai');

  const keyName = `${storageKeyPrefix}_api_key`;
  const providerName = `${storageKeyPrefix}_ai_provider`;

  useEffect(() => {
    const storedKey = localStorage.getItem(keyName);
    const storedProvider = localStorage.getItem(providerName) as AiProvider;
    
    if (storedKey) setApiKey(storedKey);
    if (storedProvider) setProvider(storedProvider);
  }, [keyName, providerName]);

  const login = (key: string, newProvider: AiProvider = 'google-ai') => {
    localStorage.setItem(keyName, key);
    localStorage.setItem(providerName, newProvider);
    setApiKey(key);
    setProvider(newProvider);
  };

  const logout = () => {
    localStorage.removeItem(keyName);
    localStorage.removeItem(providerName);
    setApiKey(null);
    setProvider('google-ai');
  };

  return (
    <AuthContext.Provider value={{ apiKey, provider, isAuthenticated: !!apiKey, login, logout }}>
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