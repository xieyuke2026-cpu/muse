import type { OwnedUnit, Tag } from './types';
import { starMultiplier } from './types';
import { getUnit } from './units';
import { computeSynergies, synergyBonus, type SynergyBonus } from './synergy';

export type Side = 'player' | 'enemy';
export interface BattleInputUnit { unit: OwnedUnit; x: number; y: number; side: Side }
export interface BattleEvent { t: number; text: string; kind?: 'skill' | 'info'; casterUid?: string; skillKind?: string; targetUids?: string[] }
export type Rng = () => number;
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export class BattleUnit {
  uid: string; side: Side; defId: string; name: string; icon: string; color: string; star: number;
  x: number; y: number; maxHp: number; hp: number; shield = 0; atk: number; aspd: number; range: number; armor: number;
  energy = 0; atkTimer = 0; stunUntil = 0; buffAtkUntil = 0; buffAtkPct = 0; buffAspdUntil = 0; buffAspdPct = 0;
  dots: { dps: number; until: number }[] = []; dead = false; kills = 0; damageDealt = 0; healingDone = 0;
  crit: number; energyGain: number; items: string[]; role: string; tags: Tag[];
  constructor(inp: BattleInputUnit, bonus: SynergyBonus) {
    const def = getUnit(inp.unit.defId); const m = starMultiplier(inp.unit.star);
    this.uid = inp.unit.uid; this.side = inp.side; this.defId = def.id; this.name = def.name; this.icon = def.icon; this.color = def.color; this.star = inp.unit.star;
    this.x = inp.x; this.y = inp.y; this.items = [...inp.unit.items]; this.role = def.role; this.tags = def.tags;
    this.maxHp = def.hp * m * (1 + bonus.hpPct); this.hp = this.maxHp;
    this.atk = def.atk * m * (1 + bonus.atkPct); this.aspd = def.aspd * (1 + bonus.aspdPct) * (inp.unit.items.includes('chip') ? 1.25 : 1);
    this.range = def.range; this.armor = def.armor + bonus.armor + (inp.unit.items.includes('armor') ? 18 : 0);
    this.shield = bonus.startShield + (inp.unit.items.includes('armor') ? 150 : 0);
    this.crit = bonus.crit + (inp.unit.items.includes('chaoscore') ? 0.25 : 0); this.energyGain = 1 + bonus.energyPct;
  }
  get hpPct(): number { return Math.max(0, this.hp / this.maxHp); }
}
export class Battle {
  units: BattleUnit[] = []; time = 0; events: BattleEvent[] = []; winner: Side | 'draw' | null = null;
  rng: Rng; chaosTimer = 10; chaosTier = 0; private logCount = 0;
  constructor(player: BattleInputUnit[], enemy: BattleInputUnit[], rng: Rng = Math.random) {
    this.rng = rng;
    const pb = synergyBonus(computeSynergies(player.map(p => p.unit)));
    const eb = synergyBonus(computeSynergies(enemy.map(p => p.unit)));
    this.chaosTier = pb.chaosTier;
    this.units = [...player.map(p => new BattleUnit(p, pb)), ...enemy.map(p => new BattleUnit(p, eb))];
    this.log(`入侵开始：我方 ${player.length} 程序 vs 敌方 ${enemy.length} 程序`);
  }
  log(text: string, extra: Partial<BattleEvent> = {}) { if (this.logCount++ < 400) this.events.push({ t: this.time, text, ...extra }); }
  alive(side: Side): BattleUnit[] { return this.units.filter(u => u.side === side && !u.dead); }
  enemiesOf(u: BattleUnit): BattleUnit[] { return this.alive(u.side === 'player' ? 'enemy' : 'player'); }
  alliesOf(u: BattleUnit): BattleUnit[] { return this.alive(u.side).filter(a => a !== u); }
  dist(a: BattleUnit, b: BattleUnit): number { return Math.hypot(a.x - b.x, a.y - b.y); }
  dealDamage(src: BattleUnit, tgt: BattleUnit, raw: number, label = '') {
    if (tgt.dead) return;
    let dmg = raw * (100 / (100 + tgt.armor));
    let crit = false;
    if (this.rng() < src.crit) { dmg *= 1.8; crit = true; }
    const absorbed = Math.min(tgt.shield, dmg); tgt.shield -= absorbed; dmg -= absorbed;
    tgt.hp -= dmg; src.damageDealt += dmg;
    if (src.items.includes('healcore') && dmg > 0) { src.hp = Math.min(src.maxHp, src.hp + 12); }
    if (tgt.hp <= 0 && !tgt.dead) { tgt.dead = true; tgt.hp = 0; src.kills++; this.log(`${src.name} 击破了 ${tgt.name}${crit ? '（暴击）' : ''} ${label}`); }
  }
  heal(src: BattleUnit, tgt: BattleUnit, amt: number) { if (tgt.dead) return; const real = Math.min(tgt.maxHp - tgt.hp, amt); tgt.hp += real; src.healingDone += real; }
  castSkill(u: BattleUnit) {
    const def = getUnit(u.defId); const s = def.skill; const enemies = this.enemiesOf(u); const allies = this.alive(u.side);
    if (!enemies.length) return;
    const nearest = [...enemies].sort((a, b) => this.dist(u, a) - this.dist(u, b))[0];
    const lowestAlly = [...allies].sort((a, b) => a.hpPct - b.hpPct)[0];
    const lowestEnemy = [...enemies].sort((a, b) => a.hpPct - b.hpPct)[0];
    const strongestEnemy = [...enemies].sort((a, b) => b.atk - a.atk)[0];
    // 技能事件带目标，供 UI 做技能动画；数值逻辑与之前完全一致
    let targets: BattleUnit[] = [];
    switch (s.kind) {
      case 'burst': targets = [nearest]; this.dealDamage(u, nearest, u.atk * s.power, '技能'); break;
      case 'aoe': targets = enemies.filter(e => this.dist(nearest, e) <= (s.radius ?? 2)); for (const e of targets) this.dealDamage(u, e, u.atk * s.power, '范围技能'); break;
      case 'heal': targets = def.id === 'priest' ? allies : [lowestAlly]; for (const a of targets) this.heal(u, a, s.power * starMultiplier(u.star)); break;
      case 'shield': {
        let extra: BattleUnit | null = null;
        if (def.id === 'sanctum') { targets = allies; for (const a of allies) a.shield += s.power * starMultiplier(u.star); }
        else if (def.id === 'mirage') { u.shield += s.power; extra = allies[Math.floor(this.rng() * allies.length)] ?? null; if (extra) extra.shield += s.power; targets = extra && extra !== u ? [u, extra] : [u]; }
        else { u.shield += s.power * starMultiplier(u.star); targets = [u]; }
        break; }
      case 'stun': targets = [def.id === 'abyss' ? strongestEnemy : nearest]; if (def.id === 'abyss') { strongestEnemy.stunUntil = this.time + s.power; this.dealDamage(u, strongestEnemy, u.atk * 2, '凝视'); } else nearest.stunUntil = this.time + s.power; break;
      case 'buff': targets = allies; for (const a of allies) { if (def.id === 'overclock') { a.buffAtkUntil = this.time + 6; a.buffAtkPct = s.power; } else { a.buffAspdUntil = this.time + 6; a.buffAspdPct = s.power; } } break;
      case 'dot': targets = [...enemies].sort((a, b) => this.dist(u, a) - this.dist(u, b)).slice(0, 3); for (const e of targets) e.dots.push({ dps: s.power * starMultiplier(u.star), until: this.time + 5 }); break;
      case 'execute': targets = [lowestEnemy]; this.dealDamage(u, lowestEnemy, u.atk * s.power, '处决'); break;
      case 'chaos': { const roll = this.rng(); if (roll < 0.34) { targets = enemies.filter(e => this.dist(nearest, e) <= 2); for (const e of targets) this.dealDamage(u, e, u.atk * s.power, '混沌重击'); } else if (roll < 0.67) { targets = enemies; for (const e of enemies) e.stunUntil = Math.max(e.stunUntil, this.time + 1); this.log('混沌脉冲：全体敌人眩晕 1 秒'); } else { targets = [u]; u.buffAtkUntil = this.time + 6; u.buffAtkPct = 0.6; this.log(`${u.name} 进入狂暴：攻击 +60%`); } break; }
    }
    this.log(`${u.name} 释放技能「${def.skillName}」`, { kind: 'skill', casterUid: u.uid, skillKind: s.kind, targetUids: targets.map(t => t.uid) });
  }
  step(dt: number) {
    if (this.winner) return;
    this.time += dt;
    if (this.chaosTier >= 2) { this.chaosTimer -= dt; if (this.chaosTimer <= 0) { this.chaosTimer = 10; const dmg = this.chaosTier >= 3 ? 160 : 80; for (const e of this.alive('enemy')) this.dealDamage(this.alive('player')[0] ?? this.units[0], e, dmg, '混沌脉冲'); this.log(`混沌脉冲触发（${dmg} 点伤害）`); } }
    for (const u of [...this.units]) {
      if (u.dead || this.winner) continue;
      if (this.time < u.stunUntil) continue;
      // 持续伤害
      let dotDmg = 0; u.dots = u.dots.filter(d => { if (this.time < d.until) { dotDmg += d.dps * dt; return true; } return false; });
      if (dotDmg > 0) { u.hp -= dotDmg; if (u.hp <= 0) { u.dead = true; u.hp = 0; this.log(`${u.name} 被持续伤害击破`); continue; } }
      u.energy = Math.min(100, u.energy + dt * 6 * u.energyGain);
      if (u.energy >= 100) { u.energy = 0; this.castSkill(u); if (u.dead) continue; }
      const enemies = this.enemiesOf(u);
      if (!enemies.length) break;
      const target = [...enemies].sort((a, b) => this.dist(u, a) - this.dist(u, b))[0];
      const d = this.dist(u, target);
      if (d > u.range) {
        const speed = 2.4 * dt; const dx = target.x - u.x, dy = target.y - u.y; const len = Math.hypot(dx, dy) || 1;
        u.x = Math.max(0, Math.min(7.6, u.x + (dx / len) * speed)); u.y = Math.max(0, Math.min(7.6, u.y + (dy / len) * speed));
      } else {
        u.atkTimer -= dt;
        if (u.atkTimer <= 0) {
          const aspd = u.aspd * (this.time < u.buffAspdUntil ? 1 + u.buffAspdPct : 1);
          u.atkTimer = 1 / Math.max(0.2, aspd);
          const atk = u.atk * (this.time < u.buffAtkUntil ? 1 + u.buffAtkPct : 1);
          this.dealDamage(u, target, atk);
          u.energy = Math.min(100, u.energy + 8 * u.energyGain);
        }
      }
    }
    const p = this.alive('player').length, e = this.alive('enemy').length;
    if (p === 0 && e === 0) this.winner = 'draw';
    else if (e === 0) this.winner = 'player';
    else if (p === 0) this.winner = 'enemy';
    else if (this.time >= 60) {
      const ph = this.alive('player').reduce((s, u) => s + u.hpPct, 0);
      const eh = this.alive('enemy').reduce((s, u) => s + u.hpPct, 0);
      this.winner = ph >= eh ? 'player' : 'enemy';
      this.log(`入侵超时 60 秒，按剩余生命判定：${this.winner === 'player' ? '我方胜' : '敌方胜'}`);
    }
    if (this.winner) this.log(`入侵结束：${this.winner === 'player' ? '我方获胜' : this.winner === 'enemy' ? '敌方获胜' : '平局（按我方胜结算）'}`);
  }
  runToEnd(maxSteps = 10000): Battle {
    while (!this.winner && maxSteps-- > 0) this.step(0.1);
    if (!this.winner) this.winner = 'draw';
    return this;
  }
}
export function simulateBattle(player: BattleInputUnit[], enemy: BattleInputUnit[], seed = 12345): Battle {
  return new Battle(player, enemy, mulberry32(seed)).runToEnd();
}
