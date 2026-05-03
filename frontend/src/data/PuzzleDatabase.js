/**
 * Expanded Puzzle Database
 * 
 * Adds 50+ chess puzzles and 42 xiangqi puzzles organized by theme.
 * Imported by Puzzles.js to supplement the original puzzle sets.
 */

// ── Additional Chess Puzzles (56 puzzles, IDs 101-174) ───────

export const EXTRA_CHESS_PUZZLES = [
  // ── FORK (6 puzzles) ──
  { id: 101, fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    solution: ["Bxf7+", "Ke7", "d3"], category: "fork", difficulty: 2,
    title: "象叉王后 Bishop Fork", hint: "象吃f7将军后攻击两个目标", hintEn: "Bishop takes f7 with check, forking targets" },
  { id: 102, fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4",
    solution: ["Nxe5", "Nxe5", "d4"], category: "fork", difficulty: 2,
    title: "中心双击 Central Fork", hint: "吃掉中心兵后兵推进叉两子", hintEn: "Capture center pawn then fork with d4" },
  { id: 103, fen: "r2qk2r/ppp2ppp/2n1b3/3np3/2B5/4PN2/PPP2PPP/RN1QK2R w KQkq - 0 7",
    solution: ["Nxe5", "Nxe5", "Qh5"], category: "fork", difficulty: 3,
    title: "后叉 Queen Fork", hint: "后到h5叉王和e5", hintEn: "Queen to h5 forks king and e5 piece" },
  { id: 104, fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQ - 6 6",
    solution: ["Nxe5", "Nxe5", "d4", "Bb4", "dxe5"], category: "fork", difficulty: 2,
    title: "兵叉双子 Pawn Fork", hint: "d4兵推进叉两个子", hintEn: "d4 pawn advances to fork two pieces" },
  { id: 105, fen: "r1bqk2r/pppp1Npp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5",
    solution: ["Kf8"], category: "fork", difficulty: 1,
    title: "躲避叉击 Escape the Fork", hint: "王必须移动躲避马的叉击", hintEn: "King must move to escape the knight fork" },
  { id: 106, fen: "r3kb1r/ppp1qppp/2n1bn2/3pp3/4P3/1NN2P2/PPPP2PP/R1BQKB1R w KQkq - 0 6",
    solution: ["Nd5", "Qd8", "Nxf6+"], category: "fork", difficulty: 3,
    title: "马叉王后 Knight Fork King-Queen", hint: "马到d5再跳f6叉王和后", hintEn: "Knight to d5 then f6 forks king and queen" },

  // ── PIN (6 puzzles) ──
  { id: 111, fen: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    solution: ["e3", "b6", "Bd3"], category: "pin", difficulty: 2,
    title: "尼姆佐牵制 Nimzo Pin", hint: "象牵制了c3的马", hintEn: "Bishop pins the c3 knight" },
  { id: 112, fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4",
    solution: ["a3", "Ba5", "b4", "Bb6", "Nd5"], category: "pin", difficulty: 3,
    title: "破解牵制 Break the Pin", hint: "用兵推进让象退回", hintEn: "Use pawns to force the bishop back" },
  { id: 113, fen: "rn1qkbnr/ppp2ppp/4p3/3pP3/3P2b1/5N2/PPP2PPP/RNBQKB1R w KQkq - 1 4",
    solution: ["Be2"], category: "pin", difficulty: 1,
    title: "解除牵制 Unpin", hint: "象到e2解除f3马的牵制", hintEn: "Bishop to e2 unpins the f3 knight" },
  { id: 114, fen: "r1bqk2r/ppp2ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 5",
    solution: ["Bd2", "Bxc3", "Bxc3"], category: "pin", difficulty: 2,
    title: "交换牵制 Exchange Pin", hint: "用象解决牵制问题", hintEn: "Use bishop to resolve the pin" },
  { id: 115, fen: "r1b1k2r/ppppqppp/2n5/4p3/2Bn4/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5",
    solution: ["Bxf7+", "Kd8", "O-O"], category: "pin", difficulty: 3,
    title: "绝对牵制 Absolute Pin", hint: "象吃f7将军后e7后被绝对牵制", hintEn: "After Bxf7+, the queen on e7 is absolutely pinned" },
  { id: 116, fen: "r2qkbnr/ppp1pppp/2n5/3p4/4P1b1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 3 3",
    solution: ["exd5", "Qxd5", "Nc3"], category: "pin", difficulty: 2,
    title: "利用牵制吃兵 Exploit Pin to Win Pawn", hint: "f3马被牵制但可以先吃d5", hintEn: "Knight is pinned but can capture d5 first" },

  // ── MATE (8 puzzles) ──
  { id: 121, fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    solution: ["Re8#"], category: "mate", difficulty: 1,
    title: "底线将杀 Back Rank Mate", hint: "车到底线将杀", hintEn: "Rook to the back rank delivers checkmate" },
  { id: 122, fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    solution: ["Ke7"], category: "mate", difficulty: 1,
    title: "躲避将杀 Avoiding Mate", hint: "王必须移动（唯一合法步）", hintEn: "King must move (only legal move)" },
  { id: 123, fen: "2bqkbn1/2pppp2/np2N3/8/3P4/8/PPP2PPP/R1BQKB1R w KQ - 0 8",
    solution: ["Qh5", "g6", "Qf3"], category: "mate", difficulty: 2,
    title: "后马配合 Queen-Knight Combo", hint: "后配合马形成致命攻击", hintEn: "Queen coordinates with knight for deadly attack" },
  { id: 124, fen: "r1b2rk1/pppp1ppp/2n2q2/2b5/2B1P1n1/2NP4/PPP2PPP/R1BQ1RK1 w - - 0 8",
    solution: ["Qxg4"], category: "mate", difficulty: 1,
    title: "吃掉进攻子 Capture the Attacker", hint: "后吃马解除威胁", hintEn: "Queen captures knight, removing the threat" },
  { id: 125, fen: "5rk1/pp3ppp/3q4/8/8/2P5/PP3PPP/R2Q1RK1 w - - 0 1",
    solution: ["Qd4", "Qxd4", "cxd4"], category: "mate", difficulty: 2,
    title: "消除后换后 Simplify to Win", hint: "换后后残局简化获胜", hintEn: "Trade queens to simplify into a won endgame" },
  { id: 126, fen: "r1b1k2r/pppp1ppp/2n2n2/2b1N3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 5",
    solution: ["Nxf7", "Kxf7", "Qf3+", "Ke8", "Qxa8"], category: "sacrifice", difficulty: 3,
    title: "吃车组合 Win the Rook", hint: "先弃马再后将军吃车", hintEn: "Sacrifice knight, then queen check wins the rook" },
  { id: 127, fen: "r4rk1/ppp2ppp/2n1b3/3q4/3P4/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 10",
    solution: ["Nxd5", "Bxd5", "c3"], category: "sacrifice", difficulty: 2,
    title: "中心争夺 Central Contest", hint: "吃掉强大的中心后", hintEn: "Capture the powerful centralized queen" },
  { id: 128, fen: "r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 6",
    solution: ["Bg5", "h6", "Bh4", "Be7", "Nc3"], category: "pin", difficulty: 3,
    title: "牵制与发展 Pin and Develop", hint: "象牵制马同时发展棋子", hintEn: "Pin the knight while developing pieces" },

  // ── SKEWER (4 puzzles) ──
  { id: 131, fen: "6k1/8/8/8/8/8/1q6/3RK3 w - - 0 1",
    solution: ["Rd8+", "Kf7", "Rd2"], category: "skewer", difficulty: 2,
    title: "车串击 Rook Skewer", hint: "车将军后吃后", hintEn: "Rook checks, then captures the queen behind" },
  { id: 132, fen: "8/8/4k3/8/3B4/8/8/4K2r w - - 0 1",
    solution: ["Bb6+"], category: "skewer", difficulty: 1,
    title: "象串击 Bishop Skewer", hint: "象将军后吃车", hintEn: "Bishop checks, then captures the rook" },
  { id: 133, fen: "4r1k1/5ppp/8/3Q4/8/8/5PPP/6K1 w - - 0 1",
    solution: ["Qd8"], category: "skewer", difficulty: 2,
    title: "后攻车 Queen Skewer", hint: "后攻击车迫使交换", hintEn: "Queen attacks rook, forcing an exchange" },
  { id: 134, fen: "r3k2r/ppp2ppp/2n1b3/3q4/3P4/2NB1N2/PPP2PPP/R2Q1RK1 w kq - 0 9",
    solution: ["Bb5"], category: "skewer", difficulty: 3,
    title: "象串将后 Bishop Skewer King-Queen", hint: "象到b5串击王和后", hintEn: "Bishop to b5 skewers the king line to queen" },

  // ── DISCOVERY (4 puzzles) ──
  { id: 141, fen: "r1bqk2r/pppp1ppp/2n2n2/4N3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    solution: ["Nxf7"], category: "discovery", difficulty: 2,
    title: "闪击f7 Discovery on f7", hint: "马吃f7暴露象对王的攻击", hintEn: "Knight takes f7, uncovers bishop attack on king" },
  { id: 142, fen: "r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 5",
    solution: ["Kxf7"], category: "discovery", difficulty: 1,
    title: "被迫吃象 Forced Capture", hint: "王必须吃象（被将军）", hintEn: "King must capture the bishop (it's check)" },
  { id: 143, fen: "r1b1kb1r/ppppqppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 6 5",
    solution: ["Nxf7", "Qf8", "Nxh8"], category: "discovery", difficulty: 3,
    title: "马闪击 Knight Discovery", hint: "马吃f7后闪击h8车", hintEn: "Knight takes f7 then captures h8 rook" },
  { id: 144, fen: "rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
    solution: ["e4", "d6", "Nf3"], category: "discovery", difficulty: 2,
    title: "中心扩张 Central Expansion", hint: "推进e4控制中心", hintEn: "Push e4 to control the center" },

  // ── SACRIFICE (6 puzzles) ──
  { id: 151, fen: "r1b1k2r/pppp1ppp/2n2n2/2b1p3/2B1P1q1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 6",
    solution: ["Nxe5", "Bxf2+", "Kf1"], category: "sacrifice", difficulty: 3,
    title: "反弃子 Counter-Sacrifice", hint: "吃e5后应对弃子将军", hintEn: "Take e5, then handle the counter-sacrifice check" },
  { id: 152, fen: "r1bqk2r/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",
    solution: ["Bg5", "Be7", "e3"], category: "sacrifice", difficulty: 2,
    title: "稳健发展 Solid Development", hint: "先发展象到g5牵制", hintEn: "Develop bishop to g5 with a pin" },
  { id: 153, fen: "r2qkb1r/pp2pppp/2np1n2/2pP4/4P1b1/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    solution: ["dxe6", "fxe6", "Ng5"], category: "sacrifice", difficulty: 3,
    title: "兵突破 Pawn Break", hint: "dxe6打开中心后马跳g5", hintEn: "dxe6 opens the center, then Ng5 attacks" },
  { id: 154, fen: "r2q1rk1/ppp1bppp/2n1b3/3np3/8/1BN1PN2/PPPP1PPP/R1BQ1RK1 w - - 0 9",
    solution: ["Nxd5", "Bxd5", "Bxd5"], category: "sacrifice", difficulty: 2,
    title: "双换子 Double Exchange", hint: "连续交换赢得中心控制", hintEn: "Consecutive exchanges to win center control" },
  { id: 155, fen: "r1bqr1k1/pp3ppp/2nb1n2/3pp3/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9",
    solution: ["dxe5", "Nxe5", "Nxe5", "Bxe5", "f4"], category: "sacrifice", difficulty: 3,
    title: "中心爆破 Central Explosion", hint: "打开中心线开始进攻", hintEn: "Open central files to start an attack" },
  { id: 156, fen: "r2qk2r/ppp1bppp/2n1bn2/3pp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 6",
    solution: ["O-O", "O-O", "Re1"], category: "defense", difficulty: 2,
    title: "安全第一 Safety First", hint: "先易位保证王安全", hintEn: "Castle first to ensure king safety" },

  // ── ENDGAME (6 puzzles) ──
  { id: 161, fen: "8/8/8/8/4k3/8/4KP2/8 w - - 0 1",
    solution: ["f4"], category: "endgame", difficulty: 1,
    title: "兵升变 Pawn Promotion Race", hint: "推进兵开始升变竞赛", hintEn: "Push the pawn to start the promotion race" },
  { id: 162, fen: "8/8/3k4/8/8/3K4/3P4/8 w - - 0 1",
    solution: ["Ke4"], category: "endgame", difficulty: 1,
    title: "对王 Opposition", hint: "走到e4占据对王位", hintEn: "Move to e4 to take the opposition" },
  { id: 163, fen: "8/5pk1/8/8/8/5K2/5P2/8 w - - 0 1",
    solution: ["Ke4", "Kf6", "Kd5"], category: "endgame", difficulty: 2,
    title: "绕过防守 Outflank", hint: "王绕过对方王", hintEn: "King walks around the opponent's king" },
  { id: 164, fen: "8/8/8/8/1k6/8/1PK5/8 w - - 0 1",
    solution: ["Kc3"], category: "endgame", difficulty: 1,
    title: "护送兵 Escort the Pawn", hint: "王护送兵升变", hintEn: "King escorts the pawn to promotion" },
  { id: 165, fen: "8/p7/1p6/1P6/P7/8/5K2/3k4 w - - 0 1",
    solution: ["a5", "bxa5", "b6"], category: "endgame", difficulty: 3,
    title: "突破兵形 Pawn Breakthrough", hint: "a5弃兵后b6通路兵", hintEn: "a5 sacrifice creates a passed pawn with b6" },
  { id: 166, fen: "8/8/4kpp1/3p4/3P1PP1/4K3/8/8 w - - 0 1",
    solution: ["f5+", "gxf5", "g5"], category: "endgame", difficulty: 3,
    title: "兵形突破 Pawn Storm", hint: "f5弃兵后g5形成通路兵", hintEn: "f5 sacrifice then g5 creates a passed pawn" },

  // ── DEFENSE (4 puzzles) ──
  { id: 171, fen: "rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2",
    solution: ["d5", "exd5", "e4"], category: "defense", difficulty: 2,
    title: "反击中心 Counter in Center", hint: "d5反击白方中心", hintEn: "d5 strikes back at White's center" },
  { id: 172, fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: ["d3"], category: "defense", difficulty: 1,
    title: "稳固中心 Solid Center", hint: "d3巩固中心兵", hintEn: "d3 solidifies the center pawn" },
  { id: 173, fen: "r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: ["c3"], category: "defense", difficulty: 1,
    title: "准备d4 Prepare d4", hint: "c3准备中心推进d4", hintEn: "c3 prepares the central advance d4" },
  { id: 174, fen: "r1bqk2r/pppp1ppp/2n2n2/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4",
    solution: ["d4", "Bb4+", "c3"], category: "defense", difficulty: 2,
    title: "中心优势 Central Advantage", hint: "d4占据中心同时攻击象", hintEn: "d4 seizes center while attacking bishop" },
];


