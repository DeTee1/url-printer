/* ==========================================================================
   URL PRINTER - DYNAMIC TABLE OF CONTENTS (TOC) GENERATOR
   Scans headings across rendered sheets, computes real page numbers and renders leaders
   ========================================================================== */

export class TOCGenerator {
  /**
   * Generates a Table of Contents element based on currently rendered virtual sheets
   */
  static buildTOC(sheetsContainer, options = {}) {
    const depth = options.depth || 2; // 1 = H1, 2 = H1+H2, 3 = H1+H2+H3
    const title = options.title || 'Obsah dokumentu';

    const sheets = sheetsContainer.querySelectorAll('.paper-sheet');
    const tocItems = [];

    sheets.forEach((sheet, sheetIdx) => {
      const pageNumber = sheetIdx + 1;
      const headings = sheet.querySelectorAll('h1.doc-element, h2.doc-element, h3.doc-element, .chapter-cover-title');

      headings.forEach(h => {
        let level = 1;
        if (h.tagName === 'H2' || h.classList.contains('doc-h2')) level = 2;
        if (h.tagName === 'H3' || h.classList.contains('doc-h3')) level = 3;

        if (level <= depth) {
          const headingText = h.textContent.trim();
          if (headingText && !headingText.includes('Obsah dokumentu')) {
            // Assign anchor id if missing
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

    // Create TOC HTML Box
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
      <div class="doc-toc-title">📑 ${this._escapeHTML(title)}</div>
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
