/**
 * Tiangong Celestial Court TD — Game Data, Balance & AI Visual Asset Manifest
 *
 * Step 1: Core gameplay data (5 Xiangqi Celestial Towers with 1★->2★->3★ evolution,
 *         15 Abyssal Demon waves & Bosses, 9 Roguelike Celestial Decrees).
 * Step 2: AI visual asset manifest (`AI_VISUAL_SLOTS`) with seamless procedural
 *         celestial SVG/Canvas rendering when external MP4/WebP files are not present.
 */

export const GRID_COLS = 7;
export const GRID_ROWS = 8;
export const RIVER_ROW = 3; // 天河弱水 row (slows demons by 35%)
export const CORE_POS = { row: 7, col: 3 }; // 南天门 · 凌霄宝殿

/**
 * Optional drop-in AI video/image assets in `public/tiangong/`.
 * If a file is placed in `public/tiangong/` and fails to load, the UI
 * automatically falls back to the built-in procedural celestial animation.
 */
export const AI_VISUAL_SLOTS = {
  backgroundLoopVideo: `${process.env.PUBLIC_URL || ''}/tiangong/bg-tiangong-loop.mp4`,
  awakeningVideos: {
    bing: `${process.env.PUBLIC_URL || ''}/tiangong/ult-lijing.mp4`,
    che: `${process.env.PUBLIC_URL || ''}/tiangong/ult-leizhenzi.mp4`,
    ma: `${process.env.PUBLIC_URL || ''}/tiangong/ult-erlang.mp4`,
    pao: `${process.env.PUBLIC_URL || ''}/tiangong/ult-nezha.mp4`,
    xiang: `${process.env.PUBLIC_URL || ''}/tiangong/ult-wukong.mp4`,
  },
  portraits: {
    bing: `${process.env.PUBLIC_URL || ''}/tiangong/portrait-lijing.webp`,
    che: `${process.env.PUBLIC_URL || ''}/tiangong/portrait-leizhenzi.webp`,
    ma: `${process.env.PUBLIC_URL || ''}/tiangong/portrait-erlang.webp`,
    pao: `${process.env.PUBLIC_URL || ''}/tiangong/portrait-nezha.webp`,
    xiang: `${process.env.PUBLIC_URL || ''}/tiangong/portrait-wukong.webp`,
  },
};

/**
 * 5 Celestial Chess Towers (仙家棋子防御塔)
 * Attack patterns follow iconic Chinese Chess (Xiangqi) rules:
 * - 兵 (bing): Close-quarters 3x3 shockwave + armor break / pagoda suppression
 * - 车 (che): Full-row & full-column piercing Golden Lightning Beam (十字贯穿天雷)
 * - 马 (ma): Knight "日"-jump multi-target crit slash + stun (八方跳斩定身)
 * - 炮 (pao): Long-range parabolic Samadhi Fireball AoE splash + burn (隔山打牛真火轰炸)
 * - 相 (xiang): Aura buff to nearby allies + Ruyi Jingu Bang sweep (仙阵增幅 + 镇海横扫)
 */
