/**
 * Curated YouTube Video Library for Chess Training
 * Videos organized by topic, skill level, and language
 */

export const VIDEO_LIBRARY = {
  // Western Chess Videos
  chess: {
    openings: {
      beginner: [
        {
          id: 'italian-1',
          youtubeId: 'OCSbzArwB10',
          title: 'Italian Game Complete Guide',
          titleCn: '意大利开局完整指南',
          channel: 'GothamChess',
          duration: 25,
          language: 'en',
          topics: ['opening', 'italian-game', 'e4'],
          description: 'Learn the Italian Game from beginner to intermediate level',
        },
        {
          id: 'london-1',
          youtubeId: '49H0LU_YT1A',
          title: 'London System for Beginners',
          titleCn: '伦敦系统入门',
          channel: 'GothamChess',
          duration: 20,
          language: 'en',
          topics: ['opening', 'london-system', 'd4'],
          description: 'A solid and easy-to-learn opening for white',
        },
        {
          id: 'caro-kann-1',
          youtubeId: 'BHxUBh8KNEE',
          title: 'Caro-Kann Defense Basics',
          titleCn: '卡罗-卡恩防御基础',
          channel: 'Hanging Pawns',
          duration: 18,
          language: 'en',
          topics: ['opening', 'caro-kann', 'e4-defense'],
          description: 'Solid defense against 1.e4',
        },
      ],
      intermediate: [
        {
          id: 'sicilian-1',
          youtubeId: 'mzjW8W7oV-Y',
          title: 'Sicilian Defense Fundamentals',
          titleCn: '西西里防御基础',
          channel: 'ChessBase India',
          duration: 35,
          language: 'en',
          topics: ['opening', 'sicilian', 'e4-defense'],
          description: 'The most popular response to 1.e4',
        },
        {
          id: 'queens-gambit-1',
          youtubeId: 'Yw-6Kwv9bV0',
          title: "Queen's Gambit Explained",
          titleCn: '后翼弃兵详解',
          channel: 'GothamChess',
          duration: 28,
          language: 'en',
          topics: ['opening', 'queens-gambit', 'd4'],
          description: 'Classical opening with strategic depth',
        },
      ],
      advanced: [
        {
          id: 'najdorf-1',
          youtubeId: 'LB8N0iZf5nM',
          title: 'Najdorf Sicilian Deep Dive',
          titleCn: '纳伊道夫变化深入解析',
          channel: 'ChessBase India',
          duration: 45,
          language: 'en',
          topics: ['opening', 'sicilian', 'najdorf'],
          description: 'The most complex and popular Sicilian variation',
        },
      ],
    },
    tactics: {
      beginner: [
        {
          id: 'tactics-101',
          youtubeId: '21L45Qo6EIY',
          title: 'Chess Tactics for Beginners',
          titleCn: '象棋战术入门',
          channel: 'GothamChess',
          duration: 22,
          language: 'en',
          topics: ['tactics', 'fork', 'pin', 'skewer'],
          description: 'Essential tactics every beginner must know',
        },
        {
          id: 'forks-1',
          youtubeId: 'zrfHOF0Xx7g',
          title: 'Master the Fork',
          titleCn: '掌握双攻战术',
          channel: 'ChessBrah',
          duration: 15,
          language: 'en',
          topics: ['tactics', 'fork', 'knight-fork'],
          description: 'How to spot and execute forks',
        },
      ],
      intermediate: [
        {
          id: 'discovered-attack',
          youtubeId: 'JY4Cv-qZ1AY',
          title: 'Discovered Attacks',
          titleCn: '闪击战术',
          channel: 'Hanging Pawns',
          duration: 18,
          language: 'en',
          topics: ['tactics', 'discovered-attack', 'discovery'],
          description: 'One of the most powerful tactical motifs',
        },
        {
          id: 'tactics-pattern',
          youtubeId: 'dVwVsQqLZ2E',
          title: 'Pattern Recognition',
          titleCn: '战术模式识别',
          channel: 'ChessBase India',
          duration: 30,
          language: 'en',
          topics: ['tactics', 'patterns', 'visualization'],
          description: 'Train your tactical vision',
        },
      ],
    },
    endgame: {
      beginner: [
        {
          id: 'endgame-basics',
          youtubeId: 'WBGzB4k6GXg',
          title: 'Essential Endgames',
          titleCn: '必学残局',
          channel: 'GothamChess',
          duration: 25,
          language: 'en',
          topics: ['endgame', 'king-pawn', 'basic-mates'],
          description: 'Endgames every player must know',
        },
        {
          id: 'checkmate-patterns',
          youtubeId: 'zp3VMe0Kqvw',
          title: 'Checkmate Patterns',
          titleCn: '将杀模式',
          channel: 'ChessBrah',
          duration: 20,
          language: 'en',
          topics: ['endgame', 'checkmate', 'patterns'],
          description: 'Common checkmate patterns to memorize',
        },
      ],
      intermediate: [
        {
          id: 'rook-endgame',
          youtubeId: 'AXe1n8dn-dc',
          title: 'Rook Endgame Mastery',
          titleCn: '车残局精通',
          channel: 'Hanging Pawns',
          duration: 40,
          language: 'en',
          topics: ['endgame', 'rook-endgame', 'lucena', 'philidor'],
          description: 'Rook endgames are the most common',
        },
      ],
    },
    strategy: {
      beginner: [
        {
          id: 'principles-1',
          youtubeId: 'OvH6lPQS7tY',
          title: 'Chess Principles',
          titleCn: '象棋原则',
          channel: 'GothamChess',
          duration: 20,
          language: 'en',
          topics: ['strategy', 'principles', 'center', 'development'],
          description: 'Fundamental principles every player needs',
        },
      ],
      intermediate: [
        {
          id: 'pawn-structure',
          youtubeId: 'pjMUOZTJpfA',
          title: 'Pawn Structure Guide',
          titleCn: '兵型结构指南',
          channel: 'Hanging Pawns',
          duration: 35,
          language: 'en',
          topics: ['strategy', 'pawn-structure', 'planning'],
          description: 'Understanding pawn structures for better plans',
        },
      ],
    },
  },

  // Chinese Chess Videos (象棋)
  xiangqi: {
    basics: [
      {
        id: 'xiangqi-intro',
        youtubeId: 'CnNu4GBDzso',
        title: 'How to Play Chinese Chess',
        titleCn: '象棋入门教程',
        channel: 'Xiangqi Master',
        duration: 20,
        language: 'en',
        topics: ['xiangqi', 'basics', 'rules'],
        description: 'Complete introduction to Chinese Chess',
      },
      {
        id: 'xiangqi-pieces',
        youtubeId: 'r8sV9HzXGqE',
        title: 'Xiangqi Piece Movement',
        titleCn: '象棋棋子走法',
        channel: 'ChessTV',
        duration: 15,
        language: 'en',
        topics: ['xiangqi', 'pieces', 'movement'],
        description: 'Learn how each piece moves',
      },
    ],
    openings: [
      {
        id: 'xiangqi-central-cannon',
        youtubeId: 'QGK9BqYnT1k',
        title: 'Central Cannon Opening',
        titleCn: '中炮开局详解',
        channel: '象棋大师课堂',
        duration: 25,
        language: 'zh',
        topics: ['xiangqi', 'opening', 'central-cannon'],
        description: 'The most popular aggressive opening',
      },
      {
        id: 'xiangqi-screen-horse',
        youtubeId: 'xKL8P3Y2Vfc',
        title: 'Screen Horse Defense',
        titleCn: '屏风马防御',
        channel: '象棋大师课堂',
        duration: 22,
        language: 'zh',
        topics: ['xiangqi', 'opening', 'screen-horse'],
        description: 'Solid defensive setup',
      },
    ],
    tactics: [
      {
        id: 'xiangqi-checkmate',
        youtubeId: 'W8V9LqJQ7gY',
        title: 'Xiangqi Checkmate Patterns',
        titleCn: '象棋杀法大全',
        channel: '象棋教室',
        duration: 30,
        language: 'zh',
        topics: ['xiangqi', 'tactics', 'checkmate'],
        description: 'Essential checkmate patterns in Xiangqi',
      },
    ],
    endgame: [
      {
        id: 'xiangqi-endgame-basics',
        youtubeId: 'J5n2cP8CQHk',
        title: 'Xiangqi Endgame Fundamentals',
        titleCn: '象棋残局基础',
        channel: '象棋大师课堂',
        duration: 28,
        language: 'zh',
        topics: ['xiangqi', 'endgame', 'chariot-endgame'],
        description: 'Basic endgame techniques',
      },
    ],
  },
};

