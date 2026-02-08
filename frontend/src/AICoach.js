/**
 * AI Coach Chat Component
 * Interactive chess coaching powered by AI
 */

import React, { Component } from 'react';
import './AICoach.css';

// ============================================
// Position Analysis Engine (FEN-aware)
// ============================================
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function parseFEN(fen) {
  const parts = fen.split(' ');
  const boardStr = parts[0];
  const turn = parts[1] || 'w';
  const castling = parts[2] || '-';
  const rows = boardStr.split('/');
  const pieces = { w: [], b: [] };
  const pawns = { w: [], b: [] };
  const board = [];

  for (let r = 0; r < 8; r++) {
    const row = [];
    let col = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) { row.push(null); col++; }
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        const pos = String.fromCharCode(97 + col) + (8 - r);
        row.push({ type, color, pos });
        pieces[color].push({ type, pos });
        if (type === 'p') pawns[color].push({ col, row: r, pos });
        col++;
      }
    }
    board.push(row);
  }
  return { board, pieces, pawns, turn, castling };
}

function analyzeMaterial(pieces) {
  const count = (color) => pieces[color].reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);
  const w = count('w'), b = count('b');
  const diff = w - b;
  const pieceCounts = {};
  ['w', 'b'].forEach(c => {
    pieceCounts[c] = {};
    pieces[c].forEach(p => { pieceCounts[c][p.type] = (pieceCounts[c][p.type] || 0) + 1; });
  });
  return { white: w, black: b, diff, pieceCounts };
}

function analyzePawnStructure(pawns) {
  const result = { w: { doubled: [], isolated: [], passed: [], islands: 0 }, b: { doubled: [], isolated: [], passed: [], islands: 0 } };

  ['w', 'b'].forEach(color => {
    const opp = color === 'w' ? 'b' : 'w';
    const cols = {};
    pawns[color].forEach(p => { cols[p.col] = (cols[p.col] || []).concat(p); });

    // Doubled
    Object.entries(cols).forEach(([col, ps]) => {
      if (ps.length > 1) result[color].doubled.push(...ps.map(p => p.pos));
    });

    // Isolated
    Object.keys(cols).forEach(col => {
      const c = parseInt(col);
      if (!cols[c - 1] && !cols[c + 1]) {
        result[color].isolated.push(...cols[c].map(p => p.pos));
      }
    });

    // Passed
    pawns[color].forEach(p => {
      const oppPawns = pawns[opp];
      const isBlocked = oppPawns.some(op => {
        if (Math.abs(op.col - p.col) > 1) return false;
        return color === 'w' ? op.row < p.row : op.row > p.row;
      });
      if (!isBlocked) result[color].passed.push(p.pos);
    });

    // Islands
    const sortedCols = Object.keys(cols).map(Number).sort((a, b) => a - b);
    let islands = 0;
    for (let i = 0; i < sortedCols.length; i++) {
      if (i === 0 || sortedCols[i] - sortedCols[i - 1] > 1) islands++;
    }
    result[color].islands = islands;
  });

  return result;
}

