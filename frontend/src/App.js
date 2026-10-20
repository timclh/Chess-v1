import React, { Component } from "react";
import "./App.css";
import ChessGame from "./ChessGame";
import XiangqiGame from "./XiangqiGame";
import WuziQiGame from "./WuziQiGame";
import HomePage from "./HomePage";
import Leaderboard from "./Leaderboard";
import Login from "./Login";
import Multiplayer from "./Multiplayer";
import Puzzles from "./Puzzles";
import OpeningExplorer from "./OpeningExplorer";
import AICoach from "./AICoach";
import VideoLearning from "./VideoLearning";
import ProfilePage from "./ProfilePage";
import { PrivacyPolicy, TermsOfService } from "./LegalPages";
import { AuthProvider } from "./AuthContext";
import UiFeedbackLoop from "./UiFeedbackLoop";
import { Icon } from "./components/Icon";
import { isMuted, toggleMuted, onMutedChange, initSound, playSound, SOUND } from "./services/SoundService";
import { onAuthChange, logout, isFirebaseConfigured } from "./firebase";

// Valid routes
const ROUTES = {
  '/': 'home',
  '/chess': 'game',
  '/xiangqi': 'xiangqi',
  '/wuziqi': 'wuziqi',
  '/puzzles': 'puzzles',
  '/openings': 'openings',
  '/multiplayer': 'multiplayer',
  '/leaderboard': 'leaderboard',
  '/coach': 'coach',
  '/learn': 'learn',
  '/profile': 'profile',
  '/privacy': 'privacy',
  '/terms': 'terms',
};

// Get page from URL hash
const getPageFromHash = () => {
  const hash = window.location.hash.slice(1) || '/'; // Remove '#'
  return ROUTES[hash] || 'game';
};

// Set URL hash from page
const setHashFromPage = (page) => {
  const route = Object.keys(ROUTES).find(key => ROUTES[key] === page) || '/';
  window.location.hash = route;
};

class AppContent extends Component {
  state = {
    currentPage: getPageFromHash(),
    user: null,
    showLogin: false,
    showInstallPrompt: false,
    isOffline: !navigator.onLine,
    soundMuted: isMuted(),
  };

  deferredPrompt = null;

