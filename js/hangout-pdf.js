'use strict';

/* =========================================================
   Hangout: সত্যিকারের PDF ফাইল ডাউনলোড (কোনো লাইব্রেরি ছাড়া)
   রিপোর্ট HTML → ছবি (ব্রাউজারের নিজের ফন্টে, তাই বাংলা ঠিক থাকে) → A4 পাতার PDF।
   ব্রাউজার না পারলে প্রিন্ট ডায়ালগে আগের মতো "PDF হিসেবে সেভ" চলে।
   ========================================================= */

const HG_PDF_W = 794, HG_PDF_H = 1123, HG_PDF_PAD = 28, HG_PDF_SCALE = 2;

// রিপোর্টের লাইনগুলোর মাঝখানে পাতা কাটা পড়ে না: সীমানা বেছে বেছে পাতা ভাগ
function hgPdfMeasure(html) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-12000px;top:0;width:${HG_PDF_W}px;padding:${HG_PDF_PAD}px;box-sizing:border-box;background:#fff`;
  host.innerHTML = `<style>${HG_PRINT_CSS}</style>${html}`;
  document.body.appendChild(host);
  const top = host.getBoundingClientRect().top;
  const total = host.scrollHeight;
  const cuts = [...host.querySelectorAll('tr, h3, h4, p, li, .kpis, .sm')].map(el => Math.ceil(el.getBoundingClientRect().bottom - top)).sort((a, b) => a - b);
  host.remove();
  const usable = HG_PDF_H - HG_PDF_PAD * 2;
  const pages = [];
  let start = 0;
  while (start < total - 4) {
    const limit = start + usable;
    let end = limit >= total ? total : Math.max(...cuts.filter(y => y > start + usable * 0.45 && y <= limit), 0);
    if (!end || end <= start) end = Math.min(limit, total);
    pages.push([start, end]);
    start = end;
  }
  return pages.length ? pages : [[0, total]];
}
async function hgRenderPage(html, from, to) {
  const W = HG_PDF_W, H = HG_PDF_H, P = HG_PDF_PAD, S = HG_PDF_SCALE;
  const tmp = document.createElement('div'); tmp.innerHTML = `<style>${HG_PRINT_CSS}</style>${html}`;
  const xhtml = new XMLSerializer().serializeToString(tmp); // <br> ইত্যাদি XML-সঠিক করে
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;overflow:hidden;background:#fff;position:relative">
      <div style="position:absolute;left:0;top:${P - from}px;width:${W}px;padding:0 ${P}px;box-sizing:border-box">${xhtml}</div>
      <div style="position:absolute;left:0;top:0;width:${W}px;height:${P}px;background:#fff"></div>
      <div style="position:absolute;left:0;top:${P + (to - from)}px;width:${W}px;height:${H}px;background:#fff"></div></div></foreignObject></svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0);
  const blob = await new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.92));
  const px = ctx.getImageData(0, 0, cv.width, Math.min(cv.height, 400)).data;
  let ink = 0; for (let i = 0; i < px.length; i += 4 * 37) if (px[i] < 200 || px[i + 1] < 200 || px[i + 2] < 200) ink++;
  return { jpg: new Uint8Array(await blob.arrayBuffer()), w: cv.width, h: cv.height, ink };
}
// JPEG পাতাগুলো থেকে সরল PDF ফাইল (A4)
function hgBuildPdf(pages) {
  const enc = new TextEncoder(), chunks = [], offs = [];
  let len = 0;
  const push = u8 => { chunks.push(u8); len += u8.length; };
  const str = s => push(enc.encode(s));
  const obj = (id, fn) => { offs[id] = len; str(`${id} 0 obj\n`); fn(); str('\nendobj\n'); };
  const n = pages.length;
  str('%PDF-1.4\n');
  obj(1, () => str('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => str(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, k) => `${3 + 3 * k} 0 R`).join(' ')}] >>`));
  pages.forEach((pg, k) => {
    const content = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    obj(3 + 3 * k, () => str(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${5 + 3 * k} 0 R >> >> /Contents ${4 + 3 * k} 0 R >>`));
    obj(4 + 3 * k, () => str(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(5 + 3 * k, () => { str(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>\nstream\n`); push(pg.jpg); str('\nendstream'); });
  });
  const xref = len, total = 3 * n + 3;
  str(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) str(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  str(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function hgHtmlToPdf(html) {
  const ranges = hgPdfMeasure(html);
  const pages = [];
  for (const [a, b] of ranges) pages.push(await hgRenderPage(html, a, b));
  if (!pages.some(p => p.ink > 3)) throw new Error('blank'); // ছবিতে লেখা না এলে PDF বানাই না
  return { blob: hgBuildPdf(pages), pages: pages.length };
}
const hgPdfName = ev => `${ev.name.replace(/[^\wঀ-৿-]+/g, '_').replace(/^_+|_+$/g, '') || 'hangout'}-hisab.pdf`;
// PDF নামান; মোবাইলে ফাইল-শেয়ার থাকলে "পাঠান" বাটনও দেওয়া হয়
async function hgDownloadPdf(kind) {
  const ev = hgCur(); if (!ev) return;
  const html = kind === 'slip' ? hgSlipHtml(ev) : hgMemoHtml(ev);
  toast(L('PDF বানানো হচ্ছে…', 'Making the PDF…'));
  try {
    const { blob, pages } = await hgHtmlToPdf(html);
    const name = hgPdfName(ev);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    hgLastPdf = new File([blob], name, { type: 'application/pdf' });
    toast(L(`PDF নামানো হয়েছে (${pages} পাতা)। ফোনের ডাউনলোডে দেখুন।`, `PDF saved (${pages} page${pages > 1 ? 's' : ''}). Check your downloads.`));
  } catch (err) {
    hgOpenPrint(html, `${ev.name} ${kind === 'slip' ? 'summary' : 'memo'}`); // ব্যাকআপ পথ: প্রিন্ট → PDF হিসেবে সেভ
  }
}
let hgLastPdf = null;
Object.assign(ACTIONS, {
  'hg-rep-print': () => hgDownloadPdf(hgRepKind),
  'hg-rep-pdf': () => hgDownloadPdf('memo'),
  'hg-pdf-send': async () => {
    const ev = hgCur(); if (!ev) return;
    try {
      if (!hgLastPdf) { const { blob } = await hgHtmlToPdf(hgMemoHtml(ev)); hgLastPdf = new File([blob], hgPdfName(ev), { type: 'application/pdf' }); }
      if (navigator.canShare && navigator.canShare({ files: [hgLastPdf] })) { await navigator.share({ files: [hgLastPdf], title: ev.name }); return; }
      toast(L('এই ডিভাইসে ফাইল-শেয়ার নেই, PDF বাটনে নামিয়ে নিন', 'File sharing is not available here, use the PDF button to download'));
    } catch (e) { if (e && e.name !== 'AbortError') toast(L('পাঠানো যায়নি', 'Could not send'), 'danger'); }
  },
});
