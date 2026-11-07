/**
 * 《天宫弈 · 南天门守卫战》 (Tiangong Celestial Court Tower Defense)
 *
 * Step 1: Playable iOS-first Celestial Chess Merge & Roguelike Tower Defense
 *   - 7x8 Celestial Star-Board on a 2.5D TiltStage
 *   - 5 Xiangqi Deity Towers (兵/車/馬/炮/相) with 1★ -> 2★ -> 3★ (法天象地) merge evolution
 *   - Xiangqi-authentic attack patterns (Cross Lightning, Parabolic Samadhi Fireballs,
 *     Knight Jump Crit Slash, Nine-Palace Shockwave, Jade Pool Aura + Staff Sweep)
 *   - 15 Waves of Abyssal Demons + 5 Mythic Bosses (Bull King, Hydra, Kunpeng, Qiongqi, Rahu)
 *   - Roguelike 3-Choice "天道法旨" (Celestial Decrees) between waves
 *
 * Step 2: AI Visual Empowerment & "法天象地" Awakening Cinematic
 *   - Built-in procedural golden cloud sea, constellation star-grid, laser/fireball FX
 *   - 3★ Awakening full-screen cut-in modal with board-wide divine strike
 *   - Drop-in video/portrait slots (`public/tiangong/*.mp4`) with seamless fallback
 */

import React, { Component } from 'react';
import './TiangongTD.css';
import TiltStage from './components/TiltStage';
import { Icon } from './components/Icon';
import {
  GRID_COLS,
  GRID_ROWS,
  RIVER_ROW,
  CORE_POS,
  AI_VISUAL_SLOTS,
  TOWER_TYPES,
  TOWER_KEYS,
  CELESTIAL_DECREES,
  WAVES,
} from './data/tiangongAssets';
import { playSound, SOUND } from './services/SoundService';
import { hapticTap, hapticImpact, hapticNotification } from './services/CapacitorService';
import { boardTiltDegrees } from './services/ViewportService';

const TICK_MS = 80;
const BASE_SUMMON_COST = 40;

let nextEntityId = 1;
function uid(prefix = 'id') {
  nextEntityId += 1;
  return `${prefix}_${nextEntityId}`;
}

export function isDeployableCell(row, col) {
  if (row <= 0 || row >= GRID_ROWS) return false;
  if (row === RIVER_ROW) return false;
  if (row === CORE_POS.row && col === CORE_POS.col) return false;
  return col >= 0 && col < GRID_COLS;
}

function computeBoardWidth() {
  if (typeof window === 'undefined') return 364;
  const vw = window.innerWidth || 390;
  const vh = window.innerHeight || 844;
  const maxByWidth = Math.min(vw - 28, 476);
  const maxByHeight = Math.max(294, Math.floor((vh - 300) * (GRID_COLS / GRID_ROWS)));
  return Math.max(294, Math.min(maxByWidth, maxByHeight));
}

class TiangongTD extends Component {
  constructor(props) {
    super(props);
    this.state = this.createInitialState();
  }

  createInitialState() {
    // Start with 2 pre-deployed 1★ Celestial Towers so the board is immediately alive
    const starterTowers = [
      { id: uid('tw'), type: 'che', star: 1, row: 4, col: 2, lastShotAt: 0 },
      { id: uid('tw'), type: 'pao', star: 1, row: 5, col: 4, lastShotAt: 0 },
    ];
    return {
      boardWidth: computeBoardWidth(),
      tiltEnabled: true,
      speedMultiplier: 1,
      isPaused: false,
      waveIndex: 0, // 0-based index into WAVES (0..14)
      stones: 140, // 仙灵石
      summonCount: 0,
      coreHp: 20,
      maxCoreHp: 20,
      score: 0,
      kills: 0,
      ultCharge: 45, // 0..100 for 诛仙剑阵
      towers: starterTowers,
      selectedTowerId: null,
      enemies: [],
      spawnQueue: this.buildWaveSpawnQueue(0),
      spawnCooldownMs: 400,
      fxBeams: [], // transient SVG attack effects
      floatTexts: [], // floating damage popups
      activeDecrees: [], // array of decree ids
      decreeChoices: null, // array of 3 decrees when between waves
      awakeningCutIn: null, // { type, towerName, title, quote, skill }
      bgVideoOk: true,
      awakeningVideoOk: {},
      gameResult: null, // 'victory' | 'defeat' | null
    };
  }

  componentDidMount() {
    this.handleResize = () => {
      this.setState({ boardWidth: computeBoardWidth() });
    };
    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.stopLoop();
  }

  startLoop() {
    this.stopLoop();
    this.loopTimer = setInterval(this.tick, TICK_MS);
  }

  stopLoop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  buildWaveSpawnQueue(waveIndex) {
    const waveDef = WAVES[waveIndex] || WAVES[0];
    const queue = [];
    for (let i = 0; i < waveDef.count; i += 1) {
      const col = (i * 2 + (waveIndex % 3)) % GRID_COLS;
      queue.push({
        id: uid('em'),
        name: waveDef.title,
        glyph: waveDef.kind,
        isBoss: false,
        hp: waveDef.hp,
        maxHp: waveDef.hp,
        speed: waveDef.speed,
        reward: waveDef.reward,
        col: col + (Math.random() * 0.24 - 0.12),
        row: 0.15,
        slowUntil: 0,
        burnUntil: 0,
      });
    }
    if (waveDef.boss) {
      queue.push({
        id: uid('boss'),
        name: waveDef.boss.name,
        glyph: waveDef.boss.glyph,
        isBoss: true,
        hp: waveDef.boss.hp,
        maxHp: waveDef.boss.hp,
        speed: waveDef.boss.speed,
        reward: waveDef.boss.reward,
        col: CORE_POS.col,
        row: 0.1,
        slowUntil: 0,
        burnUntil: 0,
      });
    }
    return queue;
  }

