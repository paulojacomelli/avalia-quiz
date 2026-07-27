import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameEngine, AuthProvider } from './index';

const mockAppConfig = {
  appTitle: 'Test Quiz',
  enableVLibras: true,
  defaultLanguage: 'pt',
};

describe('GameEngine', () => {
  const renderEngine = (config = mockAppConfig) => {
    return render(
      <AuthProvider storageKeyPrefix="test">
        <GameEngine appConfig={config} defaultLanguage="pt" />
      </AuthProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login screen when not authenticated', () => {
    renderEngine();
    expect(screen.getByText('Avalia Quiz')).toBeInTheDocument();
    expect(screen.getByLabelText('Chave da API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows error for invalid API key', async () => {
    renderEngine();
    
    const input = screen.getByLabelText('Chave da API');
    fireEvent.change(input, { target: { value: 'invalid-key' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/chave de api inválida/i)).toBeInTheDocument();
    });
  });

  it('opens settings menu', async () => {
    localStorage.setItem('test_api_key', 'valid-key');
    renderEngine();
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByText('Sons')).toBeInTheDocument();
    expect(screen.getByText('Narração')).toBeInTheDocument();
  });

  it('toggles theme', async () => {
    localStorage.setItem('test_api_key', 'valid-key');
    renderEngine();
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    fireEvent.click(screen.getByText('Tema'));
    fireEvent.click(screen.getByText('Claro'));
    
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('shows VLibras language option when enabled', async () => {
    localStorage.setItem('test_api_key', 'valid-key');
    renderEngine({ ...mockAppConfig, enableVLibras: true });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    fireEvent.click(screen.getByText('Idioma'));
    
    expect(screen.getByText('LIBRAS')).toBeInTheDocument();
  });

  it('renders setup form after authentication', async () => {
    localStorage.setItem('test_api_key', 'valid-key');
    renderEngine();
    
    await waitFor(() => {
      expect(screen.getByText('Desafio de Quiz')).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText('Modo')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantidade')).toBeInTheDocument();
    expect(screen.getByLabelText('Tempo por pergunta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar quiz/i })).toBeInTheDocument();
  });
});