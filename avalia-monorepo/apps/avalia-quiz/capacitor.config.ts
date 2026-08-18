import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || 'app.avalia.quiz',
  appName: process.env.CAPACITOR_APP_NAME || 'Avalia Quiz',
  webDir: 'dist'
};

export default config;
