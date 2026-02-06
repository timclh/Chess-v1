/**
 * AI Coach Chat Component
 * Interactive chess coaching powered by AI
 */

import React, { Component } from 'react';
import './AICoach.css';

// Predefined coaching responses (will be replaced with LLM API later)
const COACHING_TIPS = {
  opening: [
    { cn: '开局时要控制中心，尤其是e4、d4、e5、d5这四个格子', en: 'Control the center in the opening, especially e4, d4, e5, d5' },
    { cn: '开局前三步尽量出动轻子（马和象），不要过早出后', en: 'Develop minor pieces (knights and bishops) in the first moves, avoid early queen moves' },
    { cn: '尽早完成王车易位，保护好国王', en: 'Castle early to protect your king' },
  ],
  tactics: [
    { cn: '每走一步前先检查对方是否有将军、吃子、威胁', en: 'Before each move, check for checks, captures, and threats' },
    { cn: '双攻是最常见的战术，同时攻击两个目标', en: 'Forks are the most common tactic - attacking two targets at once' },
    { cn: '牵制可以限制对方棋子的行动自由', en: 'Pins restrict the movement of enemy pieces' },
  ],
  endgame: [
    { cn: '残局中国王是战斗力量，要积极使用', en: 'In the endgame, the king is a fighting piece - use it actively' },
    { cn: '兵的升变是残局的关键，护送兵升变', en: 'Pawn promotion is key in endgames - escort your pawns' },
    { cn: '车残局中，车要活跃，占据开放线', en: 'In rook endgames, keep your rook active on open files' },
  ],
  general: [
    { cn: '下棋时要有计划，不要只是随便走', en: 'Play with a plan, don\'t just make random moves' },
    { cn: '每一步都要问自己：对方刚才那步想干什么？', en: 'After each opponent move, ask: what is their idea?' },
    { cn: '时间管理很重要，不要在一步棋上花太多时间', en: 'Time management is crucial - don\'t spend too long on one move' },
  ],
};

// Sample coaching conversations
const SAMPLE_RESPONSES = {
  'how to improve': {
    cn: '提高棋力的最佳方法是：1) 每天做战术题 2) 分析自己的对局 3) 学习经典开局 4) 研究大师对局。建议从每天10道战术题开始！',
    en: 'The best way to improve: 1) Solve tactics daily 2) Analyze your games 3) Learn classical openings 4) Study master games. Start with 10 puzzles a day!',
  },
  'best opening': {
    cn: '对于初学者，我推荐意大利开局(1.e4 e5 2.Nf3 Nc6 3.Bc4)或伦敦系统(1.d4 d5 2.Nf3 Nf6 3.Bf4)。它们容易学习，计划清晰。',
    en: 'For beginners, I recommend the Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) or London System (1.d4 d5 2.Nf3 Nf6 3.Bf4). They are easy to learn with clear plans.',
  },
  'why did i lose': {
    cn: '输棋的常见原因：1) 漏掉了对方的战术 2) 开局走入不熟悉的变化 3) 残局技术不足。让我帮你分析具体对局，找出问题！',
    en: 'Common reasons for losing: 1) Missing opponent\'s tactics 2) Unfamiliar opening lines 3) Weak endgame technique. Let me analyze your game to find the issues!',
  },
};

class AICoach extends Component {
  state = {
    messages: [],
    inputText: '',
    isTyping: false,
    currentTopic: 'general',
  };

  messagesEndRef = React.createRef();

