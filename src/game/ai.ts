import type { OwnedUnit } from './types';
import { newUid } from './types';
import { UNITS, getUnit } from './units';
import type { Rng } from './engine';

// AI 按回合成长：等级、星级、阵容规模都随回合提升；不是固定脚本。
// 部署规则：防御程序放前排（y=0~1），其余放后排（y=2~3），高费用居中。
export function buildAiTeam(round: number, rng: Rng): OwnedUnit[] {
  const level = Math.min(9, 2 + Math.floor(round / 2));
  const budgetUnits = Math.min(level, 2 + Math.floor(round / 2));
  const maxCost = round <= 1 ? 2 : round <= 3 ? 3 : round <= 6 ? 4 : 5;
  const pool = UNITS.filter(u => u.cost <= maxCost);
  const team: OwnedUnit[] = [];
  const counts = new Map<string, number>();
  // 优先凑协议：先按费用抽，抽到同名 3 张即合成为 2 星
  while (team.length < budgetUnits) {
    const def = pool[Math.floor(rng() * pool.length)];
    const n = (counts.get(def.id) ?? 0) + 1; counts.set(def.id, n);
    if (n % 3 === 0) {
      // 移除该单位已有的两张 1 星（若存在），加入一张 2 星；简化处理：直接加入 2 星并计入
      const existing = team.filter(t => t.defId === def.id && t.star === 1);
      if (existing.length >= 2) { for (const e of existing.slice(0, 2)) team.splice(team.indexOf(e), 1); }
      team.push({ uid: newUid(), defId: def.id, star: round >= 5 && rng() < 0.3 ? 2 : 2, items: [] });
    } else {
      const star = (round >= 7 && rng() < 0.25) ? 2 : 1;
      team.push({ uid: newUid(), defId: def.id, star: star as 1 | 2, items: rng() < 0.15 ? ['chip'] : [] });
    }
    if (team.length > budgetUnits) team.pop();
    if (team.length >= budgetUnits) break;
  }
  return team.slice(0, budgetUnits);
}
export interface AiPlacement { unit: OwnedUnit; x: number; y: number }
export function placeAiTeam(team: OwnedUnit[]): AiPlacement[] {
  const sorted = [...team].sort((a, b) => {
    const ra = getUnit(a.defId).role === '防御程序' ? 0 : 1;
    const rb = getUnit(b.defId).role === '防御程序' ? 0 : 1;
    return ra - rb || getUnit(b.defId).cost - getUnit(a.defId).cost;
  });
  return sorted.map((unit, i) => {
    const def = getUnit(unit.defId);
    const front = def.role === '防御程序';
    const row = front ? (i % 2) : 2 + (i % 2);
    const col = 1 + ((i * 2) % 6);
    return { unit, x: col, y: row };
  });
}