export const TOWER_TYPES = {
  bing: {
    id: 'bing',
    glyph: '兵',
    color: '#52C4A3',
    accent: '#9BF0D6',
    role: '近战镇压 · 范围减速',
    patternLabel: '九宫震地 (周身1.6格)',
    baseDamage: 26,
    cooldownMs: 950,
    range: 1.75,
    tiers: {
      1: { name: '南天门天兵', title: '金戈守卫', scale: 1.0, dmgMult: 1.0 },
      2: { name: '金甲巨灵将', title: '开山神将', scale: 1.85, dmgMult: 2.2 },
      3: {
        name: '托塔李天王',
        title: '玲珑宝塔 · 镇压诸邪',
        deityQuote: '黄金宝塔从天降，十万妖魔尽伏诛！',
        awakeningSkill: '黄金玲珑塔镇压全场妖魔，造成巨额雷震伤害并定身 2.5 秒！',
        scale: 3.2,
        dmgMult: 4.8,
      },
    },
  },
  che: {
    id: 'che',
    glyph: '車',
    color: '#6FA8FF',
    accent: '#C4DCFF',
    role: '十字天雷 · 整列贯穿',
    patternLabel: '纵横贯穿 (同行同列)',
    baseDamage: 34,
    cooldownMs: 1250,
    range: 7.5,
    tiers: {
      1: { name: '雷部神车', title: '紫电战车', scale: 1.0, dmgMult: 1.0 },
      2: { name: '九天应元雷尊', title: '神霄天雷', scale: 1.9, dmgMult: 2.3 },
      3: {
        name: '雷震子·风雷翼',
        title: '九天玄雷 · 纵横贯日',
        deityQuote: '风雷双翼震乾坤，天罚神雷涤荡九幽！',
        awakeningSkill: '召唤九天十字神雷横扫全盘，瞬间重创所有妖魔！',
        scale: 3.3,
        dmgMult: 5.0,
      },
    },
  },
  ma: {
    id: 'ma',
    glyph: '馬',
    color: '#F0CF86',
    accent: '#FFF0C2',
    role: '八方跳斩 · 天眼暴击',
    patternLabel: '日字八方 (精准斩首)',
    baseDamage: 48,
    cooldownMs: 1050,
    range: 2.6,
    critChance: 0.35,
    tiers: {
      1: { name: '天河战骑', title: '逐月灵骑', scale: 1.0, dmgMult: 1.0 },
      2: { name: '哮天战神', title: '裂空神锋', scale: 1.9, dmgMult: 2.3 },
      3: {
        name: '二郎显圣真君',
        title: '法天象地 · 天眼诛魔',
        deityQuote: '额间天眼开阖处，三尖两刃定天河！',
        awakeningSkill: '开启额间第三天眼，金光直击全场血量最高妖魔并触发连环斩杀！',
        scale: 3.4,
        dmgMult: 5.2,
      },
    },
  },
  pao: {
    id: 'pao',
    glyph: '炮',
    color: '#E5594B',
    accent: '#FFB3A8',
    role: '隔山打牛 · 真火轰炸',
    patternLabel: '远距轰炸 (全屏溅射)',
    baseDamage: 42,
    cooldownMs: 1450,
    range: 6.5,
    splashRadius: 1.35,
    tiers: {
      1: { name: '兜率紫金炉', title: '丹火神炮', scale: 1.0, dmgMult: 1.0 },
      2: { name: '三昧真火炮', title: '焚天烈焰', scale: 1.9, dmgMult: 2.35 },
      3: {
        name: '哪吒·火莲法相',
        title: '三头六臂 · 红莲灭世',
        deityQuote: '风火轮转乾坤圈，三昧火莲焚尽八荒！',
        awakeningSkill: '脚踏风火轮引爆漫天红莲业火，全屏轰炸并点燃所有路径！',
        scale: 3.4,
        dmgMult: 5.2,
      },
    },
  },
  xiang: {
    id: 'xiang',
    glyph: '相',
    color: '#D88CFF',
    accent: '#F3D6FF',
    role: '仙阵攻速 · 金箍横扫',
    patternLabel: '田字仙阵 (邻塔加速+横扫)',
    baseDamage: 28,
    cooldownMs: 1150,
    range: 2.3,
    auraSpeedBonus: 0.28,
    tiers: {
      1: { name: '八卦仙阵', title: '聚灵阵眼', scale: 1.0, dmgMult: 1.0 },
      2: { name: '瑶池蟠桃阵', title: '万仙赐福', scale: 1.9, dmgMult: 2.2 },
      3: {
        name: '齐天大圣·法相',
        title: '定海神针 · 万钧一棒',
        deityQuote: '俺老孙来也！吃俺一记定海神针！',
        awakeningSkill: '金箍棒化作擎天巨柱横扫星盘，全军攻速飙升并击退全场妖魔！',
        scale: 3.5,
        dmgMult: 5.5,
      },
    },
  },
};

export const TOWER_KEYS = Object.keys(TOWER_TYPES);

/**
 * Roguelike 3-Choice Celestial Decrees (天道法旨)
 */
export const CELESTIAL_DECREES = [
  {
    id: 'fatian_xiangdi',
    name: '《法天象地》',
    tag: '神话增幅',
    desc: '所有 2★ 与 3★ 神将伤害 +45%，暴击伤害提升至 250%',
    icon: 'crown',
  },
  {
    id: 'sanmei_zhenhuo',
    name: '《三昧真火》',
    tag: '炮塔专精',
    desc: '【炮】塔轰炸范围扩大 40%，且附带每秒额外 30 点灼烧伤害',
    icon: 'streak',
  },
  {
    id: 'jiutian_shenlei',
    name: '《九天神雷》',
    tag: '车塔专精',
    desc: '【車】塔十字天雷伤害 +40%，且命中时有 30% 概率触发麻痹减速',
    icon: 'zap',
  },
  {
    id: 'tianyan_dongxi',
    name: '《天眼洞悉》',
    tag: '马塔专精',
    desc: '【馬】塔暴击率提升至 65%，且每次跳斩额外追击 1 名敌人',
    icon: 'target',
  },
  {
    id: 'wanxian_laichao',
    name: '《万仙来朝》',
    tag: '合成奇遇',
    desc: '每次合成升星时，立即返还 25 仙灵石并缩短全军冷却 15%',
    icon: 'sparkles',
  },
  {
    id: 'sadou_chengbing',
    name: '《撒豆成兵》',
    tag: '军饷经济',
    desc: '立即获得 90 仙灵石，且击杀妖魔获得的仙灵石 +30%',
    icon: 'gem',
  },
  {
    id: 'ruoshui_tianhe',
    name: '《天河弱水》',
    tag: '阵地控制',
    desc: '天河区域减速效果翻倍（减速 65%），处于天河的妖魔受到伤害 +35%',
    icon: 'layers',
  },
  {
    id: 'pantao_shenghui',
    name: '《蟠桃盛会》',
    tag: '凌霄续航',
    desc: '南天门立即恢复 6 点仙气上限与生命，全军攻击速度 +20%',
    icon: 'star',
  },
  {
    id: 'lingxiao_jianzhen',
    name: '《诛仙剑阵》',
    tag: '主帅神通',
    desc: '主动大招【万仙诛魔】伤害提升 80%，冷却时间缩短 35%',
    icon: 'challenge',
  },
];

