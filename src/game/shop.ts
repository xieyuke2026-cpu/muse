import { UNITS } from './units';
import type { UnitDef } from './types';
import type { Rng } from './engine';

export interface PoolEntry { def: UnitDef; count: number }
export function initialPool(): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of UNITS) m.set(u.id, u.cost === 1 ? 12 : u.cost === 2 ? 10 : u.cost === 3 ? 8 : u.cost === 4 ? 6 : 4);
  return m;
}
// 等级影响的费用概率（仿自走棋常见曲线，公开写在商店面板）
export function shopOdds(level: number): number[] {
  return [...ODDS[Math.min(9, Math.max(1, level))]];
}
const ODDS: Record<number, number[]> = {
  1: [1, 0, 0, 0, 0], 2: [1, 0, 0, 0, 0], 3: [0.75, 0.25, 0, 0, 0], 4: [0.55, 0.30, 0.15, 0, 0],
  5: [0.45, 0.33, 0.20, 0.02, 0], 6: [0.30, 0.35, 0.25, 0.10, 0], 7: [0.20, 0.30, 0.30, 0.15, 0.05],
  8: [0.14, 0.22, 0.30, 0.22, 0.12], 9: [0.10, 0.18, 0.28, 0.26, 0.18],
};
export function rollShop(level: number, pool: Map<string, number>, rng: Rng): UnitDef[] {
  const odds = ODDS[Math.min(9, Math.max(1, level))];
  const out: UnitDef[] = [];
  for (let i = 0; i < 5; i++) {
    const r = rng(); let acc = 0; let cost = 1;
    for (let c = 0; c < 5; c++) { acc += odds[c]; if (r <= acc) { cost = c + 1; break; } cost = c + 1; }
    const candidates = UNITS.filter(u => u.cost === cost && (pool.get(u.id) ?? 0) > 0);
    const fallback = UNITS.filter(u => (pool.get(u.id) ?? 0) > 0);
    const pickFrom = candidates.length ? candidates : fallback;
    if (!pickFrom.length) break;
    const def = pickFrom[Math.floor(rng() * pickFrom.length)];
    pool.set(def.id, (pool.get(def.id) ?? 0) - 1);
    out.push(def);
  }
  return out;
}
export function returnToPool(pool: Map<string, number>, defId: string, n = 1) {
  pool.set(defId, (pool.get(defId) ?? 0) + n);
}
export function xpToNext(level: number, xp: number): number {
  if (level >= 9) return 0;
  // XP_TABLE[level] 为从 level 升到 level+1 所需累计经验（level=1 时下标1=2）
  return Math.max(0, XP_TABLE[level] - xp);
}
import { XP_TABLE } from './types';