function explainPosition(fen) {
  const { pieces, pawns, turn, castling } = parseFEN(fen);
  const material = analyzeMaterial(pieces);
  const pawnStruct = analyzePawnStructure(pawns);

  const insights = [];
  const insightsCn = [];

  // Material
  if (material.diff > 0) {
    insights.push(`White is up ${material.diff} point${material.diff > 1 ? 's' : ''} of material (${material.white} vs ${material.black}).`);
    insightsCn.push(`白方多${material.diff}分子力（${material.white} 对 ${material.black}）。`);
  } else if (material.diff < 0) {
    insights.push(`Black is up ${-material.diff} point${material.diff < -1 ? 's' : ''} of material (${material.black} vs ${material.white}).`);
    insightsCn.push(`黑方多${-material.diff}分子力（${material.black} 对 ${material.white}）。`);
  } else {
    insights.push(`Material is equal (${material.white} each).`);
    insightsCn.push(`子力相等（各${material.white}分）。`);
  }

  // Turn
  insights.push(`It's ${turn === 'w' ? "White" : "Black"}'s turn to move.`);
  insightsCn.push(`轮到${turn === 'w' ? '白' : '黑'}方走棋。`);

  // Castling rights
  if (castling !== '-') {
    const rights = [];
    if (castling.includes('K')) rights.push('White O-O');
    if (castling.includes('Q')) rights.push('White O-O-O');
    if (castling.includes('k')) rights.push('Black O-O');
    if (castling.includes('q')) rights.push('Black O-O-O');
    insights.push(`Castling available: ${rights.join(', ')}.`);
  } else {
    insights.push('No castling rights remain.');
    insightsCn.push('双方都不能王车易位了。');
  }

  // Pawn structure
  ['w', 'b'].forEach(color => {
    const name = color === 'w' ? 'White' : 'Black';
    const nameCn = color === 'w' ? '白方' : '黑方';
    const ps = pawnStruct[color];
    if (ps.doubled.length > 0) {
      insights.push(`${name} has doubled pawns on ${ps.doubled.join(', ')}.`);
      insightsCn.push(`${nameCn}有叠兵在${ps.doubled.join(', ')}。`);
    }
    if (ps.isolated.length > 0) {
      insights.push(`${name} has isolated pawns on ${ps.isolated.join(', ')}.`);
      insightsCn.push(`${nameCn}有孤兵在${ps.isolated.join(', ')}。`);
    }
    if (ps.passed.length > 0) {
      insights.push(`${name} has passed pawns on ${ps.passed.join(', ')} — potential promotion threats!`);
      insightsCn.push(`${nameCn}有通路兵在${ps.passed.join(', ')}——潜在升变威胁！`);
    }
  });

  // Piece presence
  const totalPieces = pieces.w.length + pieces.b.length;
  if (totalPieces <= 10) {
    insights.push('This is an endgame position — activate your king!');
    insightsCn.push('这是残局局面——要积极使用国王！');
  } else if (totalPieces <= 20) {
    insights.push('This is a middlegame position with some pieces exchanged.');
    insightsCn.push('中局局面，已有部分子力交换。');
  }

  return { cn: insightsCn.join('\n'), en: insights.join('\n') };
}

