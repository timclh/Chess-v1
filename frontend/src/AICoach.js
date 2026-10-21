/**
 * AI Coach — Enhanced Conversational Coach with LLM integration,
 * personalized training, and multi-turn context-aware responses.
 *
 * Supports Chess, Xiangqi, and Wuziqi coaching.
 * Phase 4: AI Coach Agent
 */

import React, { Component } from 'react';
import './AICoach.css';
import { chat as llmChat, analyzePosition as llmAnalyze, suggestPlan } from './services/LLMService';
import { getProvider, setProvider } from './services/LLMService';
import {
  getTrainingProgress,
  generateTrainingPlan,
  getCurrentPlan,
  getRecommendedExercises,
  completeActivity,
} from './services/TrainingPlanService';
import { getRatings } from './services/UserRatingService';
import { GAME_TYPE } from './constants';
import { Icon, StoneDot, Stars } from './components/Icon';

// Session storage key
const SESSION_KEY = 'qi_arena_coach_sessions';

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions) {
  const trimmed = sessions.slice(-20);
  localStorage.setItem(SESSION_KEY, JSON.stringify(trimmed));
}

// ── Tab Views ─────────────────────────────────────────────
const TAB = {
  CHAT: 'chat',
  TRAINING: 'training',
  PROGRESS: 'progress',
  SETTINGS: 'settings',
};

class AICoach extends Component {
  state = {
    // Chat
    messages: [],
    inputText: '',
    isTyping: false,
    conversationContext: [],
    activeGame: GAME_TYPE.CHESS,
    // Tabs
    activeTab: TAB.CHAT,
    // Training
    trainingPlan: getCurrentPlan(),
    exercises: [],
    // Progress
    progress: null,
    // Settings
    llmProvider: getProvider(),
    // Session
    savedSessions: loadSessions(),
  };

  messagesEndRef = React.createRef();

