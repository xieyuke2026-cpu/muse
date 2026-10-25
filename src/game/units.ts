import type { UnitDef } from './types';

export const UNITS: UnitDef[] = [
  { id: 'razor', name: '闪袭者', cost: 1, hp: 520, atk: 52, aspd: 1.15, range: 1, armor: 8, role: '突袭程序', tags: ['量子集群'], icon: '⚡', color: '#22d3ee', skillName: '超频突刺', skill: { kind: 'burst', power: 1.8, desc: '对目标造成 180% 攻击力的伤害' } },
  { id: 'sentinel', name: '哨兵节点', cost: 1, hp: 820, atk: 34, aspd: 0.7, range: 1, armor: 26, role: '防御节点', tags: ['零信任'], icon: '🛡️', color: '#60a5fa', skillName: '防火墙展开', skill: { kind: 'shield', power: 260, desc: '为自己获得 260 点护盾' } },
  { id: 'bee', name: '修复蜂', cost: 1, hp: 460, atk: 28, aspd: 0.9, range: 3, armor: 6, role: '修复进程', tags: ['分布式网络'], icon: '✚', color: '#34d399', skillName: '纳米修复', skill: { kind: 'heal', power: 180, desc: '治疗生命最低的友军 180 点' } },
  { id: 'ghost', name: '幽灵刃', cost: 2, hp: 620, atk: 68, aspd: 1.05, range: 1, armor: 10, role: '突袭程序', tags: ['混沌协议'], icon: '👻', color: '#c084fc', skillName: '相位斩', skill: { kind: 'burst', power: 2.2, desc: '对目标造成 220% 伤害并短暂致盲（攻速降低）' } },
  { id: 'ironwall', name: '铁壁', cost: 2, hp: 1100, atk: 40, aspd: 0.65, range: 1, armor: 34, role: '防御节点', tags: ['零信任'], icon: '🧱', color: '#93c5fd', skillName: '嘲讽协议', skill: { kind: 'stun', power: 1.2, desc: '眩晕最近敌人 1.2 秒并吸引火力' } },
  { id: 'priest', name: '数据牧师', cost: 2, hp: 560, atk: 32, aspd: 0.85, range: 3, armor: 8, role: '修复进程', tags: ['量子集群'], icon: '✦', color: '#22d3ee', skillName: '群体补丁', skill: { kind: 'heal', power: 130, desc: '治疗所有友军 130 点' } },
  { id: 'pulse', name: '脉冲法师', cost: 3, hp: 640, atk: 78, aspd: 0.85, range: 4, armor: 10, role: '分析引擎', tags: ['量子集群'], icon: '〰️', color: '#38bdf8', skillName: '脉冲风暴', skill: { kind: 'aoe', power: 1.6, radius: 2, desc: '对目标周围造成 160% 范围伤害' } },
  { id: 'fort', name: '堡垒核心', cost: 3, hp: 1250, atk: 46, aspd: 0.7, range: 2, armor: 30, role: '算力核心', tags: ['零信任'], icon: '⬢', color: '#60a5fa', skillName: '算力灌注', skill: { kind: 'buff', power: 0.35, desc: '友军攻击速度 +35%，持续 6 秒' } },
  { id: 'tracker', name: '追踪者', cost: 3, hp: 700, atk: 72, aspd: 1.0, range: 4, armor: 12, role: '分析引擎', tags: ['分布式网络'], icon: '◎', color: '#34d399', skillName: '弱点标记', skill: { kind: 'execute', power: 2.6, desc: '对生命最低的敌人造成 260% 伤害' } },
  { id: 'overclock', name: '超频核心', cost: 4, hp: 900, atk: 88, aspd: 1.1, range: 3, armor: 14, role: '算力核心', tags: ['量子集群'], icon: '⚙️', color: '#22d3ee', skillName: '全域超频', skill: { kind: 'buff', power: 0.5, desc: '友军攻击力 +50%，持续 6 秒' } },
  { id: 'virus', name: '病毒使', cost: 4, hp: 780, atk: 80, aspd: 0.9, range: 3, armor: 12, role: '混沌程序', tags: ['混沌协议'], icon: '☣️', color: '#e879f9', skillName: '蠕虫扩散', skill: { kind: 'dot', power: 55, desc: '使 3 名敌人每秒受到 55 点持续伤害，持续 5 秒' } },
  { id: 'mirage', name: '镜像体', cost: 4, hp: 840, atk: 84, aspd: 1.0, range: 2, armor: 14, role: '混沌程序', tags: ['分布式网络'], icon: '◐', color: '#a78bfa', skillName: '镜像分身', skill: { kind: 'shield', power: 320, desc: '为自己和随机友军获得 320 点护盾' } },
  { id: 'overmind', name: '主宰 AI', cost: 5, hp: 1400, atk: 110, aspd: 0.95, range: 3, armor: 20, role: '算力核心', tags: ['量子集群', '分布式网络'], icon: '🧠', color: '#f472b6', skillName: '主宰指令', skill: { kind: 'aoe', power: 2.2, radius: 2.5, desc: '对敌方密集区域造成 220% 范围伤害' } },
  { id: 'doom', name: '末日协议', cost: 5, hp: 1250, atk: 125, aspd: 0.9, range: 2, armor: 16, role: '混沌程序', tags: ['混沌协议'], icon: '💀', color: '#e879f9', skillName: '混沌审判', skill: { kind: 'chaos', power: 2.0, desc: '随机效果：范围重击 / 全体眩晕 / 自身狂暴' } },
  { id: 'sanctum', name: '圣殿守护', cost: 5, hp: 1900, atk: 60, aspd: 0.7, range: 1, armor: 44, role: '防御节点', tags: ['零信任'], icon: '🏰', color: '#93c5fd', skillName: '圣殿壁垒', skill: { kind: 'shield', power: 500, desc: '为所有友军获得 500 点护盾' } },
  { id: 'abyss', name: '深渊之眼', cost: 5, hp: 1050, atk: 118, aspd: 0.85, range: 5, armor: 14, role: '分析引擎', tags: ['混沌协议'], icon: '👁️', color: '#c084fc', skillName: '深渊凝视', skill: { kind: 'stun', power: 2.0, desc: '眩晕敌方攻击最高的单位 2 秒并造成 200% 伤害' } },
];
export const UNIT_MAP = new Map(UNITS.map(u => [u.id, u]));
export function getUnit(id: string): UnitDef {
  const u = UNIT_MAP.get(id);
  if (!u) throw new Error(`未知单位 ${id}`);
  return u;
}
export const MODULES = [
  { id: 'chip', name: '超频芯片', desc: '攻击速度 +25%', icon: '⚡' },
  { id: 'armor', name: '纳米装甲', desc: '护甲 +18，开局护盾 +150', icon: '🛡️' },
  { id: 'healcore', name: '治疗核心', desc: '每次攻击回复自身 12 点生命', icon: '✚' },
  { id: 'chaoscore', name: '混沌核心', desc: '暴击率 +25%，暴击伤害 180%', icon: '🎲' },
] as const;
export type ModuleId = typeof MODULES[number]['id'];