  hasDecree(id) {
    return this.state.activeDecrees.includes(id);
  }

  getSummonCost() {
    return BASE_SUMMON_COST + Math.min(60, this.state.summonCount * 5);
  }

  // ── Core Simulation Tick ──────────────────────────────────────

  tick = () => {
    const {
      isPaused,
      decreeChoices,
      awakeningCutIn,
      gameResult,
      speedMultiplier,
    } = this.state;

    if (isPaused || decreeChoices || awakeningCutIn || gameResult) {
      return;
    }

    const dtMs = TICK_MS * speedMultiplier;
    const now = Date.now();

    this.setState((prev) => {
      let {
        enemies,
        spawnQueue,
        spawnCooldownMs,
        towers,
        stones,
        coreHp,
        score,
        kills,
        ultCharge,
        fxBeams,
        floatTexts,
        waveIndex,
        activeDecrees,
      } = prev;

      const hasDecree = (id) => activeDecrees.includes(id);
      let nextEnemies = enemies.map((e) => ({ ...e }));
      let nextQueue = spawnQueue;
      let nextSpawnWait = spawnCooldownMs - dtMs;

      // 1. Spawn next demon from queue
      if (nextQueue.length > 0 && nextSpawnWait <= 0) {
        const [spawned, ...rest] = nextQueue;
        nextEnemies.push(spawned);
        nextQueue = rest;
        nextSpawnWait = spawned.isBoss ? 1100 : 720;
      }

      // 2. Move enemies & apply burn / river slow
      const survivingEnemies = [];
      let hpLost = 0;
      let stonesEarned = 0;
      let killsEarned = 0;
      const newFloats = [];

      nextEnemies.forEach((enemy) => {
        // Burn damage over time from Samadhi Fire
        if (enemy.burnUntil > now) {
          const burnDmg = ((hasDecree('sanmei_zhenhuo') ? 38 : 18) * dtMs) / 1000;
          enemy.hp -= burnDmg;
        }

        if (enemy.hp <= 0) {
          const rewardBonus = hasDecree('sadou_chengbing') ? 1.3 : 1.0;
          stonesEarned += Math.round(enemy.reward * rewardBonus);
          killsEarned += 1;
          return;
        }

        // Check if on Celestial River (Row 2.5 .. 3.5)
        const inRiver = enemy.row >= RIVER_ROW - 0.45 && enemy.row <= RIVER_ROW + 0.45;
        const riverSlow = inRiver ? (hasDecree('ruoshui_tianhe') ? 0.35 : 0.65) : 1.0;
        const debuffSlow = enemy.slowUntil > now ? 0.45 : 1.0;
        const step = (enemy.speed * riverSlow * debuffSlow * dtMs) / 1000;

        enemy.row += step;
        // Converge horizontally toward Nantianmen Gate once past row 5.2
        if (enemy.row > 5.0) {
          const dx = CORE_POS.col - enemy.col;
          enemy.col += Math.sign(dx) * Math.min(Math.abs(dx), step * 0.85);
        }

        // Reached Nantianmen Core?
        if (enemy.row >= CORE_POS.row - 0.15) {
          hpLost += enemy.isBoss ? 5 : 1;
          newFloats.push({
            id: uid('flt'),
            col: CORE_POS.col,
            row: CORE_POS.row,
            text: enemy.isBoss ? '南天门 -5!' : '仙气 -1',
            crit: true,
            expiresAt: now + 600,
          });
        } else {
          survivingEnemies.push(enemy);
        }
      });

      nextEnemies = survivingEnemies;

      // 3. Towers acquire targets & fire
      const newBeams = [];
      const nextTowers = towers.map((t) => ({ ...t }));

      if (nextEnemies.length > 0) {
        nextTowers.forEach((tower) => {
          const spec = TOWER_TYPES[tower.type];
          const tierSpec = spec.tiers[tower.star] || spec.tiers[1];

          // Check adjacent 相 (Xiang) aura speed bonus
          let speedMult = hasDecree('pantao_shenghui') ? 1.2 : 1.0;
          nextTowers.forEach((other) => {
            if (other.id !== tower.id && other.type === 'xiang') {
              const dist = Math.hypot(other.row - tower.row, other.col - tower.col);
              if (dist <= 1.6) {
                speedMult += 0.25 * other.star;
              }
            }
          });

          const effectiveCooldown = spec.cooldownMs / speedMult;
          if (now - tower.lastShotAt < effectiveCooldown / speedMultiplier) {
            return;
          }

          // Calculate damage
          let dmg = spec.baseDamage * tierSpec.dmgMult;
          if (tower.star >= 2 && hasDecree('fatian_xiangdi')) {
            dmg *= 1.45;
          }

          let fired = false;

          if (tower.type === 'che') {
            // 车: Cross-line piercing lightning along same row or column (within tolerance)
            const inCross = nextEnemies.filter(
              (e) => Math.abs(e.col - tower.col) <= 0.65 || Math.abs(e.row - tower.row) <= 0.65
            );
            if (inCross.length > 0) {
              fired = true;
              const thunderBoost = hasDecree('jiutian_shenlei') ? 1.4 : 1.0;
              inCross.forEach((e) => {
                const riverVuln =
                  hasDecree('ruoshui_tianhe') && Math.abs(e.row - RIVER_ROW) <= 0.5 ? 1.35 : 1.0;
                const finalDmg = Math.round(dmg * thunderBoost * riverVuln);
                e.hp -= finalDmg;
                if (hasDecree('jiutian_shenlei') && Math.random() < 0.3) {
                  e.slowUntil = Math.max(e.slowUntil, now + 1400);
                }
              });
              const lead = inCross[0];
              newFloats.push({
                id: uid('flt'),
                col: lead.col,
                row: lead.row,
                text: `⚡-${Math.round(dmg * thunderBoost)}`,
                crit: tower.star === 3,
                expiresAt: now + 500,
              });
              newBeams.push({
                id: uid('fx'),
                kind: 'cross',
                fromCol: tower.col,
                fromRow: tower.row,
                toCol: lead.col,
                toRow: lead.row,
                color: spec.color,
                star: tower.star,
                expiresAt: now + 220,
              });
            }
          } else if (tower.type === 'pao') {
            // 炮: Target furthest-ahead enemy & deal AoE splash + burn
            const sorted = [...nextEnemies].sort((a, b) => b.row - a.row);
            const target = sorted[0];
            if (target) {
              fired = true;
              const splashR =
                (spec.splashRadius || 1.35) * (hasDecree('sanmei_zhenhuo') ? 1.4 : 1.0);
              nextEnemies.forEach((e) => {
                if (Math.hypot(e.row - target.row, e.col - target.col) <= splashR) {
                  e.hp -= Math.round(dmg);
                  e.burnUntil = Math.max(e.burnUntil, now + 2600);
                }
              });
              newFloats.push({
                id: uid('flt'),
                col: target.col,
                row: target.row,
                text: `🔥-${Math.round(dmg)}`,
                crit: tower.star >= 2,
                expiresAt: now + 520,
              });
              newBeams.push({
                id: uid('fx'),
                kind: 'fireball',
                fromCol: tower.col,
                fromRow: tower.row,
                toCol: target.col,
                toRow: target.row,
                color: spec.color,
                star: tower.star,
                expiresAt: now + 260,
              });
            }
          } else if (tower.type === 'ma') {
            // 马: High-crit jump strike on enemies within range
            const inRange = nextEnemies.filter(
              (e) => Math.hypot(e.row - tower.row, e.col - tower.col) <= spec.range
            );
            if (inRange.length > 0) {
              fired = true;
              const maxTargets = hasDecree('tianyan_dongxi') ? 2 : 1;
              const critRate = hasDecree('tianyan_dongxi') ? 0.65 : spec.critChance;
              const critMult = hasDecree('fatian_xiangdi') ? 2.5 : 1.9;
              inRange.slice(0, maxTargets).forEach((target) => {
                const isCrit = Math.random() < critRate;
                const hitDmg = Math.round(dmg * (isCrit ? critMult : 1.0));
                target.hp -= hitDmg;
                if (tower.star >= 2) {
                  target.slowUntil = Math.max(target.slowUntil, now + 900);
                }
                newFloats.push({
                  id: uid('flt'),
                  col: target.col,
                  row: target.row,
                  text: isCrit ? `天眼暴击 -${hitDmg}!` : `-${hitDmg}`,
                  crit: isCrit,
                  expiresAt: now + 520,
                });
                newBeams.push({
                  id: uid('fx'),
                  kind: 'slash',
                  fromCol: tower.col,
                  fromRow: tower.row,
                  toCol: target.col,
                  toRow: target.row,
                  color: spec.color,
                  star: tower.star,
                  expiresAt: now + 220,
                });
              });
            }
          } else {
            // 兵 / 相: Shockwave pulse around tower
            const inRange = nextEnemies.filter(
              (e) => Math.hypot(e.row - tower.row, e.col - tower.col) <= spec.range
            );
            if (inRange.length > 0) {
              fired = true;
              inRange.forEach((e) => {
                e.hp -= Math.round(dmg);
                if (tower.type === 'bing') {
                  e.slowUntil = Math.max(e.slowUntil, now + 1300);
                }
              });
              newFloats.push({
                id: uid('flt'),
                col: inRange[0].col,
                row: inRange[0].row,
                text: `-${Math.round(dmg)}`,
                crit: tower.star === 3,
                expiresAt: now + 480,
              });
              newBeams.push({
                id: uid('fx'),
                kind: 'ring',
                fromCol: tower.col,
                fromRow: tower.row,
                toCol: inRange[0].col,
                toRow: inRange[0].row,
                color: spec.color,
                star: tower.star,
                expiresAt: now + 240,
              });
            }
          }

          if (fired) {
            tower.lastShotAt = now;
          }
        });
      }

      // Sweep enemies killed by tower shots this tick
      const afterShotEnemies = [];
      nextEnemies.forEach((e) => {
        if (e.hp <= 0) {
          const rewardBonus = hasDecree('sadou_chengbing') ? 1.3 : 1.0;
          stonesEarned += Math.round(e.reward * rewardBonus);
          killsEarned += 1;
        } else {
          afterShotEnemies.push(e);
        }
      });

      const nextCoreHp = Math.max(0, coreHp - hpLost);
      const nextStones = stones + stonesEarned;
      const nextKills = kills + killsEarned;
      const nextScore = score + killsEarned * 25 + stonesEarned;
      const chargeRate = hasDecree('lingxiao_jianzhen') ? 5.5 : 3.5;
      const nextUlt = Math.min(100, ultCharge + killsEarned * chargeRate);

      // Defeat check
      if (nextCoreHp <= 0) {
        playSound(SOUND.LOSE);
        hapticNotification('error');
        return {
          coreHp: 0,
          enemies: afterShotEnemies,
          gameResult: 'defeat',
        };
      }

      // Wave cleared check
      if (nextQueue.length === 0 && afterShotEnemies.length === 0) {
        if (waveIndex + 1 >= WAVES.length) {
          playSound(SOUND.WIN);
          hapticNotification('success');
          return {
            enemies: [],
            stones: nextStones + 100,
            kills: nextKills,
            score: nextScore + 1000,
            gameResult: 'victory',
          };
        }

        // Offer 3 Roguelike Celestial Decrees between waves!
        playSound(SOUND.WIN);
        const available = CELESTIAL_DECREES.filter((d) => !activeDecrees.includes(d.id));
        const pool = available.length >= 3 ? available : CELESTIAL_DECREES;
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

        return {
          enemies: [],
          spawnQueue: [],
          stones: nextStones + 35,
          kills: nextKills,
          score: nextScore + 150,
          ultCharge: nextUlt,
          decreeChoices: shuffled,
          fxBeams: [],
          floatTexts: [],
        };
      }

      return {
        enemies: afterShotEnemies,
        spawnQueue: nextQueue,
        spawnCooldownMs: nextSpawnWait,
        towers: nextTowers,
        stones: nextStones,
        coreHp: nextCoreHp,
        kills: nextKills,
        score: nextScore,
        ultCharge: nextUlt,
        fxBeams: [...fxBeams.filter((b) => b.expiresAt > now), ...newBeams].slice(-18),
        floatTexts: [...floatTexts.filter((f) => f.expiresAt > now), ...newFloats].slice(-16),
      };
    });
  };

