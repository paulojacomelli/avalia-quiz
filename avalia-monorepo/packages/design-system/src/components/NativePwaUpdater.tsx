import React, { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface NativePwaUpdaterProps {
  gameState?: string; // e.g. 'idle', 'playing', 'finished'
}

export const NativePwaUpdater: React.FC<NativePwaUpdaterProps> = ({ gameState = 'idle' }) => {
  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegistered(r) {
      // Optional: log registration
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const notificationShown = useRef(false);

  useEffect(() => {
    // Only attempt to show notification if we need a refresh, we haven't shown it yet, 
    // and the user is not actively playing a game.
    if (needRefresh && !notificationShown.current && gameState !== 'playing') {
      const showNativeNotification = async () => {
        if (!('Notification' in window) || !navigator.serviceWorker) {
          return;
        }

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Avalia Quiz: Atualização Disponível', {
              body: 'Uma nova versão com melhorias foi baixada. Clique aqui para recarregar o aplicativo agora.',
              icon: '/masked-icon.svg',
              requireInteraction: true,
              tag: 'pwa-update',
            });
            notificationShown.current = true;
          } catch (e) {
            console.error('Error showing native notification', e);
          }
        }
        // If permission is denied, we do nothing. The update will apply on the next natural reload.
      };

      showNativeNotification();
    }
  }, [needRefresh, gameState]);

  // This component is purely logical and renders nothing.
  return null;
};
