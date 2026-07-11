import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.mitiendavirtual.app',
  appName: 'Mi Tienda Virtual',
  webDir: 'dist',
  server: {
    url: 'https://mitiendavirtual.cl',
    cleartext: false
  }
};

export default config;
