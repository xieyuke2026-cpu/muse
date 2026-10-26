import { createGame, loadGame, saveGame, refreshShop, toggleShopLock, buyUnit, sellUnit, moveUnit, buyXp, equipModule, deployedUnits, deployedCount, benchCount, synergyOf, applyRoundIncome, startNextRound, addLog, type GameState } from './game/state';
import { SYNERGIES } from './game/synergy';
import { getUnit, MODULES } from './game/units';
import { unitImgTag } from './game/images';
import { starMultiplier, sellPrice, BOARD_W } from './game/types';
import { xpToNext, shopOdds } from './game/shop';
import { Battle, type BattleInputUnit } from './game/engine';
import { buildAiTeam, placeAiTeam } from './game/ai';
import type { OwnedUnit } from './game/types';

let game: GameState = createGame(20261025);
let battle: Battle | null = null;
let battleTimer: ReturnType<typeof setInterval> | null = null;
let battleSpeed = 1;
let lastEventIdx = 0;
let fxCount = 0;
let trackedTag: string | null = null;
let previewDef: ReturnType<typeof getUnit> | null = null;
let dragData: { uid: string; where: 'board' | 'bench'; idx: number } | null = null;
let msg = '';

const app = document.getElementById('app')!;
app.innerHTML = `
<div class="topbar">
  <h1>黑客世界 <span>HACKER WORLD</span></h1>
  <div class="stat">部署阶段 · 第 <b id="round"></b> 回合</div>
  <div class="stat">我方核心 <span class="corebar"><i id="pcoreBar"></i></span> <b id="pcore"></b></div>
  <div class="stat">敌方核心 <span class="corebar"><i id="ecoreBar"></i></span> <b id="ecore"></b></div>
  <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
    <button id="btnSave">💾 保存</button><button id="btnLoad">📂 读取</button><button id="btnRestart" class="danger">↻ 重新开始</button>
  </div>
</div>
<div class="notice" id="msg"></div>
<div class="layout">
  <div class="panel side-panel"><h3>协议组合（点一行可追踪）</h3><div id="synergies"></div>
    <h3>入侵统计</h3><div id="stats" class="muted"></div></div>
  <div class="panel center-panel">
    <div id="phaseLabel" class="notice"></div>
    <div class="step-hint" id="stepHint"></div>
    <div class="shop-section" id="shopSection"><div class="shop-head"><h3>暗网黑市 <span class="muted">点卡即招募 · 算力收益：每 10 算力 +1，上限 5</span></h3><button id="btnLock" class="lock-btn" aria-pressed="false">🔓 锁定商店</button></div><div class="shop" id="shop"></div><div class="odds-bar" id="oddsBar" aria-label="商店费用概率"></div></div>
    <div class="arena" id="arena" style="display:none"><div class="mid"></div><div id="fxLayer"></div><div id="tokens"></div><div class="battle-controls"><button id="btnSpeed">⏩ 速度 1×</button></div><div class="last-skill" id="lastSkill"></div></div>
    <div id="playerArea" class="field-area"><div class="legend-player">部署区 · 已部署 <span id="pop"></span> · 防御程序站前排，远程站后排 · 敌方只在入侵时出现</div><div class="grid" id="playerGrid"></div></div>
    <div class="bench-section" id="benchSection">
      <div class="bench-row"><span class="bench-label">待命程序</span><div class="bench" id="bench"></div><button id="btnAutoDeploy" class="primary">⚡ 一键部署全部</button></div>
      <div class="economy-bar"><span>指挥等级 Lv.<b id="level"></b> · 经验 <span id="xp"></span> · <span class="muted" id="xpHint"></span> <button id="btnXp">⬆️ 购买经验（4）</button></span><span class="gold-big">💰 <b id="gold"></b> 算力</span></div>
    </div>
    <details class="howto"><summary>玩法说明（点开）</summary><div class="muted">你是黑客指挥官：从暗网黑市招募程序，部署到我方网络，组合协议加成，然后发起入侵，击破敌方核心。最简单三步：点商店卡招募 → 点「一键部署全部」（防御程序自动站前排、远程站后排），或点待命程序再点带黄色虚线框的空格 → 点右侧「发起入侵」。选中程序后点另一格可交换位置，右侧还有「部署到空位 / 收回待命区」按钮，也可把程序拖到「卸载」按钮回收算力。相同程序同星满 3 个自动融合升级（属性 ×1.8 / ×2.9）。人口 = 指挥等级，上限 9。胜负伤害 = 3 + 存活程序数。入侵超时 60 秒按剩余生命判定。核心先归零者败。敌我区分：我方青色边框 + 我字徽标 + 绿色血条，敌方红色边框 + 敌字徽标 + 红色血条。<br/>声明：本游戏全部攻防均为虚构游戏机制，不连接真实目标，不执行真实网络攻击。程序立绘来源见 ASSETS.md。</div></details>
  </div>
  <div class="panel side-panel action-panel"><h3>程序详情</h3><div id="detail"></div>
    <h3>软件模块（库存）</h3><div id="modules"></div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="btnDeploy" class="primary">⬆️ 部署选中程序到空位</button><button id="btnReturn">⬇️ 收回选中程序到待命区</button><button id="btnSell" class="danger">卸载选中程序</button></div>
    <div class="muted" style="margin-top:8px">模块获得：开局各 1 个超频芯片/纳米装甲；每 3 回合补给 1 个（轮换）。每个程序最多 3 个模块。</div>
    <div class="action-col"><button id="btnRefresh" class="refresh-btn">↻<br/>刷新<br/><span>2 算力</span></button><button id="btnBattle" class="battle-btn">▶ 发起入侵<br/><span>开始入侵行动</span></button></div></div>
</div>`;
const $ = (id: string) => document.getElementById(id)!;
function setMsg(t: string) { msg = t; $('msg').textContent = t; }
function findSelected(): { u: OwnedUnit; where: 'board' | 'bench'; idx: number } | null {
  if (!game.selectedUid || !game.selectedWhere) return null;
  const arr = game.selectedWhere === 'board' ? game.board : game.bench;
  const idx = arr.findIndex(u => u?.uid === game.selectedUid);
  return idx >= 0 && arr[idx] ? { u: arr[idx]!, where: game.selectedWhere, idx } : null;
}
function onCellClick(where: 'board' | 'bench', idx: number) {
  if (game.phase === 'battle') return;
  const arr = where === 'board' ? game.board : game.bench;
  const clicked = arr[idx];
  const sel = findSelected();
  if (!sel) { if (clicked) { game.selectedUid = clicked.uid; game.selectedWhere = where; } renderAll(); return; }
  if (sel.u.uid === clicked?.uid) { game.selectedUid = null; game.selectedWhere = null; renderAll(); return; }
  const r = moveUnit(game, sel.where, sel.idx, where, idx);
  // 移动后：若是交换，选中新位置的单位；若是移入空格，选中移过去的单位
  game.selectedUid = sel.u.uid; game.selectedWhere = where; setMsg(r); renderAll();
}
function cellEl(u: OwnedUnit | null, where: 'board' | 'bench', idx: number): HTMLDivElement {
  const d = document.createElement('div');
  const sel = findSelected();
  const isTarget = !u && sel && ((sel.where === 'bench' && where === 'board') || (sel.where === 'board' && where === 'bench'));
  const tracked = !!u && !!trackedTag && getUnit(u.defId).tags.includes(trackedTag as never);
  d.className = 'cell' + (game.selectedUid === u?.uid ? ' selected' : '') + (isTarget ? ' target' : '') + (tracked ? ' tracked' : '');
  if (u) {
    const def = getUnit(u.defId);
    d.innerHTML = `${unitImgTag(def.role, 'unit-img small')}<span class="ic">${def.icon}</span><span>${def.name} ★${u.star}</span><span style="color:${def.color}">${def.cost}费</span>`;
    d.title = `${def.name} ★${u.star}（${def.role}）· 技能「${def.skillName}」：${def.skill.desc}`;
    d.draggable = true;
    d.ondragstart = (e) => { if (game.phase !== 'prep') { e.preventDefault(); return; } dragData = { uid: u.uid, where, idx }; e.dataTransfer?.setData('text/plain', u.uid); d.classList.add('dragging'); $('btnSell').classList.add('sell-ready'); };
    d.ondragend = () => { dragData = null; d.classList.remove('dragging'); $('btnSell').classList.remove('sell-ready', 'drag-over'); };
  }
  else d.innerHTML = isTarget ? '<span style="color:#facc15">▶ 可放这里</span>' : '<span class="muted">空</span>';
  d.tabIndex = 0; d.setAttribute('role', 'button');
  d.setAttribute('aria-label', u ? `${getUnit(u.defId).name} ${u.star}星，${where === 'board' ? '部署区' : '待命区'}第 ${idx + 1} 格` : `${where === 'board' ? '部署区' : '待命区'}空格 ${idx + 1}`);
  d.onclick = () => onCellClick(where, idx);
  d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(where, idx); } };
  d.ondragover = (e) => { if (game.phase === 'prep' && dragData) { e.preventDefault(); d.classList.add('drag-over'); } };
  d.ondragleave = () => d.classList.remove('drag-over');
  d.ondrop = (e) => {
    e.preventDefault(); d.classList.remove('drag-over');
    if (!dragData || game.phase !== 'prep') return;
    const src = dragData; dragData = null;
    const arr = src.where === 'board' ? game.board : game.bench;
    const cur = arr.findIndex(v => v?.uid === src.uid); if (cur < 0) return;
    setMsg(moveUnit(game, src.where, cur, where, idx));
    game.selectedUid = src.uid; game.selectedWhere = where; renderAll();
  };
  return d;
}
function preferredBoardSlot(def: ReturnType<typeof getUnit>): number {
  // 防御放前两排，远程放后两排，其他放中排；返回第一个空位
  const rows = def.role === '防御程序' ? [0, 1, 2, 3] : def.range >= 3 ? [3, 2, 1, 0] : [1, 2, 0, 3];
  for (const r of rows) for (let c = 0; c < 8; c++) { const idx = r * 8 + c; if (!game.board[idx]) return idx; }
  return -1;
}
function deploySelected(): string {
  const sel = findSelected(); if (!sel) return '请先选中一个待命区程序';
  if (sel.where === 'board') return '该程序已在场上';
  const slot = preferredBoardSlot(getUnit(sel.u.defId)); if (slot < 0) return '部署区已满';
  const r = moveUnit(game, 'bench', sel.idx, 'board', slot);
  if (r === '移动完成') { game.selectedUid = sel.u.uid; game.selectedWhere = 'board'; }
  return r;
}
function returnSelected(): string {
  const sel = findSelected(); if (!sel) return '请先选中一个程序';
  if (sel.where === 'bench') return '该程序已在待命区';
  const benchIdx = game.bench.findIndex(v => !v); if (benchIdx < 0) return '待命区已满';
  return moveUnit(game, 'board', sel.idx, 'bench', benchIdx);
}
function autoDeployAll(): string {
  if (game.phase !== 'prep') return '入侵中无法部署';
  const order = [...game.bench].map((u, idx) => ({ u, idx })).filter(e => e.u)
    .sort((a, b) => (getUnit(a.u!.defId).role === '防御程序' ? 0 : 1) - (getUnit(b.u!.defId).role === '防御程序' ? 0 : 1));
  let placed = 0;
  for (const e of order) {
    // 注意：移动后备战区下标会变，重新按 uid 定位
    const cur = game.bench.findIndex(v => v?.uid === e.u!.uid); if (cur < 0) continue;
    const slot = preferredBoardSlot(getUnit(e.u!.defId)); if (slot < 0) break;
    const r = moveUnit(game, 'bench', cur, 'board', slot); if (r === '移动完成') placed++; else break;
  }
  return placed ? `已自动部署 ${placed} 个程序（防御程序在前、远程在后）` : '没有可部署的程序或人口已满';
}
function renderTop() {
  $('pcore').textContent = `${game.playerCore}`; ($('pcoreBar') as HTMLElement).style.width = `${Math.max(0, game.playerCore)}%`;
  $('ecore').textContent = `${game.enemyCore}`; ($('ecoreBar') as HTMLElement).style.width = `${Math.max(0, game.enemyCore)}%`;
  $('round').textContent = `${game.round}`; $('gold').textContent = `${game.gold}`; $('level').textContent = `${game.level}`;
  $('xp').textContent = game.level >= 9 ? 'MAX' : `${game.xp} / ${game.xp + xpToNext(game.level, game.xp)}（还差 ${xpToNext(game.level, game.xp)}）`;
  $('phaseLabel').textContent = game.phase === 'battle' ? '入侵进行中……（自动攻防，由战斗引擎实时计算）' : game.phase === 'gameover' ? '🏁 对局结束' : game.lastResult;
  const stepEl = $('stepHint');
  if (game.phase === 'battle') stepEl.textContent = '入侵进行中：青色是我方，红色是敌方，看血条颜色和左上角的 我 / 敌 徽标就能分清。';
  else if (game.phase === 'gameover') stepEl.textContent = '🏁 对局结束：点右上角「重新开始」再来一局。';
  else if (deployedCount(game) === 0 && benchCount(game) === 0) stepEl.textContent = '① 先在暗网黑市点一张卡招募（点卡就是招募）';
  else if (deployedCount(game) === 0) stepEl.textContent = '② 点待命区一个程序，再点青色部署区里带黄色虚线框的空格；或者点右侧「部署选中程序到空位」，也可以点「一键部署全部」。';
  else if (benchCount(game) > 0 && deployedCount(game) < game.level) stepEl.textContent = '③ 还可以继续部署（人口未满），或者直接点「发起入侵」。';
  else stepEl.textContent = '④ 点右侧「发起入侵」开打。';
  $('msg').textContent = msg;
  ($('btnBattle') as HTMLButtonElement).disabled = game.phase !== 'prep' || deployedCount(game) === 0;
  ($('btnRefresh') as HTMLButtonElement).disabled = game.phase !== 'prep' || game.gold < 2;
  ($('btnXp') as HTMLButtonElement).disabled = game.phase !== 'prep' || game.level >= 9 || game.gold < 4;
  $('xpHint').textContent = game.level >= 9 ? '已满级' : `下一级还差 ${xpToNext(game.level, game.xp)} 经验`;
  $('pop').textContent = `${deployedCount(game)} / ${game.level}`;
}
function synergyTierHtml(s: ReturnType<typeof synergyOf>[number]): string {
  const def = SYNERGIES.find(x => x.tag === s.tag)!;
  return `<div class="syn-base">${def.desc}</div>` + def.levels.map((l, i) =>
    `<div class="syn-tier ${s.level > i ? 'on' : s.level === i ? 'next' : ''}">${l.count}个：${l.desc}</div>`).join('');
}
function renderLeft() {
  const synEl = $('synergies'); synEl.innerHTML = '';
  for (const s of synergyOf(game)) {
    const b = document.createElement('button');
    b.className = 'syn' + (s.active ? ' active' : '') + (trackedTag === s.tag ? ' tracked' : '');
    b.setAttribute('aria-pressed', trackedTag === s.tag ? 'true' : 'false');
    b.title = trackedTag === s.tag ? '已追踪该协议，再点取消' : '点此追踪该协议，高亮商店与场上同协议程序';
    b.innerHTML = `<span class="tag">◆ ${s.tag}</span> ${s.count}个 · ${s.active ? `Lv${s.level} 已激活` : `未激活，还需 ${SYNERGIES.find(x => x.tag === s.tag)!.levels[0].count - s.count}个`}${synergyTierHtml(s)}`;
    b.onclick = () => { trackedTag = trackedTag === s.tag ? null : s.tag; setMsg(trackedTag ? `已追踪协议「${trackedTag}」` : '已取消协议追踪'); renderAll(); };
    synEl.appendChild(b);
  }
  $('stats').innerHTML = `胜 ${game.stats.wins} · 负 ${game.stats.losses} · 累计击破 ${game.stats.kills} · 累计伤害 ${Math.round(game.stats.damage)}<br/>连胜 ${game.winStreak}`;
}
function protocolHtml(def: ReturnType<typeof getUnit>): string {
  const states = synergyOf(game);
  return def.tags.map(tag => {
    const st = states.find(s => s.tag === tag)!;
    const sy = SYNERGIES.find(x => x.tag === tag)!;
    const tiers = sy.levels.map((l, i) => `<span class="${st.level > i ? 'tier-on' : ''}">${l.count}个 ${l.desc}</span>`).join('；');
    return `<div class="proto-line">◆ ${tag}：当前 ${st.count}个 · ${st.active ? `Lv${st.level} 已激活` : '未激活'}（${tiers}）</div>`;
  }).join('');
}
function previewHtml(def: ReturnType<typeof getUnit>): string {
  return `<div>${unitImgTag(def.role, 'unit-img big')}<span style="font-size:22px">${def.icon} <b>${def.name}</b> ★1 · ${def.cost}费</span></div>
  <div><span class="tagchip">${def.role}</span>${def.tags.map((t: string) => `<span class="tagchip">${t}</span>`).join('')}</div>
  <div style="margin-top:6px;font-size:13px;line-height:1.7">生命 ${def.hp} · 攻击 ${def.atk} · 攻速 ${def.aspd}/秒 · 射程 ${def.range} 格 · 护甲 ${def.armor}<br/>技能「${def.skillName}」：${def.skill.desc}<br/>${protocolHtml(def)}<br/><span class="muted">悬停预览（未选中），点商店卡即招募</span></div>`;
}
function renderRight() {
  const sel = findSelected(); const detail = $('detail');
  if (!sel && previewDef) { detail.innerHTML = previewHtml(previewDef); }
  else if (!sel) { detail.innerHTML = '<div class="muted">点击待命区或部署区的一个程序查看详情；把鼠标移到商店卡上可预览。</div>'; }
  else {
    const def = getUnit(sel.u.defId); const m = starMultiplier(sel.u.star);
    detail.innerHTML = `<div>${unitImgTag(def.role, 'unit-img big')}<span style="font-size:28px">${def.icon} <b>${def.name}</b> ★${sel.u.star} · ${def.cost}费</span></div>
    <div><span class="tagchip">${def.role}</span>${def.tags.map((t: string) => `<span class="tagchip">${t}</span>`).join('')}</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.7">生命 ${Math.round(def.hp * m)} · 攻击 ${Math.round(def.atk * m)} · 攻速 ${def.aspd}/秒 · 射程 ${def.range} 格 · 护甲 ${def.armor}<br/>
    技能「${def.skillName}」：${def.skill.desc}<br/>${protocolHtml(def)}<br/>模块：${sel.u.items.length ? sel.u.items.map(i => MODULES.find(x => x.id === i)?.name).join('、') : '无'}<br/>卸载回收：${sellPrice(def, sel.u.star)} 算力</div>`;
  }
  $('modules').innerHTML = MODULES.map(md => `<button data-m="${md.id}" style="margin:2px">${md.icon} ${md.name}（${game.modules[md.id] ?? 0}）<br/><span class="muted">${md.desc}</span></button>`).join('');
  $('modules').querySelectorAll('button').forEach(b => b.onclick = () => { setMsg(equipModule(game, b.dataset.m!)); renderAll(); });
}
function renderShopBench() {
  const shopEl = $('shop'); shopEl.innerHTML = '';
  game.shop.forEach((def, i) => {
    const c = document.createElement('button');
    c.className = `card cost${def.cost}` + (trackedTag && def.tags.includes(trackedTag as never) ? ' tracked' : '');
    c.title = `技能「${def.skillName}」：${def.skill.desc}`;
    c.innerHTML = `<div class="card-head">${unitImgTag(def.role, 'unit-img')}<span class="ic">${def.icon}</span><span class="card-name"><b>${def.name}</b><span class="card-role">${def.role} · ★1</span></span><span class="cost">${def.cost} 算力</span></div><div class="card-tags">${def.tags.map(t => `<span class="tagchip">${t}</span>`).join('')}</div><div class="card-stats"><span>生命 ${def.hp}</span><span>攻击 ${def.atk}</span><span>技能 ${def.skillName}</span></div>`;
    c.onmouseenter = () => { previewDef = def; renderRight(); };
    c.onmouseleave = () => { previewDef = null; renderRight(); };
    c.onclick = () => {
      if (game.phase !== 'prep') return;
      const beforeEmpty = game.bench.findIndex(v => !v);
      setMsg(buyUnit(game, i)); renderAll();
      if (beforeEmpty >= 0) { const cell = document.querySelectorAll('#bench .cell')[beforeEmpty] as HTMLElement | undefined; cell?.classList.add('pop'); setTimeout(() => cell?.classList.remove('pop'), 450); }
    };
    shopEl.appendChild(c);
  });
  if (!game.shop.length) shopEl.innerHTML = '<div class="muted">商店已空，请刷新或进入下一回合。</div>';
  const odds = shopOdds(game.level); const colors = ['#9ca3af', '#22c55e', '#38bdf8', '#a78bfa', '#facc15'];
  $('oddsBar').innerHTML = odds.map((p, i) => p > 0 ? `<span class="odds-seg" style="flex:${p};background:${colors[i]}" title="${i + 1}费概率 ${Math.round(p * 100)}%">${Math.round(p * 100) >= 10 ? `${i + 1}费 ${Math.round(p * 100)}%` : ''}</span>` : '').join('');
  const lockBtn = $('btnLock') as HTMLButtonElement;
  lockBtn.textContent = game.shopLocked ? '🔒 商店已锁定' : '🔓 锁定商店';
  lockBtn.classList.toggle('active', game.shopLocked);
  lockBtn.setAttribute('aria-pressed', game.shopLocked ? 'true' : 'false');
  const benchEl = $('bench'); benchEl.innerHTML = '';
  game.bench.forEach((u, i) => benchEl.appendChild(cellEl(u, 'bench', i)));
}
function renderBoards() {
  const pg = $('playerGrid'); pg.innerHTML = '';
  game.board.forEach((u, i) => pg.appendChild(cellEl(u, 'board', i)));
  const arena = $('arena'); const playerArea = $('playerArea');
  const shopSection = $('shopSection'); const benchSection = $('benchSection');
  if (game.phase === 'battle') { arena.style.display = 'block'; playerArea.style.display = 'none'; shopSection.style.display = 'none'; benchSection.style.display = 'none'; }
  else { arena.style.display = 'none'; playerArea.style.display = 'flex'; shopSection.style.display = 'block'; benchSection.style.display = 'block'; }
}
function renderAll() { renderTop(); renderLeft(); renderRight(); renderShopBench(); renderBoards(); }
const FX_COLOR: Record<string, string> = { burst: '#fda4af', aoe: '#fb923c', heal: '#4ade80', shield: '#22d3ee', stun: '#facc15', buff: '#fbbf24', dot: '#c084fc', chaos: '#e879f9' };
function spawnSkillFx(ev: NonNullable<Battle['events'][number]>) {
  if (!battle || !ev.casterUid) return;
  const layer = $('fxLayer'); const arena = $('arena');
  const caster = battle.units.find(u => u.uid === ev.casterUid);
  const targets = (ev.targetUids ?? []).map(id => battle!.units.find(u => u.uid === id)).filter((u): u is NonNullable<typeof u> => !!u && !u.dead);
  const anchor = targets[0] ?? caster; if (!anchor) return;
  const skillName = (ev.text.match(/「(.+)」/) ?? [])[1] ?? '技能';
  const color = FX_COLOR[ev.skillKind ?? ''] ?? '#67e8f9';
  const fx = document.createElement('div');
  fx.className = `fx fx-${ev.skillKind ?? 'skill'}`;
  fx.style.left = `${(anchor.x / 8) * 100}%`; fx.style.top = `${(anchor.y / 8) * 100}%`; fx.style.color = color;
  fx.innerHTML = `<span class="fx-ring" style="border-color:${color}"></span><span class="fx-label">${caster?.icon ?? ''} ${skillName}</span>`;
  layer.appendChild(fx); fxCount++; arena.dataset.fxCount = String(fxCount);
  $('lastSkill').textContent = `✦ ${caster?.name ?? ''} · ${skillName}`;
  setTimeout(() => fx.remove(), 950);
}
function renderBattleTokens() {
  if (!battle) return;
  const box = $('tokens'); box.innerHTML = '';
  for (const u of battle.units) {
    if (u.dead) continue;
    const d = document.createElement('div'); d.className = `token ${u.side}` + (u.energy >= 95 ? ' charged' : '');
    d.style.left = `${(u.x / 8) * 100}%`; d.style.top = `${(u.y / 8) * 100}%`;
    // 敌我区分不再只靠边框颜色：徽标 + 血条颜色 + 底色都不同
    const badge = u.side === 'player' ? '我' : '敌';
    const shieldBar = u.shield > 0 ? `<div class="hp sh"><i style="width:${Math.min(100, (u.shield / u.maxHp) * 100)}%"></i></div>` : '';
    d.innerHTML = `<span class="side-badge">${badge}</span>${unitImgTag(u.role, 'unit-img small')}<div class="ic">${u.icon}</div><div class="nm">${u.name} ★${u.star}</div><div class="hp"><i style="width:${u.hpPct * 100}%"></i></div>${shieldBar}<div class="en"><i style="width:${u.energy}%"></i></div>`;
    box.appendChild(d);
  }
  const newEvents = battle.events.slice(lastEventIdx); lastEventIdx = battle.events.length;
  for (const e of newEvents) if (e.kind === 'skill') spawnSkillFx(e);
  $('phaseLabel').textContent = `入侵进行中 ${battle.time.toFixed(1)}s · 我方存活 ${battle.alive('player').length} · 敌方存活 ${battle.alive('enemy').length}`;
}
function endBattle() {
  if (!battle) return; const b = battle; battle = null;
  if (battleTimer) { clearInterval(battleTimer); battleTimer = null; }
  const won = b.winner === 'player' || b.winner === 'draw';
  const survivors = won ? b.alive('player').length : b.alive('enemy').length;
  const dmg = 3 + survivors;
  const pKills = b.units.filter(u => u.side === 'player').reduce((s, u) => s + u.kills, 0);
  const pDmg = b.units.filter(u => u.side === 'player').reduce((s, u) => s + u.damageDealt, 0);
  game.stats.kills += pKills; game.stats.damage += pDmg;
  if (won) { game.stats.wins++; game.winStreak++; game.enemyCore = Math.max(0, game.enemyCore - dmg); game.lastResult = `✅ 第 ${game.round} 回合获胜！对敌方核心造成 ${dmg} 点伤害（3 + ${survivors} 存活程序）。`; }
  else { game.stats.losses++; game.winStreak = 0; game.playerCore = Math.max(0, game.playerCore - dmg); game.lastResult = `❌ 第 ${game.round} 回合失败！我方核心受到 ${dmg} 点伤害（3 + ${survivors} 存活程序）。`; }
  addLog(game, game.lastResult);
  for (const e of b.events.slice(-12)) addLog(game, e.text);
  if (game.playerCore <= 0) { game.phase = 'gameover'; game.lastResult = '🏁 对局结束：你的核心已被击破。点击「重新开始」再来一局。'; }
  else if (game.enemyCore <= 0) { game.phase = 'gameover'; game.lastResult = '🏆 对局结束：你击破了敌方核心，赢得黑客世界！点击「重新开始」再来一局。'; }
  else { applyRoundIncome(game, won); startNextRound(game); game.phase = 'prep'; }
  saveGame(game); renderAll();
}
function startBattle() {
  if (game.phase !== 'prep' || deployedCount(game) === 0) { setMsg('请先部署至少 1 个程序'); return; }
  const aiTeam = buildAiTeam(game.round, Math.random);
  const aiPlaced = placeAiTeam(aiTeam);
  const playerInputs: BattleInputUnit[] = []; const enemyInputs: BattleInputUnit[] = [];
  game.board.forEach((u, i) => { if (u) playerInputs.push({ unit: u, x: (i % BOARD_W) + 0.5, y: 4 + Math.floor(i / BOARD_W) + 0.5, side: 'player' }); });
  aiPlaced.forEach(p => enemyInputs.push({ unit: p.unit, x: p.x + 0.5, y: p.y + 0.5, side: 'enemy' }));
  battle = new Battle(playerInputs, enemyInputs, Math.random); lastEventIdx = 0; fxCount = 0; $('lastSkill').textContent = '';
  game.phase = 'battle'; addLog(game, `第 ${game.round} 回合入侵开始：敌方部署 ${aiTeam.length} 程序`);
  renderAll(); renderBattleTokens(); startBattleTimer();
}
function startBattleTimer() {
  if (battleTimer) clearInterval(battleTimer);
  battleTimer = setInterval(() => {
    if (!battle) return; battle.step(0.1); renderBattleTokens();
    if (battle.winner) { const final = battle; battle = null; if (battleTimer) clearInterval(battleTimer); battleTimer = null; battle = final; endBattle(); }
  }, 100 / battleSpeed);
}
$('btnBattle').onclick = startBattle;
$('btnSpeed').onclick = () => { battleSpeed = battleSpeed === 1 ? 2 : 1; ($('btnSpeed') as HTMLButtonElement).textContent = `⏩ 速度 ${battleSpeed}×`; if (battle) startBattleTimer(); };
$('btnLock').onclick = () => { setMsg(toggleShopLock(game)); renderAll(); };
$('btnRefresh').onclick = () => {
  if (!refreshShop(game)) { setMsg('算力不足，刷新需要 2'); }
  else { setMsg('商店已刷新（-2 算力）'); renderAll(); const shopEl = $('shop'); shopEl.classList.add('refreshing'); setTimeout(() => shopEl.classList.remove('refreshing'), 400); return; }
  renderAll();
};
$('btnXp').onclick = () => { setMsg(buyXp(game)); renderAll(); };
$('btnSell').onclick = () => { setMsg(sellUnit(game)); renderAll(); };
$('btnSell').ondragover = (e) => { if (dragData) { e.preventDefault(); ($('btnSell') as HTMLElement).classList.add('drag-over'); } };
$('btnSell').ondragleave = () => ($('btnSell') as HTMLElement).classList.remove('drag-over');
$('btnSell').ondrop = (e) => {
  e.preventDefault(); ($('btnSell') as HTMLElement).classList.remove('drag-over', 'sell-ready');
  if (!dragData) return; const src = dragData; dragData = null;
  game.selectedUid = src.uid; game.selectedWhere = src.where; setMsg(sellUnit(game)); renderAll();
};
$('btnDeploy').onclick = () => { setMsg(deploySelected()); renderAll(); };
$('btnReturn').onclick = () => { setMsg(returnSelected()); renderAll(); };
$('btnAutoDeploy').onclick = () => { setMsg(autoDeployAll()); renderAll(); };
$('btnSave').onclick = () => { setMsg(saveGame(game) ? '已保存到本地存档' : '保存失败（浏览器存储不可用）'); renderAll(); };
$('btnLoad').onclick = () => { const loaded = loadGame(); if (loaded) { game = loaded; setMsg('已读取存档'); } else setMsg('没有找到存档，请先保存'); renderAll(); };
$('btnRestart').onclick = () => { if (battleTimer) clearInterval(battleTimer); battle = null; game = createGame(Date.now() % 100000); setMsg('已重新开始一局'); renderAll(); };
renderAll();
