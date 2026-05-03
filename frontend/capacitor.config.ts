import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chessarena.xiangqi',
  appName: 'Chess Arena',
  webDir: 'build',
  android: {
    // Allow mixed content for WASM loading
    allowMixedContent: true,
    // Override user agent for proper web feature detection
    appendUserAgent: 'ChessArena/1.0',
  },
  ios: {
    // Allow WASM and SharedArrayBuffer in WKWebView
    allowsLinkPreview: false,
    scrollEnabled: false,
    contentInset: 'automatic',
    // Enable modern WKWebView features for WASM
    preferredContentMode: 'mobile',
  },
  server: {
    // Allow loading local WASM files
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // Add COEP/COOP headers for SharedArrayBuffer (WASM threading)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e', // Match our dark theme
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;