  componentDidMount() {
    // Send welcome message
    this.addBotMessage({
      cn: '你好！我是你的AI象棋教练 🎯 有什么我可以帮助你的吗？你可以问我关于开局、战术、残局的问题，或者让我分析你的对局。',
      en: 'Hello! I\'m your AI Chess Coach 🎯 How can I help you today? You can ask me about openings, tactics, endgames, or request game analysis.',
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.messages.length !== this.state.messages.length) {
      this.scrollToBottom();
    }
  }

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  addBotMessage = (content, delay = 500) => {
    this.setState({ isTyping: true });
    
    setTimeout(() => {
      this.setState(state => ({
        messages: [...state.messages, {
          type: 'bot',
          content,
          timestamp: new Date(),
        }],
        isTyping: false,
      }));
    }, delay);
  };

  addUserMessage = (text) => {
    this.setState(state => ({
      messages: [...state.messages, {
        type: 'user',
        content: text,
        timestamp: new Date(),
      }],
    }));
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { inputText } = this.state;
    if (!inputText.trim()) return;

    this.addUserMessage(inputText);
    this.setState({ inputText: '' });

    // Generate response
    this.generateResponse(inputText.toLowerCase());
  };

  generateResponse = (input) => {
    // Check for keyword matches
    for (const [key, response] of Object.entries(SAMPLE_RESPONSES)) {
      if (input.includes(key)) {
        this.addBotMessage(response, 800);
        return;
      }
    }

    // Topic detection
    let topic = 'general';
    if (input.includes('opening') || input.includes('开局')) {
      topic = 'opening';
    } else if (input.includes('tactic') || input.includes('战术') || input.includes('fork') || input.includes('pin')) {
      topic = 'tactics';
    } else if (input.includes('endgame') || input.includes('残局')) {
      topic = 'endgame';
    }

    // Get random tip from topic
    const tips = COACHING_TIPS[topic];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    // Create response
    const responses = [
      { cn: `好问题！这里有一个建议：${tip.cn}`, en: `Great question! Here's a tip: ${tip.en}` },
      { cn: `让我分享一个技巧：${tip.cn}`, en: `Let me share a technique: ${tip.en}` },
      { cn: `这是我的建议：${tip.cn}`, en: `Here's my advice: ${tip.en}` },
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addBotMessage(response, 1000);
  };

  handleQuickAction = (action) => {
    const actions = {
      analyze: {
        cn: '要分析对局，请在下完棋后点击"复盘"按钮。我会帮你找出失误，给出最佳走法建议！',
        en: 'To analyze a game, click the "Review" button after playing. I\'ll help identify mistakes and suggest best moves!',
      },
      tips: {
        cn: '每日小贴士：' + COACHING_TIPS.general[Math.floor(Math.random() * COACHING_TIPS.general.length)].cn,
        en: 'Daily tip: ' + COACHING_TIPS.general[Math.floor(Math.random() * COACHING_TIPS.general.length)].en,
      },
      study: {
        cn: '推荐学习计划：\n1️⃣ 每天10道战术题\n2️⃣ 学习一个开局变化\n3️⃣ 下2-3盘慢棋并复盘\n4️⃣ 观看一个教学视频',
        en: 'Recommended study plan:\n1️⃣ 10 tactics puzzles daily\n2️⃣ Learn one opening variation\n3️⃣ Play 2-3 slow games and review\n4️⃣ Watch one instructional video',
      },
      videos: {
        cn: '推荐视频教程：\n📺 GothamChess - 适合初中级\n📺 Agadmator - 大师对局讲解\n📺 ChessBase India - 印度大师课程',
        en: 'Recommended videos:\n📺 GothamChess - Beginner to Intermediate\n📺 Agadmator - Master game analysis\n📺 ChessBase India - Indian master lessons',
      },
    };

    this.addUserMessage(action === 'analyze' ? 'Analyze my game' : 
                        action === 'tips' ? 'Give me a tip' :
                        action === 'study' ? 'Study plan' : 'Video recommendations');
    this.addBotMessage(actions[action], 600);
  };

  render() {
    const { messages, inputText, isTyping } = this.state;

    return (
      <div className="ai-coach">
        {/* Header */}
        <div className="coach-header">
          <div className="coach-avatar">🤖</div>
          <div className="coach-info">
            <h3>AI Coach / AI教练</h3>
            <span className="status">● Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              {msg.type === 'bot' && <span className="avatar">🤖</span>}
              <div className="content">
                {typeof msg.content === 'object' ? (
                  <>
                    <p className="cn">{msg.content.cn}</p>
                    <p className="en">{msg.content.en}</p>
                  </>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot">
              <span className="avatar">🤖</span>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={this.messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button onClick={() => this.handleQuickAction('analyze')}>📊 Analyze Game</button>
          <button onClick={() => this.handleQuickAction('tips')}>💡 Get Tips</button>
          <button onClick={() => this.handleQuickAction('study')}>📚 Study Plan</button>
          <button onClick={() => this.handleQuickAction('videos')}>📺 Videos</button>
        </div>

        {/* Input */}
        <form className="input-container" onSubmit={this.handleSubmit}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => this.setState({ inputText: e.target.value })}
            placeholder="Ask your coach... 问教练问题..."
            disabled={isTyping}
          />
          <button type="submit" disabled={isTyping || !inputText.trim()}>
            Send
          </button>
        </form>
      </div>
    );
  }
}

export default AICoach;