function getStudySuggestions() {
  // Read user stats from localStorage
  const chessRating = JSON.parse(localStorage.getItem('puzzle_rating_chess') || '{"rating":1200}');
  const puzzlesSolved = JSON.parse(localStorage.getItem('puzzles_solved') || '[]');
  const suggestions = [];
  const suggestionsCn = [];

  if (chessRating.rating < 1000) {
    suggestions.push('📚 Focus on basic tactics (forks, pins, skewers) — try the Puzzle section!');
    suggestionsCn.push('📚 重点练习基本战术（双攻、牵制、串打）——去做题吧！');
  } else if (chessRating.rating < 1300) {
    suggestions.push('🧩 Work on intermediate patterns and start studying openings.');
    suggestionsCn.push('🧩 练习中级模式，开始学习开局。');
  } else {
    suggestions.push('🏆 Study positional play and endgame technique to break through.');
    suggestionsCn.push('🏆 学习位置型棋艺和残局技巧来突破瓶颈。');
  }

  if (puzzlesSolved.length < 20) {
    suggestions.push('🎯 Try solving more puzzles daily — consistency is key!');
    suggestionsCn.push('🎯 每天多做一些题目——持之以恒是关键！');
  }

  suggestions.push('📺 Watch the video tutorials in the Video Library for visual learning.');
  suggestionsCn.push('📺 去视频教程区观看教学视频，可视化学习更高效。');

  suggestions.push('📖 Practice openings in the Opening Explorer to build your repertoire.');
  suggestionsCn.push('📖 在开局库中练习开局，建立自己的开局体系。');

  return { cn: suggestionsCn.join('\n'), en: suggestions.join('\n') };
}

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
    // Check if input is a FEN string
    const fenMatch = input.match(/^([rnbqkpRNBQKP1-8/]+)\s+([wb])\s+([KQkq-]+)\s+([a-h1-8-]+)/);
    if (fenMatch) {
      const analysis = explainPosition(input.trim());
      this.addBotMessage({
        cn: `📊 局面分析：\n${analysis.cn}`,
        en: `📊 Position Analysis:\n${analysis.en}`,
      }, 800);
      return;
    }

    // Check for position/explain keywords
    if (input.includes('explain') || input.includes('position') || input.includes('分析') || input.includes('局面')) {
      this.addBotMessage({
        cn: '请粘贴一个FEN字符串，我来帮你分析局面！\n例如：rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        en: 'Paste a FEN string and I\'ll analyze the position!\nExample: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      }, 600);
      return;
    }

    // Check for pawn structure keywords
    if (input.includes('pawn') || input.includes('兵') || input.includes('structure') || input.includes('结构')) {
      this.addBotMessage({
        cn: '兵型分析要点：\n1️⃣ 避免叠兵（同一列两个兵）\n2️⃣ 保护孤兵或用子力支援\n3️⃣ 创建通路兵是获胜关键\n4️⃣ 兵链的基底是攻击目标\n\n粘贴FEN可以分析具体局面的兵型！',
        en: 'Pawn structure tips:\n1️⃣ Avoid doubled pawns (two pawns on same file)\n2️⃣ Support isolated pawns with pieces\n3️⃣ Creating passed pawns is key to winning\n4️⃣ The base of a pawn chain is the target\n\nPaste a FEN to analyze a specific position\'s structure!',
      }, 800);
      return;
    }

    // Check for study/weakness suggestions
    if (input.includes('study') || input.includes('weak') || input.includes('学习') || input.includes('建议') || input.includes('suggest')) {
      const suggestions = getStudySuggestions();
      this.addBotMessage({
        cn: `📋 个性化学习建议：\n${suggestions.cn}`,
        en: `📋 Personalized Study Suggestions:\n${suggestions.en}`,
      }, 800);
      return;
    }

    // Check for opening keywords - try to detect and recommend
    if (input.includes('opening') || input.includes('开局')) {
      const openingTip = COACHING_TIPS.opening[Math.floor(Math.random() * COACHING_TIPS.opening.length)];
      this.addBotMessage({
        cn: `关于开局：${openingTip.cn}\n\n💡 去开局库可以学习和练习各种开局！`,
        en: `About openings: ${openingTip.en}\n\n💡 Visit the Opening Explorer to learn and practice!`,
      }, 800);
      return;
    }

    // Check for keyword matches
    for (const [key, response] of Object.entries(SAMPLE_RESPONSES)) {
      if (input.includes(key)) {
        this.addBotMessage(response, 800);
        return;
      }
    }

    // Topic detection
    let topic = 'general';
    if (input.includes('tactic') || input.includes('战术') || input.includes('fork') || input.includes('pin')) {
      topic = 'tactics';
    } else if (input.includes('endgame') || input.includes('残局')) {
      topic = 'endgame';
    }

    // Get random tip from topic
    const tips = COACHING_TIPS[topic];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    const responses = [
      { cn: `好问题！这里有一个建议：${tip.cn}`, en: `Great question! Here's a tip: ${tip.en}` },
      { cn: `让我分享一个技巧：${tip.cn}`, en: `Let me share a technique: ${tip.en}` },
      { cn: `这是我的建议：${tip.cn}`, en: `Here's my advice: ${tip.en}` },
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addBotMessage(response, 1000);
  };

  handleQuickAction = (action) => {
    if (action === 'explain') {
      this.addUserMessage('Explain position');
      this.addBotMessage({
        cn: '📊 粘贴FEN字符串来分析局面。\n你可以从对局中复制FEN，也可以使用初始局面：\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        en: '📊 Paste a FEN string to analyze. You can copy FEN from your game.\nOr try the starting position:\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }, 600);
      return;
    }

    if (action === 'study') {
      this.addUserMessage('Study suggestions');
      const suggestions = getStudySuggestions();
      this.addBotMessage({
        cn: `📋 个性化学习建议：\n${suggestions.cn}`,
        en: `📋 Personalized Study Suggestions:\n${suggestions.en}`,
      }, 600);
      return;
    }

    const actions = {
      analyze: {
        cn: '要分析对局，请在下完棋后点击"复盘"按钮。我会帮你找出失误，给出最佳走法建议！',
        en: 'To analyze a game, click the "Review" button after playing. I\'ll help identify mistakes and suggest best moves!',
      },
      tips: {
        cn: '每日小贴士：' + COACHING_TIPS.general[Math.floor(Math.random() * COACHING_TIPS.general.length)].cn,
        en: 'Daily tip: ' + COACHING_TIPS.general[Math.floor(Math.random() * COACHING_TIPS.general.length)].en,
      },
      videos: {
        cn: '推荐视频教程：\n📺 GothamChess - 适合初中级\n📺 Agadmator - 大师对局讲解\n📺 ChessBase India - 印度大师课程',
        en: 'Recommended videos:\n📺 GothamChess - Beginner to Intermediate\n📺 Agadmator - Master game analysis\n📺 ChessBase India - Indian master lessons',
      },
    };

    this.addUserMessage(action === 'analyze' ? 'Analyze my game' : 
                        action === 'tips' ? 'Give me a tip' : 'Video recommendations');
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
          <button onClick={() => this.handleQuickAction('explain')}>📊 Explain Position</button>
          <button onClick={() => this.handleQuickAction('analyze')}>🔍 Analyze Game</button>
          <button onClick={() => this.handleQuickAction('tips')}>💡 Get Tips</button>
          <button onClick={() => this.handleQuickAction('study')}>📚 Study Plan</button>
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
