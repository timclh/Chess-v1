/**
 * TrainingPlanService — Personalized Training & Weakness Tracking
 *
 * Tracks player weaknesses, generates personalized training plans,
 * manages learning progress, and suggests targeted exercises.
 */

import { GAME_TYPE } from '../constants';
import { getRatings } from './UserRatingService';

const STORAGE_KEY = 'qi_arena_training';

// ── Storage ───────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getDefaults();
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaults() {
  return {
    weaknesses: {
      chess: { tactics: 0, opening: 0, endgame: 0, positional: 0 },
      xiangqi: { tactics: 0, opening: 0, endgame: 0, positional: 0 },
      wuziqi: { offense: 0, defense: 0, pattern: 0 },
    },
    completedExercises: [],
    trainingHistory: [],  // { date, type, game, duration, score }
    currentPlan: null,
    streak: 0,
    lastTrainingDate: null,
    openingRepertoire: {
      chess: { white: [], black: [] },
      xiangqi: { red: [], black: [] },
    },
  };
}

// ── Weakness Tracking ─────────────────────────────────────

/**
 * Record a weakness from a game analysis.
 * @param {string} gameType - chess/xiangqi/wuziqi
 * @param {string} category - tactics/opening/endgame/positional/offense/defense/pattern
 * @param {number} severity - 1-5 (1=minor, 5=major blunder)
 */
export function recordWeakness(gameType, category, severity = 1) {
  const data = loadData();
  if (!data.weaknesses[gameType]) {
    data.weaknesses[gameType] = {};
  }
  data.weaknesses[gameType][category] = (data.weaknesses[gameType][category] || 0) + severity;
  saveData(data);
}

/**
 * Get the top weaknesses for a game type.
 */
export function getTopWeaknesses(gameType = GAME_TYPE.CHESS, limit = 3) {
  const data = loadData();
  const weaknesses = data.weaknesses[gameType] || {};

  return Object.entries(weaknesses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, score]) => ({ category, score }));
}

/**
 * Get all weakness data.
 */
export function getWeaknesses() {
  return loadData().weaknesses;
}

// ── Training Exercises ────────────────────────────────────

const EXERCISE_LIBRARY = {
  chess: {
    tactics: [
      { id: 'ct1', title: 'Fork Practice', titleCn: '双攻练习', description: 'Find the fork in each position', type: 'puzzle', difficulty: 1, duration: 10 },
      { id: 'ct2', title: 'Pin & Skewer', titleCn: '牵制与串击', description: 'Identify pins and skewers', type: 'puzzle', difficulty: 2, duration: 15 },
      { id: 'ct3', title: 'Discovered Attack', titleCn: '闪击', description: 'Find discovered attacks', type: 'puzzle', difficulty: 2, duration: 15 },
      { id: 'ct4', title: 'Checkmate Patterns', titleCn: '杀王模式', description: 'Recognize common checkmate patterns', type: 'puzzle', difficulty: 3, duration: 20 },
      { id: 'ct5', title: 'Deflection & Decoy', titleCn: '引离与引入', description: 'Use deflection and decoy tactics', type: 'puzzle', difficulty: 3, duration: 20 },
    ],
    opening: [
      { id: 'co1', title: 'Italian Game Basics', titleCn: '意大利开局基础', description: 'Learn the Italian Game main lines', type: 'study', difficulty: 1, duration: 15 },
      { id: 'co2', title: 'Sicilian Defense', titleCn: '西西里防御', description: 'Study the Sicilian Defense ideas', type: 'study', difficulty: 2, duration: 20 },
      { id: 'co3', title: 'Queen\'s Gambit', titleCn: '后翼弃兵', description: 'Master the Queen\'s Gambit', type: 'study', difficulty: 2, duration: 20 },
      { id: 'co4', title: 'London System', titleCn: '伦敦系统', description: 'A solid system opening', type: 'study', difficulty: 1, duration: 15 },
    ],
    endgame: [
      { id: 'ce1', title: 'King + Pawn vs King', titleCn: '王兵对王', description: 'Master the fundamental endgame', type: 'study', difficulty: 1, duration: 10 },
      { id: 'ce2', title: 'Rook Endgames', titleCn: '车残局', description: 'Lucena and Philidor positions', type: 'study', difficulty: 2, duration: 20 },
      { id: 'ce3', title: 'Opposition', titleCn: '对王', description: 'Understanding king opposition', type: 'study', difficulty: 1, duration: 10 },
    ],
    positional: [
      { id: 'cp1', title: 'Pawn Structure', titleCn: '兵型', description: 'Learn about pawn islands and chains', type: 'study', difficulty: 2, duration: 15 },
      { id: 'cp2', title: 'Piece Activity', titleCn: '棋子活跃度', description: 'Maximize your pieces\' influence', type: 'study', difficulty: 2, duration: 15 },
    ],
  },
  xiangqi: {
    tactics: [
      { id: 'xt1', title: 'Cannon Tactics', titleCn: '炮的战术', description: 'Learn cannon screen tactics', type: 'puzzle', difficulty: 2, duration: 15 },
      { id: 'xt2', title: 'Horse Fork', titleCn: '马叉', description: 'Find horse fork opportunities', type: 'puzzle', difficulty: 2, duration: 15 },
      { id: 'xt3', title: 'Double Checkmate', titleCn: '双将杀', description: 'Learn double check patterns', type: 'puzzle', difficulty: 3, duration: 20 },
    ],
    opening: [
      { id: 'xo1', title: 'Central Cannon', titleCn: '中炮', description: 'Master the central cannon opening', type: 'study', difficulty: 1, duration: 15 },
      { id: 'xo2', title: 'Screen Horse', titleCn: '屏风马', description: 'The screen horse defense', type: 'study', difficulty: 2, duration: 20 },
    ],
    endgame: [
      { id: 'xe1', title: 'Chariot Endgame', titleCn: '车残局', description: 'Mastering chariot endgame techniques', type: 'study', difficulty: 2, duration: 20 },
    ],
    positional: [
      { id: 'xp1', title: 'River Control', titleCn: '控制河界', description: 'Controlling the river boundary', type: 'study', difficulty: 2, duration: 15 },
    ],
  },
  wuziqi: {
    offense: [
      { id: 'wo1', title: 'Open Three Building', titleCn: '做活三', description: 'Create open threes for attack', type: 'puzzle', difficulty: 1, duration: 10 },
      { id: 'wo2', title: 'Four-Three Pattern', titleCn: '四三做杀', description: 'Build the winning 4-3 pattern', type: 'puzzle', difficulty: 2, duration: 15 },
      { id: 'wo3', title: 'Double Threat', titleCn: '双重威胁', description: 'Create unstoppable double threats', type: 'puzzle', difficulty: 3, duration: 15 },
    ],
    defense: [
      { id: 'wd1', title: 'Blocking Open Threes', titleCn: '堵活三', description: 'Learn to identify and block threats', type: 'puzzle', difficulty: 1, duration: 10 },
      { id: 'wd2', title: 'Counter-Defense', titleCn: '反击防守', description: 'Defend while creating counter-threats', type: 'puzzle', difficulty: 2, duration: 15 },
    ],
    pattern: [
      { id: 'wp1', title: 'Center Control', titleCn: '控制中心', description: 'Master center-oriented strategy', type: 'study', difficulty: 1, duration: 10 },
      { id: 'wp2', title: 'Shape Recognition', titleCn: '棋形判断', description: 'Recognize good and bad shapes', type: 'study', difficulty: 2, duration: 15 },
    ],
  },
};

