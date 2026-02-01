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
import { AuthProvider } from "./AuthContext";
import { onAuthChange, logout, isFirebaseConfigured } from "./firebase";

class AppContent extends Component {
  state = {
    currentPage: "game", // 'game', 'xiangqi', 'puzzles', 'openings', 'multiplayer', 'leaderboard', or 'login'
    user: null,
    showLogin: false,
  };

  componentDidMount() {
    this.unsubscribe = onAuthChange((user) => {
      this.setState({ user, showLogin: false });
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

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
              onClick={() => this.setState({ currentPage: "game" })}
            >
              Chess
            </button>
            <button
              className={`nav-btn xiangqi-nav ${currentPage === "xiangqi" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "xiangqi" })}
            >
              象棋
            </button>
            <button
              className={`nav-btn ${currentPage === "puzzles" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "puzzles" })}
            >
              🧩 Puzzles
            </button>
            <button
              className={`nav-btn ${currentPage === "openings" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "openings" })}
            >
              📖 Openings
            </button>
            <button
              className={`nav-btn ${currentPage === "multiplayer" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "multiplayer" })}
            >
              Online
            </button>
            <button
              className={`nav-btn ${currentPage === "leaderboard" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "leaderboard" })}
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
            <Multiplayer onBack={() => this.setState({ currentPage: "game" })} />
          </div>
        )}

        {currentPage === "leaderboard" && (
          <div className="App-content leaderboard-page">
            <Leaderboard onBack={() => this.setState({ currentPage: "game" })} />
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
  render() {
    return (
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    );
  }
}

export default App;
