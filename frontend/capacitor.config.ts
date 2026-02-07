import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chessarena.xiangqi',
  appName: 'Chess Arena',
  webDir: 'build',
  ios: {
    // Allow WASM and SharedArrayBuffer in WKWebView
    allowsLinkPreview: false,
    scrollEnabled: false,
    contentInset: 'automatic',
  },
  server: {
    // Allow loading local WASM files
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f5e6c8', // Match our board color
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#d4a574',
    },
  },
};

export default config;
