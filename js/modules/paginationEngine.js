/* ==========================================================================
   URL PRINTER - WYSIWYG PAGINATION & SHEET LAYOUT ENGINE
   Distributes DOM nodes across real A4/A5 sheets with headers, footers & widow control
   ========================================================================== */

import { QRGenerator } from './qrGenerator.js';
import { TOCGenerator } from './tocGenerator.js';

export class PaginationEngine {
  constructor(viewportElement) {
    this.viewport = viewportElement;
    this.sheets = [];
    this.config = {
      format: 'a4',            // 'a4', 'a5', 'letter'
      orientation: 'portrait',  // 'portrait', 'landscape'
      columns: 1,              // 1, 2, 3
      marginTop: 20,           // mm
      marginBottom: 20,        // mm
      marginLeft: 20,          // mm
      marginRight: 20,         // mm
      includeHeader: true,
      includeFooter: true,
      showPageNumbers: true,
      pageNumberPrefix: 'Strana',
      enableQRFootnotes: true,
      hideLinks: false,
      enableAutoTOC: true,
      docTitle: 'URL Printer Vzdělávací tiskovina',
      spreadView: false
    };
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    if (this.config.spreadView) {
      this.viewport.classList.add('spread-mode');
    } else {
      this.viewport.classList.remove('spread-mode');
    }
    if (this.config.hideLinks !== undefined) {
      document.body.setAttribute('data-hide-links', this.config.hideLinks ? 'true' : 'false');
      if (this.viewport) {
        this.viewport.querySelectorAll('.paper-sheet').forEach(s => {
          s.setAttribute('data-hide-links', this.config.hideLinks ? 'true' : 'false');
        });
      }
    }
  }

  /**
   * Paginates content HTML into structured paper sheets
   */
  paginate(rawHtml, metadata = {}) {
    this.viewport.innerHTML = '';
    this.sheets = [];

    // 1. Create temporary off-screen measurement sandbox
    const sandbox = document.createElement('div');
    sandbox.className = 'doc-content';
    sandbox.style.position = 'absolute';
    sandbox.style.visibility = 'hidden';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.top = '-9999px';
    sandbox.style.left = '-9999px';
    sandbox.innerHTML = rawHtml;
    document.body.appendChild(sandbox);

    // 2. Generate and attach QR Footnote cards if enabled
    if (this.config.enableQRFootnotes) {
      QRGenerator.extractAndCreateQRCards(sandbox);
    }

    // 3. Measure dimensions in pixels
    // 1mm ~ 3.7795275591px (96 DPI standard)
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
      // A4 default
      sheetWidthMm = this.config.orientation === 'portrait' ? 210 : 297;
      sheetHeightMm = this.config.orientation === 'portrait' ? 297 : 210;
    }

    const headerHeightMm = this.config.includeHeader ? 12 : 0;
    const footerHeightMm = this.config.includeFooter ? 12 : 0;

    const availableHeightMm = sheetHeightMm - (this.config.marginTop + this.config.marginBottom + headerHeightMm + footerHeightMm);
    const availableHeightPx = availableHeightMm * mmToPx;
    const availableWidthMm = sheetWidthMm - (this.config.marginLeft + this.config.marginRight);

    // Set sandbox width matching target sheet printable body
    sandbox.style.width = `${availableWidthMm}mm`;

    // 4. Collect elements to paginate
    let elements = Array.from(sandbox.children);

    // Insert TOC at beginning if enabled
    if (this.config.enableAutoTOC) {
      const dummyTOC = document.createElement('div');
      dummyTOC.className = 'doc-toc-wrapper doc-element';
      dummyTOC.setAttribute('data-block-type', 'toc');
      dummyTOC.innerHTML = '<div class="doc-toc-title">📑 Obsah dokumentu</div><div class="toc-placeholder" style="font-size: 8.5pt; color: var(--doc-text-muted);">Dynamicky generovaný obsah se zobrazí po rozvržení stran...</div>';
      elements.unshift(dummyTOC);
    }

    // 5. Paginate blocks into sheets
    let currentSheet = this._createEmptySheet(1, sheetWidthMm, sheetHeightMm);
    let currentSheetBody = currentSheet.querySelector('.sheet-body');
    let currentHeightPx = 0;
    let pageCount = 1;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const cloned = el.cloneNode(true);
      cloned.setAttribute('contenteditable', 'true');
      cloned.setAttribute('spellcheck', 'false');

      // Check for hard manual page break
      const isManualBreak = el.classList.contains('doc-page-break') || el.getAttribute('data-break-before') === 'true';

      // Measure block height
      const elHeightPx = el.offsetHeight || 30;

      // Check if element fits or requires new page
      const exceedsPage = (currentHeightPx + elHeightPx > availableHeightPx) && currentHeightPx > 0;
      
      // Widow/Orphan check: Avoid solitary heading at the bottom of the page
      const isHeading = el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.classList.contains('chapter-cover-block');
      const headingNearBottom = isHeading && (currentHeightPx + elHeightPx + 60 > availableHeightPx);

      if (isManualBreak || exceedsPage || headingNearBottom) {
        if (!isManualBreak || currentHeightPx > 0) {
          // Push current sheet and start new one
          this.viewport.appendChild(currentSheet);
          this.sheets.push(currentSheet);

          pageCount++;
          currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm);
          currentSheetBody = currentSheet.querySelector('.sheet-body');
          currentHeightPx = 0;
        }

        if (isManualBreak) {
          // If it was just a page break marker, skip appending the line itself to save page space
          continue;
        }
      }

      currentSheetBody.appendChild(cloned);
      currentHeightPx += elHeightPx;
    }

    // Append last sheet
    this.viewport.appendChild(currentSheet);
    this.sheets.push(currentSheet);

    // Clean up sandbox
    document.body.removeChild(sandbox);

    // 6. Update all running footers with total page count (`Strana X z Y`)
    this._updatePageNumbers(pageCount);

    // 7. Compute and render dynamic Table of Contents
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

  _createEmptySheet(pageNumber, widthMm, heightMm) {
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
      header.innerHTML = `
        <span class="doc-title-running">${this._escapeHTML(this.config.docTitle)}</span>
        <span class="chapter-title-running">URL Printer Studio</span>
      `;
      inner.appendChild(header);
    }

    // Sheet Body Container
    const body = document.createElement('div');
    body.className = 'sheet-body';
    body.setAttribute('data-columns', this.config.columns);
    inner.appendChild(body);

    // Running Footer
    if (this.config.includeFooter) {
      const footer = document.createElement('div');
      footer.className = 'sheet-footer';
      footer.innerHTML = `
        <span class="footer-note">Vytvořeno v URL Printer Studio</span>
        <span class="page-number-display">${this.config.pageNumberPrefix} ${pageNumber}</span>
      `;
      inner.appendChild(footer);
    }

    sheet.appendChild(inner);
    return sheet;
  }

  _updatePageNumbers(total) {
    this.sheets.forEach((sheet, idx) => {
      const num = idx + 1;
      const numDisplay = sheet.querySelector('.page-number-display');
      if (numDisplay) {
        numDisplay.textContent = `${this.config.pageNumberPrefix} ${num} z ${total}`;
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