// ── Additional Xiangqi Puzzles (42 puzzles, IDs 201-266) ─────
// Coordinate format: column letter (a-i) + row number (0-9, from Red's perspective)
// Row 0 = Red's back rank, Row 9 = Black's back rank

export const EXTRA_XIANGQI_PUZZLES = [
  // ── CHECKMATE (12 puzzles) ──
  { id: 201, fen: "3ak4/4a4/4b4/9/9/9/9/4B4/4A4/2R1KA3",
    solution: [{ from: 'c0', to: 'c9' }],
    category: "checkmate", difficulty: 1,
    title: "车杀底线 Chariot Back Rank Mate", hint: "车直接将杀", hintEn: "Chariot delivers checkmate on the back rank" },
  { id: 202, fen: "3k5/4a4/4ba3/9/9/5C3/9/4B4/4A4/3K1A3",
    solution: [{ from: 'f4', to: 'f9' }],
    category: "checkmate", difficulty: 1,
    title: "炮底线杀 Cannon Rank Mate", hint: "炮借助中间棋子将杀", hintEn: "Cannon uses a screen to deliver mate" },
  { id: 203, fen: "2bak4/4a4/4b4/9/9/3R5/4N4/4B4/4A4/3AK4",
    solution: [{ from: 'e3', to: 'd5' }, { from: 'd9', to: 'e9' }, { from: 'd4', to: 'd9' }],
    category: "checkmate", difficulty: 2,
    title: "马后炮 Horse-Cannon Mate", hint: "马先跳位，然后车将杀", hintEn: "Knight positions, then chariot checkmates" },
  { id: 204, fen: "3aka3/9/4b4/9/9/4R4/9/4B4/4A4/3AK4",
    solution: [{ from: 'e4', to: 'e9' }],
    category: "checkmate", difficulty: 1,
    title: "铁门栓 Iron Door Bolt Mate", hint: "车直接闯入将杀", hintEn: "Chariot crashes in for checkmate" },
  { id: 205, fen: "4ka3/4a4/2N1b4/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'c7', to: 'd9' }],
    category: "checkmate", difficulty: 1,
    title: "马踏八方 Knight Checkmate", hint: "马跳到将位", hintEn: "Knight hops to deliver checkmate" },
  { id: 206, fen: "3ak1C2/4a4/4b4/9/9/9/9/4B4/3RA4/3K1A3",
    solution: [{ from: 'd1', to: 'd9' }],
    category: "checkmate", difficulty: 2,
    title: "天地炮 Heaven-Earth Cannon", hint: "车配合炮将杀", hintEn: "Chariot assists cannon for mate" },
  { id: 207, fen: "3k5/4a4/3ab4/9/9/N8/9/4B4/4A4/3K1A3",
    solution: [{ from: 'a4', to: 'b6' }, { from: 'd9', to: 'e9' }, { from: 'b6', to: 'c8' }],
    category: "checkmate", difficulty: 3,
    title: "马入宫 Knight Invasion", hint: "马步步逼近，最终将杀", hintEn: "Knight advances step by step to deliver mate" },
  { id: 208, fen: "3a1k3/4a4/4b4/5N3/9/9/9/4B4/3RA4/3K1A3",
    solution: [{ from: 'f6', to: 'e8' }, { from: 'f9', to: 'e9' }, { from: 'd1', to: 'd9' }],
    category: "checkmate", difficulty: 2,
    title: "马炮绝杀 Knight-Cannon Kill", hint: "马将军后车将杀", hintEn: "Knight checks, then chariot delivers mate" },
  { id: 209, fen: "2b1ka3/4a4/9/9/9/4C4/4R4/4B4/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e8' }, { from: 'e9', to: 'd9' }, { from: 'e4', to: 'e9' }],
    category: "checkmate", difficulty: 2,
    title: "重炮杀 Double Cannon Mate", hint: "车先将军，炮再将杀", hintEn: "Chariot checks, then cannon delivers mate" },
  { id: 210, fen: "4kab2/4a4/9/9/9/3N5/9/4B4/4A4/3K1A3",
    solution: [{ from: 'd4', to: 'e6' }, { from: 'e9', to: 'd9' }, { from: 'e6', to: 'd8' }],
    category: "checkmate", difficulty: 3,
    title: "马踩将 Knight Tramples General", hint: "马逐步将死", hintEn: "Knight methodically checkmates" },
  { id: 211, fen: "3ak4/4a1R2/4b4/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'g8', to: 'g9' }, { from: 'e9', to: 'f9' }, { from: 'g9', to: 'f9' }],
    category: "checkmate", difficulty: 2,
    title: "车侧杀 Chariot Side Mate", hint: "车从侧面将杀", hintEn: "Chariot checkmates from the side" },
  { id: 212, fen: "3k1a3/4a4/9/9/9/9/4C4/4BC3/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e9' }],
    category: "checkmate", difficulty: 1,
    title: "空头炮杀 Hollow Cannon Mate", hint: "炮直接将杀", hintEn: "Cannon delivers mate directly" },

  // ── SACRIFICE (6 puzzles) ──
  { id: 221, fen: "2bakab2/4c4/2n6/p3p3p/9/4P4/P3C3P/2N1B4/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e7' }, { from: 'e7', to: 'd7' }, { from: 'c2', to: 'd4' }],
    category: "sacrifice", difficulty: 3,
    title: "弃炮攻杀 Sacrifice Cannon", hint: "弃炮打开通道", hintEn: "Sacrifice cannon to open an attack lane" },
  { id: 222, fen: "3akab2/9/2n1b4/p3p3p/9/2N1P4/P3C3P/4B4/4A4/3K1A3",
    solution: [{ from: 'c4', to: 'd6' }, { from: 'e6', to: 'e5' }, { from: 'e3', to: 'e6' }],
    category: "sacrifice", difficulty: 3,
    title: "弃马入局 Knight Sacrifice", hint: "弃马后炮将军", hintEn: "Sacrifice knight, then cannon checks" },
  { id: 223, fen: "2bak4/4a4/4b4/4R4/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e6', to: 'e8' }, { from: 'd9', to: 'e9' }, { from: 'e8', to: 'e9' }],
    category: "sacrifice", difficulty: 2,
    title: "弃车杀士 Sacrifice Chariot for Advisor", hint: "弃车吃士将杀", hintEn: "Sacrifice chariot to take advisor and checkmate" },
  { id: 224, fen: "3aka3/4C4/4b4/p8/9/9/4R4/4B4/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e7' }, { from: 'e7', to: 'd7' }, { from: 'e8', to: 'e9' }],
    category: "sacrifice", difficulty: 2,
    title: "车炮连杀 Chariot-Cannon Chain", hint: "车冲入后炮将杀", hintEn: "Chariot charges in, cannon follows for mate" },
  { id: 225, fen: "2bakab2/4c4/2n6/p3p3p/6p2/9/P3P3P/2N1BC3/4A4/3K1A3",
    solution: [{ from: 'f2', to: 'f8' }, { from: 'f9', to: 'f8' }, { from: 'c2', to: 'd4' }],
    category: "sacrifice", difficulty: 3,
    title: "弃炮破相 Cannon Breaks Elephant", hint: "弃炮打开攻击路线", hintEn: "Sacrifice cannon to open attack route" },
  { id: 226, fen: "3k1a3/9/4b4/4R4/9/5C3/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e6', to: 'e9' }, { from: 'f9', to: 'e9' }, { from: 'f4', to: 'f9' }],
    category: "sacrifice", difficulty: 2,
    title: "闷宫杀 Smothered Palace Mate", hint: "弃车后炮将杀", hintEn: "Sacrifice chariot, then cannon smothered mate" },

  // ── CHARIOT (6 puzzles) ──
  { id: 231, fen: "3akab2/9/4b4/p3p3p/6p2/2R6/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'c4', to: 'c9' }],
    category: "chariot", difficulty: 1,
    title: "车巡河 Chariot Patrol", hint: "车直接将杀或抓子", hintEn: "Chariot moves directly for checkmate or capture" },
  { id: 232, fen: "4kab2/4a4/2R1b4/p8/9/9/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'c7', to: 'c9' }],
    category: "chariot", difficulty: 1,
    title: "车占花心 Chariot Central Control", hint: "车进入宫心控制", hintEn: "Chariot enters palace center for control" },
  { id: 233, fen: "3k1ab2/4a4/4b4/p8/9/9/P3P3P/4BR3/4A4/3K1A3",
    solution: [{ from: 'f2', to: 'f9' }],
    category: "chariot", difficulty: 2,
    title: "车穿宫 Chariot Penetrates Palace", hint: "车从侧面杀入", hintEn: "Chariot penetrates through the palace flank" },
  { id: 234, fen: "4kab2/4a4/4b4/9/p8/9/P3P3P/4B4/R3A4/3K1A3",
    solution: [{ from: 'a1', to: 'a9' }],
    category: "chariot", difficulty: 1,
    title: "车拐角杀 Chariot Corner Mate", hint: "车冲到底线", hintEn: "Chariot rushes to the last rank" },
  { id: 235, fen: "2bak4/4a4/4b4/p3R4/9/9/P3P3P/4B4/4A4/3K1A2",
    solution: [{ from: 'e6', to: 'e9' }],
    category: "chariot", difficulty: 1,
    title: "白脸将 Chariot Face-Off", hint: "车横扫到将面前", hintEn: "Chariot sweeps to face the king directly" },
  { id: 236, fen: "2b1kab2/4a4/9/p3R3p/9/P8/4P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'e6', to: 'e8' }, { from: 'e9', to: 'd9' }, { from: 'e8', to: 'e9' }],
    category: "chariot", difficulty: 2,
    title: "车入九宫 Chariot Enters Palace", hint: "车深入九宫将杀", hintEn: "Chariot enters the palace for checkmate" },

  // ── CANNON (6 puzzles) ──
  { id: 241, fen: "3k1a3/4a4/3Cb4/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'd7', to: 'd9' }],
    category: "cannon", difficulty: 1,
    title: "空头炮 Hollow Cannon", hint: "炮直接将杀", hintEn: "Cannon checks directly for mate" },
  { id: 242, fen: "3ak4/4a4/2C1b4/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'c7', to: 'c9' }],
    category: "cannon", difficulty: 1,
    title: "侧翼炮杀 Flanking Cannon Mate", hint: "炮从侧翼将杀", hintEn: "Cannon delivers mate from the flank" },
  { id: 243, fen: "3k5/4a4/3ab4/9/4C4/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e5', to: 'e8' }, { from: 'd9', to: 'e9' }, { from: 'e8', to: 'e9' }],
    category: "cannon", difficulty: 2,
    title: "炮撞士 Cannon Rams Advisor", hint: "先将军吃士再将杀", hintEn: "Check to capture advisor, then checkmate" },
  { id: 244, fen: "4k4/4a4/9/9/9/9/4C4/2C1B4/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e9' }],
    category: "cannon", difficulty: 2,
    title: "双炮将杀 Double Cannon Mate", hint: "两炮配合将杀", hintEn: "Two cannons coordinate for checkmate" },
  { id: 245, fen: "3ak4/4C4/4b4/9/9/3c5/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e8', to: 'e9' }],
    category: "cannon", difficulty: 1,
    title: "炮打将 Cannon Captures King", hint: "炮直接将杀取胜", hintEn: "Cannon takes the king directly for the win" },
  { id: 246, fen: "3k1a3/9/4ba3/9/9/4C4/4R4/4B4/4A4/3K1A3",
    solution: [{ from: 'e3', to: 'e7' }, { from: 'e7', to: 'd7' }, { from: 'e4', to: 'e9' }],
    category: "cannon", difficulty: 3,
    title: "车炮取士 Chariot-Cannon Takes Advisor", hint: "车抓象后炮将杀", hintEn: "Chariot captures elephant, then cannon mates" },

  // ── HORSE (6 puzzles) ──
  { id: 251, fen: "4k4/4a4/3ab4/9/9/4N4/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e4', to: 'd6' }],
    category: "horse", difficulty: 1,
    title: "马踏中心 Knight Central", hint: "马跳到中心控制位", hintEn: "Knight hops to central controlling square" },
  { id: 252, fen: "3k1a3/4a4/4bN3/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'f7', to: 'e9' }],
    category: "horse", difficulty: 1,
    title: "马踩将 Knight Tramples General", hint: "马直接将杀", hintEn: "Knight delivers checkmate directly" },
  { id: 253, fen: "3k5/4a4/3ab4/5N3/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'f6', to: 'e8' }, { from: 'd9', to: 'e9' }, { from: 'e8', to: 'e9' }],
    category: "horse", difficulty: 2,
    title: "马入宫 Knight Enters Palace", hint: "马进入九宫步步将杀", hintEn: "Knight enters the palace for checkmate" },
  { id: 254, fen: "4ka3/4a4/4b4/9/3N5/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'd5', to: 'e7' }, { from: 'e9', to: 'd9' }, { from: 'e7', to: 'f9' }],
    category: "horse", difficulty: 2,
    title: "卧槽马 Crouching Horse", hint: "马跳到卧槽位将杀", hintEn: "Knight jumps to crouching position for mate" },
  { id: 255, fen: "3ak4/4a4/2N1b4/9/9/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'c7', to: 'd9' }],
    category: "horse", difficulty: 1,
    title: "挂角马 Corner Horse Mate", hint: "马从角上将杀", hintEn: "Knight delivers mate from the corner angle" },
  { id: 256, fen: "2bakab2/9/4N4/p3p3p/9/9/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'e7', to: 'd9' }, { from: 'e9', to: 'd9' }, { from: 'e7', to: 'f9' }],
    category: "horse", difficulty: 3,
    title: "双马饮泉 Double Knight Well", hint: "连续马跳将杀", hintEn: "Sequential knight jumps deliver checkmate" },

  // ── COMBO (6 puzzles) ──
  { id: 261, fen: "2b1kab2/4a4/4N4/p3R3p/9/9/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'e7', to: 'd9' }, { from: 'e9', to: 'd9' }, { from: 'e6', to: 'e9' }],
    category: "combo", difficulty: 2,
    title: "马车配合 Knight-Chariot Combo", hint: "马将军后车杀", hintEn: "Knight checks, chariot delivers mate" },
  { id: 262, fen: "3k1ab2/4a4/4b4/4R3p/9/5C3/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'e6', to: 'e9' }, { from: 'd9', to: 'e9' }, { from: 'f4', to: 'f9' }],
    category: "combo", difficulty: 2,
    title: "车炮联击 Chariot-Cannon Assault", hint: "车吃将后炮将杀", hintEn: "Chariot captures king, cannon follows" },
  { id: 263, fen: "3k1a3/4a4/N3b4/9/9/4C4/9/4B4/4A4/3K1A3",
    solution: [{ from: 'a7', to: 'b9' }, { from: 'd9', to: 'e9' }, { from: 'e4', to: 'e9' }],
    category: "combo", difficulty: 3,
    title: "马炮绝杀 Knight-Cannon Kill", hint: "马将军后用炮将杀", hintEn: "Knight checks, then cannon delivers mate" },
  { id: 264, fen: "4kab2/4a4/4b4/4R4/4N4/9/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e5', to: 'd7' }, { from: 'e9', to: 'd9' }, { from: 'e6', to: 'e9' }],
    category: "combo", difficulty: 2,
    title: "马车双绝 Knight-Chariot Double Kill", hint: "马先将军，车再杀", hintEn: "Knight checks first, chariot kills second" },
  { id: 265, fen: "3k1a3/4a4/9/4R4/9/3C5/9/4B4/4A4/3K1A3",
    solution: [{ from: 'e6', to: 'e8' }, { from: 'd9', to: 'e9' }, { from: 'd4', to: 'd9' }],
    category: "combo", difficulty: 3,
    title: "海底捞月 Deep Sea Moon", hint: "车深入后炮补杀", hintEn: "Chariot penetrates deep, cannon follows for kill" },
  { id: 266, fen: "2bak4/4a4/4b4/p3p3p/9/2R1N4/P3P3P/4B4/4A4/3K1A3",
    solution: [{ from: 'e4', to: 'd6' }, { from: 'd9', to: 'e9' }, { from: 'c4', to: 'c9' }],
    category: "combo", difficulty: 3,
    title: "三子归边 Three Forces Converge", hint: "多子配合形成绝杀", hintEn: "Multiple pieces coordinate for mate" },
];


