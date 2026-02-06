import React, { Component } from "react";
import "./App.css";
import Chat from "./Chat";
import ChessGame from "./ChessGame";
import XiangqiGame from "./XiangqiGame";
import Leaderboard from "./Leaderboard";
import Login from "./Login";
import Multiplayer from "./Multiplayer";
import Puzzles from "./Puzzles";
import OpeningExplorer from "./OpeningExplorer";
import AICoach from "./AICoach";
import VideoLearning from "./VideoLearning";
import { AuthProvider } from "./AuthContext";
import { onAuthChange, logout, isFirebaseConfigured } from "./firebase";

// Valid routes
const ROUTES = {
  '/': 'game',
  '/chess': 'game',
  '/xiangqi': 'xiangqi',
  '/puzzles': 'puzzles',
  '/openings': 'openings',
  '/multiplayer': 'multiplayer',
  '/leaderboard': 'leaderboard',
  '/coach': 'coach',
  '/learn': 'learn',
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
  };

  componentDidMount() {
    // Listen for auth changes
    this.unsubscribe = onAuthChange((user) => {
      this.setState({ user, showLogin: false });
    });

    // Listen for URL hash changes (browser back/forward)
    window.addEventListener('hashchange', this.handleHashChange);
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    window.removeEventListener('hashchange', this.handleHashChange);
  }

  handleHashChange = () => {
    const page = getPageFromHash();
    if (page !== this.state.currentPage) {
      this.setState({ currentPage: page });
    }
  };

  navigateTo = (page) => {
    setHashFromPage(page);
    this.setState({ currentPage: page });
  };

  handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  render() {
    const { currentPage, user, showLogin } = this.state;
    const configured = isFirebaseConfigured();

    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Chess Arena</h1>
          <p className="App-subtitle">Play chess and chat with friends</p>
          <nav className="App-nav">
            <button
              className={`nav-btn ${currentPage === "game" ? "active" : ""}`}
              onClick={() => this.navigateTo("game")}
            >
              Chess
            </button>
            <button
              className={`nav-btn xiangqi-nav ${currentPage === "xiangqi" ? "active" : ""}`}
              onClick={() => this.navigateTo("xiangqi")}
            >
              象棋
            </button>
            <button
              className={`nav-btn ${currentPage === "puzzles" ? "active" : ""}`}
              onClick={() => this.navigateTo("puzzles")}
            >
              🧩 Puzzles
            </button>
            <button
              className={`nav-btn ${currentPage === "openings" ? "active" : ""}`}
              onClick={() => this.navigateTo("openings")}
            >
              📖 Openings
            </button>
            <button
              className={`nav-btn ${currentPage === "learn" ? "active" : ""}`}
              onClick={() => this.navigateTo("learn")}
            >
              📺 Learn
            </button>
            <button
              className={`nav-btn ${currentPage === "coach" ? "active" : ""}`}
              onClick={() => this.navigateTo("coach")}
            >
              🤖 Coach
            </button>
            <button
              className={`nav-btn ${currentPage === "multiplayer" ? "active" : ""}`}
              onClick={() => this.navigateTo("multiplayer")}
            >
              Online
            </button>
            <button
              className={`nav-btn ${currentPage === "leaderboard" ? "active" : ""}`}
              onClick={() => this.navigateTo("leaderboard")}
            >
              Leaderboard
            </button>
            <div className="nav-spacer" />
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
                {configured ? "Login" : "Login (Local)"}
              </button>
            )}
          </nav>
        </header>

        {currentPage === "game" && (
          <div className="App-content">
            <div className="chat-section">
              <Chat />
            </div>
            <div className="game-section">
              <ChessGame user={user} />
            </div>
          </div>
        )}

        {currentPage === "xiangqi" && (
          <div className="App-content xiangqi-page">
            <XiangqiGame />
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

        {showLogin && (
          <Login
            onClose={() => this.setState({ showLogin: false })}
            onSuccess={() => this.setState({ showLogin: false })}
          />
        )}
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
