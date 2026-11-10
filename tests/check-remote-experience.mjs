// Kiểm nội dung kinh nghiệm làm việc từ xa: không còn câu "chưa có / không có kinh nghiệm remote",
// có ý 1 năm làm việc + quản lý toàn thời gian tại nhà ở JILNESTA qua công cụ quản lý công ty và Zoom (3 ngôn ngữ).
// Chạy: node tests/check-remote-experience.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

for (const s of [
  '在宅勤務を常勤で続けた経験はない',
  'No record of full-time work from home',
  'Chưa có kinh nghiệm làm việc tại nhà toàn thời gian',
]) ok(!html.includes(s), `còn câu cũ: ${s}`);

const NEW = {
  ja: '1年間、常勤の在宅勤務で働き、社内の管理ツールとZoom会議でチームを管理',
  vi: '1 năm làm việc toàn thời gian tại nhà, quản lý đội qua các công cụ quản lý của công ty và họp Zoom',
  en: 'One year working full-time from home, managing the team through the company\'s management tools and Zoom meetings',
};
for (const [l, s] of Object.entries(NEW)) ok(html.includes(s), `thiếu ý remote JILNESTA (${l})`);
// Dòng mới ở trang Skill 01 (JILNESTA) phải có khoá dịch VI/EN trong từ điển var D
ok(html.includes(`<p>${NEW.ja}</p>`), 'trang Skill 01 JILNESTA thiếu dòng remote');
ok(html.includes(`"${NEW.ja}": ["${NEW.vi}", "${NEW.en}"]`), 'thiếu khoá dịch VI/EN cho dòng remote');

const other = (html.match(/<section[^>]*id="match-other"[\s\S]*?<\/section>/) || [''])[0];
const row = (other.match(/<div class="mb-row" data-pct="(\d+)">(?:(?!<div class="mb-row")[\s\S])*?リモート環境での自己管理[\s\S]*?(?=<div class="mb-row"|<\/div>\s*<p class="note)/) || []);
ok(row[1] === '100', `cột "リモート環境での自己管理" phải 100%, đang ${row[1]}`);
ok(/JILNESTA[^<]*1年間[^<]*Zoom/.test(row[0] || ''), 'căn cứ cột remote phải nêu 1 năm tại nhà ở JILNESTA + Zoom');
const pcts = [...other.matchAll(/class="mb-row" data-pct="(\d+)"/g)].map(m => +m[1]);
ok(pcts.every((p, i) => i === 0 || pcts[i - 1] >= p), `cột % phải giảm dần: ${pcts.join(',')}`);

if (fails.length) { console.error('FAIL check-remote-experience:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS check-remote-experience: không còn câu "chưa có kinh nghiệm remote", có ý 1 năm remote JILNESTA + Zoom ở 3 ngôn ngữ, cột 100%');
