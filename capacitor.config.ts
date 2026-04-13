import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rehabit.health',
  appName: 'Rehabit',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a0a1a',
      showSpinner: false,
    },
  },
};

export default config;
