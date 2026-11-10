// Kiểm tĩnh 2 menu JD + Matching trong index.html (node tests/check-jd-matching.mjs, thoát 0 = đạt)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// 1. Menu cũ còn nguyên, menu mới có mặt
for (const v of ['profile', 'finance', 'hr', 'sales']) ok(html.includes(`data-view="${v}"`), `mất menu cũ ${v}`);
ok(/<a href="#jd-top" data-view="jd">JD<\/a>/.test(html), 'top-nav thiếu link JD');
ok(/<a href="#match-top" data-view="match">Matching<\/a>/.test(html), 'top-nav thiếu link Matching');

// 2. Mỗi view mới: có <main>, có sb-nav, mọi link sb-nav trỏ tới section có thật trong đúng main
const mainOf = (v) => {
  const m = html.match(new RegExp(`<main class="wrap" data-view="${v}" hidden>([\\s\\S]*?)</main>`));
  return m ? m[1] : '';
};
const navOf = (v) => {
  const m = html.match(new RegExp(`<nav class="sb-nav" data-for="${v}" hidden>([\\s\\S]*?)</nav>`));
  return m ? m[1] : '';
};
const SECS = { jd: ['jd-top', 'jd-bg', 'jd-work', 'jd-req'], match: ['match-top', 'match-core', 'match-other'] };
for (const [v, ids] of Object.entries(SECS)) {
  const body = mainOf(v), nav = navOf(v);
  ok(body, `thiếu <main data-view="${v}">`);
  ok(nav, `thiếu sb-nav data-for="${v}"`);
  for (const id of ids) {
    ok(body.includes(`id="${id}"`), `thiếu section #${id} trong view ${v}`);
    ok(nav.includes(`href="#${id}" data-sec="${id}"`), `sb-nav ${v} thiếu link #${id}`);
  }
  // mỗi section có đủ 3 ngôn ngữ, số khối bằng nhau
  for (const id of ids) {
    const sec = (body.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`)) || [''])[0];
    const n = (l) => (sec.match(new RegExp(`data-l="${l}"`, 'g')) || []).length;
    ok(n('ja') > 0 && n('ja') === n('en') && n('en') === n('vi'), `#${id}: khối ja/en/vi lệch (${n('ja')}/${n('en')}/${n('vi')})`);
  }
}
// sb-nav: nhãn mục đủ 3 ngôn ngữ
for (const v of ['jd', 'match']) {
  const nav = navOf(v);
  const links = (nav.match(/<a /g) || []).length;
  for (const l of ['ja', 'en', 'vi']) ok((nav.match(new RegExp(`data-l="${l}"`, 'g')) || []).length === links, `sb-nav ${v} thiếu nhãn ${l}`);
}

// 3. CSS ẩn hiện theo ngôn ngữ
for (const l of ['ja', 'en', 'vi']) ok(html.includes(`html[lang="${l}"] [data-l]:not([data-l="${l}"])`), `thiếu CSS ẩn khối khác ngôn ngữ cho ${l}`);

// 4. JD nguyên văn (bản gốc tiếng Nhật từ trang tuyển dụng; đã bỏ thông tin nhận diện công ty)
const jd = mainOf('jd');
const VERBATIM = [
  '【在宅勤務／月給1,500 USD】日系専門技術企業のベトナム現地法人 代表代行・経営責任者候補（日本語N2以上）',
  'ベトナム事業の統括、現地組織のマネジメント、事業拡大、および日本本社との連携・橋渡し全般をお任せします。',
  'ベトナム事業計画および予算の策定と実行',
  '売上、利益、キャッシュフロー等の予実・財務管理',
  '新規事業機会の開拓と成長戦略の実行',
  '現地スタッフの採用、育成、評価、労務管理',
  '組織体制の構築および業務プロセスの整備・最適化',
  '企業文化の醸成、労働安全衛生、コンプライアンスの推進',
  '主要顧客および取引先との関係構築・深耕',
  '営業活動全般の統括、販売戦略の策定、重要案件の進捗管理',
  '顧客満足度およびサービス・品質の向上',
  '予算、支出、資金繰り、財務報告の統括・管理',
  '会計、税務、契約、内部統制に関する社内担当者および外部専門家との連携',
  '経営状況の定期的なレポーティング',
  '日本本社への定期報告および事業提案',
  '本社方針の現地ローカライズ展開と進捗マネジメント',
  '日本・ベトナム双方の商習慣や文化の違いを埋める円滑なコミュニケーション',
  'ベトナムの関連法令、社内規程、倫理基準の徹底と遵守',
  '事業運営上のリスク把握・分析および本社への報告',
  '必要に応じた法律・会計・税務の外部専門家との折衝・連携',
  '現状把握、主要顧客への挨拶回り、事業・財務・組織リスクの整理',
  '優先施策の実行、営業・管理体制の改善、定期報告の定着、現代表からの引継ぎ完了',
  '合意した売上・利益・組織・業務改善目標の達成状況の評価',
  '給与：月給 1,500 USD（グロス）',
  '試用期間：3ヶ月（試用期間中の給与条件の変動なし）',
  '賞与・インセンティブ：業績に応じて支給',
  '福利厚生：社会保険・医療保険完備、交通費支給、その他社内規程に準ずる手当',
  '現在現地法人のトップを務める日本人代表が、2027年7月に日本へ帰任する予定となっています。',
  '書類選考 → Web面接（1〜2回） → 最終面接（対面）',
  '応募期限：2026年11月13日まで',
  '入社時期：2026年12月予定',
  '大卒以上',
  '語学力：日本語 ビジネスレベル（JLPT N2以上）、英語 日常会話〜業務連絡レベル（TOEIC 500点程度）',
  '組織またはグループのマネジメント経験',
  '経理・財務・事務関連の実務知識または経験',
  'チーフアカウンタントの有資格者',
  '製薬業界または理化学業界での実務経験',
  '日系企業での実務経験（大いに歓迎）',
  '新規顧客開拓および販路拡大（ビジネスデベロップメント）の経験',
  '経営管理能力、的確な事業判断力を身につけたい・発揮したい方',
  '日本とベトナムの商習慣や文化の違いを理解し、柔軟に橋渡しができるコミュニケーション力のある方',
  'リモートワーク環境下でも自己管理ができ、主体性と責任感を持って自走できる方',
  '議論や会議をリードできるレベル',
  '週休2日制（土日）、ベトナムの祝日',
  '勤務地：ベトナム・ホーチミン市（主に自宅でのテレワーク／リモートワーク）',
  '8:00 ～ 16:00',
];
for (const s of VERBATIM) ok(jd.includes(s), `JD thiếu nguyên văn: ${s}`);
// Không lộ công ty tuyển dụng (tên, trang đăng, mã tin, giới thiệu công ty). Viết bằng escape vì tests/ cũng được phát hành.
const LEAK = new RegExp([
  'tha\\x6eks?[\\s._-]*asia', '\\u30b5\\u30f3\\u30af\\u30b9', 'vietsc\\x6fut', '76\\x339',
  '\\u4f1a\\u793e\\u540d', 'Company name', 'T\\u00ean c\\u00f4ng ty',
  '\\u63a1\\u7528\\u4f01\\u696d\\u306e\\u8aac\\u660e', 'About the hiring company', 'Gi\\u1edbi thi\\u1ec7u c\\u00f4ng ty tuy\\u1ec3n d\\u1ee5ng',
].join('|'), 'i');
const leak = html.match(LEAK);
ok(!leak, `còn thông tin nhận diện công ty: "${leak && leak[0]}"`);
// bản dịch EN/VI có mặt (chuỗi đặc trưng)
for (const s of ['Acting Representative', 'JLPT N2 or above', 'TOEIC around 500', 'Chief Accountant', 'Người đại diện tạm quyền', 'JLPT N2 trở lên', 'Kế toán trưởng'])
  ok(jd.includes(s), `JD thiếu bản dịch: ${s}`);

// 5. Matching: radar 6 trục (SVG), 2 đa giác, nhãn 3 ngôn ngữ; cột % có căn cứ
const mt = mainOf('match');
const radar = (mt.match(/<svg[^>]*class="radar"[\s\S]*?<\/svg>/) || [''])[0];
ok(radar, 'Matching thiếu SVG radar');
ok((radar.match(/<polygon[^>]*class="r-jd"/g) || []).length === 1 && (radar.match(/<polygon[^>]*class="r-me"/g) || []).length === 1, 'radar cần 1 đa giác JD + 1 đa giác của tôi');
for (const l of ['ja', 'en', 'vi']) ok((radar.match(new RegExp(`<text[^>]*data-l="${l}"`, 'g')) || []).length === 6, `radar cần 6 nhãn trục ${l}`);
const pts = (cls) => ((radar.match(new RegExp(`class="${cls}"[^>]*points="([^"]+)"`)) || [])[1] || '').trim().split(/\s+/).length;
ok(pts('r-jd') === 6 && pts('r-me') === 6, 'đa giác radar phải có đúng 6 đỉnh');
// Toạ độ radar và tỷ lệ % phải tính đúng từ bảng điểm (tâm 220,170; bán kính 120 = điểm 5; trục 0 ở đỉnh, mỗi trục +60 độ theo chiều kim đồng hồ)
const coreSec = (mt.match(/<section[^>]*id="match-core"[\s\S]*?<\/section>/) || [''])[0];
const sc = [...coreSec.matchAll(/class="r mc-sc">([\d.]+) \/ ([\d.]+)</g)].map((m) => [+m[1], +m[2]]);
ok(sc.length === 6, `bảng điểm cần 6 cặp tôi/JD, có ${sc.length}`);
const poly = (vals) => vals.map((v, i) => {
  const a = (-90 + 60 * i) * Math.PI / 180;
  return `${(220 + 120 * v / 5 * Math.cos(a)).toFixed(1)},${(170 + 120 * v / 5 * Math.sin(a)).toFixed(1)}`;
}).join(' ');
const ptsOf = (cls) => ((radar.match(new RegExp(`class="${cls}" points="([^"]+)"`)) || [])[1] || '').trim();
ok(ptsOf('r-me') === poly(sc.map((x) => x[0])), 'đa giác r-me lệch so với điểm của tôi trong bảng');
ok(ptsOf('r-jd') === poly(sc.map((x) => x[1])), 'đa giác r-jd lệch so với điểm JD trong bảng');
const pct = Math.round(sc.reduce((s, [m, j]) => s + Math.min(m / j, 1), 0) / 6 * 100);
ok(mt.includes(`<p class="num">${pct}%</p>`), `tỷ lệ khớp 6 kỹ năng chính phải là ${pct}%`);
for (const [m, j] of sc) ok(radar.includes(`>${m} / ${j}</text>`), `radar thiếu nhãn điểm ${m} / ${j}`);
const core = (mt.match(/<section[^>]*id="match-core"[\s\S]*?<\/section>/) || [''])[0];
ok((core.match(/class="mc-row"/g) || []).length === 6, 'bảng căn cứ radar cần 6 dòng');
const other = (mt.match(/<section[^>]*id="match-other"[\s\S]*?<\/section>/) || [''])[0];
const bars = [...other.matchAll(/class="mb-row" data-pct="(\d+)"[\s\S]*?<span style="width:(\d+)%"/g)];
ok(bars.length >= 8, `cần >= 8 cột %, có ${bars.length}`);
for (const b of bars) ok(b[1] === b[2] && +b[1] >= 0 && +b[1] <= 100, `cột % lệch data-pct=${b[1]} width=${b[2]}`);
ok((other.match(/class="mb-why"/g) || []).length === bars.length * 3, 'mỗi cột cần căn cứ đủ 3 ngôn ngữ');

// 6. HTML cân thẻ (main/section/nav/div/svg/script/style/table/ul)
const TAGS = ['main', 'section', 'nav', 'div', 'svg', 'script', 'style', 'table', 'ul'];
const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '<script></script>').replace(/<style[\s\S]*?<\/style>/g, '<style></style>');
for (const t of TAGS) {
  const o2 = (noScript.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length, c2 = (noScript.match(new RegExp(`</${t}>`, 'g')) || []).length;
  ok(o2 === c2, `thẻ <${t}> lệch: mở ${o2}, đóng ${c2}`);
}
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
ok(dup.length === 0, `id trùng: ${[...new Set(dup)].join(', ')}`);

if (fails.length) { console.error(`FAIL (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
console.log('PASS check-jd-matching: 2 menu, 7 section, 3 ngôn ngữ, JD nguyên văn, radar 6 trục, cột % có căn cứ');
