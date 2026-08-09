/* ==========================================================================
   URL PRINTER STUDIO - COMPLETE APPLICATION SCRIPT (V5.0)
   - Full Synchronization of UI Controls on Project Load (_syncUIFromConfig)
   - Fully Functional Auto-TOC (Table of Contents) with Real Page Numbering & Navigation
   - Completely Independent Page Numbering (Separate from Header/Footer text visibility)
   - Built-in Markdown Table Parser (Converts Markdown | col | col | to Formatted Tables)
   - Inline Markdown Image & Media Support inside Tables and Paragraphs
   - Aggressive Web Scraping Filter (Strips Breadcrumbs, Menus, Jump Links & Related Posts)
   - 100% Fully Responsive Block Inspector: All Controls, Buttons, Sliders & Presets
   - Instant Visual Feedback for Alignment, Tag Type, Margins, Borders & Page Breaks
   - Grab-and-Drag Sliders with Live 60fps Updates (Zero DOM Destruction During Drag)
   - Real-time 10% - 200% Image, Figure & Table Sizing (No Max-Height Clamp)
   - Complete Multi-Column Sazba (1, 2 & 3 Columns with Exact Column Overflow Detection)
   - Natural & Professional Headings & Multi-Block Flow (No Spurious Page Breaks)
   - Exact Cumulative Content Height Measurement (_getContentHeight via offsetTop + offsetHeight)
   - Independent Canvas Zoom (Viewport Scrollbars Never Shrink)
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. ROBUST OFFLINE VECTOR SVG / BITMAP QR CODE GENERATOR
     Full Reed-Solomon Byte-mode Implementation with ISO/IEC 18004 Standard
     ========================================================================== */
  class QRGenerator {
    static _initGF() {
      if (this._gfInit) return;
      this.EXP = new Uint8Array(512);
      this.LOG = new Uint8Array(256);
      let x = 1;
      for (let i = 0; i < 255; i++) {
        this.EXP[i] = x;
        this.EXP[i + 255] = x;
        this.LOG[x] = i;
        x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
      }
      this._gfInit = true;
    }

    static _gfMul(x, y) {
      if (x === 0 || y === 0) return 0;
      return this.EXP[this.LOG[x] + this.LOG[y]];
    }

    static _rsGenPoly(degree) {
      let poly = [1];
      for (let i = 0; i < degree; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
          next[j] ^= this._gfMul(poly[j], this.EXP[i]);
          next[j + 1] ^= poly[j];
        }
        poly = next;
      }
      return poly;
    }

    static _rsEncode(data, numEcBytes) {
      this._initGF();
      const genPoly = this._rsGenPoly(numEcBytes);
      const res = new Array(numEcBytes).fill(0);
      for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ res[0];
        res.shift();
        res.push(0);
        for (let j = 0; j < numEcBytes; j++) {
          res[j] ^= this._gfMul(genPoly[j], factor);
        }
      }
      return res;
    }

    static generateMatrix(text) {
      this._initGF();
      const utf8 = unescape(encodeURIComponent(text));
      const len = utf8.length;

      let version = 1;
      let capacity = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
      let ecBytesPerBlock = [7, 10, 15, 20, 26, 36, 40, 48, 60, 72];

      for (let v = 0; v < capacity.length; v++) {
        if (len <= capacity[v]) {
          version = v + 1;
          break;
        }
        if (v === capacity.length - 1) version = 10;
      }

      const numDataBytes = capacity[version - 1];
      const numEcBytes = ecBytesPerBlock[version - 1];
      const moduleCount = version * 4 + 17;

      const bits = [];
      const appendBits = (val, count) => {
        for (let i = count - 1; i >= 0; i--) bits.push((val >> i) & 1);
      };

      appendBits(4, 4);
      appendBits(len, version < 10 ? 8 : 16);
      for (let i = 0; i < len; i++) appendBits(utf8.charCodeAt(i), 8);

      appendBits(0, Math.min(4, numDataBytes * 8 - bits.length));
      while (bits.length % 8 !== 0) bits.push(0);

      const dataBytes = [];
      for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
        dataBytes.push(b);
      }

      const pad = [0xEC, 0x11];
      let padIdx = 0;
      while (dataBytes.length < numDataBytes) {
        dataBytes.push(pad[padIdx % 2]);
        padIdx++;
      }

      const ecBytes = this._rsEncode(dataBytes, numEcBytes);
      const totalCodewords = dataBytes.concat(ecBytes);

      const matrix = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(null));

      const addFinder = (r0, c0) => {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              matrix[r0 + r][c0 + c] = 1;
            } else {
              matrix[r0 + r][c0 + c] = 0;
            }
          }
        }
      };
      addFinder(0, 0);
      addFinder(0, moduleCount - 7);
      addFinder(moduleCount - 7, 0);

      for (let i = 0; i < 8; i++) {
        if (moduleCount - 8 >= 0) {
          matrix[7][i] = matrix[i][7] = 0;
          matrix[7][moduleCount - 1 - i] = matrix[i][moduleCount - 8] = 0;
          matrix[moduleCount - 8][i] = matrix[moduleCount - 1 - i][7] = 0;
        }
      }

      if (version >= 2) {
        const alignPos = [6, 18, 22, 26, 30, 34, 38, 42, 46, 50][version - 1];
        const addAlign = (r0, c0) => {
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
                if (matrix[r0 + r][c0 + c] === null) matrix[r0 + r][c0 + c] = 1;
              } else {
                if (matrix[r0 + r][c0 + c] === null) matrix[r0 + r][c0 + c] = 0;
              }
            }
          }
        };
        addAlign(alignPos, alignPos);
      }

      for (let i = 8; i < moduleCount - 8; i++) {
        if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
        if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
      }

      matrix[moduleCount - 8][8] = 1;

      const allBits = [];
      totalCodewords.forEach(byte => {
        for (let b = 7; b >= 0; b--) allBits.push((byte >> b) & 1);
      });

      let bitIdx = 0;
      let right = moduleCount - 1;
      let upward = true;

      while (right > 0) {
        if (right === 6) right--;
        for (let i = 0; i < moduleCount; i++) {
          const r = upward ? moduleCount - 1 - i : i;
          for (let colOffset = 0; colOffset < 2; colOffset++) {
            const c = right - colOffset;
            if (matrix[r][c] === null) {
              const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
              const mask = (r + c) % 2 === 0;
              matrix[r][c] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
            }
          }
        }
        right -= 2;
        upward = !upward;
      }

      const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
      for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
      matrix[8][7] = formatBits[6];
      matrix[8][8] = formatBits[7];
      matrix[7][8] = formatBits[8];
      for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i];

      for (let i = 0; i < 8; i++) matrix[moduleCount - 1 - i][8] = formatBits[i];
      for (let i = 8; i < 15; i++) matrix[8][moduleCount - 15 + i] = formatBits[i];

      return matrix;
    }

    static generateSVG(text, options = {}) {
      const colorDark = options.colorDark || '#0f172a';
      const colorLight = options.colorLight || '#ffffff';
      const margin = options.margin !== undefined ? options.margin : 2;

      let matrix;
      try {
        matrix = this.generateMatrix(text || 'https://urlprinter.studio');
      } catch (e) {
        console.error('QR Generator error:', e);
        matrix = this.generateMatrix('https://urlprinter.studio');
      }

      const moduleCount = matrix.length;
      const totalSize = moduleCount + margin * 2;

      let rects = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (matrix[r][c] === 1) {
            rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${colorDark}"/>`;
          }
        }
      }

      return `<svg viewBox="0 0 ${totalSize} ${totalSize}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; display: block;"><rect width="${totalSize}" height="${totalSize}" fill="${colorLight}"/>${rects}</svg>`;
    }

    static extractAndCreateQRCards(containerElement) {
      // 1. Audio and Podcast elements -> QR Cards
      containerElement.querySelectorAll('audio, .audio-player, a[href$=".mp3"], a[href$=".wav"], a[href*="soundcloud.com"], a[href*="spotify.com"]').forEach(audioEl => {
        let audioSrc = '';
        let audioTitle = 'Zvuková nahrávka';

        if (audioEl.tagName === 'AUDIO') {
          audioSrc = audioEl.getAttribute('src') || audioEl.querySelector('source')?.getAttribute('src') || '';
          audioTitle = audioEl.getAttribute('title') || 'Zvuková ukázka';
        } else if (audioEl.tagName === 'A') {
          audioSrc = audioEl.getAttribute('href') || '';
          audioTitle = audioEl.textContent.trim() || 'Zvuková ukázka';
        }

        if (audioSrc && !audioSrc.startsWith('#') && !audioSrc.startsWith('javascript:')) {
          const card = document.createElement('div');
          card.className = 'doc-callout doc-qr-card doc-element';
          card.setAttribute('data-block-type', 'qr-card');
          card.setAttribute('data-href', audioSrc);

          const svg = this.generateSVG(audioSrc, { margin: 1 });
          card.innerHTML = `
            <div class="doc-qr-canvas-wrapper">${svg}</div>
            <div class="doc-qr-info">
              <span class="doc-qr-badge">🎧 Zvuková ukázka</span>
              <div class="doc-qr-title">${this._escapeHTML(audioTitle)}</div>
              <div class="doc-qr-url">${this._escapeHTML(audioSrc)}</div>
            </div>
          `;
          audioEl.replaceWith(card);
        }
      });

      // 2. Video Callouts without QR codes -> inject QR Code
      containerElement.querySelectorAll('.doc-callout-video').forEach(videoCard => {
        if (!videoCard.querySelector('.doc-qr-canvas-wrapper')) {
          const link = videoCard.querySelector('a[href]');
          const videoUrl = link ? link.getAttribute('href') : '';
          if (videoUrl) {
            const svg = this.generateSVG(videoUrl, { margin: 1 });
            const qrWrapper = document.createElement('div');
            qrWrapper.className = 'doc-qr-canvas-wrapper';
            qrWrapper.style.width = '20mm';
            qrWrapper.style.height = '20mm';
            qrWrapper.style.float = 'left';
            qrWrapper.style.margin = '0 12px 8px 0';
            qrWrapper.innerHTML = svg;
            
            const header = videoCard.querySelector('.doc-callout-header');
            if (header && header.nextSibling) {
              videoCard.insertBefore(qrWrapper, header.nextSibling);
            } else {
              videoCard.prepend(qrWrapper);
            }
          }
        }
      });

      // 3. Web Links -> Insert QR Code Cards immediately AFTER the paragraph / block containing the link
      const blocks = Array.from(containerElement.querySelectorAll('p, li, blockquote, div.doc-element, table, figure'));
      
      let linkCounter = 1;
      const seenUrlsInDocument = new Map();

      blocks.forEach(block => {
        // Skip elements that are inside other QR cards, video cards or TOC
        if (block.closest('.doc-qr-card') || block.closest('.doc-qr-inline-card') || block.closest('.doc-callout-video') || block.closest('.doc-toc-wrapper') || block.closest('.doc-source-meta') || block.classList.contains('doc-qr-card') || block.classList.contains('doc-qr-inline-card') || block.classList.contains('doc-callout-video')) {
          return;
        }

        const linksInBlock = Array.from(block.querySelectorAll('a[href]')).filter(link => {
          const href = (link.getAttribute('href') || '').trim();
          return href && !href.startsWith('#') && !href.startsWith('javascript:');
        });

        if (linksInBlock.length === 0) return;

        // Collect distinct URLs in this specific block
        const blockLinks = [];
        linksInBlock.forEach(link => {
          const href = link.getAttribute('href').trim();
          let num;
          if (seenUrlsInDocument.has(href)) {
            num = seenUrlsInDocument.get(href);
          } else {
            num = linkCounter++;
            seenUrlsInDocument.set(href, num);
          }

          const rawText = link.textContent.replace(/\[QR\s*#\d+\]/g, '').trim();
          if (!blockLinks.some(bl => bl.url === href)) {
            blockLinks.push({
              num: num,
              url: href,
              text: rawText || href
            });
          }

          // Visual badge next to link
          if (!link.querySelector('.qr-ref-sup')) {
            const sup = document.createElement('sup');
            sup.className = 'qr-ref-sup';
            sup.style.color = 'var(--doc-primary, #0284c7)';
            sup.style.fontWeight = '800';
            sup.style.fontSize = '7.5pt';
            link.appendChild(sup);
          }
          link.querySelector('.qr-ref-sup').textContent = ` [QR #${num}]`;
        });

        // Insert QR code card(s) immediately after this block
        if (blockLinks.length > 0) {
          const insertTarget = (block.tagName === 'LI' && block.parentElement) ? block.parentElement : block;

          blockLinks.forEach(item => {
            const card = document.createElement('div');
            card.className = 'doc-callout doc-qr-inline-card doc-element';
            card.setAttribute('data-block-type', 'callout');
            card.setAttribute('data-callout-type', 'qr');
            card.setAttribute('data-block-id', 'blk_qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));

            const svg = this.generateSVG(item.url, { margin: 1 });
            card.innerHTML = `
              <div class="doc-qr-canvas-wrapper">${svg}</div>
              <div class="doc-qr-info">
                <span class="doc-qr-badge">📱 QR #${item.num} — Odkaz z textu</span>
                <div class="doc-qr-title">${this._escapeHTML(item.text)}</div>
                <div class="doc-qr-url"><a href="${this._escapeHTML(item.url)}" target="_blank" rel="noopener">${this._escapeHTML(item.url)}</a></div>
              </div>
            `;

            if (insertTarget.nextSibling) {
              insertTarget.parentNode.insertBefore(card, insertTarget.nextSibling);
            } else {
              insertTarget.parentNode.appendChild(card);
            }
          });
        }
      });
    }



    static _escapeHTML(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }
  }

  /* ==========================================================================
     2. DYNAMIC TABLE OF CONTENTS (TOC) GENERATOR
     ========================================================================== */
  class TOCGenerator {
    static buildTOC(viewportElement, options = {}) {
      const titleText = options.title || 'Obsah dokumentu';
      const tocWrapper = document.createElement('div');
      tocWrapper.className = 'doc-toc-wrapper doc-element';
      tocWrapper.setAttribute('data-block-type', 'toc');
      tocWrapper.setAttribute('data-block-id', 'blk_toc');

      const titleEl = document.createElement('div');
      titleEl.className = 'doc-toc-title';
      titleEl.innerHTML = `<span>📑 ${this._escapeHTML(titleText)}</span>`;
      tocWrapper.appendChild(titleEl);

      const listEl = document.createElement('ul');
      listEl.className = 'doc-toc-list';

      const sheets = Array.from(viewportElement.querySelectorAll('.paper-sheet'));
      let entryCount = 0;

      sheets.forEach((sheet, pageIdx) => {
        const pageNum = pageIdx + 1;
        const headings = Array.from(sheet.querySelectorAll('h1.doc-element, h2.doc-element, h3.doc-element, .doc-h1, .doc-h2, .doc-h3'));

        headings.forEach(h => {
          if (h.closest('.doc-toc-wrapper') || h.textContent.includes('Obsah dokumentu')) return;

          let level = 1;
          if (h.tagName === 'H2' || h.classList.contains('doc-h2')) level = 2;
          else if (h.tagName === 'H3' || h.classList.contains('doc-h3')) level = 3;

          const text = h.textContent.trim().replace(/^title:\s*/i, '').trim();
          if (!text) return;

          entryCount++;
          const li = document.createElement('li');
          li.className = `doc-toc-item level-${level}`;
          li.innerHTML = `
            <span class="doc-toc-label">${this._escapeHTML(text)}</span>
            <span class="doc-toc-leader"></span>
            <span class="doc-toc-page">${pageNum}</span>
          `;

          li.addEventListener('click', () => {
            sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
            h.classList.add('active-selected');
            setTimeout(() => h.classList.remove('active-selected'), 1800);
          });

          listEl.appendChild(li);
        });
      });

      if (entryCount === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'doc-toc-item';
        emptyLi.style.color = 'var(--doc-text-muted, #64748b)';
        emptyLi.textContent = 'Dokument zatím neobsahuje žádné podnadpisy.';
        listEl.appendChild(emptyLi);
      }

      tocWrapper.appendChild(listEl);
      return { element: tocWrapper, count: entryCount };
    }

    static _escapeHTML(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }
  }

  /* ==========================================================================
     3. CONTENT EXTRACTOR & MULTI-PROXY WEB LOADER (With Markdown Tables)
     ========================================================================== */
  class ContentExtractor {
    static async fetchFromUrl(targetUrl, preserveStyles = true) {
      const cleanUrl = targetUrl.trim();
      if (!cleanUrl) throw new Error('Zadejte platnou URL adresu.');

      const proxies = [
        async () => {
          const res = await fetch(cleanUrl, { mode: 'cors' });
          if (res.ok) return await res.text();
          throw new Error('Direct fetch failed');
        },
        async () => {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`);
          if (res.ok) return await res.text();
          throw new Error('CodeTabs failed');
        },
        async () => {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`);
          if (res.ok) return await res.text();
          throw new Error('AllOrigins failed');
        },
        async () => {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`);
          if (res.ok) return await res.text();
          throw new Error('CorsProxy failed');
        },
        async () => {
          const jinaTarget = cleanUrl.startsWith('http') ? cleanUrl : 'https://' + cleanUrl;
          const res = await fetch('https://r.jina.ai/' + jinaTarget, { headers: { 'X-No-Cache': 'true' } });
          if (res.ok) {
            const md = await res.text();
            return { isMarkdown: true, content: md };
          }
          throw new Error('Jina failed');
        }
      ];

      for (const p of proxies) {
        try {
          const data = await p();
          if (data && typeof data === 'object' && data.isMarkdown) {
            return this.parseMarkdownOrHTML(data.content, cleanUrl, preserveStyles);
          }
          if (typeof data === 'string' && data.length > 50 && data.includes('<')) {
            return this.sanitizeRawHTML(data, cleanUrl, preserveStyles);
          }
        } catch (e) {}
      }

      throw new Error(`Zabezpečení webu "${cleanUrl}" zabránilo přímému stažení. Otevřete stránku, zkopírujte text (Ctrl+A, Ctrl+C) a vložte jej do textového pole.`);
    }

    static sanitizeRawHTML(htmlString, sourceUrl = '', preserveStyles = true) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      let baseUrl = sourceUrl || window.location.href;
      try {
        const baseEl = doc.querySelector('base[href]');
        if (baseEl && baseEl.getAttribute('href')) {
          baseUrl = new URL(baseEl.getAttribute('href'), baseUrl).href;
        }
      } catch (e) {}

      this._extractWebPalette(doc);

      if (preserveStyles) {
        this._extractAndInjectStyles(doc);
      }

      this._resolveAllImages(doc, baseUrl);

      const unwantedSelectors = [
        'script', 'noscript', 'nav', 'header', 'footer',
        '.navbar', '.nav', '.footer', '.header', '.ad', '.ads', '.advertisement',
        '.cookie-banner', '.cookie-consent', '.popup', '.modal', '.sidebar', '.aside',
        '.social-share', '.share-buttons', '.comments', '#comments', '.newsletter-signup',
        '.mw-jump-link', '.mw-editsection', '.reference', '.reflist', '.hidden',
        '.screen-reader-text',
        '.breadcrumbs', '.breadcrumb', '#breadcrumbs', '.kadence-breadcrumbs', '#kadence-breadcrumbs',
        '.yoast-breadcrumbs', '.rank-math-breadcrumb', '.schema-breadcrumb', '[aria-label="breadcrumbs"]', '[aria-label="Breadcrumb"]',
        '.menu', '.menu-item', '.site-navigation', '#site-navigation', '.main-navigation', '.sub-menu',
        '.wp-block-navigation', '.wp-block-pages-list', '.widget_nav_menu', '.site-header', '#masthead',
        '.site-footer', '#colophon', '.mobile-header', '#mobile-header',
        '.post-navigation', '.navigation', '.nav-links', '.prev-next', '.pagination', '.nav-previous', '.nav-next',
        '.entry-meta', '.meta', '.post-meta', '.entry-taxonomies', '.term-links', '.category-links',
        '.widget', '.widget-area', '.sidebar', '.elementor-widget-sidebar', '.elementor-nav-menu', '.elementor-widget-nav-menu',
        '.entry-related', '.related-posts', '.related-articles', '.wp-block-latest-posts', '.yarpp-related', '.jp-relatedposts',
        '.splide', '.splide__track', '.carousel',
        '.tags-links', '.cat-links', '.post-categories', '.entry-footer', '.post-author', '.author-box',
        '.toc', '#toc', '.table-of-contents', '.ez-toc-container', '.lwptoc', '.rank-math-toc', '.wp-block-kadence-table-of-contents'
      ];

      unwantedSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      const mainEl = doc.querySelector('.entry-content, .single-content, .post-content, .article-content, .post_content, .article-body, .story-body, .wysiwyg, .mw-parser-output')
                  || doc.querySelector('article, main, #content, .content')
                  || doc.body;

      let title = '';
      const h1El = doc.querySelector('h1.entry-title, .entry-header h1, h1, title');
      if (h1El) {
        title = h1El.textContent.trim().replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').replace(/\s*[-–|].*$/, '').trim();
      }
      if (!title && sourceUrl) {
        try {
          const u = new URL(sourceUrl);
          title = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname).replace(/[-_]/g, ' ');
        } catch (e) {
          title = 'Nová kapitola';
        }
      }
      if (!title) title = 'Nová kapitola';

      const cleanContainer = document.createElement('div');
      cleanContainer.className = 'doc-content';

      const titleH1 = document.createElement('h1');
      titleH1.className = 'doc-element doc-h1';
      titleH1.textContent = title;
      cleanContainer.appendChild(titleH1);

      const flatElements = [];
      this._flattenDomBlocks(mainEl, flatElements, preserveStyles, baseUrl);

      flatElements.forEach(el => {
        const textContent = el.textContent.trim();
        const textLower = textContent.toLowerCase();
        const titleLower = title.toLowerCase();

        if ((el.tagName === 'H1' || el.tagName === 'H2') && (textLower === titleLower || textLower.startsWith(titleLower))) {
          return;
        }

        if (/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(textContent)) {
          return;
        }

        if (/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(textContent)) {
          return;
        }

        if (/^(?:Předchozí článek|Následující článek|Související články|Rubriky|Kategorie|Štítky):/i.test(textContent)) {
          return;
        }

        cleanContainer.appendChild(el);
      });

      return {
        title: title,
        sourceUrl: sourceUrl,
        htmlContent: cleanContainer.innerHTML
      };
    }

    static _flattenDomBlocks(node, results, preserveStyles = true, baseUrl = '') {
      if (!node) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (!tag) return;

      if (['script', 'style', 'noscript', 'nav', 'footer', 'header', 'aside'].includes(tag)) {
        return;
      }

      if (node.classList?.contains('ez-toc-container') || node.classList?.contains('lwptoc') || node.classList?.contains('table-of-contents')) {
        return;
      }

      if (tag === 'iframe' || node.classList?.contains('wp-block-embed') || node.classList?.contains('wp-block-embed-youtube')) {
        const iframe = tag === 'iframe' ? node : node.querySelector('iframe');
        let src = iframe ? (iframe.getAttribute('src') || '') : '';
        const title = iframe ? (iframe.getAttribute('title') || 'Video ukázka') : (node.getAttribute('title') || 'Video ukázka');
        
        let videoId = '';
        if (src.includes('youtube.com/embed/')) {
          videoId = src.split('youtube.com/embed/')[1]?.split('?')[0];
        } else if (src.includes('youtu.be/')) {
          videoId = src.split('youtu.be/')[1]?.split('?')[0];
        }

        if (videoId || src) {
          const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : src;
          const cleanTitle = title.replace(/#\w+/g, '').replace(/&quot;/g, '"').trim() || 'Hudební video ukázka';
          const videoCard = document.createElement('div');
          videoCard.className = 'doc-callout doc-callout-video doc-element';
          videoCard.setAttribute('data-block-type', 'callout');
          videoCard.setAttribute('data-callout-type', 'video');
          const qrSvg = QRGenerator.generateSVG(videoUrl, { margin: 1 });
          videoCard.innerHTML = `
            <div class="doc-callout-header">🎬 Video ukázka: ${this._escapeHTML(cleanTitle)}</div>
            <div style="display: flex; gap: 10px; align-items: center; margin: 6px 0;">
              <div class="doc-qr-canvas-wrapper" style="width: 20mm; height: 20mm; flex-shrink: 0; background: #ffffff; border: 1px solid var(--doc-border, #cbd5e1); border-radius: 4px; padding: 2px;">
                ${qrSvg}
              </div>
              <div style="flex: 1; min-width: 0;">
                <p style="margin: 0 0 3px 0; font-size: 8.5pt;"><strong>Odkaz na nahrávku:</strong> <a href="${videoUrl}" target="_blank" rel="noopener">${videoUrl}</a></p>
                <span style="font-size: 7.5pt; color: var(--doc-text-muted, #64748b);">Naskenujte fotoaparátem telefonu pro přímé spuštění videa</span>
              </div>
            </div>
            ${videoId ? `<div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${this._escapeHTML(cleanTitle)}" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>` : ''}
          `;
          results.push(videoCard);
          return;
        }
      }

      if (tag === 'audio' || node.classList?.contains('wp-block-audio') || node.classList?.contains('audio-player')) {
        const audioEl = tag === 'audio' ? node : node.querySelector('audio');
        const audioSrc = audioEl?.getAttribute('src') || audioEl?.querySelector('source')?.getAttribute('src') || '';
        const audioTitle = node.textContent.trim() || 'Zvuková nahrávka';

        if (audioSrc) {
          const card = document.createElement('div');
          card.className = 'doc-callout doc-qr-card doc-element';
          card.setAttribute('data-block-type', 'qr-card');
          card.setAttribute('data-href', audioSrc);
          const svg = QRGenerator.generateSVG(audioSrc);
          card.innerHTML = `
            <div class="doc-qr-canvas-wrapper">${svg}</div>
            <div class="doc-qr-info">
              <span class="doc-qr-badge">🎧 Zvuková ukázka</span>
              <div class="doc-qr-title">${this._escapeHTML(audioTitle)}</div>
              <div class="doc-qr-url">${this._escapeHTML(audioSrc)}</div>
            </div>
          `;
          results.push(card);
          return;
        }
      }

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = node.textContent.trim();
        const textLower = text.toLowerCase();
        if (text && !/^(?:související články|kam dál|podobné příspěvky|navigace|kategorie|rubriky|obsah)$/i.test(textLower)) {
          const h = document.createElement(tag);
          h.className = `doc-element doc-${tag}`;
          h.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
          results.push(h);
        }
        return;
      }

      if (tag === 'table') {
        const tbl = node.cloneNode(true);
        tbl.className = 'doc-element doc-table';
        tbl.removeAttribute('style');

        tbl.querySelectorAll('img').forEach(img => {
          let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && baseUrl) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {}
          }
          img.setAttribute('src', src);
          img.setAttribute('loading', 'lazy');
          img.setAttribute('onerror', "this.style.display='none'");
        });

        const figWrapper = document.createElement('figure');
        figWrapper.className = 'doc-element doc-table-figure';
        figWrapper.setAttribute('data-block-type', 'figure');
        figWrapper.appendChild(tbl);
        results.push(figWrapper);
        return;
      }

      if (tag === 'figure') {
        const tableInside = node.querySelector('table');
        if (tableInside) {
          const tbl = tableInside.cloneNode(true);
          tbl.className = 'doc-element doc-table';
          tbl.removeAttribute('style');
          tbl.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
            if (src.startsWith('//')) {
              src = 'https:' + src;
            } else if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && baseUrl) {
              try {
                src = new URL(src, baseUrl).href;
              } catch (e) {}
            }
            img.setAttribute('src', src);
            img.setAttribute('loading', 'lazy');
          });

          const figcaption = node.querySelector('figcaption');
          const figWrapper = document.createElement('figure');
          figWrapper.className = 'doc-element doc-table-figure';
          figWrapper.setAttribute('data-block-type', 'figure');
          figWrapper.appendChild(tbl);
          if (figcaption && figcaption.textContent.trim()) {
            const cap = document.createElement('figcaption');
            cap.textContent = figcaption.textContent.trim();
            figWrapper.appendChild(cap);
          }
          results.push(figWrapper);
          return;
        }

        const img = node.querySelector('img');
        if (img) {
          const fig = this._createFigureFromImg(img, baseUrl, node.querySelector('figcaption')?.textContent);
          if (fig) results.push(fig);
          return;
        }
      }

      if (tag === 'img') {
        const fig = this._createFigureFromImg(node, baseUrl);
        if (fig) results.push(fig);
        return;
      }

      if (tag === 'p') {
        const text = node.textContent.trim();
        const img = node.querySelector('img');
        if (img) {
          const fig = this._createFigureFromImg(img, baseUrl);
          if (fig) results.push(fig);
        }
        if (text && !/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(text)) {
          if (!/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(text)) {
            const p = document.createElement('p');
            p.className = 'doc-element';
            p.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
            results.push(p);
          }
        }
        return;
      }

      if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(node.querySelectorAll(':scope > li'));
        const isNavList = items.length > 0 && items.every(li => {
          const a = li.querySelector('a');
          const txt = li.textContent.trim();
          return (a && (txt === 'Domů' || txt === 'Úvod' || a.getAttribute('href')?.includes('/category/') || a.getAttribute('href')?.includes('/tag/') || a.getAttribute('href')?.startsWith('#')));
        });

        if (!isNavList && items.length > 0) {
          const list = document.createElement(tag);
          list.className = 'doc-element';
          items.forEach(li => {
            const cleanLi = document.createElement('li');
            cleanLi.innerHTML = this._cleanInlineContent(li.innerHTML, baseUrl);
            list.appendChild(cleanLi);
          });
          results.push(list);
        }
        return;
      }

      if (tag === 'blockquote') {
        const bq = document.createElement('blockquote');
        bq.className = 'doc-element';
        bq.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
        results.push(bq);
        return;
      }

      if (tag === 'pre') {
        const pre = document.createElement('pre');
        pre.className = 'doc-element';
        pre.textContent = node.textContent;
        results.push(pre);
        return;
      }

      if (tag === 'hr') {
        const hr = document.createElement('hr');
        hr.className = 'doc-element';
        results.push(hr);
        return;
      }

      const children = Array.from(node.children);
      if (children.length > 0) {
        children.forEach(child => {
          this._flattenDomBlocks(child, results, preserveStyles, baseUrl);
        });
      } else {
        const text = node.textContent.trim();
        if (text && text.length > 3 && !/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(text)) {
          if (!/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(text)) {
            const p = document.createElement('p');
            p.className = 'doc-element';
            p.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
            results.push(p);
          }
        }
      }
    }

    static _createFigureFromImg(imgNode, baseUrl, captionText = '') {
      let src = imgNode.getAttribute('src') || imgNode.getAttribute('data-src') || imgNode.getAttribute('data-original') || '';
      if (!src) return null;

      if (src.startsWith('//')) {
        src = 'https:' + src;
      } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && baseUrl) {
        try {
          src = new URL(src, baseUrl).href;
        } catch (e) {}
      }

      const alt = imgNode.getAttribute('alt') || captionText || '';
      const fig = document.createElement('figure');
      fig.className = 'doc-element';
      fig.setAttribute('data-block-type', 'figure');

      fig.innerHTML = `
        <img src="${src}" alt="${this._escapeHTML(alt)}" class="doc-element" loading="lazy" onerror="this.parentElement.style.display='none'">
        ${alt ? `<figcaption>${this._escapeHTML(alt)}</figcaption>` : ''}
      `;
      return fig;
    }

    static _cleanInlineContent(html, baseUrl) {
      let s = html || '';
      s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      s = s.replace(/on\w+="[^"]*"/g, '');
      return s;
    }

    static _resolveAllImages(doc, baseUrl) {
      const images = doc.querySelectorAll('img');
      images.forEach(img => {
        let src = img.getAttribute('src') || '';
        const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || '';
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';

        if ((!src || src.startsWith('data:image')) && dataSrc) {
          src = dataSrc;
        }

        if ((!src || src.startsWith('data:image')) && srcset) {
          const parts = srcset.split(',').map(s => s.trim().split(' ')[0]);
          if (parts.length > 0) src = parts[parts.length - 1];
        }

        if (src) {
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {}
          }
          img.setAttribute('src', src);
        }

        img.setAttribute('loading', 'lazy');
        img.setAttribute('onerror', "this.style.display='none'");
      });
    }

    static _extractAndInjectStyles(doc) {
      const styles = doc.querySelectorAll('style, link[rel="stylesheet"][href*="fonts.googleapis.com"]');
      let combinedCss = '';

      styles.forEach(s => {
        if (s.tagName === 'LINK') {
          const href = s.getAttribute('href');
          if (href && !document.querySelector(`link[href="${href}"]`)) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = href;
            document.head.appendChild(fontLink);
          }
        } else {
          const text = s.textContent;
          if (!text.includes('position:fixed') && !text.includes('position: fixed')) {
            combinedCss += text + '\n';
          }
        }
      });

      if (combinedCss) {
        let styleTag = document.getElementById('doc-imported-web-styles');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'doc-imported-web-styles';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = combinedCss;
      }
    }

    static _extractWebPalette(doc) {
      const themeMeta = doc.querySelector('meta[name="theme-color"]');
      let brandColor = themeMeta ? themeMeta.getAttribute('content') : '#0284c7';
      if (!brandColor || brandColor === '#ffffff' || brandColor === '#000000') brandColor = '#0284c7';

      document.documentElement.style.setProperty('--web-extracted-primary', brandColor);
      document.documentElement.style.setProperty('--web-extracted-secondary', brandColor);
      document.documentElement.style.setProperty('--web-extracted-heading', '#0f172a');
      document.documentElement.style.setProperty('--web-extracted-text', '#1e293b');
      document.documentElement.style.setProperty('--web-extracted-bg', '#f8fafc');
      document.documentElement.style.setProperty('--web-extracted-border', '#cbd5e1');

      const brandInput = document.getElementById('input-brand-color');
      if (brandInput && brandColor.startsWith('#')) {
        brandInput.value = brandColor;
      }
    }

    static parseMarkdownOrHTML(text, sourceUrl = '', preserveStyles = true) {
      const stripped = this._stripMetadataPreamble(text);
      let title = stripped.title;
      let effectiveSourceUrl = sourceUrl || stripped.sourceUrl;
      const cleanInput = stripped.cleanText;

      if (cleanInput.includes('<p>') || cleanInput.includes('<div>') || cleanInput.includes('<article>')) {
        return this.sanitizeRawHTML(cleanInput, effectiveSourceUrl, preserveStyles);
      }

      const lines = cleanInput.split(/\r?\n/);
      let html = '';
      let inList = false;
      let listType = 'ul';

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          continue;
        }

        // Skip metadata, navigation junk & footers
        if (/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?|Warning):\s*/i.test(line)) {
          continue;
        }
        if (/^(?:Domů|Home|Úvod)\s*(?:\/|>|»|›|\|)/i.test(line)) {
          continue;
        }
        if (/^\[?(?:Zpět nahoru|Back to top|Přeskočit na obsah|Skip to content|Jump to)\]?/i.test(line)) {
          continue;
        }
        if (/^\[?(?:Sdílet|Share|Tweet|Facebook|Instagram|LinkedIn|Pinterest)\]?/i.test(line)) {
          continue;
        }
        if (/^(?:Kategorie|Rubriky|Štítky|Tags|Categories|Autor|Author|Publikováno|Vydáno):\s*/i.test(line)) {
          continue;
        }
        if (/^(?:©|Copyright|\(c\))\s*\d{4}/i.test(line) || /Všechna práva vyhrazena/i.test(line)) {
          continue;
        }

        // 1. MARKDOWN TABLE PARSING (| Col 1 | Col 2 |)
        if (line.includes('|') && (i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/.test(lines[i + 1].trim()))) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }

          const tableLines = [];
          while (i < lines.length && lines[i].trim().includes('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }
          i--;

          const tableHtml = this._parseMarkdownTable(tableLines);
          if (tableHtml) {
            html += tableHtml + '\n';
            continue;
          }
        }

        // 2. Headings (# H1, ## H2, etc.)
        if (line.startsWith('#')) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          const levelMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (levelMatch) {
            const level = levelMatch[1].length;
            const hText = this._parseInline(levelMatch[2]);
            const cleanHText = hText.replace(/<[^>]+>/g, '').trim().toLowerCase();
            if (cleanHText === title.toLowerCase() || /^(?:obsah|menu|navigace|související články|kam dál|komentáře)$/i.test(cleanHText)) {
              continue;
            }
            html += `<h${level} class="doc-element doc-h${level}">${hText}</h${level}>\n`;
            continue;
          }
        }

        // 3. Images (![alt](url))
        const imgMatch = line.match(/^!\[(.*?)\]\((https?:\/\/.*?)\)$/);
        if (imgMatch) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          const altText = this._escapeHTML(imgMatch[1]);
          const imgSrc = imgMatch[2];
          html += `
            <figure class="doc-element" data-block-type="figure">
              <img src="${imgSrc}" alt="${altText}" class="doc-element" loading="lazy" onerror="this.parentElement.style.display='none'">
              ${altText ? `<figcaption>${altText}</figcaption>` : ''}
            </figure>\n`;
          continue;
        }

        // 4. Unordered Lists (- item, * item)
        if (/^[-*]\s+/.test(line)) {
          if (/^[-*]\s+\[.*?\]\(.*?\)$/.test(line) && (line.includes('/kategorie/') || line.includes('/tag/') || line.includes('#'))) {
            continue;
          }
          if (!inList || listType !== 'ul') {
            if (inList) html += `</${listType}>\n`;
            html += '<ul class="doc-element">\n';
            inList = true;
            listType = 'ul';
          }
          const itemText = this._parseInline(line.replace(/^[-*]\s+/, ''));
          html += `  <li>${itemText}</li>\n`;
          continue;
        }

        // 5. Ordered Lists (1. item)
        if (/^\d+\.\s+/.test(line)) {
          if (!inList || listType !== 'ol') {
            if (inList) html += `</${listType}>\n`;
            html += '<ol class="doc-element">\n';
            inList = true;
            listType = 'ol';
          }
          const itemText = this._parseInline(line.replace(/^\d+\.\s+/, ''));
          html += `  <li>${itemText}</li>\n`;
          continue;
        }

        if (inList) {
          html += `</${listType}>\n`;
          inList = false;
        }

        html += `<p class="doc-element">${this._parseInline(line)}</p>\n`;
      }

      if (inList) html += `</${listType}>\n`;

      return {
        title: title || 'Nová kapitola',
        sourceUrl: effectiveSourceUrl,
        htmlContent: html
      };
    }

    static _parseMarkdownTable(lines) {
      if (!lines || lines.length < 2) return '';

      const cleanRow = (line) => {
        let row = line.trim();
        if (row.startsWith('|')) row = row.substring(1);
        if (row.endsWith('|')) row = row.substring(0, row.length - 1);
        return row.split('|').map(c => c.trim());
      };

      const headerCells = cleanRow(lines[0]);
      const separatorCells = cleanRow(lines[1]);

      const alignments = separatorCells.map(cell => {
        const trimmed = cell.replace(/\s+/g, '');
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
        if (trimmed.endsWith(':')) return 'right';
        if (trimmed.startsWith(':')) return 'left';
        return 'center';
      });

      let tableHtml = '<figure class="doc-element doc-table-figure" data-block-type="figure"><table class="doc-element doc-table"><thead><tr>';
      headerCells.forEach((h, idx) => {
        const align = alignments[idx] || 'center';
        tableHtml += `<th style="text-align: ${align};">${this._parseInline(h)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      for (let r = 2; r < lines.length; r++) {
        const rowLine = lines[r].trim();
        if (!rowLine || !rowLine.includes('|')) continue;
        const rowCells = cleanRow(rowLine);
        tableHtml += '<tr>';
        for (let c = 0; c < headerCells.length; c++) {
          const cellText = rowCells[c] !== undefined ? rowCells[c] : '';
          const align = alignments[c] || 'center';
          tableHtml += `<td style="text-align: ${align};">${this._parseInline(cellText)}</td>`;
        }
        tableHtml += '</tr>';
      }

      tableHtml += '</tbody></table></figure>';
      return tableHtml;
    }

    static _stripMetadataPreamble(rawText) {
      let title = '';
      let sourceUrl = '';
      let cleanText = rawText || '';

      const lines = cleanText.split(/\r?\n/);
      const remainingLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/^Title:\s*(.*)/i.test(line) && !title) {
          title = line.match(/^Title:\s*(.*)/i)[1].trim();
          continue;
        }
        if (/^URL Source:\s*(.*)/i.test(line) && !sourceUrl) {
          sourceUrl = line.match(/^URL Source:\s*(.*)/i)[1].trim();
          continue;
        }
        remainingLines.push(lines[i]);
      }

      return {
        title: title || 'Nová kapitola',
        sourceUrl: sourceUrl,
        cleanText: remainingLines.join('\n')
      };
    }

    static _parseInline(str) {
      let s = str || '';
      s = s.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, (match, alt, url) => {
        return `<img src="${url}" alt="${this._escapeHTML(alt)}" class="doc-table-img" loading="lazy" style="max-height: 120px; width: auto; margin: 0 auto; display: block;">`;
      });
      s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
      s = s.replace(/`(.*?)`/g, '<code>$1</code>');
      s = s.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return s;
    }

    static _escapeHTML(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }

    static getSampleArticles() {
      return [
        {
          id: 'sax-types-sample',
          title: 'Typy saxofonu – popis, tabulka a transpozice',
          sourceUrl: 'https://www.saxoskola.cz/vse-okolo-saxofonu/popis-saxofonu/typy-saxofonu/',
          htmlContent: `
            <h1 class="doc-element doc-h1">Typy saxofonu</h1>
            <p class="doc-element lead-paragraph">Saxovým záměrem bylo vytvoření celé rodiny saxofonů od sopraninového až po subkontrabasový. Dnes sice tyto nástroje existují, avšak běžnými se staly pouze sopránový (v ladění B), altový (in Es), tenorový (in B) a barytonový (in Es). Tyto nástroje jsou v ladění původně určeném pro vojenské orchestry. Sax sice navrhnul a postavil i nástroje v ladění C (soprán, tenor) a F (alt, baryton) pro využití v symfonickém orchestru, avšak ty se neujaly.</p>
            
            <p class="doc-element">Psaný rozsah pro všechny typy je od malého hes po f (fis)3. Fis3 je v závorce, neboť ne každý saxofon je s horní fis klapkou. Znějící rozsah je pak u sopránového saxofonu as – e (es)3, altového des – a (as)2, tenorového As – e (es)2 a barytonového saxofonu Des – a (as)1.</p>

            <figure class="doc-element doc-table-figure" data-block-type="figure">
              <table class="doc-element doc-image-table" style="width: 100%; border-collapse: collapse; background: #ffffff;">
                <tbody>
                  <tr>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image001.gif" alt="Sopranino sax." style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image002.gif" alt="Sopranino zahnutý" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image003.gif" alt="Soprán sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                  </tr>
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f0f9ff);">
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">sopranino saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">sopranino saxofon (zahnutý)</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">soprán saxofon</td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image004.gif" alt="Soprán zahnutý" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image005.gif" alt="Alt sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image006.gif" alt="Tenor sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                  </tr>
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f0f9ff);">
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">soprán saxofon (zahnutý)</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">alt saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">tenor saxofon</td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image007.gif" alt="Baryton sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image008.gif" alt="Bas sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image009.gif" alt="Kontrabas sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                  </tr>
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f0f9ff);">
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">baryton saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">bas saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">kontrabas saxofon</td>
                  </tr>
                </tbody>
              </table>
              <figcaption style="font-size: 7.5pt; color: #64748b; text-align: center; margin-top: 4px;">Obrázek převzat ze zaniklých stránek saxik.com</figcaption>
            </figure>

            <h2 class="doc-element doc-h2">Rozsah a transpozice nejčastěji používaných saxofonů</h2>
            <figure class="doc-element" data-block-type="figure">
              <img src="https://www.saxoskola.cz/wp-content/uploads/2024/03/Rozsah-a-transpozice-saxu.svg" alt="Rozsah a transpozice saxofonů" class="doc-element" loading="lazy">
              <figcaption>Přehled rozsahu a transpozice hlavních typů saxofonů</figcaption>
            </figure>

            <h2 class="doc-element doc-h2">Stupnice C dur na saxofonu a její transpozice do znějící tóniny</h2>
            <figure class="doc-element" data-block-type="figure">
              <img src="https://www.saxoskola.cz/wp-content/uploads/2024/03/Transpozice-C-dur-Sopran-sax.svg" alt="Transpozice C dur Soprán sax" class="doc-element" loading="lazy">
              <figcaption>Transpozice C dur – Soprán saxofon (in B)</figcaption>
            </figure>

            <figure class="doc-element" data-block-type="figure">
              <img src="https://www.saxoskola.cz/wp-content/uploads/2024/03/Transpozice-C-dur-Alt-sax.svg" alt="Transpozice C dur Alt sax" class="doc-element" loading="lazy">
              <figcaption>Transpozice C dur – Alt saxofon (in Es)</figcaption>
            </figure>

            <figure class="doc-element" data-block-type="figure">
              <img src="https://www.saxoskola.cz/wp-content/uploads/2024/03/Transpozice-C-dur-Tenor-sax.svg" alt="Transpozice C dur Tenor sax" class="doc-element" loading="lazy">
              <figcaption>Transpozice C dur – Tenor saxofon (in B)</figcaption>
            </figure>

            <figure class="doc-element" data-block-type="figure">
              <img src="https://www.saxoskola.cz/wp-content/uploads/2024/03/Transpozice-C-dur-Baryton-sax.svg" alt="Transpozice C dur Baryton sax" class="doc-element" loading="lazy">
              <figcaption>Transpozice C dur – Baryton saxofon (in Es)</figcaption>
            </figure>

            <h2 class="doc-element doc-h2">Soprán, sopranino a soprillo saxofon</h2>
            <div class="doc-callout doc-callout-video doc-element" data-block-type="callout" data-callout-type="video">
              <div class="doc-callout-header">🎬 Video ukázka: Vivaldi – Čtvero ročních dob: Jaro (Soprillo saxofon)</div>
              <p><strong>Odkaz na nahrávku:</strong> <a href="https://www.youtube.com/watch?v=NRf21NQ1btk" target="_blank" rel="noopener">https://www.youtube.com/watch?v=NRf21NQ1btk</a></p>
              <div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/NRf21NQ1btk/hqdefault.jpg" alt="Vivaldi La Primavera soprillo" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>
            </div>

            <h2 class="doc-element doc-h2">Saxofonový orchestr – sopran, alt, tenor, baryton, bass a kontrabas tubax</h2>
            <div class="doc-callout doc-callout-video doc-element" data-block-type="callout" data-callout-type="video">
              <div class="doc-callout-header">🎬 Video ukázka: Mi-Bemol Saxophone Ensemble – Dvořák Novosvětská symfonie č. 9</div>
              <p><strong>Odkaz na nahrávku:</strong> <a href="https://www.youtube.com/watch?v=4FiaRL1Kdnc" target="_blank" rel="noopener">https://www.youtube.com/watch?v=4FiaRL1Kdnc</a></p>
              <div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/4FiaRL1Kdnc/hqdefault.jpg" alt="Mi-Bemol Saxophone Ensemble" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>
            </div>

            <h2 class="doc-element doc-h2">Kontrabas saxofon a tubax</h2>
            <div class="doc-callout doc-callout-video doc-element" data-block-type="callout" data-callout-type="video">
              <div class="doc-callout-header">🎬 Video ukázka: Giant Contrabass Saxophone Duet</div>
              <p><strong>Odkaz na nahrávku:</strong> <a href="https://www.youtube.com/watch?v=VabhcbtK2Cg" target="_blank" rel="noopener">https://www.youtube.com/watch?v=VabhcbtK2Cg</a></p>
              <div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/VabhcbtK2Cg/hqdefault.jpg" alt="GIANT Contrabass Saxophone Duet" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>
            </div>

            <h2 class="doc-element doc-h2">Neobvyklé a unikátní saxofony</h2>
            <div class="doc-callout doc-callout-video doc-element" data-block-type="callout" data-callout-type="video">
              <div class="doc-callout-header">🎬 Video ukázka: Unheard of Instruments in the Saxophone Family</div>
              <p><strong>Odkaz na nahrávku:</strong> <a href="https://www.youtube.com/watch?v=p-b6I1ihh2s" target="_blank" rel="noopener">https://www.youtube.com/watch?v=p-b6I1ihh2s</a></p>
              <div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/p-b6I1ihh2s/hqdefault.jpg" alt="Unheard of Instruments in Saxophone Family" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>
            </div>
          `
        },
        {
          id: 'physics-sample',
          title: 'Kvantová fyzika: Princip neurčitosti a vlnově-korpuskulární dualismus',
          sourceUrl: 'https://cs.wikipedia.org/wiki/Kvantov%C3%A1_mechanika',
          htmlContent: `
            <h1 class="doc-element doc-h1">Kvantová fyzika: Princip neurčitosti a dualismus</h1>
            <p class="doc-element lead-paragraph">Kvantová mechanika představuje fundamentální teorii moderní fyziky, která popisuje chování hmoty a záření na atomární a subatomární úrovni.</p>
            
            <figure class="doc-element" data-block-type="figure">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Double-slit_experiment_results_Tanamura_2.jpg/440px-Double-slit_experiment_results_Tanamura_2.jpg" alt="Dvouštěrbinový experiment" class="doc-element" loading="lazy">
              <figcaption>Obr. 1: Dvouštěrbinový experiment demonstrující postupný vznik interferenčního obrazce elektronů (A. Tonomura).</figcaption>
            </figure>

            <div class="doc-callout doc-callout-def doc-element" data-block-type="callout" data-callout-type="def">
              <div class="doc-callout-header">💡 Definice: Heisenbergův princip neurčitosti</div>
              <p>Nelze současně s libovolnou přesností změřit polohu (x) a hybnost (p) mikročástice:</p>
              <code>Δx · Δp ≥ ℏ / 2</code>
            </div>

            <h2 class="doc-element doc-h2">1. Vlnově-korpuskulární dualismus</h2>
            <p class="doc-element">Každý mikroskopický objekt vykazuje jak vlnové, tak částicové vlastnosti v závislosti na typu experimentu.</p>

            <div class="doc-callout doc-callout-task doc-element" data-block-type="callout" data-callout-type="task">
              <div class="doc-callout-header">✏️ Příklad k procvičení: De Broglieova vlnová délka</div>
              <p>Vypočítejte vlnovou délku elektronu urychleného potenciálovým rozdílem 100 V.</p>
            </div>
          `
        },
        {
          id: 'biology-sample',
          title: 'Buněčná biologie: Fotosyntéza a energetický metabolismus rostlin',
          sourceUrl: 'https://cs.wikipedia.org/wiki/Fotosynt%C3%A9za',
          htmlContent: `
            <h1 class="doc-element doc-h1">Fotosyntéza a energetický metabolismus rostlin</h1>
            <p class="doc-element lead-paragraph">Fotosyntéza je biochemický proces přeměny sluneční energie na chemickou energii organických sloučenin za uvolňování kyslíku.</p>

            <figure class="doc-element" data-block-type="figure">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Photosynthesis_overview.svg/500px-Photosynthesis_overview.svg.png" alt="Schéma fotosyntézy" class="doc-element" loading="lazy">
              <figcaption>Obr. 2: Přehledové schéma fotosyntézy – světelná fáze a Calvinův cyklus.</figcaption>
            </figure>

            <div class="doc-callout doc-callout-summary doc-element" data-block-type="callout" data-callout-type="summary">
              <div class="doc-callout-header">⭐ Souhrnná biochemická rovnice fotosyntézy</div>
              <code>6 CO₂ + 12 H₂O + světelné kvantum (hν) ➔ C₆H₁₂O₆ + 6 O₂ + 6 H₂O</code>
            </div>
          `
        },
        {
          id: 'history-sample',
          title: 'Metodika výuky dějepisu: Kritická analýza historických pramenů',
          sourceUrl: 'https://cs.wikipedia.org/wiki/Historick%C3%BD_pramen',
          htmlContent: `
            <h1 class="doc-element doc-h1">Kritická analýza primárních historických pramenů</h1>
            <p class="doc-element lead-paragraph">Moderní dějepisná výuka opouští memorování letopočtů a staví na badatelsky orientovaném vyučování s primárními prameny.</p>

            <figure class="doc-element" data-block-type="figure">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Declaration_of_Independence_1819_by_John_Trumbull.jpeg/480px-Declaration_of_Independence_1819_by_John_Trumbull.jpeg" alt="Historický pramen" class="doc-element" loading="lazy">
              <figcaption>Obr. 3: Obraz Johna Trumbulla – Umělecké ztvárnění podpisu Deklarace nezávislosti.</figcaption>
            </figure>
          `
        }
      ];
    }
  }

  /* ==========================================================================
     4. CHAPTER MANAGER (With Persistent Block ID Synchronization)
     ========================================================================== */
  class ChapterManager {
    constructor() {
      this.chapters = [];
      this.activeChapterId = null;
      this.listeners = [];
    }

    static ensureBlockIds(htmlContent) {
      if (!htmlContent) return '';
      const temp = document.createElement('div');
      temp.innerHTML = htmlContent;
      let idx = 0;
      Array.from(temp.children).forEach(child => {
        if (!child.getAttribute('data-block-id')) {
          child.setAttribute('data-block-id', 'blk_' + Date.now() + '_' + (idx++));
        }
        child.classList.add('doc-element');
      });
      return temp.innerHTML;
    }

    onChange(callback) {
      this.listeners.push(callback);
    }

    _notify() {
      this.listeners.forEach(cb => cb(this.chapters, this.activeChapterId));
    }

    clear() {
      this.chapters = [];
      this.activeChapterId = null;
      this._notify();
    }

    addChapter(title, htmlContent, sourceUrl = '', metadata = {}) {
      const cleanTitle = (title || 'Nová kapitola').replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').trim();
      const id = 'chap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const rawContent = htmlContent || `<h1 class="doc-element doc-h1">${this._escapeHTML(cleanTitle)}</h1><p class="doc-element">Obsah nové kapitoly...</p>`;
      const indexedContent = ChapterManager.ensureBlockIds(rawContent);

      const chapter = {
        id: id,
        title: cleanTitle,
        subtitle: metadata.subtitle || '',
        sourceUrl: sourceUrl || '',
        htmlContent: indexedContent,
        hasCover: metadata.hasCover || false,
        breakBefore: metadata.breakBefore !== undefined ? metadata.breakBefore : true,
        order: this.chapters.length + 1
      };

      this.chapters.push(chapter);
      if (!this.activeChapterId) {
        this.activeChapterId = id;
      }
      this._notify();
      return chapter;
    }

    removeChapter(id) {
      const idx = this.chapters.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.chapters.splice(idx, 1);
        if (this.activeChapterId === id) {
          this.activeChapterId = this.chapters[0] ? this.chapters[0].id : null;
        }
        this._notify();
      }
    }

    moveChapter(id, direction) {
      const idx = this.chapters.findIndex(c => c.id === id);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= this.chapters.length) return;

      const temp = this.chapters[idx];
      this.chapters[idx] = this.chapters[targetIdx];
      this.chapters[targetIdx] = temp;

      this.chapters.forEach((c, i) => c.order = i + 1);
      this._notify();
    }

    setActiveChapter(id) {
      if (this.activeChapterId !== id) {
        this.activeChapterId = id;
        this._notify();
      }
    }

    getActiveChapter() {
      return this.chapters.find(c => c.id === this.activeChapterId) || this.chapters[0] || null;
    }

    updateActiveChapterContent(html) {
      const active = this.getActiveChapter();
      if (active) {
        active.htmlContent = ChapterManager.ensureBlockIds(html);
        this._notify();
      }
    }

    compileFullDocument(options = {}) {
      let fullHtml = '';
      this.chapters.forEach((ch, idx) => {
        if (idx > 0 && ch.breakBefore) {
          fullHtml += `<div class="doc-element doc-page-break" data-break-before="true" data-chapter-id="${ch.id}" data-chapter-title="${this._escapeHTML(ch.title)}" data-chapter-url="${this._escapeHTML(ch.sourceUrl)}">─── Konec kapitoly / Zlom strany ───</div>`;
        }

        let chapterContent = ChapterManager.ensureBlockIds(ch.htmlContent);
        ch.htmlContent = chapterContent;

        if (options.showSourceInDoc && ch.sourceUrl) {
          const sourceBlock = `<div class="doc-source-meta doc-element" data-chapter-id="${ch.id}" data-chapter-title="${this._escapeHTML(ch.title)}" data-chapter-url="${this._escapeHTML(ch.sourceUrl)}">Zdroj: <a href="${ch.sourceUrl}" target="_blank">${ch.sourceUrl}</a></div>`;
          const h1EndIdx = chapterContent.indexOf('</h1>');
          if (h1EndIdx !== -1) {
            chapterContent = chapterContent.substring(0, h1EndIdx + 5) + sourceBlock + chapterContent.substring(h1EndIdx + 5);
          } else {
            chapterContent = sourceBlock + chapterContent;
          }
        }

        const temp = document.createElement('div');
        temp.innerHTML = chapterContent;
        Array.from(temp.children).forEach(child => {
          child.setAttribute('data-chapter-id', ch.id);
          child.setAttribute('data-chapter-title', ch.title);
          child.setAttribute('data-chapter-url', ch.sourceUrl);
        });

        fullHtml += temp.innerHTML;
      });
      return fullHtml;
    }

    _escapeHTML(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }
  }

  /* ==========================================================================
     5. WYSIWYG PAGINATION ENGINE (Multi-Column Flow & Natural Sazba)
     ========================================================================== */
  class PaginationEngine {
    constructor(viewportElement) {
      this.viewport = viewportElement;
      this.zoomWrapper = document.getElementById('sheet-zoom-wrapper') || viewportElement;
      this.sheets = [];
      this.config = {
        format: 'a4',
        orientation: 'portrait',
        columns: 1,
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 20,
        marginRight: 20,
        mirrorMargins: false,
        diffOddEven: false,
        includeHeader: true,
        includeFooter: true,
        headerLeft: '{chapter_title}',
        headerRight: 'URL Printer Studio',
        footerLeft: 'Vytvořeno v URL Printer Studio',
        footerRight: '{url}',
        headerOddLeft: '{chapter_title}',
        headerOddRight: 'URL Printer Studio',
        headerEvenLeft: 'URL Printer Studio',
        headerEvenRight: '{chapter_title}',
        footerOddLeft: 'Vytvořeno v URL Printer Studio',
        footerOddRight: '{url}',
        footerEvenLeft: '{url}',
        footerEvenRight: 'Vytvořeno v URL Printer Studio',
        pageNumPosition: 'footer-right-odd-left-even',
        pageNumFormat: 'prefix',
        showSourceInDoc: false,
        enableQRFootnotes: true,
        enableAutoTOC: false,
        tocPosition: 'after-title',
        spreadView: false,
        imgBorder: 'none',
        imgShadow: 'none',
        imgRadius: 'sharp',
        imgBg: 'none'
      };
    }

    updateConfig(newConfig) {
      Object.assign(this.config, newConfig);
      if (this.config.spreadView) {
        this.viewport.classList.add('spread-mode');
      } else {
        this.viewport.classList.remove('spread-mode');
      }

      document.body.setAttribute('data-img-border', this.config.imgBorder);
      document.body.setAttribute('data-img-shadow', this.config.imgShadow);
      document.body.setAttribute('data-img-radius', this.config.imgRadius);
      document.body.setAttribute('data-img-bg', this.config.imgBg);
    }

    _getContentHeight(sheetBody) {
      const children = sheetBody.children;
      if (!children || children.length === 0) return 0;
      const lastChild = children[children.length - 1];
      const style = window.getComputedStyle(lastChild);
      const marginBottom = parseFloat(style.marginBottom) || 0;
      return lastChild.offsetTop + lastChild.offsetHeight + marginBottom;
    }

    _checkSheetOverflow(sheetBody, availableHeightPx, isMultiColumn) {
      if (isMultiColumn) {
        if (sheetBody.scrollWidth > sheetBody.clientWidth + 4) return true;
        const children = sheetBody.children;
        if (children.length > 0) {
          const last = children[children.length - 1];
          if (last.offsetLeft + last.offsetWidth > sheetBody.clientWidth + 4) return true;
        }
        return false;
      } else {
        const contentH = this._getContentHeight(sheetBody);
        return contentH > availableHeightPx;
      }
    }

    paginate(rawHtml, activeChapter, chapterList = []) {
      this.zoomWrapper.innerHTML = '';
      this.sheets = [];

      if (!rawHtml || !rawHtml.trim()) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'empty-workspace-card';
        emptyCard.innerHTML = `
          <div class="empty-workspace-icon">🌐</div>
          <div class="empty-workspace-title">Žádný dokument zatím není načten</div>
          <div class="empty-workspace-desc">Zadejte URL adresu článku nebo vložte text pro kontrolovanou sazbu a tisk.</div>
          <button class="btn btn-primary" onclick="document.getElementById('modal-import').classList.add('open')">
            <span>➕ Importovat URL / Text</span>
          </button>
        `;
        this.zoomWrapper.appendChild(emptyCard);
        return { sheetCount: 0, sheets: [] };
      }

      const sandbox = document.createElement('div');
      sandbox.className = 'doc-content';
      sandbox.style.position = 'absolute';
      sandbox.style.visibility = 'hidden';
      sandbox.style.pointerEvents = 'none';
      sandbox.style.top = '-9999px';
      sandbox.style.left = '-9999px';
      sandbox.innerHTML = rawHtml;
      document.body.appendChild(sandbox);

      const wrappers = Array.from(sandbox.querySelectorAll('.doc-chapter-container, .doc-content'));
      wrappers.forEach(wrap => {
        const chId = wrap.getAttribute('data-chapter-id') || '';
        const chTitle = wrap.getAttribute('data-chapter-title') || '';
        const chUrl = wrap.getAttribute('data-chapter-url') || '';
        while (wrap.firstChild) {
          const child = wrap.firstChild;
          if (child.nodeType === Node.ELEMENT_NODE) {
            if (chId && !child.getAttribute('data-chapter-id')) child.setAttribute('data-chapter-id', chId);
            if (chTitle && !child.getAttribute('data-chapter-title')) child.setAttribute('data-chapter-title', chTitle);
            if (chUrl && !child.getAttribute('data-chapter-url')) child.setAttribute('data-chapter-url', chUrl);
          }
          wrap.parentNode.insertBefore(child, wrap);
        }
        wrap.remove();
      });

      if (this.config.enableQRFootnotes) {
        QRGenerator.extractAndCreateQRCards(sandbox);
      }

      let blockIdx = 0;
      sandbox.querySelectorAll('*').forEach(node => {
        if (node.parentElement === sandbox || node.classList.contains('doc-element')) {
          if (!node.getAttribute('data-block-id')) {
            node.setAttribute('data-block-id', 'blk_' + (blockIdx++));
          }
          node.classList.add('doc-element');
        }
      });

      let elements = Array.from(sandbox.children);

      // TOC handling: Insert placeholder in correct spot
      if (this.config.enableAutoTOC) {
        const dummyTOC = document.createElement('div');
        dummyTOC.className = 'doc-toc-wrapper doc-element';
        dummyTOC.setAttribute('data-block-type', 'toc');
        dummyTOC.setAttribute('data-block-id', 'blk_toc');
        dummyTOC.innerHTML = '<div class="doc-toc-title"><span>📑 Obsah dokumentu</span></div><div class="toc-placeholder" style="font-size: 8.5pt; color: var(--doc-text-muted);">Sestavuji obsah...</div>';

        if (this.config.tocPosition === 'standalone-page') {
          dummyTOC.setAttribute('data-break-before', 'true');
          const breakAfter = document.createElement('div');
          breakAfter.className = 'doc-element doc-page-break';
          breakAfter.setAttribute('data-break-before', 'true');

          let insertIndex = 0;
          const firstH1Idx = elements.findIndex(e => e.tagName === 'H1' || e.classList.contains('doc-h1'));
          if (firstH1Idx !== -1) {
            insertIndex = firstH1Idx + 1;
          }
          elements.splice(insertIndex, 0, dummyTOC, breakAfter);
        } else {
          let insertIndex = 0;
          const firstH1Idx = elements.findIndex(e => e.tagName === 'H1' || e.classList.contains('doc-h1'));
          if (firstH1Idx !== -1) {
            insertIndex = firstH1Idx + 1;
          }
          elements.splice(insertIndex, 0, dummyTOC);
        }
      }

      const mmToPx = 3.779528;
      let sheetWidthMm = 210;
      let sheetHeightMm = 297;

      if (this.config.format === 'a5') {
        sheetWidthMm = this.config.orientation === 'portrait' ? 148 : 210;
        sheetHeightMm = this.config.orientation === 'portrait' ? 210 : 148;
      } else if (this.config.format === 'letter') {
        sheetWidthMm = this.config.orientation === 'portrait' ? 215.9 : 279.4;
        sheetHeightMm = this.config.orientation === 'portrait' ? 279.4 : 215.9;
      } else {
        sheetWidthMm = this.config.orientation === 'portrait' ? 210 : 297;
        sheetHeightMm = this.config.orientation === 'portrait' ? 297 : 210;
      }

      const hasPageNumInHeader = (this.config.pageNumPosition || '').startsWith('header');
      const hasPageNumInFooter = (this.config.pageNumPosition || '').startsWith('footer');
      const needHeader = this.config.includeHeader || hasPageNumInHeader;
      const needFooter = this.config.includeFooter || hasPageNumInFooter;

      const headerHeightMm = needHeader ? 12 : 0;
      const footerHeightMm = needFooter ? 12 : 0;
      const availableHeightMm = sheetHeightMm - (this.config.marginTop + this.config.marginBottom + headerHeightMm + footerHeightMm);
      const availableHeightPx = Math.max(120, availableHeightMm * mmToPx);
      const isMultiCol = (this.config.columns || 1) > 1;

      let pageCount = 1;
      let currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
      let currentSheetBody = currentSheet.querySelector('.sheet-body');
      this.zoomWrapper.appendChild(currentSheet);
      this.sheets.push(currentSheet);

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const cloned = el.cloneNode(true);
        cloned.setAttribute('contenteditable', 'true');
        cloned.setAttribute('spellcheck', 'false');
        if (el.getAttribute('data-block-id')) {
          cloned.setAttribute('data-block-id', el.getAttribute('data-block-id'));
        }

        const isManualBreak = el.classList.contains('doc-page-break') || el.getAttribute('data-break-before') === 'true';

        if (isManualBreak && currentSheetBody.children.length > 0) {
          pageCount++;
          currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
          currentSheetBody = currentSheet.querySelector('.sheet-body');
          this.zoomWrapper.appendChild(currentSheet);
          this.sheets.push(currentSheet);
          if (el.classList.contains('doc-page-break')) continue;
        }

        currentSheetBody.appendChild(cloned);

        const exceeds = this._checkSheetOverflow(currentSheetBody, availableHeightPx, isMultiCol);

        // Heading orphan protection
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(cloned.tagName);
        let headingNearBottom = false;
        if (isHeading) {
          if (!isMultiCol) {
            headingNearBottom = this._getContentHeight(currentSheetBody) > (availableHeightPx - 60);
          } else {
            const cols = this.config.columns || 2;
            const inLastCol = cloned.offsetLeft >= (currentSheetBody.clientWidth / cols) * (cols - 1) - 10;
            headingNearBottom = inLastCol && (cloned.offsetTop > availableHeightPx - 60);
          }
        }

        if ((exceeds || headingNearBottom) && currentSheetBody.children.length > 1) {
          // 1. List Item Splitting (<ul>, <ol>)
          if (exceeds && (cloned.tagName === 'UL' || cloned.tagName === 'OL')) {
            const continuationList = this._splitListAcrossPages(cloned, currentSheetBody, availableHeightPx, isMultiCol);
            if (continuationList) {
              pageCount++;
              currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
              currentSheetBody = currentSheet.querySelector('.sheet-body');
              this.zoomWrapper.appendChild(currentSheet);
              this.sheets.push(currentSheet);

              elements.splice(i + 1, 0, continuationList);
              continue;
            }
          }

          // 2. Paragraph Text Splitting
          if (exceeds && (cloned.tagName === 'P' || cloned.tagName === 'BLOCKQUOTE' || (cloned.tagName === 'DIV' && !cloned.classList.contains('doc-callout')))) {
            const continuationEl = this._splitParagraphAcrossPages(cloned, currentSheetBody, availableHeightPx, isMultiCol);
            if (continuationEl) {
              pageCount++;
              currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
              currentSheetBody = currentSheet.querySelector('.sheet-body');
              this.zoomWrapper.appendChild(currentSheet);
              this.sheets.push(currentSheet);

              elements.splice(i + 1, 0, continuationEl);
              continue;
            }
          }

          cloned.remove();

          pageCount++;
          currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
          currentSheetBody = currentSheet.querySelector('.sheet-body');
          this.zoomWrapper.appendChild(currentSheet);
          this.sheets.push(currentSheet);

          currentSheetBody.appendChild(cloned);
        }
      }

      document.body.removeChild(sandbox);
      this._updatePageHeadersAndFooters(pageCount, activeChapter);

      // Auto-repaginate after images finish loading
      const allImgs = Array.from(this.zoomWrapper.querySelectorAll('img'));
      const pendingImgs = allImgs.filter(img => !img.complete || img.naturalHeight === 0);
      if (pendingImgs.length > 0 && !this._imgLoadListenerAttached) {
        this._imgLoadListenerAttached = true;
        let loaded = 0;
        const onImgReady = () => {
          loaded++;
          if (loaded === pendingImgs.length) {
            this._imgLoadListenerAttached = false;
            if (window.app && typeof window.app.repaginate === 'function') {
              window.app.repaginate();
            }
          }
        };
        pendingImgs.forEach(img => {
          img.addEventListener('load', onImgReady, { once: true });
          img.addEventListener('error', onImgReady, { once: true });
        });
      }

      // Populate interactive TOC
      if (this.config.enableAutoTOC) {
        const tocContainers = Array.from(this.zoomWrapper.querySelectorAll('.doc-toc-wrapper'));
        if (tocContainers.length > 0) {
          const computedTOC = TOCGenerator.buildTOC(this.zoomWrapper, {
            title: 'Obsah dokumentu'
          });
          tocContainers[0].replaceWith(computedTOC.element);
          for (let t = 1; t < tocContainers.length; t++) {
            tocContainers[t].remove();
          }
        }
      }

      return {
        sheetCount: this.sheets.length,
        sheets: this.sheets
      };
    }

    _splitListAcrossPages(listEl, currentSheetBody, availableHeightPx, isMultiColumn) {
      const items = Array.from(listEl.querySelectorAll(':scope > li'));
      if (items.length < 2) return null;

      const removedItems = [];
      for (let i = items.length - 1; i >= 1; i--) {
        const item = items[i];
        item.remove();
        removedItems.unshift(item);
        if (!this._checkSheetOverflow(currentSheetBody, availableHeightPx, isMultiColumn)) {
          break;
        }
      }

      if (removedItems.length === 0 || listEl.children.length === 0) {
        removedItems.forEach(it => listEl.appendChild(it));
        return null;
      }

      const nextList = document.createElement(listEl.tagName.toLowerCase());
      nextList.className = listEl.className;
      if (listEl.tagName === 'OL') {
        nextList.setAttribute('start', listEl.children.length + 1);
      }
      removedItems.forEach(it => nextList.appendChild(it));
      return nextList;
    }

    _splitParagraphAcrossPages(pElement, currentSheetBody, availableHeightPx, isMultiColumn) {
      const fullText = pElement.textContent.trim();
      const words = fullText.split(/\s+/);
      if (words.length < 12) return null;

      let low = 0;
      let high = words.length;
      let bestSplit = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        pElement.textContent = words.slice(0, mid).join(' ');
        if (!this._checkSheetOverflow(currentSheetBody, availableHeightPx, isMultiColumn)) {
          bestSplit = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (bestSplit < 5 || bestSplit >= words.length - 4) {
        pElement.textContent = fullText;
        return null;
      }

      pElement.textContent = words.slice(0, bestSplit).join(' ');
      const nextP = document.createElement(pElement.tagName.toLowerCase());
      nextP.className = pElement.className;
      nextP.setAttribute('data-block-id', pElement.getAttribute('data-block-id') + '_cont');
      nextP.textContent = words.slice(bestSplit).join(' ');
      return nextP;
    }

    _createEmptySheet(pageNum, widthMm, heightMm, activeChapter, availableHeightPx, needHeader, needFooter) {
      const isOdd = pageNum % 2 !== 0;
      const sheet = document.createElement('div');
      sheet.className = `paper-sheet ${isOdd ? 'sheet-odd' : 'sheet-even'}`;
      sheet.setAttribute('data-page-num', pageNum);
      sheet.setAttribute('data-format', this.config.format);
      sheet.setAttribute('data-orientation', this.config.orientation);

      sheet.style.width = widthMm + 'mm';
      sheet.style.minHeight = heightMm + 'mm';
      sheet.style.height = heightMm + 'mm';

      let mTop = this.config.marginTop;
      let mBottom = this.config.marginBottom;
      let mLeft = this.config.marginLeft;
      let mRight = this.config.marginRight;

      if (this.config.mirrorMargins) {
        if (!isOdd) {
          mLeft = this.config.marginRight;
          mRight = this.config.marginLeft;
        }
      }

      sheet.style.padding = `${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm`;

      const inner = document.createElement('div');
      inner.className = 'sheet-inner';

      if (needHeader) {
        const header = document.createElement('div');
        header.className = 'sheet-header';
        header.innerHTML = `
          <div class="header-slot-left"></div>
          <div class="header-slot-center"></div>
          <div class="header-slot-right"></div>
        `;
        inner.appendChild(header);
      }

      const body = document.createElement('div');
      body.className = 'sheet-body';
      body.setAttribute('data-columns', this.config.columns || 1);
      if ((this.config.columns || 1) > 1 && availableHeightPx) {
        body.style.height = availableHeightPx + 'px';
      }
      inner.appendChild(body);

      if (needFooter) {
        const footer = document.createElement('div');
        footer.className = 'sheet-footer';
        footer.innerHTML = `
          <div class="footer-slot-left"></div>
          <div class="footer-slot-center"></div>
          <div class="footer-slot-right"></div>
        `;
        inner.appendChild(footer);
      }

      sheet.appendChild(inner);
      return sheet;
    }

    _updatePageHeadersAndFooters(totalPages, activeChapter) {
      this.sheets.forEach((sheet, idx) => {
        const pageNum = idx + 1;
        const isOdd = pageNum % 2 !== 0;

        const chapterContainer = sheet.querySelector('[data-chapter-title]');
        const chapterTitle = chapterContainer?.getAttribute('data-chapter-title') || activeChapter?.title || 'Dokument';
        const chapterUrl = chapterContainer?.getAttribute('data-chapter-url') || activeChapter?.sourceUrl || '';

        let pageStr = `${pageNum}`;
        if (this.config.pageNumFormat === 'prefix') pageStr = `Strana ${pageNum} z ${totalPages}`;
        else if (this.config.pageNumFormat === 'short') pageStr = `s. ${pageNum} / ${totalPages}`;
        else if (this.config.pageNumFormat === 'simple') pageStr = `${pageNum}`;
        else if (this.config.pageNumFormat === 'roman') pageStr = this._toRoman(pageNum);

        const formatTokens = (txt) => {
          if (!txt) return '';
          return txt
            .replace(/{chapter_title}/g, chapterTitle)
            .replace(/{url}/g, chapterUrl)
            .replace(/{page}/g, pageNum)
            .replace(/{total_pages}/g, totalPages);
        };

        let hLeft = this.config.headerLeft;
        let hRight = this.config.headerRight;
        let fLeft = this.config.footerLeft;
        let fRight = this.config.footerRight;

        if (this.config.diffOddEven) {
          hLeft = isOdd ? this.config.headerOddLeft : this.config.headerEvenLeft;
          hRight = isOdd ? this.config.headerOddRight : this.config.headerEvenRight;
          fLeft = isOdd ? this.config.footerOddLeft : this.config.footerEvenLeft;
          fRight = isOdd ? this.config.footerOddRight : this.config.footerEvenRight;
        }

        const headerLeftEl = sheet.querySelector('.header-slot-left');
        const headerCenterEl = sheet.querySelector('.header-slot-center');
        const headerRightEl = sheet.querySelector('.header-slot-right');

        const footerLeftEl = sheet.querySelector('.footer-slot-left');
        const footerCenterEl = sheet.querySelector('.footer-slot-center');
        const footerRightEl = sheet.querySelector('.footer-slot-right');

        // Header text visibility
        if (this.config.includeHeader) {
          if (headerLeftEl) headerLeftEl.textContent = formatTokens(hLeft);
          if (headerRightEl) headerRightEl.textContent = formatTokens(hRight);
        } else {
          if (headerLeftEl) headerLeftEl.textContent = '';
          if (headerRightEl) headerRightEl.textContent = '';
        }

        // Footer text visibility
        if (this.config.includeFooter) {
          if (footerLeftEl) footerLeftEl.textContent = formatTokens(fLeft);
          if (footerRightEl) footerRightEl.textContent = formatTokens(fRight);
        } else {
          if (footerLeftEl) footerLeftEl.textContent = '';
          if (footerRightEl) footerRightEl.textContent = '';
        }

        // Independent Page Numbering
        const pos = this.config.pageNumPosition;
        if (pos !== 'none') {
          const pageSpan = `<span class="page-number-display">${pageStr}</span>`;

          if (pos === 'footer-right-odd-left-even') {
            if (isOdd && footerRightEl) footerRightEl.innerHTML = pageSpan;
            else if (!isOdd && footerLeftEl) footerLeftEl.innerHTML = pageSpan;
          } else if (pos === 'footer-center' && footerCenterEl) {
            footerCenterEl.innerHTML = pageSpan;
          } else if (pos === 'footer-right' && footerRightEl) {
            footerRightEl.innerHTML = pageSpan;
          } else if (pos === 'header-right-odd-left-even') {
            if (isOdd && headerRightEl) headerRightEl.innerHTML = pageSpan;
            else if (!isOdd && headerLeftEl) headerLeftEl.innerHTML = pageSpan;
          } else if (pos === 'header-center' && headerCenterEl) {
            headerCenterEl.innerHTML = pageSpan;
          }
        }
      });
    }

    _toRoman(num) {
      const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
      let roman = '';
      for (const i in lookup) {
        while (num >= lookup[i]) {
          roman += i;
          num -= lookup[i];
        }
      }
      return roman || 'I';
    }
  }

  /* ==========================================================================
     6. OPTIMIZED BLOCK INSPECTOR (Full 200% Sizing & Grab-and-Drag Sliders)
     ========================================================================== */
  class BlockInspector {
    constructor(panelElement, onBlockModified, onLiveUpdate) {
      this.panel = panelElement;
      this.onBlockModified = onBlockModified;
      this.onLiveUpdate = onLiveUpdate;
      this.selectedElement = null;
      this.currentInspectedId = null;
    }

    inspect(element) {
      this.selectedElement = element;
      if (!element) {
        this.renderEmpty();
        return;
      }

      const rightSidebar = document.getElementById('inspector-panel');
      if (rightSidebar && rightSidebar.classList.contains('collapsed')) {
        rightSidebar.classList.remove('collapsed');
        document.getElementById('btn-toggle-right-sidebar')?.classList.add('active');
      }

      this.renderInspector(element);
    }

    reselectAfterRepagination(blockId, forceRerender = true) {
      if (!blockId) {
        this.renderEmpty();
        return;
      }
      const el = document.querySelector(`#sheet-zoom-wrapper [data-block-id="${blockId}"]`);
      if (el) {
        this.selectedElement = el;
        document.querySelectorAll('#sheet-zoom-wrapper .active-selected').forEach(e => e.classList.remove('active-selected'));
        el.classList.add('active-selected');
        if (forceRerender) {
          this.renderInspector(el);
        }
      } else {
        this.renderEmpty();
      }
    }

    renderEmpty() {
      this.currentInspectedId = null;
      this.panel.innerHTML = `
        <div class="inspector-header">
          <span>Vlastnosti bloku</span>
        </div>
        <div class="inspector-body">
          <div style="text-align: center; padding: 40px 10px; color: var(--ui-text-muted);">
            <div style="font-size: 28px; margin-bottom: 8px;">👆</div>
            <div style="font-weight: 700; font-size: 13px; color: var(--ui-text-heading); margin-bottom: 4px;">Žádný blok není vybrán</div>
            <div style="font-size: 11px;">Klikněte na libovolný text, obrázek či tabulku na stránce pro zobrazení parametrů.</div>
          </div>
        </div>
      `;
    }

    renderInspector(el) {
      const tag = el.tagName.toLowerCase();
      const isImg = tag === 'img' || tag === 'figure' || el.querySelector('img') !== null;
      const isText = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li'].includes(tag);

      const blockId = el.getAttribute('data-block-id') || '';
      this.currentInspectedId = blockId;

      const currentAlign = el.getAttribute('data-align') || el.style.textAlign || 'left';
      const hasBreakBefore = el.getAttribute('data-break-before') === 'true' || el.classList.contains('doc-page-break');

      let currentFontSize = parseInt(window.getComputedStyle(el).fontSize, 10) || 14;
      let currentScale = parseInt(el.getAttribute('data-scale') || '100', 10);

      this.panel.innerHTML = `
        <div class="inspector-header">
          <span>Vlastnosti: &lt;${tag}&gt;</span>
          <button id="btn-insp-close" class="chapter-btn-icon" title="Zavřít panel">&times;</button>
        </div>

        <div class="inspector-body">
          
          <div class="inspector-section-card">
            <div class="inspector-sec-title">Typ textového bloku</div>
            <select id="insp-tag-select" class="control-select" ${!isText ? 'disabled' : ''}>
              <option value="h1" ${tag === 'h1' ? 'selected' : ''}>H1 — Hlavní nadpis</option>
              <option value="h2" ${tag === 'h2' ? 'selected' : ''}>H2 — Sekční nadpis</option>
              <option value="h3" ${tag === 'h3' ? 'selected' : ''}>H3 — Podnadpis 3. úrovně</option>
              <option value="h4" ${tag === 'h4' ? 'selected' : ''}>H4 — Menší podnadpis</option>
              <option value="p" ${tag === 'p' ? 'selected' : ''}>Odstavec textu</option>
              <option value="blockquote" ${tag === 'blockquote' ? 'selected' : ''}>Citace (Quote)</option>
              <option value="pre" ${tag === 'pre' ? 'selected' : ''}>Kód / Monospace</option>
            </select>
          </div>

          <div class="inspector-section-card">
            <div class="inspector-sec-title">Zarovnání prvku</div>
            <div class="align-btn-group">
              <button class="align-btn ${currentAlign === 'left' ? 'active' : ''}" id="insp-align-left" title="Zarovnat vlevo">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'center' ? 'active' : ''}" id="insp-align-center" title="Zarovnat na střed">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'right' ? 'active' : ''}" id="insp-align-right" title="Zarovnat vpravo">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'justify' ? 'active' : ''}" id="insp-align-justify" title="Zarovnat do bloku" ${!isText ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <div class="inspector-section-card ${!isText ? 'inspector-control-disabled' : ''}">
            <div class="inspector-sec-title">Velikost písma (pt / px)</div>
            <div class="slider-num-pair">
              <input type="range" id="insp-range-fontsize" min="8" max="48" value="${currentFontSize}">
              <input type="number" id="insp-num-fontsize" min="8" max="48" value="${currentFontSize}">
            </div>
          </div>

          ${isImg ? `
          <div class="inspector-section-card" style="border-color: var(--pastel-blue-border); background: var(--pastel-blue-bg);">
            <div class="inspector-sec-title" style="color: var(--pastel-blue-text);">🖼️ Přizpůsobení obrázku</div>
            
            <div class="control-group">
              <label class="control-sublabel">Velikost obrázku (10 % – 200 %)</label>
              <div class="slider-num-pair">
                <input type="range" id="insp-img-range-width" min="10" max="200" value="${currentScale}">
                <input type="number" id="insp-img-num-width" min="10" max="200" value="${currentScale}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 4px;">
              <button class="btn btn-secondary" id="insp-img-w33" style="padding: 4px;">33%</button>
              <button class="btn btn-secondary" id="insp-img-w50" style="padding: 4px;">50%</button>
              <button class="btn btn-secondary" id="insp-img-w75" style="padding: 4px;">75%</button>
              <button class="btn btn-secondary" id="insp-img-w100" style="padding: 4px;">100%</button>
              <button class="btn btn-secondary" id="insp-img-w150" style="padding: 4px;">150%</button>
              <button class="btn btn-secondary" id="insp-img-w200" style="padding: 4px;">200%</button>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button class="btn btn-secondary" id="insp-img-toggle-border" style="flex: 1; font-size: 11px;">Rámeček</button>
              <button class="btn btn-secondary" id="insp-img-toggle-shadow" style="flex: 1; font-size: 11px;">Stín</button>
            </div>
          </div>
          ` : ''}

          <div class="inspector-section-card">
            <label class="chk-label">
              <input type="checkbox" id="insp-toggle-break" ${hasBreakBefore ? 'checked' : ''}>
              <span>Zalomit stránku před tímto blokem</span>
            </label>
          </div>

          <div class="inspector-section-card">
            <div class="inspector-sec-title">Manipulace s blokem</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button class="btn btn-secondary" id="insp-move-up">▲ Posunout výše</button>
              <button class="btn btn-secondary" id="insp-move-down">▼ Posunout níže</button>
              <button class="btn btn-secondary" id="insp-duplicate-btn">📋 Duplikovat</button>
              <button class="btn btn-secondary" id="insp-delete-btn" style="color: #dc2626;">🗑️ Odstranit</button>
            </div>
          </div>

        </div>
      `;

      this._bindInspectorEvents(el, blockId);
    }

    _bindInspectorEvents(el, blockId) {
      document.getElementById('btn-insp-close')?.addEventListener('click', () => this.renderEmpty());

      // 1. Tag Selector
      document.getElementById('insp-tag-select')?.addEventListener('change', (e) => {
        const newTag = e.target.value;
        this.onBlockModified((target, parent) => {
          const replacement = document.createElement(newTag);
          replacement.className = `doc-element doc-${newTag}`;
          replacement.innerHTML = target.innerHTML;
          const curId = target.getAttribute('data-block-id') || blockId;
          replacement.setAttribute('data-block-id', curId);
          if (target.getAttribute('data-align')) {
            replacement.setAttribute('data-align', target.getAttribute('data-align'));
            replacement.style.textAlign = target.getAttribute('data-align');
          }
          if (target.getAttribute('data-break-before')) {
            replacement.setAttribute('data-break-before', target.getAttribute('data-break-before'));
          }
          parent.replaceChild(replacement, target);
        }, blockId);
      });

      // 2. Alignment Buttons
      const applyAlign = (align) => {
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`insp-align-${align}`)?.classList.add('active');

        this.onBlockModified((target) => {
          target.setAttribute('data-align', align);
          target.classList.remove('align-left', 'align-center', 'align-right', 'align-justify');
          target.classList.add(`align-${align}`);
          target.style.textAlign = align;

          const img = target.tagName === 'IMG' ? target : target.querySelector('img');
          if (img) {
            if (align === 'center') img.style.margin = '6px auto';
            else if (align === 'right') img.style.margin = '6px 0 6px auto';
            else img.style.margin = '6px auto 6px 0';
          }
        }, blockId);
      };

      document.getElementById('insp-align-left')?.addEventListener('click', () => applyAlign('left'));
      document.getElementById('insp-align-center')?.addEventListener('click', () => applyAlign('center'));
      document.getElementById('insp-align-right')?.addEventListener('click', () => applyAlign('right'));
      document.getElementById('insp-align-justify')?.addEventListener('click', () => applyAlign('justify'));

      // 3. Smooth Font Size Slider
      const rangeFs = document.getElementById('insp-range-fontsize');
      const numFs = document.getElementById('insp-num-fontsize');

      const updateFontSizeLive = (size) => {
        const s = parseInt(size, 10) || 14;
        if (numFs && numFs.value !== String(s)) numFs.value = s;
        if (rangeFs && rangeFs.value !== String(s)) rangeFs.value = s;

        if (this.selectedElement) {
          this.selectedElement.style.fontSize = s + 'px';
        }

        this.onLiveUpdate((target) => {
          target.style.fontSize = s + 'px';
        }, blockId);
      };

      rangeFs?.addEventListener('input', (e) => updateFontSizeLive(e.target.value));
      rangeFs?.addEventListener('change', (e) => {
        const s = parseInt(e.target.value, 10) || 14;
        this.onBlockModified((target) => {
          target.style.fontSize = s + 'px';
        }, blockId);
      });

      numFs?.addEventListener('change', (e) => {
        const s = parseInt(e.target.value, 10) || 14;
        updateFontSizeLive(s);
        this.onBlockModified((target) => {
          target.style.fontSize = s + 'px';
        }, blockId);
      });

      // 4. Smooth Image & Table Sizing (10% - 200%)
      const rangeIw = document.getElementById('insp-img-range-width');
      const numIw = document.getElementById('insp-img-num-width');

      const applyImgWidthLive = (w) => {
        const scale = parseInt(w, 10) || 100;
        if (numIw && numIw.value !== String(scale)) numIw.value = scale;
        if (rangeIw && rangeIw.value !== String(scale)) rangeIw.value = scale;

        const applyToNode = (node) => {
          node.setAttribute('data-scale', scale);
          const isTable = node.tagName === 'TABLE' || node.querySelector('table');
          if (isTable) {
            const tbl = node.tagName === 'TABLE' ? node : node.querySelector('table');
            tbl.style.width = Math.min(100, scale) + '%';
            tbl.querySelectorAll('img').forEach(im => {
              im.style.maxHeight = Math.round(140 * (scale / 100)) + 'px';
              im.style.width = 'auto';
            });
          } else {
            const img = node.tagName === 'IMG' ? node : node.querySelector('img');
            if (img) {
              img.style.maxWidth = scale + '%';
              img.style.width = scale + '%';
              img.style.height = 'auto';
              img.style.maxHeight = 'none';
              img.style.display = 'block';
              img.style.margin = '6px auto';
            }
            if (node.tagName === 'FIGURE') {
              node.style.maxWidth = Math.max(100, scale) + '%';
              node.style.width = scale > 100 ? scale + '%' : '100%';
            }
          }
        };

        if (this.selectedElement) {
          applyToNode(this.selectedElement);
        }

        this.onLiveUpdate(applyToNode, blockId);
      };

      rangeIw?.addEventListener('input', (e) => applyImgWidthLive(e.target.value));
      rangeIw?.addEventListener('change', (e) => {
        const scale = parseInt(e.target.value, 10) || 100;
        this.onBlockModified((target) => {
          target.setAttribute('data-scale', scale);
          const isTable = target.tagName === 'TABLE' || target.querySelector('table');
          if (isTable) {
            const tbl = target.tagName === 'TABLE' ? target : target.querySelector('table');
            tbl.style.width = Math.min(100, scale) + '%';
            tbl.querySelectorAll('img').forEach(im => {
              im.style.maxHeight = Math.round(140 * (scale / 100)) + 'px';
              im.style.width = 'auto';
            });
          } else {
            const img = target.tagName === 'IMG' ? target : target.querySelector('img');
            if (img) {
              img.style.maxWidth = scale + '%';
              img.style.width = scale + '%';
              img.style.height = 'auto';
              img.style.maxHeight = 'none';
              img.style.display = 'block';
              img.style.margin = '6px auto';
            }
            if (target.tagName === 'FIGURE') {
              target.style.maxWidth = Math.max(100, scale) + '%';
              target.style.width = scale > 100 ? scale + '%' : '100%';
            }
          }
        }, blockId);
      });

      numIw?.addEventListener('change', (e) => {
        const scale = parseInt(e.target.value, 10) || 100;
        applyImgWidthLive(scale);
        this.onBlockModified((target) => {
          target.setAttribute('data-scale', scale);
          const isTable = target.tagName === 'TABLE' || target.querySelector('table');
          if (isTable) {
            const tbl = target.tagName === 'TABLE' ? target : target.querySelector('table');
            tbl.style.width = Math.min(100, scale) + '%';
            tbl.querySelectorAll('img').forEach(im => {
              im.style.maxHeight = Math.round(140 * (scale / 100)) + 'px';
              im.style.width = 'auto';
            });
          } else {
            const img = target.tagName === 'IMG' ? target : target.querySelector('img');
            if (img) {
              img.style.maxWidth = scale + '%';
              img.style.width = scale + '%';
              img.style.height = 'auto';
              img.style.maxHeight = 'none';
              img.style.display = 'block';
              img.style.margin = '6px auto';
            }
            if (target.tagName === 'FIGURE') {
              target.style.maxWidth = Math.max(100, scale) + '%';
              target.style.width = scale > 100 ? scale + '%' : '100%';
            }
          }
        }, blockId);
      });

      // 5. Preset Size Buttons
      const setPresetScale = (scale) => {
        applyImgWidthLive(scale);
        this.onBlockModified((target) => {
          target.setAttribute('data-scale', scale);
          const isTable = target.tagName === 'TABLE' || target.querySelector('table');
          if (isTable) {
            const tbl = target.tagName === 'TABLE' ? target : target.querySelector('table');
            tbl.style.width = Math.min(100, scale) + '%';
            tbl.querySelectorAll('img').forEach(im => {
              im.style.maxHeight = Math.round(140 * (scale / 100)) + 'px';
              im.style.width = 'auto';
            });
          } else {
            const img = target.tagName === 'IMG' ? target : target.querySelector('img');
            if (img) {
              img.style.maxWidth = scale + '%';
              img.style.width = scale + '%';
              img.style.height = 'auto';
              img.style.maxHeight = 'none';
              img.style.display = 'block';
              img.style.margin = '6px auto';
            }
            if (target.tagName === 'FIGURE') {
              target.style.maxWidth = Math.max(100, scale) + '%';
              target.style.width = scale > 100 ? scale + '%' : '100%';
            }
          }
        }, blockId);
      };

      document.getElementById('insp-img-w33')?.addEventListener('click', () => setPresetScale(33));
      document.getElementById('insp-img-w50')?.addEventListener('click', () => setPresetScale(50));
      document.getElementById('insp-img-w75')?.addEventListener('click', () => setPresetScale(75));
      document.getElementById('insp-img-w100')?.addEventListener('click', () => setPresetScale(100));
      document.getElementById('insp-img-w150')?.addEventListener('click', () => setPresetScale(150));
      document.getElementById('insp-img-w200')?.addEventListener('click', () => setPresetScale(200));

      // 6. Border & Shadow Toggles
      document.getElementById('insp-img-toggle-border')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          const img = target.tagName === 'IMG' ? target : target.querySelector('img');
          if (img) {
            const hasBorder = img.style.border && img.style.border !== 'none';
            img.style.border = hasBorder ? 'none' : '1.5px solid #0f172a';
          }
        }, blockId);
      });

      document.getElementById('insp-img-toggle-shadow')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          const img = target.tagName === 'IMG' ? target : target.querySelector('img');
          if (img) {
            const hasShadow = img.style.boxShadow && img.style.boxShadow !== 'none';
            img.style.boxShadow = hasShadow ? 'none' : '0 4px 14px rgba(0, 0, 0, 0.15)';
          }
        }, blockId);
      });

      // 7. Page Break Toggle
      document.getElementById('insp-toggle-break')?.addEventListener('change', (e) => {
        this.onBlockModified((target) => {
          if (e.target.checked) target.setAttribute('data-break-before', 'true');
          else target.removeAttribute('data-break-before');
        }, blockId);
      });

      // 8. Reordering, Duplication & Deletion
      document.getElementById('insp-move-up')?.addEventListener('click', () => {
        this.onBlockModified((target, parent) => {
          const prev = target.previousElementSibling;
          if (prev) parent.insertBefore(target, prev);
        }, blockId);
      });

      document.getElementById('insp-move-down')?.addEventListener('click', () => {
        this.onBlockModified((target, parent) => {
          const next = target.nextElementSibling;
          if (next) parent.insertBefore(next, target);
        }, blockId);
      });

      document.getElementById('insp-duplicate-btn')?.addEventListener('click', () => {
        const newId = 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.onBlockModified((target, parent) => {
          const clone = target.cloneNode(true);
          clone.setAttribute('data-block-id', newId);
          parent.insertBefore(clone, target.nextSibling);
        }, blockId);
      });

      document.getElementById('insp-delete-btn')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          target.remove();
        }, blockId);
        this.renderEmpty();
      });
    }
  }

  /* ==========================================================================
     7. WORD / DOCX EXPORTER (Exact Word XML Margins)
     ========================================================================== */
  class WordExporter {
    static exportToDocx(htmlContent, title = 'Dokument', config = {}) {
      const cleanTitle = (title || 'Dokument').replace(/[\\/:*?"<>|]/g, '_');
      const mTop = config.marginTop || 20;
      const mBottom = config.marginBottom || 20;
      const mLeft = config.marginLeft || 20;
      const mRight = config.marginRight || 20;

      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${this._escapeHTML(cleanTitle)}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt;
              margin: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;
              mso-header-margin: 36pt;
              mso-footer-margin: 36pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.4; color: #1e293b; }
            h1 { font-size: 22pt; font-weight: bold; color: #0284c7; margin-top: 18pt; margin-bottom: 6pt; page-break-after: avoid; }
            h2 { font-size: 16pt; font-weight: bold; color: #0369a1; border-bottom: 1.5pt solid #bae6fd; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 4pt; page-break-after: avoid; }
            h3 { font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 10pt; margin-bottom: 3pt; page-break-after: avoid; }
            p { margin-bottom: 6pt; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
            th { background-color: #f0f9ff; color: #0f172a; font-weight: bold; border: 1pt solid #cbd5e1; padding: 6pt; text-align: center; }
            td { border: 1pt solid #cbd5e1; padding: 6pt; vertical-align: middle; text-align: center; }
            img { max-width: 100%; height: auto; display: block; margin: 6pt auto; }
            blockquote { border-left: 3.5pt solid #0284c7; background: #f0f9ff; padding: 6pt 10pt; font-style: italic; margin: 8pt 0; }
            .doc-callout { border-left: 4.5pt solid #0284c7; background: #f0f9ff; padding: 8pt 10pt; margin: 8pt 0; }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    static _escapeHTML(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }
  }

  /* ==========================================================================
     8. PROJECT STORAGE & HISTORY
     ========================================================================== */
  class ProjectStorage {
    static getHistory() {
      try {
        return JSON.parse(localStorage.getItem('urlprint_history') || '[]');
      } catch (e) {
        return [];
      }
    }

    static saveToHistory(projectData) {
      try {
        const history = this.getHistory();
        const existingIdx = history.findIndex(p => p.id === projectData.id);
        if (existingIdx !== -1) history.splice(existingIdx, 1);
        history.unshift(projectData);
        if (history.length > 25) history.pop();
        localStorage.setItem('urlprint_history', JSON.stringify(history));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }

    static deleteProject(id) {
      const history = this.getHistory().filter(p => p.id !== id);
      localStorage.setItem('urlprint_history', JSON.stringify(history));
    }

    static clearHistory() {
      localStorage.removeItem('urlprint_history');
    }
  }

  /* ==========================================================================
     9. URL PRINTER APPLICATION CORE
     ========================================================================== */
  class URLPrinterApp {
    constructor() {
      this.chapterManager = new ChapterManager();
      this.paginationEngine = new PaginationEngine(document.getElementById('sheet-viewport'));
      
      this.inspector = new BlockInspector(
        document.getElementById('inspector-panel'),
        (mutatorFn, blockId) => this._modifyBlock(mutatorFn, blockId),
        (mutatorFn, blockId) => this._liveUpdateBlock(mutatorFn, blockId)
      );

      this.currentZoom = 100;
      this.historyStack = [];
      this.historyIndex = -1;

      this._init();
    }

    _init() {
      this._bindTopBarActions();
      this._bindSidebarTabs();
      this._bindLayoutControls();
      this._bindDrawerEvents();
      this._bindModals();
      this._bindDragAndDrop();
      this._bindCanvasInteractions();

      this._syncUIFromConfig(this.paginationEngine.config);

      this.chapterManager.onChange((chapters, activeId) => {
        this._renderChapterTree(chapters, activeId);
        this.repaginate();
      });

      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault();
          this.redo();
        }
      });
    }

    _syncUIFromConfig(config) {
      if (!config) return;

      // Paper Format, Orientation & Columns
      const selFormat = document.getElementById('sel-paper-format');
      if (selFormat && config.format) selFormat.value = config.format;

      const selOrient = document.getElementById('sel-orientation');
      if (selOrient && config.orientation) selOrient.value = config.orientation;

      const selCols = document.getElementById('sel-columns');
      if (selCols && config.columns !== undefined) selCols.value = config.columns;

      // Margins (Inputs & Sliders)
      const setMarginUI = (numId, rangeId, val) => {
        const numEl = document.getElementById(numId);
        const rangeEl = document.getElementById(rangeId);
        if (numEl && val !== undefined) numEl.value = val;
        if (rangeEl && val !== undefined) rangeEl.value = val;
      };
      setMarginUI('num-margin-top', 'range-margin-top', config.marginTop);
      setMarginUI('num-margin-bottom', 'range-margin-bottom', config.marginBottom);
      setMarginUI('num-margin-left', 'range-margin-left', config.marginLeft);
      setMarginUI('num-margin-right', 'range-margin-right', config.marginRight);

      // Mirror Margins
      const chkMirror = document.getElementById('chk-mirror-margins');
      if (chkMirror && config.mirrorMargins !== undefined) {
        chkMirror.checked = !!config.mirrorMargins;
        const lblL = document.getElementById('lbl-margin-left');
        const lblR = document.getElementById('lbl-margin-right');
        if (lblL) lblL.textContent = chkMirror.checked ? 'Vnitřní okraj (Vazba)' : 'Levý okraj';
        if (lblR) lblR.textContent = chkMirror.checked ? 'Vnější okraj' : 'Pravý okraj';
      }

      // Headers & Footers Enable
      const chkH = document.getElementById('chk-enable-header');
      if (chkH && config.includeHeader !== undefined) chkH.checked = !!config.includeHeader;

      const chkF = document.getElementById('chk-enable-footer');
      if (chkF && config.includeFooter !== undefined) chkF.checked = !!config.includeFooter;

      // Diff Odd/Even
      const chkDiff = document.getElementById('chk-diff-odd-even');
      const simplePanel = document.getElementById('hf-simple-mode-panel');
      const advPanel = document.getElementById('hf-advanced-mode-panel');
      if (chkDiff && config.diffOddEven !== undefined) {
        chkDiff.checked = !!config.diffOddEven;
        if (simplePanel) simplePanel.style.display = chkDiff.checked ? 'none' : 'flex';
        if (advPanel) advPanel.style.display = chkDiff.checked ? 'flex' : 'none';
      }

      // Header & Footer Texts
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el && v !== undefined) el.value = v;
      };
      setVal('input-header-left', config.headerLeft);
      setVal('input-header-right', config.headerRight);
      setVal('input-footer-left', config.footerLeft);
      setVal('input-footer-right', config.footerRight);

      setVal('input-header-odd-left', config.headerOddLeft);
      setVal('input-header-odd-right', config.headerOddRight);
      setVal('input-header-even-left', config.headerEvenLeft);
      setVal('input-header-even-right', config.headerEvenRight);

      setVal('input-footer-odd-left', config.footerOddLeft);
      setVal('input-footer-odd-right', config.footerOddRight);
      setVal('input-footer-even-left', config.footerEvenLeft);
      setVal('input-footer-even-right', config.footerEvenRight);

      // Page Numbers Position & Format
      const selPos = document.getElementById('sel-page-num-position');
      if (selPos && config.pageNumPosition) selPos.value = config.pageNumPosition;

      const selFormatNum = document.getElementById('sel-page-num-format');
      if (selFormatNum && config.pageNumFormat) selFormatNum.value = config.pageNumFormat;

      // Table of Contents (TOC)
      const chkTOC = document.getElementById('chk-enable-toc');
      if (chkTOC && config.enableAutoTOC !== undefined) chkTOC.checked = !!config.enableAutoTOC;

      const selTOCPos = document.getElementById('sel-toc-position');
      if (selTOCPos && config.tocPosition) selTOCPos.value = config.tocPosition;

      // QR & Media Mode
      const chkQR = document.getElementById('chk-enable-qr');
      if (chkQR && config.enableQRFootnotes !== undefined) chkQR.checked = !!config.enableQRFootnotes;

      const selMedia = document.getElementById('sel-media-mode');
      if (selMedia && config.mediaMode) {
        selMedia.value = config.mediaMode;
        document.body.setAttribute('data-media-mode', config.mediaMode);
      }

      // Themes & Fonts
      if (config.theme) {
        document.body.setAttribute('data-theme', config.theme);
        const selTheme = document.getElementById('sel-preset-template');
        if (selTheme) selTheme.value = config.theme;
      }
      if (config.font) {
        document.body.setAttribute('data-font', config.font);
        const selFont = document.getElementById('sel-font-family');
        if (selFont) selFont.value = config.font;
      }
      if (config.brandColor) {
        document.documentElement.style.setProperty('--doc-primary', config.brandColor);
        const inputBrand = document.getElementById('input-brand-color');
        if (inputBrand) inputBrand.value = config.brandColor;
      }
    }

    repaginate() {
      const activeChap = this.chapterManager.getActiveChapter();
      const rawHtml = activeChap ? this.chapterManager.compileFullDocument(this.paginationEngine.config) : '';
      
      const res = this.paginationEngine.paginate(rawHtml, activeChap, this.chapterManager.chapters);

      const countEl = document.getElementById('stat-sheet-count');
      if (countEl) countEl.textContent = `${res.sheetCount} stran`;

      const totalPagesEl = document.getElementById('stat-total-pages');
      if (totalPagesEl) totalPagesEl.textContent = `${res.sheetCount || 1}`;

      const jumpInput = document.getElementById('input-jump-page');
      if (jumpInput) jumpInput.max = res.sheetCount || 1;

      this._renderThumbnails(res.sheets);
      this._renderDrawerTOC();
    }

    _liveUpdateBlock(mutatorFn, targetBlockId) {
      const activeChap = this.chapterManager.getActiveChapter();
      if (!activeChap || !activeChap.htmlContent) return;

      activeChap.htmlContent = ChapterManager.ensureBlockIds(activeChap.htmlContent);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = activeChap.htmlContent;

      let targetInMaster = null;
      if (targetBlockId) {
        targetInMaster = tempDiv.querySelector(`[data-block-id="${targetBlockId}"]`);
      }

      if (targetInMaster) {
        mutatorFn(targetInMaster, targetInMaster.parentElement || tempDiv);
        activeChap.htmlContent = tempDiv.innerHTML;
      }
    }

    _modifyBlock(mutatorFn, targetBlockId) {
      const activeChap = this.chapterManager.getActiveChapter();
      if (!activeChap || !activeChap.htmlContent) return;

      const viewport = document.getElementById('sheet-viewport');
      const savedScrollTop = viewport ? viewport.scrollTop : 0;

      activeChap.htmlContent = ChapterManager.ensureBlockIds(activeChap.htmlContent);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = activeChap.htmlContent;

      let targetInMaster = null;
      if (targetBlockId) {
        targetInMaster = tempDiv.querySelector(`[data-block-id="${targetBlockId}"]`);
      }

      if (!targetInMaster) {
        const selectedId = this.inspector.selectedElement?.getAttribute('data-block-id');
        if (selectedId) {
          targetInMaster = tempDiv.querySelector(`[data-block-id="${selectedId}"]`);
        }
      }

      if (!targetInMaster && this.inspector.selectedElement) {
        const selectedEl = this.inspector.selectedElement;
        const allSheetElements = Array.from(document.querySelectorAll('#sheet-zoom-wrapper .sheet-body > .doc-element'));
        const elementIndex = allSheetElements.indexOf(selectedEl);
        if (elementIndex >= 0 && elementIndex < tempDiv.children.length) {
          targetInMaster = tempDiv.children[elementIndex];
        }
      }

      if (targetInMaster) {
        mutatorFn(targetInMaster, targetInMaster.parentElement || tempDiv);
        activeChap.htmlContent = tempDiv.innerHTML;
        this.repaginate();
        this._recordHistory();

        if (viewport) {
          viewport.scrollTop = savedScrollTop;
        }

        const reselectedId = targetInMaster.isConnected ? (targetInMaster.getAttribute('data-block-id') || targetBlockId) : null;
        this.inspector.reselectAfterRepagination(reselectedId, true);
      }
    }

    _recordHistory() {
      const activeChap = this.chapterManager.getActiveChapter();
      if (!activeChap) return;

      if (this.historyIndex < this.historyStack.length - 1) {
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
      }

      this.historyStack.push(activeChap.htmlContent);
      if (this.historyStack.length > 30) this.historyStack.shift();
      this.historyIndex = this.historyStack.length - 1;
      this._updateUndoRedoButtons();
    }

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        const content = this.historyStack[this.historyIndex];
        this.chapterManager.updateActiveChapterContent(content);
        this._updateUndoRedoButtons();
      }
    }

    redo() {
      if (this.historyIndex < this.historyStack.length - 1) {
        this.historyIndex++;
        const content = this.historyStack[this.historyIndex];
        this.chapterManager.updateActiveChapterContent(content);
        this._updateUndoRedoButtons();
      }
    }

    _updateUndoRedoButtons() {
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
      if (btnRedo) btnRedo.disabled = this.historyIndex >= this.historyStack.length - 1;
    }

    _bindTopBarActions() {
      document.getElementById('btn-new-project')?.addEventListener('click', () => {
        if (confirm('Chcete založit nový čistý projekt? Neuložené změny budou smazány.')) {
          this.chapterManager.clear();
          this.historyStack = [];
          this.historyIndex = -1;
          this._updateUndoRedoButtons();
          this.repaginate();
          document.getElementById('modal-import')?.classList.add('open');
        }
      });

      document.getElementById('btn-open-import')?.addEventListener('click', () => {
        document.getElementById('modal-import')?.classList.add('open');
      });

      document.getElementById('btn-open-projects-top')?.addEventListener('click', () => {
        this._renderProjectHistoryModal();
        document.getElementById('modal-projects')?.classList.add('open');
      });

      document.getElementById('btn-save-project-top')?.addEventListener('click', () => {
        this._saveCurrentProject();
      });

      document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
      document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());

      const applyZoom = (val) => {
        this.currentZoom = Math.max(25, Math.min(300, val));
        const zoomWrapper = document.getElementById('sheet-zoom-wrapper');
        if (zoomWrapper) {
          zoomWrapper.style.transform = `scale(${this.currentZoom / 100})`;
        }
        const inputZ = document.getElementById('input-zoom-val');
        if (inputZ) inputZ.value = this.currentZoom;
      };

      document.getElementById('btn-zoom-out')?.addEventListener('click', () => applyZoom(this.currentZoom - 10));
      document.getElementById('btn-zoom-in')?.addEventListener('click', () => applyZoom(this.currentZoom + 10));
      document.getElementById('input-zoom-val')?.addEventListener('change', (e) => applyZoom(parseInt(e.target.value, 10) || 100));

      const jumpToPage = (pageNum) => {
        const sheets = this.paginationEngine.sheets;
        const pageIdx = Math.max(0, Math.min(sheets.length - 1, pageNum - 1));
        if (sheets[pageIdx]) {
          sheets[pageIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
          const jumpInput = document.getElementById('input-jump-page');
          if (jumpInput) jumpInput.value = pageIdx + 1;
        }
      };

      document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        const jumpInput = document.getElementById('input-jump-page');
        const curr = parseInt(jumpInput?.value || '1', 10);
        jumpToPage(curr - 1);
      });

      document.getElementById('btn-next-page')?.addEventListener('click', () => {
        const jumpInput = document.getElementById('input-jump-page');
        const curr = parseInt(jumpInput?.value || '1', 10);
        jumpToPage(curr + 1);
      });

      document.getElementById('input-jump-page')?.addEventListener('change', (e) => {
        jumpToPage(parseInt(e.target.value, 10) || 1);
      });

      document.getElementById('btn-zoom-spread')?.addEventListener('click', (e) => {
        const active = e.currentTarget.classList.toggle('active');
        this.paginationEngine.updateConfig({ spreadView: active });
      });

      document.getElementById('btn-toggle-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });

      document.getElementById('btn-toggle-left-sidebar')?.addEventListener('click', (e) => {
        const leftSidebar = document.getElementById('app-sidebar-left');
        const active = e.currentTarget.classList.toggle('active');
        if (leftSidebar) leftSidebar.classList.toggle('collapsed', !active);
      });

      document.getElementById('btn-toggle-right-sidebar')?.addEventListener('click', (e) => {
        const rightPanel = document.getElementById('inspector-panel');
        const active = e.currentTarget.classList.toggle('active');
        if (rightPanel) rightPanel.classList.toggle('collapsed', !active);
      });

      document.getElementById('btn-export-docx')?.addEventListener('click', () => {
        const activeChap = this.chapterManager.getActiveChapter();
        const html = this.chapterManager.compileFullDocument(this.paginationEngine.config);
        WordExporter.exportToDocx(html, activeChap ? activeChap.title : 'Dokument', this.paginationEngine.config);
        this._showToast('✨ Dokument byl úspěšně exportován do Wordu');
      });

      document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
        window.print();
      });
    }

    _bindSidebarTabs() {
      const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const tabName = btn.getAttribute('data-tab');
          document.getElementById('tab-chapters').style.display = tabName === 'chapters' ? 'flex' : 'none';
          document.getElementById('tab-layout').style.display = tabName === 'layout' ? 'flex' : 'none';
          document.getElementById('tab-themes').style.display = tabName === 'themes' ? 'flex' : 'none';
        });
      });
    }

    _bindLayoutControls() {
      document.getElementById('sel-paper-format')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ format: e.target.value });
        this.repaginate();
      });

      document.getElementById('sel-orientation')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ orientation: e.target.value });
        this.repaginate();
      });

      document.getElementById('sel-columns')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ columns: parseInt(e.target.value, 10) || 1 });
        this.repaginate();
      });

      const bindMargin = (numId, rangeId, configKey) => {
        const numEl = document.getElementById(numId);
        const rangeEl = document.getElementById(rangeId);
        const update = (val) => {
          const v = parseInt(val, 10) || 20;
          if (numEl) numEl.value = v;
          if (rangeEl) rangeEl.value = v;
          const conf = {};
          conf[configKey] = v;
          this.paginationEngine.updateConfig(conf);
          this.repaginate();
        };
        numEl?.addEventListener('change', (e) => update(e.target.value));
        rangeEl?.addEventListener('input', (e) => update(e.target.value));
      };

      bindMargin('num-margin-top', 'range-margin-top', 'marginTop');
      bindMargin('num-margin-bottom', 'range-margin-bottom', 'marginBottom');
      bindMargin('num-margin-left', 'range-margin-left', 'marginLeft');
      bindMargin('num-margin-right', 'range-margin-right', 'marginRight');

      document.getElementById('chk-mirror-margins')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ mirrorMargins: e.target.checked });
        const lblL = document.getElementById('lbl-margin-left');
        const lblR = document.getElementById('lbl-margin-right');
        if (lblL) lblL.textContent = e.target.checked ? 'Vnitřní okraj (Vazba)' : 'Levý okraj';
        if (lblR) lblR.textContent = e.target.checked ? 'Vnější okraj' : 'Pravý okraj';
        this.repaginate();
      });

      const chkDiffOddEven = document.getElementById('chk-diff-odd-even');
      const simplePanel = document.getElementById('hf-simple-mode-panel');
      const advPanel = document.getElementById('hf-advanced-mode-panel');

      chkDiffOddEven?.addEventListener('change', (e) => {
        const isDiff = e.target.checked;
        if (simplePanel) simplePanel.style.display = isDiff ? 'none' : 'flex';
        if (advPanel) advPanel.style.display = isDiff ? 'flex' : 'none';
        this.paginationEngine.updateConfig({ diffOddEven: isDiff });
        this.repaginate();
      });

      const updateHeaderFooterConfig = () => {
        this.paginationEngine.updateConfig({
          includeHeader: document.getElementById('chk-enable-header')?.checked ?? true,
          includeFooter: document.getElementById('chk-enable-footer')?.checked ?? true,
          headerLeft: document.getElementById('input-header-left')?.value || '',
          headerRight: document.getElementById('input-header-right')?.value || '',
          footerLeft: document.getElementById('input-footer-left')?.value || '',
          footerRight: document.getElementById('input-footer-right')?.value || '',
          headerOddLeft: document.getElementById('input-header-odd-left')?.value || '',
          headerOddRight: document.getElementById('input-header-odd-right')?.value || '',
          headerEvenLeft: document.getElementById('input-header-even-left')?.value || '',
          headerEvenRight: document.getElementById('input-header-even-right')?.value || '',
          footerOddLeft: document.getElementById('input-footer-odd-left')?.value || '',
          footerOddRight: document.getElementById('input-footer-odd-right')?.value || '',
          footerEvenLeft: document.getElementById('input-footer-even-left')?.value || '',
          footerEvenRight: document.getElementById('input-footer-even-right')?.value || '',
          pageNumPosition: document.getElementById('sel-page-num-position')?.value || 'footer-right-odd-left-even',
          pageNumFormat: document.getElementById('sel-page-num-format')?.value || 'prefix'
        });
        this.repaginate();
      };

      document.querySelectorAll('#hf-simple-mode-panel input, #hf-advanced-mode-panel input, #sel-page-num-position, #sel-page-num-format, #chk-enable-header, #chk-enable-footer').forEach(el => {
        el.addEventListener('input', updateHeaderFooterConfig);
        el.addEventListener('change', updateHeaderFooterConfig);
      });

      // Table of Contents (TOC) Controls
      document.getElementById('chk-enable-toc')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ enableAutoTOC: e.target.checked });
        this.repaginate();
      });

      document.getElementById('sel-toc-position')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ tocPosition: e.target.value });
        this.repaginate();
      });

      // QR & Media Mode Controls
      document.getElementById('chk-enable-qr')?.addEventListener('change', (e) => {
        this.paginationEngine.updateConfig({ enableQRFootnotes: e.target.checked });
        this.repaginate();
      });

      document.getElementById('sel-media-mode')?.addEventListener('change', (e) => {
        const mode = e.target.value;
        document.body.setAttribute('data-media-mode', mode);
        this.paginationEngine.updateConfig({ mediaMode: mode });
        this.repaginate();
      });


      document.getElementById('sel-preset-template')?.addEventListener('change', (e) => {
        document.body.setAttribute('data-theme', e.target.value);
        this.repaginate();
      });

      document.getElementById('sel-font-family')?.addEventListener('change', (e) => {
        document.body.setAttribute('data-font', e.target.value);
        this.repaginate();
      });

      document.getElementById('input-brand-color')?.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--doc-primary', e.target.value);
        this.repaginate();
      });

      document.getElementById('insert-separator-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const sep = document.createElement('div');
          sep.className = 'doc-separator doc-separator-solid doc-element';
          sep.setAttribute('data-block-type', 'separator');
          sep.setAttribute('data-block-id', 'blk_' + Date.now());
          sep.innerHTML = '<hr>';
          parent.insertBefore(sep, target.nextSibling);
        });
        this._showToast('➕ Oddělovač byl vložen');
      });

      document.getElementById('insert-note-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const box = document.createElement('div');
          box.className = 'doc-callout doc-callout-task doc-element';
          box.setAttribute('data-block-type', 'callout');
          box.setAttribute('data-block-id', 'blk_' + Date.now());
          box.innerHTML = `
            <div class="doc-callout-header">✏️ Úkol / Otázka k zamyšlení</div>
            <p>Zde napište zadání úlohy nebo poznámku k tématu...</p>
          `;
          parent.insertBefore(box, target.nextSibling);
        });
        this._showToast('➕ Box poznámky byl vložen');
      });

      document.getElementById('insert-lines-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const lines = document.createElement('div');
          lines.className = 'doc-notes-area doc-element';
          lines.setAttribute('data-block-type', 'notes');
          lines.setAttribute('data-block-id', 'blk_' + Date.now());
          lines.innerHTML = `
            <div class="doc-notes-title"><span>Místo pro vlastní poznámky</span></div>
            <div class="doc-notes-lines"></div>
          `;
          parent.insertBefore(lines, target.nextSibling);
        });
        this._showToast('➕ Linkovaná plocha byla vložena');
      });

      document.getElementById('insert-dots-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const dots = document.createElement('div');
          dots.className = 'doc-notes-area doc-element';
          dots.setAttribute('data-block-type', 'notes');
          dots.setAttribute('data-block-id', 'blk_' + Date.now());
          dots.innerHTML = `
            <div class="doc-notes-title"><span>Místo pro náčrtky a schémata (5 mm)</span></div>
            <div class="doc-notes-dots"></div>
          `;
          parent.insertBefore(dots, target.nextSibling);
        });
        this._showToast('➕ Tečkovaná mřížka byla vložena');
      });
    }

    _bindDrawerEvents() {
      const toggleBtn = document.getElementById('btn-toggle-drawer');
      const drawer = document.getElementById('canvas-drawer-panel');
      const closeBtn = document.getElementById('btn-close-drawer');

      const toggleDrawer = () => {
        const isOpen = drawer?.classList.toggle('open');
        toggleBtn?.classList.toggle('drawer-open', isOpen);
      };

      toggleBtn?.addEventListener('click', toggleDrawer);
      closeBtn?.addEventListener('click', () => {
        drawer?.classList.remove('open');
        toggleBtn?.classList.remove('drawer-open');
      });

      const tabThumbs = document.getElementById('drawer-tab-thumbs');
      const tabTOC = document.getElementById('drawer-tab-toc');
      const listThumbs = document.getElementById('drawer-thumbs-list');
      const treeTOC = document.getElementById('drawer-toc-tree');

      tabThumbs?.addEventListener('click', () => {
        tabThumbs.classList.add('active');
        tabTOC?.classList.remove('active');
        if (listThumbs) listThumbs.style.display = 'flex';
        if (treeTOC) treeTOC.style.display = 'none';
      });

      tabTOC?.addEventListener('click', () => {
        tabTOC.classList.add('active');
        tabThumbs?.classList.remove('active');
        if (listThumbs) listThumbs.style.display = 'none';
        if (treeTOC) treeTOC.style.display = 'flex';
      });
    }

    _renderThumbnails(sheets) {
      const thumbsList = document.getElementById('drawer-thumbs-list');
      if (!thumbsList) return;
      thumbsList.innerHTML = '';

      const targetThumbWidth = 136;

      sheets.forEach((sheet, idx) => {
        const pageNum = idx + 1;
        const card = document.createElement('div');
        card.className = 'drawer-thumb-card';

        const frame = document.createElement('div');
        frame.className = 'drawer-thumb-frame';

        const sheetWidth = sheet.offsetWidth || (sheet.getAttribute('data-orientation') === 'landscape' ? 1123 : 794);
        const sheetHeight = sheet.offsetHeight || (sheet.getAttribute('data-orientation') === 'landscape' ? 794 : 1123);
        const scale = targetThumbWidth / sheetWidth;
        const thumbHeight = Math.round(sheetHeight * scale);

        frame.style.width = targetThumbWidth + 'px';
        frame.style.height = thumbHeight + 'px';

        const clonedSheet = sheet.cloneNode(true);
        clonedSheet.classList.remove('active-selected');
        clonedSheet.querySelectorAll('.active-selected').forEach(el => el.classList.remove('active-selected'));
        clonedSheet.removeAttribute('id');
        clonedSheet.style.margin = '0';
        clonedSheet.style.boxShadow = 'none';
        clonedSheet.style.border = 'none';
        clonedSheet.style.position = 'absolute';
        clonedSheet.style.top = '0';
        clonedSheet.style.left = '0';
        clonedSheet.style.transformOrigin = 'top left';
        clonedSheet.style.transform = `scale(${scale})`;
        clonedSheet.style.pointerEvents = 'none';
        clonedSheet.style.userSelect = 'none';

        frame.appendChild(clonedSheet);

        const footer = document.createElement('div');
        footer.className = 'drawer-thumb-footer';
        footer.textContent = `Strana ${pageNum}`;

        card.appendChild(frame);
        card.appendChild(footer);

        card.addEventListener('click', () => {
          sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.drawer-thumb-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        });

        thumbsList.appendChild(card);
      });
    }


    _renderDrawerTOC() {
      const treeTOC = document.getElementById('drawer-toc-tree');
      if (!treeTOC) return;
      treeTOC.innerHTML = '';

      const sheets = this.paginationEngine.sheets;
      let count = 0;

      sheets.forEach((sheet, idx) => {
        const pageNum = idx + 1;
        sheet.querySelectorAll('h1.doc-element, h2.doc-element, h3.doc-element, .doc-h1, .doc-h2, .doc-h3').forEach(h => {
          const text = h.textContent.trim();
          if (!text || h.closest('.doc-toc-wrapper')) return;
          count++;

          const item = document.createElement('div');
          let level = 'h1';
          if (h.tagName === 'H2' || h.classList.contains('doc-h2')) level = 'h2';
          else if (h.tagName === 'H3' || h.classList.contains('doc-h3')) level = 'h3';

          item.className = `drawer-toc-item level-${level}`;
          item.innerHTML = `
            <span>${this.chapterManager._escapeHTML(text)}</span>
            <span style="font-weight: 700; font-size: 10px; color: var(--ui-text-muted);">s. ${pageNum}</span>
          `;

          item.addEventListener('click', () => {
            sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
            h.classList.add('active-selected');
            setTimeout(() => h.classList.remove('active-selected'), 1800);
          });

          treeTOC.appendChild(item);
        });
      });

      if (count === 0) {
        treeTOC.innerHTML = '<div style="font-size: 11px; color: var(--ui-text-muted); padding: 10px;">Žádné nadpisy nebyly nalezeny.</div>';
      }
    }

    _bindCanvasInteractions() {
      const viewport = document.getElementById('sheet-viewport');
      viewport?.addEventListener('click', (e) => {
        if (e.target.closest('.canvas-drawer') || e.target.closest('.canvas-drawer-toggle')) return;

        let target = e.target.closest('.sheet-body > *');
        if (!target) {
          target = e.target.closest('.doc-element');
        }

        if (target && !target.classList.contains('sheet-body') && !target.classList.contains('paper-sheet') && !target.classList.contains('sheet-zoom-wrapper') && !target.classList.contains('sheet-inner') && !target.classList.contains('sheet-header') && !target.classList.contains('sheet-footer')) {
          viewport.querySelectorAll('.active-selected').forEach(el => el.classList.remove('active-selected'));
          target.classList.add('active-selected');
          this.inspector.inspect(target);
        }
      });

      viewport?.addEventListener('input', (e) => {
        const target = e.target.closest('.doc-element');
        if (target) {
          const blockId = target.getAttribute('data-block-id');
          if (blockId) {
            const activeChap = this.chapterManager.getActiveChapter();
            if (activeChap && activeChap.htmlContent) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = activeChap.htmlContent;
              const targetInMaster = tempDiv.querySelector(`[data-block-id="${blockId}"]`);
              if (targetInMaster) {
                targetInMaster.innerHTML = target.innerHTML;
                activeChap.htmlContent = tempDiv.innerHTML;
              }
            }
          }
        }
      });
    }

    _bindModals() {
      const modal = document.getElementById('modal-import');
      const closeBtn = document.getElementById('modal-import-close');
      const btnExecuteImport = document.getElementById('btn-execute-import');

      closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });

      document.querySelectorAll('.sample-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const sampleId = pill.getAttribute('data-sample-id');
          const sample = ContentExtractor.getSampleArticles().find(s => s.id === sampleId);
          if (sample) {
            this.chapterManager.addChapter(sample.title, sample.htmlContent, sample.sourceUrl);
            modal?.classList.remove('open');
            this._showToast('✅ Vzorová lekce byla načtena');
          }
        });
      });

      btnExecuteImport?.addEventListener('click', async () => {
        const urlInputEl = document.getElementById('import-url-input');
        const textInputEl = document.getElementById('import-text-input');
        const preserveStyles = document.getElementById('chk-preserve-web-styles')?.checked ?? true;

        const urlInput = urlInputEl?.value.trim() || '';
        const textInput = textInputEl?.value.trim() || '';

        if (urlInput) {
          btnExecuteImport.textContent = '⏳ Stahuji z webu...';
          btnExecuteImport.disabled = true;
          try {
            const parsed = await ContentExtractor.fetchFromUrl(urlInput, preserveStyles);
            this.chapterManager.addChapter(parsed.title, parsed.htmlContent, urlInput);
            modal?.classList.remove('open');
            if (urlInputEl) urlInputEl.value = '';
            this._showToast('✅ Článek byl úspěšně načten z webu');
          } catch (err) {
            alert(err.message);
          } finally {
            btnExecuteImport.textContent = 'Importovat a vysázet';
            btnExecuteImport.disabled = false;
          }
        } else if (textInput) {
          const parsed = ContentExtractor.parseMarkdownOrHTML(textInput, '', preserveStyles);
          this.chapterManager.addChapter(parsed.title, parsed.htmlContent, '');
          modal?.classList.remove('open');
          if (textInputEl) textInputEl.value = '';
          this._showToast('✅ Text byl vložen a vysázen');
        }
      });
    }

    _bindDragAndDrop() {
      const dropOverlay = document.getElementById('drop-zone-overlay');
      window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay?.classList.add('active');
      });

      window.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null) dropOverlay?.classList.remove('active');
      });

      window.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay?.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file) this._loadProjectFromFile(file);
      });
    }

    _renderChapterTree(chapters, activeId) {
      const treeList = document.getElementById('chapter-tree-list');
      if (!treeList) return;
      treeList.innerHTML = '';

      const countBadge = document.getElementById('stat-chapter-count');
      if (countBadge) countBadge.textContent = `${chapters.length} ${chapters.length === 1 ? 'kapitola' : 'kapitol'}`;

      chapters.forEach((ch, idx) => {
        const item = document.createElement('div');
        item.className = `chapter-item ${ch.id === activeId ? 'active' : ''}`;
        item.innerHTML = `
          <span class="chapter-handle">⠿</span>
          <span class="chapter-badge">#${idx + 1}</span>
          <span class="chapter-name">${this.chapterManager._escapeHTML(ch.title)}</span>
          <div class="chapter-actions">
            <button class="chapter-btn-icon btn-move-up" title="Posunout nahoru">▲</button>
            <button class="chapter-btn-icon btn-move-down" title="Posunout dolů">▼</button>
            <button class="chapter-btn-icon btn-del-chap" title="Odstranit kapitolu">&times;</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.chapter-btn-icon')) {
            this.chapterManager.setActiveChapter(ch.id);
          }
        });

        item.querySelector('.btn-move-up')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.chapterManager.moveChapter(ch.id, -1);
        });

        item.querySelector('.btn-move-down')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.chapterManager.moveChapter(ch.id, 1);
        });

        item.querySelector('.btn-del-chap')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Opravdu smazat kapitolu "${ch.title}"?`)) {
            this.chapterManager.removeChapter(ch.id);
          }
        });

        treeList.appendChild(item);
      });
    }

    _saveCurrentProject() {
      const activeChap = this.chapterManager.getActiveChapter();
      const projId = 'proj_' + Date.now();
      
      const currentConfig = Object.assign({}, this.paginationEngine.config, {
        theme: document.body.getAttribute('data-theme') || 'web-original',
        font: document.body.getAttribute('data-font') || 'sans',
        brandColor: document.getElementById('input-brand-color')?.value || '#0284c7'
      });

      const projectData = {
        id: projId,
        title: activeChap ? activeChap.title : 'Dokument bez názvu',
        savedAt: new Date().toISOString(),
        config: currentConfig,
        chapters: this.chapterManager.chapters
      };

      ProjectStorage.saveToHistory(projectData);

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectData.title.replace(/[\\/:*?"<>|]/g, '_')}.urlprint`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this._showToast('💾 Projekt byl úspěšně uložen do souboru .urlprint');
    }

    _loadProjectFromFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data && data.chapters && Array.isArray(data.chapters)) {
            this.chapterManager.clear();
            if (data.config) {
              this.paginationEngine.updateConfig(data.config);
              this._syncUIFromConfig(data.config);
            }
            data.chapters.forEach(ch => {
              this.chapterManager.addChapter(ch.title, ch.htmlContent, ch.sourceUrl, ch);
            });
            this._showToast(`📂 Projekt "${data.title || file.name}" byl úspěšně načten`);
          }
        } catch (err) {
          alert('Chyba při čtení souboru: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    _renderProjectHistoryModal() {
      const historyList = document.getElementById('project-history-list');
      if (!historyList) return;
      historyList.innerHTML = '';

      const history = ProjectStorage.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="empty-history-state">
            <div class="empty-history-icon">📁</div>
            <div style="font-weight: 700; font-size: 13px;">Žádné uložené projekty v historii</div>
            <div style="font-size: 11px;">Uložte aktuální projekt nebo nahrajte soubor .urlprint ze svého počítače.</div>
          </div>
        `;
        return;
      }

      history.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const dateStr = new Date(p.savedAt).toLocaleString('cs-CZ');

        card.innerHTML = `
          <div class="project-card-info">
            <div class="project-card-title">${this.chapterManager._escapeHTML(p.title)}</div>
            <div class="project-card-meta">
              <span>📅 ${dateStr}</span>
              <span>📑 ${p.chapters?.length || 1} kapitol</span>
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn-card-open">Otevřít</button>
            <button class="btn-card-delete" title="Smazat z historie">&times;</button>
          </div>
        `;

        card.querySelector('.btn-card-open')?.addEventListener('click', () => {
          this.chapterManager.clear();
          if (p.config) {
            this.paginationEngine.updateConfig(p.config);
            this._syncUIFromConfig(p.config);
          }
          p.chapters?.forEach(ch => {
            this.chapterManager.addChapter(ch.title, ch.htmlContent, ch.sourceUrl, ch);
          });
          document.getElementById('modal-projects')?.classList.remove('open');
          this._showToast(`📂 Projekt "${p.title}" byl otevřen`);
        });

        card.querySelector('.btn-card-delete')?.addEventListener('click', () => {
          ProjectStorage.deleteProject(p.id);
          this._renderProjectHistoryModal();
        });

        historyList.appendChild(card);
      });

      document.getElementById('btn-modal-load-file')?.addEventListener('click', () => {
        const fileInput = document.getElementById('file-input-urlprint');
        if (fileInput) {
          fileInput.onchange = (e) => {
            if (e.target.files[0]) {
              this._loadProjectFromFile(e.target.files[0]);
              document.getElementById('modal-projects')?.classList.remove('open');
            }
          };
          fileInput.click();
        }
      });

      document.getElementById('btn-modal-save-current')?.addEventListener('click', () => {
        this._saveCurrentProject();
      });

      document.getElementById('btn-modal-clear-history')?.addEventListener('click', () => {
        if (confirm('Opravdu chcete vymazat celou historii projektů?')) {
          ProjectStorage.clearHistory();
          this._renderProjectHistoryModal();
        }
      });
    }

    _showToast(msg) {
      const toast = document.getElementById('app-toast');
      const msgEl = document.getElementById('toast-msg');
      if (toast && msgEl) {
        msgEl.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.app = new URLPrinterApp();
  });

})();
