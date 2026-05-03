/**
 * LLM Service — AI language model integration layer
 *
 * Provides a unified interface for AI-powered coaching. Ships with a built-in
 * rule-based engine that works offline, and can be upgraded to call an external
 * LLM API (OpenAI, Claude, etc.) by setting the provider config.
 *
 * API:
 *   setProvider(config)          – configure LLM endpoint
 *   analyzePosition(fen, type)   – explain a board position
 *   explainMove(move, fen, type) – why a move is good/bad
 *   suggestPlan(context)         – training plan from history
 *   chat(messages, context)      – multi-turn conversation
 */

import { GAME_TYPE } from '../constants';

// ── Provider Config ───────────────────────────────────────
let _provider = { type: 'local' }; // 'local' | 'openai' | 'custom'

const STORAGE_KEY = 'qi_arena_llm_config';

function loadProviderConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _provider = JSON.parse(raw);
  } catch { /* use default */ }
}

export function setProvider(config) {
  _provider = { ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_provider));
}

export function getProvider() {
  return { ..._provider };
}

// Initialize on load
loadProviderConfig();

// ── Rate Limiting ─────────────────────────────────────────
const _requestLog = [];
const RATE_LIMIT = 20;       // max requests per minute
const RATE_WINDOW = 60_000;  // ms

function checkRateLimit() {
  const now = Date.now();
  // Remove old entries
  while (_requestLog.length > 0 && now - _requestLog[0] > RATE_WINDOW) {
    _requestLog.shift();
  }
  if (_requestLog.length >= RATE_LIMIT) {
    return false;
  }
  _requestLog.push(now);
  return true;
}

// ── Prompt Templates ──────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert board game coach for the 棋 Arena platform. 
You coach Chess (international), Xiangqi (Chinese chess), and Wuziqi (Gomoku/Five-in-a-Row).
Provide analysis in both English and Chinese. Be encouraging but honest about mistakes.
Keep responses concise and actionable.`;

function buildPositionPrompt(fen, gameType) {
  const gameLabel = {
    [GAME_TYPE.CHESS]: 'International Chess',
    [GAME_TYPE.XIANGQI]: 'Chinese Chess (Xiangqi)',
    [GAME_TYPE.WUZIQI]: 'Gomoku (WuziQi)',
  }[gameType] || 'Chess';

  return `Analyze this ${gameLabel} position: ${fen}
Provide:
1. Who has the advantage and why
2. Key threats and tactical ideas
3. Suggested plan for the side to move
Respond in both English and Chinese.`;
}

function buildMoveExplanationPrompt(move, fen, gameType) {
  const gameLabel = {
    [GAME_TYPE.CHESS]: 'Chess',
    [GAME_TYPE.XIANGQI]: 'Xiangqi',
    [GAME_TYPE.WUZIQI]: 'Gomoku',
  }[gameType] || 'Chess';

  return `In this ${gameLabel} position (${fen}), explain the move ${move}.
Is it a good move? What does it accomplish? What alternatives exist?
Respond in both English and Chinese.`;
}

function buildTrainingPlanPrompt(context) {
  return `Based on this player's profile, create a personalized training plan:
- Rating: ${context.rating}
- Games played: ${context.gamesPlayed}
- Win rate: ${context.winRate}%
- Main weaknesses: ${context.weaknesses.join(', ')}
- Preferred game: ${context.preferredGame}

