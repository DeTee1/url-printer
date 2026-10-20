/* ==========================================================================
   URL PRINTER - QR CODE GENERATOR & SMART LINK ENRICHMENT
   Zero-dependency vector/canvas QR Code generator for print footnotes
   Full Reed-Solomon Byte-mode Implementation with ISO/IEC 18004 Standard
   (Versions 1-40, Multi-block Interleaving, 8-Mask Penalty Selection, UTF-8)
   ========================================================================== */

export class QRGenerator {
  static _initTables() {
    if (this._tablesInit) return;
    this.EXP = new Uint8Array(512);
    this.LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.EXP[i] = x;
      this.EXP[i + 255] = x;
      this.LOG[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }

    // [ecCodewordsPerBlock, numBlocks] for Versions 1..40 (ISO/IEC 18004 Table 9)
    this.EC_BLOCKS = {
      L: [
        null,
        [7, 1], [10, 1], [15, 1], [20, 1], [26, 1], [18, 2], [20, 2], [24, 2], [30, 2], [18, 4],
        [20, 4], [24, 4], [26, 4], [30, 4], [22, 6], [24, 6], [28, 6], [30, 6], [28, 7], [28, 8],
        [28, 8], [28, 9], [30, 9], [30, 10], [26, 12], [28, 12], [30, 12], [30, 13], [30, 14], [30, 15],
        [30, 16], [30, 17], [30, 18], [30, 19], [30, 19], [30, 20], [30, 21], [30, 22], [30, 24], [30, 25]
      ],
      M: [
        null,
        [10, 1], [16, 1], [26, 1], [18, 2], [24, 2], [16, 4], [18, 4], [22, 4], [22, 5], [26, 5],
        [30, 5], [22, 8], [22, 9], [24, 9], [24, 10], [28, 10], [28, 11], [26, 13], [26, 14], [26, 16],
        [26, 17], [28, 17], [28, 18], [28, 20], [28, 21], [28, 23], [28, 25], [28, 26], [28, 28], [28, 29],
        [28, 31], [28, 33], [28, 35], [28, 37], [28, 38], [28, 40], [28, 43], [28, 45], [28, 47], [28, 49]
      ]
    };

    this._tablesInit = true;
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
        next[j] ^= poly[j];
        next[j + 1] ^= this._gfMul(poly[j], this.EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  static _rsEncode(data, numEcBytes) {
    this._initTables();
    const genPoly = this._rsGenPoly(numEcBytes);
    const res = new Array(numEcBytes).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      res.shift();
      res.push(0);
      if (factor !== 0) {
        for (let j = 0; j < numEcBytes; j++) {
          res[j] ^= this._gfMul(genPoly[j + 1], factor);
        }
      }
    }
    return res;
  }

  static _getAlignmentCoords(version) {
    if (version <= 1) return [];
    const num = Math.floor(version / 7) + 2;
    const size = version * 4 + 17;
    const first = 6;
    const last = size - 7;
    if (num === 2) return [first, last];
    const step = version === 32 ? 26 : Math.ceil((last - first) / (num - 1) / 2) * 2;
    const coords = new Array(num);
    coords[0] = first;
    for (let i = num - 1; i >= 1; i--) {
      coords[i] = last - (num - 1 - i) * step;
    }
    return coords;
  }

  static _getTotalCodewords(version) {
    const size = version * 4 + 17;
    let modules = size * size;
    modules -= 192;
    modules -= 31;
    modules -= 2 * (size - 16);
    if (version >= 2) {
      const k = Math.floor(version / 7) + 2;
      modules -= 25 * (k * k - 3) - 10 * (k - 2);
    }
    if (version >= 7) {
      modules -= 36;
    }
    return Math.floor(modules / 8);
  }

  static _encodeUTF8(text) {
    const str = String(text ?? '');
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    return bytes;
  }

  static _drawFunctionPatterns(matrix, isFunction, version) {
    const size = matrix.length;
    const setFunctionModule = (r, c, val) => {
      matrix[r][c] = val ? 1 : 0;
      isFunction[r][c] = true;
    };

    const drawFinder = (r0, c0) => {
      for (let dy = -1; dy <= 7; dy++) {
        for (let dx = -1; dx <= 7; dx++) {
          const r = r0 + dy;
          const c = c0 + dx;
          if (r >= 0 && r < size && c >= 0 && c < size) {
            const inOuter = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
            const isDark = inOuter && (dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4));
            setFunctionModule(r, c, isDark ? 1 : 0);
          }
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      const bit = i % 2 === 0 ? 1 : 0;
      if (!isFunction[6][i]) setFunctionModule(6, i, bit);
      if (!isFunction[i][6]) setFunctionModule(i, 6, bit);
    }

    const alignCoords = this._getAlignmentCoords(version);
    for (let i = 0; i < alignCoords.length; i++) {
      for (let j = 0; j < alignCoords.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === alignCoords.length - 1) || (i === alignCoords.length - 1 && j === 0)) {
          continue;
        }
        const r0 = alignCoords[i];
        const c0 = alignCoords[j];
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const isDark = Math.abs(dy) === 2 || Math.abs(dx) === 2 || (dy === 0 && dx === 0);
            setFunctionModule(r0 + dy, c0 + dx, isDark ? 1 : 0);
          }
        }
      }
    }

    setFunctionModule(size - 8, 8, 1);
    for (let i = 0; i <= 8; i++) {
      if (!isFunction[8][i]) setFunctionModule(8, i, 0);
      if (!isFunction[i][8]) setFunctionModule(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, 0);
    }
    for (let i = 0; i < 7; i++) {
      if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, 0);
    }

    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) {
        rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
      }
      const verBits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = (verBits >> i) & 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunctionModule(a, b, bit);
        setFunctionModule(b, a, bit);
      }
    }
  }

  static _drawFormatBits(matrix, ecLevel, mask) {
    const size = matrix.length;
    const ecIndicator = ecLevel === 'L' ? 1 : ecLevel === 'M' ? 0 : ecLevel === 'Q' ? 3 : 2;
    const data = (ecIndicator << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) matrix[i][8] = (bits >> i) & 1;
    matrix[7][8] = (bits >> 6) & 1;
    matrix[8][8] = (bits >> 7) & 1;
    matrix[8][7] = (bits >> 8) & 1;
    for (let i = 9; i < 15; i++) matrix[8][14 - i] = (bits >> i) & 1;

    for (let i = 0; i < 8; i++) matrix[8][size - 1 - i] = (bits >> i) & 1;
    for (let i = 8; i < 15; i++) matrix[size - 15 + i][8] = (bits >> i) & 1;

    matrix[size - 8][8] = 1;
  }

  static _maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (r + c) % 2 === 0;
    }
  }

  static _computePenalty(matrix) {
    const size = matrix.length;
    let penalty = 0;

    const scoreLine = (getMod) => {
      let runColor = getMod(0);
      let runLen = 1;
      for (let i = 1; i < size; i++) {
        const c = getMod(i);
        if (c === runColor) {
          runLen++;
          if (runLen === 5) penalty += 3;
          else if (runLen > 5) penalty += 1;
        } else {
          runColor = c;
          runLen = 1;
        }
      }
      for (let i = 0; i <= size - 11; i++) {
        if (
          getMod(i) === 1 && getMod(i + 1) === 0 && getMod(i + 2) === 1 &&
          getMod(i + 3) === 1 && getMod(i + 4) === 1 && getMod(i + 5) === 0 && getMod(i + 6) === 1 &&
          ((i + 10 < size && getMod(i + 7) === 0 && getMod(i + 8) === 0 && getMod(i + 9) === 0 && getMod(i + 10) === 0) ||
           (i >= 4 && getMod(i - 1) === 0 && getMod(i - 2) === 0 && getMod(i - 3) === 0 && getMod(i - 4) === 0))
        ) {
          penalty += 40;
        }
      }
    };

    for (let r = 0; r < size; r++) scoreLine(c => matrix[r][c]);
    for (let c = 0; c < size; c++) scoreLine(r => matrix[r][c]);

    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = matrix[r][c];
        if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
          penalty += 3;
        }
      }
    }

    let dark = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) dark++;
      }
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    if (k > 0) penalty += k * 10;

    return penalty;
  }

  static generateMatrix(text, errorCorrectLevel = 'M') {
    this._initTables();
    const utf8Bytes = this._encodeUTF8(text || 'https://urlprinter.studio');
    const len = utf8Bytes.length;

    let ecLevel = (errorCorrectLevel === 'L' || errorCorrectLevel === 'M') ? errorCorrectLevel : 'M';
    let version = 0;
    let totalCodewords = 0;
    let ecPerBlock = 0;
    let numBlocks = 0;
    let numDataBytes = 0;

    const findVersion = (lvl) => {
      const table = this.EC_BLOCKS[lvl];
      for (let v = 1; v <= 40; v++) {
        const totCw = this._getTotalCodewords(v);
        const [ecCw, blocks] = table[v];
        const dataCw = totCw - ecCw * blocks;
        const countBits = v < 10 ? 8 : 16;
        const requiredBits = 4 + countBits + len * 8;
        if (requiredBits <= dataCw * 8) {
          version = v;
          totalCodewords = totCw;
          ecPerBlock = ecCw;
          numBlocks = blocks;
          numDataBytes = dataCw;
          ecLevel = lvl;
          return true;
        }
      }
      return false;
    };

    if (!findVersion(ecLevel)) {
      if (ecLevel !== 'L') findVersion('L');
    }

    let payloadBytes = utf8Bytes;
    if (!version) {
      ecLevel = 'L';
      version = 40;
      totalCodewords = this._getTotalCodewords(40);
      [ecPerBlock, numBlocks] = this.EC_BLOCKS.L[40];
      numDataBytes = totalCodewords - ecPerBlock * numBlocks;
      payloadBytes = utf8Bytes.slice(0, numDataBytes - 3);
    }

    const bits = [];
    const appendBits = (val, count) => {
      for (let i = count - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };

    appendBits(0b0100, 4);
    appendBits(payloadBytes.length, version < 10 ? 8 : 16);
    for (let i = 0; i < payloadBytes.length; i++) {
      appendBits(payloadBytes[i], 8);
    }

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

    const numGroup2 = numDataBytes % numBlocks;
    const numGroup1 = numBlocks - numGroup2;
    const dataPerBlock1 = Math.floor(numDataBytes / numBlocks);
    const dataPerBlock2 = dataPerBlock1 + 1;

    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let b = 0; b < numBlocks; b++) {
      const blockLen = b < numGroup1 ? dataPerBlock1 : dataPerBlock2;
      const blockData = dataBytes.slice(offset, offset + blockLen);
      offset += blockLen;
      dataBlocks.push(blockData);
      ecBlocks.push(this._rsEncode(blockData, ecPerBlock));
    }

    const interleaved = [];
    const maxDataBlockLen = numGroup2 > 0 ? dataPerBlock2 : dataPerBlock1;
    for (let i = 0; i < maxDataBlockLen; i++) {
      for (let b = 0; b < numBlocks; b++) {
        if (i < dataBlocks[b].length) {
          interleaved.push(dataBlocks[b][i]);
        }
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < numBlocks; b++) {
        interleaved.push(ecBlocks[b][i]);
      }
    }

    const allBits = [];
    for (let i = 0; i < interleaved.length; i++) {
      const byte = interleaved[i];
      for (let b = 7; b >= 0; b--) allBits.push((byte >> b) & 1);
    }

    const moduleCount = version * 4 + 17;
    const baseMatrix = Array.from({ length: moduleCount }, () => new Uint8Array(moduleCount));
    const isFunction = Array.from({ length: moduleCount }, () => new Array(moduleCount).fill(false));

    this._drawFunctionPatterns(baseMatrix, isFunction, version);

    let bitIdx = 0;
    let right = moduleCount - 1;
    let upward = true;

    while (right > 0) {
      if (right === 6) right--;
      for (let i = 0; i < moduleCount; i++) {
        const r = upward ? moduleCount - 1 - i : i;
        for (let colOffset = 0; colOffset < 2; colOffset++) {
          const c = right - colOffset;
          if (!isFunction[r][c]) {
            baseMatrix[r][c] = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          }
        }
      }
      right -= 2;
      upward = !upward;
    }

    let bestPenalty = Infinity;
    let bestMatrix = null;

    for (let mask = 0; mask < 8; mask++) {
      const candidate = Array.from({ length: moduleCount }, (_, r) => {
        const row = new Array(moduleCount);
        for (let c = 0; c < moduleCount; c++) {
          let val = baseMatrix[r][c];
          if (!isFunction[r][c] && this._maskBit(mask, r, c)) {
            val ^= 1;
          }
          row[c] = val;
        }
        return row;
      });
      this._drawFormatBits(candidate, ecLevel, mask);
      const penalty = this._computePenalty(candidate);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMatrix = candidate;
      }
    }

    return bestMatrix;
  }

  static generateSVG(text, options = {}) {
    const colorDark = options.colorDark || '#000000';
    const colorLight = options.colorLight || '#ffffff';
    const margin = options.margin !== undefined ? Math.max(2, options.margin) : 2;

    let matrix;
    try {
      matrix = this.generateMatrix(text || 'https://urlprinter.studio', options.errorCorrectLevel || 'M');
    } catch (e) {
      console.error('QR Generator error:', e);
      matrix = this.generateMatrix('https://urlprinter.studio', 'M');
    }

    const moduleCount = matrix.length;
    const totalSize = moduleCount + margin * 2;

    let pathData = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c] === 1) {
          pathData += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }

    return `<svg viewBox="0 0 ${totalSize} ${totalSize}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="width: 100%; height: 100%; display: block; shape-rendering: crispEdges;"><rect width="${totalSize}" height="${totalSize}" fill="${colorLight}"/><path d="${pathData}" fill="${colorDark}" shape-rendering="crispEdges"/></svg>`;
  }

  static toSVG(text, size = 120, options = {}) {
    return this.generateSVG(text, options);
  }

  static renderToCanvas(text, canvas, options = {}) {
    const size = options.size || 120;
    const colorDark = options.colorDark || '#000000';
    const colorLight = options.colorLight || '#ffffff';
    const margin = options.margin !== undefined ? Math.max(2, options.margin) : 2;

    const qr = this.generateMatrix(text, options.errorCorrectLevel || 'M');
    const moduleCount = qr.length;
    const totalModules = moduleCount + margin * 2;
    const scale = Math.max(1, Math.floor(size / totalModules));
    const realSize = totalModules * scale;

    canvas.width = realSize;
    canvas.height = realSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = colorLight;
    ctx.fillRect(0, 0, realSize, realSize);

    ctx.fillStyle = colorDark;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr[r][c]) {
          ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  static toDataURL(text, size = 140) {
    const canvas = document.createElement('canvas');
    this.renderToCanvas(text, canvas, { size });
    return canvas.toDataURL('image/png');
  }

  static _normalizeUrl(rawUrl, baseUrl = '') {
    let u = (rawUrl || '').trim();
    if (!u || u.startsWith('#') || /^javascript:/i.test(u) || /^data:/i.test(u)) return '';
    if (u.startsWith('//')) {
      u = 'https:' + u;
    } else if (/^www\./i.test(u)) {
      u = 'https://' + u;
    } else if (!/^(?:https?:|mailto:|tel:)/i.test(u) && baseUrl) {
      try {
        u = new URL(u, baseUrl).href;
      } catch (e) {}
    }
    return u;
  }

  static extractAndCreateQRCards(containerElement, options = {}) {
    const qrCards = [];
    const defaultBaseUrl = containerElement.querySelector('[data-chapter-url]')?.getAttribute('data-chapter-url') || '';

    const links = containerElement.querySelectorAll('a[href]');
    let counter = 1;
    links.forEach(link => {
      const href = this._normalizeUrl(link.getAttribute('href'), defaultBaseUrl);
      if (!href) return;
      link.setAttribute('href', href);

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

      const svg = this.generateSVG(href, { margin: 2 });

      card.innerHTML = `
        <div class="doc-qr-canvas-wrapper">${svg}</div>
        <div class="doc-qr-info">
          <span class="doc-qr-badge">${badgeType} #${counter}</span>
          <div class="doc-qr-title">${this._escapeHTML(title)}</div>
          <div class="doc-qr-url">${this._escapeHTML(href)}</div>
        </div>
      `;

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
