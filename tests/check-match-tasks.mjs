// Matching: mục "Việc đã làm, đối chiếu JD" (quản lý chi nhánh JILNESTA, đội sales JILNESTA + MAYEKAWA,
// phòng nhân sự + trợ lý Tổng giám đốc MAYEKAWA). Chạy: node tests/check-match-tasks.mjs (thoát 0 = đạt)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const mt = (html.match(/<main class="wrap" data-view="match" hidden>([\s\S]*?)<\/main>/) || [])[1] || '';
const nav = (html.match(/<nav class="sb-nav" data-for="match" hidden>([\s\S]*?)<\/nav>/) || [])[1] || '';
// 2 trang A4 (trang .pg cao cố định): 03 JILNESTA, 04 MAYEKAWA VIETNAM
const PAGES = [['match-tasks', '03'], ['match-tasks-2', '04']];
const secs = PAGES.map(([id]) => (mt.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`)) || [''])[0]);
const sec = secs.join('\n');
for (const [i, [id, no]] of PAGES.entries()) {
  ok(secs[i], `thiếu section #${id} trong view Matching`);
  ok(new RegExp(`<a href="#${id}" data-sec="${id}"><em>${no}</em><span data-l="ja">[^<]+</span><span data-l="en">[^<]+</span><span data-l="vi">[^<]+</span></a>`).test(nav),
    `sb-nav Matching thiếu link #${id} đủ 3 ngôn ngữ`);
}

const block = (l) => secs.map((s) => (s.match(new RegExp(`<div class="rv"[^>]*data-l="${l}">([\\s\\S]*?)\\n  </div>`)) || [])[1] || '').join('\n');
// 4 nhóm việc, mỗi ngôn ngữ cùng số thẻ và cùng số dòng việc
const HEADS = {
  ja: ['JILNESTA　支店の管理', 'JILNESTA　営業チームの管理', 'MAYEKAWA VIETNAM　営業チームの管理', 'MAYEKAWA VIETNAM　人事部の管理、社長の補佐'],
  en: ['JILNESTA: running the branch', 'JILNESTA: managing the sales team', 'MAYEKAWA VIETNAM: managing the sales team', 'MAYEKAWA VIETNAM: running HR, assisting the president'],
  vi: ['JILNESTA: quản lý chi nhánh', 'JILNESTA: quản lý đội sales', 'MAYEKAWA VIETNAM: quản lý đội sales', 'MAYEKAWA VIETNAM: quản lý phòng nhân sự, trợ lý Tổng giám đốc'],
};
const counts = {};
for (const [l, heads] of Object.entries(HEADS)) {
  const b = block(l);
  ok(secs.every((s) => s.includes(`data-l="${l}">`)), `#match-tasks thiếu khối ${l}`);
  for (const h of heads) ok(b.includes(`<h3>${h}</h3>`), `#match-tasks (${l}) thiếu nhóm: ${h}`);
  const cards = (b.match(/<div class="card">/g) || []).length;
  const lis = [...b.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  counts[l] = `${cards}/${lis.length}`;
  ok(cards === 4, `#match-tasks (${l}) cần 4 thẻ, có ${cards}`);
  ok(lis.length >= 16, `#match-tasks (${l}) cần >= 16 việc, có ${lis.length}`);
  // mỗi việc phải chỉ ra mục JD tương ứng (①..⑥)
  for (const li of lis) ok(/<span class="mt-ref">[①-⑥]+<\/span>$/.test(li), `#match-tasks (${l}) việc thiếu tham chiếu JD: ${li.slice(0, 60)}`);
}
ok(counts.ja === counts.en && counts.en === counts.vi, `#match-tasks số thẻ/việc lệch giữa 3 ngôn ngữ: ${JSON.stringify(counts)}`);

// Không bịa số liệu doanh số / KPI định lượng, không đòi số liệu
const NUM = /\d[\d,.]*\s*(%|USD|VND|ドル|円|億|万|triệu|tỷ|million|billion)/i;
const n = sec.match(NUM);
ok(!n, `#match-tasks có số liệu tiền / tỷ lệ: "${n && n[0]}"`);
ok(!/記載なし|số liệu doanh số|revenue figures/i.test(sec), '#match-tasks không được nhắc thiếu số liệu');
// Nhất quán với kinh nghiệm remote JILNESTA (task p2xs)
ok(/1年間[^<]*在宅[^<]*Zoom/.test(block('ja')) && /1 năm[^<]*tại nhà[^<]*Zoom/.test(block('vi')) && /one year[^<]*from home[^<]*Zoom/i.test(block('en')),
  '#match-tasks cần ý 1 năm quản lý tại nhà qua Zoom ở JILNESTA (3 ngôn ngữ)');

if (fails.length) { console.error(`FAIL (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
console.log(`PASS check-match-tasks: #match-tasks + #match-tasks-2, 4 nhóm, thẻ/việc ${counts.ja} ở 3 ngôn ngữ, mỗi việc có tham chiếu JD, không số liệu tiền`);