Provide a 7-day training plan with specific daily tasks.
Respond in both English and Chinese.`;
}

// ── Local Engine (rule-based fallback) ────────────────────

const LOCAL_RESPONSES = {
  // Chess position analysis patterns
  chessOpening: {
    en: 'This is an opening position. Focus on: 1) Controlling the center with pawns (e4/d4) 2) Developing knights and bishops 3) Castling for king safety. Avoid moving the same piece twice or bringing out the queen too early.',
    cn: '这是一个开局局面。重点关注：1) 用兵控制中心（e4/d4） 2) 发展马和象 3) 尽早王车易位保护国王。避免重复移动同一棋子或过早出后。',
  },
  chessMidgame: {
    en: 'In the middlegame: 1) Look for tactical combinations (forks, pins, skewers) 2) Improve your worst-placed piece 3) Control open files with rooks 4) Create a plan based on pawn structure.',
    cn: '在中局中：1) 寻找战术组合（双攻、牵制、串击） 2) 改善位置最差的棋子 3) 用车控制开放线 4) 根据兵型制定计划。',
  },
  chessEndgame: {
    en: 'Endgame principles: 1) Activate your king — it\'s a strong piece in endgames 2) Create passed pawns and push them 3) Centralize your pieces 4) In rook endgames, keep your rook active.',
    cn: '残局原则：1) 激活国王——残局中国王是强力棋子 2) 创建通路兵并推进它们 3) 集中化你的棋子 4) 车残局中保持车的活跃。',
  },
  xiangqiGeneral: {
    en: 'Xiangqi tips: 1) The chariot (rook) is the most powerful piece — develop it early 2) Cannons are strongest in the opening with many screen pieces 3) Control the central file 4) Coordinate horse and cannon attacks.',
    cn: '象棋技巧：1) 车是最强棋子——尽早出车 2) 炮在开局有很多炮架时最强 3) 控制中路 4) 配合马炮进攻。',
  },
  wuziqi: {
    en: 'Gomoku strategy: 1) Control the center — the center stone has the most influence 2) Build open-ended threes (threats in both directions) 3) Block opponent\'s open threes immediately 4) Create "four-three" double threats for guaranteed wins.',
    cn: '五子棋策略：1) 控制中心——中心棋子影响力最大 2) 构建活三（两端都有威胁） 3) 立即阻断对方的活三 4) 创建"四三"双重威胁确保获胜。',
  },
};

function localAnalyzePosition(fen, gameType) {
  if (gameType === GAME_TYPE.WUZIQI) {
    return LOCAL_RESPONSES.wuziqi;
  }
  if (gameType === GAME_TYPE.XIANGQI) {
    return LOCAL_RESPONSES.xiangqiGeneral;
  }
  // Chess: determine phase from FEN
  if (!fen) return LOCAL_RESPONSES.chessOpening;
  const pieces = (fen.split(' ')[0] || '').replace(/[0-9/]/g, '');
  if (pieces.length > 26) return LOCAL_RESPONSES.chessOpening;
  if (pieces.length > 14) return LOCAL_RESPONSES.chessMidgame;
  return LOCAL_RESPONSES.chessEndgame;
}

function localExplainMove(move, fen, gameType) {
  const captures = move.includes('x') || move.includes('吃');
  const check = move.includes('+') || move.includes('#');

  let response;
  if (check) {
    response = {
      en: `${move} delivers check! This move forces the opponent to respond to the threat to their king, giving you the initiative.`,
      cn: `${move} 将军！这步棋迫使对方应对国王的威胁，让你掌握主动权。`,
    };
  } else if (captures) {
    response = {
      en: `${move} is a capture. Always evaluate whether captured material is worth any positional concessions.`,
      cn: `${move} 是一步吃子。始终评估吃掉的子力是否值得任何位置上的让步。`,
    };
  } else {
    response = {
      en: `${move} improves your position. Consider: does it develop a piece, control key squares, or prepare a future plan?`,
      cn: `${move} 改善了你的局面。思考：它是否发展了棋子、控制了关键格子或为未来计划做准备？`,
    };
  }
  return response;
}

function localSuggestPlan(context) {
  const { rating, weaknesses, preferredGame } = context;
  const plans = [];

  if (rating < 1200) {
    plans.push({
      en: '📚 **Week Plan for Beginners:**\nDay 1-2: Solve 10 easy tactics puzzles daily\nDay 3-4: Play 3 games against Easy AI, review each game\nDay 5-6: Study basic openings in the Opening Explorer\nDay 7: Play 3 games against Medium AI, analyze mistakes',
      cn: '📚 **初学者周计划：**\n第1-2天：每天做10道简单战术题\n第3-4天：与简单AI下3局，每局都复盘\n第5-6天：在开局库中学习基础开局\n第7天：与中等AI下3局，分析失误',
    });
  } else if (rating < 1600) {
    plans.push({
      en: '📚 **Week Plan for Intermediate:**\nDay 1: Solve 15 medium tactics puzzles\nDay 2: Study 2 openings deeply in the Explorer\nDay 3: Play 3 games vs Hard AI\nDay 4: Review all Day 3 games with engine\nDay 5: Endgame study — K+R vs K, K+P vs K\nDay 6: Play 5 games, focus on one opening\nDay 7: Solve 20 puzzles, review weakest area',
      cn: '📚 **中级周计划：**\n第1天：做15道中等战术题\n第2天：在开局库深入学习2个开局\n第3天：与困难AI下3局\n第4天：用引擎复盘第3天的对局\n第5天：残局学习——王车对王、王兵对王\n第6天：下5局，专注一个开局\n第7天：做20道题，复习最弱环节',
    });
  } else {
    plans.push({
      en: '📚 **Week Plan for Advanced:**\nDay 1: Solve 20 hard tactical puzzles\nDay 2: Analyze a master game with engine\nDay 3: Play 3 competitive games, log all mistakes\nDay 4: Deep opening preparation — prepare a repertoire\nDay 5: Complex endgame study (R+P endings)\nDay 6: Play 5 games with your prepared openings\nDay 7: Full game analysis of all week\'s games',
      cn: '📚 **高级周计划：**\n第1天：做20道高难度战术题\n第2天：用引擎分析一盘大师对局\n第3天：下3盘正式对局，记录所有失误\n第4天：深入开局准备——建立开局体系\n第5天：复杂残局学习（车兵残局）\n第6天：用准备好的开局下5盘\n第7天：全面分析本周所有对局',
    });
  }

  if (weaknesses.includes('tactics')) {
    plans.push({
      en: '⚠️ **Weakness: Tactics** — Add 10 extra puzzles per day focused on pattern recognition.',
      cn: '⚠️ **弱点：战术** — 每天额外做10道专注于模式识别的题目。',
    });
  }
  if (weaknesses.includes('opening')) {
    plans.push({
      en: '⚠️ **Weakness: Openings** — Spend 15 minutes daily in the Opening Explorer learning your chosen lines.',
      cn: '⚠️ **弱点：开局** — 每天花15分钟在开局库中学习你选择的变化。',
    });
  }
  if (weaknesses.includes('endgame')) {
    plans.push({
      en: '⚠️ **Weakness: Endgames** — Study one endgame position thoroughly every other day.',
      cn: '⚠️ **弱点：残局** — 每隔一天深入学习一个残局局面。',
    });
  }

  return {
    en: plans.map(p => p.en).join('\n\n'),
    cn: plans.map(p => p.cn).join('\n\n'),
  };
}

// ── Coaching Topic Responses ──────────────────────────────

const TOPIC_KNOWLEDGE = {
  // Chess topics
  fork: {
    en: 'A **fork** is when one piece attacks two or more enemy pieces simultaneously. Knights are especially good at forks because of their unique L-shaped movement. To practice: 1) Always check if your knight can attack two pieces at once 2) Look for queen forks targeting the king + another piece.',
    cn: '**双攻**是一个棋子同时攻击两个或更多对方棋子。马特别擅长双攻，因为它独特的L形移动方式。练习方法：1) 始终检查你的马是否能同时攻击两个棋子 2) 寻找后攻击国王+另一个棋子的双攻。',
  },
  pin: {
    en: 'A **pin** is when a piece cannot move because it would expose a more valuable piece behind it. Absolute pins (against the king) are the strongest — the pinned piece literally cannot move. Bishops and rooks are the best pinning pieces.',
    cn: '**牵制**是当一个棋子不能移动因为它会暴露身后更有价值的棋子。绝对牵制（对着国王）最强——被牵制的棋子完全不能移动。象和车是最好的牵制棋子。',
  },
  skewer: {
    en: 'A **skewer** is like a reverse pin — the more valuable piece is in front and must move, exposing the piece behind it. Common example: a bishop checking the king, and when the king moves, capturing the queen behind it.',
    cn: '**串击**像反向的牵制——更有价值的棋子在前面必须移动，暴露身后的棋子。常见例子：象将军国王，国王移动后吃掉身后的后。',
  },
  sacrifice: {
    en: 'A **sacrifice** is giving up material to gain a positional or tactical advantage. Types: 1) Tactical sacrifice — gain material back with interest 2) Positional sacrifice — exchange material for better position/initiative 3) Exchange sacrifice — giving up rook for minor piece + compensation.',
    cn: '**弃子**是舍弃棋子获得位置或战术优势。类型：1) 战术弃子——以更大收益夺回子力 2) 位置弃子——用子力换取更好的位置/主动权 3) 质量弃子——放弃车换轻子+补偿。',
  },
  castling: {
    en: 'Castle early (within the first 10 moves if possible). Kingside castling is faster and more common. Don\'t castle into an attack — if the opponent has pieces aimed at your kingside, consider castling queenside or delaying.',
    cn: '尽早王车易位（如果可能在前10步内）。王翼易位更快更常见。不要易位到攻击中——如果对方棋子瞄准你的王翼，考虑后翼易位或延迟。',
  },
  // Xiangqi topics
  xiangqiCannon: {
    en: 'The **cannon** is unique to Xiangqi. Key principles: 1) In the opening, cannons are strong because many pieces serve as screens 2) In the endgame, cannons weaken as screens disappear 3) The "double cannon checkmate" pattern is devastating 4) Place cannons on the central file for maximum impact.',
    cn: '**炮**是象棋独有的棋子。关键原则：1) 开局时炮很强因为有很多炮架 2) 残局时炮减弱因为炮架消失 3) "双炮将"是致命模式 4) 将炮放在中路获得最大影响力。',
  },
  xiangqiHorse: {
    en: 'The **horse** in Xiangqi can be blocked (蹩马腿). Tips: 1) Clear the blocking pieces before attempting horse moves 2) Horses are strongest in the center where they can\'t be easily blocked 3) The "horse controls heart" (马踩中心) is a powerful position.',
    cn: '象棋中的**马**可以被蹩腿。技巧：1) 在走马前清除挡路的棋子 2) 马在中心最强因为不容易被蹩 3) "马踩中心"是一个强力位置。',
  },
  // Wuziqi topics
  wuziqi43: {
    en: 'The **"four-three"** (四三) is the most important winning pattern in Gomoku. It creates an open four AND an open three simultaneously — the opponent can only block one, guaranteeing a win. Build towards this by creating multiple threats.',
    cn: '**"四三"**是五子棋中最重要的获胜模式。同时创建活四和活三——对手只能堵一个，确保获胜。通过创建多重威胁朝这个方向发展。',
  },
  wuziqiDefense: {
    en: 'Defense in Gomoku: 1) Always block open threes immediately 2) A "dead four" (one end blocked) is less urgent than an open three 3) When your opponent has an open three, you MUST respond 4) Counter-attack with your own threats when possible.',
    cn: '五子棋防守：1) 始终立即堵住活三 2) "冲四"（一端被堵）不如活三紧急 3) 当对手有活三时必须应对 4) 尽可能用自己的威胁反击。',
  },
};

function localChat(messages, context) {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return { en: 'How can I help?', cn: '有什么可以帮助你的？' };

  const input = (typeof lastMsg === 'string' ? lastMsg : lastMsg.content || '').toLowerCase();

  // Check for specific topic matches
  for (const [topic, response] of Object.entries(TOPIC_KNOWLEDGE)) {
    const keywords = topic.toLowerCase().split(/(?=[A-Z])/).join(' ').split(' ');
    if (keywords.some(kw => input.includes(kw))) {
      return response;
    }
  }

  // Check for game-specific queries
  if (input.includes('wuziqi') || input.includes('gomoku') || input.includes('五子棋')) {
    return LOCAL_RESPONSES.wuziqi;
  }
  if (input.includes('xiangqi') || input.includes('象棋') || input.includes('chinese chess')) {
    return LOCAL_RESPONSES.xiangqiGeneral;
  }

  // Check for improvement queries
  if (input.includes('improve') || input.includes('better') || input.includes('提高') || input.includes('进步')) {
    return {
      en: 'To improve: 1) Solve puzzles daily (builds pattern recognition) 2) Always analyze your losses 3) Focus on one opening and master it 4) Study endgames — they teach precise calculation 5) Play slow games and think about each move.',
      cn: '提高棋力的方法：1) 每天做题（建立模式识别） 2) 始终分析你输掉的对局 3) 专注一个开局并掌握它 4) 学习残局——它们教你精确计算 5) 下慢棋并思考每一步。',
    };
  }

  // Check for greetings
  if (input.match(/^(hi|hello|hey|你好|嗨|大家好)/)) {
    return {
      en: 'Hello! I\'m your AI coach for Chess, Xiangqi, and Gomoku. Ask me about openings, tactics, strategy, or paste a position for analysis!',
      cn: '你好！我是你的国际象棋、象棋和五子棋AI教练。问我关于开局、战术、策略的问题，或者粘贴局面让我分析！',
    };
  }

  // Default context-aware response
  const gameCtx = context?.currentGame || 'chess';
  if (gameCtx === GAME_TYPE.WUZIQI) {
    return LOCAL_RESPONSES.wuziqi;
  }
  if (gameCtx === GAME_TYPE.XIANGQI) {
    return LOCAL_RESPONSES.xiangqiGeneral;
  }

  return {
    en: 'Great question! Here are some tips: 1) Focus on tactics — they decide most games 2) Control the center 3) Develop all your pieces before attacking 4) Ask me about specific topics like "fork", "pin", "opening", or "endgame".',
    cn: '好问题！一些建议：1) 专注于战术——它们决定大多数对局 2) 控制中心 3) 在进攻前发展所有棋子 4) 问我关于具体主题如"双攻"、"牵制"、"开局"或"残局"。',
  };
}

// ── External API call (for real LLM providers) ────────────

async function callExternalLLM(prompt, systemPrompt = SYSTEM_PROMPT) {
  if (_provider.type === 'openai' && _provider.apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_provider.apiKey}`,
      },
      body: JSON.stringify({
        model: _provider.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { en: text, cn: text }; // API returns bilingual in the prompt
  }

  if (_provider.type === 'custom' && _provider.endpoint) {
    const response = await fetch(_provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ..._provider.headers,
      },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        ..._provider.extraParams,
      }),
    });

    if (!response.ok) throw new Error(`Custom LLM API error: ${response.status}`);
    const data = await response.json();
    return { en: data.response || data.text || '', cn: data.response || data.text || '' };
  }

  throw new Error('No external LLM provider configured');
}

