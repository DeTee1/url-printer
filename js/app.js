/* ==========================================================================
   URL PRINTER - COMPLETE APPLICATION SCRIPT (V3.3)
   - Zero auto-preload on startup (clean empty canvas workspace)
   - Full Image Customization: Border options, Shadow options, Radius, Backgrounds, Alignment, Width
   - Robust Web Style & Brand Color Extractor
   - Clean H1-H6 semantic headings without metadata clutter
   - Undo/Redo history stack with Ctrl+Z / Ctrl+Y
   - Real-time zero-overflow pagination engine
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. QR CODE GENERATOR (Vector / Canvas Zero-Dependency Engine)
     ========================================================================== */
  class QRGenerator {
    static generateMatrix(text) {
      const str = unescape(encodeURIComponent(text));
      const len = str.length;

      let version = 1;
      if (len > 120) version = 6;
      else if (len > 70) version = 4;
      else if (len > 32) version = 3;
      else if (len > 14) version = 2;

      const moduleCount = version * 4 + 17;
      const matrix = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(0));

      this._addFinderPattern(matrix, 0, 0);
      this._addFinderPattern(matrix, moduleCount - 7, 0);
      this._addFinderPattern(matrix, 0, moduleCount - 7);

      if (version >= 2) {
        const pos = moduleCount - 7;
        this._addAlignmentPattern(matrix, pos - 2, pos - 2);
      }

      for (let i = 8; i < moduleCount - 8; i++) {
        matrix[6][i] = i % 2 === 0 ? 1 : 0;
        matrix[i][6] = i % 2 === 0 ? 1 : 0;
      }

      const bytes = [];
      bytes.push((4 << 4) | (len >> 4));
      bytes.push(((len & 0x0f) << 4) | (str.charCodeAt(0) >> 4));
      for (let i = 0; i < len; i++) {
        bytes.push(str.charCodeAt(i));
      }
      while (bytes.length < moduleCount * 2) {
        bytes.push(0xec, 0x11);
      }

      let right = moduleCount - 1;
      let dir = -1;
      let bitPointer = 0;

      while (right > 0) {
        if (right === 6) right--;
        for (let vertical = 0; vertical < moduleCount; vertical++) {
          const r = dir < 0 ? moduleCount - 1 - vertical : vertical;
          for (let colOffset = 0; colOffset < 2; colOffset++) {
            const c = right - colOffset;
            if (matrix[r][c] === 0) {
              if (!this._isReserved(r, c, moduleCount, version)) {
                const currentByte = bytes[Math.floor(bitPointer / 8)] || 0;
                const bit = (currentByte >> (7 - (bitPointer % 8))) & 1;
                const mask = (r + c) % 2 === 0 ? 1 : 0;
                matrix[r][c] = (bit ^ mask) ? 1 : 0;
                bitPointer++;
              }
            }
          }
        }
        right -= 2;
        dir = -dir;
      }

      this._addFinderPattern(matrix, 0, 0);
      this._addFinderPattern(matrix, moduleCount - 7, 0);
      this._addFinderPattern(matrix, 0, moduleCount - 7);

      return matrix;
    }

    static _addFinderPattern(matrix, row, col) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[row + r][col + c] = 1;
          } else {
            matrix[row + r][col + c] = 0;
          }
        }
      }
    }

    static _addAlignmentPattern(matrix, row, col) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          if (
            Math.abs(r) === 2 || Math.abs(c) === 2 ||
            (r === 0 && c === 0)
          ) {
            matrix[row + r][col + c] = 1;
          } else {
            matrix[row + r][col + c] = 0;
          }
        }
      }
    }

    static _isReserved(r, c, count, version) {
      if (r <= 8 && c <= 8) return true;
      if (r <= 8 && c >= count - 8) return true;
      if (r >= count - 8 && c <= 8) return true;
      if (r === 6 || c === 6) return true;
      if (version >= 2 && r >= count - 10 && r <= count - 6 && c >= count - 10 && c <= count - 6) return true;
      return false;
    }

    static renderToCanvas(text, canvas, options = {}) {
      const size = options.size || 110;
      const colorDark = options.colorDark || '#000000';
      const colorLight = options.colorLight || '#ffffff';
      const margin = options.margin !== undefined ? options.margin : 2;

      const qr = this.generateMatrix(text);
      const moduleCount = qr.length;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = colorLight;
      ctx.fillRect(0, 0, size, size);

      const moduleSize = (size - margin * 2 * (size / moduleCount)) / moduleCount;
      const actualMargin = (size - moduleSize * moduleCount) / 2;

      ctx.fillStyle = colorDark;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr[r][c]) {
            ctx.fillRect(
              Math.round(actualMargin + c * moduleSize),
              Math.round(actualMargin + r * moduleSize),
              Math.ceil(moduleSize),
              Math.ceil(moduleSize)
            );
          }
        }
      }
      return canvas;
    }

    static extractAndCreateQRCards(containerElement) {
      const links = containerElement.querySelectorAll('a[href]');
      const qrCards = [];
      let counter = 1;

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        const title = link.textContent.trim() || link.getAttribute('title') || 'Odkaz na web';
        const isVideo = href.includes('youtube.com') || href.includes('youtu.be') || href.includes('vimeo.com');
        const isAudio = href.includes('spotify.com') || href.includes('soundcloud.com') || href.endsWith('.mp3');

        const card = document.createElement('div');
        card.className = 'doc-callout doc-qr-card doc-element';
        card.setAttribute('data-block-type', 'qr-card');
        card.setAttribute('data-href', href);

        let badgeType = 'WEB ODKAZ';
        if (isVideo) badgeType = 'VIDEO LEKCE 🎬';
        else if (isAudio) badgeType = 'AUDIO UKÁZKA 🎧';

        const canvas = document.createElement('canvas');
        this.renderToCanvas(href, canvas, { size: 90 });

        card.innerHTML = `
          <div class="doc-qr-canvas-wrapper"></div>
          <div class="doc-qr-info">
            <span class="doc-qr-badge">${badgeType} #${counter}</span>
            <div class="doc-qr-title">${this._escapeHTML(title)}</div>
            <div class="doc-qr-url">${this._escapeHTML(href)}</div>
          </div>
        `;

        card.querySelector('.doc-qr-canvas-wrapper').appendChild(canvas);
        qrCards.push(card);

        if (!link.querySelector('.qr-ref-sup')) {
          const sup = document.createElement('sup');
          sup.className = 'qr-ref-sup';
          sup.style.color = 'var(--doc-primary)';
          sup.style.fontWeight = '700';
          sup.textContent = ` [QR #${counter}]`;
          link.appendChild(sup);
        }
        counter++;
      });

      return qrCards;
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
    static buildTOC(sheetsContainer, options = {}) {
      const depth = options.depth || 3;
      const title = options.title || 'Obsah dokumentu';
      const sheets = sheetsContainer.querySelectorAll('.paper-sheet');
      const tocItems = [];

      sheets.forEach((sheet, sheetIdx) => {
        const pageNumber = sheetIdx + 1;
        const headings = sheet.querySelectorAll('h1.doc-element, h2.doc-element, h3.doc-element, h4.doc-element');

        headings.forEach(h => {
          let level = 1;
          if (h.tagName === 'H2' || h.classList.contains('doc-h2')) level = 2;
          if (h.tagName === 'H3' || h.classList.contains('doc-h3')) level = 3;
          if (h.tagName === 'H4' || h.classList.contains('doc-h4')) level = 4;

          if (level <= depth) {
            const headingText = h.textContent.trim();
            if (headingText && !headingText.includes('Obsah dokumentu')) {
              if (!h.id) {
                h.id = 'toc_heading_' + Math.random().toString(36).substr(2, 6);
              }
              tocItems.push({
                id: h.id,
                text: headingText,
                level: level,
                pageNumber: pageNumber
              });
            }
          }
        });
      });

      const tocWrapper = document.createElement('div');
      tocWrapper.className = 'doc-toc-wrapper doc-element';
      tocWrapper.setAttribute('data-block-type', 'toc');

      let itemsHtml = '';
      tocItems.forEach(item => {
        itemsHtml += `
          <li class="doc-toc-item level-${item.level}" onclick="document.getElementById('${item.id}')?.scrollIntoView({behavior: 'smooth'})">
            <span class="doc-toc-label">${this._escapeHTML(item.text)}</span>
            <span class="doc-toc-leader"></span>
            <span class="doc-toc-page">s. ${item.pageNumber}</span>
          </li>
        `;
      });

      tocWrapper.innerHTML = `
        <div class="doc-toc-title">
          <span>📑 ${this._escapeHTML(title)}</span>
        </div>
        <ul class="doc-toc-list">
          ${itemsHtml || '<li class="doc-toc-item" style="color: var(--doc-text-muted);">Žádné nadpisy nebyly nalezeny.</li>'}
        </ul>
      `;

      return {
        element: tocWrapper,
        count: tocItems.length,
        items: tocItems
      };
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
     3. CONTENT EXTRACTOR: ABSOLUTE IMAGES & WEB STYLE PRESERVER
     ========================================================================== */
  class ContentExtractor {
    static async fetchFromUrl(url, preserveStyles = true) {
      const cleanUrl = url.trim();
      if (!cleanUrl) throw new Error('Zadejte platnou URL adresu.');

      // 1. Direct handler for Wikipedia API
      if (cleanUrl.includes('wikipedia.org/wiki/')) {
        try {
          const match = cleanUrl.match(/https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/(.+)/i);
          if (match) {
            const lang = match[1];
            const title = match[2];
            const wikiApiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(decodeURIComponent(title))}`;
            const res = await fetch(wikiApiUrl);
            if (res.ok) {
              const html = await res.text();
              return this.sanitizeRawHTML(html, cleanUrl, preserveStyles);
            }
          }
        } catch (wikiErr) {
          console.warn('Wikipedia direct API fallback:', wikiErr);
        }
      }

      // 2. Proxy 1: Corsproxy.io (Extracts 100% native HTML tables, diagrams & image grids)
      try {
        const cpUrl = `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(cpUrl);
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 100 && html.includes('<')) {
            return this.sanitizeRawHTML(html, cleanUrl, preserveStyles);
          }
        }
      } catch (e) {
        console.warn('Corsproxy failed:', e);
      }

      // 3. Proxy 2: AllOrigins Raw
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 100 && html.includes('<')) {
            return this.sanitizeRawHTML(html, cleanUrl, preserveStyles);
          }
        }
      } catch (e) {
        console.warn('AllOrigins Raw failed:', e);
      }

      // 4. Proxy 3: CodeTabs CORS
      try {
        const ctUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(ctUrl);
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 100 && html.includes('<')) {
            return this.sanitizeRawHTML(html, cleanUrl, preserveStyles);
          }
        }
      } catch (e) {
        console.warn('CodeTabs proxy failed:', e);
      }

      // 5. Proxy 4: Jina Reader AI (For Cloudflare-protected sites)
      try {
        const jinaTarget = cleanUrl.startsWith('http') ? cleanUrl : 'https://' + cleanUrl;
        const jinaUrl = 'https://r.jina.ai/' + jinaTarget;
        const res = await fetch(jinaUrl, {
          headers: { 'X-No-Cache': 'true' }
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 50) {
            return this.parseMarkdownOrHTML(text, cleanUrl, preserveStyles);
          }
        }
      } catch (e) {
        console.warn('Jina proxy failed:', e);
      }

      // 6. Proxy 5: AllOrigins JSON Wrapper
      try {
        const proxyJsonUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(proxyJsonUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.contents && data.contents.length > 50) {
            return this.sanitizeRawHTML(data.contents, cleanUrl, preserveStyles);
          }
        }
      } catch (e) {
        console.warn('AllOrigins JSON failed:', e);
      }

      throw new Error(`Zabezpečení webu "${cleanUrl}" zabránilo přímému stažení z prohlížeče. Prosím otevřete stránku, zkopírujte text (Ctrl+A, Ctrl+C) a vložte jej do textového pole níže.`);
    }

    static _stripMetadataPreamble(rawText) {
      let title = '';
      let sourceUrl = '';
      let cleanText = rawText || '';

      // 1. YAML frontmatter (--- \n title: ... \n ---)
      const frontmatterMatch = cleanText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (frontmatterMatch) {
        const yaml = frontmatterMatch[1];
        const tMatch = yaml.match(/^title:\s*["']?(.*?)["']?$/m);
        if (tMatch) title = tMatch[1].trim();
        const uMatch = yaml.match(/^(?:url|source|url_source):\s*["']?(.*?)["']?$/m);
        if (uMatch) sourceUrl = uMatch[1].trim();
        cleanText = cleanText.substring(frontmatterMatch[0].length);
      }

      const lines = cleanText.split(/\r?\n/);
      const remainingLines = [];
      let inPreamble = true;
      let hitArticleTitle = false;

      // Extract Title from top metadata lines
      for (let i = 0; i < Math.min(lines.length, 25); i++) {
        const l = lines[i].trim();
        const tMatch = l.match(/^Title:\s*(.*)/i);
        if (tMatch && !title) {
          title = tMatch[1].replace(/\s*[-–|].*$/, '').trim();
        }
        const uMatch = l.match(/^(?:URL Source|URL|Source):\s*(.*)/i);
        if (uMatch && !sourceUrl) {
          sourceUrl = uMatch[1].trim();
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          if (hitArticleTitle) remainingLines.push(lines[i]);
          continue;
        }

        // Preamble metadata tags
        if (/^(?:Title|URL Source|URL|Source|Published Time|Publish Date|Date|Author|Author\(s\)|Description|Category|Rubrika|Kategorie):\s*/i.test(line)) {
          continue;
        }
        if (/^(?:Markdown Content|HTML Content|Content):\s*$/i.test(line)) {
          continue;
        }

        // Filter out breadcrumb chains
        if (!hitArticleTitle && (/^\[.*?\]\(.*?\)\s*(\/|>|»|›)\s*\[?.*?\]?/.test(line) || /^(Domů|Home|Úvod)\s*(\/|>|»|›)/i.test(line))) {
          continue;
        }

        // Filter out category name lines before heading
        if (!hitArticleTitle && (/^(?:Popis saxofonu|Vše okolo saxofonu|Výuka|Historie|Knihovna|Rubrika|Kategorie)$/i.test(line) || /^\[(?:Popis saxofonu|Vše okolo saxofonu|Výuka|Historie|Knihovna)\]/i.test(line))) {
          continue;
        }

        // Filter out Navigation lists before the first H1 heading
        if (!hitArticleTitle && (/^[-*]\s*\[.*?\]\(https?:\/\/.*?\)$/.test(line) || /^[-*]\s*\[.*?\]\(#.*?\)$/.test(line))) {
          continue;
        }

        // Detect the real article heading
        if (!hitArticleTitle && (line.startsWith('# ') || (title && line.toLowerCase().includes(title.toLowerCase())))) {
          hitArticleTitle = true;
          inPreamble = false;
          const cleanHeadingText = line.replace(/^#+\s*/, '').replace(/\s*[-–|].*$/, '').trim();
          title = cleanHeadingText || title;
          remainingLines.push(`# ${title}`);
          continue;
        }

        // Discard anything before the main article heading
        if (!hitArticleTitle) {
          if (line.length > 80 && !line.startsWith('[') && !line.startsWith('*') && !line.startsWith('-')) {
            hitArticleTitle = true;
            inPreamble = false;
            remainingLines.push(line);
          }
          continue;
        }

        // Stop completely at post navigation, related articles, or footer widgets
        if (/^(?:##?\s*)?(?:Navigace pro příspěvek|Navigace|Další články|Související články|Podobné články|Podobné příspěvky|Související příspěvky|Příspěvky|Rubriky|Kategorie|Mohlo by vás zajímat|Komentáře|Diskuze|Sdílet článek|Zásady ochrany|O mně|O autorovi)/i.test(line)) {
          break;
        }
        if (/^\[?(?:Předchozí|Další|Pokračovat).*?\]?\(.*?\)/i.test(line)) {
          break;
        }
        if (/^(?:©\s*\d{4}|Všechna práva vyhrazena|All rights reserved)/i.test(line)) {
          break;
        }

        // Skip standalone link-only lines
        if (/^\[.*?\]\(https?:\/\/.*?\)$/.test(line) && !line.includes(' ')) {
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

      // 1. Remove non-content site chrome (headers, footers, sidebars, breadcrumbs, menus, navigation widgets)
      const unwantedSelectors = [
        'script', 'noscript', 'nav', 'header', 'footer',
        '.navbar', '.nav', '.footer', '.header', '.ad', '.ads', '.advertisement',
        '.cookie-banner', '.cookie-consent', '.popup', '.modal', '.sidebar', '.aside',
        '.social-share', '.share-buttons', '.comments', '#comments', '.newsletter-signup',
        '.mw-jump-link', '.mw-editsection', '.reference', '.reflist', '.hidden',
        '.screen-reader-text',
        '.breadcrumbs', '.breadcrumb', '#breadcrumbs', '.kadence-breadcrumbs', '#kadence-breadcrumbs',
        '.yoast-breadcrumbs', '.rank-math-breadcrumb', '.schema-breadcrumb',
        '.menu', '.menu-item', '.site-navigation', '#site-navigation', '.main-navigation', '.sub-menu',
        '.wp-block-navigation', '.wp-block-pages-list', '.widget_nav_menu', '.site-header', '#masthead',
        '.site-footer', '#colophon', '.mobile-header', '#mobile-header',
        '.post-navigation', '.navigation', '.nav-links', '.prev-next', '.pagination', '.nav-previous', '.nav-next',
        '.entry-meta', '.meta', '.post-meta', '.entry-taxonomies', '.term-links', '.category-links',
        '.widget', '.widget-area', '.sidebar', '.elementor-widget-sidebar', '.elementor-nav-menu', '.elementor-widget-nav-menu',
        '.entry-related', '.related-posts', '.related-articles', '.wp-block-latest-posts', '.yarpp-related', '.jp-relatedposts',
        '.splide', '.splide__track', '.carousel',
        '.tags-links', '.cat-links', '.post-categories', '.entry-footer', '.post-author', '.author-box'
      ];

      unwantedSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      // 2. Select pure article body container FIRST
      const mainEl = doc.querySelector('.entry-content, .single-content, .post-content, .article-content, .post_content, .article-body, .story-body, .wysiwyg, .mw-parser-output')
                  || doc.querySelector('article, main, #content, .content')
                  || doc.body;

      // Extract clean article title
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

      // Prepend EXACTLY ONE clean H1 at the top
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

        // 1. Skip duplicate headings matching the main title
        if ((el.tagName === 'H1' || el.tagName === 'H2') && (textLower === titleLower || textLower.startsWith(titleLower))) {
          return;
        }

        // 2. Skip metadata tags
        if (/^(?:Title|URL Source|Published Time|Markdown Content):\s*/i.test(textContent)) {
          return;
        }

        // 3. Skip residual category names, breadcrumbs or author info
        if (/^(?:Domů|Home|Úvod)\s*(\/|>|»|›)/i.test(textContent)) {
          return;
        }
        if (/^(?:Popis saxofonu|Vše okolo saxofonu|Výuka|Historie|Knihovna|Rubrika|Kategorie)$/i.test(textContent)) {
          return;
        }

        // 4. Skip "Navigace pro příspěvek", post navigation, or related articles
        if (textLower.includes('navigace pro příspěvek') || textLower.includes('navigace pro') || textLower === 'navigace') {
          return;
        }
        if (/^(?:Další články|Související články|Podobné články|Podobné příspěvky|Rubriky|Kategorie|Mohlo by vás zajímat|Komentáře|Diskuze)/i.test(textContent)) {
          return;
        }
        if (/^(?:Předchozí|Další|Pokračovat)$/i.test(textContent)) {
          return;
        }

        cleanContainer.appendChild(el);
      });

      return {
        title: title,
        sourceUrl: sourceUrl,
        htmlContent: cleanContainer.innerHTML || `<h1 class="doc-element doc-h1">${this._escapeHTML(title)}</h1><p class="doc-element">Načtený obsah stránky.</p>`
      };
    }

    static parseMarkdownOrHTML(text, sourceUrl = '', preserveStyles = true) {
      const stripped = this._stripMetadataPreamble(text);
      let title = stripped.title;
      let effectiveSourceUrl = sourceUrl || stripped.sourceUrl;
      const cleanInput = stripped.cleanText;

      if (cleanInput.includes('<p>') || cleanInput.includes('<div>') || cleanInput.includes('<article>')) {
        return this.sanitizeRawHTML(cleanInput, effectiveSourceUrl, preserveStyles);
      }

      const lines = cleanInput.split('\n');
      let html = '';
      let inList = false;
      let listType = 'ul';
      let hasFirstH1 = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          continue;
        }

        if (/^(?:Title|URL Source|Published Time|Markdown Content):\s*/i.test(line)) {
          continue;
        }

        // 1. Markdown Images: ![Alt](url)
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

        // 2. Headings H1 to H6
        if (line.startsWith('# ')) {
          const headingText = line.substring(2).trim();
          if (!hasFirstH1) {
            title = headingText;
            hasFirstH1 = true;
            html += `<h1 class="doc-element doc-h1">${this._escapeHTML(headingText)}</h1>\n`;
          } else {
            html += `<h2 class="doc-element doc-h2">${this._escapeHTML(headingText)}</h2>\n`;
          }
        } else if (line.startsWith('## ')) {
          const h2Text = line.substring(3).trim();
          if (/^(?:Navigace pro příspěvek|Navigace|Podobné příspěvky|Související)/i.test(h2Text)) {
            break;
          }
          html += `<h2 class="doc-element doc-h2">${this._escapeHTML(h2Text)}</h2>\n`;
        } else if (line.startsWith('### ')) {
          html += `<h3 class="doc-element doc-h3">${this._escapeHTML(line.substring(4).trim())}</h3>\n`;
        } else if (line.startsWith('#### ')) {
          html += `<h4 class="doc-element doc-h4">${this._escapeHTML(line.substring(5).trim())}</h4>\n`;
        } else if (line.startsWith('##### ')) {
          html += `<h5 class="doc-element doc-h5">${this._escapeHTML(line.substring(6).trim())}</h5>\n`;
        } else if (line.startsWith('###### ')) {
          html += `<h6 class="doc-element doc-h6">${this._escapeHTML(line.substring(7).trim())}</h6>\n`;
        } else if (line.startsWith('> ')) {
          html += `<blockquote class="doc-element">${this._escapeHTML(line.substring(2).trim())}</blockquote>\n`;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!inList) {
            listType = 'ul';
            html += `<ul class="doc-element">\n`;
            inList = true;
          }
          html += `<li>${this._parseInline(line.substring(2).trim())}</li>\n`;
        } else if (/^\d+\.\s/.test(line)) {
          if (!inList) {
            listType = 'ol';
            html += `<ol class="doc-element">\n`;
            inList = true;
          }
          const itemText = line.replace(/^\d+\.\s/, '').trim();
          html += `<li>${this._parseInline(itemText)}</li>\n`;
        } else {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          html += `<p class="doc-element">${this._parseInline(line)}</p>\n`;
        }
      }

      if (inList) html += `</${listType}>\n`;
      if (!title) title = 'Importovaný dokument';

      if (!hasFirstH1 && title) {
        html = `<h1 class="doc-element doc-h1">${this._escapeHTML(title)}</h1>\n` + html;
      }

      return {
        title: title,
        sourceUrl: effectiveSourceUrl,
        htmlContent: html
      };
    }

    static _flattenDomBlocks(node, results, preserveStyles = true, baseUrl = '') {
      if (!node) return;

      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (!tag) return;

      if (['script', 'style', 'noscript', 'nav', 'footer', 'header'].includes(tag)) {
        return;
      }

      // 1. YouTube & Video Embeds (WordPress wp-block-embed, iframes)
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
          videoCard.innerHTML = `
            <div class="doc-callout-header">🎬 Video ukázka: ${this._escapeHTML(cleanTitle)}</div>
            <p style="margin-bottom: 6px;"><strong>Odkaz na nahrávku:</strong> <a href="${videoUrl}" target="_blank" rel="noopener">${videoUrl}</a></p>
            ${videoId ? `<div style="text-align: center; margin-top: 6px;"><img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${this._escapeHTML(cleanTitle)}" style="max-width: 440px; width: 100%; border-radius: 6px; border: 1px solid var(--doc-border, #cbd5e1);" loading="lazy" onerror="this.style.display='none'"></div>` : ''}
          `;
          results.push(videoCard);
          return;
        }
      }

      // 2. Headings H1 - H6
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = node.textContent.trim();
        if (text) {
          const h = document.createElement(tag);
          h.className = `doc-element doc-${tag}`;
          h.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
          results.push(h);
        }
        return;
      }

      // 3. Standalone Table element
      if (tag === 'table') {
        const tbl = node.cloneNode(true);
        tbl.className = 'doc-element';
        tbl.removeAttribute('style');

        // Resolve all image URLs inside table cells
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

        results.push(tbl);
        return;
      }

      // 4. Figures (Images, tables with captions, or embeds)
      if (tag === 'figure') {
        const tableInside = node.querySelector('table');
        if (tableInside) {
          const tbl = tableInside.cloneNode(true);
          tbl.className = 'doc-element';
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
          if (figcaption && figcaption.textContent.trim()) {
            const figWrapper = document.createElement('figure');
            figWrapper.className = 'doc-element doc-table-figure';
            figWrapper.appendChild(tbl);
            const cap = document.createElement('figcaption');
            cap.textContent = figcaption.textContent.trim();
            figWrapper.appendChild(cap);
            results.push(figWrapper);
          } else {
            results.push(tbl);
          }
          return;
        }

        const img = node.querySelector('img');
        if (img) {
          const fig = this._createFigureFromImg(img, baseUrl, node.querySelector('figcaption')?.textContent);
          if (fig) results.push(fig);
          return;
        }
      }

      // 5. Standalone Image tag
      if (tag === 'img') {
        const fig = this._createFigureFromImg(node, baseUrl);
        if (fig) results.push(fig);
        return;
      }

      // 6. Paragraphs
      if (tag === 'p') {
        const text = node.textContent.trim();
        const img = node.querySelector('img');
        if (img) {
          const fig = this._createFigureFromImg(img, baseUrl);
          if (fig) results.push(fig);
        }
        if (text && !/^(?:Title|URL Source|Published Time|Markdown Content):\s*/i.test(text)) {
          const p = document.createElement('p');
          p.className = 'doc-element';
          p.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
          results.push(p);
        }
        return;
      }

      // 7. Lists
      if (tag === 'ul' || tag === 'ol') {
        const list = document.createElement(tag);
        list.className = 'doc-element';
        const items = node.querySelectorAll(':scope > li');
        if (items.length > 0) {
          items.forEach(li => {
            const cleanLi = document.createElement('li');
            cleanLi.innerHTML = this._cleanInlineContent(li.innerHTML, baseUrl);
            list.appendChild(cleanLi);
          });
          results.push(list);
        }
        return;
      }

      // 8. Blockquotes
      if (tag === 'blockquote') {
        const bq = document.createElement('blockquote');
        bq.className = 'doc-element';
        bq.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
        results.push(bq);
        return;
      }

      // 9. Preformatted text / code
      if (tag === 'pre') {
        const pre = document.createElement('pre');
        pre.className = 'doc-element';
        pre.textContent = node.textContent;
        results.push(pre);
        return;
      }

      // 10. Horizontal rule
      if (tag === 'hr') {
        const hr = document.createElement('hr');
        hr.className = 'doc-element';
        results.push(hr);
        return;
      }

      // 11. Container elements (div, section, article, columns) -> Recurse through all children
      const children = Array.from(node.children);
      if (children.length > 0) {
        children.forEach(child => {
          this._flattenDomBlocks(child, results, preserveStyles, baseUrl);
        });
      } else {
        const text = node.textContent.trim();
        if (text && text.length > 3 && !/^(?:Title|URL Source|Published Time|Markdown Content):\s*/i.test(text)) {
          const p = document.createElement('p');
          p.className = 'doc-element';
          p.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
          results.push(p);
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
      const styles = doc.querySelectorAll('style');
      let combinedCss = '';

      styles.forEach(s => {
        const text = s.textContent;
        if (!text.includes('position:fixed') && !text.includes('position: fixed')) {
          combinedCss += text + '\n';
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
      let brandColor = themeMeta ? themeMeta.getAttribute('content') : '#2563eb';
      if (!brandColor || brandColor === '#ffffff' || brandColor === '#000000') brandColor = '#2563eb';

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

      const lines = cleanInput.split('\n');
      let html = '';
      let inList = false;
      let listType = 'ul';
      let hasFirstH1 = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          continue;
        }

        if (/^(?:Title|URL Source|Published Time|Markdown Content):\s*/i.test(line)) {
          continue;
        }

        // 1. Markdown Multi-Image Gallery Table (Unified 3x3 Grid with Clean Separate Text Cells)
        const multiImgMatches = [...line.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g)];
        if (multiImgMatches.length > 1) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }

          let tableRowsHtml = '';

          while (i < lines.length) {
            const currentLine = lines[i].trim();
            const rowImgMatches = [...currentLine.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g)];
            if (rowImgMatches.length === 0) {
              break;
            }

            // 1. Image Row
            tableRowsHtml += '    <tr>\n';
            rowImgMatches.forEach(m => {
              const alt = this._escapeHTML(m[1].replace(/^Image\s*\d+:\s*/i, '').trim());
              const src = m[2];
              tableRowsHtml += `      <td style="text-align: center; vertical-align: bottom; padding: 8px 6px; background: #ffffff; border: 1px solid var(--doc-border, #cbd5e1);">
        <img src="${src}" alt="${alt}" class="doc-table-img doc-element" loading="lazy" style="max-height: 120px; object-fit: contain; margin: 0 auto; display: block;" onerror="this.parentElement.style.display='none'">
      </td>\n`;
            });
            tableRowsHtml += '    </tr>\n';

            // 2. Text Label Row
            if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('!') && !lines[i + 1].trim().startsWith('#')) {
              i++;
              tableRowsHtml += '    <tr>\n';
              rowImgMatches.forEach(m => {
                let cellName = m[1].replace(/^Image\s*\d+:\s*/i, '').trim();
                const lower = cellName.toLowerCase();
                if (lower.startsWith('sopranino') && lower.includes('zahnut')) {
                  cellName = 'sopranino saxofon (zahnutý)';
                } else if (lower.startsWith('sopranino')) {
                  cellName = 'sopranino saxofon';
                } else if (lower.startsWith('sopran') && lower.includes('zahnut')) {
                  cellName = 'sopran saxofon (zahnutý)';
                } else if (lower.startsWith('sopran')) {
                  cellName = 'sopran saxofon';
                } else if (lower.startsWith('alt')) {
                  cellName = 'alt saxofon';
                } else if (lower.startsWith('tenor')) {
                  cellName = 'tenor saxofon';
                } else if (lower.startsWith('baryton')) {
                  cellName = 'baryton saxofon';
                } else if (lower.startsWith('bas')) {
                  cellName = 'bas saxofon';
                } else if (lower.startsWith('kontrabas')) {
                  cellName = 'kontrabas saxofon';
                }

                tableRowsHtml += `      <td style="text-align: center; vertical-align: top; padding: 6px; font-size: 8.5pt; font-weight: 600; color: var(--doc-headings, #1e293b); background: #ffffff; border: 1px solid var(--doc-border, #cbd5e1);">
        ${this._escapeHTML(cellName)}
      </td>\n`;
              });
              tableRowsHtml += '    </tr>\n';
            }

            if (i + 1 < lines.length && [...lines[i + 1].trim().matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g)].length > 1) {
              i++;
            } else {
              break;
            }
          }

          let figcaptionText = '';
          if (i + 1 < lines.length && /^Obrázek převzat/i.test(lines[i + 1].trim())) {
            figcaptionText = lines[i + 1].trim();
            i++;
          }

          let fullTableHtml = `<figure class="doc-element doc-table-figure" style="margin: 0.85em 0;">
  <table class="doc-element doc-image-table" style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid var(--doc-border, #cbd5e1); box-shadow: none;">
    <tbody>
${tableRowsHtml}
    </tbody>
  </table>
  ${figcaptionText ? `<figcaption style="font-size: 7.5pt; color: #64748b; text-align: center; margin-top: 6px;">${this._escapeHTML(figcaptionText)}</figcaption>` : ''}
</figure>\n`;

          html += fullTableHtml;
          continue;
        }

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

        // 2. Markdown Tables: | Header 1 | Header 2 |
        if ((line.startsWith('|') || (line.includes('|') && line.endsWith('|'))) ||
            (i + 1 < lines.length && /^\s*\|?\s*[-:]+[-| :]+\s*\|?\s*$/.test(lines[i + 1].trim()))) {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }

          let tableHtml = '<table class="doc-element">\n';
          let isHeader = true;
          let hasTbody = false;

          while (i < lines.length) {
            const tableLine = lines[i].trim();
            if (!tableLine || (!tableLine.includes('|') && !/^\s*[-:]+[-| :]+\s*$/.test(tableLine))) {
              i--;
              break;
            }

            // Separator row (e.g. |---|:---|---:)
            if (/^\s*\|?\s*[-:]+[-| :]+\s*\|?\s*$/.test(tableLine)) {
              if (isHeader) {
                isHeader = false;
                tableHtml += '  </thead>\n  <tbody>\n';
                hasTbody = true;
              }
              i++;
              continue;
            }

            let rawCells = tableLine.split('|');
            if (tableLine.startsWith('|')) rawCells.shift();
            if (tableLine.endsWith('|')) rawCells.pop();
            const cells = rawCells.map(c => c.trim());

            if (isHeader) {
              tableHtml += '  <thead>\n    <tr>\n';
              cells.forEach(cell => {
                tableHtml += `      <th>${this._parseInline(cell)}</th>\n`;
              });
              tableHtml += '    </tr>\n';

              if (i + 1 < lines.length && !/^\s*\|?\s*[-:]+[-| :]+\s*\|?\s*$/.test(lines[i + 1].trim())) {
                isHeader = false;
                tableHtml += '  </thead>\n  <tbody>\n';
                hasTbody = true;
              }
            } else {
              if (!hasTbody) {
                tableHtml += '  <tbody>\n';
                hasTbody = true;
              }
              tableHtml += '    <tr>\n';
              cells.forEach(cell => {
                tableHtml += `      <td>${this._parseInline(cell)}</td>\n`;
              });
              tableHtml += '    </tr>\n';
            }

            i++;
          }

          if (hasTbody) {
            tableHtml += '  </tbody>\n';
          } else if (isHeader) {
            tableHtml += '  </thead>\n';
          }
          tableHtml += '</table>\n';
          html += tableHtml;
          continue;
        }

        // 3. Headings H1 to H6
        if (line.startsWith('# ')) {
          const headingText = line.substring(2).trim();
          if (!hasFirstH1) {
            title = headingText;
            hasFirstH1 = true;
            html += `<h1 class="doc-element doc-h1">${this._escapeHTML(headingText)}</h1>\n`;
          } else {
            html += `<h2 class="doc-element doc-h2">${this._escapeHTML(headingText)}</h2>\n`;
          }
        } else if (line.startsWith('## ')) {
          const h2Text = line.substring(3).trim();
          if (/^(?:Navigace pro příspěvek|Navigace|Podobné příspěvky|Související)/i.test(h2Text)) {
            break;
          }
          html += `<h2 class="doc-element doc-h2">${this._escapeHTML(h2Text)}</h2>\n`;
        } else if (line.startsWith('### ')) {
          html += `<h3 class="doc-element doc-h3">${this._escapeHTML(line.substring(4).trim())}</h3>\n`;
        } else if (line.startsWith('#### ')) {
          html += `<h4 class="doc-element doc-h4">${this._escapeHTML(line.substring(5).trim())}</h4>\n`;
        } else if (line.startsWith('##### ')) {
          html += `<h5 class="doc-element doc-h5">${this._escapeHTML(line.substring(6).trim())}</h5>\n`;
        } else if (line.startsWith('###### ')) {
          html += `<h6 class="doc-element doc-h6">${this._escapeHTML(line.substring(7).trim())}</h6>\n`;
        } else if (line.startsWith('> ')) {
          html += `<blockquote class="doc-element">${this._escapeHTML(line.substring(2).trim())}</blockquote>\n`;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!inList) {
            listType = 'ul';
            html += `<ul class="doc-element">\n`;
            inList = true;
          }
          html += `<li>${this._parseInline(line.substring(2).trim())}</li>\n`;
        } else if (/^\d+\.\s/.test(line)) {
          if (!inList) {
            listType = 'ol';
            html += `<ol class="doc-element">\n`;
            inList = true;
          }
          const itemText = line.replace(/^\d+\.\s/, '').trim();
          html += `<li>${this._parseInline(itemText)}</li>\n`;
        } else {
          if (inList) {
            html += `</${listType}>\n`;
            inList = false;
          }
          html += `<p class="doc-element">${this._parseInline(line)}</p>\n`;
        }
      }

      if (inList) html += `</${listType}>\n`;
      if (!title) title = 'Importovaný dokument';

      if (!hasFirstH1 && title) {
        html = `<h1 class="doc-element doc-h1">${this._escapeHTML(title)}</h1>\n` + html;
      }

      return {
        title: title,
        sourceUrl: effectiveSourceUrl,
        htmlContent: html
      };
    }

    static _cleanSingleNode(node, preserveStyles = true, baseUrl = '') {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (!tag) return null;

      const allowed = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
        'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'pre', 'code', 'figure', 'figcaption', 'img', 'div', 'section'
      ];
      if (!allowed.includes(tag)) return null;

      const clone = node.cloneNode(true);
      clone.removeAttribute('onclick');
      clone.removeAttribute('onload');
      clone.classList.add('doc-element');

      const imgs = clone.querySelectorAll('img');
      imgs.forEach(img => {
        let src = img.getAttribute('src') || '';
        if (src.startsWith('//')) {
          img.setAttribute('src', 'https:' + src);
        } else if (src && !src.startsWith('http') && !src.startsWith('data:') && baseUrl) {
          try {
            img.setAttribute('src', new URL(src, baseUrl).href);
          } catch (e) {}
        }
        img.classList.add('doc-element');
        img.setAttribute('loading', 'lazy');
        img.setAttribute('onerror', "this.style.display='none'");
      });

      if (!preserveStyles) {
        clone.removeAttribute('style');
      }

      if (tag === 'h1') clone.classList.add('doc-h1');
      if (tag === 'h2') clone.classList.add('doc-h2');
      if (tag === 'h3') clone.classList.add('doc-h3');
      if (tag === 'h4') clone.classList.add('doc-h4');
      if (tag === 'h5') clone.classList.add('doc-h5');
      if (tag === 'h6') clone.classList.add('doc-h6');

      return clone;
    }

    static _parseInline(str) {
      let s = str || '';
      // Linked images [![alt](img_url)](link_url)
      s = s.replace(/\[!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)\]\((https?:\/\/[^\s\)]+)\)/g, '<img src="$2" alt="$1" class="doc-table-img doc-element" loading="lazy">');
      // Direct images ![alt](img_url)
      s = s.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<img src="$2" alt="$1" class="doc-table-img doc-element" loading="lazy">');
      // Standard links [text](url)
      s = s.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
      s = s.replace(/`(.*?)`/g, '<code>$1</code>');
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
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f8fafc);">
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">sopranino saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">sopranino saxofon (zahnutý)</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">soprán saxofon</td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image004.gif" alt="Soprán zahnutý" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image005.gif" alt="Alt sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image006.gif" alt="Tenor sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                  </tr>
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f8fafc);">
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">soprán saxofon (zahnutý)</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">alt saxofon</td>
                    <td style="text-align: center; padding: 4px; border: 1px solid var(--doc-border, #cbd5e1);">tenor saxofon</td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image007.gif" alt="Baryton sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image008.gif" alt="Bas sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                    <td style="text-align: center; padding: 6px; border: 1px solid var(--doc-border, #cbd5e1);"><img src="https://www.saxoskola.cz/wp-content/uploads/2021/03/image009.gif" alt="Kontrabas sax" style="max-height: 140px; width: auto;" loading="lazy"></td>
                  </tr>
                  <tr style="font-size: 8.5pt; font-weight: 600; background: var(--doc-primary-light, #f8fafc);">
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
            <p class="doc-element">Každý mikroskopický objekt vykazuje jak vlnové, tak částicové vlastnosti v závislosti na typu experimentu:</p>

            <div class="doc-callout doc-callout-formula doc-element" data-block-type="callout" data-callout-type="formula">
              <div class="doc-callout-header">📐 Vzorec de Broglieovy vlnové délky</div>
              <p><strong>λ = h / p = h / (m · v)</strong></p>
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
     4. CHAPTER MANAGER (Tree Hierarchy & Reordering)
     ========================================================================== */
  class ChapterManager {
    constructor() {
      this.chapters = [];
      this.activeChapterId = null;
      this.listeners = [];
    }

    onChange(callback) {
      this.listeners.push(callback);
    }

    _notify() {
      this.listeners.forEach(cb => cb(this.chapters, this.activeChapterId));
    }

    addChapter(title, htmlContent, sourceUrl = '', metadata = {}) {
      const cleanTitle = (title || 'Nová kapitola').replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').trim();
      const id = 'chap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const chapter = {
        id: id,
        title: cleanTitle,
        subtitle: metadata.subtitle || '',
        sourceUrl: sourceUrl || '',
        htmlContent: htmlContent || `<h1 class="doc-element doc-h1">${this._escapeHTML(cleanTitle)}</h1><p class="doc-element">Obsah nové kapitoly...</p>`,
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
      this.activeChapterId = id;
      this._notify();
    }

    getActiveChapter() {
      return this.chapters.find(c => c.id === this.activeChapterId) || this.chapters[0] || null;
    }

    getFullMergedHTML(options = {}) {
      let fullHtml = '';
      this.chapters.forEach((ch, idx) => {
        if (idx > 0 && ch.breakBefore) {
          fullHtml += `<div class="doc-page-break doc-element" data-block-type="page-break" data-break-before="true"><span>✂️ Zlom stránky — ${ch.title}</span></div>`;
        }

        if (options.showSourceInDoc && ch.sourceUrl) {
          const sourceBlock = `<div class="doc-source-meta doc-element" data-block-type="source-meta">Zdroj: <a href="${ch.sourceUrl}" target="_blank">${ch.sourceUrl}</a></div>`;
          let chapterContent = ch.htmlContent;
          if (chapterContent.includes('</h1>')) {
            chapterContent = chapterContent.replace('</h1>', `</h1>\n${sourceBlock}\n`);
          } else {
            chapterContent = sourceBlock + chapterContent;
          }
          fullHtml += chapterContent;
        } else {
          fullHtml += ch.htmlContent;
        }
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
     5. PAGINATION ENGINE (Real-Time Zero Overflow & Image Styles)
     ========================================================================== */
  class PaginationEngine {
    constructor(viewportElement) {
      this.viewport = viewportElement;
      this.sheets = [];
      this.config = {
        format: 'a4',
        orientation: 'portrait',
        columns: 1,
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 20,
        marginRight: 20,
        includeHeader: true,
        includeFooter: true,
        headerLeft: 'URL Printer Vzdělávací tiskovina',
        headerRight: 'URL Printer Studio',
        footerLeft: 'Vytvořeno v URL Printer Studio',
        showSourceInDoc: false,
        showSourceInHeader: false,
        showSourceInFooter: true,
        pageNumberPrefix: 'Strana',
        pageNumFormat: 'prefix',
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

    paginate(rawHtml, activeChapter) {
      this.viewport.innerHTML = '';
      this.sheets = [];

      if (!rawHtml || !rawHtml.trim()) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'empty-workspace-card';
        emptyCard.innerHTML = `
          <div class="empty-workspace-icon">🌐</div>
          <div class="empty-workspace-title">Žádný dokument zatím není načten</div>
          <div class="empty-workspace-desc">Zadejte URL adresu článku nebo vložte text pro kontrolovaný tisk s čistou sazbou.</div>
          <button class="btn btn-primary" onclick="document.getElementById('modal-import').classList.add('open')">
            <span>➕ Importovat URL / Text</span>
          </button>
        `;
        this.viewport.appendChild(emptyCard);
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

      if (this.config.enableQRFootnotes) {
        QRGenerator.extractAndCreateQRCards(sandbox);
      }

      Array.from(sandbox.children).forEach((child, idx) => {
        if (!child.getAttribute('data-block-id')) {
          child.setAttribute('data-block-id', 'blk_' + idx);
        }
        child.classList.add('doc-element');
      });

      let elements = Array.from(sandbox.children);

      // TOC handling
      if (this.config.enableAutoTOC) {
        const dummyTOC = document.createElement('div');
        dummyTOC.className = 'doc-toc-wrapper doc-element';
        dummyTOC.setAttribute('data-block-type', 'toc');
        dummyTOC.setAttribute('data-block-id', 'blk_toc');
        dummyTOC.innerHTML = '<div class="doc-toc-title"><span>📑 Obsah dokumentu</span></div><div class="toc-placeholder" style="font-size: 8.5pt; color: var(--doc-text-muted);">Sestavuji obsah...</div>';

        if (this.config.tocPosition === 'standalone-page') {
          dummyTOC.setAttribute('data-break-before', 'true');
        }

        let insertIndex = 0;
        const firstH1Idx = elements.findIndex(e => e.tagName === 'H1' || e.classList.contains('doc-h1'));
        if (firstH1Idx !== -1) {
          insertIndex = firstH1Idx + 1;
        }
        elements.splice(insertIndex, 0, dummyTOC);
      }

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

      let pageCount = 1;
      let currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter);
      let currentSheetBody = currentSheet.querySelector('.sheet-body');
      this.viewport.appendChild(currentSheet);
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
          currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter);
          currentSheetBody = currentSheet.querySelector('.sheet-body');
          this.viewport.appendChild(currentSheet);
          this.sheets.push(currentSheet);
          if (el.classList.contains('doc-page-break')) continue;
        }

        currentSheetBody.appendChild(cloned);

        // Real-time bounding collision check
        const bodyRect = currentSheetBody.getBoundingClientRect();
        const lastChildRect = cloned.getBoundingClientRect();

        const exceeds = lastChildRect.bottom > bodyRect.bottom + 2;
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(cloned.tagName);
        const headingNearBottom = isHeading && (lastChildRect.bottom + 45 > bodyRect.bottom);

        if ((exceeds || headingNearBottom) && currentSheetBody.children.length > 1) {
          // If it is a paragraph or text block that overflows, split words across the page break!
          if (exceeds && (cloned.tagName === 'P' || cloned.tagName === 'BLOCKQUOTE' || (cloned.tagName === 'DIV' && !cloned.classList.contains('doc-callout')))) {
            const continuationEl = this._splitParagraphAcrossPages(cloned, currentSheetBody);
            if (continuationEl) {
              pageCount++;
              currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter);
              currentSheetBody = currentSheet.querySelector('.sheet-body');
              this.viewport.appendChild(currentSheet);
              this.sheets.push(currentSheet);

              // Put the continuation element as the next element to paginate
              elements.splice(i + 1, 0, continuationEl);
              continue;
            }
          }

          cloned.remove();

          pageCount++;
          currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter);
          currentSheetBody = currentSheet.querySelector('.sheet-body');
          this.viewport.appendChild(currentSheet);
          this.sheets.push(currentSheet);

          currentSheetBody.appendChild(cloned);
        }
      }

      document.body.removeChild(sandbox);
      this._updatePageNumbers(pageCount);

      // Listen to image load events to automatically repaginate once real image heights are known
      const allImgs = Array.from(this.viewport.querySelectorAll('img'));
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

      if (this.config.enableAutoTOC) {
        const tocContainer = this.viewport.querySelector('.doc-toc-wrapper');
        if (tocContainer) {
          const computedTOC = TOCGenerator.buildTOC(this.viewport, {
            title: 'Obsah dokumentu'
          });
          tocContainer.replaceWith(computedTOC.element);
        }
      }

      return {
        sheetCount: this.sheets.length,
        sheets: this.sheets
      };
    }

    _splitParagraphAcrossPages(pElement, currentSheetBody) {
      const fullText = pElement.textContent.trim();
      const words = fullText.split(/\s+/);
      if (words.length < 8) return null; // Too short to split safely without orphans/widows

      const bodyRect = currentSheetBody.getBoundingClientRect();
      const pTop = pElement.getBoundingClientRect().top;
      const availableHeight = bodyRect.bottom - pTop;

      // Need at least 25px available for ~2 lines of text
      if (availableHeight < 25) return null;

      // Binary search for maximum words that fit within current sheet bottom
      let low = 3;
      let high = words.length - 3;
      let bestFit = -1;

      const originalHtml = pElement.innerHTML;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        pElement.textContent = words.slice(0, mid).join(' ');
        const testRect = pElement.getBoundingClientRect();

        if (testRect.bottom <= bodyRect.bottom + 1) {
          bestFit = mid;
          low = mid + 1; // Try to fit more words
        } else {
          high = mid - 1; // Exceeds bottom, reduce word count
        }
      }

      // Check typographic constraints: at least 4 words on page 1, and at least 3 words on page 2
      if (bestFit >= 4 && (words.length - bestFit) >= 3) {
        const firstPart = words.slice(0, bestFit).join(' ');
        const secondPart = words.slice(bestFit).join(' ');

        pElement.textContent = firstPart;

        const contElement = document.createElement(pElement.tagName.toLowerCase());
        contElement.className = pElement.className;
        contElement.setAttribute('contenteditable', 'true');
        contElement.setAttribute('spellcheck', 'false');
        contElement.textContent = secondPart;
        return contElement;
      }

      // If cannot split cleanly, restore original HTML
      pElement.innerHTML = originalHtml;
      return null;
    }

    _createEmptySheet(pageNumber, widthMm, heightMm, activeChapter) {
      const sheet = document.createElement('div');
      sheet.className = 'paper-sheet';
      sheet.setAttribute('data-format', this.config.format);
      sheet.setAttribute('data-orientation', this.config.orientation);
      sheet.setAttribute('data-page-number', pageNumber);

      const inner = document.createElement('div');
      inner.className = 'sheet-inner';
      inner.style.paddingTop = `${this.config.marginTop}mm`;
      inner.style.paddingBottom = `${this.config.marginBottom}mm`;
      inner.style.paddingLeft = `${this.config.marginLeft}mm`;
      inner.style.paddingRight = `${this.config.marginRight}mm`;

      // Running Header
      if (this.config.includeHeader) {
        const header = document.createElement('div');
        header.className = 'sheet-header';
        header.setAttribute('contenteditable', 'true');
        header.setAttribute('spellcheck', 'false');

        let headerRightText = this.config.headerRight;
        if (this.config.showSourceInHeader && activeChapter?.sourceUrl) {
          headerRightText = activeChapter.sourceUrl;
        }

        header.innerHTML = `
          <span class="doc-title-running">${this._escapeHTML(this.config.headerLeft)}</span>
          <span class="chapter-title-running">${this._escapeHTML(headerRightText)}</span>
        `;
        inner.appendChild(header);
      }

      // Sheet Body
      const body = document.createElement('div');
      body.className = 'sheet-body';
      body.setAttribute('data-columns', this.config.columns);
      inner.appendChild(body);

      // Running Footer
      if (this.config.includeFooter) {
        const footer = document.createElement('div');
        footer.className = 'sheet-footer';
        footer.setAttribute('contenteditable', 'true');
        footer.setAttribute('spellcheck', 'false');

        let footerNote = this.config.footerLeft;
        if (this.config.showSourceInFooter && activeChapter?.sourceUrl) {
          footerNote = `Zdroj: ${activeChapter.sourceUrl}`;
        }

        footer.innerHTML = `
          <span class="footer-note">${this._escapeHTML(footerNote)}</span>
          <span class="page-number-display">${this._formatPageNumber(pageNumber, pageNumber)}</span>
        `;
        inner.appendChild(footer);
      }

      sheet.appendChild(inner);
      return sheet;
    }

    _formatPageNumber(current, total) {
      if (this.config.pageNumFormat === 'none') return '';
      if (this.config.pageNumFormat === 'simple') return `${current}`;
      if (this.config.pageNumFormat === 'short') return `s. ${current} / ${total}`;
      if (this.config.pageNumFormat === 'roman') {
        const roman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
        return roman[current] || `${current}`;
      }
      return `${this.config.pageNumberPrefix} ${current} z ${total}`;
    }

    _updatePageNumbers(total) {
      this.sheets.forEach((sheet, idx) => {
        const num = idx + 1;
        const numDisplay = sheet.querySelector('.page-number-display');
        if (numDisplay) {
          numDisplay.textContent = this._formatPageNumber(num, total);
        }
      });
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
     6. BLOCK INSPECTOR (H1-H6, Images, Callouts, Alignment, Two-Way Sync)
     ========================================================================== */
  class BlockInspector {
    constructor(panelContainer, onBlockModified) {
      this.container = panelContainer;
      this.onBlockModified = onBlockModified || (() => {});
      this.selectedElement = null;
      this.selectedBlockId = null;
      this._initUI();
    }

    _initUI() {
      this.container.innerHTML = `
        <div class="inspector-header">
          <span>🔍 Inspektor označeného bloku</span>
          <span id="inspector-badge" class="brand-badge">PLÁTNO</span>
        </div>
        <div class="inspector-body">
          <div id="inspector-empty" style="color: #64748b; font-size: 11px; text-align: center; padding: 20px 0;">
            Klikněte na jakýkoliv text, obrázek, nadpis H1-H6, box či tabulku na plátně pro okamžitou úpravu.
          </div>

          <div id="inspector-controls" style="display: none; flex-direction: column; gap: 14px;">
            <div class="control-group">
              <label class="control-label">Typ elementu (H1 - H6, Boxy)</label>
              <select id="insp-tag-select" class="control-select">
                <option value="h1">Hlavní nadpis (H1)</option>
                <option value="h2">Podnadpis sekce (H2)</option>
                <option value="h3">Menší podnadpis (H3)</option>
                <option value="h4">Čtvrtá úroveň (H4)</option>
                <option value="h5">Pátá úroveň (H5)</option>
                <option value="h6">Šestá úroveň (H6)</option>
                <option value="p">Standardní odstavec (p)</option>
                <option value="figure">🖼️ Obrázek s popiskem</option>
                <option value="blockquote">Citace / Zvýrazněný text</option>
                <option value="callout-task">✏️ Výukový úkol</option>
                <option value="callout-def">💡 Definice pojmu</option>
                <option value="callout-solution">🔍 Vzorové řešení</option>
                <option value="callout-formula">📐 Matematický vzorec</option>
                <option value="callout-warn">⚠️ Upozornění</option>
                <option value="notes-lines">📝 Linkovaný sešit (7mm)</option>
                <option value="notes-dots">⊞ Tečkovaná mřížka (5mm)</option>
              </select>
            </div>

            <!-- Image specific controls -->
            <div id="insp-img-options" style="display: none; flex-direction: column; gap: 8px; background: #1e293b; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
              <label class="control-label" style="color: #38bdf8;">Úprava vybraného obrázku</label>
              <div class="control-grid-2">
                <button class="btn btn-secondary" id="insp-img-toggle-border">Rámeček: Přepnout</button>
                <button class="btn btn-secondary" id="insp-img-toggle-shadow">Stín: Přepnout</button>
              </div>
              <div class="control-grid-3" style="margin-top: 4px;">
                <button class="btn btn-secondary" id="insp-img-w100">100% Šířka</button>
                <button class="btn btn-secondary" id="insp-img-w75">75% Šířka</button>
                <button class="btn btn-secondary" id="insp-img-w50">50% Šířka</button>
              </div>
            </div>

            <div class="control-group">
              <label class="control-label">Zarovnání textu a prvků</label>
              <div class="control-grid-3">
                <button class="btn btn-secondary" id="insp-align-left" title="Doleva">⬅️ Vlevo</button>
                <button class="btn btn-secondary" id="insp-align-center" title="Na střed">↔️ Střed</button>
                <button class="btn btn-secondary" id="insp-align-justify" title="Do bloku">📄 Blok</button>
              </div>
            </div>

            <div class="control-group">
              <label class="control-label">Zalomení strany (Page Break)</label>
              <button class="btn btn-secondary" id="insp-toggle-break" style="width: 100%; justify-content: flex-start;">
                <span id="insp-break-status">✂️ Tvrzené zalomení před blokem</span>
              </button>
            </div>

            <div class="control-group" style="margin-top: 4px;">
              <div class="control-grid-2">
                <button class="btn btn-secondary" id="insp-move-up" title="Posunout blok nahoru">▲ Posunout nahoru</button>
                <button class="btn btn-secondary" id="insp-move-down" title="Posunout blok dolů">▼ Posunout dolů</button>
              </div>
            </div>

            <div class="control-group" style="margin-top: 4px;">
              <div class="control-grid-2">
                <button class="btn btn-secondary" id="insp-duplicate-btn">📋 Duplikovat</button>
                <button class="btn btn-secondary" id="insp-delete-btn" style="color: #f87171; border-color: #7f1d1d;">🗑️ Odstranit</button>
              </div>
            </div>
          </div>

          <div class="sidebar-section" style="margin-top: 16px; border-top: 1px solid #1e293b; padding-top: 16px;">
            <div class="sidebar-section-title">Vložit výukový prvek</div>
            <div class="quick-inserts-grid">
              <div class="insert-tile" id="insert-task-tile">
                <span class="icon">✏️</span>
                <span>Úkol / Otázka</span>
              </div>
              <div class="insert-tile" id="insert-def-tile">
                <span class="icon">💡</span>
                <span>Definice</span>
              </div>
              <div class="insert-tile" id="insert-notes-tile">
                <span class="icon">📝</span>
                <span>Linkované řádky</span>
              </div>
              <div class="insert-tile" id="insert-dots-tile">
                <span class="icon">⊞</span>
                <span>Tečkovaný rastr</span>
              </div>
              <div class="insert-tile" id="insert-break-tile" style="grid-column: span 2;">
                <span class="icon">✂️</span>
                <span>Vložit zlom strany (Page Break)</span>
              </div>
            </div>
          </div>
        </div>
      `;

      this._bindEvents();
    }

    _bindEvents() {
      // 1. Tag Transform
      const tagSelect = this.container.querySelector('#insp-tag-select');
      tagSelect?.addEventListener('change', () => {
        const newType = tagSelect.value;
        this.onBlockModified((target, parent) => {
          if (target) {
            this._transformMasterBlock(target, newType);
          }
        });
      });

      // 2. Text Alignment
      this.container.querySelector('#insp-align-left')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) target.style.textAlign = 'left';
        });
      });

      this.container.querySelector('#insp-align-center')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) target.style.textAlign = 'center';
        });
      });

      this.container.querySelector('#insp-align-justify')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) target.style.textAlign = 'justify';
        });
      });

      // 3. Page Break Toggle
      this.container.querySelector('#insp-toggle-break')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const current = target.getAttribute('data-break-before') === 'true';
            const next = !current;
            target.setAttribute('data-break-before', next.toString());
            target.style.breakBefore = next ? 'page' : 'auto';
          }
        });
      });

      // 4. Move Up / Down
      this.container.querySelector('#insp-move-up')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target && target.previousElementSibling) {
            target.parentNode.insertBefore(target, target.previousElementSibling);
          }
        });
      });

      this.container.querySelector('#insp-move-down')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target && target.nextElementSibling) {
            target.parentNode.insertBefore(target.nextElementSibling, target);
          }
        });
      });

      // 5. Duplicate
      this.container.querySelector('#insp-duplicate-btn')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target && target.parentNode) {
            const clone = target.cloneNode(true);
            const newId = 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            clone.setAttribute('data-block-id', newId);
            target.parentNode.insertBefore(clone, target.nextSibling);
            this.selectedBlockId = newId;
          }
        });
      });

      // 6. Delete
      this.container.querySelector('#insp-delete-btn')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target && target.parentNode) {
            target.remove();
            this.deselect();
          }
        });
      });

      // 7. Image Controls
      this.container.querySelector('#insp-img-toggle-border')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const img = target.querySelector('img') || (target.tagName === 'IMG' ? target : null);
            if (img) {
              img.style.border = img.style.border ? '' : '1.5px solid var(--doc-primary, #0ea5e9)';
            }
          }
        });
      });

      this.container.querySelector('#insp-img-toggle-shadow')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const img = target.querySelector('img') || (target.tagName === 'IMG' ? target : null);
            if (img) {
              img.style.boxShadow = img.style.boxShadow ? '' : '0 8px 24px rgba(0,0,0,0.25)';
            }
          }
        });
      });

      this.container.querySelector('#insp-img-w100')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const img = target.querySelector('img') || (target.tagName === 'IMG' ? target : null);
            if (img) {
              img.style.maxWidth = '100%';
              img.style.width = '100%';
              img.style.height = 'auto';
              img.style.margin = '0';
              img.style.display = 'block';
            }
          }
        });
      });

      this.container.querySelector('#insp-img-w75')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const img = target.querySelector('img') || (target.tagName === 'IMG' ? target : null);
            if (img) {
              img.style.maxWidth = '75%';
              img.style.width = '75%';
              img.style.margin = '0 auto';
              img.style.display = 'block';
            }
          }
        });
      });

      this.container.querySelector('#insp-img-w50')?.addEventListener('click', () => {
        this.onBlockModified((target) => {
          if (target) {
            const img = target.querySelector('img') || (target.tagName === 'IMG' ? target : null);
            if (img) {
              img.style.maxWidth = '50%';
              img.style.width = '50%';
              img.style.margin = '0 auto';
              img.style.display = 'block';
            }
          }
        });
      });

      // 8. Quick Educational Insert Tiles directly inside Inspector
      this.container.querySelector('#insert-task-tile')?.addEventListener('click', () => {
        this._insertCustomBlock(`
          <div class="doc-callout doc-callout-task doc-element" data-block-type="callout" data-callout-type="task">
            <div class="doc-callout-header">✏️ Samostatný úkol pro studenty</div>
            <p>Napište zadání úlohy nebo otázku k probrané látce...</p>
          </div>
        `);
      });

      this.container.querySelector('#insert-def-tile')?.addEventListener('click', () => {
        this._insertCustomBlock(`
          <div class="doc-callout doc-callout-def doc-element" data-block-type="callout" data-callout-type="def">
            <div class="doc-callout-header">💡 Definice klíčového pojmu</div>
            <p>Zde uveďte přesnou definici odborného termínu...</p>
          </div>
        `);
      });

      this.container.querySelector('#insert-notes-tile')?.addEventListener('click', () => {
        this._insertCustomBlock(`
          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Linkované řádky pro zápisky a odpovědi</span>
              <span>Linkovaný sešit (7 mm)</span>
            </div>
            <div class="doc-notes-lines"></div>
          </div>
        `);
      });

      this.container.querySelector('#insert-dots-tile')?.addEventListener('click', () => {
        this._insertCustomBlock(`
          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Tečkovaná plocha pro nákresy a diagramy</span>
              <span>Tečkovaný rastr (5 mm)</span>
            </div>
            <div class="doc-notes-dots"></div>
          </div>
        `);
      });

      this.container.querySelector('#insert-break-tile')?.addEventListener('click', () => {
        this._insertCustomBlock(`
          <div class="doc-page-break doc-element" data-block-type="page-break" data-break-before="true">
            <span>✂️ Tvrzený zlom stránky (Page Break)</span>
          </div>
        `);
      });
    }

    _insertCustomBlock(htmlString) {
      this.onBlockModified((target, parent) => {
        const template = document.createElement('template');
        template.innerHTML = htmlString.trim();
        const newEl = template.content.firstElementChild;
        const newId = 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        newEl.setAttribute('data-block-id', newId);

        if (target && target.parentNode) {
          target.parentNode.insertBefore(newEl, target.nextSibling);
        } else {
          parent.appendChild(newEl);
        }
        this.selectedBlockId = newId;
      });
    }

    selectElement(el) {
      if (this.selectedElement) {
        this.selectedElement.classList.remove('active-selected');
      }

      if (!el || !el.classList.contains('doc-element')) {
        this.deselect();
        return;
      }

      // Ensure persistent block ID
      if (!el.getAttribute('data-block-id')) {
        el.setAttribute('data-block-id', 'blk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      }
      this.selectedBlockId = el.getAttribute('data-block-id');
      this.selectedElement = el;
      this.selectedElement.classList.add('active-selected');

      const emptyMsg = this.container.querySelector('#inspector-empty');
      const controls = this.container.querySelector('#inspector-controls');
      const badge = this.container.querySelector('#inspector-badge');
      const imgOptions = this.container.querySelector('#insp-img-options');

      if (emptyMsg) emptyMsg.style.display = 'none';
      if (controls) controls.style.display = 'flex';

      const tag = el.tagName.toLowerCase();
      const isImgOrFigure = tag === 'img' || tag === 'figure' || !!el.querySelector('img');
      if (imgOptions) imgOptions.style.display = isImgOrFigure ? 'flex' : 'none';

      const tagSelect = this.container.querySelector('#insp-tag-select');
      if (badge) badge.textContent = isImgOrFigure ? 'OBRÁZEK' : tag.toUpperCase();

      if (tagSelect) {
        if (isImgOrFigure) tagSelect.value = 'figure';
        else if (el.classList.contains('doc-callout-task')) tagSelect.value = 'callout-task';
        else if (el.classList.contains('doc-callout-def')) tagSelect.value = 'callout-def';
        else if (el.classList.contains('doc-callout-solution')) tagSelect.value = 'callout-solution';
        else if (el.classList.contains('doc-callout-formula')) tagSelect.value = 'callout-formula';
        else if (el.classList.contains('doc-callout-warn')) tagSelect.value = 'callout-warn';
        else if (el.querySelector('.doc-notes-lines')) tagSelect.value = 'notes-lines';
        else if (el.querySelector('.doc-notes-dots')) tagSelect.value = 'notes-dots';
        else tagSelect.value = tag;
      }

      const isBreak = el.getAttribute('data-break-before') === 'true';
      const statusEl = this.container.querySelector('#insp-break-status');
      if (statusEl) {
        statusEl.textContent = isBreak ? '✂️ Zalomení aktivní (Vypnout)' : '✂️ Tvrzené zalomení před blokem';
      }
    }

    reselectAfterRepagination(blockId) {
      if (!blockId) return;
      const newEl = document.querySelector(`[data-block-id="${blockId}"]`);
      if (newEl) {
        this.selectElement(newEl);
      } else {
        this.deselect();
      }
    }

    deselect() {
      if (this.selectedElement) {
        this.selectedElement.classList.remove('active-selected');
        this.selectedElement = null;
      }
      this.selectedBlockId = null;
      const emptyMsg = this.container.querySelector('#inspector-empty');
      const controls = this.container.querySelector('#inspector-controls');
      const badge = this.container.querySelector('#inspector-badge');
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (controls) controls.style.display = 'none';
      if (badge) badge.textContent = 'PLÁTNO';
    }

    _transformMasterBlock(target, targetType) {
      const text = target.textContent.trim() || 'Text bloku';
      const blockId = target.getAttribute('data-block-id') || ('blk_' + Date.now());

      if (targetType.startsWith('callout-')) {
        const type = targetType.replace('callout-', '');
        const icons = { task: '✏️ Úkol', def: '💡 Definice', solution: '🔍 Řešení', formula: '📐 Vzorec', warn: '⚠️ Upozornění' };
        target.className = `doc-callout doc-callout-${type} doc-element`;
        target.setAttribute('data-block-type', 'callout');
        target.setAttribute('data-block-id', blockId);
        target.innerHTML = `<div class="doc-callout-header">${icons[type] || 'Poznámka'}</div><p>${text}</p>`;
      } else if (targetType === 'notes-lines') {
        target.className = 'doc-notes-area doc-element';
        target.setAttribute('data-block-type', 'notes');
        target.setAttribute('data-block-id', blockId);
        target.innerHTML = `<div class="doc-notes-title"><span>Linkované řádky pro zápisky (7mm)</span><span>Zápisník</span></div><div class="doc-notes-lines"></div>`;
      } else if (targetType === 'notes-dots') {
        target.className = 'doc-notes-area doc-element';
        target.setAttribute('data-block-type', 'notes');
        target.setAttribute('data-block-id', blockId);
        target.innerHTML = `<div class="doc-notes-title"><span>Tečkovaná plocha pro schémata (5mm)</span><span>Nákresník</span></div><div class="doc-notes-dots"></div>`;
      } else {
        const newEl = document.createElement(targetType);
        newEl.className = `doc-element doc-${targetType}`;
        newEl.setAttribute('contenteditable', 'true');
        newEl.setAttribute('data-block-id', blockId);
        newEl.innerHTML = text;
        target.replaceWith(newEl);
      }
    }
  }

  /* ==========================================================================
     7. WORD / DOCX EXPORTER (With H1-H6 support)
     ========================================================================== */
  class DocxExporter {
    static exportToDocx(title, containerElement) {
      const safeTitle = (title || 'Dokument').replace(/[^a-zA-Z0-9_\u00C0-\u017F\s-]/g, '').trim() || 'URL_Printer_Export';
      
      let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
      `;

      const elements = containerElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, table, .doc-callout, .doc-notes-area');
      
      elements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent.trim();
        if (!text && tag !== 'table') return;

        if (tag === 'h1' || el.classList.contains('doc-h1')) {
          xml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="0F766E"/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        } else if (tag === 'h2' || el.classList.contains('doc-h2')) {
          xml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0369A1"/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        } else if (tag === 'h3' || el.classList.contains('doc-h3')) {
          xml += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="334155"/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        } else if (tag === 'h4' || el.classList.contains('doc-h4')) {
          xml += `<w:p><w:pPr><w:pStyle w:val="Heading4"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        } else if (tag === 'blockquote') {
          xml += `<w:p><w:r><w:rPr><w:i/><w:color w:val="475569"/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        } else if (el.classList.contains('doc-callout')) {
          const header = el.querySelector('.doc-callout-header')?.textContent || 'Upozornění';
          const bodyText = el.querySelector('p')?.textContent || text;
          xml += `<w:p><w:r><w:rPr><w:b/><w:color w:val="0369A1"/></w:rPr><w:t>${this._escapeXml(header)}: </w:t></w:r><w:r><w:t>${this._escapeXml(bodyText)}</w:t></w:r></w:p>`;
        } else if (el.classList.contains('doc-notes-area')) {
          xml += `<w:p><w:r><w:rPr><w:i/><w:color w:val="64748B"/></w:rPr><w:t>[Prostor pro studentské zápisky a poznámky]</w:t></w:r></w:p>`;
          xml += `<w:p><w:r><w:t>__________________________________________________________________</w:t></w:r></w:p>`;
          xml += `<w:p><w:r><w:t>__________________________________________________________________</w:t></w:r></w:p>`;
        } else if (tag === 'p') {
          xml += `<w:p><w:r><w:t>${this._escapeXml(text)}</w:t></w:r></w:p>`;
        }
      });

      xml += `
          <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
          </w:sectPr>
        </w:body>
      </w:document>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
        <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
        <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
      </w:styles>`;

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      </Types>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`;

      const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      </Relationships>`;

      const zip = new SimpleZip();
      zip.file('[Content_Types].xml', contentTypesXml);
      zip.file('_rels/.rels', relsXml);
      zip.file('word/_rels/document.xml.rels', docRelsXml);
      zip.file('word/styles.xml', stylesXml);
      zip.file('word/document.xml', xml);

      const blob = zip.generateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    }

    static _escapeXml(str) {
      return (str || '').replace(/[<>&'"]/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
      }[c]));
    }
  }

  class SimpleZip {
    constructor() {
      this.files = {};
    }

    file(name, content) {
      this.files[name] = content;
    }

    generateBlob() {
      const entries = [];
      let offset = 0;
      const encoder = new TextEncoder();

      Object.keys(this.files).forEach(filename => {
        const data = encoder.encode(this.files[filename]);
        const nameBytes = encoder.encode(filename);

        const header = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(header.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        view.setUint32(14, this._crc32(data), true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        header.set(nameBytes, 30);

        entries.push({
          filename: filename,
          nameBytes: nameBytes,
          header: header,
          data: data,
          offset: offset,
          crc: this._crc32(data)
        });

        offset += header.length + data.length;
      });

      const cdEntries = [];
      let cdSize = 0;
      entries.forEach(e => {
        const cd = new Uint8Array(46 + e.nameBytes.length);
        const view = new DataView(cd.buffer);
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        view.setUint16(14, 0, true);
        view.setUint32(16, e.crc, true);
        view.setUint32(20, e.data.length, true);
        view.setUint32(24, e.data.length, true);
        view.setUint16(28, e.nameBytes.length, true);
        view.setUint16(30, 0, true);
        view.setUint16(32, 0, true);
        view.setUint16(34, 0, true);
        view.setUint16(36, 0, true);
        view.setUint32(38, 0, true);
        view.setUint32(42, e.offset, true);
        cd.set(e.nameBytes, 46);

        cdEntries.push(cd);
        cdSize += cd.length;
      });

      const eocd = new Uint8Array(22);
      const eocdView = new DataView(eocd.buffer);
      eocdView.setUint32(0, 0x06054b50, true);
      eocdView.setUint16(4, 0, true);
      eocdView.setUint16(6, 0, true);
      eocdView.setUint16(8, entries.length, true);
      eocdView.setUint16(10, entries.length, true);
      eocdView.setUint32(12, cdSize, true);
      eocdView.setUint32(16, offset, true);
      eocdView.setUint16(20, 0, true);

      const blobParts = [];
      entries.forEach(e => {
        blobParts.push(e.header);
        blobParts.push(e.data);
      });
      cdEntries.forEach(cd => blobParts.push(cd));
      blobParts.push(eocd);

      return new Blob(blobParts, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    }

    _crc32(bytes) {
      let crc = -1;
      for (let i = 0; i < bytes.length; i++) {
        let byte = bytes[i];
        for (let j = 0; j < 8; j++) {
          const bit = (byte ^ crc) & 1;
          crc >>>= 1;
          if (bit) crc ^= 0xedb88320;
          byte >>>= 1;
        }
      }
      return (crc ^ -1) >>> 0;
    }
  }

  /* ==========================================================================
     8. APPLICATION CONTROLLER WITH UNDO/REDO & HISTORY STACK
     ========================================================================== */
  class URLPrinterApp {
    constructor() {
      this.chapterManager = new ChapterManager();
      this.pagination = new PaginationEngine(document.getElementById('sheet-viewport'));
      this.inspector = new BlockInspector(
        document.getElementById('inspector-panel'),
        (mutatorFn) => this._modifyBlock(mutatorFn)
      );

      this.currentZoom = 1.0;
      
      this.history = [];
      this.historyIndex = -1;
      this.maxHistory = 30;
      this.isPerformingHistoryAction = false;

      this._initApp();
    }

    _initApp() {
      this._bindTopBar();
      this._bindSidebars();
      this._bindModals();
      this._initProjectManagement();
      this._bindCanvasInteractions();
      this._bindKeyboardShortcuts();

      this.chapterManager.onChange(() => {
        this._renderChapterTree();
        this.repaginate();
        if (!this.isPerformingHistoryAction) {
          this._pushHistoryState();
        }
      });

      // Clean workspace on startup: No automatic sample preload!
      this.repaginate();
      this._pushHistoryState();
    }

    _pushHistoryState() {
      if (this.isPerformingHistoryAction) return;

      const state = {
        chapters: JSON.parse(JSON.stringify(this.chapterManager.chapters)),
        activeChapterId: this.chapterManager.activeChapterId,
        config: JSON.parse(JSON.stringify(this.pagination.config))
      };

      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      this.history.push(state);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }

      this._updateUndoRedoButtons();
    }

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this._restoreHistoryState(this.history[this.historyIndex]);
      }
    }

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this._restoreHistoryState(this.history[this.historyIndex]);
      }
    }

    _restoreHistoryState(state) {
      if (!state) return;
      this.isPerformingHistoryAction = true;

      this.chapterManager.chapters = JSON.parse(JSON.stringify(state.chapters));
      this.chapterManager.activeChapterId = state.activeChapterId;
      this.pagination.updateConfig(state.config);

      this._renderChapterTree();
      this.repaginate();
      this._updateUndoRedoButtons();

      this.isPerformingHistoryAction = false;
    }

    _updateUndoRedoButtons() {
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
      if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;
    }

    _bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
        ) {
          e.preventDefault();
          this.redo();
        }
      });
    }

    _modifyBlock(mutatorFn) {
      const activeChap = this.chapterManager.getActiveChapter();
      if (!activeChap) return;

      const temp = document.createElement('div');
      temp.innerHTML = activeChap.htmlContent;

      // Ensure every top-level child in active chapter has data-block-id
      Array.from(temp.children).forEach((child, idx) => {
        if (!child.getAttribute('data-block-id')) {
          child.setAttribute('data-block-id', 'blk_' + idx);
        }
        child.classList.remove('active-selected');
      });

      const selectedBlockId = this.inspector?.selectedBlockId;
      let target = selectedBlockId ? temp.querySelector(`[data-block-id="${selectedBlockId}"]`) : null;

      if (typeof mutatorFn === 'function') {
        mutatorFn(target, temp);
      }

      // Strip active-selected classes before saving
      temp.querySelectorAll('.active-selected').forEach(el => el.classList.remove('active-selected'));

      activeChap.htmlContent = temp.innerHTML;
      this.repaginate();
      this._pushHistoryState();

      if (this.inspector?.selectedBlockId) {
        this.inspector.reselectAfterRepagination(this.inspector.selectedBlockId);
      }
    }

    _syncAndRepaginate() {
      const selectedBlockId = this.inspector?.selectedBlockId;
      const activeChap = this.chapterManager.getActiveChapter();
      if (activeChap) {
        const sheetBodies = document.querySelectorAll('.sheet-body');
        let consolidatedHtml = '';
        sheetBodies.forEach(body => {
          Array.from(body.children).forEach(child => {
            if (!child.classList.contains('doc-toc-wrapper')) {
              consolidatedHtml += child.outerHTML + '\n';
            }
          });
        });
        if (consolidatedHtml) {
          activeChap.htmlContent = consolidatedHtml;
        }
      }
      this.repaginate();
      this._pushHistoryState();

      if (selectedBlockId && this.inspector) {
        this.inspector.reselectAfterRepagination(selectedBlockId);
      }
    }

    repaginate() {
      const activeChap = this.chapterManager.getActiveChapter();
      const fullHtml = this.chapterManager.getFullMergedHTML({
        showSourceInDoc: this.pagination.config.showSourceInDoc
      });
      const result = this.pagination.paginate(fullHtml, activeChap);
      
      const sheetCountEl = document.getElementById('stat-sheet-count');
      const chapterCountEl = document.getElementById('stat-chapter-count');
      if (sheetCountEl) sheetCountEl.textContent = `${result.sheetCount} stran`;
      if (chapterCountEl) chapterCountEl.textContent = `${this.chapterManager.chapters.length} kapitol`;
    }

    _bindTopBar() {
      const profileBtns = document.querySelectorAll('.profile-btn');
      profileBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          profileBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const profile = btn.getAttribute('data-profile');
          this._applyProfile(profile);
        });
      });

      document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
      document.getElementById('btn-redo')?.addEventListener('click', () => this.redo());

      document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
        window.print();
      });

      document.getElementById('btn-export-docx')?.addEventListener('click', () => {
        const title = this.chapterManager.chapters[0]?.title || 'URL_Printer_Dokument';
        DocxExporter.exportToDocx(title, document.getElementById('sheet-viewport'));
      });

      document.getElementById('btn-save-project')?.addEventListener('click', () => {
        this._exportProjectJSON();
      });

      document.getElementById('btn-open-import')?.addEventListener('click', () => {
        document.getElementById('modal-import')?.classList.add('open');
      });

      document.getElementById('btn-zoom-in')?.addEventListener('click', () => this._setZoom(this.currentZoom + 0.1));
      document.getElementById('btn-zoom-out')?.addEventListener('click', () => this._setZoom(this.currentZoom - 0.1));
      document.getElementById('btn-zoom-spread')?.addEventListener('click', () => {
        this.pagination.updateConfig({ spreadView: !this.pagination.config.spreadView });
        this.repaginate();
      });
    }

    _setZoom(val) {
      this.currentZoom = Math.min(Math.max(val, 0.4), 1.8);
      const viewport = document.getElementById('sheet-viewport');
      if (viewport) {
        viewport.style.transform = `scale(${this.currentZoom})`;
        viewport.style.transformOrigin = 'top center';
      }
      const display = document.getElementById('zoom-val-display');
      if (display) display.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }

    _applyProfile(profile) {
      if (profile === 'web-identity') {
        document.body.setAttribute('data-theme', 'web-original');
        document.body.setAttribute('data-font', 'sans');
        this.pagination.updateConfig({
          format: 'a4',
          columns: 1,
          marginLeft: 20,
          marginRight: 20
        });
      } else if (profile === 'worksheet') {
        document.body.setAttribute('data-theme', 'modern-edu');
        document.body.setAttribute('data-font', 'sans');
        this.pagination.updateConfig({
          format: 'a4',
          columns: 1,
          marginLeft: 20,
          marginRight: 35
        });
      } else if (profile === 'compact-scripts') {
        document.body.setAttribute('data-theme', 'toner-saver');
        document.body.setAttribute('data-media-mode', 'toner-save');
        document.body.setAttribute('data-font', 'mono');
        this.pagination.updateConfig({
          format: 'a4',
          columns: 2,
          marginLeft: 15,
          marginRight: 15,
          marginTop: 15,
          marginBottom: 15
        });
      } else if (profile === 'ebook-reader') {
        document.body.setAttribute('data-theme', 'warm-notebook');
        document.body.setAttribute('data-font', 'serif');
        this.pagination.updateConfig({
          format: 'a5',
          columns: 1,
          marginLeft: 18,
          marginRight: 18
        });
      } else {
        document.body.setAttribute('data-theme', 'academic');
        document.body.setAttribute('data-font', 'serif');
        this.pagination.updateConfig({
          format: 'a4',
          columns: 1,
          marginLeft: 20,
          marginRight: 20
        });
      }
      this.repaginate();
      this._pushHistoryState();
    }

    _bindSidebars() {
      const tabs = document.querySelectorAll('.sidebar-tab-btn');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.getAttribute('data-tab');
          const tChap = document.getElementById('tab-chapters');
          const tLay = document.getElementById('tab-layout');
          const tThem = document.getElementById('tab-themes');
          if (tChap) tChap.style.display = target === 'chapters' ? 'flex' : 'none';
          if (tLay) tLay.style.display = target === 'layout' ? 'flex' : 'none';
          if (tThem) tThem.style.display = target === 'themes' ? 'flex' : 'none';
        });
      });

      document.getElementById('sel-paper-format')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ format: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-orientation')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ orientation: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-columns')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ columns: parseInt(e.target.value) || 1 });
        this.repaginate();
        this._pushHistoryState();
      });

      const marginSlider = document.getElementById('range-margins');
      marginSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const disp = document.getElementById('margin-val-display');
        if (disp) disp.textContent = `${val} mm`;
        this.pagination.updateConfig({
          marginTop: val,
          marginBottom: val,
          marginLeft: val,
          marginRight: val
        });
        this.repaginate();
      });
      marginSlider?.addEventListener('change', () => this._pushHistoryState());

      // Image Customization Global Selectors
      document.getElementById('sel-img-border')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ imgBorder: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-img-shadow')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ imgShadow: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-img-radius')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ imgRadius: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-img-bg')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ imgBg: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      // Brand color picker
      document.getElementById('input-brand-color')?.addEventListener('input', (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty('--web-extracted-primary', color);
        document.documentElement.style.setProperty('--doc-primary', color);
        document.documentElement.style.setProperty('--doc-headings', '#0f172a');
        this.repaginate();
      });

      // URL Source reference display checkboxes
      document.getElementById('chk-show-source-doc')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ showSourceInDoc: e.target.checked });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('chk-show-source-header')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ showSourceInHeader: e.target.checked });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('chk-show-source-footer')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ showSourceInFooter: e.target.checked });
        this.repaginate();
        this._pushHistoryState();
      });

      // TOC Toggle & Position
      document.getElementById('chk-enable-toc')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ enableAutoTOC: e.target.checked });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-toc-position')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ tocPosition: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      // Header Controls
      document.getElementById('chk-enable-header')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ includeHeader: e.target.checked });
        document.getElementById('header-inputs-box').style.display = e.target.checked ? 'flex' : 'none';
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('input-header-left')?.addEventListener('input', (e) => {
        this.pagination.updateConfig({ headerLeft: e.target.value });
        this.repaginate();
      });

      document.getElementById('input-header-right')?.addEventListener('input', (e) => {
        this.pagination.updateConfig({ headerRight: e.target.value });
        this.repaginate();
      });

      // Footer Controls
      document.getElementById('chk-enable-footer')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ includeFooter: e.target.checked });
        document.getElementById('footer-inputs-box').style.display = e.target.checked ? 'flex' : 'none';
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('input-footer-left')?.addEventListener('input', (e) => {
        this.pagination.updateConfig({ footerLeft: e.target.value });
        this.repaginate();
      });

      document.getElementById('sel-page-num-format')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ pageNumFormat: e.target.value });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('chk-enable-qr')?.addEventListener('change', (e) => {
        this.pagination.updateConfig({ enableQRFootnotes: e.target.checked });
        this.repaginate();
        this._pushHistoryState();
      });

      document.getElementById('sel-media-mode')?.addEventListener('change', (e) => {
        document.body.setAttribute('data-media-mode', e.target.value);
        this._pushHistoryState();
      });

      document.getElementById('sel-font-family')?.addEventListener('change', (e) => {
        document.body.setAttribute('data-font', e.target.value);
        this._pushHistoryState();
      });

      const paletteCards = document.querySelectorAll('.palette-card');
      paletteCards.forEach(card => {
        card.addEventListener('click', () => {
          paletteCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const theme = card.getAttribute('data-theme');
          document.body.setAttribute('data-theme', theme);
          this._pushHistoryState();
        });
      });

      // Quick educational element injectors
      document.getElementById('insert-task-tile')?.addEventListener('click', () => {
        this._insertCustomElement(`
          <div class="doc-callout doc-callout-task doc-element" data-block-type="callout" data-callout-type="task">
            <div class="doc-callout-header">✏️ Samostatný úkol pro studenty</div>
            <p>Napište zadání úlohy nebo otázku k probrané látce...</p>
          </div>
        `);
      });

      document.getElementById('insert-def-tile')?.addEventListener('click', () => {
        this._insertCustomElement(`
          <div class="doc-callout doc-callout-def doc-element" data-block-type="callout" data-callout-type="def">
            <div class="doc-callout-header">💡 Definice klíčového pojmu</div>
            <p>Zde uveďte přesnou definici odborného termínu...</p>
          </div>
        `);
      });

      document.getElementById('insert-notes-tile')?.addEventListener('click', () => {
        this._insertCustomElement(`
          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Linkované řádky pro zápisky a odpovědi</span>
              <span>Linkovaný sešit (7 mm)</span>
            </div>
            <div class="doc-notes-lines"></div>
          </div>
        `);
      });

      document.getElementById('insert-dots-tile')?.addEventListener('click', () => {
        this._insertCustomElement(`
          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Tečkovaná plocha pro nákresy a diagramy</span>
              <span>Tečkovaný rastr (5 mm)</span>
            </div>
            <div class="doc-notes-dots"></div>
          </div>
        `);
      });

      document.getElementById('insert-break-tile')?.addEventListener('click', () => {
        this._insertCustomElement(`
          <div class="doc-page-break doc-element" data-block-type="page-break" data-break-before="true">
            <span>✂️ Tvrzený zlom stránky (Page Break)</span>
          </div>
        `);
      });
    }

    _insertCustomElement(htmlString) {
      const activeChap = this.chapterManager.getActiveChapter();
      if (activeChap) {
        activeChap.htmlContent += `\n${htmlString}\n`;
        this.repaginate();
        this._pushHistoryState();
      } else {
        this.chapterManager.addChapter('Nová kapitola', htmlString);
      }
    }

    _renderChapterTree() {
      const container = document.getElementById('chapter-tree-list');
      if (!container) return;
      container.innerHTML = '';

      if (this.chapterManager.chapters.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #64748b; text-align: center; padding: 12px 0;">Žádné kapitoly. Klikněte na tlačítko níže pro načtení.</div>`;
        return;
      }

      this.chapterManager.chapters.forEach((ch, idx) => {
        const item = document.createElement('div');
        item.className = `chapter-item ${ch.id === this.chapterManager.activeChapterId ? 'active' : ''}`;
        item.innerHTML = `
          <span class="chapter-handle">⋮⋮</span>
          <span class="chapter-badge">#${idx + 1}</span>
          <span class="chapter-name">${this._escapeHTML(ch.title)}</span>
          <div class="chapter-actions">
            <button class="chapter-btn-icon move-up" title="Posunout nahoru">▲</button>
            <button class="chapter-btn-icon move-down" title="Posunout dolů">▼</button>
            <button class="chapter-btn-icon remove-btn" title="Odstranit">✕</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('chapter-btn-icon')) {
            this.chapterManager.setActiveChapter(ch.id);
          }
        });

        item.querySelector('.move-up').addEventListener('click', (e) => {
          e.stopPropagation();
          this.chapterManager.moveChapter(ch.id, -1);
        });

        item.querySelector('.move-down').addEventListener('click', (e) => {
          e.stopPropagation();
          this.chapterManager.moveChapter(ch.id, 1);
        });

        item.querySelector('.remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Opravdu chcete odstranit kapitolu "${ch.title}"?`)) {
            this.chapterManager.removeChapter(ch.id);
          }
        });

        container.appendChild(item);
      });
    }

    _bindCanvasInteractions() {
      const viewport = document.getElementById('sheet-viewport');
      if (!viewport) return;

      viewport.addEventListener('click', (e) => {
        const targetElement = e.target.closest('.sheet-body > *, [data-block-id], .doc-element');
        if (targetElement && !targetElement.classList.contains('sheet-body') && !targetElement.classList.contains('paper-sheet') && !targetElement.classList.contains('sheet-header') && !targetElement.classList.contains('sheet-footer')) {
          this.inspector.selectElement(targetElement);
        } else if (!e.target.closest('.inspector-sidebar, .app-sidebar, .app-topbar, .modal-window')) {
          this.inspector.deselect();
        }
      });

      viewport.addEventListener('blur', (e) => {
        if (e.target.classList && e.target.classList.contains('sheet-header')) {
          this.pagination.updateConfig({
            headerLeft: e.target.querySelector('.doc-title-running')?.textContent || '',
            headerRight: e.target.querySelector('.chapter-title-running')?.textContent || ''
          });
        }
      }, true);
    }

    _bindModals() {
      const modal = document.getElementById('modal-import');
      const closeBtn = document.getElementById('modal-import-close');
      const btnExecuteImport = document.getElementById('btn-execute-import');

      if (!modal) return;

      closeBtn?.addEventListener('click', () => modal.classList.remove('open'));

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });

      const samplePills = document.querySelectorAll('.sample-pill');
      samplePills.forEach(pill => {
        pill.addEventListener('click', () => {
          const sampleId = pill.getAttribute('data-sample-id');
          const sample = ContentExtractor.getSampleArticles().find(s => s.id === sampleId);
          if (sample) {
            this.chapterManager.addChapter(sample.title, sample.htmlContent, sample.sourceUrl);
            modal.classList.remove('open');
          }
        });
      });

      btnExecuteImport?.addEventListener('click', async () => {
        const urlInputEl = document.getElementById('import-url-input');
        const textInputEl = document.getElementById('import-text-input');
        const preserveStylesChk = document.getElementById('chk-preserve-web-styles');
        const preserveStyles = preserveStylesChk ? preserveStylesChk.checked : true;

        const urlInput = urlInputEl ? urlInputEl.value.trim() : '';
        const textInput = textInputEl ? textInputEl.value.trim() : '';

        if (urlInput) {
          btnExecuteImport.textContent = '⏳ Načítám a analyzuji web...';
          btnExecuteImport.disabled = true;
          try {
            const parsed = await ContentExtractor.fetchFromUrl(urlInput, preserveStyles);
            this.chapterManager.addChapter(parsed.title, parsed.htmlContent, urlInput);
            modal.classList.remove('open');
            if (urlInputEl) urlInputEl.value = '';
            setTimeout(() => this.repaginate(), 100);
            setTimeout(() => this.repaginate(), 400);
          } catch (err) {
            alert(err.message);
          } finally {
            btnExecuteImport.textContent = 'Importovat a vysázet';
            btnExecuteImport.disabled = false;
          }
        } else if (textInput) {
          const parsed = ContentExtractor.parseMarkdownOrHTML(textInput, '', preserveStyles);
          this.chapterManager.addChapter(parsed.title, parsed.htmlContent);
          modal.classList.remove('open');
          if (textInputEl) textInputEl.value = '';
          setTimeout(() => this.repaginate(), 100);
          setTimeout(() => this.repaginate(), 400);
        } else {
          alert('Prosím zadejte URL adresu nebo vložte text kapitoly.');
        }
      });
    }

    // ------------------------------------------------------------------------
    // PROJECT MANAGEMENT, .URLPRINT LOAD/SAVE & RECENT PROJECTS HISTORY
    // ------------------------------------------------------------------------
    _initProjectManagement() {
      // 1. Topbar & Modal Buttons
      const btnOpenProjects = document.getElementById('btn-open-projects');
      const modalProjects = document.getElementById('modal-projects');
      const modalProjectsClose = document.getElementById('modal-projects-close');
      const fileInput = document.getElementById('file-input-urlprint');
      const btnModalLoadFile = document.getElementById('btn-modal-load-file');
      const btnModalSaveCurrent = document.getElementById('btn-modal-save-current');
      const btnModalClearHistory = document.getElementById('btn-modal-clear-history');

      btnOpenProjects?.addEventListener('click', () => {
        this._renderProjectHistory();
        modalProjects?.classList.add('open');
      });

      modalProjectsClose?.addEventListener('click', () => {
        modalProjects?.classList.remove('open');
      });

      modalProjects?.addEventListener('click', (e) => {
        if (e.target === modalProjects) modalProjects.classList.remove('open');
      });

      btnModalLoadFile?.addEventListener('click', () => {
        fileInput?.click();
      });

      btnModalSaveCurrent?.addEventListener('click', () => {
        this._exportProjectJSON();
      });

      btnModalClearHistory?.addEventListener('click', () => {
        if (confirm('Opravdu chcete vymazat celou historii dříve uložených projektů?')) {
          localStorage.removeItem('url_printer_recent_projects');
          this._renderProjectHistory();
          this.showToast('Historie projektů byla vymazána.', '🗑️');
        }
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this._readAndLoadFile(file);
          fileInput.value = '';
        }
      });

      // 2. Drag & Drop of *.urlprint / *.json anywhere onto Studio
      const dropOverlay = document.getElementById('drop-zone-overlay');
      let dragCounter = 0;

      window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dropOverlay) dropOverlay.classList.add('active');
      });

      window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0 && dropOverlay) {
          dropOverlay.classList.remove('active');
        }
      });

      window.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.classList.remove('active');

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.name.endsWith('.urlprint') || file.name.endsWith('.json') || (file.type && file.type.includes('json'))) {
            this._readAndLoadFile(file);
          } else {
            this.showToast('Prosím přetáhněte platný soubor projektu *.urlprint', '⚠️');
          }
        }
      });
    }

    _readAndLoadFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result;
          if (content) {
            this.loadProjectFromJSON(content, file.name);
          }
        } catch (err) {
          alert('Chyba při načítání souboru: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    loadProjectFromJSON(jsonStringOrObject, sourceFileName = '') {
      try {
        const project = typeof jsonStringOrObject === 'string' ? JSON.parse(jsonStringOrObject) : jsonStringOrObject;
        if (!project || !Array.isArray(project.chapters) || project.chapters.length === 0) {
          throw new Error('Soubor neobsahuje platnou strukturu kapitol projektu *.urlprint.');
        }

        // 1. Restore Chapters
        this.chapterManager.chapters = project.chapters;
        this.chapterManager.activeChapterId = project.activeChapterId || project.chapters[0]?.id || '';

        // 2. Restore Configuration
        if (project.config) {
          this.pagination.updateConfig(project.config);
          this._syncUIControlsWithConfig(project.config);
        }

        // 3. Render and Repaginate
        this._renderChapterTree();
        this.repaginate();
        this._pushHistoryState();

        // 4. Save to Recent Projects Storage
        this._saveProjectToRecentHistory(project, sourceFileName);

        // 5. User Feedback
        const docTitle = project.title || project.chapters[0]?.title || sourceFileName || 'URL Printer Projekt';
        this.showToast(`Projekt "${docTitle}" byl úspěšně načten!`, '📂');

        const modalProjects = document.getElementById('modal-projects');
        if (modalProjects) modalProjects.classList.remove('open');
      } catch (e) {
        alert('Neplatný formát souboru .urlprint: ' + e.message);
      }
    }

    _syncUIControlsWithConfig(cfg) {
      if (!cfg) return;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
      };
      const setChk = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.checked = !!val;
      };

      setVal('sel-paper-format', cfg.format || 'a4');
      setVal('sel-orientation', cfg.orientation || 'portrait');
      setVal('sel-columns', cfg.columns || 1);
      setVal('range-margins', cfg.marginLeft || 20);
      const marginDisplay = document.getElementById('margin-val-display');
      if (marginDisplay) marginDisplay.textContent = `${cfg.marginLeft || 20} mm`;

      setChk('chk-show-source-doc', cfg.showSourceInDoc);
      setChk('chk-show-source-header', cfg.showSourceInHeader);
      setChk('chk-show-source-footer', cfg.showSourceInFooter !== false);

      setChk('chk-enable-toc', cfg.enableTOC);
      setVal('sel-toc-position', cfg.tocPosition || 'after-title');

      setChk('chk-enable-header', cfg.enableHeader !== false);
      setChk('chk-enable-footer', cfg.enableFooter !== false);
      setVal('input-header-left', cfg.headerLeft || '');
      setVal('input-header-right', cfg.headerRight || '');
      setVal('input-footer-left', cfg.footerLeft || '');
      setVal('sel-page-num-format', cfg.pageNumFormat || 'prefix');

      setVal('sel-img-border', cfg.imgBorder || 'none');
      setVal('sel-img-shadow', cfg.imgShadow || 'none');
      setVal('sel-img-radius', cfg.imgRadius || 'sharp');
      setVal('sel-img-bg', cfg.imgBg || 'none');

      setChk('chk-enable-qr', cfg.enableQR !== false);
      setVal('sel-media-mode', cfg.mediaMode || 'normal');

      // Update document.body data attributes
      document.body.setAttribute('data-theme', cfg.theme || 'web-original');
      document.body.setAttribute('data-font', cfg.font || 'sans');
      document.body.setAttribute('data-img-border', cfg.imgBorder || 'none');
      document.body.setAttribute('data-img-shadow', cfg.imgShadow || 'none');
      document.body.setAttribute('data-img-radius', cfg.imgRadius || 'sharp');
      document.body.setAttribute('data-img-bg', cfg.imgBg || 'none');
      document.body.setAttribute('data-media-mode', cfg.mediaMode || 'normal');

      // Update Active Palette Card in UI
      const paletteCards = document.querySelectorAll('.palette-card');
      paletteCards.forEach(c => {
        if (c.getAttribute('data-theme') === (cfg.theme || 'web-original')) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    }

    _saveProjectToRecentHistory(project, sourceFileName = '') {
      try {
        const title = project.title || project.chapters?.[0]?.title || sourceFileName.replace(/\.urlprint$/i, '') || 'URL Printer Dokument';
        const historyItem = {
          id: project.id || 'proj_' + Date.now(),
          title: title,
          updatedAt: new Date().toISOString(),
          chapterCount: project.chapters?.length || 0,
          sourceUrl: project.chapters?.[0]?.sourceUrl || '',
          format: project.config?.format || 'a4',
          theme: project.config?.theme || 'web-original',
          projectData: project
        };

        let list = [];
        try {
          list = JSON.parse(localStorage.getItem('url_printer_recent_projects') || '[]');
        } catch (e) { list = []; }

        // Remove if duplicate by title or id
        list = list.filter(p => p.id !== historyItem.id && p.title !== historyItem.title);
        list.unshift(historyItem);

        // Keep last 30 projects
        if (list.length > 30) list = list.slice(0, 30);
        localStorage.setItem('url_printer_recent_projects', JSON.stringify(list));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }

    _renderProjectHistory() {
      const container = document.getElementById('project-history-list');
      if (!container) return;
      container.innerHTML = '';

      let list = [];
      try {
        list = JSON.parse(localStorage.getItem('url_printer_recent_projects') || '[]');
      } catch (e) { list = []; }

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-history-state">
            <div class="empty-history-icon">📂</div>
            <div style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Zatím nemáte žádné uložené projekty</div>
            <div style="font-size: 11px; max-width: 320px; line-height: 1.4;">Jakmile importujete webovou stránku nebo uložíte projekt, objeví se zde pro rychlé opětovné otevření.</div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn btn-primary" onclick="document.getElementById('file-input-urlprint').click()">📂 Otevřít soubor .urlprint</button>
            </div>
          </div>
        `;
        return;
      }

      list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const dateObj = new Date(item.updatedAt);
        const formattedDate = dateObj.toLocaleDateString('cs-CZ', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const formatLabel = (item.format || 'a4').toUpperCase();
        const themeLabel = item.theme === 'web-original' ? '🌐 Styl webu' : (item.theme || 'Standard');

        card.innerHTML = `
          <div class="project-card-info">
            <div class="project-card-title-row">
              <span class="project-card-title">${this._escapeHTML(item.title)}</span>
              <span class="project-card-badge">${formatLabel}</span>
              <span class="project-card-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.3);">${themeLabel}</span>
            </div>
            <div class="project-card-meta">
              <span>🕒 ${formattedDate}</span>
              <span>📑 ${item.chapterCount} ${item.chapterCount === 1 ? 'kapitola' : (item.chapterCount < 5 ? 'kapitoly' : 'kapitol')}</span>
              ${item.sourceUrl ? `<span class="project-card-url" title="${this._escapeHTML(item.sourceUrl)}">🔗 ${this._escapeHTML(item.sourceUrl)}</span>` : ''}
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn-card-action btn-card-open" title="Otevřít a načíst tento projekt do studia">
              <span>🟢 Otevřít</span>
            </button>
            <button class="btn-card-action btn-card-export" title="Stáhnout jako soubor .urlprint">
              <span>💾</span>
            </button>
            <button class="btn-card-action btn-card-delete" title="Odstranit z historie">
              <span>✕</span>
            </button>
          </div>
        `;

        // Open Button
        card.querySelector('.btn-card-open').addEventListener('click', () => {
          this.loadProjectFromJSON(item.projectData, item.title);
        });

        // Export Button
        card.querySelector('.btn-card-export').addEventListener('click', () => {
          this._downloadProjectBlob(item.projectData, item.title);
        });

        // Delete Button
        card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Odstranit projekt "${item.title}" z historie?`)) {
            let updatedList = [];
            try {
              updatedList = JSON.parse(localStorage.getItem('url_printer_recent_projects') || '[]');
            } catch (err) {}
            updatedList = updatedList.filter(p => p.id !== item.id);
            localStorage.setItem('url_printer_recent_projects', JSON.stringify(updatedList));
            this._renderProjectHistory();
            this.showToast('Projekt byl odstraněn z historie.', '🗑️');
          }
        });

        container.appendChild(card);
      });
    }

    _downloadProjectBlob(projectData, customTitle = '') {
      const docTitle = customTitle || projectData.title || projectData.chapters?.[0]?.title || 'URL_Printer_Projekt';
      const cleanFileName = (docTitle || 'URL_Printer_Projekt').replace(/[^a-zA-Z0-9á-žÁ-Ž_-]/g, '_') + '.urlprint';

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      this.showToast(`Projekt byl stažen: ${cleanFileName}`, '💾');
    }

    _exportProjectJSON() {
      const firstTitle = this.chapterManager.chapters[0]?.title || 'URL_Printer_Projekt';
      const project = {
        version: '1.0',
        id: 'proj_' + Date.now(),
        title: firstTitle,
        createdAt: new Date().toISOString(),
        activeChapterId: this.chapterManager.activeChapterId,
        config: this.pagination.config,
        chapters: this.chapterManager.chapters
      };

      this._downloadProjectBlob(project, firstTitle);
      this._saveProjectToRecentHistory(project);
    }

    showToast(message, icon = '✨', duration = 3200) {
      const toast = document.getElementById('app-toast');
      const iconEl = document.getElementById('toast-icon');
      const msgEl = document.getElementById('toast-msg');

      if (!toast) return;
      if (iconEl) iconEl.textContent = icon;
      if (msgEl) msgEl.textContent = message;

      toast.classList.add('show');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new URLPrinterApp();
    });
  } else {
    window.app = new URLPrinterApp();
  }
})();
