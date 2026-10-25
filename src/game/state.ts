import type { OwnedUnit } from './types';
import { BOARD_H, BOARD_W, MAX_LEVEL, newUid, sellPrice, XP_TABLE } from './types';
import { getUnit } from './units';
import type { UnitDef } from './types';
import { initialPool, returnToPool, rollShop } from './shop';
import { computeSynergies } from './synergy';
import type { Rng } from './engine';

export type Phase = 'prep' | 'battle' | 'gameover';
export interface GameState {
  gold: number; xp: number; level: number; round: number;
  playerCore: number; enemyCore: number; phase: Phase;
  board: (OwnedUnit | null)[]; // 玩家部署区：BOARD_W*BOARD_H，索引=y*W+x（y=0 为最前排，贴近敌方）
  bench: (OwnedUnit | null)[]; shop: UnitDef[]; pool: Map<string, number>;
  modules: Record<string, number>; selectedUid: string | null; selectedWhere: 'board' | 'bench' | null;
  log: string[]; lastResult: string; winStreak: number; stats: { wins: number; losses: number; kills: number; damage: number };
  seed: number;
}
export const SAVE_KEY = 'hacker-world-save-v1';
export function createGame(seed = Date.now() % 100000): GameState {
  const pool = initialPool();
  const s: GameState = {
    gold: 30, xp: 0, level: 1, round: 1, playerCore: 100, enemyCore: 100, phase: 'prep',
    board: Array(BOARD_W * BOARD_H).fill(null), bench: Array(9).fill(null), shop: [], pool,
    modules: { chip: 1, armor: 1, healcore: 0, chaoscore: 0 }, selectedUid: null, selectedWhere: null,
    log: ['系统初始化完成。欢迎来到黑客世界。'], lastResult: '备战阶段：购买单位并部署，然后点击「开始战斗」。',
    winStreak: 0, stats: { wins: 0, losses: 0, kills: 0, damage: 0 }, seed,
  };
  s.shop = rollShop(s.level, s.pool, mulberryFromSeed(seed));
  return s;
}
function mulberryFromSeed(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function deployedUnits(s: GameState): OwnedUnit[] { return s.board.filter((u): u is OwnedUnit => !!u); }
export function deployedCount(s: GameState): number { return deployedUnits(s).length; }
export function benchCount(s: GameState): number { return s.bench.filter(Boolean).length; }
export function addLog(s: GameState, text: string) { s.log.unshift(`[R${s.round}] ${text}`); s.log = s.log.slice(0, 120); }
export function refreshShop(s: GameState): boolean {
  if (s.gold < 2) return false;
  // 旧商店未购买的单位返还卡池（购买过的已在买入时扣池，不重复返还）
  for (const d of s.shop) returnToPool(s.pool, d.id, 1);
  s.gold -= 2; s.shop = rollShop(s.level, s.pool, Math.random); addLog(s, '刷新黑市商店（-2 算力）'); return true;
}
export function buyUnit(s: GameState, index: number): string {
  const def = s.shop[index]; if (!def) return '商店格子为空';
  if (s.gold < def.cost) return '算力不足';
  const benchIdx = s.bench.findIndex(v => !v); if (benchIdx < 0) return '备战区已满（9 格）';
  s.gold -= def.cost; s.bench[benchIdx] = { uid: newUid(), defId: def.id, star: 1, items: [] }; s.shop[index] = null as unknown as UnitDef;
  // 商店格子买走后置空，不立即补货（与刷新逻辑一致）
  s.shop = s.shop.filter(Boolean) as UnitDef[]; // 保持剩余卡片可见；下一轮刷新补满
  // 注意：filter 会改变格子数，UI 按剩余卡片渲染即可
  addLog(s, `购买 ${def.name}（-${def.cost} 算力）`);
  tryMerge(s); return `已购买 ${def.name}`;
}
export function sellUnit(s: GameState): string {
  const { selectedUid, selectedWhere } = s; if (!selectedUid || !selectedWhere) return '请先选中一个单位';
  const arr = selectedWhere === 'board' ? s.board : s.bench;
  const idx = arr.findIndex(u => u?.uid === selectedUid); if (idx < 0) return '未找到该单位';
  const u = arr[idx]!; const def = getUnit(u.defId); const price = sellPrice(def, u.star);
  s.gold += price; returnToPool(s.pool, u.defId, u.star === 1 ? 1 : u.star === 2 ? 3 : 9);
  arr[idx] = null; s.selectedUid = null; s.selectedWhere = null;
  addLog(s, `出售 ${def.name} ★${u.star}（+${price} 算力）`); return `已出售，返还 ${price} 算力`;
}
export function moveUnit(s: GameState, fromWhere: 'board' | 'bench', fromIdx: number, toWhere: 'board' | 'bench', toIdx: number): string {
  const fromArr = fromWhere === 'board' ? s.board : s.bench;
  const toArr = toWhere === 'board' ? s.board : s.bench;
  const u = fromArr[fromIdx]; if (!u) return '源格子为空';
  if (toWhere === 'board' && fromWhere !== 'board' && !toArr[toIdx] && deployedCount(s) >= s.level) return `人口已满：等级 ${s.level} 只能部署 ${s.level} 个单位`;
  const target = toArr[toIdx]; toArr[toIdx] = u; fromArr[fromIdx] = target ?? null;
  tryMerge(s); return '移动完成';
}
export function buyXp(s: GameState): string {
  if (s.level >= MAX_LEVEL) return '已达到最高等级 9';
  if (s.gold < 4) return '算力不足（需要 4）';
  s.gold -= 4; s.xp += 4; addLog(s, '购买经验 +4（-4 算力）');
  while (s.level < MAX_LEVEL && s.xp >= XP_TABLE[s.level]) { s.level++; addLog(s, `升级！当前等级 ${s.level}，可部署 ${s.level} 个单位`); }
  return `经验 +4，当前等级 ${s.level}`;
}
export function tryMerge(s: GameState) {
  // 备战区+部署区中同名同星满 3 张即自动合成高一星（保留装备最多的那张）
  for (let star: 1 | 2 = 1 as 1; star <= 2; star = (star + 1) as 1 | 2) {
    const all: { where: 'board' | 'bench'; idx: number; u: OwnedUnit }[] = [];
    s.board.forEach((u, idx) => { if (u && u.star === star) all.push({ where: 'board', idx, u }); });
    s.bench.forEach((u, idx) => { if (u && u.star === star) all.push({ where: 'bench', idx, u }); });
    const groups = new Map<string, typeof all>();
    for (const e of all) { const g = groups.get(e.u.defId) ?? []; g.push(e); groups.set(e.u.defId, g); }
    for (const [defId, g] of groups) {
      while (g.length >= 3) {
        const trio = g.splice(0, 3);
        const keeper = [...trio].sort((a, b) => b.u.items.length - a.u.items.length)[0];
        for (const e of trio) { const arr = e.where === 'board' ? s.board : s.bench; if (arr[e.idx]?.uid === e.u.uid) arr[e.idx] = null; }
        const items = [...new Set(trio.flatMap(e => e.u.items))].slice(0, 3);
        keeper.u.star = (star + 1) as 2 | 3; keeper.u.items = items;
        const arr = keeper.where === 'board' ? s.board : s.bench; arr[keeper.idx] = keeper.u;
        addLog(s, `合成！${getUnit(defId).name} 升至 ★${star + 1}`);
      }
    }
  }
}
export function equipModule(s: GameState, moduleId: string): string {
  if ((s.modules[moduleId] ?? 0) <= 0) return '该模块库存不足（胜利后有概率获得）';
  const { selectedUid, selectedWhere } = s; if (!selectedUid || !selectedWhere) return '请先选中一个单位';
  const arr = selectedWhere === 'board' ? s.board : s.bench;
  const u = arr.find(v => v?.uid === selectedUid); if (!u) return '未找到该单位';
  if (u.items.includes(moduleId)) return '该单位已装备此模块';
  if (u.items.length >= 3) return '每个单位最多装备 3 个模块';
  u.items.push(moduleId); s.modules[moduleId]--; addLog(s, `为 ${getUnit(u.defId).name} 装备模块`); return '装备成功';
}
export function applyRoundIncome(s: GameState, won: boolean) {
  const interest = Math.min(5, Math.floor(s.gold / 10));
  const streakBonus = won && s.winStreak >= 2 ? 1 : 0;
  const income = 5 + interest + streakBonus;
  s.gold += income; addLog(s, `回合结算：基础收入 5 + 利息 ${interest}${streakBonus ? ' + 连胜 1' : ''} = +${income} 算力`);
}
export function startNextRound(s: GameState) {
  s.round++; s.phase = 'prep'; s.shop = rollShop(s.level, s.pool, Math.random);
  // 每 3 回合胜利奖励：这里按回合数发放基础模块轮换，保证装备系统可实际获得
  if (s.round % 3 === 0) { const ids = ['chip', 'armor', 'healcore', 'chaoscore']; const id = ids[(s.round / 3 - 1) % ids.length]; s.modules[id] = (s.modules[id] ?? 0) + 1; addLog(s, `补给空投：获得模块 x1`); }
  addLog(s, `第 ${s.round} 回合开始`);
}
export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, pool: [...s.pool.entries()], shop: s.shop.map(d => d?.id ?? null) });
}
export function deserialize(json: string): GameState | null {
  try {
    const raw = JSON.parse(json);
    const pool = new Map<string, number>(raw.pool);
    const shop = (raw.shop as (string | null)[]).map(id => (id ? getUnit(id) : null)).filter((d): d is UnitDef => !!d);
    const s = { ...raw, pool, shop } as GameState;
    if (typeof s.gold !== 'number' || !Array.isArray(s.board)) return null;
    return s;
  } catch { return null; }
}
export function saveGame(s: GameState) { try { localStorage.setItem(SAVE_KEY, serialize(s)); return true; } catch { return false; } }
export function loadGame(): GameState | null { try { const v = localStorage.getItem(SAVE_KEY); return v ? deserialize(v) : null; } catch { return null; } }
export function synergyOf(s: GameState) { return computeSynergies(deployedUnits(s)); }
