import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";

// Use environment variable or fallback to localhost
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:3030";

class Multiplayer extends Component {
  state = {
    // Connection state
    connected: false,
    roomId: null,
    playerColor: null,
    playerName: localStorage.getItem('chess_player_name') || "",
    opponentName: null,

    // Game state
    fen: "start",
    history: [],
    squareStyles: {},
    pieceSquare: "",
    gameOver: false,
    gameStatus: "Enter your name and create/join a room",

    // UI state
    showJoinDialog: false,
    joinRoomId: "",
    messages: [],
    chatInput: "",
    drawOffered: false,
    drawReceived: false,
    copySuccess: false,
  };

  ws = null;
  game = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;

  componentDidMount() {
    this.game = new Chess();

    // Check if joining from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
      this.setState({ joinRoomId: roomId, showJoinDialog: true });
    }

    this.connectWebSocket();
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }

  connectWebSocket = () => {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log("Multiplayer WebSocket connected");
        this.reconnectAttempts = 0;
        this.setState({ connected: true });
      };

      this.ws.onmessage = (evt) => {
        try {
          const message = JSON.parse(evt.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.setState({ connected: false });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.handleReconnect();
    }
  };

  handleReconnect = () => {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState({ gameStatus: "Connection failed. Please refresh the page." });
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => this.connectWebSocket(), 2000 * this.reconnectAttempts);
  };

  handleServerMessage = (message) => {
    switch (message.type) {
      case 'room_created':
        this.setState({
          roomId: message.roomId,
          playerColor: message.playerColor,
          gameStatus: message.message,
        });
        break;

      case 'room_joined':
        this.setState({
          roomId: message.roomId,
          playerColor: message.playerColor,
          opponentName: message.opponentName,
          showJoinDialog: false,
        });
        if (message.gameState && message.gameState.fen !== 'start') {
          this.game.load(message.gameState.fen);
          this.setState({
            fen: message.gameState.fen,
            history: message.gameState.history || [],
          });
        }
        break;

      case 'opponent_joined':
        this.setState({ opponentName: message.opponentName });
        this.addSystemMessage(`${message.opponentName} joined the game`);
        break;

      case 'game_start':
        this.setState({
          gameStatus: `Game started! ${message.whitePlayer} (White) vs ${message.blackPlayer} (Black)`,
          gameOver: false,
        });
        this.addSystemMessage(message.message);
        break;

      case 'opponent_move':
        if (this.game) {
          this.game.move(message.move);
          this.setState({
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
          });
          this.updateGameStatus();

          if (message.gameOver) {
            this.setState({ gameOver: true, gameStatus: message.result });
          }
        }
        break;

      case 'chat':
        this.addChatMessage(message.name, message.message);
        break;

      case 'game_over':
        this.setState({
          gameOver: true,
          gameStatus: message.message,
        });
        this.addSystemMessage(message.message);
        break;

      case 'draw_offered':
        this.setState({ drawReceived: true });
        this.addSystemMessage(`${message.from} offers a draw`);
        break;

      case 'draw_declined':
        this.setState({ drawOffered: false });
        this.addSystemMessage("Draw offer declined");
        break;

      case 'opponent_disconnected':
        this.addSystemMessage(message.message);
        this.setState({ gameStatus: message.message });
        break;

      case 'rematch_start':
        this.game.reset();
        this.setState({
          fen: "start",
          history: [],
          gameOver: false,
          gameStatus: `Rematch! ${message.whitePlayer} (White) vs ${message.blackPlayer} (Black)`,
          drawOffered: false,
          drawReceived: false,
        });
        // Update player color after swap
        const newColor = this.state.playerColor === 'w' ? 'b' : 'w';
        this.setState({ playerColor: newColor });
        this.addSystemMessage("Rematch started! Colors swapped.");
        break;

      case 'error':
        this.setState({ gameStatus: message.message });
        this.addSystemMessage(`Error: ${message.message}`);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  };

  addSystemMessage = (text) => {
    this.setState(state => ({
      messages: [...state.messages, { type: 'system', text, id: Date.now() }],
    }));
  };

  addChatMessage = (name, text) => {
    this.setState(state => ({
      messages: [...state.messages, { type: 'chat', name, text, id: Date.now() }],
    }));
  };

  sendMessage = (message) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  };

  createRoom = () => {
    if (!this.state.playerName.trim()) {
      this.setState({ gameStatus: "Please enter your name first" });
      return;
    }
    localStorage.setItem('chess_player_name', this.state.playerName);
    this.sendMessage({
      type: 'create_room',
      playerName: this.state.playerName,
    });
  };

  joinRoom = () => {
    if (!this.state.playerName.trim()) {
      this.setState({ gameStatus: "Please enter your name first" });
      return;
    }
    if (!this.state.joinRoomId.trim()) {
      this.setState({ gameStatus: "Please enter a room ID" });
      return;
    }
    localStorage.setItem('chess_player_name', this.state.playerName);
    this.sendMessage({
      type: 'join_room',
      roomId: this.state.joinRoomId.trim(),
      playerName: this.state.playerName,
    });
  };

  copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${this.state.roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 2000);
    });
  };

  isPlayerTurn = () => {
    return this.game && this.game.turn() === this.state.playerColor;
  };

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (!this.game || this.state.gameOver || !this.isPlayerTurn()) return;
    if (!this.state.opponentName) return; // Wait for opponent

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return;

    const gameOver = this.game.game_over();
    let result = null;
    if (gameOver) {
      if (this.game.in_checkmate()) {
        result = `${this.game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
      } else if (this.game.in_stalemate()) {
        result = "Draw by stalemate";
      } else if (this.game.in_draw()) {
        result = "Draw";
      }
    }

    this.setState({
      fen: this.game.fen(),
      history: this.game.history({ verbose: true }),
      pieceSquare: "",
      squareStyles: {},
    });

    if (gameOver) {
      this.setState({ gameOver: true, gameStatus: result });
    }

    this.updateGameStatus();

    // Send move to server
    this.sendMessage({
      type: 'move',
      move: move,
      fen: this.game.fen(),
      history: this.game.history(),
      turn: this.game.turn(),
      gameOver,
      result,
    });
  };

  onSquareClick = (square) => {
    if (!this.game || this.state.gameOver || !this.isPlayerTurn()) return;
    if (!this.state.opponentName) return;

    const { pieceSquare } = this.state;

    // If clicking the same square, deselect
    if (pieceSquare === square) {
      this.setState({ pieceSquare: "", squareStyles: {} });
      return;
    }

    // Try to make a move
    if (pieceSquare) {
      const move = this.game.move({
        from: pieceSquare,
        to: square,
        promotion: "q",
      });

      if (move !== null) {
        const gameOver = this.game.game_over();
        let result = null;
        if (gameOver) {
          if (this.game.in_checkmate()) {
            result = `${this.game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
          } else {
            result = "Draw";
          }
        }

        this.setState({
          fen: this.game.fen(),
          history: this.game.history({ verbose: true }),
          pieceSquare: "",
          squareStyles: {},
        });

        if (gameOver) {
          this.setState({ gameOver: true, gameStatus: result });
        }

        this.updateGameStatus();

        this.sendMessage({
          type: 'move',
          move: move,
          fen: this.game.fen(),
          history: this.game.history(),
          turn: this.game.turn(),
          gameOver,
          result,
        });
        return;
      }
    }

    // Select piece
    const piece = this.game.get(square);
    if (piece && piece.color === this.state.playerColor) {
      const moves = this.game.moves({ square, verbose: true });
      const highlights = {};
      moves.forEach(move => {
        highlights[move.to] = {
          background: "radial-gradient(circle, rgba(255,255,0,0.4) 25%, transparent 25%)",
          borderRadius: "50%",
        };
      });
      highlights[square] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      this.setState({ pieceSquare: square, squareStyles: highlights });
    }
  };

  updateGameStatus = () => {
    if (!this.game) return;

    let status = "";
    if (this.game.in_checkmate()) {
      status = `Checkmate! ${this.game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    } else if (this.game.in_stalemate()) {
      status = "Stalemate - Draw!";
    } else if (this.game.in_draw()) {
      status = "Draw!";
    } else if (this.game.in_check()) {
      status = `${this.game.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    } else {
      const isYourTurn = this.isPlayerTurn();
      status = isYourTurn ? "Your turn" : "Opponent's turn";
    }

    this.setState({ gameStatus: status });
  };

  sendChat = () => {
    if (!this.state.chatInput.trim()) return;

    this.sendMessage({
      type: 'chat',
      text: this.state.chatInput,
    });
    this.addChatMessage(this.state.playerName, this.state.chatInput);
    this.setState({ chatInput: "" });
  };

  resign = () => {
    if (window.confirm("Are you sure you want to resign?")) {
      this.sendMessage({ type: 'resign' });
    }
  };

  offerDraw = () => {
    this.sendMessage({ type: 'draw_offer' });
    this.setState({ drawOffered: true });
    this.addSystemMessage("You offered a draw");
  };

  respondToDraw = (accept) => {
    this.sendMessage({ type: 'draw_response', accept });
    this.setState({ drawReceived: false });
  };

  requestRematch = () => {
    this.sendMessage({ type: 'rematch' });
  };

  render() {
    const {
      connected, roomId, playerColor, playerName, opponentName,
      fen, squareStyles, gameStatus, gameOver, history,
      showJoinDialog, joinRoomId, messages, chatInput,
      drawOffered, drawReceived, copySuccess,
    } = this.state;

    const boardOrientation = playerColor === 'b' ? 'black' : 'white';
    const inGame = roomId && opponentName;

    return (
      <div className="multiplayer-container">
        {/* Left Panel - Room Controls */}
        <div className="multiplayer-panel">
          <div className="panel-title">Online Multiplayer</div>

          {/* Connection Status */}
          <div className="connection-status">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Player Name */}
          <div className="settings-section">
            <div className="section-label">Your Name</div>
            <input
              type="text"
              className="player-name-input"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => this.setState({ playerName: e.target.value })}
              disabled={roomId !== null}
            />
          </div>

          {/* Room Controls - Before joining */}
          {!roomId && (
            <div className="settings-section">
              <button
                className="btn btn-primary full-width"
                onClick={this.createRoom}
                disabled={!connected || !playerName.trim()}
              >
                Create Room
              </button>
              <button
                className="btn btn-secondary full-width"
                onClick={() => this.setState({ showJoinDialog: true })}
                disabled={!connected || !playerName.trim()}
              >
                Join Room
              </button>
            </div>
          )}

          {/* Join Dialog */}
          {showJoinDialog && !roomId && (
            <div className="join-dialog">
              <div className="section-label">Room ID</div>
              <input
                type="text"
                className="room-id-input"
                placeholder="Enter room ID"
                value={joinRoomId}
                onChange={(e) => this.setState({ joinRoomId: e.target.value })}
              />
              <div className="dialog-buttons">
                <button className="btn btn-primary" onClick={this.joinRoom}>
                  Join
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => this.setState({ showJoinDialog: false, joinRoomId: "" })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Room Info - After creating */}
          {roomId && (
            <div className="room-info">
              <div className="section-label">Room ID</div>
              <div className="room-id-display">{roomId}</div>
              <button
                className={`btn btn-copy full-width ${copySuccess ? 'success' : ''}`}
                onClick={this.copyInviteLink}
              >
                {copySuccess ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
              </button>
            </div>
          )}

          {/* Player Info */}
          {roomId && (
            <div className="players-info">
              <div className="section-label">Players</div>
              <div className="player-row">
                <span className="color-indicator white">⬜</span>
                <span>{playerColor === 'w' ? `${playerName} (You)` : (opponentName || 'Waiting...')}</span>
              </div>
              <div className="player-row">
                <span className="color-indicator black">⬛</span>
                <span>{playerColor === 'b' ? `${playerName} (You)` : (opponentName || 'Waiting...')}</span>
              </div>
            </div>
          )}

          {/* Game Controls */}
          {inGame && !gameOver && (
            <div className="settings-section game-controls">
              <button
                className="btn btn-warning full-width"
                onClick={this.offerDraw}
                disabled={drawOffered}
              >
                {drawOffered ? 'Draw Offered' : '🤝 Offer Draw'}
              </button>
              <button className="btn btn-danger full-width" onClick={this.resign}>
                🏳️ Resign
              </button>
            </div>
          )}

          {/* Draw Response */}
          {drawReceived && (
            <div className="draw-offer-popup">
              <p>Opponent offers a draw</p>
              <div className="dialog-buttons">
                <button className="btn btn-primary" onClick={() => this.respondToDraw(true)}>
                  Accept
                </button>
                <button className="btn btn-secondary" onClick={() => this.respondToDraw(false)}>
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Rematch */}
          {gameOver && inGame && (
            <div className="settings-section">
              <button className="btn btn-primary full-width" onClick={this.requestRematch}>
                🔄 Rematch
              </button>
            </div>
          )}

          {/* Back Button */}
          <div className="settings-section">
            <button className="btn btn-secondary full-width" onClick={this.props.onBack}>
              ← Back to Menu
            </button>
          </div>
        </div>

        {/* Center Panel - Board */}
        <div className="board-panel">
          <div className={`game-status ${gameOver ? 'game-over' : ''}`}>
            {gameStatus}
          </div>

          <div className="board-container">
            <Chessboard
              id="multiplayer-board"
              position={fen}
              width={520}
              orientation={boardOrientation}
              onDrop={this.onDrop}
              onSquareClick={this.onSquareClick}
              squareStyles={squareStyles}
              boardStyle={{
                borderRadius: "8px",
                boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
              }}
              lightSquareStyle={{ backgroundColor: "#f0d9b5" }}
              darkSquareStyle={{ backgroundColor: "#b58863" }}
              dropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }}
              draggable={inGame && !gameOver && this.isPlayerTurn()}
            />
          </div>

          {/* Move History */}
          <div className="move-history">
            <h3>Move History</h3>
            <div className="moves-list">
              {history.length === 0 ? (
                <span className="no-moves">No moves yet</span>
              ) : (
                history.map((move, index) => (
                  <span key={index} className="move">
                    {index % 2 === 0 && (
                      <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                    )}
                    {move.san}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="chat-panel">
          <div className="panel-title">Chat</div>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg ${msg.type}`}>
                {msg.type === 'chat' ? (
                  <>
                    <span className="chat-name">{msg.name}:</span> {msg.text}
                  </>
                ) : (
                  <em>{msg.text}</em>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => this.setState({ chatInput: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && this.sendChat()}
              disabled={!inGame}
            />
            <button
              className="btn btn-send"
              onClick={this.sendChat}
              disabled={!inGame || !chatInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Multiplayer;