/**
 * Get recommended exercises based on weaknesses.
 */
export function getRecommendedExercises(gameType = GAME_TYPE.CHESS, count = 5) {
  const weaknesses = getTopWeaknesses(gameType);
  const library = EXERCISE_LIBRARY[gameType] || {};
  const data = loadData();
  const completedIds = new Set(data.completedExercises);

  const exercises = [];

  // Prioritize exercises for top weaknesses
  for (const { category } of weaknesses) {
    const categoryExercises = library[category] || [];
    for (const ex of categoryExercises) {
      if (!completedIds.has(ex.id)) {
        exercises.push({ ...ex, reason: category });
      }
    }
  }

  // Fill remaining slots with other exercises
  for (const [cat, exList] of Object.entries(library)) {
    for (const ex of exList) {
      if (!completedIds.has(ex.id) && !exercises.find(e => e.id === ex.id)) {
        exercises.push({ ...ex, reason: 'general' });
      }
    }
  }

  return exercises.slice(0, count);
}

/**
 * Mark an exercise as completed.
 */
export function completeExercise(exerciseId, score = 0) {
  const data = loadData();
  if (!data.completedExercises.includes(exerciseId)) {
    data.completedExercises.push(exerciseId);
  }

  // Update training streak
  const today = new Date().toISOString().slice(0, 10);
  if (data.lastTrainingDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    data.streak = data.lastTrainingDate === yesterday ? data.streak + 1 : 1;
    data.lastTrainingDate = today;
  }

  // Record training history
  data.trainingHistory.push({
    date: today,
    exerciseId,
    score,
    timestamp: Date.now(),
  });

  // Keep last 100 entries
  if (data.trainingHistory.length > 100) {
    data.trainingHistory = data.trainingHistory.slice(-100);
  }

  saveData(data);
}

// ── Training Plans ────────────────────────────────────────

/**
 * Generate a personalized 7-day training plan.
 * @param {string} gameType
 * @returns {Object} plan with daily activities
 */
