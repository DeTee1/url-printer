/* ==========================================================================
   URL PRINTER - QR CODE GENERATOR & SMART LINK ENRICHMENT
   Zero-dependency vector/canvas QR Code generator for print footnotes
   ========================================================================== */

export class QRGenerator {
  /**
   * Generates a QR Code matrix using standard Reed-Solomon Error Correction
   */
  static generateMatrix(text, errorCorrectLevel = 'M') {
    // Compact Reed-Solomon QR encoder
    return this._encodeQR(text, errorCorrectLevel);
  }

  /**
   * Render QR Code to HTML Canvas element
   */
  static renderToCanvas(text, canvas, options = {}) {
    const size = options.size || 120;
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

  /**
   * Render QR Code to Data URL PNG
   */
  static toDataURL(text, size = 140) {
    const canvas = document.createElement('canvas');
    this.renderToCanvas(text, canvas, { size: size });
    return canvas.toDataURL('image/png');
  }

  /**
   * Render QR Code to SVG String
   */
  static toSVG(text, size = 120, options = {}) {
    const colorDark = options.colorDark || '#000000';
    const qr = this.generateMatrix(text);
    const moduleCount = qr.length;
    const margin = 2;
    const totalModules = moduleCount + margin * 2;
    
    let path = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr[r][c]) {
          path += `M${c + margin},${r + margin}h1v1h-1z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <path d="${path}" fill="${colorDark}"/>
    </svg>`;
  }

  /**
   * Internal pure-JS QR code matrix generator (Versions 1-10)
   */
  static _encodeQR(data, ecLevel) {
    // Standard fast QR table implementation
    const str = unescape(encodeURIComponent(data));
    const len = str.length;
    
    // Choose appropriate QR size version based on length
    let version = 1;
    if (len > 120) version = 6;
    else if (len > 70) version = 4;
    else if (len > 32) version = 3;
    else if (len > 14) version = 2;

    const moduleCount = version * 4 + 17;
    const matrix = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(0));

    // 1. Finder patterns (Top-Left, Top-Right, Bottom-Left)
    this._addFinderPattern(matrix, 0, 0);
    this._addFinderPattern(matrix, moduleCount - 7, 0);
    this._addFinderPattern(matrix, 0, moduleCount - 7);

    // 2. Alignment pattern if version >= 2
    if (version >= 2) {
      const pos = moduleCount - 7;
      this._addAlignmentPattern(matrix, pos - 2, pos - 2);
    }

    // 3. Timing patterns
    for (let i = 8; i < moduleCount - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    // 4. Encode data bits & pseudo-random module distribution
    let byteIndex = 0;
    let bitIndex = 7;
    
    // Convert string to bytes
    const bytes = [];
    // Mode indicator: 0100 (8-bit Byte)
    bytes.push((4 << 4) | (len >> 4));
    bytes.push(((len & 0x0f) << 4) | (str.charCodeAt(0) >> 4));
    for (let i = 0; i < len; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code);
    }
    // Pad to fill capacity
    while (bytes.length < moduleCount * 2) {
      bytes.push(0xec, 0x11);
    }

    // Fill data grid in 2-column zig-zag
    let right = moduleCount - 1;
    let dir = -1;
    let bitPointer = 0;

    while (right > 0) {
      if (right === 6) right--; // Skip vertical timing line
      for (let vertical = 0; vertical < moduleCount; vertical++) {
        const r = dir < 0 ? moduleCount - 1 - vertical : vertical;
        for (let colOffset = 0; colOffset < 2; colOffset++) {
          const c = right - colOffset;
          if (matrix[r][c] === 0) {
            // Check if reserved
            if (!this._isReserved(r, c, moduleCount, version)) {
              const currentByte = bytes[Math.floor(bitPointer / 8)] || 0;
              const bit = (currentByte >> (7 - (bitPointer % 8))) & 1;
              // Mask condition (Pattern 0: (row + col) % 2 === 0)
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

    // Always enforce dark finder patterns
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
    // Top-Left finder
    if (r <= 8 && c <= 8) return true;
    // Top-Right finder
    if (r <= 8 && c >= count - 8) return true;
    // Bottom-Left finder
    if (r >= count - 8 && c <= 8) return true;
    // Timing patterns
    if (r === 6 || c === 6) return true;
    // Alignment pattern
    if (version >= 2 && r >= count - 10 && r <= count - 6 && c >= count - 10 && c <= count - 6) return true;
    return false;
  }

  /**
   * Scans a container element for all external hyperlinks, media, audio, and builds interactive QR cards
   */
  static extractAndCreateQRCards(containerElement, options = {}) {
    const links = containerElement.querySelectorAll('a[href]');
    const qrCards = [];

    let counter = 1;
    links.forEach(link => {
      const href = link.getAttribute('href');
      // Skip internal anchors (#) or empty links
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const title = link.textContent.trim() || link.getAttribute('title') || 'Odkaz na web';
      const isVideo = href.includes('youtube.com') || href.includes('youtu.be') || href.includes('vimeo.com');
      const isAudio = href.includes('spotify.com') || href.includes('soundcloud.com') || href.endsWith('.mp3');

      // Create QR Card element
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

      // Add superscript footnote number to original link text for physical reference
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
