// Local headless-Chrome real-browser test for Hacker World (same VM, so 127.0.0.1:5173 is reachable).
// Usage: chrome must already be running with --remote-debugging-port=9223
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
      const tab = tabs.find(t => t.url.includes('dist-single')) || tabs[0];
      if (tab?.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('no debug tab');
}
let seq = 0; const pending = new Map();
const ws = new WebSocket(await getWs());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { resolve } = pending.get(d.id); pending.delete(d.id); resolve(d); } };
function send(method, params = {}) {
  const id = ++seq; ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result?.result?.value;
}
await send('Runtime.enable'); await send('Page.enable');
const log = (...a) => console.log('[browser-test]', ...a);
await sleep(1500);
log('title/text has game:', await ev(`document.body.innerText.includes('黑客世界')`));
await ev(`document.getElementById('btnRestart').click()`); await sleep(500);
log('initial gold:', await ev(`document.getElementById('gold').textContent`));
log('initial round:', await ev(`document.getElementById('round').textContent`));
log('shop cards:', await ev(`document.querySelectorAll('.shop .card').length`));
await ev(`document.querySelector('.shop .card').click()`); await sleep(500);
log('after buy gold:', await ev(`document.getElementById('gold').textContent`));
log('bench units:', await ev(`[...document.querySelectorAll('#bench .cell')].filter(c=>!c.innerText.includes('空')).length`));
// 选中备战区第一个非空单位（点一次即选中，点第二次会取消选中）
await ev(`[...document.querySelectorAll('#bench .cell')].find(c=>!c.innerText.includes('空')).click()`); await sleep(300);
await ev(`document.querySelectorAll('#playerGrid .cell')[0].click()`); await sleep(500);
log('pop after deploy:', await ev(`document.getElementById('pop').textContent`));
log('battle button disabled?', await ev(`document.getElementById('btnBattle').disabled`));
await ev(`document.getElementById('btnBattle').click()`);
let round = '1', phase = '';
for (let i = 0; i < 75; i++) {
  await sleep(1000);
  round = await ev(`document.getElementById('round').textContent`);
  phase = await ev(`document.getElementById('phaseLabel').textContent`);
  if (round !== '1') break;
  if (i % 10 === 0) log(`battle wait ${i}s phase:`, phase);
}
log('after battle round:', round);
log('after battle phase:', phase);
log('player core:', await ev(`document.getElementById('pcore').textContent`), 'enemy core:', await ev(`document.getElementById('ecore').textContent`));
log('gold after battle:', await ev(`document.getElementById('gold').textContent`));
log('stats:', await ev(`document.getElementById('stats').innerText`));
await ev(`document.getElementById('btnSave').click()`); await sleep(300);
log('msg after save:', await ev(`document.getElementById('msg').textContent`));
await ev(`document.getElementById('btnRestart').click()`); await sleep(500);
log('after restart round:', await ev(`document.getElementById('round').textContent`), 'gold:', await ev(`document.getElementById('gold').textContent`));
log('DONE');
ws.close(); process.exit(0);