// ── Public API ────────────────────────────────────────────

/**
 * Analyze a board position.
 */
export async function analyzePosition(fen, gameType = GAME_TYPE.CHESS) {
  if (!checkRateLimit()) {
    return { en: 'Rate limit reached. Please wait a moment.', cn: '请求过于频繁，请稍候。' };
  }

  if (_provider.type === 'local') {
    return localAnalyzePosition(fen, gameType);
  }

  try {
    const prompt = buildPositionPrompt(fen, gameType);
    return await callExternalLLM(prompt);
  } catch {
    return localAnalyzePosition(fen, gameType);
  }
}

/**
 * Explain why a move is good or bad.
 */
export async function explainMove(move, fen, gameType = GAME_TYPE.CHESS) {
  if (!checkRateLimit()) {
    return { en: 'Rate limit reached. Please wait a moment.', cn: '请求过于频繁，请稍候。' };
  }

  if (_provider.type === 'local') {
    return localExplainMove(move, fen, gameType);
  }

  try {
    const prompt = buildMoveExplanationPrompt(move, fen, gameType);
    return await callExternalLLM(prompt);
  } catch {
    return localExplainMove(move, fen, gameType);
  }
}

/**
 * Generate a personalized training plan.
 */
export async function suggestPlan(context) {
  if (!checkRateLimit()) {
    return { en: 'Rate limit reached. Please wait a moment.', cn: '请求过于频繁，请稍候。' };
  }

  if (_provider.type === 'local') {
    return localSuggestPlan(context);
  }

  try {
    const prompt = buildTrainingPlanPrompt(context);
    return await callExternalLLM(prompt);
  } catch {
    return localSuggestPlan(context);
  }
}

/**
 * Multi-turn chat with the coach.
 * @param {Array} messages - [{ role: 'user'|'assistant', content: string }]
 * @param {Object} context - { currentGame, fen, rating, etc. }
 */
export async function chat(messages, context = {}) {
  if (!checkRateLimit()) {
    return { en: 'Rate limit reached. Please wait a moment.', cn: '请求过于频繁，请稍候。' };
  }

  if (_provider.type === 'local') {
    return localChat(messages, context);
  }

  try {
    const conversationPrompt = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');
    
    const contextInfo = context.fen
      ? `\nCurrent position: ${context.fen}\nGame: ${context.currentGame || 'chess'}`
      : '';

    return await callExternalLLM(conversationPrompt + contextInfo);
  } catch {
    return localChat(messages, context);
  }
}

export default {
  setProvider,
  getProvider,
  analyzePosition,
  explainMove,
  suggestPlan,
  chat,
};