/**
 * 15 Waves of Abyssal Demons & Mythic Bosses
 */
export const WAVES = [
  { wave: 1, title: '第一波 · 九幽魔卒叩关', count: 7, hp: 75, speed: 0.58, reward: 14, kind: '卒', boss: null },
  { wave: 2, title: '第二波 · 血煞妖骑突袭', count: 9, hp: 105, speed: 0.72, reward: 15, kind: '骑', boss: null },
  {
    wave: 3,
    title: '第三波 · 妖王降临：平天大圣·牛魔王',
    count: 8,
    hp: 135,
    speed: 0.62,
    reward: 16,
    kind: '卒',
    boss: { name: '牛魔王 · 平天法相', glyph: '牛', hp: 780, speed: 0.42, reward: 80 },
  },
  { wave: 4, title: '第四波 · 玄冥重甲妖军', count: 11, hp: 190, speed: 0.55, reward: 16, kind: '甲', boss: null },
  { wave: 5, title: '第五波 · 域外修罗急行军', count: 13, hp: 230, speed: 0.78, reward: 17, kind: '修', boss: null },
  {
    wave: 6,
    title: '第六波 · 凶神降临：九婴·凶水魔神',
    count: 12,
    hp: 270,
    speed: 0.65,
    reward: 18,
    kind: '甲',
    boss: { name: '九婴 · 凶水魔神', glyph: '嬰', hp: 1650, speed: 0.44, reward: 110 },
  },
  { wave: 7, title: '第七波 · 黑风妖王先锋营', count: 14, hp: 350, speed: 0.7, reward: 18, kind: '骑', boss: null },
  { wave: 8, title: '第八波 · 炼狱魔化战车', count: 15, hp: 440, speed: 0.62, reward: 20, kind: '魔', boss: null },
  {
    wave: 9,
    title: '第九波 · 巨妖降临：北冥鲲鹏法相',
    count: 15,
    hp: 520,
    speed: 0.68,
    reward: 20,
    kind: '修',
    boss: { name: '鲲鹏 · 北冥巨妖', glyph: '鯤', hp: 3100, speed: 0.46, reward: 140 },
  },
  { wave: 10, title: '第十波 · 狮驼岭十万妖潮', count: 17, hp: 640, speed: 0.74, reward: 22, kind: '魔', boss: null },
  { wave: 11, title: '第十一波 · 混沌裂隙狂暴军', count: 18, hp: 780, speed: 0.78, reward: 22, kind: '骑', boss: null },
  {
    wave: 12,
    title: '第十二波 · 凶兽降临：上古穷奇',
    count: 18,
    hp: 920,
    speed: 0.72,
    reward: 24,
    kind: '魔',
    boss: { name: '穷奇 · 上古凶兽', glyph: '窮', hp: 5200, speed: 0.48, reward: 180 },
  },
  { wave: 13, title: '第十三波 · 阿修罗血海大军', count: 20, hp: 1150, speed: 0.76, reward: 25, kind: '修', boss: null },
  { wave: 14, title: '第十四波 · 诸天劫火魔卫', count: 22, hp: 1400, speed: 0.8, reward: 26, kind: '魔', boss: null },
  {
    wave: 15,
    title: '最终决战 · 魔祖罗睺·吞天法相',
    count: 22,
    hp: 1650,
    speed: 0.76,
    reward: 28,
    kind: '魔',
    boss: { name: '罗睺 · 魔祖吞天法相', glyph: '魔', hp: 9200, speed: 0.44, reward: 300 },
  },
];