export function generateTrainingPlan(gameType = GAME_TYPE.CHESS) {
  const ratings = getRatings();
  const ratingData = ratings[gameType] || { rating: 1200, gamesPlayed: 0 };
  const weaknesses = getTopWeaknesses(gameType);
  const rating = ratingData.rating;

  const plan = {
    gameType,
    createdAt: new Date().toISOString(),
    rating,
    days: [],
  };

  // Determine player level
  const level = rating < 1200 ? 'beginner' : rating < 1600 ? 'intermediate' : 'advanced';

  const puzzleCount = { beginner: 5, intermediate: 10, advanced: 15 }[level];
  const gameCount = { beginner: 2, intermediate: 3, advanced: 5 }[level];

  for (let day = 1; day <= 7; day++) {
    const activities = [];

    // Puzzles every day
    activities.push({
      type: 'puzzles',
      title: { en: `Solve ${puzzleCount} puzzles`, cn: `做${puzzleCount}道题` },
      duration: puzzleCount * 2,
      completed: false,
    });

    // Weakness-focused exercises (days 1, 3, 5, 7)
    if ([1, 3, 5, 7].includes(day) && weaknesses.length > 0) {
      const targetWeakness = weaknesses[(day - 1) % weaknesses.length];
      activities.push({
        type: 'weakness',
        title: {
          en: `Focus: ${targetWeakness.category} improvement`,
          cn: `重点：${targetWeakness.category}提升`,
        },
        category: targetWeakness.category,
        duration: 15,
        completed: false,
      });
    }

    // Games (days 2, 4, 6)
    if ([2, 4, 6].includes(day)) {
      activities.push({
        type: 'play',
        title: { en: `Play ${gameCount} games`, cn: `下${gameCount}局棋` },
        count: gameCount,
        duration: gameCount * 10,
        completed: false,
      });
    }

    // Review (days 3, 7)
    if ([3, 7].includes(day)) {
      activities.push({
        type: 'review',
        title: { en: 'Review recent games', cn: '复盘最近的对局' },
        duration: 20,
        completed: false,
      });
    }

    // Opening study (days 1, 4)
    if ([1, 4].includes(day) && gameType !== GAME_TYPE.WUZIQI) {
      activities.push({
        type: 'opening',
        title: { en: 'Study an opening line', cn: '学习一个开局变化' },
        duration: 15,
        completed: false,
      });
    }

    plan.days.push({
      day,
      activities,
      estimatedMinutes: activities.reduce((sum, a) => sum + a.duration, 0),
    });
  }

  // Save plan
  const data = loadData();
  data.currentPlan = plan;
  saveData(data);

  return plan;
}

/**
 * Get the current training plan.
 */
export function getCurrentPlan() {
  return loadData().currentPlan;
}

/**
 * Mark an activity in the plan as completed.
 */
export function completeActivity(dayIndex, activityIndex) {
  const data = loadData();
  if (data.currentPlan && data.currentPlan.days[dayIndex]) {
    const activity = data.currentPlan.days[dayIndex].activities[activityIndex];
    if (activity) {
      activity.completed = true;
      saveData(data);
      return true;
    }
  }
  return false;
}

// ── Opening Repertoire ────────────────────────────────────

/**
 * Add an opening to the player's repertoire.
 */
export function addToRepertoire(gameType, color, opening) {
  const data = loadData();
  if (!data.openingRepertoire[gameType]) {
    data.openingRepertoire[gameType] = { white: [], black: [], red: [] };
  }
  const list = data.openingRepertoire[gameType][color] || [];
  if (!list.find(o => o.name === opening.name)) {
    list.push({ ...opening, addedAt: Date.now() });
    data.openingRepertoire[gameType][color] = list;
    saveData(data);
  }
}

/**
 * Get the player's opening repertoire.
 */
export function getRepertoire(gameType) {
  return loadData().openingRepertoire[gameType] || {};
}

// ── Progress Dashboard Data ───────────────────────────────

/**
 * Get training progress statistics.
 */
export function getTrainingProgress() {
  const data = loadData();
  const ratings = getRatings();

  const today = new Date().toISOString().slice(0, 10);
  const todayExercises = data.trainingHistory.filter(h => h.date === today).length;

  // Weekly progress
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekExercises = data.trainingHistory.filter(h => h.date >= weekAgo).length;

  // Plan progress
  let planProgress = null;
  if (data.currentPlan) {
    const totalActivities = data.currentPlan.days.reduce(
      (sum, d) => sum + d.activities.length, 0
    );
    const completedActivities = data.currentPlan.days.reduce(
      (sum, d) => sum + d.activities.filter(a => a.completed).length, 0
    );
    planProgress = {
      total: totalActivities,
      completed: completedActivities,
      percent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
    };
  }

  return {
    streak: data.streak,
    todayExercises,
    weekExercises,
    totalExercises: data.completedExercises.length,
    planProgress,
    ratings: {
      chess: ratings.chess?.rating || 1200,
      xiangqi: ratings.xiangqi?.rating || 1200,
      wuziqi: ratings.wuziqi?.rating || 1200,
    },
    topWeaknesses: {
      chess: getTopWeaknesses(GAME_TYPE.CHESS),
      xiangqi: getTopWeaknesses(GAME_TYPE.XIANGQI),
      wuziqi: getTopWeaknesses(GAME_TYPE.WUZIQI),
    },
  };
}

export default {
  recordWeakness,
  getTopWeaknesses,
  getWeaknesses,
  getRecommendedExercises,
  completeExercise,
  generateTrainingPlan,
  getCurrentPlan,
  completeActivity,
  addToRepertoire,
  getRepertoire,
  getTrainingProgress,
};
