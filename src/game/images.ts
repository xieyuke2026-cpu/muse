import { ROLE_IMAGE_DATA } from './imageData';

const ROLE_KEY: Record<string, string> = {
  '渗透程序': 'assault',
  '防御程序': 'defense',
  '算力核心': 'core',
  '侦察引擎': 'analysis',
  '修复程序': 'repair',
  '混沌程序': 'chaos',
};
export function unitImageUrl(role: string): string {
  return ROLE_IMAGE_DATA[ROLE_KEY[role]] ?? '';
}
export function unitImgTag(role: string, cls = 'unit-img'): string {
  const url = unitImageUrl(role);
  if (!url) return '';
  // onerror falls back to the emoji icon next to it, so a missing image never breaks a cell.
  return `<img class="${cls}" src="${url}" alt="" onerror="this.style.display='none'" />`;
}
