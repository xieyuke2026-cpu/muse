export type Role = '突袭程序' | '防御节点' | '算力核心' | '分析引擎' | '修复进程' | '混沌程序';
export type Tag = '量子集群' | '零信任' | '分布式网络' | '混沌协议';
export type SkillKind = 'burst' | 'aoe' | 'heal' | 'shield' | 'stun' | 'buff' | 'dot' | 'chaos' | 'execute';
export interface SkillDef { kind: SkillKind; power: number; radius?: number; desc: string }
export interface UnitDef {
  id: string; name: string; cost: number; hp: number; atk: number; aspd: number;
  range: number; armor: number; role: Role; tags: Tag[]; icon: string; color: string;
  skillName: string; skill: SkillDef;
}
export interface OwnedUnit { uid: string; defId: string; star: 1 | 2 | 3; items: string[] }
export interface BoardSlot { unit: OwnedUnit | null }
export interface ModuleDef { id: string; name: string; desc: string; icon: string }
export interface SynergyLevel { count: number; desc: string }
export interface SynergyDef { tag: Tag; levels: SynergyLevel[]; desc: string }

let uidCounter = 1;
export function newUid(): string { return `u${Date.now().toString(36)}-${uidCounter++}`; }
export function starMultiplier(star: number): number { return star === 1 ? 1 : star === 2 ? 1.8 : 2.9; }
export function sellPrice(def: UnitDef, star: number): number {
  // 1星原价，2星为3张1星价-1，3星为9张价-2（保留合成成本损耗，规则公开写在UI）
  return star === 1 ? def.cost : star === 2 ? def.cost * 3 - 1 : def.cost * 9 - 2;
}
export const BOARD_W = 8;
export const BOARD_H = 4; // 每方 8x4，部署区共 32 格；人口上限由等级决定
export const BENCH_SIZE = 9;
export const XP_TABLE = [0, 2, 6, 10, 18, 28, 40, 54, 70]; // 到达下一级所需累计经验（等级1..9，索引=当前等级）
export const MAX_LEVEL = 9;