  componentDidMount() {
    initSound();
    this.unsubscribeMuted = onMutedChange((soundMuted) => this.setState({ soundMuted }));

    // Listen for auth changes
    this.unsubscribe = onAuthChange((user) => {
      this.setState({ user, showLogin: false });
    });

    // Listen for URL hash changes (browser back/forward)
    window.addEventListener('hashchange', this.handleHashChange);

    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', this.handleInstallPrompt);

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.unsubscribeMuted) this.unsubscribeMuted();
    window.removeEventListener('hashchange', this.handleHashChange);
    window.removeEventListener('beforeinstallprompt', this.handleInstallPrompt);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleInstallPrompt = (e) => {
    e.preventDefault();
    this.deferredPrompt = e;
    // Only show if user hasn't dismissed before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (!dismissed) {
      this.setState({ showInstallPrompt: true });
    }
  };

  handleInstallClick = async () => {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.setState({ showInstallPrompt: false });
    }
    this.deferredPrompt = null;
  };

  dismissInstallPrompt = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    this.setState({ showInstallPrompt: false });
  };

  handleOnline = () => this.setState({ isOffline: false });
  handleOffline = () => this.setState({ isOffline: true });

  handleHashChange = () => {
    const page = getPageFromHash();
    if (page !== this.state.currentPage) {
      this.setState({ currentPage: page, navOpen: false });
    }
  };

  navigateTo = (page) => {
    setHashFromPage(page);
    this.setState({ currentPage: page, navOpen: false });
  };

  handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  render() {
    const { currentPage, user, showLogin, showInstallPrompt, isOffline } = this.state;
    const configured = isFirebaseConfigured();

    // Pages that show in bottom tab bar (primary nav)
    const isGamePage = ['game', 'xiangqi', 'wuziqi'].includes(currentPage);
    const isLearnPage = ['puzzles', 'openings', 'learn', 'coach'].includes(currentPage);

    return (
      <div className="App has-bottom-nav">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="offline-banner">
            <span>⚡ You're offline — local features still work!</span>
          </div>
        )}

        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <div className="pwa-install-banner">
            <span>📱 Install 棋 Arena for the best experience!</span>
            <div className="install-actions">
              <button className="install-btn" onClick={this.handleInstallClick}>Install</button>
              <button className="dismiss-btn" onClick={this.dismissInstallPrompt}>×</button>
            </div>
          </div>
        )}

        {/* Compact Top Header */}
        <header className="App-header">
          <div className="header-row">
            <h1 className="App-title" onClick={() => this.navigateTo('home')} style={{ cursor: 'pointer' }}><span className="brush logo-mark">棋</span> Arena</h1>
            <div className="header-right">
              <button
                className="icon-btn sound-toggle"
                onClick={() => { if (!toggleMuted()) playSound(SOUND.SELECT); }}
                title={this.state.soundMuted ? "开启声音 / Sound on" : "静音 / Mute"}
                aria-label={this.state.soundMuted ? "Unmute sound" : "Mute sound"}
                aria-pressed={this.state.soundMuted}
              >
                <Icon name={this.state.soundMuted ? "muted" : "sound"} size={20} />
              </button>
              {user ? (
                <div className="user-menu">
                  <span className="user-name">{user.displayName || user.email}</span>
                  <button className="nav-btn logout-btn" onClick={this.handleLogout}>
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  className="nav-btn login-nav-btn"
                  onClick={() => this.setState({ showLogin: true })}
                >
                  {configured ? "Login" : "Login"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}

        {currentPage === "home" && (
          <div className="App-content home-content">
            <HomePage onNavigate={this.navigateTo} />
          </div>
        )}

        {isGamePage && (
          <div className="sub-nav-bar">
            <button className={`sub-nav-btn ${currentPage === 'game' ? 'active' : ''}`} onClick={() => this.navigateTo('game')}><Icon name="play" size={16} /> Chess</button>
            <button className={`sub-nav-btn ${currentPage === 'xiangqi' ? 'active' : ''}`} onClick={() => this.navigateTo('xiangqi')}><span className="brush">象棋</span> Xiangqi</button>
            <button className={`sub-nav-btn ${currentPage === 'wuziqi' ? 'active' : ''}`} onClick={() => this.navigateTo('wuziqi')}><Icon name="games" size={16} /> Gomoku</button>
          </div>
        )}

        {currentPage === "game" && (
          <div className="App-content chess-app-content">
            <ChessGame user={user} />
          </div>
        )}

        {currentPage === "xiangqi" && (
          <div className="App-content xiangqi-page">
            <XiangqiGame />
          </div>
        )}

        {currentPage === "wuziqi" && (
          <div className="App-content wuziqi-page">
            <WuziQiGame />
          </div>
        )}

        {/* Learn section sub-navigation */}
        {isLearnPage && (
          <div className="sub-nav-bar">
            <button className={`sub-nav-btn ${currentPage === 'puzzles' ? 'active' : ''}`} onClick={() => this.navigateTo('puzzles')}><Icon name="puzzles" size={16} /> Puzzles</button>
            <button className={`sub-nav-btn ${currentPage === 'openings' ? 'active' : ''}`} onClick={() => this.navigateTo('openings')}><Icon name="learn" size={16} /> Openings</button>
            <button className={`sub-nav-btn ${currentPage === 'learn' ? 'active' : ''}`} onClick={() => this.navigateTo('learn')}><Icon name="videos" size={16} /> Videos</button>
            <button className={`sub-nav-btn ${currentPage === 'coach' ? 'active' : ''}`} onClick={() => this.navigateTo('coach')}><Icon name="coach" size={16} /> Coach</button>
          </div>
        )}

        {currentPage === "puzzles" && (
          <div className="App-content puzzles-page">
            <Puzzles />
          </div>
        )}

        {currentPage === "openings" && (
          <div className="App-content openings-page">
            <OpeningExplorer />
          </div>
        )}

        {currentPage === "multiplayer" && (
          <div className="App-content multiplayer-page">
            <Multiplayer onBack={() => this.navigateTo("game")} />
          </div>
        )}

        {currentPage === "leaderboard" && (
          <div className="App-content leaderboard-page">
            <Leaderboard onBack={() => this.navigateTo("game")} />
          </div>
        )}

        {currentPage === "coach" && (
          <div className="App-content coach-page">
            <AICoach />
          </div>
        )}

        {currentPage === "learn" && (
          <div className="App-content learn-page">
            <VideoLearning />
          </div>
        )}

        {currentPage === "profile" && (
          <div className="App-content profile-page-container">
            <ProfilePage user={user} />
          </div>
        )}

        {currentPage === "privacy" && (
          <div className="App-content legal-page-container">
            <PrivacyPolicy />
          </div>
        )}

        {currentPage === "terms" && (
          <div className="App-content legal-page-container">
            <TermsOfService />
          </div>
        )}

        {showLogin && (
          <Login
            onClose={() => this.setState({ showLogin: false })}
            onSuccess={() => this.setState({ showLogin: false })}
          />
        )}

        {/* Bottom Tab Bar */}
        <nav className="bottom-tab-bar">
          <button
            className={`btab-btn ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => this.navigateTo('home')}
          >
            <span className="btab-icon"><Icon name="home" size={22} /></span>
            <span className="btab-label">Home</span>
          </button>
          <button
            className={`btab-btn ${isGamePage ? 'active' : ''}`}
            onClick={() => this.navigateTo(isGamePage ? currentPage : 'game')}
          >
            <span className="btab-icon"><Icon name="play" size={22} /></span>
            <span className="btab-label">Play</span>
          </button>
          <button
            className={`btab-btn ${isLearnPage ? 'active' : ''}`}
            onClick={() => this.navigateTo(isLearnPage ? currentPage : 'puzzles')}
          >
            <span className="btab-icon"><Icon name="learn" size={22} /></span>
            <span className="btab-label">Learn</span>
          </button>
          <button
            className={`btab-btn ${currentPage === 'multiplayer' ? 'active' : ''}`}
            onClick={() => this.navigateTo('multiplayer')}
          >
            <span className="btab-icon"><Icon name="online" size={22} /></span>
            <span className="btab-label">Online</span>
          </button>
          <button
            className={`btab-btn ${['profile', 'leaderboard'].includes(currentPage) ? 'active' : ''}`}
            onClick={() => this.navigateTo('profile')}
          >
            <span className="btab-icon"><Icon name="profile" size={22} /></span>
            <span className="btab-label">Me</span>
          </button>
        </nav>
      </div>
    );
  }
}

class App extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.hash = '/'; window.location.reload(); }}>
            Reload
          </button>
        </div>
      );
    }
    return (
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    );
  }
}

export default App;
