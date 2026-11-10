// Menu riêng "Kinh nghiệm quản lý, làm việc tại công ty Nhật + Horenso (報連相)" trên header.
// Chạy: node tests/check-exp-horenso.mjs (thoát 0 = đạt)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// 1. Header: link riêng tới view exp, menu cũ còn nguyên
const top = (html.match(/<nav class="top-nav"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
ok(/<a href="#exp-top" data-view="exp">[^<]*Horenso[^<]*<\/a>/.test(top), 'top-nav thiếu link #exp-top data-view="exp"');
for (const v of ['profile', 'finance', 'hr', 'sales', 'jd', 'match']) ok(top.includes(`data-view="${v}"`), `top-nav mất menu cũ ${v}`);

// 2. View + sidebar: mọi section có link sb-nav đủ 3 ngôn ngữ, nằm trong đúng <main data-view="exp">
const main = (html.match(/<main class="wrap" data-view="exp" hidden>([\s\S]*?)<\/main>/) || [])[1] || '';
const nav = (html.match(/<nav class="sb-nav" data-for="exp" hidden>([\s\S]*?)<\/nav>/) || [])[1] || '';
ok(main, 'thiếu <main data-view="exp">');
ok(nav, 'thiếu sb-nav data-for="exp"');
const PAGES = [['exp-top', 'TOP'], ['exp-jp', '01'], ['exp-horenso', '02']];
const sec = {};
for (const [id, no] of PAGES) {
  sec[id] = (main.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`)) || [''])[0];
  ok(sec[id], `thiếu section #${id} trong view exp`);
  ok(new RegExp(`<a href="#${id}" data-sec="${id}"><em>${no}</em><span data-l="ja">[^<]+</span><span data-l="en">[^<]+</span><span data-l="vi">[^<]+</span></a>`).test(nav),
    `sb-nav exp thiếu link #${id} đủ 3 ngôn ngữ`);
  for (const l of ['ja', 'en', 'vi']) ok(new RegExp(`data-l="${l}"`).test(sec[id]), `#${id} thiếu khối ${l}`);
}
ok((html.match(/id="exp-(top|jp|horenso)"/g) || []).length === 3, 'id exp-* bị trùng');

// 3. Nội dung: quản lý, công ty Nhật, Horenso đủ 3 ý báo cáo / liên lạc / thảo luận, đủ 3 ngôn ngữ
const NEED = {
  'exp-top': { ja: ['支店長', '約27名', '人事部長', '1名体制から5名'], en: ['Branch manager', 'about 27', 'HR head', 'one person to five'], vi: ['Giám đốc chi nhánh', 'khoảng 27', 'Trưởng phòng Nhân sự', '1 người lên 5 người'] },
  'exp-jp': { ja: ['Isuzu Vietnam', 'JILNESTA', 'MAYEKAWA VIETNAM', '11年'], en: ['Isuzu Vietnam', 'JILNESTA', 'MAYEKAWA VIETNAM', '11 years'], vi: ['Isuzu Vietnam', 'JILNESTA', 'MAYEKAWA VIETNAM', '11 năm'] },
  'exp-horenso': { ja: ['報連相', '報告', '連絡', '相談'], en: ['Horenso', 'Hokoku', 'Renraku', 'Sodan'], vi: ['Horenso', 'Báo cáo', 'Liên lạc', 'Thảo luận'] },
};
for (const [id, langs] of Object.entries(NEED)) for (const [l, words] of Object.entries(langs)) {
  const b = (sec[id].match(new RegExp(`data-l="${l}">([\\s\\S]*?)\\n  </div>`)) || [])[1] || '';
  for (const w of words) ok(b.includes(w), `#${id} (${l}) thiếu "${w}"`);
}

// 4. Không bịa / không đưa lại dữ liệu đã bỏ
ok(!/THANK ASIA/i.test(main), 'view exp không được nhắc THANK ASIA');

if (fails.length) { console.error('FAIL check-exp-horenso:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS check-exp-horenso: menu header #exp-top, 3 section (quản lý, công ty Nhật, Horenso) đủ 3 ngôn ngữ, sb-nav khớp');
