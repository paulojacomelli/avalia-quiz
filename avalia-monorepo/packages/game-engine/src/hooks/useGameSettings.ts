import { useState, useEffect, useCallback } from 'react';
import { ThemeMode } from '@avalia/design-system';
import { playSound, setGlobalSoundState } from '@avalia/services';

interface UseGameSettingsProps {
  storagePrefix: string;
  onInactivityTimeout?: () => void;
}

export function useGameSettings({ storagePrefix, onInactivityTimeout }: UseGameSettingsProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => 
    (localStorage.getItem(`${storagePrefix}-theme`) as ThemeMode) || 'system'
  );
  
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem(`${storagePrefix}-soundEnabled`) !== 'false'
  );
  
  const [zoomLevel, setZoomLevel] = useState(() => 
    parseFloat(localStorage.getItem(`${storagePrefix}-zoomLevel`) || '1.0')
  );
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Theme Logic ---
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
    localStorage.setItem(`${storagePrefix}-theme`, theme);
  }, [theme, storagePrefix]);

  // --- Sound Logic ---
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setGlobalSoundState(newState);
    localStorage.setItem(`${storagePrefix}-sound`, String(newState));
  }, [soundEnabled, storagePrefix]);

  // --- Theme Toggle ---
  const toggleTheme = useCallback(() => {
    playSound('click');
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  }, []);

  // --- Fullscreen Logic ---
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Inactivity Timeout (30 min) ---
  useEffect(() => {
    if (!onInactivityTimeout) return;

    const TIMEOUT_MS = 30 * 60 * 1000;
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        onInactivityTimeout();
      }, TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [onInactivityTimeout]);

  return {
    theme,
    setTheme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    zoomLevel,
    setZoomLevel,
    isFullscreen,
    toggleFullscreen,
    isSettingsOpen,
    setIsSettingsOpen
  };
}