/**
 * Get videos by topic
 */
export const getVideosByTopic = (gameType, topic, level = null) => {
  const gameVideos = VIDEO_LIBRARY[gameType];
  if (!gameVideos) return [];

  const topicVideos = gameVideos[topic];
  if (!topicVideos) return [];

  if (Array.isArray(topicVideos)) {
    return topicVideos;
  }

  if (level && topicVideos[level]) {
    return topicVideos[level];
  }

  // Return all levels combined
  return Object.values(topicVideos).flat();
};

/**
 * Get recommended videos based on player weaknesses
 */
export const getRecommendedVideos = (gameType, weaknesses = [], level = 'beginner') => {
  const recommendations = [];

  for (const weakness of weaknesses) {
    const videos = getVideosByTopic(gameType, weakness, level);
    recommendations.push(...videos.slice(0, 2));
  }

  // Add general videos if not enough
  if (recommendations.length < 3) {
    const tactics = getVideosByTopic(gameType, 'tactics', level);
    recommendations.push(...tactics.slice(0, 3 - recommendations.length));
  }

  return recommendations.slice(0, 5);
};

/**
 * Search videos by keyword
 */
export const searchVideos = (keyword) => {
  const results = [];
  const lowerKeyword = keyword.toLowerCase();

  const searchInCategory = (videos) => {
    if (Array.isArray(videos)) {
      for (const video of videos) {
        if (
          video.title.toLowerCase().includes(lowerKeyword) ||
          video.titleCn.includes(keyword) ||
          video.topics.some(t => t.includes(lowerKeyword))
        ) {
          results.push(video);
        }
      }
    } else {
      for (const subCategory of Object.values(videos)) {
        searchInCategory(subCategory);
      }
    }
  };

  for (const gameType of Object.values(VIDEO_LIBRARY)) {
    for (const category of Object.values(gameType)) {
      searchInCategory(category);
    }
  }

  return results;
};

/**
 * Get all topics for a game type
 */
export const getTopics = (gameType) => {
  const gameVideos = VIDEO_LIBRARY[gameType];
  if (!gameVideos) return [];
  return Object.keys(gameVideos);
};

export default VIDEO_LIBRARY;
