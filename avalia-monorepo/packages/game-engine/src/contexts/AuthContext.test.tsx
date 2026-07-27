import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext', () => {
  const wrapper = ({ children }) => <AuthProvider storageKeyPrefix="test">{children}</AuthProvider>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with no authentication', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBe(null);
    expect(result.current.logout).toBeDefined();
  });

  it('should login with valid API key', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('valid-api-key-123');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe('valid-api-key-123');
    expect(localStorage.getItem('test_api_key')).toBe('valid-api-key-123');
  });

  it('should reject invalid API key', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('invalid-key');
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBe(null);
    expect(localStorage.getItem('test_api_key')).toBeNull();
  });

  it('should logout and clear session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('valid-key');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    
    act(() => {
      result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBe(null);
    expect(localStorage.getItem('test_api_key')).toBeNull();
  });

  it('should persist API key from localStorage', () => {
    localStorage.setItem('test_api_key', 'persisted-key');
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe('persisted-key');
  });

  it('should clear persisted API key on logout', async () => {
    localStorage.setItem('test_api_key', 'persisted-key');
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBe(null);
    expect(localStorage.getItem('test_api_key')).toBeNull();
  });
});