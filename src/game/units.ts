import type { UnitDef } from './types';

export const UNITS: UnitDef[] = [
  { id: 'razor', name: '零日猎手', cost: 1, hp: 520, atk: 52, aspd: 1.15, range: 1, armor: 8, role: '渗透程序', tags: ['量子密钥'], icon: '⚡', color: '#22d3ee', skillName: '零日漏洞利用', skill: { kind: 'burst', power: 1.8, desc: '利用未公开漏洞，对目标造成 180% 攻击力的伤害' } },
  { id: 'sentinel', name: '防火墙守卫', cost: 1, hp: 820, atk: 34, aspd: 0.7, range: 1, armor: 26, role: '防御程序', tags: ['零信任架构'], icon: '🛡️', color: '#60a5fa', skillName: '数据加密', skill: { kind: 'shield', power: 260, desc: '为自己生成 260 点加密护盾' } },
  { id: 'bee', name: '补丁蜂', cost: 1, hp: 460, atk: 28, aspd: 0.9, range: 3, armor: 6, role: '修复程序', tags: ['分布式网络'], icon: '✚', color: '#34d399', skillName: '热补丁', skill: { kind: 'heal', power: 180, desc: '为生命最低的友军打上热补丁，恢复 180 点生命' } },
  { id: 'ghost', name: '幽灵代理', cost: 2, hp: 620, atk: 68, aspd: 1.05, range: 1, armor: 10, role: '渗透程序', tags: ['混沌协议'], icon: '👻', color: '#c084fc', skillName: '幽灵注入', skill: { kind: 'burst', power: 2.2, desc: '以幽灵进程注入目标，造成 220% 攻击力的伤害' } },
  { id: 'ironwall', name: '沙箱壁垒', cost: 2, hp: 1100, atk: 40, aspd: 0.65, range: 1, armor: 34, role: '防御程序', tags: ['零信任架构'], icon: '🧱', color: '#93c5fd', skillName: '沙箱隔离', skill: { kind: 'stun', power: 1.2, desc: '将最近的敌人隔离进沙箱，眩晕 1.2 秒' } },
  { id: 'priest', name: '补丁分发器', cost: 2, hp: 560, atk: 32, aspd: 0.85, range: 3, armor: 8, role: '修复程序', tags: ['量子密钥'], icon: '✦', color: '#22d3ee', skillName: '全网补丁推送', skill: { kind: 'heal', power: 130, desc: '向全体友军推送补丁，各恢复 130 点生命' } },
  { id: 'pulse', name: '脉冲注入器', cost: 3, hp: 640, atk: 78, aspd: 0.85, range: 4, armor: 10, role: '侦察引擎', tags: ['量子密钥'], icon: '〰️', color: '#38bdf8', skillName: '数据洪流', skill: { kind: 'aoe', power: 1.6, radius: 2, desc: '向目标周围倾泻数据洪流，造成 160% 范围伤害' } },
  { id: 'fort', name: '加密堡垒', cost: 3, hp: 1250, atk: 46, aspd: 0.7, range: 2, armor: 30, role: '算力核心', tags: ['零信任架构'], icon: '⬢', color: '#60a5fa', skillName: '协议加速', skill: { kind: 'buff', power: 0.35, desc: '友军攻击速度 +35%，持续 6 秒' } },
  { id: 'tracker', name: '端口猎手', cost: 3, hp: 700, atk: 72, aspd: 1.0, range: 4, armor: 12, role: '侦察引擎', tags: ['分布式网络'], icon: '◎', color: '#34d399', skillName: '漏洞标记', skill: { kind: 'execute', power: 2.6, desc: '对生命最低的敌人造成 260% 伤害' } },
  { id: 'overclock', name: '提权核心', cost: 4, hp: 900, atk: 88, aspd: 1.1, range: 3, armor: 14, role: '算力核心', tags: ['量子密钥'], icon: '⚙️', color: '#22d3ee', skillName: '全域提权', skill: { kind: 'buff', power: 0.5, desc: '友军攻击力 +50%，持续 6 秒' } },
  { id: 'virus', name: '蠕虫集群', cost: 4, hp: 780, atk: 80, aspd: 0.9, range: 3, armor: 12, role: '混沌程序', tags: ['混沌协议'], icon: '☣️', color: '#e879f9', skillName: '蠕虫扩散', skill: { kind: 'dot', power: 55, desc: '使 3 名敌人每秒受到 55 点持续伤害，持续 5 秒' } },
  { id: 'mirage', name: '镜像诱饵', cost: 4, hp: 840, atk: 84, aspd: 1.0, range: 2, armor: 14, role: '混沌程序', tags: ['分布式网络'], icon: '◐', color: '#a78bfa', skillName: '蜜罐镜像', skill: { kind: 'shield', power: 320, desc: '为自己和随机友军布设蜜罐镜像，各获得 320 点护盾' } },
  { id: 'overmind', name: '主宰 AI', cost: 5, hp: 1400, atk: 110, aspd: 0.95, range: 3, armor: 20, role: '算力核心', tags: ['量子密钥', '分布式网络'], icon: '🧠', color: '#f472b6', skillName: '主宰指令', skill: { kind: 'aoe', power: 2.2, radius: 2.5, desc: '对敌方密集区域下达主宰指令，造成 220% 范围伤害' } },
  { id: 'doom', name: '末日协议', cost: 5, hp: 1250, atk: 125, aspd: 0.9, range: 2, armor: 16, role: '混沌程序', tags: ['混沌协议'], icon: '💀', color: '#e879f9', skillName: '混沌注入', skill: { kind: 'chaos', power: 2.0, desc: '随机效果：范围重击 / 全体眩晕 / 自身狂暴' } },
  { id: 'sanctum', name: '保险库守卫', cost: 5, hp: 1900, atk: 60, aspd: 0.7, range: 1, armor: 44, role: '防御程序', tags: ['零信任架构'], icon: '🏰', color: '#93c5fd', skillName: '全网加密壁垒', skill: { kind: 'shield', power: 500, desc: '为所有友军生成 500 点加密护盾' } },
  { id: 'abyss', name: '暗网之眼', cost: 5, hp: 1050, atk: 118, aspd: 0.85, range: 5, armor: 14, role: '侦察引擎', tags: ['混沌协议'], icon: '👁️', color: '#c084fc', skillName: '暗网凝视', skill: { kind: 'stun', power: 2.0, desc: '凝视敌方攻击最高的程序，眩晕 2 秒并造成 200% 伤害' } },
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
  { id: 'healcore', name: '自愈核心', desc: '每次攻击回复自身 12 点生命', icon: '✚' },
  { id: 'chaoscore', name: '混沌核心', desc: '暴击率 +25%，暴击伤害 180%', icon: '🎲' },
] as const;
export type ModuleId = typeof MODULES[number]['id'];
