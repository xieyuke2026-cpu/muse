import type { OwnedUnit, SynergyDef, Tag } from './types';
import { getUnit } from './units';

export const SYNERGIES: SynergyDef[] = [
  { tag: '量子密钥', desc: '密钥分发加速技能循环', levels: [
    { count: 2, desc: '攻速 +10%，能量获取 +20%' },
    { count: 4, desc: '攻速 +20%，能量获取 +40%' },
    { count: 6, desc: '攻速 +35%，能量获取 +70%' } ] },
  { tag: '零信任架构', desc: '零信任验证强化防御与护盾', levels: [
    { count: 2, desc: '护甲 +12，开局护盾 120' },
    { count: 4, desc: '护甲 +24，开局护盾 240' },
    { count: 6, desc: '护甲 +40，开局护盾 420' } ] },
  { tag: '分布式网络', desc: '多个节点相互提供增益', levels: [
    { count: 2, desc: '生命 +8%，攻击 +8%' },
    { count: 4, desc: '生命 +16%，攻击 +16%' },
    { count: 6, desc: '生命 +26%，攻击 +26%' } ] },
  { tag: '混沌协议', desc: '产生随机但可控的战斗效果', levels: [
    { count: 2, desc: '暴击率 +15%，开局随机增益' },
    { count: 4, desc: '暴击率 +30%，每 10 秒触发一次混沌脉冲' },
    { count: 6, desc: '暴击率 +50%，混沌脉冲伤害翻倍' } ] },
];
export interface SynergyState { tag: Tag; count: number; level: number; desc: string; active: boolean }
export function computeSynergies(deployed: OwnedUnit[]): SynergyState[] {
  const counts = new Map<Tag, number>();
  for (const u of deployed) for (const t of getUnit(u.defId).tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return SYNERGIES.map(s => {
    const count = counts.get(s.tag) ?? 0;
    let level = 0;
    s.levels.forEach((l, i) => { if (count >= l.count) level = i + 1; });
    return { tag: s.tag, count, level, desc: level ? s.levels[level - 1].desc : `还需 ${s.levels[0].count - count} 个激活`, active: level > 0 };
  });
}
export interface SynergyBonus { aspdPct: number; energyPct: number; armor: number; startShield: number; hpPct: number; atkPct: number; crit: number; chaosTier: number }
export function synergyBonus(states: SynergyState[]): SynergyBonus {
  const b: SynergyBonus = { aspdPct: 0, energyPct: 0, armor: 0, startShield: 0, hpPct: 0, atkPct: 0, crit: 0, chaosTier: 0 };
  for (const s of states) {
    if (!s.active) continue;
    if (s.tag === '量子密钥') { b.aspdPct = [0, .10, .20, .35][s.level]; b.energyPct = [0, .20, .40, .70][s.level]; }
    if (s.tag === '零信任架构') { b.armor = [0, 12, 24, 40][s.level]; b.startShield = [0, 120, 240, 420][s.level]; }
    if (s.tag === '分布式网络') { b.hpPct = [0, .08, .16, .26][s.level]; b.atkPct = b.hpPct; }
    if (s.tag === '混沌协议') { b.crit = [0, .15, .30, .50][s.level]; b.chaosTier = s.level; }
  }
  return b;
}
