import React, { Component } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import "./App.css";

// Use environment variable or fallback to localhost
const URL = process.env.REACT_APP_WS_URL || "ws://localhost:3030";

// Maximum number of messages to keep in memory
const MAX_MESSAGES = 100;

// Reconnection settings
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

class Chat extends Component {
  state = {
    name: "Bob",
    messages: [],
    connected: false,
  };

  ws = null;
  messageIdCounter = 0;
  reconnectAttempts = 0;
  reconnectTimeoutId = null;

  componentDidMount() {
    this.connectWebSocket();
  }

  componentWillUnmount() {
    // Clean up WebSocket connection
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnection on intentional close
      this.ws.close();
      this.ws = null;
    }
  }

  connectWebSocket = () => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(URL);

      this.ws.onopen = () => {

        this.reconnectAttempts = 0;
        this.setState({ connected: true });
      };

      this.ws.onmessage = (evt) => {
        try {
          const message = JSON.parse(evt.data);
          this.addMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.warn("WebSocket disconnected:", event.code, event.reason);
        this.setState({ connected: false });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.setState({ connected: false });
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.handleReconnect();
    }
  };

  handleReconnect = () => {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;


    this.reconnectTimeoutId = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  };

  addMessage = (message) => {
    // Add unique ID for React key
    const messageWithId = {
      ...message,
      id: ++this.messageIdCounter,
    };

    this.setState((state) => {
      // Limit messages to prevent unbounded memory growth
      const newMessages = [messageWithId, ...state.messages];
      if (newMessages.length > MAX_MESSAGES) {
        newMessages.length = MAX_MESSAGES;
      }
      return { messages: newMessages };
    });
  };

  submitMessage = (messageString) => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send message");
      return;
    }

    const message = { name: this.state.name, message: messageString };
    try {
      this.ws.send(JSON.stringify(message));
      this.addMessage(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  render() {
    const { name, messages, connected } = this.state;

    return (
      <div>
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: connected ? "#4caf50" : "#f44336",
              marginRight: "8px",
            }}
          />
          {connected ? "Connected" : "Disconnected"}
        </div>
        <label htmlFor="name">
          Name:&nbsp;
          <input
            type="text"
            id={"name"}
            placeholder={"Enter your name..."}
            value={name}
            onChange={(e) => this.setState({ name: e.target.value })}
          />
        </label>
        <ChatInput
          ws={this.ws}
          onSubmitMessage={(messageString) => this.submitMessage(messageString)}
        />
        <div className="content">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.message}
              name={message.name}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default Chat;
