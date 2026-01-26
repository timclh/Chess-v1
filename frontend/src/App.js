import React, { Component } from "react";
import "./App.css";
import Chat from "./Chat";
import ChessGame from "./ChessGame";
import Leaderboard from "./Leaderboard";

class App extends Component {
  state = {
    currentPage: "game", // 'game' or 'leaderboard'
  };

  render() {
    const { currentPage } = this.state;

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
              Play Game
            </button>
            <button
              className={`nav-btn ${currentPage === "leaderboard" ? "active" : ""}`}
              onClick={() => this.setState({ currentPage: "leaderboard" })}
            >
              Leaderboard
            </button>
          </nav>
        </header>

        {currentPage === "game" && (
          <div className="App-content">
            <div className="chat-section">
              <Chat />
            </div>
            <div className="game-section">
              <ChessGame />
            </div>
          </div>
        )}

        {currentPage === "leaderboard" && (
          <div className="App-content leaderboard-page">
            <Leaderboard onBack={() => this.setState({ currentPage: "game" })} />
          </div>
        )}
      </div>
    );
  }
}

export default App;