  componentDidMount() {
    this.addBotMessage({
      cn: '你好！我是你的AI教练 🎯\n我可以帮你学习国际象棋♟、象棋🀄和五子棋⚫。\n\n试试问我关于战术、开局、策略的问题，或者让我帮你制定训练计划！',
      en: 'Hello! I\'m your AI Coach 🎯\nI can help you with Chess ♟, Xiangqi 🀄, and Gomoku ⚫.\n\nAsk me about tactics, openings, strategy, or let me create a training plan for you!',
    });
    this.setState({
      exercises: getRecommendedExercises(this.state.activeGame),
      progress: getTrainingProgress(),
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
        messages: [...state.messages, { type: 'bot', content, timestamp: new Date() }],
        isTyping: false,
      }));
    }, delay);
  };

  addUserMessage = (text) => {
    this.setState(state => ({
      messages: [...state.messages, { type: 'user', content: text, timestamp: new Date() }],
      conversationContext: [
        ...state.conversationContext,
        { role: 'user', content: text },
      ],
    }));
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { inputText } = this.state;
    if (!inputText.trim()) return;
    this.addUserMessage(inputText);
    this.setState({ inputText: '' });
    this.generateResponse(inputText);
  };

  generateResponse = async (input) => {
    const lowerInput = input.toLowerCase();
    const { activeGame, conversationContext } = this.state;

    // FEN detection for chess
    const fenMatch = lowerInput.match(/^([rnbqkpRNBQKP1-8/]+)\s+([wb])\s+([KQkq-]+)\s+([a-h1-8-]+)/);
    if (fenMatch) {
      this.setState({ isTyping: true });
      const analysis = await llmAnalyze(input.trim(), GAME_TYPE.CHESS);
      this.addBotMessage({
        cn: '📊 局面分析：\n' + analysis.cn,
        en: '📊 Position Analysis:\n' + analysis.en,
      }, 300);
      this.updateContext('assistant', analysis.en);
      return;
    }

    // Training plan request
    if (lowerInput.includes('training plan') || lowerInput.includes('训练计划') || lowerInput.includes('practice plan')) {
      this.handleGenerateTrainingPlan();
      return;
    }

    // Progress request
    if (lowerInput.includes('progress') || lowerInput.includes('进度') || lowerInput.includes('stats') || lowerInput.includes('统计')) {
      this.handleShowProgress();
      return;
    }

    // Weakness request
    if (lowerInput.includes('weakness') || lowerInput.includes('弱点') || lowerInput.includes('improve') || lowerInput.includes('提高')) {
      this.handleShowWeaknesses();
      return;
    }

    // Position/explain
    if (lowerInput.includes('explain') || lowerInput.includes('position') || lowerInput.includes('分析') || lowerInput.includes('局面')) {
      this.addBotMessage({
        cn: '请粘贴一个 FEN 字符串来分析国际象棋局面！\n对于象棋和五子棋，请描述你的局面或问题。',
        en: 'Paste a FEN string to analyze a chess position!\nFor Xiangqi and Gomoku, describe your position or question.',
      }, 400);
      return;
    }

    // Game switching
    if (lowerInput.includes('xiangqi') || lowerInput.includes('象棋') || lowerInput.includes('chinese chess')) {
      this.setState({ activeGame: GAME_TYPE.XIANGQI });
      this.addBotMessage({
        cn: '🀄 已切换到象棋教练模式！我可以帮你学习车、马、炮的战术，或讨论象棋开局策略。',
        en: '🀄 Switched to Xiangqi coaching mode! I can help with chariot, horse, cannon tactics, or discuss opening strategies.',
      }, 400);
      return;
    }
    if (lowerInput.includes('gomoku') || lowerInput.includes('wuziqi') || lowerInput.includes('五子棋')) {
      this.setState({ activeGame: GAME_TYPE.WUZIQI });
      this.addBotMessage({
        cn: '⚫ 已切换到五子棋教练模式！我可以帮你学习活三、四三做杀等策略。',
        en: '⚫ Switched to Gomoku coaching mode! I can help with open threes, four-three patterns, and winning strategies.',
      }, 400);
      return;
    }
    if (lowerInput.includes('chess') && !lowerInput.includes('chinese')) {
      this.setState({ activeGame: GAME_TYPE.CHESS });
      this.addBotMessage({
        cn: '♟ 已切换到国际象棋教练模式！',
        en: '♟ Switched to Chess coaching mode!',
      }, 400);
      return;
    }

    // Use LLM service for general chat
    this.setState({ isTyping: true });
    try {
      const context = {
        currentGame: activeGame,
        ...this.getPlayerContext(),
      };
      const response = await llmChat(conversationContext, context);
      this.addBotMessage(response, 300);
      this.updateContext('assistant', typeof response === 'string' ? response : response.en);
    } catch (err) {
      this.addBotMessage({
        cn: '抱歉，我遇到了一些问题。请重试！',
        en: 'Sorry, I encountered an issue. Please try again!',
      }, 300);
    }
  };

  updateContext = (role, content) => {
    this.setState(state => ({
      conversationContext: [
        ...state.conversationContext,
        { role, content },
      ].slice(-20),
    }));
  };

  getPlayerContext = () => {
    const ratings = getRatings();
    return {
      chessRating: ratings.chess?.rating || 1200,
      xiangqiRating: ratings.xiangqi?.rating || 1200,
      wuziqiRating: ratings.wuziqi?.rating || 1200,
    };
  };

  // ── Training Plan ───────────────────────────────────────

  handleGenerateTrainingPlan = () => {
    const { activeGame } = this.state;
    const plan = generateTrainingPlan(activeGame);

    const gameLabel = {
      [GAME_TYPE.CHESS]: 'Chess / 国际象棋',
      [GAME_TYPE.XIANGQI]: 'Xiangqi / 象棋',
      [GAME_TYPE.WUZIQI]: 'Gomoku / 五子棋',
    }[activeGame];

    const daysSummary = plan.days.map(d => {
      const acts = d.activities.map(a => a.title.en).join(', ');
      return 'Day ' + d.day + ': ' + acts + ' (~' + d.estimatedMinutes + ' min)';
    }).join('\n');

    this.addBotMessage({
      cn: '📋 为你生成了' + gameLabel + '的7天训练计划！\n切换到"训练"标签查看详情。\n\n每天坚持训练，你一定会进步！💪',
      en: '📋 Generated a 7-day training plan for ' + gameLabel + '!\nSwitch to the "Training" tab for details.\n\n' + daysSummary,
    }, 600);

    this.setState({ trainingPlan: plan });
  };

  handleShowProgress = () => {
    const progress = getTrainingProgress();
    this.setState({ progress });

    this.addBotMessage({
      cn: '📊 你的训练进度：\n🔥 连续训练：' + progress.streak + ' 天\n📝 今日练习：' + progress.todayExercises + '\n📅 本周练习：' + progress.weekExercises + '\n♟ 棋力：国棋 ' + progress.ratings.chess + ' | 象棋 ' + progress.ratings.xiangqi + ' | 五子棋 ' + progress.ratings.wuziqi,
      en: '📊 Your training progress:\n🔥 Training streak: ' + progress.streak + ' days\n📝 Today: ' + progress.todayExercises + '\n📅 This week: ' + progress.weekExercises + '\n♟ Ratings: Chess ' + progress.ratings.chess + ' | Xiangqi ' + progress.ratings.xiangqi + ' | Gomoku ' + progress.ratings.wuziqi,
    }, 600);
  };

  handleShowWeaknesses = async () => {
    const { activeGame } = this.state;
    const ratings = getRatings();
    const rating = ratings[activeGame]?.rating || 1200;
    const gamesPlayed = ratings[activeGame]?.gamesPlayed || 0;
    const wins = ratings[activeGame]?.wins || 0;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    const context = {
      rating,
      gamesPlayed,
      winRate,
      weaknesses: ['tactics', 'opening'],
      preferredGame: activeGame,
    };

    this.setState({ isTyping: true });
    const plan = await suggestPlan(context);
    this.addBotMessage(plan, 300);
  };

  // ── Quick Actions ───────────────────────────────────────

  handleQuickAction = (action) => {
    switch (action) {
      case 'explain':
        this.addUserMessage('Explain position / 分析局面');
        this.generateResponse('explain position');
        break;
      case 'plan':
        this.addUserMessage('Create training plan / 制定训练计划');
        this.handleGenerateTrainingPlan();
        break;
      case 'progress':
        this.addUserMessage('Show my progress / 查看进度');
        this.handleShowProgress();
        break;
      case 'tips':
        this.addUserMessage('Give me tips / 给我建议');
        this.generateResponse('give me tips for ' + this.state.activeGame);
        break;
      case 'weakness':
        this.addUserMessage('Analyze my weaknesses / 分析弱点');
        this.handleShowWeaknesses();
        break;
      default:
        break;
    }
  };

  // ── Session Management ──────────────────────────────────

  handleSaveSession = () => {
    const { messages, activeGame } = this.state;
    if (messages.length < 2) return;

    const session = {
      id: Date.now(),
      game: activeGame,
      date: new Date().toISOString(),
      messageCount: messages.length,
      preview: (messages.find(m => m.type === 'user')?.content || 'Session').slice(0, 50),
      messages: messages.slice(0, 50),
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);
    this.setState({ savedSessions: sessions });

    this.addBotMessage({
      cn: '💾 对话已保存！你可以在设置标签中查看历史对话。',
      en: '💾 Session saved! You can view past sessions in the Settings tab.',
    }, 300);
  };

  handleLoadSession = (session) => {
    this.setState({
      messages: session.messages || [],
      activeGame: session.game || GAME_TYPE.CHESS,
      activeTab: TAB.CHAT,
    });
  };

  handleNewChat = () => {
    this.setState({
      messages: [],
      conversationContext: [],
      isTyping: false,
    }, () => {
      this.addBotMessage({
        cn: '🆕 新对话开始！有什么我可以帮助你的？',
        en: '🆕 New conversation! How can I help you?',
      });
    });
  };

  // ── Training Tab Activities ─────────────────────────────

  handleCompleteActivity = (dayIdx, actIdx) => {
    completeActivity(dayIdx, actIdx);
    this.setState({ trainingPlan: getCurrentPlan() });
  };

  // ── Settings ────────────────────────────────────────────

  handleProviderChange = (type) => {
    setProvider({ ...this.state.llmProvider, type });
    this.setState({ llmProvider: getProvider() });
  };

  // ── Render ──────────────────────────────────────────────

  renderChatTab() {
    const { messages, inputText, isTyping } = this.state;

    return (
      <React.Fragment>
        {/* Messages */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={'message ' + msg.type}>
              {msg.type === 'bot' && <span className="avatar"><Icon name="coach" size={16} /></span>}
              <div className="content">
                {typeof msg.content === 'object' ? (
                  <React.Fragment>
                    <p className="cn">{msg.content.cn}</p>
                    <p className="en">{msg.content.en}</p>
                  </React.Fragment>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message bot">
              <span className="avatar"><Icon name="coach" size={16} /></span>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={this.messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button onClick={() => this.handleQuickAction('explain')}><Icon name="chart" size={16} /> Analyze</button>
          <button onClick={() => this.handleQuickAction('tips')}><Icon name="hint" size={16} /> Tips</button>
          <button onClick={() => this.handleQuickAction('plan')}><Icon name="plan" size={16} /> Plan</button>
          <button onClick={() => this.handleQuickAction('progress')}><Icon name="trend" size={16} /> Progress</button>
          <button onClick={() => this.handleQuickAction('weakness')}><Icon name="target" size={16} /> Weakness</button>
          <button onClick={this.handleSaveSession}><Icon name="save" size={16} /> Save</button>
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
      </React.Fragment>
    );
  }

  renderTrainingTab() {
    const { trainingPlan, exercises, activeGame } = this.state;

    return (
      <div className="training-tab">
        {/* Recommended Exercises */}
        <div className="training-section">
          <h4><Icon name="target" size={16} /> Recommended Exercises 推荐练习</h4>
          {exercises.length === 0 ? (
            <p className="empty-text">No exercises available. Generate a training plan first!</p>
          ) : (
            <div className="exercise-list">
              {exercises.map(ex => (
                <div key={ex.id} className="exercise-card">
                  <div className="exercise-info">
                    <strong>{ex.title}</strong>
                    <span className="exercise-title-cn">{ex.titleCn}</span>
                    <span className="exercise-meta">
                      <><Icon name="clock" size={14} /> {ex.duration} min · <Stars count={ex.difficulty} /></>
                    </span>
                  </div>
                  <span className="exercise-reason">{ex.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training Plan */}
        <div className="training-section">
          <h4><Icon name="plan" size={16} /> Training Plan 训练计划</h4>
          {!trainingPlan ? (
            <div className="empty-plan">
              <p>No plan yet. Create one!</p>
              <button className="gen-plan-btn" onClick={this.handleGenerateTrainingPlan}>
                Generate Plan for {activeGame}
              </button>
            </div>
          ) : (
            <div className="plan-days">
              {trainingPlan.days.map((day, dayIdx) => (
                <div key={day.day} className="plan-day">
                  <h5>Day {day.day} <span className="day-time">~{day.estimatedMinutes} min</span></h5>
                  <div className="day-activities">
                    {day.activities.map((act, actIdx) => (
                      <label key={actIdx} className={'activity-item ' + (act.completed ? 'done' : '')}>
                        <input
                          type="checkbox"
                          checked={act.completed}
                          onChange={() => this.handleCompleteActivity(dayIdx, actIdx)}
                        />
                        <span>{act.title.en}</span>
                        <span className="activity-cn">{act.title.cn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  renderProgressTab() {
    const { progress } = this.state;
    if (!progress) return <p className="empty-text">Loading progress...</p>;

    return (
      <div className="progress-tab">
        {/* Stats Grid */}
        <div className="progress-stats">
          <div className="stat-card">
            <span className="stat-icon"><Icon name="streak" size={16} /></span>
            <span className="stat-value">{progress.streak}</span>
            <span className="stat-label-sm">Day Streak</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="terms" size={16} /></span>
            <span className="stat-value">{progress.todayExercises}</span>
            <span className="stat-label-sm">Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="calendar" size={16} /></span>
            <span className="stat-value">{progress.weekExercises}</span>
            <span className="stat-label-sm">This Week</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Icon name="done" size={16} /></span>
            <span className="stat-value">{progress.totalExercises}</span>
            <span className="stat-label-sm">Total</span>
          </div>
        </div>

        {/* Ratings */}
        <div className="training-section">
          <h4><Icon name="chart" size={16} /> Ratings 棋力</h4>
          <div className="rating-bars">
            <div className="rating-row">
              <span><Icon name="play" size={16} /> Chess</span>
              <div className="rating-bar-bg">
                <div className="rating-bar-fill" style={{ width: Math.min(100, (progress.ratings.chess / 2400) * 100) + '%' }} />
              </div>
              <span className="rating-num">{progress.ratings.chess}</span>
            </div>
            <div className="rating-row">
              <span>🀄 Xiangqi</span>
              <div className="rating-bar-bg">
                <div className="rating-bar-fill xiangqi-bar" style={{ width: Math.min(100, (progress.ratings.xiangqi / 2400) * 100) + '%' }} />
              </div>
              <span className="rating-num">{progress.ratings.xiangqi}</span>
            </div>
            <div className="rating-row">
              <span><StoneDot color="black" /> Gomoku</span>
              <div className="rating-bar-bg">
                <div className="rating-bar-fill wuziqi-bar" style={{ width: Math.min(100, (progress.ratings.wuziqi / 2400) * 100) + '%' }} />
              </div>
              <span className="rating-num">{progress.ratings.wuziqi}</span>
            </div>
          </div>
        </div>

        {/* Plan Progress */}
        {progress.planProgress && (
          <div className="training-section">
            <h4><Icon name="plan" size={16} /> Plan Progress</h4>
            <div className="plan-progress-bar">
              <div className="plan-bar-bg">
                <div className="plan-bar-fill" style={{ width: progress.planProgress.percent + '%' }} />
              </div>
              <span>{progress.planProgress.completed}/{progress.planProgress.total} ({progress.planProgress.percent}%)</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderSettingsTab() {
    const { llmProvider, savedSessions } = this.state;

    return (
      <div className="settings-tab">
        {/* Game Mode */}
        <div className="training-section">
          <h4><Icon name="games" size={16} /> Active Game 当前游戏</h4>
          <div className="game-selector">
            {[
              { key: GAME_TYPE.CHESS, icon: 'play', label: 'Chess', labelCn: '国际象棋' },
              { key: GAME_TYPE.XIANGQI, label: 'Xiangqi', labelCn: '象棋' },
              { key: GAME_TYPE.WUZIQI, stone: true, label: 'Gomoku', labelCn: '五子棋' },
            ].map(g => (
              <button
                key={g.key}
                className={'game-sel-btn ' + (this.state.activeGame === g.key ? 'active' : '')}
                onClick={() => this.setState({ activeGame: g.key, exercises: getRecommendedExercises(g.key) })}
              >
                {g.icon && <Icon name={g.icon} size={16} />}
                {g.stone && <StoneDot color="black" />}
                {g.key === GAME_TYPE.XIANGQI && <span className="brush">象棋</span>}
                {' '}{g.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Provider */}
        <div className="training-section">
          <h4><Icon name="brain" size={16} /> AI Provider</h4>
          <div className="game-selector">
            <button
              className={'game-sel-btn ' + (llmProvider.type === 'local' ? 'active' : '')}
              onClick={() => this.handleProviderChange('local')}
            >
              Local (Offline)
            </button>
            <button
              className={'game-sel-btn ' + (llmProvider.type === 'openai' ? 'active' : '')}
              onClick={() => this.handleProviderChange('openai')}
            >
              OpenAI
            </button>
            <button
              className={'game-sel-btn ' + (llmProvider.type === 'custom' ? 'active' : '')}
              onClick={() => this.handleProviderChange('custom')}
            >
              Custom API
            </button>
          </div>
          {llmProvider.type === 'local' && (
            <p className="settings-note">Using built-in rule engine. Works offline!</p>
          )}
          {llmProvider.type !== 'local' && (
            <p className="settings-note">API key configuration needed in LLMService.js</p>
          )}
        </div>

        {/* Saved Sessions */}
        <div className="training-section">
          <h4><Icon name="save" size={16} /> Saved Sessions 已保存对话</h4>
          {savedSessions.length === 0 ? (
            <p className="empty-text">No saved sessions yet</p>
          ) : (
            <div className="session-list">
              {savedSessions.slice().reverse().map(s => (
                <button
                  key={s.id}
                  className="session-item"
                  onClick={() => this.handleLoadSession(s)}
                >
                  <span className="session-preview">{s.preview}</span>
                  <span className="session-meta">
                    {s.game} · {s.messageCount} msgs · {new Date(s.date).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    const { activeTab, activeGame } = this.state;
    const gameBadge = {
      [GAME_TYPE.CHESS]: <Icon name="play" size={16} />,
      [GAME_TYPE.XIANGQI]: <span className="brush">象</span>,
      [GAME_TYPE.WUZIQI]: <StoneDot color="black" />,
    }[activeGame] || <Icon name="play" size={16} />;

    return (
      <div className="ai-coach">
        {/* Header */}
        <div className="coach-header">
          <div className="coach-avatar"><Icon name="coach" size={16} /></div>
          <div className="coach-info">
            <h3>AI Coach / AI教练 {gameBadge}</h3>
            <span className="status">● Online · {activeGame}</span>
          </div>
          <button className="new-chat-btn" onClick={this.handleNewChat} title="New Chat">🆕</button>
        </div>

        {/* Tab Bar */}
        <div className="coach-tabs">
          {[
            { key: TAB.CHAT, icon: 'message', label: 'Chat' },
            { key: TAB.TRAINING, icon: 'plan', label: 'Training' },
            { key: TAB.PROGRESS, icon: 'trend', label: 'Progress' },
            { key: TAB.SETTINGS, icon: 'settings', label: 'Settings' },
          ].map(t => (
            <button
              key={t.key}
              className={'coach-tab ' + (activeTab === t.key ? 'active' : '')}
              onClick={() => {
                this.setState({ activeTab: t.key });
                if (t.key === TAB.PROGRESS) {
                  this.setState({ progress: getTrainingProgress() });
                }
                if (t.key === TAB.TRAINING) {
                  this.setState({ exercises: getRecommendedExercises(this.state.activeGame) });
                }
              }}
            >
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="coach-tab-content">
          {activeTab === TAB.CHAT && this.renderChatTab()}
          {activeTab === TAB.TRAINING && this.renderTrainingTab()}
          {activeTab === TAB.PROGRESS && this.renderProgressTab()}
          {activeTab === TAB.SETTINGS && this.renderSettingsTab()}
        </div>
      </div>
    );
  }
}

export default AICoach;
