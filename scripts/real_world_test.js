/* ==========================================================================
   URL PRINTER - REAL-WORLD EXTRACTION TEST
   Loads index.html, runs ContentExtractor.fetchFromUrl() against REAL pages
   and compares the result against ground truth taken from the live page
   rendered in a real browser (computed styles, H1, longest paragraphs).

   Network: all cross-origin requests from the app are fulfilled by Node
   (simulating a perfect CORS proxy) so that we test the extraction logic,
   not the availability of public proxies.

   Usage:
     node scripts/real_world_test.js [--only=substring] [--out=report.json]
   ========================================================================== */
const pw = require('C:/Users/dtros/AppData/Local/ms-playwright-go/1.50.1/package');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const URLS = [
  'https://cs.wikipedia.org/wiki/Kvantov%C3%A1_mechanika',
  'https://en.wikipedia.org/wiki/General_relativity',
  'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403',
  'https://web.dev/articles/vitals',
  'https://tailwindcss.com/docs/typography-plugin',
  'https://vuejs.org/guide/introduction.html',
  'https://docusaurus.io/docs/styling-layout',
  'https://astro.build/blog/astro-4/',
  'https://picocss.com/docs/typography',
  'https://www.theverge.com/2024/4/2/24117976/best-printer-2024-brother',
  'https://www.jirkamucha.cz/kdyz-milujeme-vse-nemilujeme-nic/',
  'https://www.saxoskola.cz/typy-saxofonu-a-jejich-tonovy-rozsah/',
  'https://www.seznamzpravy.cz/clanek/domaci-pocasi-leto-jeste-nekonci-predpovida-meteorolog-horke-dny-cekaji-cesko-i-v-zari-313688',
  'https://zpravy.aktualne.cz/domaci/kontroly-odhalily-stovky-pripadu-nelegalniho-prodeje-kratomu-a-drog/r~aaa291e54515a9c95b8f1d797cfa05b1/',
  'https://www.idnes.cz/zpravy/domaci/drahoslav-ryba-koronavirus-hasici-covid-19-pomoc-ockovani-testovani.A210316_151859_domaci_lre',
  'https://ct24.ceskatelevize.cz/clanek/veda/vedci-popsali-financni-pasti-ktere-se-ukryvaji-ve-videohrach-zadarmo-376825',
  'https://denikn.cz/minuta/787588/'
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PROXY_HOSTS = ['api.allorigins.win', 'api.codetabs.com', 'corsproxy.io', 'r.jina.ai'];

function startServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Unwrap public CORS proxy URLs to the real target URL. */
function unwrapProxy(u) {
  try {
    const url = new URL(u);
    if (url.hostname === 'r.jina.ai') return { target: null, jina: true };
    if (PROXY_HOSTS.includes(url.hostname)) {
      const t = url.searchParams.get('url') || url.searchParams.get('quest');
      return { target: t, json: url.pathname.startsWith('/get') };
    }
    return { target: u };
  } catch (e) { return { target: null }; }
}

const norm = s => (s || '').replace(/\s+/g, ' ').replace(/[“”„"'’‘]/g, '').trim().toLowerCase();
const primaryFont = s => (s || '').split(',')[0].replace(/['"]/g, '').replace(/^__([a-z0-9_-]+)_[a-f0-9]{4,}$/i, '$1').replace(/[-_\s]/g, '').trim().toLowerCase();

function hexDist(a, b) {
  const p = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = p(a), y = p(b);
  if (!x || !y) return null;
  return Math.round(Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2));
}

async function groundTruth(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);
    return await page.evaluate(() => {
      const toHex = c => {
        const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c || '');
        return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : '';
      };
      const scope = document.querySelector('article, [itemprop="articleBody"], main, .mw-parser-output') || document.body;
      const isLogo = el => {
        if (!el) return true;
        if (el.closest('header, nav, .site-header, .header')) return true;
        const cls = (el.className || '').toLowerCase();
        if (cls.includes('logo') || cls.includes('brand') || cls.includes('emblem') || cls.includes('site-title')) return true;
        const txt = el.textContent.trim().toLowerCase();
        if (txt === 'idnes.cz' || txt === 'seznam zprávy' || txt.includes('něco nám brání') || txt.includes('failed to load') || txt.includes('attention required') || txt.includes('access denied')) return true;
        return false;
      };
      const allH1s = Array.from(document.querySelectorAll('article h1, main h1, [itemprop="headline"], h1'));
      const realH1 = allH1s.find(h => !isLogo(h));
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      let h1Text = realH1 ? realH1.textContent.replace(/\s+/g, ' ').trim() : (ogTitle ? ogTitle.replace(/\s+[-–—|•·»]\s+[^-\n]{2,40}$/i, '').trim() : '');
      const ps = Array.from(scope.querySelectorAll('p'))
        .filter(p => p.offsetParent !== null && p.textContent.trim().length > 80 && !p.closest('nav, footer, aside, header, [class*="cookie" i], [class*="consent" i]'));
      const sorted = ps.slice().sort((a, b) => b.textContent.length - a.textContent.length);
      const p = ps[0];
      const cH1 = realH1 ? getComputedStyle(realH1) : null;
      const cP = p ? getComputedStyle(p) : null;
      return {
        h1Text: h1Text,
        h1Font: cH1 ? cH1.fontFamily : '',
        h1Color: cH1 ? toHex(cH1.color) : '',
        pFont: cP ? cP.fontFamily : '',
        pColor: cP ? toHex(cP.color) : '',
        keyParagraphs: sorted.slice(0, 6).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
        paragraphCount: ps.length
      };
    });
  } catch (e) {
    return { error: e.message };
  } finally {
    await page.close();
  }
}

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const truthCtx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'cs-CZ' });
  await truthCtx.addCookies([
    { name: 'd_consent', value: '1', domain: '.idnes.cz', path: '/' },
    { name: 'didomi_token', value: 'consent_all', domain: '.idnes.cz', path: '/' }
  ]);
  const appCtx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
  const fetchCache = new Map();

  const nodeFetch = async (target) => {
    if (fetchCache.has(target)) return fetchCache.get(target);
    const p = appCtx.request.fetch(target, { headers: { 'User-Agent': UA, 'Accept-Language': 'cs,en;q=0.8' }, timeout: 20000, failOnStatusCode: false })
      .then(async r => ({ status: r.status(), headers: r.headers(), body: await r.body() }))
      .catch(e => ({ status: 599, headers: {}, body: Buffer.from(String(e.message)) }));
    fetchCache.set(target, p);
    return p;
  };

  await appCtx.route(/^https?:\/\//, async (route) => {
    const req = route.request();
    const u = req.url();
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.continue();
    if (['image', 'media'].includes(req.resourceType())) return route.abort();
    const { target, json, jina } = unwrapProxy(u);
    if (jina || !target) return route.fulfill({ status: 502, body: 'disabled in test' });
    const r = await nodeFetch(target);
    const headers = { 'access-control-allow-origin': '*', 'content-type': r.headers['content-type'] || 'text/html' };
    if (json) {
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ contents: r.body.toString('utf8') }) });
    }
    return route.fulfill({ status: r.status, headers, body: r.body });
  });

  const appPage = await appCtx.newPage();
  const consoleErrors = [];
  appPage.on('pageerror', e => consoleErrors.push(String(e.message)));
  await appPage.goto(base, { waitUntil: 'domcontentloaded' });
  await appPage.waitForFunction(() => !!window.ContentExtractor, null, { timeout: 15000 });

  const list = URLS.filter(u => !args.only || u.includes(args.only));
  const results = [];
  for (const url of list) {
    process.stdout.write(`\n▶ ${url}\n`);
    const truth = await groundTruth(truthCtx, url);
    const t0 = Date.now();
    const extracted = await appPage.evaluate(async (u) => {
      try {
        const r = await Promise.race([
          window.ContentExtractor.fetchFromUrl(u, true),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 45s')), 45000))
        ]);
        const div = document.createElement('div');
        div.innerHTML = r.htmlContent;
        return {
          ok: true,
          title: r.title,
          text: div.textContent.replace(/\s+/g, ' ').trim(),
          blocks: div.children.length,
          paragraphs: div.querySelectorAll('p').length,
          images: div.querySelectorAll('img').length,
          relLinks: Array.from(div.querySelectorAll('a[href]')).filter(a => !/^(https?:|mailto:|tel:|#)/i.test(a.getAttribute('href'))).length,
          dupImages: (() => { const s = Array.from(div.querySelectorAll('img')).map(i => i.getAttribute('src')); return s.length - new Set(s).size; })(),
          tokens: r.styleTokens || {},
          diag: r.diagnostics || null
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }, url);
    const ms = Date.now() - t0;

    const row = { url, ms, truthError: truth.error || null };
    if (!extracted.ok) {
      row.status = 'LOAD_FAIL';
      row.error = extracted.error;
    } else {
      const textN = norm(extracted.text);
      const kp = (truth.keyParagraphs || []);
      const found = kp.filter(p => textN.includes(norm(p).slice(0, 70)));
      row.title = extracted.title;
      row.truthH1 = truth.h1Text;
      row.titleOk = truth.h1Text ? (norm(extracted.title) === norm(truth.h1Text) || norm(truth.h1Text).startsWith(norm(extracted.title)) && norm(extracted.title).length > norm(truth.h1Text).length * 0.8) : null;
      row.recall = kp.length ? +(found.length / kp.length).toFixed(2) : null;
      row.textLen = extracted.text.length;
      row.blocks = extracted.blocks;
      row.relLinks = extracted.relLinks;
      row.dupImages = extracted.dupImages;
      row.h1Font = { truth: primaryFont(truth.h1Font), got: primaryFont(extracted.tokens.headingFont) };
      row.pFont = { truth: primaryFont(truth.pFont), got: primaryFont(extracted.tokens.bodyFont) };
      row.h1FontOk = !truth.h1Font || row.h1Font.truth === row.h1Font.got;
      row.pFontOk = !truth.pFont || row.pFont.truth === row.pFont.got;
      row.h1ColorDist = hexDist(truth.h1Color, extracted.tokens.h1Color);
      row.pColorDist = hexDist(truth.pColor, extracted.tokens.pColor);
      row.tokenSource = extracted.tokens.tokenSource || extracted.diag?.tokenSource || '?';
      row.diag = extracted.diag;
      row.status = 'OK';
    }
    results.push(row);
    console.log(JSON.stringify(row, null, 1).slice(0, 1600));
  }

  // Summary
  const ok = results.filter(r => r.status === 'OK');
  const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
  const summary = {
    total: results.length,
    loaded: ok.length,
    titleOk: ok.filter(r => r.titleOk === true).length,
    avgRecall: avg(ok.filter(r => r.recall !== null).map(r => r.recall)),
    h1FontOk: ok.filter(r => r.h1FontOk).length,
    pFontOk: ok.filter(r => r.pFontOk).length,
    h1ColorOk: ok.filter(r => r.h1ColorDist !== null && r.h1ColorDist < 60).length,
    pColorOk: ok.filter(r => r.pColorDist !== null && r.pColorDist < 60).length,
    relLinks: ok.reduce((a, r) => a + (r.relLinks || 0), 0),
    dupImages: ok.reduce((a, r) => a + (r.dupImages || 0), 0),
    avgMs: avg(results.map(r => r.ms)),
    pageErrors: consoleErrors.slice(0, 10)
  };
  console.log('\n================ SUMMARY ================');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n| Web | Load | Title | Recall | H1 font (truth → got) | P font (truth → got) | ΔH1 | ΔP |');
  console.log('|---|---|---|---|---|---|---|---|');
  results.forEach(r => {
    const host = new URL(r.url).hostname.replace(/^www\./, '');
    if (r.status !== 'OK') return console.log(`| ${host} | ❌ ${r.error?.slice(0, 60)} | | | | | | |`);
    console.log(`| ${host} | ✅ | ${r.titleOk === null ? '?' : r.titleOk ? '✅' : '❌ ' + r.title.slice(0, 40)} | ${r.recall} | ${r.h1FontOk ? '✅' : '❌'} ${r.h1Font.truth} → ${r.h1Font.got} | ${r.pFontOk ? '✅' : '❌'} ${r.pFont.truth} → ${r.pFont.got} | ${r.h1ColorDist ?? '?'} | ${r.pColorDist ?? '?'} |`);
  });

  if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify({ summary, results }, null, 2));
  await browser.close();
  server.close();
})();
