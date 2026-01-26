import React, { Component } from "react";
import "./App.css";
import Chat from "./Chat";
import ChessGame from "./ChessGame";

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Chess Arena</h1>
          <p className="App-subtitle">Play chess and chat with friends</p>
        </header>
        <div className="App-content">
          <div className="chat-section">
            <Chat />
          </div>
          <div className="game-section">
            <ChessGame />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