// ── Puzzle Rating System ────────────────────────────────────

const PUZZLE_K_FACTOR = 32;
const DEFAULT_PUZZLE_RATING = 1200;

/**
 * Get the user's puzzle rating.
 * @param {string} gameType - 'chess' or 'xiangqi'
 * @returns {number} Current puzzle rating
 */
export function getPuzzleRating(gameType) {
  const key = `puzzle_rating_${gameType}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : DEFAULT_PUZZLE_RATING;
}

/**
 * Update puzzle rating after solving or failing a puzzle.
 * @param {string} gameType - 'chess' or 'xiangqi'
 * @param {number} puzzleDifficulty - 1-4 difficulty stars
 * @param {boolean} solved - Whether the puzzle was solved
 * @returns {{ oldRating: number, newRating: number, delta: number }}
 */
export function updatePuzzleRating(gameType, puzzleDifficulty, solved) {
  const key = `puzzle_rating_${gameType}`;
  const oldRating = getPuzzleRating(gameType);

  // Map difficulty to estimated puzzle rating
  const puzzleRating = 800 + (puzzleDifficulty * 200); // 1★=1000, 2★=1200, 3★=1400, 4★=1600

  // Standard ELO formula
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - oldRating) / 400));
  const score = solved ? 1 : 0;
  const delta = Math.round(PUZZLE_K_FACTOR * (score - expected));
  const newRating = Math.max(100, oldRating + delta);

  localStorage.setItem(key, newRating.toString());

  // Store history
  const historyKey = `puzzle_rating_history_${gameType}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  history.push({ rating: newRating, date: new Date().toISOString(), delta });
  // Keep last 50 entries
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem(historyKey, JSON.stringify(history));

  return { oldRating, newRating, delta };
}

/**
 * Get puzzle rating history.
 * @param {string} gameType - 'chess' or 'xiangqi'
 * @returns {Array<{rating: number, date: string, delta: number}>}
 */
export function getPuzzleRatingHistory(gameType) {
  const key = `puzzle_rating_history_${gameType}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}
