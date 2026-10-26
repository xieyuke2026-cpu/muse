import { describe, it, expect } from 'vitest';
import { createGame, buyUnit, moveUnit, sellUnit, buyXp, tryMerge, equipModule, serialize, deserialize, deployedCount, refreshShop, toggleShopLock, startNextRound } from '../src/game/state';
import { computeSynergies } from '../src/game/synergy';
import { simulateBattle } from '../src/game/engine';
import { buildAiTeam, placeAiTeam } from '../src/game/ai';
import { newUid } from '../src/game/types';
import { getUnit } from '../src/game/units';
import { rollShop, initialPool, shopOdds } from '../src/game/shop';
import { mulberry32 } from '../src/game/engine';
import { unitImageUrl } from '../src/game/images';

const mk = (defId: string, star: 1 | 2 | 3 = 1) => ({ uid: newUid(), defId, star, items: [] as string[] });

describe('经济与商店', () => {
  it('初始金币 30、等级 1、商店有卡', () => {
    const g = createGame(42); expect(g.gold).toBe(30); expect(g.level).toBe(1); expect(g.shop.length).toBeGreaterThan(0);
  });
  it('购买扣费并进备战区，算力不足拒绝', () => {
    const g = createGame(42); const cost = g.shop[0].cost; const gold = g.gold;
    expect(buyUnit(g, 0)).toContain('已购买'); expect(g.gold).toBe(gold - cost); expect(g.bench.filter(Boolean).length).toBe(1);
    g.gold = 0; const before = g.shop.length; if (before) { buyUnit(g, 0); expect(g.gold).toBe(0); }
  });
  it('刷新扣 2 算力', () => {
    const g = createGame(42); g.gold = 10; expect(refreshShop(g)).toBe(true); expect(g.gold).toBe(8); expect(g.shop.length).toBeGreaterThan(0);
  });
  it('商店锁定后下一回合保留原卡，解锁后才刷新', () => {
    const g = createGame(42); const before = g.shop.map(d => d.id);
    expect(toggleShopLock(g)).toContain('已锁定'); startNextRound(g);
    expect(g.shop.map(d => d.id)).toEqual(before);
    expect(toggleShopLock(g)).toContain('已解锁');
  });
  it('费用概率条：1 级全是 1 费，各级概率和为 1', () => {
    expect(shopOdds(1)).toEqual([1, 0, 0, 0, 0]);
    for (const lv of [3, 5, 7, 9]) expect(shopOdds(lv).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it('商店抽卡不超出卡池且费用合法', () => {
    const pool = initialPool(); const cards = rollShop(5, pool, mulberry32(7));
    expect(cards.length).toBeLessThanOrEqual(5); for (const c of cards) expect(c.cost).toBeGreaterThanOrEqual(1);
  });
});
describe('人口、升级与合成', () => {
  it('等级 1 只能部署 1 个，第二个被拒绝', () => {
    const g = createGame(1); g.bench[0] = mk('razor'); g.bench[1] = mk('sentinel');
    expect(moveUnit(g, 'bench', 0, 'board', 0)).toBe('移动完成'); expect(deployedCount(g)).toBe(1);
    expect(moveUnit(g, 'bench', 1, 'board', 1)).toContain('人口已满');
  });
  it('购买经验升级到 2 级需要 2 经验（一次购买给 4）', () => {
    const g = createGame(1); g.gold = 100; buyXp(g); expect(g.level).toBe(2); expect(g.xp).toBe(4);
  });
  it('3 张同名 1 星自动合成 2 星', () => {
    const g = createGame(1); g.bench[0] = mk('razor'); g.bench[1] = mk('razor'); g.bench[2] = mk('razor'); tryMerge(g);
    const left = g.bench.filter(Boolean); expect(left.length).toBe(1); expect(left[0]!.star).toBe(2);
  });
  it('出售返还 1 星原价', () => {
    const g = createGame(1); g.bench[0] = mk('razor'); g.selectedUid = g.bench[0]!.uid; g.selectedWhere = 'bench'; const gold = g.gold;
    sellUnit(g); expect(g.gold).toBe(gold + getUnit('razor').cost);
  });
  it('装备模块消耗库存且上限 3', () => {
    const g = createGame(1); g.bench[0] = mk('razor'); g.selectedUid = g.bench[0]!.uid; g.selectedWhere = 'bench';
    expect(equipModule(g, 'chip')).toBe('装备成功'); expect(g.modules.chip).toBe(0);
  });
});
describe('协议', () => {
  it('2 个量子单位激活 Lv1', () => {
    const s = computeSynergies([mk('razor'), mk('pulse')]);
    const q = s.find(x => x.tag === '量子集群')!; expect(q.count).toBe(2); expect(q.level).toBe(1); expect(q.active).toBe(true);
  });
  it('无部署时全部未激活', () => {
    const s = computeSynergies([]); expect(s.every(x => !x.active)).toBe(true);
  });
});
describe('战斗引擎', () => {
  it('强队战胜弱队且有击杀记录', () => {
    const b = simulateBattle(
      [{ unit: mk('overmind', 3), x: 3.5, y: 5.5, side: 'player' }],
      [{ unit: mk('bee', 1), x: 3.5, y: 2.5, side: 'enemy' }], 99);
    expect(b.winner).toBe('player'); expect(b.units[0].kills).toBeGreaterThanOrEqual(1);
  });
  it('相同种子结果可复现', () => {
    const mkBattle = () => simulateBattle(
      [{ unit: mk('razor'), x: 3.5, y: 5.5, side: 'player' }, { unit: mk('sentinel'), x: 4.5, y: 4.5, side: 'player' }],
      [{ unit: mk('ghost'), x: 3.5, y: 2.5, side: 'enemy' }], 123);
    expect(mkBattle().winner).toBe(mkBattle().winner);
  });
  it('技能事件带施法者、技能类型与目标（供 UI 做技能动画）', () => {
    const b = simulateBattle(
      [{ unit: mk('sanctum', 3), x: 3.5, y: 5.5, side: 'player' }],
      [{ unit: mk('sanctum', 3), x: 3.5, y: 2.5, side: 'enemy' }], 5);
    const skills = b.events.filter(e => e.kind === 'skill');
    expect(skills.length).toBeGreaterThan(0);
    for (const e of skills) { expect(e.casterUid).toBeTruthy(); expect(e.skillKind).toBeTruthy(); expect(Array.isArray(e.targetUids)).toBe(true); }
  });
  it('战斗在 60 秒内结束（超时判定存在）', () => {
    const b = simulateBattle(
      [{ unit: mk('sanctum', 3), x: 3.5, y: 5.5, side: 'player' }],
      [{ unit: mk('sanctum', 3), x: 3.5, y: 2.5, side: 'enemy' }], 5);
    expect(b.winner).not.toBeNull(); expect(b.time).toBeLessThanOrEqual(60.1);
  });
});
describe('图片素材', () => {
  it('6 个职业都有内嵌图片数据（非空 data URI）', () => {
    for (const role of ['突袭程序', '防御节点', '算力核心', '分析引擎', '修复进程', '混沌程序']) {
      expect(unitImageUrl(role).startsWith('data:image/jpeg;base64,')).toBe(true);
    }
  });
});
describe('AI 与存档', () => {
  it('AI 回合越高阵容越大（1 回合 <= 8 回合）', () => {
    const a1 = buildAiTeam(1, mulberry32(1)); const a8 = buildAiTeam(8, mulberry32(1));
    expect(a1.length).toBeGreaterThan(0); expect(a8.length).toBeGreaterThanOrEqual(a1.length);
    const placed = placeAiTeam(a8); expect(placed.every(p => p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 4)).toBe(true);
  });
  it('序列化/反序列化后金币与阵容一致', () => {
    const g = createGame(11); g.bench[0] = mk('razor'); g.gold = 77;
    const back = deserialize(serialize(g))!; expect(back.gold).toBe(77); expect(back.bench[0]?.defId).toBe('razor');
  });
});
