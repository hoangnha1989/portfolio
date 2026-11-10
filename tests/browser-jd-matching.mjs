// Kiểm JD + Matching trên Chrome headless thật (CDP, không cần thư viện): lỗi JS, 3 ngôn ngữ, mobile, in A4.
// Chạy: node tests/browser-jd-matching.mjs   (thoát 0 = đạt). CHROME=<đường dẫn> để đổi trình duyệt.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CANDIDATES = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chromePath = CANDIDATES.find((p) => existsSync(p));
if (!chromePath) { console.error('FAIL: không tìm thấy Chrome (đặt biến CHROME)'); process.exit(1); }
const pageUrl = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
const dir = mkdtempSync(join(tmpdir(), 'jdm-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function main() {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    try { port = readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch {}
  }
  if (!port) throw new Error('Chrome không mở cổng debug');
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const errors = []; let loaded = null;
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Page.loadEventFired' && loaded) loaded();
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const go = async (url, w = 1280, media = '') => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    await send('Emulation.setEmulatedMedia', { media });
    await send('Page.navigate', { url: 'about:blank' }); await sleep(150);
    const p = new Promise((r) => { loaded = r; });
    await send('Page.navigate', { url }); await p; await sleep(400);
  };

  const EXPECT = {
    ja: { jd: '代表代行・経営責任者候補', match: '主要6スキル', radar: '経営・事業計画', exp: '報連相' },
    en: { jd: 'Acting Representative', match: '6 core skills', radar: 'Business planning', exp: 'Horenso' },
    vi: { jd: 'Người đại diện tạm quyền', match: '6 kỹ năng chính', radar: 'Kế hoạch kinh doanh', exp: 'Horenso' },
  };
  // Kiểm hiển thị: chỉ khối đúng ngôn ngữ được thấy, view đúng, chuỗi đặc trưng có mặt
  const probe = (view, lang) => `(() => {
    const main = document.querySelector('main[data-view="${view}"]');
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
    const wrong = [...document.querySelectorAll('[data-l]')].filter((e) => e.dataset.l !== '${lang}' && vis(e)).length;
    const right = [...main.querySelectorAll('[data-l="${lang}"]')].filter(vis).length;
    const navRight = [...document.querySelectorAll('.sb-nav[data-for="${view}"] [data-l="${lang}"]')].length;
    return { view: document.body.dataset.view, hidden: main.hidden, lang: document.documentElement.lang, wrong, right, navRight,
      text: main.innerText, labels: [...main.querySelectorAll('svg.radar text.rl')].filter(vis).map((t) => t.textContent),
      bars: [...main.querySelectorAll('.mb-row')].map((r) => [r.dataset.pct, Math.round(r.querySelector('.bar>span').getBoundingClientRect().width / r.querySelector('.bar').getBoundingClientRect().width * 100)]),
      overflowX: document.documentElement.scrollWidth - innerWidth,
      tableScroll: Math.max(0, ...[...main.querySelectorAll('.tbw')].filter(vis).map((t) => t.scrollWidth - t.clientWidth)) };
  })()`;

  for (const lang of ['ja', 'en', 'vi']) {
    for (const [view, hash] of [['jd', 'jd-top'], ['match', 'match-top'], ['exp', 'exp-horenso']]) {
      for (const w of [1280, 390]) {
        await go(`${pageUrl}?lang=${lang}#${hash}`, w);
        const r = await evaluate(probe(view, lang));
        const tag = `${view}/${lang}/${w}px`;
        ok(r.view === view && !r.hidden, `${tag}: view không mở (${r.view})`);
        ok(r.lang === lang, `${tag}: html lang = ${r.lang}`);
        ok(r.wrong === 0, `${tag}: ${r.wrong} khối khác ngôn ngữ đang hiện`);
        ok(r.right > 0, `${tag}: không thấy khối ${lang}`);
        ok(r.text.includes(EXPECT[lang][view]), `${tag}: thiếu chuỗi "${EXPECT[lang][view]}"`);
        ok(r.overflowX <= 1, `${tag}: tràn ngang ${r.overflowX}px`);
        ok(r.tableScroll <= 1, `${tag}: bảng phải cuộn ngang ${r.tableScroll}px`);
        if (view === 'match') {
          ok(r.labels.length === 6 && r.labels.includes(EXPECT[lang].radar), `${tag}: radar hiện ${r.labels.length} nhãn`);
          ok(r.bars.length >= 8 && r.bars.every(([p, wv]) => Math.abs(+p - wv) <= 1), `${tag}: độ dài cột lệch % ${JSON.stringify(r.bars)}`);
        }
      }
      // In A4: không trang nào của view bị cắt nội dung (pg cao cố định, overflow hidden)
      await go(`${pageUrl}?lang=${lang}#${hash}`, 794, 'print');
      const over = await evaluate(`[...document.querySelectorAll('main[data-view="${view}"] .pg')].map((p) => [p.id, p.scrollHeight - p.clientHeight]).filter(([, d]) => d > 1)`);
      ok(over.length === 0, `in ${view}/${lang}: trang bị cắt ${JSON.stringify(over)}`);
    }
  }
  // Menu cũ vẫn chạy
  for (const [view, hash] of [['profile', 'cover'], ['finance', 'fin-top'], ['hr', 'hr-top'], ['sales', 'sales-top']]) {
    await go(`${pageUrl}?lang=ja#${hash}`);
    ok(await evaluate(`document.body.dataset.view`) === view, `menu cũ ${view} không mở`);
  }
  ok(errors.length === 0, `lỗi JS/console: ${errors.slice(0, 5).join(' | ')}`);
  ws.close();
}

main().catch((e) => fails.push('lỗi chạy: ' + e.message)).finally(() => {
  chrome.kill();
  setTimeout(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
    if (fails.length) { console.error(`FAIL (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
    console.log('PASS browser-jd-matching: 0 lỗi JS, 3 ngôn ngữ x 3 view (JD, Matching, Management & Horenso) x desktop/mobile, in A4 không cắt trang, 4 menu cũ mở được');
    process.exit(0);
  }, 300);
});
