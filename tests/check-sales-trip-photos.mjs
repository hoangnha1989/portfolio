// Sales: ảnh công tác trong mục #sales-trips (node tests/check-sales-trip-photos.mjs, thoát 0 = đạt)
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const html = readFileSync(process.argv[2] || fileURLToPath(new URL('index.html', root)), 'utf8');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
// Ảnh công tác phải nằm trong report của view Task: Sales, không ở view khác
const views = [...html.matchAll(/<main class="wrap" data-view="(\w+)"[^>]*>([\s\S]*?)<\/main>/g)].map((m) => [m[1], m[2]]);
const sales = (views.find(([v]) => v === 'sales') || [])[1] || '';
const sec = (sales.match(/<section class="pg" data-chap="III" id="sales-trips">([\s\S]*?)<\/section>/) || [])[1] || '';
ok(sales, 'thiếu view Task: Sales');
for (const [v, body] of views) if (v !== 'sales') ok(!/assets\/sales\/trip-/.test(body), `ảnh công tác lọt sang view "${v}"`);

// Kích thước JPEG từ khung SOF
const jpegSize = (buf) => {
  let i = 2;
  while (i < buf.length) {
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return [0, 0];
};

const WANT = ['assets/sales/trip-cold-storage-visit.jpg', 'assets/sales/trip-mycom-korea.jpg'];
const imgs = [...sec.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
ok(sec, 'thiếu section #sales-trips');
for (const src of WANT) {
  const tag = imgs.find((t) => t.includes(`src="${src}"`));
  ok(tag, `#sales-trips chưa có ảnh ${src}`);
  if (!tag) continue;
  const attr = (n) => (tag.match(new RegExp(`\\s${n}="([^"]*)"`)) || [])[1];
  ok(attr('alt') && attr('data-alt-vi') && attr('data-alt-en'), `${src}: thiếu alt ja/vi/en`);
  ok(attr('loading') === 'lazy', `${src}: thiếu loading="lazy"`);
  let buf;
  try { buf = readFileSync(fileURLToPath(new URL(src, root))); } catch { ok(false, `không có file ${src}`); continue; }
  const kb = statSync(fileURLToPath(new URL(src, root))).size / 1024;
  ok(kb <= 300, `${src}: ${kb.toFixed(0)} KB > 300 KB, chưa tối ưu`);
  ok(!buf.includes(Buffer.from('Exif\0\0')), `${src}: còn EXIF (có thể lộ GPS / thiết bị)`);
  const [w, h] = jpegSize(buf);
  ok(w > 0 && w <= 1600 && h <= 1600, `${src}: kích thước ${w}x${h} vượt 1600px`);
  ok(+attr('width') === w && +attr('height') === h, `${src}: width/height ${attr('width')}x${attr('height')} khác file ${w}x${h}`);
}
// Chú thích ảnh có bản dịch vi/en trong từ điển
const caps = [...sec.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].flatMap((m) => [...m[1].matchAll(/<span>([^<]+)<\/span>/g)].map((x) => x[1]));
ok(caps.length >= WANT.length, `chú thích ảnh: có ${caps.length}, cần >= ${WANT.length}`);
for (const c of caps) ok(html.includes(`"${c}":[`), `chú thích "${c}" chưa có bản dịch vi/en`);

if (fails.length) { console.error(`FAIL (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
console.log(`PASS check-sales-trip-photos: ${WANT.length} ảnh công tác trong #sales-trips, đã tối ưu, đủ alt + dịch`);