  // ── Player Actions: Summon, Move, Merge, Ultimate, Decrees ────

  summonTower = () => {
    const cost = this.getSummonCost();
    const { stones, towers, gameResult } = this.state;
    if (gameResult || stones < cost) return false;

    const occupied = new Set(towers.map((t) => `${t.row}-${t.col}`));
    const emptyCells = [];
    for (let r = 1; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        if (isDeployableCell(r, c) && !occupied.has(`${r}-${c}`)) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    if (emptyCells.length === 0) return false;

    const spot = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const type = TOWER_KEYS[Math.floor(Math.random() * TOWER_KEYS.length)];
    const newTower = {
      id: uid('tw'),
      type,
      star: 1,
      row: spot.row,
      col: spot.col,
      lastShotAt: 0,
    };

    playSound(SOUND.PLACE);
    hapticTap();

    this.setState((prev) => ({
      stones: prev.stones - cost,
      summonCount: prev.summonCount + 1,
      towers: [...prev.towers, newTower],
      selectedTowerId: newTower.id,
    }));
    return true;
  };

  /**
   * Merge `sourceId` into `targetId` (same type, same star < 3).
   * When merging into 3★, triggers the "法天象地" Celestial Awakening Cut-in
   * and deals an immediate divine strike across all enemies on the board!
   */
  mergeTowers = (sourceId, targetId) => {
    const { towers } = this.state;
    const src = towers.find((t) => t.id === sourceId);
    const dst = towers.find((t) => t.id === targetId);
    if (!src || !dst || src.id === dst.id) return false;
    if (src.type !== dst.type || src.star !== dst.star || dst.star >= 3) return false;

    const newStar = dst.star + 1;
    const spec = TOWER_TYPES[dst.type];
    const tierInfo = spec.tiers[newStar];

    playSound(newStar === 3 ? SOUND.CHECK : SOUND.CAPTURE);
    hapticImpact();

    this.setState((prev) => {
      const hasWanxian = prev.activeDecrees.includes('wanxian_laichao');
      const rebate = hasWanxian ? 25 : 0;
      const nextTowers = prev.towers
        .filter((t) => t.id !== src.id)
        .map((t) => (t.id === dst.id ? { ...t, star: newStar, lastShotAt: 0 } : t));

      // If 3★ Awakening, also blast all current enemies on the board
      let nextEnemies = prev.enemies;
      let awakeningCutIn = prev.awakeningCutIn;
      if (newStar === 3) {
        const now = Date.now();
        nextEnemies = prev.enemies.map((e) => ({
          ...e,
          hp: e.hp - 360,
          slowUntil: Math.max(e.slowUntil, now + 2500),
        }));
        awakeningCutIn = {
          type: dst.type,
          glyph: spec.glyph,
          towerName: tierInfo.name,
          title: tierInfo.title,
          quote: tierInfo.deityQuote,
          skill: tierInfo.awakeningSkill,
        };
      }

      return {
        towers: nextTowers,
        enemies: nextEnemies,
        stones: prev.stones + rebate,
        score: prev.score + newStar * 80,
        selectedTowerId: dst.id,
        awakeningCutIn,
      };
    });

    return true;
  };

  findMergeablePairs() {
    const { towers } = this.state;
    const pairs = [];
    for (let i = 0; i < towers.length; i += 1) {
      for (let j = i + 1; j < towers.length; j += 1) {
        if (
          towers[i].type === towers[j].type &&
          towers[i].star === towers[j].star &&
          towers[i].star < 3
        ) {
          pairs.push([towers[i], towers[j]]);
        }
      }
    }
    return pairs;
  }

  autoMergePair = () => {
    const pairs = this.findMergeablePairs();
    if (pairs.length === 0) return false;
    // Prefer merging 2★ -> 3★ first if available!
    pairs.sort((a, b) => b[0].star - a[0].star);
    const [src, dst] = pairs[0];
    return this.mergeTowers(src.id, dst.id);
  };

  handleCellClick = (row, col) => {
    if (!isDeployableCell(row, col)) return;
    const { towers, selectedTowerId } = this.state;
    const clickedTower = towers.find((t) => t.row === row && t.col === col);
    const selectedTower = towers.find((t) => t.id === selectedTowerId);

    if (clickedTower) {
      if (
        selectedTower &&
        selectedTower.id !== clickedTower.id &&
        selectedTower.type === clickedTower.type &&
        selectedTower.star === clickedTower.star &&
        clickedTower.star < 3
      ) {
        this.mergeTowers(selectedTower.id, clickedTower.id);
        return;
      }
      playSound(SOUND.SELECT);
      hapticTap();
      this.setState({
        selectedTowerId: selectedTower?.id === clickedTower.id ? null : clickedTower.id,
      });
      return;
    }

    // Clicked an empty deployable cell while a tower is selected -> tactical reposition!
    if (selectedTower) {
      playSound(SOUND.MOVE);
      hapticTap();
      this.setState((prev) => ({
        towers: prev.towers.map((t) =>
          t.id === selectedTower.id ? { ...t, row, col } : t
        ),
      }));
    }
  };

  castUltimate = () => {
    const { ultCharge, enemies } = this.state;
    if (ultCharge < 100) return false;
    playSound(SOUND.CHECK);
    hapticNotification('success');

    const now = Date.now();
    const ultMult = this.hasDecree('lingxiao_jianzhen') ? 1.8 : 1.0;
    const dmg = Math.round(320 * ultMult);

    this.setState((prev) => ({
      ultCharge: this.hasDecree('lingxiao_jianzhen') ? 25 : 0,
      enemies: prev.enemies.map((e) => ({
        ...e,
        hp: e.hp - dmg,
        slowUntil: Math.max(e.slowUntil, now + 1800),
      })),
      floatTexts: [
        ...prev.floatTexts,
        ...enemies.slice(0, 6).map((e) => ({
          id: uid('flt'),
          col: e.col,
          row: e.row,
          text: `🗡️诛仙 -${dmg}!`,
          crit: true,
          expiresAt: now + 650,
        })),
      ],
    }));
    return true;
  };

  chooseDecree = (decree) => {
    if (!decree) return;
    playSound(SOUND.PLACE);
    hapticImpact();

    this.setState((prev) => {
      const nextWaveIdx = prev.waveIndex + 1;
      const nextDecrees = prev.activeDecrees.includes(decree.id)
        ? prev.activeDecrees
        : [...prev.activeDecrees, decree.id];
      const bonusStones = decree.id === 'sadou_chengbing' ? 90 : 0;
      const bonusHp = decree.id === 'pantao_shenghui' ? 6 : 0;

      return {
        activeDecrees: nextDecrees,
        decreeChoices: null,
        waveIndex: nextWaveIdx,
        spawnQueue: this.buildWaveSpawnQueue(nextWaveIdx),
        spawnCooldownMs: 500,
        stones: prev.stones + bonusStones,
        maxCoreHp: prev.maxCoreHp + bonusHp,
        coreHp: Math.min(prev.maxCoreHp + bonusHp, prev.coreHp + bonusHp),
      };
    });
  };

  cycleSpeed = () => {
    this.setState((prev) => ({
      speedMultiplier: prev.speedMultiplier === 1 ? 2 : prev.speedMultiplier === 2 ? 3 : 1,
    }));
  };

  restartGame = () => {
    playSound(SOUND.SELECT);
    this.setState(this.createInitialState());
  };

  // ── Render ─────────────────────────────────────────────────────

  render() {
    const {
      boardWidth,
      tiltEnabled,
      speedMultiplier,
      isPaused,
      waveIndex,
      stones,
      coreHp,
      maxCoreHp,
      score,
      ultCharge,
      towers,
      selectedTowerId,
      enemies,
      fxBeams,
      floatTexts,
      activeDecrees,
      decreeChoices,
      awakeningCutIn,
      bgVideoOk,
      awakeningVideoOk,
      gameResult,
    } = this.state;

    const currentWave = WAVES[waveIndex] || WAVES[0];
    const cellSize = Math.floor(boardWidth / GRID_COLS);
    const exactWidth = cellSize * GRID_COLS;
    const exactHeight = cellSize * GRID_ROWS;
    const tiltDeg = tiltEnabled ? boardTiltDegrees(exactWidth) : 0;

    const summonCost = this.getSummonCost();
    const mergePairs = this.findMergeablePairs();
    const selectedTower = towers.find((t) => t.id === selectedTowerId) || null;
    const selectedSpec = selectedTower ? TOWER_TYPES[selectedTower.type] : null;
    const selectedTier = selectedTower ? selectedSpec.tiers[selectedTower.star] : null;

    return (
      <div className="tiangong-td-page" data-testid="tiangong-td">
        {/* Ambient Celestial Cloud Sea + Optional Drop-in AI Loop Video */}
        <div className="tg-ambient-bg" aria-hidden="true">
          {bgVideoOk && (
            <video
              className="tg-bg-video"
              src={AI_VISUAL_SLOTS.backgroundLoopVideo}
              ref={(el) => { if (el) el.muted = true; }}
              autoPlay
              loop
              playsInline
              onError={() => this.setState({ bgVideoOk: false })}
            />
          )}
          <div className="tg-cloud-layer" />
        </div>

        <div className="tg-shell">
          {/* Top HUD */}
          <div className="tg-hud">
            <div className="tg-hud-top">
              <div className="tg-title-wrap">
                <span className="tg-seal-badge">天</span>
                <div>
                  <div className="tg-wave-title">{currentWave.title}</div>
                  <div className="tg-wave-sub">
                    波次 {waveIndex + 1}/{WAVES.length} · 拖拽或点选同名棋子合阵化神
                  </div>
                </div>
              </div>
              <div className="tg-hud-controls">
                <button
                  type="button"
                  className={`tg-mini-btn ${speedMultiplier > 1 ? 'active' : ''}`}
                  onClick={this.cycleSpeed}
                  aria-label="切换战斗倍速"
                >
                  {speedMultiplier}x
                </button>
                <button
                  type="button"
                  className={`tg-mini-btn ${tiltEnabled ? 'active' : ''}`}
                  onClick={() => this.setState({ tiltEnabled: !tiltEnabled })}
                  aria-label="切换2.5D星盘视角"
                >
                  {tiltEnabled ? '2.5D' : '2D'}
                </button>
                <button
                  type="button"
                  className={`tg-mini-btn ${isPaused ? 'active' : ''}`}
                  onClick={() => this.setState({ isPaused: !isPaused })}
                  aria-label={isPaused ? '继续战斗' : '暂停战斗'}
                >
                  {isPaused ? '继续' : '暂停'}
                </button>
              </div>
            </div>

            <div className="tg-hud-stats">
              <div className="tg-stat-pill">
                <span className="tg-stat-label">仙灵石</span>
                <span className="tg-stat-val gold" data-testid="tg-stones">
                  ✦ {stones}
                </span>
              </div>
              <div className="tg-stat-pill">
                <span className="tg-stat-label">南天门仙气</span>
                <span
                  className={`tg-stat-val hp ${coreHp <= 6 ? 'low' : ''}`}
                  data-testid="tg-core-hp"
                >
                  ♥ {coreHp}/{maxCoreHp}
                </span>
              </div>
              <div className="tg-stat-pill">
                <span className="tg-stat-label">驻守神将</span>
                <span className="tg-stat-val" data-testid="tg-tower-count">
                  {towers.length} 尊
                </span>
              </div>
              <div className="tg-stat-pill">
                <span className="tg-stat-label">功德战绩</span>
                <span className="tg-stat-val">{score}</span>
              </div>
            </div>
          </div>

          {/* Active Celestial Decrees Strip */}
          {activeDecrees.length > 0 && (
            <div className="tg-decrees-strip" aria-label="已激活天道法旨">
              {activeDecrees.map((id) => {
                const d = CELESTIAL_DECREES.find((item) => item.id === id);
                return d ? (
                  <span key={id} className="tg-decree-chip" title={d.desc}>
                    {d.name}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* 2.5D Celestial Star-Board */}
          <TiltStage width={exactWidth + 20} tilt={tiltDeg} className="tg-tilt-stage">
            <div className="tg-board-frame" style={{ width: exactWidth + 20 }}>
              <div
                className="tg-board-canvas"
                style={{ width: exactWidth, height: exactHeight }}
              >
                <div className="tg-rift-banner">
                  ▲ 九幽魔界裂隙 · 妖潮剩余 {this.state.spawnQueue.length + enemies.length}
                </div>

                {/* Celestial River (Row 3) */}
                <div
                  className="tg-river-banner"
                  style={{
                    top: RIVER_ROW * cellSize,
                    height: cellSize,
                  }}
                >
                  <span>天河弱水</span>
                  <span>星汉定界</span>
                </div>

                {/* Star Grid */}
                <div
                  className="tg-grid"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_COLS}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${GRID_ROWS}, ${cellSize}px)`,
                  }}
                >
                  {Array.from({ length: GRID_ROWS }).map((_, r) =>
                    Array.from({ length: GRID_COLS }).map((__, c) => {
                      const isCore = r === CORE_POS.row && c === CORE_POS.col;
                      const deployable = isDeployableCell(r, c);
                      const tower = towers.find((t) => t.row === r && t.col === c);
                      const isSelected = tower && tower.id === selectedTowerId;
                      const isMergeCandidate =
                        tower &&
                        selectedTower &&
                        tower.id !== selectedTower.id &&
                        tower.type === selectedTower.type &&
                        tower.star === selectedTower.star &&
                        tower.star < 3;

                      return (
                        <div
                          key={`${r}-${c}`}
                          data-testid={`tg-cell-${r}-${c}`}
                          className={[
                            'tg-cell',
                            deployable ? 'deployable' : '',
                            isSelected ? 'selected' : '',
                            isMergeCandidate ? 'merge-hint' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => this.handleCellClick(r, c)}
                        >
                          {isCore && (
                            <div className="tg-core-fortress" title="南天门 · 凌霄宝殿">
                              <span className="tg-core-glyph">帥</span>
                              <span className="tg-core-sub">南天门</span>
                            </div>
                          )}

                          {tower && (
                            <div
                              className={`tg-tower star-${tower.star}`}
                              title={`${TOWER_TYPES[tower.type].tiers[tower.star].name}`}
                            >
                              <span
                                className="tg-tower-glyph"
                                style={{ color: TOWER_TYPES[tower.type].color }}
                              >
                                {TOWER_TYPES[tower.type].glyph}
                              </span>
                              <span className="tg-tower-stars">
                                {'★'.repeat(tower.star)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Enemies Layer */}
                <div className="tg-enemies-layer">
                  {enemies.map((enemy) => {
                    const leftPx = (enemy.col + 0.5) * cellSize;
                    const topPx = (enemy.row + 0.5) * cellSize;
                    const hpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
                    return (
                      <div
                        key={enemy.id}
                        className={[
                          'tg-enemy',
                          enemy.isBoss ? 'is-boss' : '',
                          enemy.slowUntil > Date.now() ? 'slowed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{ left: leftPx, top: topPx }}
                      >
                        <div className="tg-enemy-hp-bar">
                          <div
                            className="tg-enemy-hp-fill"
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>
                        <div className="tg-enemy-token">{enemy.glyph}</div>
                      </div>
                    );
                  })}
                </div>

                {/* SVG Attack Beams & Projectiles */}
                <svg
                  className="tg-fx-svg"
                  viewBox={`0 0 ${exactWidth} ${exactHeight}`}
                >
                  {fxBeams.map((fx) => {
                    const x1 = (fx.fromCol + 0.5) * cellSize;
                    const y1 = (fx.fromRow + 0.5) * cellSize;
                    const x2 = (fx.toCol + 0.5) * cellSize;
                    const y2 = (fx.toRow + 0.5) * cellSize;
                    if (fx.kind === 'cross') {
                      return (
                        <g key={fx.id}>
                          <line
                            x1={x1}
                            y1={0}
                            x2={x1}
                            y2={exactHeight}
                            stroke={fx.color}
                            strokeWidth={fx.star * 2.5}
                            strokeOpacity="0.65"
                          />
                          <line
                            x1={0}
                            y1={y1}
                            x2={exactWidth}
                            y2={y1}
                            stroke={fx.color}
                            strokeWidth={fx.star * 2.5}
                            strokeOpacity="0.65"
                          />
                        </g>
                      );
                    }
                    if (fx.kind === 'fireball') {
                      return (
                        <g key={fx.id}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#F0CF86"
                            strokeWidth={fx.star * 2}
                            strokeDasharray="4 2"
                          />
                          <circle
                            cx={x2}
                            cy={y2}
                            r={cellSize * (0.55 + fx.star * 0.15)}
                            fill="rgba(229, 89, 75, 0.28)"
                            stroke="#E5594B"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    }
                    if (fx.kind === 'ring') {
                      return (
                        <circle
                          key={fx.id}
                          cx={x1}
                          cy={y1}
                          r={cellSize * 1.3}
                          fill="none"
                          stroke={fx.color}
                          strokeWidth={fx.star * 2}
                          strokeOpacity="0.7"
                        />
                      );
                    }
                    return (
                      <line
                        key={fx.id}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={fx.color}
                        strokeWidth={fx.star * 2.2}
                      />
                    );
                  })}
                </svg>

                {/* Floating Damage Numbers */}
                <div className="tg-float-texts">
                  {floatTexts.map((flt) => (
                    <div
                      key={flt.id}
                      className={`tg-float-dmg ${flt.crit ? 'crit' : ''}`}
                      style={{
                        left: (flt.col + 0.5) * cellSize,
                        top: (flt.row + 0.35) * cellSize,
                      }}
                    >
                      {flt.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TiltStage>

          {/* Bottom Command Dock (iOS Thumb Zone) */}
          <div className="tg-dock">
            <div className="tg-dock-actions">
              <button
                type="button"
                className="tg-action-btn summon"
                data-testid="tg-summon-btn"
                disabled={stones < summonCost}
                onClick={this.summonTower}
              >
                <span className="tg-btn-main">
                  <Icon name="sparkles" size={15} /> 敕令募兵
                </span>
                <span className="tg-btn-sub">消耗 {summonCost} 仙灵石</span>
              </button>

              <button
                type="button"
                className="tg-action-btn merge"
                data-testid="tg-merge-btn"
                disabled={mergePairs.length === 0}
                onClick={this.autoMergePair}
              >
                <span className="tg-btn-main">
                  <Icon name="zap" size={15} /> 一键合阵 ({mergePairs.length})
                </span>
                <span className="tg-btn-sub">同名升星 · 3★化神</span>
              </button>

              <button
                type="button"
                className={`tg-action-btn ult ${ultCharge >= 100 ? 'ready' : ''}`}
                data-testid="tg-ult-btn"
                disabled={ultCharge < 100}
                onClick={this.castUltimate}
              >
                <span className="tg-btn-main">
                  <Icon name="crown" size={15} /> 诛仙剑阵
                </span>
                <span className="tg-btn-sub">
                  {ultCharge >= 100 ? '点击释放全屏大招!' : `仙力充能 ${Math.floor(ultCharge)}%`}
                </span>
              </button>
            </div>

            {/* Selected Tower Inspector */}
            <div className="tg-inspector">
              {selectedTower ? (
                <>
                  <div className="tg-inspector-info">
                    <span className="tg-inspector-name">
                      【{selectedSpec.glyph} · {'★'.repeat(selectedTower.star)}】{selectedTier.name} — {selectedTier.title}
                    </span>
                    <span className="tg-inspector-desc">
                      {selectedSpec.role} · {selectedSpec.patternLabel}（点空位可调兵换防，点同名同星棋子可合阵升星）
                    </span>
                  </div>
                  {selectedTower.star === 3 && (
                    <button
                      type="button"
                      className="tg-mini-btn active"
                      onClick={() =>
                        this.setState({
                          awakeningCutIn: {
                            type: selectedTower.type,
                            glyph: selectedSpec.glyph,
                            towerName: selectedTier.name,
                            title: selectedTier.title,
                            quote: selectedTier.deityQuote,
                            skill: selectedTier.awakeningSkill,
                          },
                        })
                      }
                    >
                      法相真身
                    </button>
                  )}
                </>
              ) : (
                <div className="tg-inspector-info">
                  <span className="tg-inspector-name">天宫星盘兵法提示</span>
                  <span className="tg-inspector-desc">
                    【車】十字贯穿天雷 · 【炮】隔山三昧真火 · 【馬】八方天眼暴击 · 【兵】九宫震地减速 · 【相】仙阵加速
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: 3-Star "法天象地" Colossal Deity Awakening Cut-in Modal */}
        {awakeningCutIn && (
          <div className="tg-modal-backdrop" data-testid="tg-awakening-modal">
            <div className="tg-awakening-modal">
              <div className="tg-modal-kicker">✦ 三星化神 · 法天象地降临 ✦</div>
              <h2 className="tg-modal-title">{awakeningCutIn.towerName}</h2>
              <div className="tg-modal-subtitle">{awakeningCutIn.title}</div>

              {awakeningVideoOk[awakeningCutIn.type] !== false && (
                <video
                  className="tg-awakening-video"
                  src={AI_VISUAL_SLOTS.awakeningVideos[awakeningCutIn.type]}
                  ref={(el) => { if (el) el.muted = true; }}
                  autoPlay
                  playsInline
                  onError={() =>
                    this.setState((prev) => ({
                      awakeningVideoOk: {
                        ...prev.awakeningVideoOk,
                        [awakeningCutIn.type]: false,
                      },
                    }))
                  }
                />
              )}

              <div className="tg-awakening-avatar">{awakeningCutIn.glyph}</div>
              <div className="tg-awakening-quote">“{awakeningCutIn.quote}”</div>
              <div className="tg-awakening-skill">
                <strong>神通觉醒：</strong>
                {awakeningCutIn.skill}
              </div>

              <button
                type="button"
                className="tg-primary-cta"
                onClick={() => this.setState({ awakeningCutIn: null })}
              >
                领旨镇魔 · 继续守城
              </button>
            </div>
          </div>
        )}

        {/* Roguelike 3-Choice Celestial Decree Modal */}
        {decreeChoices && (
          <div className="tg-modal-backdrop" data-testid="tg-decree-modal">
            <div className="tg-decree-modal">
              <div className="tg-modal-kicker">✦ 击退第 {waveIndex + 1} 波妖潮 · 凌霄赐福 ✦</div>
              <h2 className="tg-modal-title">敕封天道法旨</h2>
              <div className="tg-modal-subtitle">
                择一法旨加持天宫星盘，准备迎战下一波九幽大军
              </div>

              <div className="tg-decree-list">
                {decreeChoices.map((decree) => (
                  <button
                    key={decree.id}
                    type="button"
                    className="tg-decree-card"
                    data-testid={`tg-decree-${decree.id}`}
                    onClick={() => this.chooseDecree(decree)}
                  >
                    <div className="tg-decree-icon">
                      <Icon name={decree.icon || 'crown'} size={20} />
                    </div>
                    <div>
                      <div className="tg-decree-card-title">
                        <span>{decree.name}</span>
                        <span className="tg-decree-tag">{decree.tag}</span>
                      </div>
                      <div className="tg-decree-card-desc">{decree.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Victory / Defeat Seal Modal */}
        {gameResult && (
          <div className="tg-modal-backdrop" data-testid="tg-result-modal">
            <div className="tg-result-modal">
              <div className="tg-modal-kicker">
                {gameResult === 'victory' ? '✦ 诸天靖平 · 万仙来朝 ✦' : '✦ 南天门失守 · 仙阵重整 ✦'}
              </div>
              <h2 className="tg-modal-title">
                {gameResult === 'victory' ? '镇守天宫大捷' : '凌霄蒙尘 · 败北'}
              </h2>
              <div className="tg-modal-subtitle">
                坚守波次：{waveIndex + 1}/{WAVES.length} · 功德战绩：{score}
              </div>
              <button
                type="button"
                className="tg-primary-cta"
                onClick={this.restartGame}
              >
                重开天宫星盘 · 再战一局
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default TiangongTD;
