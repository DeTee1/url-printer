/* ==========================================================================
   URL PRINTER - CONTENT EXTRACTOR, SANITIZER & SAMPLE ARTICLES
   Cleans ads, scripts, navbars, parses markdown/HTML and provides rich demo data
   ========================================================================== */

export class ContentExtractor {
  /**
   * Fetch a web page via CORS proxy or extract content directly
   */
  static async fetchFromUrl(url) {
    // 1. Try Jina Reader AI (High quality markdown/clean HTML extractor)
    try {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const res = await fetch(jinaUrl);
      if (res.ok) {
        const text = await res.text();
        return this.parseMarkdownOrHTML(text, url);
      }
    } catch (e) {
      console.warn('Jina proxy failed, falling back to AllOrigins proxy:', e);
    }

    // 2. Fallback: AllOrigins Proxy
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        return this.sanitizeRawHTML(data.contents, url);
      }
    } catch (e) {
      console.warn('AllOrigins failed, falling back to basic parser:', e);
    }

    throw new Error('Nepodařilo se načíst URL přes proxy. Můžete vložit text přímo jako HTML nebo Markdown.');
  }

  /**
   * Sanitizes raw HTML and removes unwanted elements
   */
  static sanitizeRawHTML(htmlString, sourceUrl = '') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 1. Remove clutter elements
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'header', 'footer',
      '.navbar', '.nav', '.footer', '.header', '.ad', '.ads', '.advertisement',
      '.cookie-banner', '.cookie-consent', '.popup', '.modal', '.sidebar',
      '.social-share', '.share-buttons', '.comments', '#comments', '.newsletter-signup',
      '.subscribe-box', '.related-posts', '.author-bio-footer'
    ];

    unwantedSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    });

    // 2. Identify main content container or fallback to body
    const mainEl = doc.querySelector('main, article, .post-content, .article-content, .entry-content, #content') || doc.body;

    // Extract title
    let title = '';
    const h1 = doc.querySelector('h1') || doc.querySelector('title');
    if (h1) title = h1.textContent.trim();
    if (!title) title = 'Kapitola z webu: ' + (sourceUrl || 'Bez názvu');

    // Clean inner content nodes
    const cleanContainer = document.createElement('div');
    cleanContainer.className = 'doc-content';

    const childNodes = Array.from(mainEl.children);
    childNodes.forEach(child => {
      const cleanNode = this._cleanSingleNode(child);
      if (cleanNode) cleanContainer.appendChild(cleanNode);
    });

    return {
      title: title,
      sourceUrl: sourceUrl,
      htmlContent: cleanContainer.innerHTML || '<p>Načtený obsah stránky.</p>'
    };
  }

  /**
   * Parses Markdown or HTML input text into clean structured DOM
   */
  static parseMarkdownOrHTML(text, sourceUrl = '') {
    if (text.includes('<p>') || text.includes('<div>') || text.includes('<article>')) {
      return this.sanitizeRawHTML(text, sourceUrl);
    }

    // Markdown Parser
    let title = 'Importovaný dokument';
    const lines = text.split('\n');
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

      // Title & Headings
      if (line.startsWith('# ')) {
        const headingText = line.substring(2).trim();
        if (!title || title === 'Importovaný dokument') title = headingText;
        html += `<h1 class="doc-element doc-h1">${this._escapeHTML(headingText)}</h1>\n`;
      } else if (line.startsWith('## ')) {
        html += `<h2 class="doc-element doc-h2">${this._escapeHTML(line.substring(3).trim())}</h2>\n`;
      } else if (line.startsWith('### ')) {
        html += `<h3 class="doc-element doc-h3">${this._escapeHTML(line.substring(4).trim())}</h3>\n`;
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

    return {
      title: title,
      sourceUrl: sourceUrl,
      htmlContent: html
    };
  }

  static _cleanSingleNode(node) {
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (!tag) return null;

    // Allowed tags
    const allowed = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'figure', 'img', 'div', 'section'];
    if (!allowed.includes(tag)) return null;

    const clone = node.cloneNode(true);
    clone.removeAttribute('style');
    clone.removeAttribute('onclick');
    clone.classList.add('doc-element');

    // Add specific heading classes
    if (tag === 'h1') clone.classList.add('doc-h1');
    if (tag === 'h2') clone.classList.add('doc-h2');
    if (tag === 'h3') clone.classList.add('doc-h3');

    return clone;
  }

  static _parseInline(str) {
    let s = this._escapeHTML(str);
    // Bold
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code
    s = s.replace(/`(.*?)`/g, '<code>$1</code>');
    // Links
    s = s.replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
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

  /**
   * Rich built-in sample educational materials for instant one-click testing
   */
  static getSampleArticles() {
    return [
      {
        id: 'physics-sample',
        title: 'Kvantová fyzika: Princip neurčitosti a vlnově-korpuskulární dualismus',
        sourceUrl: 'https://edu.fyzika-online.cz/kvantova-mechanika-uvod',
        htmlContent: `
          <h1 class="doc-element doc-h1">Kvantová fyzika: Princip neurčitosti a dualismus</h1>
          <p class="doc-element lead-paragraph">Kvantová mechanika představuje fundamentální teorii moderní fyziky, která popisuje chování hmoty a záření na atomární a subatomární úrovni. Na rozdíl od klasické newtonovské mechaniky se zde setkáváme s pravděpodobnostním pojetím reality.</p>
          
          <div class="doc-callout doc-callout-def doc-element" data-block-type="callout" data-callout-type="def">
            <div class="doc-callout-header">💡 Definice: Heisenbergův princip neurčitosti</div>
            <p>Nelze současně s libovolnou přesností změřit polohu (x) a hybnost (p) mikročástice. Součin jejich neurčitostí je vždy větší nebo roven redukované Planckově konstantě dělené dvěma:</p>
            <code>Δx · Δp ≥ ℏ / 2</code>
          </div>

          <h2 class="doc-element doc-h2">1. Vlnově-korpuskulární dualismus</h2>
          <p class="doc-element">Každý mikroskopický objekt (elektron, foton, neutron) vykazuje jak vlnové, tak částicové vlastnosti v závislosti na typu experimentu. Louis de Broglie v roce 1924 formuloval hypotézu, že každé částici o hybnosti <em>p</em> přísluší vlnová délka λ:</p>

          <div class="doc-callout doc-callout-formula doc-element" data-block-type="callout" data-callout-type="formula">
            <div class="doc-callout-header">📐 Vzorec de Broglieovy vlnové délky</div>
            <p><strong>λ = h / p = h / (m · v)</strong></p>
            <p style="font-size: 8.5pt; margin-top: 4px; color: var(--doc-text-muted);">Kde <em>h</em> je Planckova konstanta (6.626 × 10⁻³⁴ J·s) a <em>m</em> je klidová hmotnost částice.</p>
          </div>

          <h2 class="doc-element doc-h2">2. Interaktivní video demonstrace</h2>
          <p class="doc-element">Pro vizuální pochopení dvouštěrbinového experimentu shlédněte detailní animaci simulující kolaps vlnové funkce při detekci elektronů:</p>
          <p class="doc-element"><a href="https://www.youtube.com/watch?v=DfPeprQ7oGc" target="_blank">Video: Dvouštěrbinový experiment a interference částic (YouTube)</a></p>
          <p class="doc-element"><a href="https://cs.wikipedia.org/wiki/Kvantov%C3%A1_mechanika" target="_blank">Encyklopedický přehled kvantových stavů (Wikipedia)</a></p>

          <div class="doc-callout doc-callout-task doc-element" data-block-type="callout" data-callout-type="task">
            <div class="doc-callout-header">✏️ Samostatný úkol pro studenty</div>
            <p>1. Vypočítejte de Broglieovu vlnovou délku elektronu urychleného napětím 100 V.<br/>
            2. Proč nepozorujeme vlnové vlastnosti u těles makrosvěta (např. u letícího fotbalového míče)?</p>
          </div>

          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Prostor pro výpočty a studentské poznámky</span>
              <span>Linkovaný sešit (7 mm)</span>
            </div>
            <div class="doc-notes-lines"></div>
          </div>
        `
      },
      {
        id: 'biology-sample',
        title: 'Buněčná biologie: Fotosyntéza a energetický metabolismus rostlin',
        sourceUrl: 'https://biologie-skripta.cz/fotosynteza-faze-chloroplasty',
        htmlContent: `
          <h1 class="doc-element doc-h1">Fotosyntéza a energetický metabolismus rostlin</h1>
          <p class="doc-element lead-paragraph">Fotosyntéza je jedním z nejvýznamnějších biochemických procesů na Zemi, při kterém dochází k přeměně sluneční energie na energii chemických vazeb organických sloučenin za současného uvolňování kyslíku.</p>

          <div class="doc-callout doc-callout-summary doc-element" data-block-type="callout" data-callout-type="summary">
            <div class="doc-callout-header">⭐ Souhrnná biochemická rovnice fotosyntézy</div>
            <code>6 CO₂ + 12 H₂O + světelné kvantum (hν) ➔ C₆H₁₂O₆ + 6 O₂ + 6 H₂O</code>
          </div>

          <h2 class="doc-element doc-h2">1. Fáze fotosyntézy: Světelná a temnostní</h2>
          <table class="doc-element">
            <thead>
              <tr>
                <th>Parametr</th>
                <th>Světelná fáze (Primární)</th>
                <th>Temnostní fáze (Calvinův cyklus)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lokalizace</strong></td>
                <td>Thylakoidní membrána chloroplastu</td>
                <td>Stroma chloroplastu</td>
              </tr>
              <tr>
                <td><strong>Vstupy</strong></td>
                <td>Světlo, H₂O, NADP⁺, ADP + P</td>
                <td>CO₂, ATP, NADPH</td>
              </tr>
              <tr>
                <td><strong>Hlavní produkty</strong></td>
                <td>O₂ (odpadní produkt), ATP, NADPH</td>
                <td>Triozy, Glukóza, NADP⁺, ADP</td>
              </tr>
            </tbody>
          </table>

          <div class="doc-callout doc-callout-warn doc-element" data-block-type="callout" data-callout-type="warn">
            <div class="doc-callout-header">⚠️ Pozor na časté záměny u zkoušky</div>
            <p>Temnostní fáze nevyžaduje tmu! Může probíhat i na světle, ale její enzymatické reakce (v čele s enzymem RuBisCO) nejsou přímo závislé na fotonech, nýbrž na dodávce ATP a NADPH ze světelné fáze.</p>
          </div>

          <h2 class="doc-element doc-h2">2. Doporučené audio přednášky a zdroje</h2>
          <p class="doc-element"><a href="https://open.spotify.com/episode/biologie-podcast-chloroplasty" target="_blank">Podcast: Detailní biochemie enzymu RuBisCO a C4 cyklus rostlin (Spotify)</a></p>
          <p class="doc-element"><a href="https://khanacademy.org/science/biology/photosynthesis" target="_blank">Khan Academy: Kompletní interaktivní kurz fotosyntézy</a></p>

          <div class="doc-notes-area doc-element" data-block-type="notes">
            <div class="doc-notes-title">
              <span>Nákres stavby chloroplastu a poznámky (Tečkovaná mřížka 5mm)</span>
              <span>Tečkovaný rastr</span>
            </div>
            <div class="doc-notes-dots"></div>
          </div>
        `
      },
      {
        id: 'history-sample',
        title: 'Metodika výuky dějepisu: Kritická analýza historických pramenů',
        sourceUrl: 'https://dejepisne-listy.muni.cz/prace-s-prameny-metodika',
        htmlContent: `
          <h1 class="doc-element doc-h1">Kritická analýza primárních historických pramenů</h1>
          <p class="doc-element lead-paragraph">Moderní dějepisná výuka opouští memorování letopočtů a staví na badatelsky orientovaném vyučování. Žáci se stávají historiky zkoumajícími archivní dokumenty, deníky, fotografie i dobový tisk.</p>

          <h2 class="doc-element doc-h2">1. Čtyřkrokový model práce s pramenem</h2>
          <ol class="doc-element">
            <li><strong>Identifikace:</strong> Kdo je autorem pramene? Kdy, kde a pro koho dokument vznikl?</li>
            <li><strong>Kontextualizace:</strong> V jakém společenském a politickém ovzduší byl text sepsán?</li>
            <li><strong>Kritická analýza obsahu:</strong> Jaký jazyk a rétorické figury autor volí? Co zamlčuje?</li>
            <li><strong>Srovnání a syntéza:</strong> Jak výpověď ladí s dalšími nezávislými prameny téže doby?</li>
          </ol>

          <div class="doc-callout doc-callout-solution doc-element" data-block-type="callout" data-callout-type="solution">
            <div class="doc-callout-header">🔍 Vzorové řešení badatelské otázky</div>
            <p>Při hodnocení novinových zpráv z období studené války je nezbytné odlišit faktické zpravodajství od ideologického komentáře. Vždy vyhledejte původní tiskovou agenturu a ověřte překladové posuny.</p>
          </div>

          <h2 class="doc-element doc-h2">2. Digitální archivy a prameny</h2>
          <p class="doc-element"><a href="https://kramerius.nkp.cz" target="_blank">Národní digitální knihovna Kramerius: Digitalizované noviny a časopisy</a></p>
          <p class="doc-element"><a href="https://www.ustrcr.cz/vzdelavani/badatelsky-dejepis" target="_blank">Projekt Dějepis 21+: Metodické listy a prameny ÚSTR</a></p>

          <div class="doc-callout doc-callout-task doc-element" data-block-type="callout" data-callout-type="task">
            <div class="doc-callout-header">✏️ Badatelský úkol: Analýza dobové karikatury</div>
            <p>Prohlédněte si přiložený pramen v archivu a odpovězte: Které symboly autor použil pro znázornění mírové smlouvy? Komu karikatura přisuzuje odpovědnost za vypuknutí konfliktu?</p>
          </div>
        `
      }
    ];
  }
}
