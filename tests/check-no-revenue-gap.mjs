// Matching: không đòi số liệu doanh số; kinh nghiệm tìm khách mới đã làm = khớp (node tests/check-no-revenue-gap.mjs, thoát 0 = đạt)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const mt = (html.match(/<main class="wrap" data-view="match" hidden>([\s\S]*?)<\/main>/) || [])[1] || '';
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

ok(mt, 'thiếu view Matching');
// Không còn câu đánh dấu thiếu vì không có số liệu doanh số
const GAP = /売上金額は記載なし|記載なし|revenue figures|no .{0,20}figures|số liệu doanh số|không có số liệu|chưa có số liệu|経験はあるが|experience exists|có kinh nghiệm, mức khớp/i;
const g = mt.match(GAP);
ok(!g, `Matching còn chỗ đòi số liệu / đánh dấu thiếu: "${g && g[0]}"`);
// Dòng tìm khách mới = 100%, không thanh mức trung bình
const row = (mt.match(/<div class="mb-row" data-pct="(\d+)">(?:(?!<div class="mb-row")[\s\S])*?新規顧客開拓、販路拡大[\s\S]*?<span style="width:(\d+)%"><\/span><\/div>/) || []);
ok(row[1] === '100' && row[2] === '100', `dòng tìm khách mới phải 100%, đang ${row[1]}`);
ok(row[0] && !row[0].includes('bar--mid'), 'dòng tìm khách mới không được dùng thanh mức trung bình');
// Cột % sắp giảm dần
const pcts = [...mt.matchAll(/class="mb-row" data-pct="(\d+)"/g)].map((m) => +m[1]);
ok(pcts.every((p, i) => i === 0 || pcts[i - 1] >= p), `cột % không giảm dần: ${pcts.join(',')}`);

if (fails.length) { console.error(`FAIL (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
console.log('PASS check-no-revenue-gap: Matching không đòi số liệu, tìm khách mới = 100%');
