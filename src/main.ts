import { createGame, loadGame, saveGame, refreshShop, buyUnit, sellUnit, moveUnit, buyXp, equipModule, deployedUnits, deployedCount, synergyOf, applyRoundIncome, startNextRound, addLog, type GameState } from './game/state';
import { getUnit, MODULES } from './game/units';
import { starMultiplier, sellPrice, BOARD_W } from './game/types';
import { xpToNext } from './game/shop';
import { Battle, type BattleInputUnit } from './game/engine';
import { buildAiTeam, placeAiTeam } from './game/ai';
import type { OwnedUnit } from './game/types';

let game: GameState = createGame(20261025);
let battle: Battle | null = null;
let battleTimer: ReturnType<typeof setInterval> | null = null;
let lastEventIdx = 0;
let msg = '';

const app = document.getElementById('app')!;
app.innerHTML = `
<div class="topbar">
  <h1>黑客世界 <span>HACKER WORLD</span></h1>
  <div class="stat">玩家核心 <span class="corebar"><i id="pcoreBar"></i></span> <b id="pcore"></b></div>
  <div class="stat">AI 核心 <span class="corebar"><i id="ecoreBar"></i></span> <b id="ecore"></b></div>
  <div class="stat">回合 <b id="round"></b></div>
  <div class="stat">算力 💰 <b id="gold"></b></div>
  <div class="stat">等级 <b id="level"></b>（经验 <span id="xp"></span>）</div>
  <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
    <button id="btnBattle" class="primary">▶ 开始战斗</button>
    <button id="btnSave">💾 保存</button><button id="btnLoad">📂 读取</button><button id="btnRestart" class="danger">↻ 重新开始</button>
  </div>
</div>
<div class="notice" id="msg"></div>
<div class="layout">
  <div class="panel"><h3>🧬 协议羁绊（按部署动态计算）</h3><div id="synergies"></div>
    <h3>📊 战斗统计</h3><div id="stats" class="muted"></div>
    <h3>🖥️ 终端日志</h3><div class="log" id="log"></div></div>
  <div class="panel"><h3>🌐 中央网络战场</h3><div id="phaseLabel" class="notice"></div>
    <div id="enemyArea"><div class="muted">上方为 AI 网络区域：战斗开始时 AI 会按回合强度自动生成并部署阵容（防御节点前排、输出后排），不是预设动画。</div><div class="grid" id="enemyGrid"></div></div>
    <div class="arena" id="arena" style="display:none"><div class="mid"></div><div id="tokens"></div></div>
    <div style="margin-top:8px"><div class="muted">下方为你的部署区（8×4，前排贴近敌方）。已部署 <span id="pop"></span></div><div class="grid" id="playerGrid"></div></div>
    <h3>⚔️ 战斗事件</h3><div class="log" id="battleLog" style="height:130px"></div></div>
  <div class="panel"><h3>🔍 单位详情</h3><div id="detail"></div>
    <h3>🧩 软件模块（库存）</h3><div id="modules"></div>
    <div style="display:flex;gap:6px;margin-top:8px"><button id="btnSell" class="danger">出售选中单位</button></div>
    <div class="muted" style="margin-top:8px">模块获得：开局各 1 个超频芯片/纳米装甲；每 3 回合补给 1 个（轮换）。每个单位最多 3 个模块。</div></div>
</div>
<div class="panel" style="margin-top:10px"><h3>🛒 黑市商店 <span class="muted">刷新 2 算力 · 买走的格子在刷新/下一回合前保持为空 · 利息：每 10 算力 +1，上限 5</span></h3>
  <div style="display:flex;gap:6px"><button id="btnRefresh">🔄 刷新商店（2）</button><button id="btnXp">⬆️ 购买经验（4 算力 = +4 经验）</button><span class="muted" id="xpHint"></span></div>
  <div class="shop" id="shop"></div>
  <h3 style="margin-top:10px">📦 备战区（9 格，点击单位选中，再点击部署区空格部署）</h3><div class="bench" id="bench"></div>
  <div class="muted" style="margin-top:10px">玩法：点击商店卡片购买 → 点击备战区单位，再点击部署区空格部署 → 点击「开始战斗」自动攻防。选中单位后点击另一格可交换位置。相同单位同星满 3 张自动合成高一星（属性 ×1.8 / ×2.9）。人口 = 等级，上限 9。胜负伤害 = 3 + 存活单位数。战斗超时 60 秒按剩余生命判定。核心先归零者败。<br/>声明：本游戏全部攻防均为虚构游戏机制，不连接真实目标，不执行真实网络攻击。</div>
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
  const d = document.createElement('div'); d.className = 'cell' + (game.selectedUid === u?.uid ? ' selected' : '');
  if (u) { const def = getUnit(u.defId); d.innerHTML = `<span class="ic">${def.icon}</span><span>${def.name} ★${u.star}</span><span style="color:${def.color}">${def.cost}费</span>`; d.title = `${def.name} ★${u.star}`; }
  else d.innerHTML = '<span class="muted">空</span>';
  d.onclick = () => onCellClick(where, idx); return d;
}
function renderTop() {
  $('pcore').textContent = `${game.playerCore}`; ($('pcoreBar') as HTMLElement).style.width = `${Math.max(0, game.playerCore)}%`;
  $('ecore').textContent = `${game.enemyCore}`; ($('ecoreBar') as HTMLElement).style.width = `${Math.max(0, game.enemyCore)}%`;
  $('round').textContent = `${game.round}`; $('gold').textContent = `${game.gold}`; $('level').textContent = `${game.level}`;
  $('xp').textContent = game.level >= 9 ? 'MAX' : `${game.xp} / ${game.xp + xpToNext(game.level, game.xp)}（还差 ${xpToNext(game.level, game.xp)}）`;
  $('phaseLabel').textContent = game.phase === 'battle' ? '⚔️ 战斗进行中……（自动攻防，由战斗引擎实时计算）' : game.phase === 'gameover' ? '🏁 对局结束' : game.lastResult;
  $('msg').textContent = msg;
  ($('btnBattle') as HTMLButtonElement).disabled = game.phase !== 'prep' || deployedCount(game) === 0;
  ($('btnRefresh') as HTMLButtonElement).disabled = game.phase !== 'prep' || game.gold < 2;
  ($('btnXp') as HTMLButtonElement).disabled = game.phase !== 'prep' || game.level >= 9 || game.gold < 4;
  $('xpHint').textContent = game.level >= 9 ? '已满级' : `下一级还差 ${xpToNext(game.level, game.xp)} 经验`;
  $('pop').textContent = `${deployedCount(game)} / ${game.level}`;
}
function renderLeft() {
  $('synergies').innerHTML = synergyOf(game).map(s => `<div class="syn ${s.active ? 'active' : ''}"><span class="tag">${s.tag}</span> ${s.count} 个 · ${s.active ? `Lv${s.level} 已激活：${s.desc}` : s.desc}</div>`).join('');
  $('stats').innerHTML = `胜 ${game.stats.wins} · 负 ${game.stats.losses} · 累计击杀 ${game.stats.kills} · 累计伤害 ${Math.round(game.stats.damage)}<br/>连胜 ${game.winStreak}`;
  $('log').textContent = game.log.join('\n');
}
function renderRight() {
  const sel = findSelected(); const detail = $('detail');
  if (!sel) { detail.innerHTML = '<div class="muted">点击备战区或部署区的一个单位查看详情。</div>'; }
  else {
    const def = getUnit(sel.u.defId); const m = starMultiplier(sel.u.star);
    detail.innerHTML = `<div style="font-size:28px">${def.icon} <b>${def.name}</b> ★${sel.u.star} · ${def.cost}费</div>
    <div><span class="tagchip">${def.role}</span>${def.tags.map((t: string) => `<span class="tagchip">${t}</span>`).join('')}</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.7">生命 ${Math.round(def.hp * m)} · 攻击 ${Math.round(def.atk * m)} · 攻速 ${def.aspd}/秒 · 射程 ${def.range} 格 · 护甲 ${def.armor}<br/>
    技能「${def.skillName}」：${def.skill.desc}<br/>装备：${sel.u.items.length ? sel.u.items.map(i => MODULES.find(x => x.id === i)?.name).join('、') : '无'}<br/>出售价：${sellPrice(def, sel.u.star)} 算力</div>`;
  }
  $('modules').innerHTML = MODULES.map(md => `<button data-m="${md.id}" style="margin:2px">${md.icon} ${md.name}（${game.modules[md.id] ?? 0}）<br/><span class="muted">${md.desc}</span></button>`).join('');
  $('modules').querySelectorAll('button').forEach(b => b.onclick = () => { setMsg(equipModule(game, b.dataset.m!)); renderAll(); });
}
function renderShopBench() {
  const shopEl = $('shop'); shopEl.innerHTML = '';
  game.shop.forEach((def, i) => {
    const c = document.createElement('button'); c.className = 'card';
    c.innerHTML = `<span class="ic">${def.icon}</span> <b>${def.name}</b> ★1<br/><span class="cost">${def.cost} 算力</span> · ${def.role}<br/><span class="muted">生命${def.hp} 攻击${def.atk} 攻速${def.aspd} 射程${def.range}</span><br/><span class="muted">技能：${def.skillName}</span><br/>${def.tags.map(t => `<span class="tagchip">${t}</span>`).join('')}`;
    c.onclick = () => { if (game.phase !== 'prep') return; setMsg(buyUnit(game, i)); renderAll(); }; shopEl.appendChild(c);
  });
  if (!game.shop.length) shopEl.innerHTML = '<div class="muted">商店已空，请刷新或进入下一回合。</div>';
  const benchEl = $('bench'); benchEl.innerHTML = '';
  game.bench.forEach((u, i) => benchEl.appendChild(cellEl(u, 'bench', i)));
}
function renderBoards() {
  const eg = $('enemyGrid'); eg.innerHTML = '';
  for (let i = 0; i < 32; i++) { const c = document.createElement('div'); c.className = 'cell'; c.innerHTML = '<span class="muted">AI</span>'; eg.appendChild(c); }
  const pg = $('playerGrid'); pg.innerHTML = '';
  game.board.forEach((u, i) => pg.appendChild(cellEl(u, 'board', i)));
  const arena = $('arena'); const enemyArea = $('enemyArea');
  if (game.phase === 'battle') { arena.style.display = 'block'; enemyArea.style.display = 'none'; pg.style.display = 'none'; }
  else { arena.style.display = 'none'; enemyArea.style.display = 'block'; pg.style.display = 'grid'; }
}
function renderAll() { renderTop(); renderLeft(); renderRight(); renderShopBench(); renderBoards(); }
function renderBattleTokens() {
  if (!battle) return;
  const box = $('tokens'); box.innerHTML = '';
  for (const u of battle.units) {
    if (u.dead) continue;
    const d = document.createElement('div'); d.className = `token ${u.side}`;
    d.style.left = `${(u.x / 8) * 100}%`; d.style.top = `${(u.y / 8) * 100}%`; d.style.borderColor = u.color;
    const shieldBar = u.shield > 0 ? `<div class="hp sh"><i style="width:${Math.min(100, (u.shield / u.maxHp) * 100)}%"></i></div>` : '';
    d.innerHTML = `<div class="ic">${u.icon}</div><div class="nm">${u.name} ★${u.star}</div><div class="hp"><i style="width:${u.hpPct * 100}%"></i></div>${shieldBar}<div class="en"><i style="width:${u.energy}%"></i></div>`;
    box.appendChild(d);
  }
  const bl = $('battleLog'); const newEvents = battle.events.slice(lastEventIdx); lastEventIdx = battle.events.length;
  if (newEvents.length) bl.textContent = [...newEvents].reverse().map(e => `[${e.t.toFixed(1)}s] ${e.text}`).join('\n') + '\n' + bl.textContent;
  $('phaseLabel').textContent = `⚔️ 战斗进行中 ${battle.time.toFixed(1)}s · 玩家存活 ${battle.alive('player').length} · AI 存活 ${battle.alive('enemy').length}`;
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
  if (won) { game.stats.wins++; game.winStreak++; game.enemyCore = Math.max(0, game.enemyCore - dmg); game.lastResult = `✅ 第 ${game.round} 回合获胜！对 AI 核心造成 ${dmg} 点伤害（3 + ${survivors} 存活单位）。`; }
  else { game.stats.losses++; game.winStreak = 0; game.playerCore = Math.max(0, game.playerCore - dmg); game.lastResult = `❌ 第 ${game.round} 回合失败！你的核心受到 ${dmg} 点伤害（3 + ${survivors} 存活单位）。`; }
  addLog(game, game.lastResult);
  for (const e of b.events.slice(-12)) addLog(game, e.text);
  if (game.playerCore <= 0) { game.phase = 'gameover'; game.lastResult = '🏁 对局结束：你的核心已被击破。点击「重新开始」再来一局。'; }
  else if (game.enemyCore <= 0) { game.phase = 'gameover'; game.lastResult = '🏆 对局结束：你击破了 AI 核心，赢得黑客世界！点击「重新开始」再来一局。'; }
  else { applyRoundIncome(game, won); startNextRound(game); game.phase = 'prep'; }
  saveGame(game); renderAll();
}
function startBattle() {
  if (game.phase !== 'prep' || deployedCount(game) === 0) { setMsg('请先部署至少 1 个单位'); return; }
  const aiTeam = buildAiTeam(game.round, Math.random);
  const aiPlaced = placeAiTeam(aiTeam);
  const playerInputs: BattleInputUnit[] = []; const enemyInputs: BattleInputUnit[] = [];
  game.board.forEach((u, i) => { if (u) playerInputs.push({ unit: u, x: (i % BOARD_W) + 0.5, y: 4 + Math.floor(i / BOARD_W) + 0.5, side: 'player' }); });
  aiPlaced.forEach(p => enemyInputs.push({ unit: p.unit, x: p.x + 0.5, y: p.y + 0.5, side: 'enemy' }));
  battle = new Battle(playerInputs, enemyInputs, Math.random); lastEventIdx = 0; $('battleLog').textContent = '';
  game.phase = 'battle'; addLog(game, `第 ${game.round} 回合战斗开始：AI 部署 ${aiTeam.length} 单位`);
  renderAll(); renderBattleTokens();
  battleTimer = setInterval(() => {
    if (!battle) return; battle.step(0.1); renderBattleTokens();
    if (battle.winner) { const final = battle; battle = null; if (battleTimer) clearInterval(battleTimer); battleTimer = null; battle = final; endBattle(); }
  }, 100);
}
$('btnBattle').onclick = startBattle;
$('btnRefresh').onclick = () => { if (!refreshShop(game)) setMsg('算力不足，刷新需要 2'); else setMsg('商店已刷新（-2 算力）'); renderAll(); };
$('btnXp').onclick = () => { setMsg(buyXp(game)); renderAll(); };
$('btnSell').onclick = () => { setMsg(sellUnit(game)); renderAll(); };
$('btnSave').onclick = () => { setMsg(saveGame(game) ? '已保存到本地存档' : '保存失败（浏览器存储不可用）'); renderAll(); };
$('btnLoad').onclick = () => { const loaded = loadGame(); if (loaded) { game = loaded; setMsg('已读取存档'); } else setMsg('没有找到存档，请先保存'); renderAll(); };
$('btnRestart').onclick = () => { if (battleTimer) clearInterval(battleTimer); battle = null; game = createGame(Date.now() % 100000); setMsg('已重新开始一局'); renderAll(); };
renderAll();
