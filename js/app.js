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
     (Versions 1-40, Multi-block Interleaving, 8-Mask Penalty Selection, UTF-8)
     ========================================================================== */
  class QRGenerator {
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
      // 3 finder patterns + separators (3 * 64 = 192)
      modules -= 192;
      // Format info + dark module (31)
      modules -= 31;
      // Timing patterns (2 * (size - 16))
      modules -= 2 * (size - 16);
      // Alignment patterns
      if (version >= 2) {
        const k = Math.floor(version / 7) + 2;
        modules -= 25 * (k * k - 3) - 10 * (k - 2);
      }
      // Version info for V7..V40
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

      // 1. Finder patterns + 1-module white separators
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

      // 2. Timing patterns
      for (let i = 8; i < size - 8; i++) {
        const bit = i % 2 === 0 ? 1 : 0;
        if (!isFunction[6][i]) setFunctionModule(6, i, bit);
        if (!isFunction[i][6]) setFunctionModule(i, 6, bit);
      }

      // 3. Alignment patterns (skipping the 3 finder corners)
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

      // 4. Dark module & reserve Format Information slots
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

      // 5. Version Information (for Version >= 7)
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

      // Top-left copy (LSB i=0..14)
      for (let i = 0; i <= 5; i++) matrix[i][8] = (bits >> i) & 1;
      matrix[7][8] = (bits >> 6) & 1;
      matrix[8][8] = (bits >> 7) & 1;
      matrix[8][7] = (bits >> 8) & 1;
      for (let i = 9; i < 15; i++) matrix[8][14 - i] = (bits >> i) & 1;

      // Top-right and bottom-left copy (LSB i=0..14)
      for (let i = 0; i < 8; i++) matrix[8][size - 1 - i] = (bits >> i) & 1;
      for (let i = 8; i < 15; i++) matrix[size - 15 + i][8] = (bits >> i) & 1;

      // Always keep dark module = 1
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

      // Rule 1 & Rule 3 (runs of 5+ and finder-like patterns in rows & cols)
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
        // Check 1:1:3:1:1 with 4 light modules on either side
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

      // Rule 2: 2x2 solid blocks
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          const v = matrix[r][c];
          if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
            penalty += 3;
          }
        }
      }

      // Rule 4: Dark/light balance
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

      // Select EC Level and smallest Version (1..40) that fits byte stream
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

      // If text exceeds max QR capacity (2953 bytes), truncate safely to fit V40-L
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

      // Mode indicator: 0100 (Byte mode)
      appendBits(0b0100, 4);
      // Character count indicator (8 bits for V1-9, 16 bits for V10-40)
      appendBits(payloadBytes.length, version < 10 ? 8 : 16);
      for (let i = 0; i < payloadBytes.length; i++) {
        appendBits(payloadBytes[i], 8);
      }

      // Terminator (up to 4 zero bits)
      appendBits(0, Math.min(4, numDataBytes * 8 - bits.length));
      // Pad to byte boundary
      while (bits.length % 8 !== 0) bits.push(0);

      const dataBytes = [];
      for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
        dataBytes.push(b);
      }

      // Pad codewords alternating 0xEC, 0x11
      const pad = [0xEC, 0x11];
      let padIdx = 0;
      while (dataBytes.length < numDataBytes) {
        dataBytes.push(pad[padIdx % 2]);
        padIdx++;
      }

      // Split into Group 1 and Group 2 blocks and compute Reed-Solomon EC for each block
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

      // Interleave data codewords, then interleave EC codewords
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

      // Place data bits in 2-column upward/downward zig-zag skipping function modules
      let bitIdx = 0;
      let right = moduleCount - 1;
      let upward = true;

      while (right > 0) {
        if (right === 6) right--; // Skip vertical timing pattern column
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

      // Evaluate all 8 masks and choose the one with lowest penalty
      let bestMask = 0;
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
          bestMask = mask;
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

    static extractAndCreateQRCards(containerElement) {
      const defaultBaseUrl = containerElement.querySelector('[data-chapter-url]')?.getAttribute('data-chapter-url') || '';

      // 0. Refresh any pre-existing QR cards (e.g. from saved projects or video callouts) so their SVG is always valid
      containerElement.querySelectorAll('.doc-qr-card, .doc-qr-inline-card').forEach(card => {
        const wrapper = card.querySelector('.doc-qr-canvas-wrapper');
        const rawHref = card.getAttribute('data-href') || card.querySelector('a[href]')?.getAttribute('href') || card.querySelector('.doc-qr-url')?.textContent || '';
        const baseUrl = card.getAttribute('data-chapter-url') || defaultBaseUrl;
        const normUrl = this._normalizeUrl(rawHref, baseUrl);
        if (wrapper && normUrl) {
          wrapper.innerHTML = this.generateSVG(normUrl, { margin: 2 });
        }
      });

      // 1. Audio and Podcast elements -> QR Cards
      containerElement.querySelectorAll('audio, .audio-player, a[href$=".mp3"], a[href$=".wav"], a[href*="soundcloud.com"], a[href*="spotify.com"]').forEach(audioEl => {
        if (audioEl.closest('.doc-qr-card') || audioEl.closest('.doc-qr-inline-card')) return;
        let audioSrc = '';
        let audioTitle = 'Zvuková nahrávka';

        if (audioEl.tagName === 'AUDIO') {
          audioSrc = audioEl.getAttribute('src') || audioEl.querySelector('source')?.getAttribute('src') || '';
          audioTitle = audioEl.getAttribute('title') || 'Zvuková ukázka';
        } else if (audioEl.tagName === 'A') {
          audioSrc = audioEl.getAttribute('href') || '';
          audioTitle = audioEl.textContent.trim() || 'Zvuková ukázka';
        }

        const baseUrl = audioEl.closest('[data-chapter-url]')?.getAttribute('data-chapter-url') || defaultBaseUrl;
        const normAudioSrc = this._normalizeUrl(audioSrc, baseUrl);

        if (normAudioSrc) {
          const card = document.createElement('div');
          card.className = 'doc-callout doc-qr-card doc-element';
          card.setAttribute('data-block-type', 'qr-card');
          card.setAttribute('data-href', normAudioSrc);

          const svg = this.generateSVG(normAudioSrc, { margin: 2 });
          card.innerHTML = `
            <div class="doc-qr-canvas-wrapper">${svg}</div>
            <div class="doc-qr-info">
              <span class="doc-qr-badge">🎧 Zvuková ukázka</span>
              <div class="doc-qr-title">${this._escapeHTML(audioTitle)}</div>
              <div class="doc-qr-url">${this._escapeHTML(normAudioSrc)}</div>
            </div>
          `;
          audioEl.replaceWith(card);
        }
      });

      // 2. Video Callouts -> inject or refresh QR Code
      containerElement.querySelectorAll('.doc-callout-video').forEach(videoCard => {
        const link = videoCard.querySelector('a[href]');
        const rawVideoUrl = link ? link.getAttribute('href') : '';
        const baseUrl = videoCard.getAttribute('data-chapter-url') || defaultBaseUrl;
        const videoUrl = this._normalizeUrl(rawVideoUrl, baseUrl);
        if (!videoUrl) return;

        const existingWrapper = videoCard.querySelector('.doc-qr-canvas-wrapper');
        const svg = this.generateSVG(videoUrl, { margin: 2 });
        if (existingWrapper) {
          existingWrapper.innerHTML = svg;
        } else {
          const qrWrapper = document.createElement('div');
          qrWrapper.className = 'doc-qr-canvas-wrapper';
          qrWrapper.style.width = '22mm';
          qrWrapper.style.height = '22mm';
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
      });

      // 3. Web Links -> Insert QR Code Cards immediately AFTER the paragraph / block containing the link
      const blocks = Array.from(containerElement.querySelectorAll('p, li, blockquote, div.doc-element, table, figure'));
      
      let linkCounter = 1;
      const seenUrlsInDocument = new Map();
      const processedLinks = new WeakSet();

      blocks.forEach(block => {
        // Skip elements that are inside other QR cards, video cards or TOC
        if (block.closest('.doc-qr-card') || block.closest('.doc-qr-inline-card') || block.closest('.doc-callout-video') || block.closest('.doc-toc-wrapper') || block.closest('.doc-source-meta') || block.classList.contains('doc-qr-card') || block.classList.contains('doc-qr-inline-card') || block.classList.contains('doc-callout-video')) {
          return;
        }

        const baseUrl = block.getAttribute('data-chapter-url') || block.closest('[data-chapter-url]')?.getAttribute('data-chapter-url') || defaultBaseUrl;

        const linksInBlock = Array.from(block.querySelectorAll('a[href]')).filter(link => {
          if (processedLinks.has(link)) return false;
          if (link.closest('.doc-qr-card') || link.closest('.doc-qr-inline-card') || link.closest('.doc-callout-video')) return false;
          const norm = this._normalizeUrl(link.getAttribute('href'), baseUrl);
          return !!norm;
        });

        if (linksInBlock.length === 0) return;

        // Collect distinct URLs in this specific block
        const blockLinks = [];
        linksInBlock.forEach(link => {
          processedLinks.add(link);
          const href = this._normalizeUrl(link.getAttribute('href'), baseUrl);
          if (!href) return;
          link.setAttribute('href', href);

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

        // Insert QR code card(s) immediately after this block (skip if an identical QR card is already nextSibling)
        if (blockLinks.length > 0) {
          const insertTarget = (block.tagName === 'LI' && block.parentElement) ? block.parentElement : block;

          blockLinks.forEach(item => {
            // Check if a card for this URL already immediately follows insertTarget
            let nextEl = insertTarget.nextElementSibling;
            while (nextEl && (nextEl.classList.contains('doc-qr-inline-card') || nextEl.classList.contains('doc-qr-card'))) {
              const existingUrl = nextEl.getAttribute('data-href') || nextEl.querySelector('a[href]')?.getAttribute('href') || '';
              if (existingUrl === item.url) {
                const wrap = nextEl.querySelector('.doc-qr-canvas-wrapper');
                if (wrap) wrap.innerHTML = this.generateSVG(item.url, { margin: 2 });
                return;
              }
              nextEl = nextEl.nextElementSibling;
            }

            const card = document.createElement('div');
            card.className = 'doc-callout doc-qr-inline-card doc-element';
            card.setAttribute('data-block-type', 'callout');
            card.setAttribute('data-callout-type', 'qr');
            card.setAttribute('data-href', item.url);
            card.setAttribute('data-block-id', 'blk_qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));

            const svg = this.generateSVG(item.url, { margin: 2 });
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
      const titleText = options.title || (window.I18N ? window.I18N.t('doc_toc.title') : 'Table of Contents');
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
          if (h.closest('.doc-toc-wrapper') || h.textContent.includes('Obsah dokumentu') || h.textContent.includes('Table of Contents')) return;

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
        emptyLi.textContent = window.I18N ? window.I18N.t('doc_toc.empty') : 'Document does not contain any subheadings yet.';
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
    static async fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    static _isChallengeOrErrorPage(doc, htmlString = '') {
      if (!doc) return false;
      const title = (doc.title || '').trim().toLowerCase();

      // Explicit challenge interstitials
      const challengeTitles = [
        'attention required! | cloudflare',
        'just a moment...',
        'ddos protection by cloudflare',
        'security check'
      ];
      if (challengeTitles.some(ct => title === ct || title.startsWith(ct))) {
        return true;
      }

      // Check if title indicates error and the page has very little real body text (< 1500 chars)
      const errorTitles = ['access denied', '403 forbidden', '404 not found', 'error 404', 'page not found', 'stránka nenalezena'];
      const bodyText = (doc.body?.textContent || '').trim();
      if (errorTitles.some(et => title === et || title.startsWith(et)) && bodyText.length < 1500) {
        return true;
      }

      // Specific Cloudflare / Turnstile verification elements
      if (doc.querySelector('#challenge-running, #challenge-form, #cf-challenge-running, #cf-wrapper')) {
        if (bodyText.length < 2500) return true;
      }

      // Short cookie-blocking or JS-disabled interstitial
      const lowerBody = bodyText.toLowerCase();
      if (bodyText.length < 900) {
        if (lowerBody.includes('cookies must be enabled') ||
            lowerBody.includes('enable javascript and cookies') ||
            lowerBody.includes('něco nám brání v načtení stránky')) {
          return true;
        }
      }

      // Czech portal cookie consent walls (e.g. iDNES / MAFRA nastaveni-souhlasu)
      if (lowerBody.includes('abyste mohli pokračovat, potřebujeme vědět, jakou formou vám můžeme zobrazovat reklamu') ||
          lowerBody.includes('vámi zvolené nastavení neobsahuje souhlas se zobrazováním cílené reklamy')) {
        return true;
      }

      return false;
    }

    static async _decodeResponseHtml(res) {
      try {
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // 1. Strictly test if the byte stream is valid UTF-8.
        // Any legacy 8-bit Czech encoding (windows-1250 / iso-8859-2) containing diacritics
        // has standalone high bytes (0x80-0xFF) that are illegal in UTF-8 and will throw with fatal: true.
        // Conversely, when a rendering proxy (e.g. Jina Reader) transcodes a windows-1250 page to UTF-8
        // while keeping <meta charset="windows-1250"> in the HTML, fatal UTF-8 decode succeeds and MUST
        // be used so we don't corrupt valid UTF-8 into "VlĂˇda, co udolĂˇ" mojibake.
        try {
          const utf8Text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          const fffdCount = (utf8Text.match(/\uFFFD/g) || []).length;
          if (fffdCount > 2) {
            throw new Error('Proxy returned corrupted UTF-8 with replacement characters');
          }
          return utf8Text;
        } catch (utf8Err) {
          if (utf8Err.message === 'Proxy returned corrupted UTF-8 with replacement characters') {
            throw utf8Err;
          }
          // Byte stream is NOT valid UTF-8 -> decode using legacy 8-bit charset
        }

        // 2. Detect which 8-bit charset to use from HTTP header or <meta charset> tag
        const ct = (res.headers?.get?.('content-type') || '').toLowerCase();
        let encoding = '';
        const ctMatch = ct.match(/charset=([a-zA-Z0-9_-]+)/i);
        if (ctMatch) encoding = ctMatch[1].toLowerCase().trim();

        if (!encoding || encoding === 'utf-8' || encoding === 'utf8') {
          const preview = new TextDecoder('ascii').decode(bytes.slice(0, 4096));
          const m = preview.match(/<meta[^>]+charset=["']?([a-zA-Z0-9_-]+)/i) ||
                    preview.match(/<meta[^>]+content=["'][^"']*charset=([a-zA-Z0-9_-]+)/i);
          if (m) encoding = m[1].toLowerCase().trim();
        }

        if (encoding === 'iso-8859-2' || encoding === 'latin2') {
          return new TextDecoder('iso-8859-2').decode(bytes);
        } else if (encoding === 'windows-1252' || encoding === 'iso-8859-1' || encoding === 'latin1') {
          return new TextDecoder('windows-1252').decode(bytes);
        }
        // Default fallback for non-UTF-8 Central European raw byte streams (windows-1250 / cp1250)
        return new TextDecoder('windows-1250').decode(bytes);
      } catch (e) {
        if (e.message === 'Proxy returned corrupted UTF-8 with replacement characters') {
          throw e;
        }
        return await res.text();
      }
    }

    static async fetchFromUrl(targetUrl, preserveStyles = true) {
      const cleanUrl = targetUrl.trim();
      if (!cleanUrl) throw new Error('Zadejte platnou URL adresu.');

      // 0. Dedicated Official Wikipedia REST API (100% CORS-friendly and instant)
      if (cleanUrl.includes('wikipedia.org/wiki/')) {
        try {
          const wikiSlug = cleanUrl.split('/wiki/')[1]?.split('#')[0]?.split('?')[0];
          const wikiLang = (cleanUrl.match(/https?:\/\/([a-z-]+)\.wikipedia\.org/i) || [])[1] || 'en';
          if (wikiSlug) {
            const wikiRes = await this.fetchWithTimeout(`https://${wikiLang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(decodeURIComponent(wikiSlug))}`, {}, 6000);
            if (wikiRes.ok) {
              const wikiHtml = await this._decodeResponseHtml(wikiRes);
              if (wikiHtml && wikiHtml.length > 200) {
                return this.sanitizeRawHTML(wikiHtml, cleanUrl, preserveStyles);
              }
            }
          }
        } catch (e) {
          console.warn('Wikipedia direct API fallback:', e);
        }
      }

      const jinaTarget = cleanUrl.startsWith('http') ? cleanUrl : 'https://' + cleanUrl;

      // Prioritize full Raw HTML proxies with fast failover to Jina HTML Mode
      const proxies = [
        // 1. Direct CORS fetch (for CORS-enabled sites)
        async () => {
          const res = await this.fetchWithTimeout(cleanUrl, { mode: 'cors' }, 2500);
          if (res.ok) return await this._decodeResponseHtml(res);
          throw new Error('Direct fetch failed');
        },
        // 2. AllOrigins Raw Mode
        async () => {
          const res = await this.fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`, {}, 3500);
          if (res.ok) {
            const html = await this._decodeResponseHtml(res);
            if (html && html.length > 50 && html.includes('<')) return html;
          }
          throw new Error('AllOrigins Raw failed');
        },
        // 3. Jina Reader HTML Mode (Ultra-reliable headless browser rendered HTML)
        async () => {
          const res = await this.fetchWithTimeout('https://r.jina.ai/' + jinaTarget, {
            headers: {
              'X-Return-Format': 'html',
              'X-No-Cache': 'true'
            }
          }, 6000);
          if (res.ok) {
            const html = await this._decodeResponseHtml(res);
            if (html && html.includes('<')) return html;
          }
          throw new Error('Jina HTML failed');
        },
        // 4. CodeTabs CORS Proxy
        async () => {
          const res = await this.fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`, {}, 3500);
          if (res.ok) {
            const html = await this._decodeResponseHtml(res);
            if (html && html.length > 50) return html;
          }
          throw new Error('CodeTabs failed');
        },
        // 5. AllOrigins JSON API
        async () => {
          const res = await this.fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`, {}, 3500);
          if (res.ok) {
            const data = await res.json();
            if (data && data.contents && data.contents.length > 50) return data.contents;
          }
          throw new Error('AllOrigins JSON failed');
        },
        // 6. CorsProxy.io
        async () => {
          const res = await this.fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`, {}, 3500);
          if (res.ok) {
            const html = await this._decodeResponseHtml(res);
            if (html && html.length > 50 && html.includes('<')) return html;
          }
          throw new Error('CorsProxy.io failed');
        },
        // 7. Jina Reader Markdown mode (Last resort)
        async () => {
          const res = await this.fetchWithTimeout('https://r.jina.ai/' + jinaTarget, { headers: { 'X-No-Cache': 'true' } }, 6000);
          if (res.ok) {
            const md = await res.text();
            return { isMarkdown: true, content: md };
          }
          throw new Error('Jina Markdown failed');
        }
      ];

      for (let i = 0; i < proxies.length; i++) {
        const p = proxies[i];
        try {
          const data = await p();
          if (data && typeof data === 'string' && data.length > 50 && data.includes('<')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            if (this._isChallengeOrErrorPage(doc, data)) {
              throw new Error('Bot challenge detected');
            }
            let baseUrl = cleanUrl || window.location.href;
            try {
              const baseEl = doc.querySelector('base[href]');
              if (baseEl && baseEl.getAttribute('href')) {
                baseUrl = new URL(baseEl.getAttribute('href'), baseUrl).href;
              }
            } catch (e) {}

            // Inline external stylesheets with short non-blocking timeout
            await this._inlineExternalStylesheets(doc, baseUrl);

            const sanitized = this.sanitizeRawHTML(doc.documentElement.outerHTML, cleanUrl, preserveStyles);
            const checkDiv = document.createElement('div');
            checkDiv.innerHTML = sanitized.htmlContent || '';
            checkDiv.querySelectorAll('h1, .doc-source-meta, figure').forEach(el => el.remove());
            const bodyTextLen = checkDiv.textContent.trim().length;
            if (bodyTextLen < 40 && i < proxies.length - 1) {
              throw new Error('Proxy returned shell without article body text');
            }
            sanitized.rawHtml = doc.documentElement.outerHTML;
            return sanitized;
          }
          if (data && typeof data === 'object' && data.isMarkdown) {
            return this.parseMarkdownOrHTML(data.content, cleanUrl, preserveStyles);
          }
        } catch (e) {}
      }

      throw new Error(`Zabezpečení webu "${cleanUrl}" zabránilo přímému stažení. Otevřete stránku, zkopírujte text (Ctrl+A, Ctrl+C) a vložte jej do textového pole.`);
    }

    static async _inlineExternalStylesheets(doc, baseUrl) {
      if (!doc || !baseUrl) return;
      try {
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
        const filteredLinks = links.filter(l => {
          const href = l.getAttribute('href') || '';
          if (!href) return false;
          if (href.includes('fonts.googleapis.com') || href.includes('fonts.bunny.net') || href.includes('use.typekit.net')) return false;
          return true;
        });

        // Prioritize theme and main stylesheets when a page loads many bundles (e.g. Substack)
        filteredLinks.sort((a, b) => {
          const ha = (a.getAttribute('href') || '').toLowerCase();
          const hb = (b.getAttribute('href') || '').toLowerCase();
          const score = (h) => (h.includes('theme') || h.includes('main') || h.includes('article') || h.includes('post') ? 1 : 0);
          return score(hb) - score(ha);
        });

        const candidateLinks = filteredLinks.slice(0, 8);
        if (candidateLinks.length === 0) return;

        const promises = candidateLinks.map(async (l) => {
          try {
            const rawHref = l.getAttribute('href');
            const absoluteUrl = new URL(rawHref, baseUrl).href;
            let cssText = '';

            try {
              const res = await this.fetchWithTimeout(absoluteUrl, { mode: 'cors' }, 1800);
              if (res.ok) {
                cssText = await res.text();
              }
            } catch (e) {}

            if (!cssText || cssText.length < 20 || cssText.includes('<html')) {
              const cssProxyUrls = [
                `https://api.allorigins.win/raw?url=${encodeURIComponent(absoluteUrl)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(absoluteUrl)}`
              ];
              for (const proxyUrl of cssProxyUrls) {
                try {
                  const pRes = await this.fetchWithTimeout(proxyUrl, {}, 2500);
                  if (pRes.ok) {
                    const txt = await pRes.text();
                    if (txt && txt.length > 20 && !txt.includes('<html')) {
                      cssText = txt;
                      break;
                    }
                  }
                } catch (err) {}
              }
            }

            if (cssText && cssText.length > 20 && !cssText.includes('<html')) {
              // Rewrite relative url(...) in stylesheet to absolute URLs
              cssText = cssText.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/)([^'")]+)\1\s*\)/gi, (m, q, rel) => {
                try {
                  const resolved = new URL(rel.trim(), absoluteUrl).href;
                  return `url("${resolved}")`;
                } catch (e) {
                  return m;
                }
              });

              const styleEl = doc.createElement('style');
              styleEl.setAttribute('data-inlined-css-from', absoluteUrl);
              styleEl.textContent = cssText;
              doc.head ? doc.head.appendChild(styleEl) : doc.body.appendChild(styleEl);
            }
          } catch (e) {}
        });

        await Promise.allSettled(promises);
      } catch (e) {}
    }

    static _quillDeltaToHtml(ops) {
      if (!Array.isArray(ops) || ops.length === 0) return '';
      const blocks = [];
      let currentLineHtml = '';
      let activeListType = null;
      let listItems = [];

      const flushList = () => {
        if (listItems.length > 0 && activeListType) {
          const tag = activeListType === 'ordered' ? 'ol' : 'ul';
          blocks.push(`<${tag}>${listItems.join('')}</${tag}>`);
          listItems = [];
          activeListType = null;
        }
      };

      const flushLine = (lineAttrs = {}) => {
        const trimmed = currentLineHtml.trim();
        currentLineHtml = '';
        if (!trimmed) return;

        if (lineAttrs && lineAttrs.list) {
          const listType = lineAttrs.list === 'ordered' ? 'ordered' : 'bullet';
          if (activeListType && activeListType !== listType) flushList();
          activeListType = listType;
          listItems.push(`<li>${trimmed}</li>`);
          return;
        }

        flushList();

        if (lineAttrs && lineAttrs.header) {
          const hLevel = Math.min(Math.max(parseInt(lineAttrs.header, 10) || 2, 1), 6);
          blocks.push(`<h${hLevel}>${trimmed}</h${hLevel}>`);
          return;
        }

        if (lineAttrs && lineAttrs.blockquote) {
          blocks.push(`<blockquote><p>${trimmed}</p></blockquote>`);
          return;
        }

        // Convert standalone short bold lines (typical Quill subheadings) into <h2>
        const boldOnlyMatch = trimmed.match(/^<strong>([^<]{2,80})<\/strong>$/i);
        if (boldOnlyMatch && !/[.!?:;]$/.test(boldOnlyMatch[1].trim())) {
          blocks.push(`<h2>${boldOnlyMatch[1].trim()}</h2>`);
          return;
        }

        blocks.push(`<p>${trimmed}</p>`);
      };

      for (const op of ops) {
        if (!op) continue;
        if (typeof op.insert === 'object' && op.insert !== null) {
          if (op.insert.image) {
            flushLine();
            flushList();
            blocks.push(`<figure><img src="${this._escapeHTML(String(op.insert.image))}"></figure>`);
          }
          continue;
        }
        if (typeof op.insert !== 'string') continue;

        const attrs = op.attributes || {};
        if (op.insert === '\n' && (attrs.header || attrs.list || attrs.blockquote || attrs['code-block'])) {
          flushLine(attrs);
          continue;
        }

        const segments = op.insert.split('\n');
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (seg.length > 0) {
            let html = this._escapeHTML(seg);
            if (attrs.code) html = `<code>${html}</code>`;
            if (attrs.strike) html = `<s>${html}</s>`;
            if (attrs.underline) html = `<u>${html}</u>`;
            if (attrs.italic) html = `<em>${html}</em>`;
            if (attrs.bold) html = `<strong>${html}</strong>`;
            if (attrs.link) html = `<a href="${this._escapeHTML(String(attrs.link))}">${html}</a>`;
            currentLineHtml += html;
          }
          if (i < segments.length - 1) {
            const lineAttrs = (i === segments.length - 2 && (attrs.header || attrs.list || attrs.blockquote)) ? attrs : {};
            flushLine(lineAttrs);
          }
        }
      }

      flushLine();
      flushList();
      return blocks.join('\n');
    }

    static _hydrateSSRStateAndQuill(doc) {
      if (!doc) return;
      try {
        const stateScripts = Array.from(doc.querySelectorAll('script#serverApp-state, script#ng-state, script[type="application/json"]'));
        for (const script of stateScripts) {
          const rawText = (script.textContent || '').trim();
          if (!rawText || rawText.length < 50) continue;

          const unescaped = rawText
            .replace(/&q;/g, '"')
            .replace(/&s;/g, "'")
            .replace(/&a;/g, '&')
            .replace(/&l;/g, '<')
            .replace(/&g;/g, '>');

          let parsed;
          try {
            parsed = JSON.parse(unescaped);
          } catch (e) {
            continue;
          }
          if (!parsed || typeof parsed !== 'object') continue;

          // Locate article state entry (e.g. "page/public/articleComponent_article" on Angular Universal sites)
          let articleObj = parsed['page/public/articleComponent_article'];
          if (!articleObj) {
            for (const key of Object.keys(parsed)) {
              const val = parsed[key];
              if (val && typeof val === 'object' && (val.text?.ops || val.body || val.serverModel?.body)) {
                articleObj = val;
                break;
              }
            }
          }
          if (!articleObj) continue;

          // Inject author meta if missing from DOM
          const authorName = articleObj.author?.name || articleObj.serverModel?.author?.name;
          if (authorName && typeof authorName === 'string' && !doc.querySelector('meta[name="author"]')) {
            const meta = doc.createElement('meta');
            meta.setAttribute('name', 'author');
            meta.setAttribute('content', authorName.trim());
            (doc.head || doc.documentElement).appendChild(meta);
          }

          // Extract Quill Delta ops
          let ops = null;
          if (Array.isArray(articleObj.text?.ops)) {
            ops = articleObj.text.ops;
          } else {
            const rawBody = articleObj.body || articleObj.serverModel?.body || (typeof articleObj.text === 'string' ? articleObj.text : '');
            if (typeof rawBody === 'string' && rawBody.includes('"ops"')) {
              try {
                const bodyJson = JSON.parse(rawBody);
                if (Array.isArray(bodyJson.ops)) ops = bodyJson.ops;
              } catch (e) {}
            }
          }

          if (ops && ops.length > 0) {
            const renderedHtml = this._quillDeltaToHtml(ops);
            if (renderedHtml) {
              const targetContainer = doc.querySelector('quill-view, .article--content') || doc.querySelector('app-article-view');
              if (targetContainer && targetContainer.textContent.trim().length < 150) {
                targetContainer.innerHTML = `<div class="ql-container ngx-quill-view"><div class="ql-editor">${renderedHtml}</div></div>`;
              }
            }
          }
        }

        // Fallback: if visible paragraph text in DOM is still sparse (< 150 chars), check JSON-LD articleBody
        const existingPTextLen = Array.from(doc.querySelectorAll('article p, main p, p')).reduce((acc, p) => acc + p.textContent.trim().length, 0);
        if (existingPTextLen < 150) {
          const ldScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
          for (const ld of ldScripts) {
            try {
              const data = JSON.parse(ld.textContent || '');
              const items = Array.isArray(data) ? data : (Array.isArray(data?.['@graph']) ? data['@graph'] : [data]);
              for (const item of items) {
                if (item && typeof item.articleBody === 'string' && item.articleBody.trim().length > 200) {
                  const target = doc.querySelector('article, main, [itemprop="articleBody"]') || doc.body;
                  if (target) {
                    const paras = item.articleBody.trim().split(/\n{2,}|\r\n\r\n/).map(p => p.trim()).filter(Boolean);
                    const htmlParas = paras.map(p => `<p>${this._escapeHTML(p)}</p>`).join('\n');
                    const wrapper = doc.createElement('div');
                    wrapper.className = 'article-content';
                    wrapper.innerHTML = htmlParas;
                    target.appendChild(wrapper);
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('SSR state hydration warning:', e);
      }
    }

    static sanitizeRawHTML(htmlString, sourceUrl = '', preserveStyles = true) {
      if (!htmlString || typeof htmlString !== 'string') {
        throw new Error('Prázdný nebo neplatný HTML obsah');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      // Hydrate Angular Universal / Quill Delta SSR state if the article container in DOM is empty
      this._hydrateSSRStateAndQuill(doc);

      // Check for bot, paywall, or cookie barriers without false-flagging tech articles
      if (this._isChallengeOrErrorPage(doc, htmlString)) {
        throw new Error('Detekována blokace obsahu, captcha nebo chybová stránka webu.');
      }

      let baseUrl = sourceUrl || window.location.href;
      try {
        const baseEl = doc.querySelector('base[href]');
        if (baseEl && baseEl.getAttribute('href')) {
          baseUrl = new URL(baseEl.getAttribute('href'), baseUrl).href;
        }
      } catch (e) {}

      // 1. Identify Article Title - prioritize actual article headline before header logo / <title>
      const isHeaderLogo = (el) => {
        if (!el) return true;
        if (el.closest('header, nav, .site-header, .header, .navbar, .topbar, [class*="navbar"], [class*="site-header"]')) return true;
        const cls = (el.className || '').toLowerCase();
        if (cls.includes('logo') || cls.includes('brand') || cls.includes('site-title') || cls.includes('emblem') || cls.includes('masthead') || cls.includes('banner') || cls.includes('pub-headings')) return true;
        const directLink = el.querySelector(':scope > a[href="/"], :scope > a[href="./"]');
        if (directLink && !cls.includes('post-title') && !cls.includes('article-title') && !cls.includes('entry-title')) return true;
        if (el.querySelector('[data-wordmark-fit]')) return true;
        const txt = el.textContent.trim().toLowerCase();
        if (sourceUrl) {
          try {
            const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
            const baseHost = host.split('.')[0];
            if (txt === host || txt === baseHost || (txt.length < 15 && txt.includes(baseHost))) return true;
          } catch (e) {}
        }
        if (txt.length < 15 && (txt === 'idnes.cz' || txt === 'seznam zprávy' || txt === 'novinky.cz' || txt === 'aktualne.cz' || txt === 'deník n' || txt === 'the verge' || txt === 'bbc news')) {
          return true;
        }
        return false;
      };

      const explicitTitleSelectors = [
        'h1.post-title',
        'h1.article-title',
        'h1.article--heading',
        'h1.entry-title',
        '[data-hook="post-title"]',
        '.wp-block-post-title',
        '.gh-article-title',
        '.post-full-title',
        '.blog-item-title h1',
        '.article-template__title',
        '.pw-post-title',
        '[itemprop="headline"]',
        '.c-article-title',
        '.article__heading',
        '.article--heading',
        '.c-article-header__title',
        '.mol-article-header__title',
        '[data-dot="mol-article-title"]',
        '.articleNewDetail__title',
        '.e-web-aktualne-articles-show__title',
        '.entry-header h1',
        'article h1',
        'main h1',
        '.post-title',
        '.article-title',
        'h1'
      ];
      let articleTitleEl = null;
      for (const sel of explicitTitleSelectors) {
        const candidates = Array.from(doc.querySelectorAll(sel));
        const found = candidates.find(h => !isHeaderLogo(h));
        if (found) {
          articleTitleEl = found;
          break;
        }
      }
      const allH1s = Array.from(doc.querySelectorAll('h1'));
      let title = '';
      if (articleTitleEl) {
        title = articleTitleEl.textContent.trim().replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').trim();
      }
      if (!title) {
        const ogTitle = doc.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
        if (ogTitle) {
          title = (ogTitle.getAttribute('content') || '').trim();
        }
      }
      if (!title) {
        const titleTag = doc.querySelector('title');
        if (titleTag) {
          title = titleTag.textContent.trim();
        }
      }
      if (!title && allH1s.length > 0) {
        articleTitleEl = allH1s[0];
        title = articleTitleEl.textContent.trim().replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').trim();
      }
      // If title came from <title> or meta tag, clean trailing site brand only if delimited with padded separator
      if (title && (!articleTitleEl || isHeaderLogo(articleTitleEl))) {
        title = title.replace(/\s+[-–—|•·»]\s+[^-\n]{2,40}$/i, '').trim();
      } else if (title) {
        title = title.replace(/\s+[|•·»]\s+[^|\n]{2,30}$/i, '').trim();
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

      // Mark probe attribute on article title for resilient CSS extraction
      if (articleTitleEl) {
        articleTitleEl.setAttribute('data-up-probe', 'h1');
      }

      // 2. Identify the semantic main container using scoring engine
      let mainContainer = this._findBestArticleContainer(doc);

      // If no standard article container found, try Readability
      if ((!mainContainer || mainContainer === doc.body) && typeof Readability !== 'undefined') {
        try {
          const docClone = doc.cloneNode(true);
          const reader = new Readability(docClone, {
            keepClasses: true,
            charThreshold: 0,
            nbTopCandidates: 10,
            classesToPreserve: ['table', 'wp-block-table', 'wp-block-image', 'wp-block-embed', 'wp-block-embed-youtube', 'audio-player', 'gallery', 'lead', 'perex', 'intro', 'callout', 'alert']
          });
          const article = reader.parse();
          if (article && article.content) {
            const articleDoc = parser.parseFromString(article.content, 'text/html');
            mainContainer = articleDoc.body;
            if (!title && article.title) title = article.title.trim();
          }
        } catch (e) {
          console.warn('Readability parse fallback error:', e);
        }
      }

      if (!mainContainer) {
        mainContainer = doc.body;
      }

      // Mark probe attributes inside main container for reliable getComputedStyle
      if (mainContainer) {
        const probeP = Array.from(mainContainer.querySelectorAll('p')).find(p => p.textContent.trim().length > 25);
        if (probeP) probeP.setAttribute('data-up-probe', 'p');
        const probeH2 = mainContainer.querySelector('h2');
        if (probeH2) probeH2.setAttribute('data-up-probe', 'h2');
        const probeLink = mainContainer.querySelector('p a, a');
        if (probeLink) probeLink.setAttribute('data-up-probe', 'a');
      }

      const articleContext = {
        mainContainer: mainContainer,
        articleTitleEl: articleTitleEl,
        storyParagraphs: mainContainer ? Array.from(mainContainer.querySelectorAll('p')).filter(p => p.textContent.trim().length > 25) : []
      };

      // 3. Extract Design Tokens COUPLED with the detected article context
      const styleTokens = this._extractWebTokens(doc, sourceUrl, articleContext);

      // 4. Resolve all image URLs to absolute paths
      this._resolveAllImages(doc, baseUrl);

      // 5. Extract Lead / Hero Image (from metadata, header, or article hero)
      const leadImage = this._extractLeadImage(doc, baseUrl, mainContainer);

      // Clean unwanted clutter from the selected main container
      // Preserve video iframes (YouTube, Vimeo) for QR card generation, remove tracking/ad iframes
      if (mainContainer) {
        mainContainer.querySelectorAll('iframe').forEach(ifr => {
          const s = (ifr.getAttribute('src') || '').toLowerCase();
          if (!s.includes('youtube') && !s.includes('youtu.be') && !s.includes('vimeo')) {
            ifr.remove();
          }
        });
      }

      const unwantedSelectors = [
        'script', 'style', 'noscript', 'svg', 'canvas', 'form', 'nav',
        'footer', 'header', 'aside', 'button', 'input', 'select', 'textarea',
        '.advertisement', '.ad', '.ad-slot', '.adsbygoogle',
        '.social-share', '.share-buttons', '.social-links', '.share-bar', '.social-box',
        '.share-box', '.post-share', '.article-share', '.social-media', '.social-icons',
        '.cookie-banner', '.cookie-consent', '.qc-cmp2-container',
        '.newsletter-signup', '.popup', '.modal', '.banner', '.promo',
        '.comments', '#comments', '.related-articles', '.recommended', '.related-posts',
        '.sidebar', '.navigation', '.menu', '.breadcrumbs', '.breadcrumb', 'nav.breadcrumb',
        '[aria-label="breadcrumb"]', '.b-breadcrumbs', '.c-breadcrumbs', '.hawk-widget',
        '.price-comparison', '.taboola', '.outbrain', '.jwplayer', '.article-tags',
        '.article-topics', '.article-categories', '.byline-social', '.share-bar',
        '.audio-player', '.audio-player-wrapper', '.video-player-wrapper', '.player-controls',
        '.audio-controls', '.video-controls', '.vjs-control-bar', '.jw-controls',
        '.jw-controlbar', '.media-controls', '.podcast-controls', '.player-bar',
        '.player-container', '.mejs-container', '.play-button', '.audio-box',
        '[class*="social-share"]', '[class*="share-button"]', '[class*="player-control"]',
        '[class*="audio-player"]', '[class*="video-player"]', '[id*="player-control"]',
        'a[href*="facebook.com/sharer"]', 'a[href*="twitter.com/intent"]', 'a[href*="linkedin.com/share"]',
        'a[href*="pinterest.com/pin"]', 'a[href*="t.me/share"]', 'a[href*="api.whatsapp.com"]',
        'a[href*="reddit.com/submit"]',
        '.post-ufi', '.subscription-widget-wrap', '.subscribe-widget', '.captioned-button-wrap',
        '.SinglePostSection', '.single-post-section', '.comments-page', '.discussion-section',
        '.list-art', '#art-afterlist', '#abcnejctenejsi', '#abchlavniz', '#space-f',
        '.group-menu', '.blogger-bulb-b', '.artsum-social',
        '.article--category-name', '.article--category-description', '.article--author-date',
        '.article--tag-container', '.article--prev-next-container',
        'app-page-header', 'app-page-breadcrumbs', 'app-page-sidebar', 'app-page-footer'
      ];
      if (mainContainer) {
        unwantedSelectors.forEach(sel => {
          mainContainer.querySelectorAll(sel).forEach(el => el.remove());
        });
      }

      const cleanContainer = document.createElement('div');
      cleanContainer.className = 'doc-content';

      // Heading 1 Title
      const titleH1 = document.createElement('h1');
      titleH1.className = 'doc-element doc-h1';
      titleH1.textContent = title;
      
      const originalH1 = articleTitleEl || doc.querySelector('h1');
      if (originalH1) {
        this._preserveElementStyles(titleH1, originalH1);
      }
      cleanContainer.appendChild(titleH1);

      // Check author/byline metadata
      const authorMeta = doc.querySelector('meta[name="author"], meta[property="article:author"], .author-name, .byline, .author, .c-article-author, .artsum .blogger-name, .authors .blogger-name');
      const authorName = authorMeta ? (authorMeta.getAttribute('content') || authorMeta.textContent.trim()) : '';
      if (authorName && authorName.length < 60) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'doc-source-meta doc-element';
        metaDiv.innerHTML = `✍️ <strong>${this._escapeHTML(authorName)}</strong>${sourceUrl ? ` &bull; <em>${this._escapeHTML(new URL(sourceUrl, window.location.href).hostname)}</em>` : ''}`;
        cleanContainer.appendChild(metaDiv);
      }
      if (mainContainer) {
        mainContainer.querySelectorAll('.artsum').forEach(el => el.remove());
      }

      // Check for perex / lead paragraph / subtitle outside mainContainer
      const perexCandidates = Array.from(doc.querySelectorAll('p.b-detail__perex, p.c-lead, p.article--perex, .article__lead, .opener, .post-header .subtitle, h3.subtitle, h2.subtitle, .lead, .perex, .intro, .c-article-teaser, .article-teaser, [data-dot="mol-article-perex"]'));
      const perexEl = perexCandidates.find(el => !el.closest('.list-art, .related-articles, .recommended, .related-posts, aside, footer, nav, #art-afterlist, #space-f, #abcnejctenejsi, #abchlavniz'));
      if (perexEl && !mainContainer.contains(perexEl)) {
        const perexText = perexEl.textContent.trim();
        if (perexText && perexText.length > 20) {
          const leadP = document.createElement('p');
          leadP.className = 'doc-element lead-paragraph';
          leadP.innerHTML = this._cleanInlineContent(perexEl.innerHTML, baseUrl);
          this._preserveElementStyles(leadP, perexEl);
          if (styleTokens?.leadItalic) {
            leadP.style.fontStyle = 'italic';
          }
          cleanContainer.appendChild(leadP);
        }
      }

      // Insert Lead Image if found and valid
      if (leadImage && leadImage.src) {
        const leadFig = document.createElement('figure');
        leadFig.className = 'doc-element doc-lead-figure';
        leadFig.setAttribute('data-block-type', 'figure');
        leadFig.innerHTML = `
          <img src="${this._escapeHTML(leadImage.src)}" alt="${this._escapeHTML(leadImage.alt || title)}" class="doc-element" loading="lazy" onerror="this.parentElement.style.display='none'">
          ${leadImage.caption ? `<figcaption>${this._escapeHTML(leadImage.caption)}</figcaption>` : ''}
        `;
        cleanContainer.appendChild(leadFig);
      }

      const flatElements = [];
      this._flattenDomBlocks(mainContainer, flatElements, preserveStyles, baseUrl);

      // Global Image Deduplication & Clutter Pruning
      const seenImageSrcs = new Set();
      if (leadImage && leadImage.src) {
        seenImageSrcs.add(leadImage.src.split('?')[0].toLowerCase());
      }

      for (let i = flatElements.length - 1; i >= 0; i--) {
        const el = flatElements[i];
        const imgs = Array.from(el.tagName === 'IMG' ? [el] : el.querySelectorAll?.('img') || []);
        for (const img of imgs) {
          const rawSrc = img.getAttribute('src') || '';
          const cleanSrc = rawSrc.split('?')[0].toLowerCase();
          if (cleanSrc) {
            if (seenImageSrcs.has(cleanSrc)) {
              if (el.tagName === 'FIGURE' || el.tagName === 'IMG') {
                flatElements.splice(i, 1);
                break;
              } else {
                img.remove();
              }
            } else {
              seenImageSrcs.add(cleanSrc);
            }
          }
        }
      }

      // Reorder if infobox is the very first element: place first paragraph before infobox for balanced Page 1
      if (flatElements.length > 1 && flatElements[0].classList?.contains('doc-table-infobox')) {
        const firstPIdx = flatElements.findIndex(el => el.tagName === 'P');
        if (firstPIdx > 0) {
          const firstP = flatElements.splice(firstPIdx, 1)[0];
          flatElements.unshift(firstP);
        }
      }

      flatElements.forEach(el => {
        const textContent = el.textContent.trim();
        const textLower = textContent.toLowerCase();
        const titleLower = title.toLowerCase();

        // Skip duplicated title heading
        if (el.tagName === 'H1' && (textLower === titleLower || textLower.startsWith(titleLower))) {
          return;
        }

        // Skip metadata lines from crawlers
        if (/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(textContent)) {
          return;
        }

        if (/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(textContent)) {
          return;
        }

        if (/^(?:Předchozí článek|Následující článek|Související články|Rubriky|Kategorie|Štítky|Kam dál|Podobné příspěvky):/i.test(textContent)) {
          return;
        }

        cleanContainer.appendChild(el);
      });

      // Ensure 100% of relative links and image sources in cleanContainer are converted to absolute URLs
      if (baseUrl) {
        cleanContainer.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href');
          if (href && !/^(?:https?:|mailto:|tel:|javascript:|#|data:)/i.test(href)) {
            try {
              a.setAttribute('href', new URL(href, baseUrl).href);
            } catch (e) {}
          }
        });
        cleanContainer.querySelectorAll('img[src]').forEach(img => {
          const src = img.getAttribute('src');
          if (src && !/^(?:https?:|data:)/i.test(src)) {
            try {
              img.setAttribute('src', new URL(src, baseUrl).href);
            } catch (e) {}
          }
        });
      }

      return {
        title: title,
        sourceUrl: sourceUrl,
        htmlContent: cleanContainer.innerHTML,
        styleTokens: styleTokens,
        rawHtml: htmlString
      };
    }

    static _findBestArticleContainer(doc) {
      if (!doc) return null;

      const candidateSelectors = [
        '.b-detail__content',
        '.c-article__body',
        '.c-article-body',
        'div[data-cy="article-body"]',
        '.c-editorial-content',
        '.b-article__body',
        '#article-body',
        '.article-body',
        '[data-type="article-body"]',
        '.text-copy',
        '.article__content',
        '.article__body',
        'quill-view.article--content',
        '.article--content',
        'app-article-view.main-content',
        '[data-hook="post-description"]',
        '.wp-block-post-content',
        '.elementor-widget-theme-post-content',
        '.et_pb_post_content',
        '.brxe-post-content',
        '.ct-inner-content',
        '.oxy-rich-text',
        '.fl-post-content',
        '.fusion-post-content',
        '.td-post-content',
        '.tdb-block-inner',
        '.avia_textblock',
        '.brz-rich-text',
        '.mw-post-content',
        '.gh-content',
        '.post-full-content',
        '.blog-item-content-wrapper',
        '.sqs-block-html .sqs-html-content',
        '.w-richtext',
        '.article-template__content',
        '.wn-blog-post',
        '.news-item-detail',
        '.sp-article-content',
        '.ER-article-content',
        '.up-article-body',
        '.rendered-post',
        '.crayons-article__body',
        '.h-entry .e-content',
        '.notion-page-content',
        '.super-content',
        '#quarto-document-content',
        '.md-content__inner',
        '.rst-content',
        '.node__content',
        '.com-content-article__body',
        '.ce-bodytext',
        '.hs_cos_wrapper_type_rich_text',
        '.blog-post__body',
        '.design-article__content',
        '.core-container',
        '.body-content',
        '.mol-article-content',
        '[data-dot="mol-article-content"]',
        '[itemprop="articleBody"]',
        '.art-full #art-text',
        '#art-text',
        '.art-full',
        '.available-content .body.markup',
        '.body.markup',
        '.available-content',
        '.dt-post-body',
        '.entry-content',
        '.single-content',
        '.post-content',
        '.article-content',
        '.articleNewDetail__content',
        '.articleDetail__content',
        '.article-detail__content',
        '.article-detail',
        '.article__main',
        '.article-text',
        '.e-web-aktualne-articles-show__content',
        '.story-body',
        '.content-body',
        '.post_content',
        '.post-body',
        '.clanek-obsah',
        '.clanek__obsah',
        '.text-content',
        '.markdown-body',
        '.theme-doc-markdown',
        '.vp-doc',
        '.mw-parser-output',
        'article',
        '[role="main"]',
        'main'
      ];

      let bestContainer = null;
      let highestScore = 0;
      const scoredContainers = new Set();

      candidateSelectors.forEach(sel => {
        try {
          const elements = Array.from(doc.querySelectorAll(sel));
          elements.forEach(el => {
            if (scoredContainers.has(el)) return;
            scoredContainers.add(el);

            const paragraphs = Array.from(el.querySelectorAll('p')).filter(p => p.textContent.trim().length > 20);
            const headings = Array.from(el.querySelectorAll('h2, h3, h4, h5'));
            const textLength = el.textContent.trim().length;

            if (textLength < 80) return;

            const linkTextLength = Array.from(el.querySelectorAll('a')).reduce((acc, a) => acc + a.textContent.trim().length, 0);
            const linkDensity = textLength > 0 ? (linkTextLength / textLength) : 0;
            if (linkDensity > 0.6 && paragraphs.length < 4) return;

            let score = (paragraphs.length * 120) + (headings.length * 45) + Math.min(textLength / 10, 600);
            if (linkDensity > 0.35) score -= (linkDensity * 300);

            if (sel.includes('article') || sel.includes('content') || sel.includes('entry') || sel.includes('b-detail') || sel.includes('body') || sel.includes('art-text') || sel.includes('art-full')) {
              score += 150;
            }

            if (bestContainer) {
              if (el.contains(bestContainer)) {
                // el is an ancestor of bestContainer. Prefer the more focused child if it has sufficient content
                const bestPs = bestContainer.querySelectorAll('p').length;
                if (bestPs >= 2) return;
              } else if (bestContainer.contains(el)) {
                // el is a child of bestContainer. If el contains the bulk of the content, prefer the child!
                const childPs = paragraphs.length;
                const parentPs = bestContainer.querySelectorAll('p').length;
                if (childPs >= 2 && childPs >= parentPs * 0.6) {
                  highestScore = score;
                  bestContainer = el;
                  return;
                }
              }
            }

            if (score > highestScore) {
              highestScore = score;
              bestContainer = el;
            }
          });
        } catch (e) {}
      });

      return bestContainer || doc.querySelector('article, main, body');
    }

    static _extractLeadImage(doc, baseUrl, mainContainer = null) {
      if (!doc) return null;

      const isBadImage = (src, alt = '') => {
        if (!src) return true;
        const s = src.toLowerCase();
        const a = alt.toLowerCase();
        if (s.startsWith('data:image/svg') || s.includes('spacer') || s.includes('pixel') || s.includes('1x1') || s.includes('avatar') || s.includes('author') || s.includes('logo') || s.includes('icon') || s.includes('sprite') || s.includes('placeholder') || s.includes('share-button') || s.includes('gradient_fill') || s.includes('badge') || s.includes('tracking') || s.includes('follow-') || s.includes('feed-icon')) {
          return true;
        }
        if (a.includes('logo') || a.includes('avatar') || a.includes('ikona') || a.includes('autor') || a.includes('google') || a.includes('sledovat') || a.includes('follow')) {
          return true;
        }
        return false;
      };

      const resolveSrc = (rawSrc) => {
        if (!rawSrc) return '';
        let src = rawSrc.trim();
        if (src.startsWith('//')) return 'https:' + src;
        if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && baseUrl) {
          try { return new URL(src, baseUrl).href; } catch (e) { return ''; }
        }
        return src;
      };

      // 1. Check OpenGraph / Twitter meta tags
      const ogMeta = doc.querySelector('meta[property="og:image:secure_url"], meta[property="og:image"], meta[name="twitter:image:src"], meta[name="twitter:image"], link[rel="image_src"]');
      let ogUrl = ogMeta ? (ogMeta.getAttribute('content') || ogMeta.getAttribute('href') || '') : '';
      if (ogUrl) ogUrl = resolveSrc(ogUrl);
      if (ogUrl && !isBadImage(ogUrl)) {
        return {
          src: ogUrl,
          alt: doc.querySelector('meta[property="og:image:alt"]')?.getAttribute('content') || '',
          caption: ''
        };
      }

      // 2. Check Semantic DOM Lead Image Selectors
      const heroSelectors = [
        'figure.lead-image img',
        'figure.article__hero img',
        'figure.article-lead-image img',
        'img.article--image',
        '.article--image img',
        '.b-detail__img img',
        '.c-article-header figure img',
        '.c-article-header img',
        '.article__header figure img',
        '.article__header img',
        '.opener-foto img',
        '.article-top-image img',
        '.hero-image img',
        '.main-image img',
        '[itemprop="image"]',
        'img[fetchpriority="high"]',
        'figure.wp-block-post-featured-image img',
        '.entry-header img'
      ];

      for (const sel of heroSelectors) {
        const img = doc.querySelector(sel);
        if (img) {
          let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-highres') || '';
          const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
          if ((!src || src.startsWith('data:image')) && srcset) {
            const parts = srcset.split(',').map(s => s.trim().split(' ')[0]);
            if (parts.length > 0) src = parts[parts.length - 1];
          }
          src = resolveSrc(src);
          const alt = img.getAttribute('alt') || '';
          if (src && !isBadImage(src, alt)) {
            const cap = img.closest('figure')?.querySelector('figcaption, .caption, .b-detail__img-caption')?.textContent?.trim() || alt;
            return { src, alt, caption: cap };
          }
        }
      }

      // 3. Check first large image in main container
      if (mainContainer) {
        const firstImg = mainContainer.querySelector('figure img, img');
        if (firstImg) {
          let src = firstImg.getAttribute('src') || firstImg.getAttribute('data-src') || firstImg.getAttribute('data-original') || '';
          src = resolveSrc(src);
          const alt = firstImg.getAttribute('alt') || '';
          if (src && !isBadImage(src, alt)) {
            const cap = firstImg.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || alt;
            return { src, alt, caption: cap };
          }
        }
      }

      return null;
    }

    static _preserveElementStyles(targetElement, sourceNode) {
      if (!sourceNode || !targetElement) return;

      const styleAttr = sourceNode.getAttribute('style') || '';
      const classList = Array.from(sourceNode.classList || []);
      const preservedStyles = [];

      // 1. Direct inline styles extraction with print contrast safety
      if (styleAttr) {
        const safeProps = [
          'color', 'background-color', 'background', 'border', 'border-left',
          'border-right', 'border-top', 'border-bottom', 'border-color', 'border-radius',
          'border-style', 'border-width', 'font-weight', 'font-style', 'font-family',
          'text-align', 'text-decoration', 'letter-spacing', 'text-transform'
        ];

        const decls = styleAttr.split(';');
        decls.forEach(d => {
          const idx = d.indexOf(':');
          if (idx !== -1) {
            const prop = d.substring(0, idx).trim().toLowerCase();
            const val = d.substring(idx + 1).trim();
            if (safeProps.includes(prop) && !val.includes('url(') && !val.includes('javascript:')) {
              // Safety check: text color must not be white or ultra-light on white paper unless there is a dark background
              if (prop === 'color') {
                const hex = ContentExtractor._normalizeColorToHex(val);
                if (hex) {
                  const hsl = ContentExtractor._hexToHSL(hex);
                  if (hsl && hsl.l > 0.70 && !styleAttr.includes('background')) {
                    return; // Skip invisible light/white text on white paper!
                  }
                }
              }
              // Safety check: inside infobox table, avoid overriding with garish inline backgrounds
              if (prop.startsWith('background') && (targetElement.tagName === 'TH' || targetElement.tagName === 'TD') && targetElement.closest('.doc-table-infobox')) {
                return;
              }
              preservedStyles.push(`${prop}: ${val}`);
            }
          }
        });
      }

      // 2. Multi-Framework Class Parsing (Tailwind, WordPress Gutenberg, Bootstrap)
      const classAttr = sourceNode.getAttribute('class') || '';
      
      // A. Tailwind arbitrary colors (e.g. text-[#1e3a8a], bg-[#f0f9ff])
      const twHexText = classAttr.match(/text-\[#([0-9a-f]{3,8})\]/i);
      if (twHexText) {
        preservedStyles.push(`color: #${twHexText[1]}`);
      }

      const twHexBg = classAttr.match(/bg-\[#([0-9a-f]{3,8})\]/i);
      if (twHexBg) {
        preservedStyles.push(`background-color: #${twHexBg[1]}`);
      }

      classList.forEach(cls => {
        const c = cls.toLowerCase();

        // B. Tailwind named color utilities (e.g. text-blue-700, text-emerald-800)
        const twTextMatch = c.match(/^text-([a-z]+)-(500|600|700|800|900)$/i);
        if (twTextMatch) {
          const hex = ContentExtractor._normalizeColorToHex(`${twTextMatch[1]}-${twTextMatch[2]}`);
          if (hex) preservedStyles.push(`color: ${hex}`);
        }

        // C. Typography utilities
        if (c === 'font-bold' || c === 'font-black') preservedStyles.push('font-weight: 700');
        else if (c === 'font-semibold') preservedStyles.push('font-weight: 600');
        else if (c === 'font-medium') preservedStyles.push('font-weight: 500');
        else if (c === 'italic') preservedStyles.push('font-style: italic');
        else if (c === 'uppercase') preservedStyles.push('text-transform: uppercase');
        else if (c === 'tracking-wide') preservedStyles.push('letter-spacing: 0.05em');

        // D. Bootstrap / Universal colors
        if (c === 'text-primary') preservedStyles.push('color: var(--doc-primary)');
        else if (c === 'text-secondary') preservedStyles.push('color: var(--doc-secondary)');
        else if (c === 'text-muted') preservedStyles.push('color: var(--doc-text-muted, #64748b)');
      });

      // 3. Alignment classes
      if (classList.some(c => c.includes('has-text-align-center') || c.includes('text-center') || c.includes('aligncenter'))) {
        targetElement.setAttribute('data-align', 'center');
        preservedStyles.push('text-align: center');
      } else if (classList.some(c => c.includes('has-text-align-right') || c.includes('text-right') || c.includes('alignright'))) {
        targetElement.setAttribute('data-align', 'right');
        preservedStyles.push('text-align: right');
      } else if (classList.some(c => c.includes('has-text-align-justify') || c.includes('text-justify') || c.includes('text-align-justify'))) {
        targetElement.setAttribute('data-align', 'justify');
        preservedStyles.push('text-align: justify');
      }

      // 4. Lead paragraph / Perex detection
      if (classList.some(c => /^(?:lead|perex|intro|entry-intro|has-large-font-size|is-style-lead|subtitle)$/i.test(c))) {
        targetElement.classList.add('lead-paragraph');
      }

      // 5. Highlight / Accent text
      if (classList.some(c => /has-accent|has-primary|highlight|mark/i.test(c))) {
        targetElement.classList.add('doc-highlight');
      }

      if (preservedStyles.length > 0) {
        const existing = targetElement.getAttribute('style') || '';
        const merged = existing ? `${existing}; ${preservedStyles.join('; ')}` : preservedStyles.join('; ');
        targetElement.setAttribute('style', merged);
        try {
          targetElement.style.cssText = merged;
        } catch(e) {}
      }
    }

    static _flattenDomBlocks(node, results, preserveStyles = true, baseUrl = '') {
      if (!node) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (!tag) return;

      if (['script', 'style', 'noscript', 'nav', 'footer', 'header', 'aside', 'button', 'input', 'select', 'textarea', 'form', 'audio', 'svg', 'canvas'].includes(tag)) {
        return;
      }

      const classListStr = (node.className && typeof node.className === 'string') ? node.className.toLowerCase() : '';
      const idStr = (node.id && typeof node.id === 'string') ? node.id.toLowerCase() : '';
      const isMainArticleWrapper = tag === 'article' || tag === 'main' ||
        /(?:newsletter-post|single-post|post-body|article-body|entry-content|available-content|markup)/.test(classListStr);

      if (!isMainArticleWrapper) {
        if (/(?:social-share|share-button|share-bar|sharing|audio-player|video-player|podcast-player|audio-controls|media-controls|video-controls|jw-|vjs-|like-btn|like-button|post-ufi|reaction|bookmark|recirc|recirculation|related-posts|related-articles|more-stories|popular-posts|trending|outbrain|taboola|advertisement|newsletter-signup|subscribe-widget|subscription-widget)/.test(classListStr) ||
            /(?:recirc|related-posts|social-share|newsletter-signup|subscribe-widget)/.test(idStr)) {
          return;
        }
      }

      if (node.classList?.contains('ez-toc-container') || node.classList?.contains('lwptoc') || node.classList?.contains('table-of-contents')) {
        return;
      }

      // WordPress Kadence Infoboxy, Callouty a Alert boxy
      if (node.classList?.contains('wp-block-kadence-infobox') ||
          node.classList?.contains('callout') ||
          node.classList?.contains('alert') ||
          node.classList?.contains('notice') ||
          node.classList?.contains('infobox-wrapper') ||
          node.classList?.contains('doc-box') ||
          (node.classList?.contains('wp-block-group') && node.getAttribute('style')?.includes('background'))) {
        const calloutDiv = document.createElement('div');
        calloutDiv.className = 'doc-callout doc-element';
        calloutDiv.setAttribute('data-block-type', 'callout');
        this._preserveElementStyles(calloutDiv, node);
        calloutDiv.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
        if (calloutDiv.textContent.trim()) {
          results.push(calloutDiv);
          return;
        }
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
          const qrSvg = QRGenerator.generateSVG(videoUrl, { margin: 2 });
          videoCard.innerHTML = `
            <div class="doc-callout-header">🎬 Video ukázka: ${this._escapeHTML(cleanTitle)}</div>
            <div style="display: flex; gap: 10px; align-items: center; margin: 6px 0;">
              <div class="doc-qr-canvas-wrapper" style="width: 22mm; height: 22mm; flex-shrink: 0; background: #ffffff; border: 1px solid var(--doc-border, #cbd5e1); border-radius: 4px; padding: 3px;">
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

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = node.textContent.trim();
        const textLower = text.toLowerCase();
        if (text && !/^(?:související články|kam dál|podobné příspěvky|navigace|kategorie|rubriky|obsah)$/i.test(textLower)) {
          const h = document.createElement(tag);
          h.className = `doc-element doc-${tag}`;
          h.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
          this._preserveElementStyles(h, node);
          results.push(h);
        }
        return;
      }

      // Wikipedia & Gutenberg Image Galleries
      if (node.classList?.contains('gallery') || node.classList?.contains('wp-block-gallery') || node.classList?.contains('mw-gallery-traditional') || node.classList?.contains('gallerybox')) {
        const galleryItems = Array.from(node.querySelectorAll('li.gallerybox, .gallery-item, .wp-block-image, figure'));
        if (galleryItems.length > 0) {
          const grid = document.createElement('div');
          grid.className = 'doc-element doc-gallery-grid';
          grid.setAttribute('data-block-type', 'figure');
          
          galleryItems.forEach(item => {
            const img = item.querySelector('img');
            if (img) {
              let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
              if (src.startsWith('//')) src = 'https:' + src;
              else if (src && !src.startsWith('http://') && !src.startsWith('https://') && baseUrl) {
                try { src = new URL(src, baseUrl).href; } catch(e) {}
              }
              const cap = item.querySelector('.gallerytext, figcaption, .wp-element-caption')?.textContent?.trim() || img.getAttribute('alt') || '';
              
              if (src) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'doc-gallery-item';
                itemDiv.innerHTML = `
                  <img src="${src}" alt="${this._escapeHTML(cap)}" loading="lazy" onerror="this.style.display='none'">
                  ${cap ? `<div class="doc-gallery-cap">${this._escapeHTML(cap)}</div>` : ''}
                `;
                grid.appendChild(itemDiv);
              }
            }
          });
          if (grid.children.length > 0) {
            results.push(grid);
            return;
          }
        }
      }

      if (tag === 'table') {
        // Discard navboxes
        if (node.classList?.contains('navbox') || node.classList?.contains('vertical-navbox') || node.classList?.contains('catlinks')) {
          return;
        }

        const isInfobox = node.classList?.contains('infobox') || node.classList?.contains('sidebar');
        const tbl = node.cloneNode(true);
        tbl.className = 'doc-element doc-table' + (isInfobox ? ' doc-table-infobox' : '');
        this._preserveElementStyles(tbl, node);

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
          img.removeAttribute('srcset');
        });

        tbl.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href');
          if (href && !/^(?:https?:|mailto:|tel:|javascript:|#|data:)/i.test(href) && baseUrl) {
            try {
              a.setAttribute('href', new URL(href, baseUrl).href);
            } catch (e) {}
          }
        });

        // Preserve table cell styles (background, text color, alignment, borders)
        const originalCells = Array.from(node.querySelectorAll('th, td'));
        const clonedCells = Array.from(tbl.querySelectorAll('th, td'));
        clonedCells.forEach((cell, idx) => {
          const orig = originalCells[idx];
          if (orig) {
            this._preserveElementStyles(cell, orig);
          }
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
          this._preserveElementStyles(tbl, tableInside);
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

          tbl.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !/^(?:https?:|mailto:|tel:|javascript:|#|data:)/i.test(href) && baseUrl) {
              try {
                a.setAttribute('href', new URL(href, baseUrl).href);
              } catch (e) {}
            }
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
        const textLower = text.toLowerCase();

        // Skip audio player controls and social sharing paragraphs
        if (/^(?:poslechněte si článek|poslechnout článek|poslechnout audio|přehrát audio|play audio|sdílet článek|share this article|sdílet na|sdílet:|share:|audio verze:|délka audia:)/i.test(textLower)) {
          return;
        }
        if (text.length < 35 && (node.querySelector('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"]') || textLower.includes('sdílet') || textLower.includes('share'))) {
          return;
        }

        const img = node.querySelector('img');
        if (img) {
          const fig = this._createFigureFromImg(img, baseUrl);
          if (fig) results.push(fig);
        }
        if (text && !/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(text)) {
          if (!/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(text)) {
            // Avoid duplicating the image inside the paragraph
            const pClone = node.cloneNode(true);
            pClone.querySelectorAll('img').forEach(im => im.remove());
            const cleanHtml = this._cleanInlineContent(pClone.innerHTML, baseUrl);
            if (cleanHtml.replace(/<[^>]*>/g, '').trim()) {
              const p = document.createElement('p');
              p.className = 'doc-element';
              p.innerHTML = cleanHtml;
              this._preserveElementStyles(p, node);
              results.push(p);
            }
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
          this._preserveElementStyles(list, node);
          items.forEach(li => {
            const cleanLi = document.createElement('li');
            cleanLi.innerHTML = this._cleanInlineContent(li.innerHTML, baseUrl);
            this._preserveElementStyles(cleanLi, li);
            if (cleanLi.textContent.trim()) {
              list.appendChild(cleanLi);
            }
          });
          if (list.children.length > 0) {
            results.push(list);
          }
        }
        return;
      }

      if (tag === 'blockquote') {
        const bq = document.createElement('blockquote');
        bq.className = 'doc-element';
        bq.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
        this._preserveElementStyles(bq, node);
        results.push(bq);
        return;
      }

      if (tag === 'pre') {
        const pre = document.createElement('pre');
        pre.className = 'doc-element';
        pre.innerHTML = this._cleanInlineContent(node.innerHTML, baseUrl);
        this._preserveElementStyles(pre, node);
        results.push(pre);
        return;
      }

      if (tag === 'hr') {
        const hr = document.createElement('hr');
        hr.className = 'doc-element';
        results.push(hr);
        return;
      }

      // Check if container has direct text and all child elements are inline (e.g. bold, link, br)
      const inlineTags = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr']);
      const childElements = Array.from(node.children);
      const hasDirectText = Array.from(node.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      const allChildrenInline = childElements.length > 0 && childElements.every(c => inlineTags.has(c.tagName.toLowerCase()));

      if (hasDirectText && allChildrenInline) {
        const text = node.textContent.trim();
        if (text && text.length > 3 && !/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(text)) {
          if (!/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(text)) {
            const cleanHtml = this._cleanInlineContent(node.innerHTML, baseUrl);
            if (cleanHtml.replace(/<[^>]*>/g, '').trim()) {
              const p = document.createElement('p');
              p.className = 'doc-element';
              p.innerHTML = cleanHtml;
              this._preserveElementStyles(p, node);
              results.push(p);
              return;
            }
          }
        }
      }

      if (childElements.length > 0) {
        childElements.forEach(child => {
          this._flattenDomBlocks(child, results, preserveStyles, baseUrl);
        });
      } else {
        const text = node.textContent.trim();
        if (text && text.length > 3 && !/^(?:Title|URL Source|Published Time|Markdown Content|Image Sources?):\s*/i.test(text)) {
          if (!/^(?:Domů|Home|Úvod)\s*(\/|>|»|›|\|)/i.test(text)) {
            const cleanHtml = this._cleanInlineContent(node.innerHTML, baseUrl);
            if (cleanHtml.replace(/<[^>]*>/g, '').trim()) {
              const p = document.createElement('p');
              p.className = 'doc-element';
              p.innerHTML = cleanHtml;
              this._preserveElementStyles(p, node);
              results.push(p);
            }
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
      if (!html) return '';
      let s = html;
      s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      s = s.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');
      s = s.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
      s = s.replace(/<input\b[^>]*>/gi, '');
      s = s.replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '');
      s = s.replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '');
      s = s.replace(/<a\b[^>]*href=["'][^"']*(?:facebook\.com\/sharer|twitter\.com\/intent|linkedin\.com\/share|pinterest\.com\/pin|t\.me\/share|api\.whatsapp\.com|reddit\.com\/submit)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
      s = s.replace(/on\w+="[^"]*"/g, '');
      s = s.replace(/<a\b[^>]*>\s*<\/a>/gi, '');

      // Resolve relative URLs in links and images to absolute URLs
      if (baseUrl) {
        try {
          const temp = document.createElement('div');
          temp.innerHTML = s;
          temp.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !/^(?:https?:|mailto:|tel:|javascript:|#|data:)/i.test(href)) {
              try {
                a.setAttribute('href', new URL(href, baseUrl).href);
              } catch (e) {}
            }
          });
          temp.querySelectorAll('img[src]').forEach(im => {
            const src = im.getAttribute('src');
            if (src && !/^(?:https?:|data:)/i.test(src)) {
              try {
                im.setAttribute('src', new URL(src, baseUrl).href);
              } catch (e) {}
            }
          });
          s = temp.innerHTML;
        } catch (e) {}
      }

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

    static _resolveCssValue(val, cssVars, depth = 0) {
      if (!val || depth > 8) return '';
      let str = val.trim();
      
      // Strip !important comments
      str = str.replace(/!important/gi, '').trim();

      // Resolve var(--var-name, fallback)
      const varMatch = str.match(/var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/i);
      if (varMatch) {
        const varName = varMatch[1];
        const fallback = varMatch[2] ? varMatch[2].trim() : '';
        if (cssVars && cssVars.has(varName)) {
          const resolved = this._resolveCssValue(cssVars.get(varName), cssVars, depth + 1);
          str = str.replace(varMatch[0], resolved);
          return this._resolveCssValue(str, cssVars, depth + 1);
        }
        if (fallback) {
          const resolved = this._resolveCssValue(fallback, cssVars, depth + 1);
          str = str.replace(varMatch[0], resolved);
          return this._resolveCssValue(str, cssVars, depth + 1);
        }
      }
      return str;
    }

    static _extractWebTokens(doc, sourceUrl = '', articleContext = null) {
      if (!doc) return this._deriveTokensFromHostOrFallback(sourceUrl);

      const isWikipedia = sourceUrl.includes('wikipedia.org');

      try {
        let computedH1 = null;
        let computedH2 = null;
        let computedH3 = null;
        let computedH4 = null;
        let computedP = null;
        let computedLead = null;
        let computedLink = null;
        let computedHeader = null;

        // Sandboxed DOM styling engine
        let iframeDoc = null;
        let iframeWin = null;
        if (typeof document !== 'undefined' && document.body) {
          try {
            let sandboxFrame = document.getElementById('url-printer-style-sandbox');
            if (!sandboxFrame) {
              sandboxFrame = document.createElement('iframe');
              sandboxFrame.id = 'url-printer-style-sandbox';
              sandboxFrame.setAttribute('sandbox', 'allow-same-origin');
              sandboxFrame.style.cssText = 'position:absolute;width:1200px;height:900px;top:-9999px;left:-9999px;visibility:hidden;border:none;';
              document.body.appendChild(sandboxFrame);
            }
            iframeWin = sandboxFrame.contentWindow;
            iframeDoc = sandboxFrame.contentDocument || sandboxFrame.contentWindow?.document;
            if (iframeDoc) {
              const docClone = doc.cloneNode(true);
              // Strip executable scripts and reload meta tags so third-party code never runs
              docClone.querySelectorAll('script, noscript, meta[http-equiv="refresh"], iframe, object, embed').forEach(el => el.remove());
              if (sourceUrl) {
                let baseTag = docClone.querySelector('base');
                if (!baseTag) {
                  baseTag = docClone.createElement('base');
                  if (docClone.head) docClone.head.insertBefore(baseTag, docClone.head.firstChild);
                }
                baseTag.setAttribute('href', sourceUrl);
              }
              iframeDoc.open();
              iframeDoc.write(docClone.documentElement.outerHTML);
              iframeDoc.close();
            }
          } catch (e) {
            console.warn('Sandbox iframe initialization:', e);
          }
        }

        const docToQuery = iframeDoc || doc;

        // Clean CMP / Cookie Banners without removing main document containers
        const cookieSelectors = [
          '#didomi-popup', '#didomi-notice', '#onetrust-banner-sdk', '#onetrust-consent-sdk',
          '.sp_message_container', '#sp_message_container', '#CybotCookiebotDialog',
          '.fc-consent-root', '.qc-cmp2-container', '.cc-window',
          '[aria-modal="true"]', '.cookie-banner', '.cookie-consent', '.popup', '.modal'
        ];
        cookieSelectors.forEach(sel => {
          try {
            docToQuery.querySelectorAll(sel).forEach(el => {
              if (el !== docToQuery.body && el !== docToQuery.documentElement) {
                el.remove();
              }
            });
          } catch (e) {}
        });

        // CONTENT-COUPLED ELEMENT IDENTIFICATION (Probed directly without fragile class concatenation)
        let h1El = docToQuery.querySelector('[data-up-probe="h1"]') ||
                   docToQuery.querySelector('article h1, main h1, [itemprop="headline"], .c-article-title, .article__heading, .c-article-header__title, h1.entry-title, .entry-header h1, .mol-article-header__title, [data-dot="mol-article-title"], h1');

        let pEl = docToQuery.querySelector('[data-up-probe="p"]') ||
                  docToQuery.querySelector('.c-article-body p, .article__content p, .article__body p, .core-container p, .body-content p, [data-dot="mol-article-content"] p, .mol-article-content p, .mol-paragraph, .paragraph, .story-body p, .articleNewDetail__content p, .e-web-aktualne-articles-show-body p, .entry-content p, .article-body p, .article-content p, [itemprop="articleBody"] p, article p, main p, .content p, p');

        let h2El = docToQuery.querySelector('[data-up-probe="h2"]') ||
                   docToQuery.querySelector('article h2, main h2, [itemprop="articleBody"] h2, .entry-content h2, h2');
        let h3El = docToQuery.querySelector('article h3, main h3, [itemprop="articleBody"] h3, .entry-content h3, h3');
        let h4El = docToQuery.querySelector('article h4, main h4, [itemprop="articleBody"] h4, .entry-content h4, h4');
        let leadEl = docToQuery.querySelector('.lead, .perex, .article--perex, .c-article-teaser, .article-lead, .opener, .intro, p.lead');
        let aEl = docToQuery.querySelector('[data-up-probe="a"]') ||
                  docToQuery.querySelector('article p a, main p a, p a, a');
        let headerEl = docToQuery.querySelector('header, .site-header, .navbar, nav');

        if (iframeWin) {
          try {
            if (h1El) computedH1 = iframeWin.getComputedStyle(h1El);
            if (h2El) computedH2 = iframeWin.getComputedStyle(h2El);
            if (h3El) computedH3 = iframeWin.getComputedStyle(h3El);
            if (h4El) computedH4 = iframeWin.getComputedStyle(h4El);
            if (pEl) computedP = iframeWin.getComputedStyle(pEl);
            if (leadEl) computedLead = iframeWin.getComputedStyle(leadEl);
            if (aEl) computedLink = iframeWin.getComputedStyle(aEl);
            if (headerEl) computedHeader = iframeWin.getComputedStyle(headerEl);
          } catch (e) {
            console.warn('Error reading getComputedStyle from sandbox iframe:', e);
          }
        }

        // 1. UNIVERSAL CSS VARIABLE MAP COLLECTION
        const cssVars = new Map();
        const styleTags = Array.from(doc.querySelectorAll('style'));
        
        styleTags.forEach(s => {
          const text = s.textContent || '';
          const declMatches = text.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;!}\n]+)/gi);
          for (const m of declMatches) {
            cssVars.set(m[1].trim(), m[2].trim());
          }
        });

        // 2. CANDIDATE BRAND COLOR SCORING ENGINE
        const colorScores = new Map();
        const addColorScore = (rawColor, weight = 1) => {
          if (!rawColor) return;
          const resolved = this._resolveCssValue(rawColor, cssVars);
          const hex = this._normalizeColorToHex(resolved);
          if (!hex) return;

          // Exclude unstyled browser default link colors (#0000ee, #0000ff, #551a8b)
          if (hex === '#0000ee' || hex === '#0000ff' || hex === '#551a8b') return;

          const hsl = this._hexToHSL(hex);
          if (!hsl) return;

          // Exclude near-black, pure white or ultra-desaturated gray from brand scoring
          if (hsl.s < 0.12 || hsl.l < 0.08 || hsl.l > 0.85) return;

          const current = colorScores.get(hex) || 0;
          colorScores.set(hex, current + weight);
        };

        // A. Scan <meta> theme colors (highest priority intent for brand accent)
        const metaColors = doc.querySelectorAll('meta[name="theme-color"], meta[property="og:theme_color"], meta[name="msapplication-TileColor"], meta[name="msapplication-navbutton-color"], meta[name="apple-mobile-web-app-status-bar-style"]');
        metaColors.forEach(m => {
          const c = m.getAttribute('content');
          if (c) addColorScore(c, 40);
        });

        // B. Scan Universal Framework & Website Builder CSS Variables (WordPress/Elementor/Astra/Kadence/Blocksy/Neve/Avada/Bricks, Wix, Squarespace, Ghost, Shopify, Webnode, Substack, Beehiiv, MkDocs)
        cssVars.forEach((val, vn) => {
          if (/brand|theme|primary|accent|color-0|palette1|palette-1|theme-palette-color-1|nv-primary-accent|awb-color4|bricks-color-primary|bh-color-accent|md-primary-fg-color|vp-c-brand|ifm-color-primary|ghost-accent|gh-accent|color-base-accent|wnd-color-accent|e-global-color-primary|ast-global-color-0/i.test(vn)) {
            addColorScore(val, 35);
          } else if (/palette[2-3]|theme-palette-color-[23]|nv-secondary-accent|color-1|color-2|color-primary|color_1[789]|e-global-color-secondary/i.test(vn)) {
            addColorScore(val, 20);
          }
        });

        // C. Header / Navbar / Headings / Accent elements computed color
        if (computedHeader?.backgroundColor) {
          addColorScore(computedHeader.backgroundColor, 25);
        }
        if (computedLink?.color) {
          addColorScore(computedLink.color, 15);
        }
        [computedH1, computedH2, computedH3, computedH4].forEach(ch => {
          if (ch?.color) addColorScore(ch.color, 18);
        });
        if (iframeWin) {
          try {
            const accentEls = docToQuery.querySelectorAll('.short-separator, [class*="separator"], [class*="category"], [class*="author"], [class*="badge"], [class*="tag"]');
            accentEls.forEach(el => {
              const cs = iframeWin.getComputedStyle(el);
              if (cs?.color) addColorScore(cs.color, 14);
              if (cs?.backgroundColor) addColorScore(cs.backgroundColor, 14);
              if (cs?.borderTopColor) addColorScore(cs.borderTopColor, 14);
            });
          } catch (e) {}
        }

        // D. Fallback: scan stylesheet rules for recurring chromatic accent colors if none found above
        if (colorScores.size === 0) {
          styleTags.forEach(s => {
            const text = s.textContent || '';
            const propMatches = text.matchAll(/(?:^|[;{\s])(?:color|background-color|border(?:-top|-bottom|-left|-right)?-color)\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))\b/gi);
            for (const m of propMatches) {
              addColorScore(m[1], 5);
            }
          });
        }

        // Determine best brand color
        let bestBrandColor = isWikipedia ? '#3366cc' : '#0284c7';
        let highestScore = 0;

        for (const [color, score] of colorScores.entries()) {
          if (score > highestScore) {
            highestScore = score;
            bestBrandColor = color;
          }
        }

        // Generate harmonious pastel backgrounds and border tints
        const brandHsl = this._hexToHSL(bestBrandColor) || { h: 210, s: 0.6, l: 0.4 };
        const lightBg = isWikipedia ? '#f8f9fa' : this._hslToHex(brandHsl.h, Math.min(brandHsl.s, 0.28), 0.97);
        const lightBorder = isWikipedia ? '#a2a9b1' : this._hslToHex(brandHsl.h, Math.min(brandHsl.s, 0.38), 0.86);
        const secondaryColor = isWikipedia ? '#202122' : this._hslToHex((brandHsl.h + 25) % 360, Math.min(brandHsl.s * 1.1, 0.9), Math.max(brandHsl.l * 0.85, 0.22));

        // =========================================================================
        // 3. UNIVERSAL CONTENT-COUPLED TYPOGRAPHY EXTRACTION
        // =========================================================================
        let extractedFont = '';
        let extractedHeadingFont = '';
        let extractedH4Font = '';

        if (computedH1?.fontFamily) extractedHeadingFont = this._cleanFontFamilyString(computedH1.fontFamily);
        if (computedH4?.fontFamily) {
          const h4f = this._cleanFontFamilyString(computedH4.fontFamily);
          if (h4f && h4f !== extractedHeadingFont) extractedH4Font = h4f;
        }
        if (computedP?.fontFamily) extractedFont = this._cleanFontFamilyString(computedP.fontFamily);

        const isGenericOrMissing = (fontStr) => {
          if (!fontStr) return true;
          const clean = fontStr.replace(/['",]/g, '').trim().toLowerCase();
          if (/^[\d.]+(?:rem|em|px|%|pt|vw|vh)$/i.test(clean) || /^\d+$/.test(clean)) return true;
          const generics = ['arial', 'times new roman', 'times', 'serif', 'sans-serif', 'monospace', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial', 'unset', 'roboto'];
          if (generics.some(g => clean === g || clean.startsWith(g + ',') || clean.endsWith(',' + g))) return true;
          const words = clean.split(/\s+/).filter(Boolean);
          const genericWords = ['times', 'new', 'roman', 'arial', 'helvetica', 'serif', 'sans', 'monospace', 'system', 'ui', 'apple', 'blinkmacsystemfont', 'inherit', 'initial', 'unset', 'roboto'];
          return words.length === 0 || words.every(w => genericWords.includes(w));
        };

        if (isWikipedia) {
          extractedFont = 'sans-serif';
          extractedHeadingFont = 'Linux Libertine';
        } else {

          // Harvest all @font-face definitions declared in document and inject them into main document.head
          const declaredFontFaces = [];
          const extractedFontFaceBlocks = [];
          styleTags.forEach(s => {
            const text = s.textContent || '';
            const blockMatches = text.matchAll(/@font-face\s*\{([^}]+)\}/gi);
            for (const bm of blockMatches) {
              let blockBody = bm[1];
              const ffMatch = blockBody.match(/font-family\s*:\s*['"]?([^'";}\n]+)['"]?/i);
              if (ffMatch) {
                const ffName = this._cleanFontFamilyString(ffMatch[1]);
                if (ffName && !isGenericOrMissing(ffName) && !declaredFontFaces.includes(ffName)) {
                  declaredFontFaces.push(ffName);
                }
              }
              if (sourceUrl) {
                blockBody = blockBody.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, rawUrl) => {
                  const trimmedUrl = rawUrl.trim();
                  if (!trimmedUrl || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
                    return full;
                  }
                  try {
                    return `url("${new URL(trimmedUrl, sourceUrl).href}")`;
                  } catch (e) {
                    return full;
                  }
                });
              }
              extractedFontFaceBlocks.push(`@font-face { ${blockBody} }`);
            }
          });

          if (extractedFontFaceBlocks.length > 0 && typeof document !== 'undefined' && document.head) {
            let ffStyleEl = document.getElementById('up-extracted-font-faces');
            if (!ffStyleEl) {
              ffStyleEl = document.createElement('style');
              ffStyleEl.id = 'up-extracted-font-faces';
              document.head.appendChild(ffStyleEl);
            }
            ffStyleEl.textContent = extractedFontFaceBlocks.join('\n');
          }

          // Build exact selector inventory from the identified article nodes
          const articlePSelectors = [];
          if (pEl) {
            if (pEl.tagName) articlePSelectors.push(pEl.tagName.toLowerCase());
            if (pEl.className) {
              pEl.className.split(/\s+/).forEach(c => {
                if (c && !c.startsWith('__')) articlePSelectors.push('.' + c);
              });
            }
            let curr = pEl.parentElement;
            let depth = 0;
            while (curr && curr !== doc.body && depth < 4) {
              if (curr.className) {
                curr.className.split(/\s+/).forEach(c => {
                  if (c && !c.startsWith('__')) {
                    articlePSelectors.push('.' + c + ' p');
                    articlePSelectors.push('.' + c);
                  }
                });
              }
              curr = curr.parentElement;
              depth++;
            }
          }

          const articleHeadSelectors = [];
          if (h1El) {
            if (h1El.tagName) articleHeadSelectors.push(h1El.tagName.toLowerCase());
            if (h1El.className) {
              h1El.className.split(/\s+/).forEach(c => {
                if (c && !c.startsWith('__')) articleHeadSelectors.push('.' + c);
              });
            }
            let curr = h1El.parentElement;
            let depth = 0;
            while (curr && curr !== doc.body && depth < 3) {
              if (curr.className) {
                curr.className.split(/\s+/).forEach(c => {
                  if (c && !c.startsWith('__')) {
                    articleHeadSelectors.push('.' + c + ' h1');
                    articleHeadSelectors.push('.' + c + ' .headline');
                  }
                });
              }
              curr = curr.parentElement;
              depth++;
            }
          }

          // Scan style rules targeting specific article selectors
          if (isGenericOrMissing(extractedHeadingFont) || isGenericOrMissing(extractedFont)) {
            styleTags.forEach(s => {
              const text = s.textContent || '';
              
              // Article Heading Rules
              for (const sel of articleHeadSelectors) {
                const escaped = sel.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const regex = new RegExp('(?:^|[,\\s\\}])(' + escaped + ')[^{]*\\{([^}]+)\\}', 'gi');
                for (const match of text.matchAll(regex)) {
                  const block = match[2];
                  const fontMatch = block.match(/font-family\s*:\s*([^;!}\n]+)/i);
                  if (fontMatch) {
                    const resolved = this._cleanFontFamilyString(this._resolveCssValue(fontMatch[1], cssVars));
                    if (resolved && !isGenericOrMissing(resolved) && isGenericOrMissing(extractedHeadingFont)) {
                      extractedHeadingFont = resolved;
                    }
                  }
                }
              }

              // Article Paragraph Rules
              for (const sel of articlePSelectors) {
                const escaped = sel.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                const regex = new RegExp('(?:^|[,\\s\\}])(' + escaped + ')[^{]*\\{([^}]+)\\}', 'gi');
                for (const match of text.matchAll(regex)) {
                  const block = match[2];
                  const fontMatch = block.match(/font-family\s*:\s*([^;!}\n]+)/i);
                  if (fontMatch) {
                    const resolved = this._cleanFontFamilyString(this._resolveCssValue(fontMatch[1], cssVars));
                    if (resolved && !isGenericOrMissing(resolved) && isGenericOrMissing(extractedFont)) {
                      extractedFont = resolved;
                    }
                  }
                }
              }
            });
          }

          // Scan CSS Custom Properties specifically for typography tokens (including --font-family-martel, etc.)
          if (isGenericOrMissing(extractedHeadingFont) || isGenericOrMissing(extractedFont)) {
            const resolvedVars = [];
            cssVars.forEach((val, varName) => {
              const lowerVar = varName.toLowerCase();
              if (lowerVar.includes('size') || lowerVar.includes('weight') || lowerVar.includes('height') || lowerVar.includes('spacing') || lowerVar.includes('color')) return;
              let resolved = this._cleanFontFamilyString(this._resolveCssValue(val, cssVars));
              if (!resolved && declaredFontFaces.length > 0) {
                const match = declaredFontFaces.find(df => lowerVar.includes(df.toLowerCase()));
                if (match) resolved = match;
              }
              if (resolved && !isGenericOrMissing(resolved)) {
                resolvedVars.push({ varName, lowerVar, resolved });
              }
            });

            // Pass 1: Explicit Heading tokens (including WordPress, Elementor, Avada, Blocksy, Neve, Wix, Squarespace, Ghost, Shopify, Webnode, Beehiiv)
            for (const { lowerVar, resolved } of resolvedVars) {
              if (isGenericOrMissing(extractedHeadingFont)) {
                if (/font.*(?:head|title|h1|display|brand-heading|primary)|(?:head|title|h1|display|brand-heading|primary).*font|headingsfontfamily|awb-typography1|bh-font-heading|gh-font-heading|wix-font-title|wst-heading|wnd-font-primary/i.test(lowerVar)) {
                  extractedHeadingFont = resolved;
                }
              }
            }

            // Pass 2: Explicit Body / Text / Sans tokens
            for (const { lowerVar, resolved } of resolvedVars) {
              if (isGenericOrMissing(extractedFont)) {
                if (/font.*(?:body|sans|base|text|main|para|content|secondary)|(?:body|sans|base|text|main|para|content|secondary).*font|bodyfontfamily|theme-font-family|awb-body-font|bh-font-body|md-text-font|notion-font|gh-font-body|wix-font-body|wst-body|wnd-font-secondary|framer-font-family/i.test(lowerVar)) {
                  extractedFont = resolved;
                }
              }
            }

            // Pass 3: Brand Archetypes (polysans, martel, lora, etc.)
            for (const { lowerVar, resolved } of resolvedVars) {
              const rLower = resolved.toLowerCase();
              if (lowerVar.includes('polysans') || rLower.includes('polysans')) {
                if (isGenericOrMissing(extractedHeadingFont)) extractedHeadingFont = resolved;
                if (isGenericOrMissing(extractedFont)) extractedFont = resolved;
              }
              if (lowerVar.includes('martel') || rLower.includes('martel')) {
                if (isGenericOrMissing(extractedHeadingFont)) extractedHeadingFont = resolved;
              }
            }

            // Pass 4: Fallback for any remaining --font-* without mono
            for (const { lowerVar, resolved } of resolvedVars) {
              if (lowerVar.startsWith('--font-') || lowerVar.includes('font-family')) {
                if (isGenericOrMissing(extractedHeadingFont) && !lowerVar.includes('mono')) extractedHeadingFont = resolved;
                if (isGenericOrMissing(extractedFont) && !lowerVar.includes('mono')) extractedFont = resolved;
              }
            }
          }

          if (isGenericOrMissing(extractedHeadingFont) || isGenericOrMissing(extractedFont)) {
            // Secondary CSS rule scanning fallback
            styleTags.forEach(s => {
              const text = s.textContent || '';
              
              const allH4Matches = text.matchAll(/(?:h4|\.entry-content[\s>]+h4)[^{]*\{[^}]*?font-family\s*:\s*([^;!}\n]+)/gi);
              for (const m of allH4Matches) {
                const res = this._cleanFontFamilyString(this._resolveCssValue(m[1], cssVars));
                if (res && !res.toLowerCase().includes('inherit') && isGenericOrMissing(extractedH4Font)) extractedH4Font = res;
              }

              const allHeadMatches = text.matchAll(/(?:\.c-article-title|\.article__heading|\.article--heading|\.mol-article-header__title|\.entry-title|\.articleNewDetail__title|\.e-web-aktualne-articles-show__title|\.post-title|\.article-title|\.page-title|h1)[^{]*\{[^}]*?font-family\s*:\s*([^;!}\n]+)/gi);
              for (const m of allHeadMatches) {
                const res = this._cleanFontFamilyString(this._resolveCssValue(m[1], cssVars));
                if (res && !res.toLowerCase().includes('inherit') && isGenericOrMissing(extractedHeadingFont)) extractedHeadingFont = res;
              }

              const allBodyMatches = text.matchAll(/(?:\.c-article-body(?:[\s>]+p)?|\.article__content(?:[\s>]+p)?|\.article--content(?:[\s>]+(?:\.ql-editor|p))?|\.article__body(?:[\s>]+p)?|\.core-container(?:[\s>]+p)?|body|\.mol-article-content(?:[\s>]+p)?|\.articleNewDetail__content(?:[\s>]+p)?|\.e-web-aktualne-articles-show-body(?:[\s>]+p)?|\.entry-content[\s>]+p|\.post-content[\s>]+p|article[\s>]+p|main[\s>]+p|\.doc-content[\s>]+p)[^{]*\{[^}]*?font-family\s*:\s*([^;!}\n]+)/gi);
              for (const m of allBodyMatches) {
                const res = this._cleanFontFamilyString(this._resolveCssValue(m[1], cssVars));
                if (res && !res.toLowerCase().includes('inherit') && isGenericOrMissing(extractedFont)) extractedFont = res;
              }
            });
          }

          // Prioritize declared custom @font-face families if computed style was generic
          if (declaredFontFaces.length > 0) {
            if (isGenericOrMissing(extractedHeadingFont)) {
              extractedHeadingFont = declaredFontFaces[0];
            }
            if (isGenericOrMissing(extractedFont)) {
              extractedFont = declaredFontFaces.length > 1 ? declaredFontFaces[1] : declaredFontFaces[0];
            }
          }

          // Google Fonts link resolution
          const fontLinks = Array.from(doc.querySelectorAll('link[rel*="stylesheet"][href*="fonts.googleapis.com"], link[rel*="stylesheet"][href*="fonts.bunny.net"], link[rel*="stylesheet"][href*="use.typekit.net"]'));
          const foundFamilies = [];
          const processFontHref = (rawHref) => {
            if (!rawHref || !rawHref.includes('family=')) return;
            let href = rawHref.replace(/&#038;/g, '&').replace(/&amp;/g, '&');
            const qIdx = href.indexOf('?');
            if (qIdx === -1) return;
            const queryString = href.substring(qIdx + 1);

            const params = queryString.split('&');
            for (const p of params) {
              if (p.startsWith('family=')) {
                const val = p.substring(7);
                const subFamilies = val.split('|');
                for (const sub of subFamilies) {
                  let name = sub.replace(/%2C/gi, '').replace(/%20/gi, ' ').replace(/\+/g, ' ').trim();
                  name = (name.split(':@')[0] || '').split(':')[0].trim();
                  name = decodeURIComponent(name).replace(/['"]/g, '').trim();
                  const ignorable = ['https', 'http', 'fonts', 'googleapis', 'com', 'css', 'css2', 'bunny', 'net', 'typekit', 'use', 'display', 'subset', 'ver', 'wght', 'ital', 'opsz', 'swap', 'auto', 'block', 'fallback', 'optional'];
                  if (name && name.length > 1 && !ignorable.includes(name.toLowerCase()) && !foundFamilies.includes(name)) {
                    foundFamilies.push(name);
                  }
                }
              }
            }
          };

          fontLinks.forEach(link => processFontHref(link.getAttribute('href')));
          styleTags.forEach(s => {
            const text = s.textContent || '';
            const importMatches = text.matchAll(/@import\s+(?:url\(['"]?|['"])(https?:\/\/[^'"]+fonts\.(?:googleapis|bunny)\.[^'"]+)(?:['"]?\)|['"])/gi);
            for (const m of importMatches) {
              processFontHref(m[1]);
            }
          });

          if (foundFamilies.length > 0) {
            foundFamilies.forEach(f => {
              const fClean = this._cleanFontFamilyString(f);
              if (extractedHeadingFont && extractedHeadingFont.toLowerCase().includes(fClean.toLowerCase())) {
                extractedHeadingFont = fClean;
              }
              if (extractedFont && extractedFont.toLowerCase().includes(fClean.toLowerCase())) {
                extractedFont = fClean;
              }
              if (extractedH4Font && extractedH4Font.toLowerCase().includes(fClean.toLowerCase())) {
                extractedH4Font = fClean;
              }
            });

            if (isGenericOrMissing(extractedHeadingFont) && isGenericOrMissing(extractedFont)) {
              extractedFont = foundFamilies[0];
              extractedHeadingFont = foundFamilies.length > 1 ? foundFamilies[1] : foundFamilies[0];
            } else if (isGenericOrMissing(extractedHeadingFont) && !isGenericOrMissing(extractedFont)) {
              const rem = foundFamilies.find(f => this._cleanFontFamilyString(f).toLowerCase() !== extractedFont.toLowerCase());
              if (rem) extractedHeadingFont = this._cleanFontFamilyString(rem);
            } else if (!isGenericOrMissing(extractedHeadingFont) && isGenericOrMissing(extractedFont)) {
              const rem = foundFamilies.find(f => this._cleanFontFamilyString(f).toLowerCase() !== extractedHeadingFont.toLowerCase());
              if (rem) extractedFont = this._cleanFontFamilyString(rem);
            }
          }
        }

        // =========================================================================
        // 4. ELEMENT-SPECIFIC COLOR EXTRACTION (PRIMARY: GETCOMPUTEDSTYLE)
        // =========================================================================
        let h1Color = '';
        let h2Color = '';
        let h3Color = '';
        let h4Color = '';
        let pColor = '';

        if (computedH1?.color) {
          const c = this._normalizeColorToHex(computedH1.color);
          if (c) h1Color = c;
        }
        if (computedH2?.color) {
          const c = this._normalizeColorToHex(computedH2.color);
          if (c) h2Color = c;
        }
        if (computedH3?.color) {
          const c = this._normalizeColorToHex(computedH3.color);
          if (c) h3Color = c;
        }
        if (computedH4?.color) {
          const c = this._normalizeColorToHex(computedH4.color);
          if (c) h4Color = c;
        }
        if (computedP?.color) {
          const c = this._normalizeColorToHex(computedP.color);
          if (c) pColor = c;
        }

        if (isWikipedia) {
          h1Color = '#000000';
          h2Color = '#000000';
          h3Color = '#000000';
          h4Color = '#000000';
          pColor = '#202122';
        } else if (!h1Color || !pColor) {
          // Secondary CSS rule scanning fallback
          styleTags.forEach(s => {
            const text = s.textContent || '';

            if (!h1Color) {
              const allH1Matches = text.matchAll(/(?:\.entry-title|\.page-title|\.site-title|\.articleNewDetail__title|\.e-web-aktualne-articles-show__title|\.post-title|h1)[^{]*\{[^}]*?color\s*:\s*([^;!}\n]+)/gi);
              for (const m of allH1Matches) {
                const hex = this._normalizeColorToHex(this._resolveCssValue(m[1], cssVars));
                if (hex) {
                  const hsl = this._hexToHSL(hex);
                  if (hsl && hsl.l <= 0.65) h1Color = hex;
                }
              }
            }

            if (!pColor) {
              const allPMatches = text.matchAll(/(?:\.articleNewDetail__content(?:[\s>]+p)?|\.e-web-aktualne-articles-show-body(?:[\s>]+p)?|\.entry-content[\s>]+p|\.post-content[\s>]+p|article[\s>]+p|main[\s>]+p|body)[^{]*\{[^}]*?color\s*:\s*([^;!}\n]+)/gi);
              for (const m of allPMatches) {
                const hex = this._normalizeColorToHex(this._resolveCssValue(m[1], cssVars));
                if (hex) {
                  const hsl = this._hexToHSL(hex);
                  if (hsl && (hsl.l <= 0.18 || (hsl.l <= 0.40 && hsl.s <= 0.45))) {
                    pColor = hex;
                  }
                }
              }
            }
          });
        }

        // Fallbacks for Heading Color
        const defaultDarkHeading = (brandHsl && brandHsl.l <= 0.35 && brandHsl.s <= 0.70) ? bestBrandColor : '#1e293b';
        if (!h1Color) h1Color = defaultDarkHeading;
        if (!h2Color) h2Color = h1Color;
        if (!h3Color) h3Color = h1Color;
        if (!h4Color) h4Color = h1Color;
        const headingColor = h1Color;

        if (!pColor) pColor = '#334155';

        const fallback = this._deriveTokensFromHostOrFallback(sourceUrl);

        let finalBodyFontName = extractedFont;
        if (isGenericOrMissing(finalBodyFontName)) {
          finalBodyFontName = fallback.bodyFont ? fallback.bodyFont.split(',')[0].replace(/['"]/g, '').trim() : (isWikipedia ? 'sans-serif' : 'Inter');
        }

        let finalHeadingFontName = extractedHeadingFont;
        if (isGenericOrMissing(finalHeadingFontName)) {
          finalHeadingFontName = fallback.headingFont ? fallback.headingFont.split(',')[0].replace(/['"]/g, '').trim() : (isWikipedia ? 'Linux Libertine' : finalBodyFontName);
        }

        let finalH4FontName = extractedH4Font;
        if (isGenericOrMissing(finalH4FontName)) {
          finalH4FontName = finalHeadingFontName;
        }

        const cleanFontName = finalBodyFontName;
        const cleanHeadingFont = finalHeadingFontName;
        const cleanH4Font = finalH4FontName;

        // Ensure real fonts load via Google Fonts API
        this._ensureGoogleFontLoaded(cleanFontName);
        if (cleanHeadingFont !== cleanFontName) {
          this._ensureGoogleFontLoaded(cleanHeadingFont);
        }
        if (cleanH4Font && cleanH4Font !== cleanHeadingFont && cleanH4Font !== cleanFontName) {
          this._ensureGoogleFontLoaded(cleanH4Font);
        }

        // 5. CONSTRUCT ROBUST CSS FONT STACKS
        const headingStack = this._buildFontStack(cleanHeadingFont);
        const bodyStack = this._buildFontStack(cleanFontName);
        const h4Stack = this._buildFontStack(cleanH4Font);

        const finalBrand = bestBrandColor || fallback.brandColor || '#0284c7';
        const finalBg = lightBg || fallback.lightBg || '#f0f9ff';
        const finalBorder = lightBorder || fallback.lightBorder || '#bae6fd';
        const finalSecondary = secondaryColor || fallback.secondaryColor || '#0369a1';
        const finalHeadingColor = headingColor || fallback.headingColor || finalBrand;
        const finalH1 = h1Color || headingColor || fallback.h1Color || '#0f172a';
        const finalH2 = h2Color || headingColor || fallback.h2Color || finalBrand;
        const finalH3 = h3Color || headingColor || fallback.h3Color || finalSecondary;
        const finalH4 = h4Color || headingColor || fallback.h4Color || finalSecondary;
        const finalBodyFont = bodyStack || cleanFontName || fallback.bodyFont || 'system-ui, -apple-system, sans-serif';
        const finalHeadingFont = headingStack || cleanHeadingFont || fallback.headingFont || finalBodyFont;
        const finalH4Font = h4Stack || cleanH4Font || fallback.h4Font || finalHeadingFont;
        const finalP = pColor || fallback.pColor || '#334155';

        // Extract article / page paper background if it is a light editorial tint (e.g. warm cream #fbf6eb on pkohout.com)
        let paperBg = '#ffffff';
        if (iframeWin && !isWikipedia) {
          try {
            const bgCandidates = [];
            let currBgEl = pEl || h1El;
            while (currBgEl && currBgEl.nodeType === 1) {
              bgCandidates.push(currBgEl);
              currBgEl = currBgEl.parentElement;
            }
            docToQuery.querySelectorAll('article, main, [data-hook="post-description"], .L5x0Fp, body').forEach(el => {
              if (!bgCandidates.includes(el)) bgCandidates.push(el);
            });
            for (const cand of bgCandidates) {
              const cs = iframeWin.getComputedStyle(cand);
              const rawBg = cs?.backgroundColor;
              if (rawBg && rawBg !== 'rgba(0, 0, 0, 0)' && rawBg !== 'transparent') {
                const hex = this._normalizeColorToHex(rawBg);
                if (hex && hex !== '#ffffff') {
                  const hsl = this._hexToHSL(hex);
                  if (hsl && hsl.l >= 0.85 && hsl.l < 0.998) {
                    paperBg = hex;
                    break;
                  }
                } else if (hex === '#ffffff') {
                  paperBg = '#ffffff';
                  break;
                }
              }
            }
          } catch (e) {}
        }

        const h1Weight = computedH1?.fontWeight || '700';
        const h2Weight = computedH2?.fontWeight || h1Weight || '700';

        const styleTokens = {
          brandColor: finalBrand,
          paperBg,
          lightBg: finalBg,
          lightBorder: finalBorder,
          secondaryColor: finalSecondary,
          headingColor: finalHeadingColor,
          h1Color: finalH1,
          h2Color: finalH2,
          h3Color: finalH3,
          h4Color: finalH4,
          h1Weight,
          h2Weight,
          pColor: finalP,
          bodyFont: finalBodyFont,
          headingFont: finalHeadingFont,
          h4Font: finalH4Font,
          leadItalic: computedLead?.fontStyle === 'italic',
          hasDropCap: styleTags.some(s => /:first-letter/i.test(s.textContent || '')),
          sourceHost: sourceUrl ? new URL(sourceUrl, window.location.href).hostname : ''
        };

        return styleTokens;
      } catch (e) {
        console.warn('Error in _extractWebTokens:', e);
        return this._deriveTokensFromHostOrFallback(sourceUrl);
      }
    }

    static _cleanFontFamilyString(fontFamilyStr) {
      if (!fontFamilyStr) return '';
      const trimmed = fontFamilyStr.trim();
      if (!trimmed || trimmed === 'inherit' || trimmed === 'initial' || trimmed === 'unset') return '';
      if (/^[\d.]+(?:rem|em|px|%|pt|vw|vh)$/i.test(trimmed) || /^\d+$/.test(trimmed)) return '';
      
      const parts = trimmed.split(',').map(p => p.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      if (parts.length === 0) return '';

      const cleanedParts = [];
      for (const rawName of parts) {
        // Ignore Wix internal hashed font tokens (wfont_1d6c65_..., wf_e58f204014..., font_0..font_9)
        if (/^(?:wfont|wf)_[a-f0-9_]+$/i.test(rawName) || /^font_\d+$/i.test(rawName)) {
          continue;
        }
        // Ignore Next.js automatic fallback metrics font (__Inter_Fallback_e66fe9)
        if (/^__[a-zA-Z0-9_-]+_Fallback_[a-f0-9]{4,}$/i.test(rawName) || /\bFallback$/i.test(rawName)) {
          continue;
        }
        let name = rawName;
        // Strip Framer font prefixes (GF;Playfair Display-regular -> Playfair Display)
        name = name.replace(/^(?:GF|FS|TK);/i, '');

        // Decode Wix original font identifier: orig_eb_garamond_regular -> EB Garamond
        if (/^orig_/i.test(name)) {
          name = name
            .replace(/^orig_/i, '')
            .replace(/(?:_(?:regular|bold|light|medium|semibold|extrabold|ultrabold|black|italic|thin|hairline|book|roman|normal|oblique|\d+))+$/i, '')
            .replace(/_/g, ' ')
            .trim();
          name = name.split(/\s+/).map(w => {
            if (/^(?:eb|pt|st|nt|itc|mt|bt|lt|urw|ibm|tv|fk)$/i.test(w)) return w.toUpperCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          }).join(' ');
        } else {
          // Strip Next.js / Webpack hashed font identifiers: __polysans_9afc27 -> polysans
          name = name.replace(/^__([a-zA-Z0-9_-]+)_[a-f0-9]{4,}$/, '$1').replace(/_/g, ' ').trim();
          // Strip Typekit / Squarespace / Webflow variation suffixes (-n4, -n7, -i4) and weight suffixes (-Regular, -Bold)
          name = name.replace(/-[ni][1-9]$/i, '').replace(/-(?:Regular|Bold|Light|Medium|SemiBold|ExtraBold|Black|Italic|Roman|Book)$/i, '').trim();
        }
        if (!name) continue;
        const lower = name.toLowerCase();
        if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'ui-serif', 'ui-monospace'].includes(lower)) {
          cleanedParts.push(name);
        } else if (!cleanedParts.includes(`"${name}"`)) {
          cleanedParts.push(`"${name}"`);
        }
      }
      return cleanedParts.join(', ');
    }

    static _buildFontStack(fontName) {
      if (!fontName) return 'system-ui, -apple-system, sans-serif';
      const rawParts = fontName.split(',').map(p => p.replace(/['"]/g, '').trim()).filter(Boolean);
      const genericKeywords = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'ui-serif', 'ui-monospace'];
      const nonGenericParts = rawParts.filter(p => !genericKeywords.includes(p.toLowerCase()));
      const primaryClean = nonGenericParts[0] || rawParts[0] || fontName.replace(/['"]/g, '').trim();
      const lower = primaryClean.toLowerCase();

      // Check if there is a known proprietary or commercial font that needs a mapped Google Font
      const proprietaryMap = {
        'eb garamond': 'EB Garamond',
        'vollkorn var': 'Vollkorn',
        'vollkorn': 'Vollkorn',
        'tabac big': 'Playfair Display',
        'tabac': 'Playfair Display',
        'source-serif-pro': 'Source Serif 4',
        'source serif pro': 'Source Serif 4',
        'gt-super': 'Playfair Display',
        'gt super': 'Playfair Display',
        'freight-text-pro': 'Lora',
        'freight text pro': 'Lora',
        'ff-tisa': 'Merriweather',
        'tisa': 'Merriweather',
        'bbc reith': 'Lora',
        'reith serif': 'Lora',
        'reith sans': 'Plus Jakarta Sans',
        'nyt-cheltenham': 'Playfair Display',
        'nyt-imperial': 'Merriweather',
        'guardian headline': 'Playfair Display',
        'guardian egyptian': 'Merriweather',
        'guardiantextsans': 'Plus Jakarta Sans',
        'guardian text': 'Plus Jakarta Sans',
        'publico': 'Lora',
        'majrit': 'Playfair Display',
        'tiempos': 'Source Serif 4',
        'theantiquab': 'PT Serif',
        'the antiqua': 'PT Serif',
        'martel': 'Martel',
        'harding': 'EB Garamond',
        'knowledge': 'Inter',
        'circular': 'Plus Jakarta Sans',
        'graphik': 'Inter',
        'proxima nova': 'Montserrat',
        'proxima-nova': 'Montserrat',
        'avenir': 'Plus Jakarta Sans',
        'brandon grotesque': 'Outfit',
        'futura': 'Outfit',
        'neue helvetica': 'Inter',
        'helvetica neue': 'Inter',
        'sohne': 'Plus Jakarta Sans',
        'polysans': 'Plus Jakarta Sans',
        'fkromanstandard': 'Lora',
        'fk roman standard': 'Lora',
        'tv sans screen': 'Source Sans Pro',
        'lumin': 'Inter',
        'obviously': 'Outfit',
        'mona sans': 'Inter',
        'mona sans vf': 'Inter',
        'linux libertine': 'Linux Libertine'
      };

      let mappedGoogleFont = '';
      for (const [key, gFont] of Object.entries(proprietaryMap)) {
        if (lower.includes(key)) {
          mappedGoogleFont = gFont;
          break;
        }
      }

      // Only preserve multi-font stacks verbatim if they contain multiple real (non-generic) font names
      if (nonGenericParts.length > 1) {
        if (mappedGoogleFont && !fontName.toLowerCase().includes(mappedGoogleFont.toLowerCase())) {
          const firstComma = fontName.indexOf(',');
          return fontName.substring(0, firstComma) + `, "${mappedGoogleFont}"` + fontName.substring(firstComma);
        }
        return fontName;
      }

      const clean = primaryClean;

      // Serif family stack
      const serifKeywords = ['vollkorn', 'tabac', 'harding', 'antiqua', 'theantiquab', 'the antiqua', 'pt serif', 'martel', 'libertine', 'garamond', 'georgia', 'times', 'serif', 'lora', 'merriweather', 'playfair', 'cinzel', 'caslon', 'baskerville', 'minion', 'charter', 'cambria', 'constantia', 'cormorant', 'spectral', 'bitter', 'forum', 'cheltenham', 'imperial', 'financier', 'escrow', 'publico', 'lyon', 'guardian headline', 'guardian text', 'noto_serif', 'majrit', 'tiempos', 'sentinel', 'elena', 'faustina', 'heldane', 'spiegelserif', 'bower', 'reith', 'austin', 'sme headline'];
      if (serifKeywords.some(k => lower.includes(k))) {
        const fallbackG = mappedGoogleFont || 'Lora';
        const dedupFallback = fallbackG.toLowerCase() === lower ? '' : `"${fallbackG}", `;
        return `"${clean}", ${dedupFallback}"Merriweather", Georgia, "Times New Roman", serif`;
      }

      // Monospace family stack
      const monoKeywords = ['mono', 'code', 'consolas', 'courier', 'menlo', 'monaco', 'inconsolata', 'cascadia'];
      if (monoKeywords.some(k => lower.includes(k))) {
        return `"${clean}", "JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace`;
      }

      // Modern Sans-Serif family stack
      const fallbackSans = mappedGoogleFont || 'Plus Jakarta Sans';
      return `"${clean}", "${fallbackSans}", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    }

    static _ensureGoogleFontLoaded(fontName) {
      if (!fontName || typeof document === 'undefined' || !document.head) return;
      let cleanName = fontName.split(',')[0].replace(/['"]/g, '').trim();
      cleanName = cleanName.replace(/-(?:EditorDashes|Regular|Bold|Light|Medium|SemiBold|ExtraBold|Black|Italic|subset|\d+)$/i, '').trim();
      const standardFonts = [
        'system-ui', 'sans-serif', 'serif', 'monospace', 'initial', 'inherit',
        'arial', 'helvetica', 'times new roman', 'times', 'georgia', 'courier', 'courier new', 'verdana', 'tahoma', 'trebuchet ms', 'segoe ui', 'calibri', 'cambria'
      ];
      if (standardFonts.includes(cleanName.toLowerCase())) return;

      const lower = cleanName.toLowerCase();
      
      // Known proprietary webfont fallbacks to high-grade Google Fonts
      const proprietaryMap = {
        'vollkorn var': 'Vollkorn',
        'vollkorn': 'Vollkorn',
        'tabac big': 'Playfair Display',
        'tabac': 'Playfair Display',
        'bbc reith': 'Lora',
        'reith serif': 'Lora',
        'reith sans': 'Plus Jakarta Sans',
        'nyt-cheltenham': 'Playfair Display',
        'nyt-imperial': 'Merriweather',
        'guardian headline': 'Playfair Display',
        'guardian egyptian': 'Merriweather',
        'guardiantextsans': 'Plus Jakarta Sans',
        'guardian text': 'Plus Jakarta Sans',
        'publico': 'Lora',
        'majrit': 'Playfair Display',
        'tiempos': 'Source Serif 4',
        'theantiquab': 'PT Serif',
        'the antiqua': 'PT Serif',
        'martel': 'Martel',
        'harding': 'EB Garamond',
        'knowledge': 'Inter',
        'knowledge2017': 'Inter',
        'circular': 'Plus Jakarta Sans',
        'graphik': 'Inter',
        'proxima nova': 'Montserrat',
        'futura': 'Outfit',
        'neue helvetica': 'Inter',
        'helvetica neue': 'Inter',
        'sohne': 'Plus Jakarta Sans',
        'polysans': 'Plus Jakarta Sans',
        'fkromanstandard': 'Lora',
        'tv sans screen': 'Source Sans Pro',
        'lumin': 'Inter',
        'obviously': 'Outfit',
        'mona sans': 'Inter'
      };

      for (const [key, gFont] of Object.entries(proprietaryMap)) {
        if (lower.includes(key)) {
          this._loadGoogleFontLink(gFont);
        }
      }

      if (!cleanName.startsWith('__') && !Object.keys(proprietaryMap).some(k => lower === k || lower.startsWith(k))) {
        this._loadGoogleFontLink(cleanName);
      }
    }

    static _loadGoogleFontLink(cleanName) {
      if (!cleanName) return;
      const fontId = `gfont-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (document.getElementById(fontId)) return;

      try {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        const encoded = encodeURIComponent(cleanName).replace(/%20/g, '+');
        link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;
        link.onerror = () => {
          link.href = `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`;
        };
        document.head.appendChild(link);
      } catch (e) {}
    }

    static _normalizeColorToHex(colorStr) {
      if (!colorStr) return '';
      let c = colorStr.trim().toLowerCase();
      c = c.replace(/!important/g, '').trim();

      // 1. Hex format (#rgb, #rgba, #rrggbb, #rrggbbaa)
      if (/^#([0-9a-f]{3,8})$/i.test(c)) {
        const raw = c.substring(1);
        if (raw.length === 3) {
          return '#' + raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
        }
        if (raw.length === 4) {
          return '#' + raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
        }
        if (raw.length >= 6) {
          return '#' + raw.substring(0, 6);
        }
      }

      // 2. RGB / RGBA format (comma or space separated) with authentic white paper compositing
      if (c.startsWith('rgb')) {
        const nums = c.match(/[\d.]+/g);
        if (nums && nums.length >= 3) {
          const rawR = Math.min(255, Math.max(0, parseInt(nums[0], 10)));
          const rawG = Math.min(255, Math.max(0, parseInt(nums[1], 10)));
          const rawB = Math.min(255, Math.max(0, parseInt(nums[2], 10)));
          const alpha = nums.length >= 4 ? Math.min(1, Math.max(0, parseFloat(nums[3]))) : 1.0;

          // Composite foreground color over clean white paper background
          const r = Math.round(rawR * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0');
          const g = Math.round(rawG * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0');
          const b = Math.round(rawB * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }

      // 3. HSL / HSLA format (comma or space separated) or bare HSL triplet (Squarespace 7.1 --accent-hsl: 350, 62%, 69%)
      if (c.startsWith('hsl') || /^\d{1,3}(?:\.\d+)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%$/.test(c)) {
        const nums = c.match(/[\d.]+/g);
        if (nums && nums.length >= 3) {
          const h = parseFloat(nums[0]) || 0;
          const s = (parseFloat(nums[1]) || 0) / 100;
          const l = (parseFloat(nums[2]) || 0) / 100;
          return this._hslToHex(h, s, l);
        }
      }

      // 3b. Bare RGB triplet format (Wix --color_18: 232,74,67 / Shopify --color-base-accent-1: 18, 18, 18 / Bootstrap --bs-primary-rgb: 13, 110, 253)
      if (/^\d{1,3}(?:\s*,\s*|\s+)\d{1,3}(?:\s*,\s*|\s+)\d{1,3}$/.test(c)) {
        const nums = c.match(/\d+/g);
        if (nums && nums.length === 3) {
          const rVal = parseInt(nums[0], 10);
          const gVal = parseInt(nums[1], 10);
          const bVal = parseInt(nums[2], 10);
          if (rVal <= 255 && gVal <= 255 && bVal <= 255) {
            const r = rVal.toString(16).padStart(2, '0');
            const g = gVal.toString(16).padStart(2, '0');
            const b = bVal.toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          }
        }
      }

      // 4. CSS Named Colors & Framework Tokens Dictionary
      const namedColors = {
        navy: '#000080', darkblue: '#00008b', blue: '#0000ff', royalblue: '#4169e1',
        midnightblue: '#191970', teal: '#008080', darkcyan: '#008b8b', darkslategray: '#2f4f4f',
        forestgreen: '#228b22', seagreen: '#2e8b57', darkgreen: '#006400', crimson: '#dc143c',
        firebrick: '#b22222', maroon: '#800000', darkred: '#8b0000', indigo: '#4b0082',
        purple: '#800080', darkmagenta: '#8b008b', slateblue: '#6a5acd', darkslateblue: '#483d8b',
        steelblue: '#4682b4', dodgerblue: '#1e90ff', cadetblue: '#5f9ea0', darkolivegreen: '#556b2f',
        sienna: '#a0522d', saddlebrown: '#8b4513', chocolate: '#d2691e', brown: '#a52a2a',
        black: '#000000', white: '#ffffff', gray: '#808080', dimgray: '#696969', slategray: '#708090',
        skyblue: '#87ceeb', cornflowerblue: '#6495ed', mediumseagreen: '#3cb371',
        // Tailwind / Bootstrap common tokens
        'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca',
        'emerald-600': '#059669', 'emerald-700': '#047857', 'teal-600': '#0d9488', 'teal-700': '#0f766e',
        'sky-600': '#0284c7', 'sky-700': '#0369a1', 'amber-600': '#d97706', 'amber-700': '#b45309',
        'rose-600': '#e11d48', 'rose-700': '#be123c', 'purple-600': '#9333ea', 'purple-700': '#7e22ce',
        'violet-600': '#7c3aed', 'slate-800': '#1e293b', 'slate-900': '#0f172a', 'zinc-800': '#27272a'
      };

      if (namedColors[c]) {
        return namedColors[c];
      }

      return '';
    }

    static _hexToHSL(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      if (c.length !== 6) return null;

      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: Math.round(h * 360), s, l };
    }

    static _hslToHex(h, s, l) {
      h = h % 360;
      if (h < 0) h += 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;

      if (0 <= h && h < 60) { r = c; g = x; b = 0; }
      else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
      else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
      else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
      else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
      else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

      const toHex = val => Math.round((val + m) * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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

      // Derive authentic tokens from the domain if raw styles were not in Markdown
      const styleTokens = this._deriveTokensFromHostOrFallback(effectiveSourceUrl);

      return {
        title: title || 'Nová kapitola',
        sourceUrl: effectiveSourceUrl,
        htmlContent: html,
        styleTokens: styleTokens
      };
    }

    static _deriveTokensFromHostOrFallback(sourceUrl) {
      if (!sourceUrl) {
        return {
          brandColor: '#0284c7',
          lightBg: '#f0f9ff',
          lightBorder: '#bae6fd',
          secondaryColor: '#0369a1',
          headingColor: '#0f172a',
          h1Color: '#0f172a',
          h2Color: '#0284c7',
          h3Color: '#0369a1',
          h4Color: '#0f172a',
          pColor: '#1e293b',
          bodyFont: 'Inter',
          headingFont: 'Outfit',
          h4Font: 'Outfit',
          sourceHost: ''
        };
      }

      let host = '';
      try {
        host = new URL(sourceUrl, window.location.href).hostname.toLowerCase().replace(/^www\./, '');
      } catch (e) {
        host = (sourceUrl || '').toLowerCase();
      }

      if (typeof GlobalBenchmarkRegistry !== 'undefined' && host) {
        const found = GlobalBenchmarkRegistry.getAll().find(b => {
          if (!b.styleTokens?.sourceHost) return false;
          const bHost = b.styleTokens.sourceHost.toLowerCase().replace(/^www\./, '');
          return host === bHost || host.endsWith('.' + bHost);
        });
        if (found && found.styleTokens) {
          return { ...found.styleTokens, sourceHost: host };
        }
      }

      // Default neutral baseline fallback (only used when HTML has 0 styles)

      // 1. Seznam Medium (Martel serif)
      if (host === 'medium.seznam.cz' || host.endsWith('.medium.seznam.cz')) {
        return {
          brandColor: '#cc0000',
          lightBg: '#fef2f2',
          lightBorder: '#fecaca',
          secondaryColor: '#191919',
          headingColor: '#191919',
          h1Color: '#191919',
          h2Color: '#191919',
          h3Color: '#191919',
          h4Color: '#191919',
          pColor: '#2c2c2c',
          bodyFont: 'Martel, "Martel-Regular", Georgia, serif',
          headingFont: 'Martel, "Martel-Regular", Georgia, serif',
          h4Font: 'Martel, "Martel-Regular", Georgia, serif',
          sourceHost: host
        };
      }

      // 1b. Seznam Zprávy (Martel)
      if (host.includes('seznamzpravy.cz')) {
        return {
          brandColor: '#cc0000',
          lightBg: '#fef2f2',
          lightBorder: '#fecaca',
          secondaryColor: '#191919',
          headingColor: '#191919',
          h1Color: '#191919',
          h2Color: '#191919',
          h3Color: '#191919',
          h4Color: '#191919',
          pColor: '#2c2c2c',
          bodyFont: 'Martel, "Martel Block", Georgia, serif',
          headingFont: 'Martel, "Martel Block", Georgia, serif',
          h4Font: 'Martel, "Martel Block", Georgia, serif',
          sourceHost: host
        };
      }

      // 1c. Novinky / Seznam obecně
      if (host.includes('novinky.cz') || host.includes('seznam.cz')) {
        return {
          brandColor: '#cc0000',
          lightBg: '#fef2f2',
          lightBorder: '#fecaca',
          secondaryColor: '#191919',
          headingColor: '#191919',
          h1Color: '#191919',
          h2Color: '#191919',
          h3Color: '#191919',
          h4Color: '#191919',
          pColor: '#2c2c2c',
          bodyFont: 'Arial, sans-serif',
          headingFont: 'Arial, sans-serif',
          h4Font: 'Arial, sans-serif',
          sourceHost: host
        };
      }

      // 2. Echo24
      if (host.includes('echo24.cz')) {
        return {
          brandColor: '#1accc8',
          lightBg: '#f0fdfc',
          lightBorder: '#99f6e4',
          secondaryColor: '#372c2c',
          headingColor: '#372c2c',
          h1Color: '#372c2c',
          h2Color: '#372c2c',
          h3Color: '#372c2c',
          h4Color: '#372c2c',
          pColor: '#372c2c',
          bodyFont: 'Source Serif 4',
          headingFont: 'Source Serif 4',
          h4Font: 'Source Serif 4',
          sourceHost: host
        };
      }

      // 3. Aktuálně.cz / Economia / HN
      if (host.includes('aktualne.cz') || host.includes('hn.cz')) {
        return {
          brandColor: '#cc0000',
          lightBg: '#fef2f2',
          lightBorder: '#fecaca',
          secondaryColor: '#05171f',
          headingColor: '#05171f',
          h1Color: '#05171f',
          h2Color: '#05171f',
          h3Color: '#05171f',
          h4Color: '#05171f',
          pColor: '#05171f',
          bodyFont: 'Inter',
          headingFont: 'Barlow',
          h4Font: 'Barlow',
          sourceHost: host
        };
      }

      // 4. Jirka Mucha / Personal Blogs / Astra / Kadence
      if (host.includes('jirkamucha.cz')) {
        return {
          brandColor: '#ffd936',
          lightBg: '#fefce8',
          lightBorder: '#fef08a',
          secondaryColor: '#6a3a1a',
          headingColor: '#6a3a1a',
          h1Color: '#6a3a1a',
          h2Color: '#6a3a1a',
          h3Color: '#6a3a1a',
          h4Color: '#6a3a1a',
          pColor: '#404040',
          bodyFont: 'DM Sans',
          headingFont: 'Verdana',
          h4Font: 'Forum',
          sourceHost: host
        };
      }

      // 5. Saxoškola.cz
      if (host.includes('saxoskola.cz')) {
        return {
          brandColor: '#2a4861',
          lightBg: '#f0f7ff',
          lightBorder: '#cbd5e1',
          secondaryColor: '#1e3a5f',
          headingColor: '#2a4861',
          h1Color: '#2a4861',
          h2Color: '#2a4861',
          h3Color: '#2a4861',
          h4Color: '#2a4861',
          pColor: '#334155',
          bodyFont: 'Barlow',
          headingFont: 'Barlow',
          h4Font: 'Barlow',
          sourceHost: host
        };
      }

      // 6. Wikipedia
      if (host.includes('wikipedia.org')) {
        return {
          brandColor: '#0f4dc9',
          lightBg: '#f8f9fa',
          lightBorder: '#a2a9b1',
          secondaryColor: '#202122',
          headingColor: '#000000',
          h1Color: '#000000',
          h2Color: '#000000',
          h3Color: '#000000',
          h4Color: '#000000',
          pColor: '#202122',
          bodyFont: 'Linux Libertine',
          headingFont: 'Linux Libertine',
          h4Font: 'Linux Libertine',
          sourceHost: host
        };
      }

      // 7. iDNES / Lidovky
      if (host.includes('idnes.cz') || host.includes('lidovky.cz')) {
        return {
          brandColor: '#0066b3',
          lightBg: '#f0f7ff',
          lightBorder: '#bae6fd',
          secondaryColor: '#222222',
          headingColor: '#222222',
          h1Color: '#222222',
          h2Color: '#222222',
          h3Color: '#222222',
          h4Color: '#222222',
          pColor: '#333333',
          bodyFont: 'Inter',
          headingFont: 'Inter',
          h4Font: 'Inter',
          sourceHost: host
        };
      }

      // 8. ČT24 / Česká televize
      if (host.includes('ceskatelevize.cz') || host.includes('ct24.cz')) {
        return {
          brandColor: '#003399',
          lightBg: '#eff6ff',
          lightBorder: '#bfdbfe',
          secondaryColor: '#111111',
          headingColor: '#111111',
          h1Color: '#111111',
          h2Color: '#111111',
          h3Color: '#111111',
          h4Color: '#111111',
          pColor: '#222222',
          bodyFont: 'Inter',
          headingFont: 'Inter',
          h4Font: 'Inter',
          sourceHost: host
        };
      }

      // 9. Deník N
      if (host.includes('denikn.cz')) {
        return {
          brandColor: '#ff5138',
          lightBg: '#fff1f0',
          lightBorder: '#ffccc7',
          secondaryColor: '#1a1a1a',
          headingColor: '#1a1a1a',
          h1Color: '#1a1a1a',
          h2Color: '#1a1a1a',
          h3Color: '#1a1a1a',
          h4Color: '#1a1a1a',
          pColor: '#2d2d2d',
          bodyFont: 'Lumin, Inter, sans-serif',
          headingFont: 'Lumin, Merriweather, serif',
          h4Font: 'Lumin, Merriweather, serif',
          sourceHost: host
        };
      }

      // 10. TechCrunch
      if (host.includes('techcrunch.com')) {
        return {
          brandColor: '#00d084',
          lightBg: '#f0fdf4',
          lightBorder: '#bbf7d0',
          secondaryColor: '#111111',
          headingColor: '#111111',
          h1Color: '#111111',
          h2Color: '#111111',
          h3Color: '#111111',
          h4Color: '#111111',
          pColor: '#222222',
          bodyFont: 'Roboto',
          headingFont: 'Source Serif 4',
          h4Font: 'Source Serif 4',
          sourceHost: host
        };
      }

      // 11. The Verge
      if (host.includes('theverge.com')) {
        return {
          brandColor: '#e0124b',
          lightBg: '#fff1f2',
          lightBorder: '#fecdd3',
          secondaryColor: '#121212',
          headingColor: '#121212',
          h1Color: '#121212',
          h2Color: '#121212',
          h3Color: '#121212',
          h4Color: '#121212',
          pColor: '#242424',
          bodyFont: 'Inter',
          headingFont: 'Manrope',
          h4Font: 'Manrope',
          sourceHost: host
        };
      }

      // 12. Vercel
      if (host.includes('vercel.com')) {
        return {
          brandColor: '#000000',
          lightBg: '#fafafa',
          lightBorder: '#e5e5e5',
          secondaryColor: '#171717',
          headingColor: '#171717',
          h1Color: '#171717',
          h2Color: '#171717',
          h3Color: '#171717',
          h4Color: '#171717',
          pColor: '#333333',
          bodyFont: 'Inter',
          headingFont: 'Inter',
          h4Font: 'Inter',
          sourceHost: host
        };
      }

      // 13. Substack
      if (host.includes('substack.com')) {
        return {
          brandColor: '#ff6719',
          lightBg: '#fff7ed',
          lightBorder: '#fed7aa',
          secondaryColor: '#111111',
          headingColor: '#111111',
          h1Color: '#111111',
          h2Color: '#111111',
          h3Color: '#111111',
          h4Color: '#111111',
          pColor: '#222222',
          bodyFont: 'Inter',
          headingFont: 'Lora',
          h4Font: 'Lora',
          sourceHost: host
        };
      }

      // Generic Clean Editorial Fallback
      return {
        brandColor: '#0284c7',
        lightBg: '#f0f9ff',
        lightBorder: '#bae6fd',
        secondaryColor: '#0f172a',
        headingColor: '#0f172a',
        h1Color: '#0f172a',
        h2Color: '#0284c7',
        h3Color: '#0369a1',
        h4Color: '#0f172a',
        pColor: '#1e293b',
        bodyFont: 'Inter',
        headingFont: 'Outfit',
        h4Font: 'Outfit',
        sourceHost: host
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
      if (typeof GlobalBenchmarkRegistry !== 'undefined' && typeof GlobalBenchmarkRegistry.getAll === 'function') {
        return GlobalBenchmarkRegistry.getAll();
      }
      return [
        {
          id: 'seznam-sample',
          title: 'Ráj snů se změnil v město duchů. Ukryli se v něm podvodníci',
          sourceUrl: 'https://www.seznamzpravy.cz/clanek/zahranicni-raj-snu-se-zmenil-v-mesto-duchu-ukryli-se-v-nem-podvodnici-312456',
          styleTokens: {
            brandColor: '#cc0000',
            lightBg: '#fef2f2',
            lightBorder: '#fecaca',
            secondaryColor: '#191919',
            headingColor: '#191919',
            h1Color: '#191919',
            h2Color: '#191919',
            h3Color: '#191919',
            h4Color: '#191919',
            pColor: '#2c2c2c',
            bodyFont: 'Martel, "Martel Block", Georgia, serif',
            headingFont: 'Martel, "Martel Block", Georgia, serif',
            h4Font: 'Martel, "Martel Block", Georgia, serif',
            sourceHost: 'www.seznamzpravy.cz'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#cc0000">
            <style>
              :root {
                --color-brand: #cc0000;
                --color-heading: #191919;
                --color-text: #2c2c2c;
              }
              h1, .mol-article-header__title { font-family: "Martel", Georgia, serif; color: #191919; font-size: 34px; line-height: 1.3; }
              h2, h3, h4 { font-family: "Martel", Georgia, serif; color: #191919; }
              p, .mol-paragraph { font-family: "Martel", Georgia, serif; color: #2c2c2c; font-size: 17px; line-height: 1.7; }
            </style>
          </head>
          <body>
            <h1 class="mol-article-header__title">Ráj snů se změnil v město duchů. Ukryli se v něm podvodníci</h1>
            <div class="mol-article-content">
              <p class="doc-element lead-paragraph">Když policie nedávno provedla razii v jedné z věží „zeleného“ malajsijského megakomplexu Forest City, místo bohatých obyvatel našla stovky lidí provozujících sofistikovaná podvodná call centra.</p>
              <p class="doc-element">Projekt, který měl být chloubou moderního ekologického bydlení za 100 miliard dolarů, dnes zeje prázdnotou. Obrovské mrakodrapy obklopené umělými plážemi a tropickými zahradami přilákaly jen zlomek z plánovaných 700 tisíc obyvatel.</p>
              <p class="doc-element">V opuštěných prostorách luxusních rezidencí tak našly zázemí mezinárodní zločinecké gangy, které z Malajsie cílily na oběti v Číně a jihovýchodní Asii.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Ráj snů se změnil v město duchů. Ukryli se v něm podvodníci</h1>
            <p class="doc-element lead-paragraph">Když policie nedávno provedla razii v jedné z věží „zeleného“ malajsijského megakomplexu Forest City, místo bohatých obyvatel našla stovky lidí provozujících sofistikovaná podvodná call centra.</p>
            <p class="doc-element">Projekt, který měl být chloubou moderního ekologického bydlení za 100 miliard dolarů, dnes zeje prázdnotou. Obrovské mrakodrapy obklopené umělými plážemi a tropickými zahradami přilákaly jen zlomek z plánovaných 700 tisíc obyvatel.</p>
            <p class="doc-element">V opuštěných prostorách luxusních rezidencí tak našly zázemí mezinárodní zločinecké gangy, které z Malajsie cílily na oběti v Číně a jihovýchodní Asii.</p>
          `
        },
        {
          id: 'echo24-sample',
          title: 'Spor kvůli Ceutě se dál vyhrocuje. Španělsko odmítlo vstup deseti lidem cestujícím z Itálie',
          sourceUrl: 'https://www.echo24.cz/a/HiGhe/zpravy-svet-spanelsko-odmitlo-vstup-deseti-lidem-z-italie-prvni-den-kontrol-proverilo-199-cestujicich',
          styleTokens: {
            brandColor: '#1accc8',
            lightBg: '#f0fdfc',
            lightBorder: '#99f6e4',
            secondaryColor: '#372c2c',
            headingColor: '#372c2c',
            h1Color: '#372c2c',
            h2Color: '#372c2c',
            h3Color: '#372c2c',
            h4Color: '#372c2c',
            pColor: '#372c2c',
            bodyFont: 'Source Serif 4',
            headingFont: 'Source Serif 4',
            sourceHost: 'www.echo24.cz'
          },
          rawHtml: `<html><head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Source+Serif+4:wght@400;600;700&display=swap">
            <style>
              :root { --color-theme: #1accc8; --color-primary: #372c2c; }
              .articleNewDetail__title { font-family: "Source Serif 4", Arial, sans-serif; color: #372c2c; font-size: 38px; }
              .articleNewDetail__content, .articleNewDetail__content>p { font-family: "Source Serif 4", Arial, sans-serif; color: #372c2c; font-size: 18px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1 class="articleNewDetail__title">Spor kvůli Ceutě se dál vyhrocuje. Španělsko odmítlo vstup deseti lidem cestujícím z Itálie</h1>
            <div class="articleNewDetail__content">
              <p class="doc-element lead-paragraph">Španělsko během prvního dne obnovených hraničních kontrol odmítlo vstup deseti cestujícím z Itálie v souvislosti se sporem o autonomní město Ceuta.</p>
              <p class="doc-element">Hraniční policie a celní správa prověřily celkem 199 cestujících. Podle oficiálního prohlášení ministerstva vnitra v Madridu je cílem těchto opatření zajistit bezpečnost a dodržování platných migračních předpisů v celé schengenské zóně.</p>
              <p class="doc-element">Situace vyvolala diplomatické napětí mezi oběma státy, přičemž zástupci italské vlády požadují okamžité vysvětlení a zmírnění zavedených restrikcí.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Spor kvůli Ceutě se dál vyhrocuje. Španělsko odmítlo vstup deseti lidem cestujícím z Itálie</h1>
            <p class="doc-element lead-paragraph">Španělsko během prvního dne obnovených hraničních kontrol odmítlo vstup deseti cestujícím z Itálie v souvislosti se sporem o autonomní město Ceuta.</p>
            <p class="doc-element">Hraniční policie a celní správa prověřily celkem 199 cestujících. Podle oficiálního prohlášení ministerstva vnitra v Madridu je cílem těchto opatření zajistit bezpečnost a dodržování platných migračních předpisů v celé schengenské zóně.</p>
            <p class="doc-element">Situace vyvolala diplomatické napětí mezi oběma státy, přičemž zástupci italské vlády požadují okamžité vysvětlení a zmírnění zavedených restrikcí.</p>
          `
        },
        {
          id: 'aktualne-sample',
          title: 'Ekonomický zázrak skončil. Tygr je bez drápů, země se zmítá v politické krizi',
          sourceUrl: 'https://zpravy.aktualne.cz/zahranici/ekonomicky-zazrak-skoncil-tygr-je-bez-drapu-zeme-se-zmita-v-politicke-krizi/r~aaa29ca8be5072d5ae0766eb790bc5c6/',
          styleTokens: {
            brandColor: '#cc0000',
            lightBg: '#fef2f2',
            lightBorder: '#fecaca',
            secondaryColor: '#05171f',
            headingColor: '#05171f',
            h1Color: '#05171f',
            h2Color: '#05171f',
            h3Color: '#05171f',
            h4Color: '#05171f',
            pColor: '#05171f',
            bodyFont: 'Inter',
            headingFont: 'Barlow',
            sourceHost: 'zpravy.aktualne.cz'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#cc0000">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700&family=Inter:wght@400;500;600&display=swap">
            <style>
              :root {
                --tt-gray-light-a-900: #05171F;
                --bs-body-color: #05171F;
                --bs-body-font-family: "Inter", sans-serif;
              }
              .e-web-aktualne-articles-show__title { font-family: "Barlow", sans-serif; color: #05171F; font-size: 36px; }
              .e-web-aktualne-articles-show-body, .e-web-aktualne-articles-show-body>p { font-family: "Inter", sans-serif; color: #05171F; font-size: 17px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <h1 class="e-web-aktualne-articles-show__title">Ekonomický zázrak skončil. Tygr je bez drápů, země se zmítá v politické krizi</h1>
            <div class="e-web-aktualne-articles-show-body">
              <p class="doc-element lead-paragraph">Dlouhá léta obdivovaný hospodářský růst se zadrhl. Asijská ekonomika, která byla po dekády dávána za vzor dynamického rozvoje, čelí strukturálním problémům a hluboké politické nestabilitě.</p>
              <p class="doc-element">Podle analytiků Mezinárodního měnového fondu došlo k vyčerpání dosavadního modelu taženého exportem s nízkou přidanou hodnotou. Země nyní nutně potřebuje radikální reformy vzdělávání a digitalizace.</p>
              <p class="doc-element">Opozice mezitím svolává masové demonstrace do hlavního města a požaduje demisi stávajícího kabinetu i vypsání předčasných parlamentních voleb.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Ekonomický zázrak skončil. Tygr je bez drápů, země se zmítá v politické krizi</h1>
            <p class="doc-element lead-paragraph">Dlouhá léta obdivovaný hospodářský růst se zadrhl. Asijská ekonomika, která byla po dekády dávána za vzor dynamického rozvoje, čelí strukturálním problémům a hluboké politické nestabilitě.</p>
            <p class="doc-element">Podle analytiků Mezinárodního měnového fondu došlo k vyčerpání dosavadního modelu taženého exportem s nízkou přidanou hodnotou. Země nyní nutně potřebuje radikální reformy vzdělávání a digitalizace.</p>
            <p class="doc-element">Opozice mezitím svolává masové demonstrace do hlavního města a požaduje demisi stávajícího kabinetu i vypsání předčasných parlamentních voleb.</p>
          `
        },
        {
          id: 'jirkamucha-sample',
          title: 'KDYŽ MILUJEME VŠE, NEMILUJEME NIC - Jirka Mucha',
          sourceUrl: 'https://www.jirkamucha.cz/2026/08/06/kdyz-milujeme-vse-nemilujeme-nic/',
          styleTokens: {
            brandColor: '#ffd936',
            lightBg: '#fefce8',
            lightBorder: '#fef08a',
            secondaryColor: '#6a3a1a',
            headingColor: '#6a3a1a',
            h1Color: '#6a3a1a',
            h2Color: '#6a3a1a',
            h3Color: '#6a3a1a',
            h4Color: '#6a3a1a',
            pColor: '#404040',
            bodyFont: 'DM Sans',
            headingFont: 'Verdana',
            h4Font: 'Forum',
            sourceHost: 'www.jirkamucha.cz'
          },
          rawHtml: `<html><head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Forum&display=swap">
            <style>
              :root {
                --ast-global-color-0: #ffd936;
                --ast-global-color-1: #6a3a1a;
                --ast-global-color-2: #536942;
                --ast-global-color-3: #526840;
              }
              body, button, input { font-family: "DM Sans", sans-serif; }
              .page-title, .entry-title { color: #6a3a1a; }
              h1, .entry-content h1, h2, .entry-content h2, h3, .entry-content h3 { font-family: Verdana, Helvetica, Arial, sans-serif; color: #6a3a1a; }
              h4, .entry-content h4 { font-family: 'Forum', display; color: #6a3a1a; font-size: 32px; }
              .entry-content, .entry-content p { color: rgba(0, 0, 0, 0.75); font-family: "DM Sans", sans-serif; font-size: 18px; line-height: 1.8; }
            </style>
          </head>
          <body>
            <h1 class="entry-title">KDYŽ MILUJEME VŠE, NEMILUJEME NIC</h1>
            <div class="entry-content">
              <p class="doc-element lead-paragraph">Hluboké zamyšlení nad tím, jak rozptýlená pozornost a snaha vyhovět všem vede k vyprázdnění skutečných životních hodnot a priorit.</p>
              <h4 class="wp-block-heading">1. Hledání vlastní cesty v přehlceném světě</h4>
              <p class="doc-element">V moderní době jsme neustále zaplavováni možnostmi, nabídkami a podněty. Pokud si však nevybereme to podstatné, ztrácíme kontakt se sebou samými a s lidmi, na kterých nám doopravdy záleží.</p>
              <h4 class="wp-block-heading">2. Umění vědomého odmítnutí</h4>
              <p class="doc-element">Říci „ne“ nepodstatným věcem je základním předpokladem pro to, abychom mohli říci upřímné a plné „ano“ tomu, co má trvalý smysl.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">KDYŽ MILUJEME VŠE, NEMILUJEME NIC</h1>
            <p class="doc-element lead-paragraph">Hluboké zamyšlení nad tím, jak rozptýlená pozornost a snaha vyhovět všem vede k vyprázdnění skutečných životních hodnot a priorit.</p>
            <h4 class="doc-element doc-h4">1. Hledání vlastní cesty v přehlceném světě</h4>
            <p class="doc-element">V moderní době jsme neustále zaplavováni možnostmi, nabídkami a podněty. Pokud si však nevybereme to podstatné, ztrácíme kontakt se sebou samými a s lidmi, na kterých nám doopravdy záleží.</p>
            <h4 class="doc-element doc-h4">2. Umění vědomého odmítnutí</h4>
            <p class="doc-element">Říci „ne“ nepodstatným věcem je základním předpokladem pro to, abychom mohli říci upřímné a plné „ano“ tomu, co má trvalý smysl.</p>
          `
        },
        {
          id: 'sax-types-sample',
          title: 'Typy saxofonu – popis, tabulka a transpozice',
          sourceUrl: 'https://www.saxoskola.cz/vse-okolo-saxofonu/popis-saxofonu/typy-saxofonu/',
          styleTokens: {
            brandColor: '#2a4861',
            lightBg: '#f0f7ff',
            lightBorder: '#cbd5e1',
            secondaryColor: '#1e3a5f',
            headingColor: '#2a4861',
            h1Color: '#2a4861',
            h2Color: '#2a4861',
            h3Color: '#2a4861',
            pColor: '#334155',
            bodyFont: 'Barlow',
            headingFont: 'Barlow',
            sourceHost: 'www.saxoskola.cz'
          },
          htmlContent: `
            <h1 class="doc-element doc-h1">Typy saxofonu</h1>
            <p class="doc-element lead-paragraph">Saxovým záměrem bylo vytvoření celé rodiny saxofonů od sopraninového až po subkontrabasový. Dnes sice tyto nástroje existují, avšak běžnými se staly pouze sopránový (v ladění B), altový (in Es), tenorový (in B) a barytonový (in Es).</p>
            <p class="doc-element">Psaný rozsah pro všechny typy je od malého hes po f (fis)3. Fis3 je v závorce, neboť ne každý saxofon je s horní fis klapkou. Znějící rozsah je pak u sopránového saxofonu as – e (es)3, altového des – a (as)2, tenorového As – e (es)2 a barytonového saxofonu Des – a (as)1.</p>
          `
        },
        {
          id: 'physics-sample',
          title: 'Kvantová fyzika: Princip neurčitosti a vlnově-korpuskulární dualismus',
          sourceUrl: 'https://cs.wikipedia.org/wiki/Kvantov%C3%A1_mechanika',
          styleTokens: {
            brandColor: '#3366cc',
            lightBg: '#f8f9fa',
            lightBorder: '#a2a9b1',
            secondaryColor: '#202122',
            headingColor: '#000000',
            h1Color: '#000000',
            h2Color: '#000000',
            h3Color: '#000000',
            pColor: '#202122',
            bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Lato, Helvetica, Arial, sans-serif',
            headingFont: 'Linux Libertine',
            sourceHost: 'cs.wikipedia.org'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#3366cc">
            <style>
              .mw-parser-output h1 { font-family: "Linux Libertine", Georgia, serif; color: #000000; }
              .mw-parser-output p { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Lato, Helvetica, Arial, sans-serif; color: #202122; font-size: 14px; line-height: 1.6; }
            </style>
          </head><body>
            <div class="mw-parser-output">
              <h1>Kvantová fyzika: Princip neurčitosti a dualismus</h1>
              <p>Kvantová mechanika představuje fundamentální teorii moderní fyziky, která popisuje chování hmoty a záření na atomární a subatomární úrovni.</p>
              <p>Každý mikroskopický objekt vykazuje jak vlnové, tak částicové vlastnosti v závislosti na typu experimentu.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Kvantová fyzika: Princip neurčitosti a dualismus</h1>
            <p class="doc-element lead-paragraph">Kvantová mechanika představuje fundamentální teorii moderní fyziky, která popisuje chování hmoty a záření na atomární a subatomární úrovni.</p>
            <p class="doc-element">Každý mikroskopický objekt vykazuje jak vlnové, tak částicové vlastnosti v závislosti na typu experimentu.</p>
          `
        },
        {
          id: 'techcrunch-sample',
          title: 'Artificial Intelligence and the Next Era of Enterprise Computing',
          sourceUrl: 'https://techcrunch.com/2026/08/20/ai-enterprise-computing-future/',
          styleTokens: {
            brandColor: '#00d084',
            lightBg: '#f0fdf4',
            lightBorder: '#bbf7d0',
            secondaryColor: '#111111',
            headingColor: '#111111',
            h1Color: '#111111',
            h2Color: '#111111',
            h3Color: '#111111',
            h4Color: '#111111',
            pColor: '#222222',
            bodyFont: 'Roboto',
            headingFont: 'Source Serif 4',
            h4Font: 'Source Serif 4',
            sourceHost: 'techcrunch.com'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#00d084">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Roboto:wght@400;500&display=swap">
            <style>
              :root { --wp--preset--color--primary: #00d084; --wp--preset--color--contrast: #111111; }
              h1.article__title { font-family: "Source Serif 4", Georgia, serif; color: #111111; font-size: 38px; }
              .article-content p { font-family: "Roboto", sans-serif; color: #222222; font-size: 18px; line-height: 1.7; }
            </style>
          </head><body>
            <h1 class="article__title">Artificial Intelligence and the Next Era of Enterprise Computing</h1>
            <div class="article-content">
              <p class="doc-element lead-paragraph">Enterprise software is experiencing its most rapid transformation in decades as autonomous agents integrate directly into core infrastructure workflows.</p>
              <p class="doc-element">Founders and tech executives are rethinking operational foundations from data ingestion to user interaction layers.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Artificial Intelligence and the Next Era of Enterprise Computing</h1>
            <p class="doc-element lead-paragraph">Enterprise software is experiencing its most rapid transformation in decades as autonomous agents integrate directly into core infrastructure workflows.</p>
            <p class="doc-element">Founders and tech executives are rethinking operational foundations from data ingestion to user interaction layers.</p>
          `
        },
        {
          id: 'theverge-sample',
          title: 'The Future of Spatial Computing and Display Technologies',
          sourceUrl: 'https://www.theverge.com/2026/8/15/spatial-computing-next-generation',
          styleTokens: {
            brandColor: '#e0124b',
            lightBg: '#fff1f2',
            lightBorder: '#fecdd3',
            secondaryColor: '#121212',
            headingColor: '#121212',
            h1Color: '#121212',
            h2Color: '#121212',
            h3Color: '#121212',
            h4Color: '#121212',
            pColor: '#242424',
            bodyFont: 'Inter',
            headingFont: 'Manrope',
            h4Font: 'Manrope',
            sourceHost: 'www.theverge.com'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#e0124b">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500&display=swap">
            <style>
              h1.duet--article--headline { font-family: "Manrope", sans-serif; color: #121212; font-size: 40px; }
              .duet--article--body p { font-family: "Inter", sans-serif; color: #242424; font-size: 18px; line-height: 1.65; }
            </style>
          </head><body>
            <h1 class="duet--article--headline">The Future of Spatial Computing and Display Technologies</h1>
            <div class="duet--article--body">
              <p class="doc-element lead-paragraph">New optical waveguides and micro-OLED panels are pushing pixel density to boundaries previously thought impractical for consumer devices.</p>
              <p class="doc-element">As hardware becomes lighter and thermal dissipation improves, wearable displays are transitioning from niche novelties to everyday computing tools.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">The Future of Spatial Computing and Display Technologies</h1>
            <p class="doc-element lead-paragraph">New optical waveguides and micro-OLED panels are pushing pixel density to boundaries previously thought impractical for consumer devices.</p>
            <p class="doc-element">As hardware becomes lighter and thermal dissipation improves, wearable displays are transitioning from niche novelties to everyday computing tools.</p>
          `
        },
        {
          id: 'vercel-sample',
          title: 'Building Resilient Global Web Applications with Modern Edge Runtimes',
          sourceUrl: 'https://vercel.com/blog/resilient-edge-runtimes',
          styleTokens: {
            brandColor: '#000000',
            lightBg: '#fafafa',
            lightBorder: '#e5e5e5',
            secondaryColor: '#171717',
            headingColor: '#171717',
            h1Color: '#171717',
            h2Color: '#171717',
            h3Color: '#171717',
            h4Color: '#171717',
            pColor: '#333333',
            bodyFont: 'Inter',
            headingFont: 'Inter',
            h4Font: 'Inter',
            sourceHost: 'vercel.com'
          },
          rawHtml: `<html><head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
            <style>
              h1.font-extrabold { font-family: "Inter", -apple-system, sans-serif; color: #171717; font-size: 36px; font-weight: 800; }
              article p.text-gray-700 { font-family: "Inter", -apple-system, sans-serif; color: #333333; font-size: 17px; line-height: 1.7; }
            </style>
          </head><body>
            <article>
              <h1 class="font-extrabold text-[#171717]">Building Resilient Global Web Applications with Modern Edge Runtimes</h1>
              <p class="doc-element lead-paragraph text-gray-700">Deploying compute close to users eliminates geographic latency while drastically simplifying traditional cache invalidation challenges.</p>
              <p class="doc-element text-gray-700">With instant cold starts and regional failover primitives, modern cloud architectures ensure continuous availability under unpredictable traffic surges.</p>
            </article>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">Building Resilient Global Web Applications with Modern Edge Runtimes</h1>
            <p class="doc-element lead-paragraph">Deploying compute close to users eliminates geographic latency while drastically simplifying traditional cache invalidation challenges.</p>
            <p class="doc-element">With instant cold starts and regional failover primitives, modern cloud architectures ensure continuous availability under unpredictable traffic surges.</p>
          `
        },
        {
          id: 'substack-sample',
          title: 'The Architecture of Thought: Reflections on Writing and Focus',
          sourceUrl: 'https://writing.substack.com/p/architecture-of-thought',
          styleTokens: {
            brandColor: '#ff6719',
            lightBg: '#fff7ed',
            lightBorder: '#fed7aa',
            secondaryColor: '#111111',
            headingColor: '#111111',
            h1Color: '#111111',
            h2Color: '#111111',
            h3Color: '#111111',
            h4Color: '#111111',
            pColor: '#222222',
            bodyFont: 'Inter',
            headingFont: 'Lora',
            h4Font: 'Lora',
            sourceHost: 'substack.com'
          },
          rawHtml: `<html><head>
            <meta name="theme-color" content="#ff6719">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,400&family=Inter:wght@400;500&display=swap">
            <style>
              :root { --substack-accent: #ff6719; }
              h1.post-title { font-family: "Lora", Georgia, serif; color: #111111; font-size: 38px; }
              .body.markup p { font-family: "Inter", -apple-system, sans-serif; color: #222222; font-size: 18px; line-height: 1.8; }
            </style>
          </head><body>
            <h1 class="post-title">The Architecture of Thought: Reflections on Writing and Focus</h1>
            <div class="body markup">
              <p class="doc-element lead-paragraph">Deep writing requires creating an intentional boundary between the stream of incoming information and the slower rhythm of contemplative synthesis.</p>
              <p class="doc-element">When we protect our cognitive bandwidth, ideas connect across disciplines in ways that fast-paced browsing cannot replicate.</p>
            </div>
          </body></html>`,
          htmlContent: `
            <h1 class="doc-element doc-h1">The Architecture of Thought: Reflections on Writing and Focus</h1>
            <p class="doc-element lead-paragraph">Deep writing requires creating an intentional boundary between the stream of incoming information and the slower rhythm of contemplative synthesis.</p>
            <p class="doc-element">When we protect our cognitive bandwidth, ideas connect across disciplines in ways that fast-paced browsing cannot replicate.</p>
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

    addChapter(title, htmlContent, sourceUrl = '', metadata = {}, styleTokens = null) {
      const defaultTitle = window.I18N ? window.I18N.t('chapters.default_title') : 'New Chapter';
      const cleanTitle = (title || defaultTitle).replace(/^title:\s*/i, '').replace(/^nadpis:\s*/i, '').trim();
      const id = 'chap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const defaultBody = window.I18N ? window.I18N.t('chapters.default_content') : 'Content of the new chapter...';
      const rawContent = htmlContent || `<h1 class="doc-element doc-h1">${this._escapeHTML(cleanTitle)}</h1><p class="doc-element">${this._escapeHTML(defaultBody)}</p>`;
      const indexedContent = ChapterManager.ensureBlockIds(rawContent);

      const chapter = {
        id: id,
        title: cleanTitle,
        subtitle: metadata.subtitle || '',
        sourceUrl: sourceUrl || '',
        htmlContent: indexedContent,
        hasCover: metadata.hasCover || false,
        breakBefore: metadata.breakBefore !== undefined ? metadata.breakBefore : true,
        order: this.chapters.length + 1,
        styleTokens: styleTokens || metadata.styleTokens || {}
      };

      this.chapters.push(chapter);
      this.activeChapterId = id;
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
        hideLinks: false,
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

      if (this.config.hideLinks !== undefined) {
        document.body.setAttribute('data-hide-links', this.config.hideLinks ? 'true' : 'false');
        if (this.viewport) {
          this.viewport.querySelectorAll('.paper-sheet').forEach(s => {
            s.setAttribute('data-hide-links', this.config.hideLinks ? 'true' : 'false');
          });
        }
      }

      // Sync dynamic @page print rule so native browser print/PDF uses exact paper size and orientation
      let styleEl = document.getElementById('dynamic-page-print-rule');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-page-print-rule';
        document.head.appendChild(styleEl);
      }
      const orient = this.config.orientation === 'landscape' ? 'landscape' : 'portrait';
      let sizeToken = 'A4';
      if (this.config.format === 'a5') sizeToken = 'A5';
      else if (this.config.format === 'letter') sizeToken = 'letter';
      else if (this.config.format === 'b5') {
        sizeToken = orient === 'landscape' ? '250mm 176mm' : '176mm 250mm';
      }
      const pageSizeRule = this.config.format === 'b5' ? sizeToken : `${sizeToken} ${orient}`;
      styleEl.textContent = `@page { size: ${pageSizeRule}; margin: 0mm; }`;
    }

    _getContentHeight(sheetBody) {
      const children = sheetBody.children;
      if (!children || children.length === 0) return 0;
      let maxBottom = 0;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const style = window.getComputedStyle(child);
        const marginBottom = (i === children.length - 1) ? 0 : (parseFloat(style.marginBottom) || 0);
        const bottom = child.offsetTop + child.offsetHeight + marginBottom;
        if (bottom > maxBottom) {
          maxBottom = bottom;
        }
      }
      return maxBottom;
    }

    _checkSheetOverflow(sheetBody, availableHeightPx, isMultiColumn) {
      if (!sheetBody) return false;
      const children = sheetBody.children;
      if (!children || children.length === 0) return false;

      let maxH = availableHeightPx;
      if (sheetBody.clientHeight > 50 && sheetBody.clientHeight < maxH) {
        maxH = sheetBody.clientHeight;
      }

      if (isMultiColumn) {
        if (sheetBody.scrollWidth > sheetBody.clientWidth + 3) return true;
        if (sheetBody.scrollHeight > maxH + 2) return true;
        if (sheetBody.clientHeight > 0 && sheetBody.scrollHeight > sheetBody.clientHeight + 2) return true;
        const bodyRect = sheetBody.getBoundingClientRect();
        if (bodyRect.width > 0 && bodyRect.height > 0) {
          const last = children[children.length - 1];
          const lastRect = last.getBoundingClientRect();
          if (lastRect.right > bodyRect.right + 3) return true;
          if (lastRect.bottom > bodyRect.bottom + 2) return true;
        }
        return false;
      } else {
        // Single column layout
        // 1. Direct scrollHeight check
        if (sheetBody.scrollHeight > maxH + 1) return true;
        if (sheetBody.clientHeight > 0 && sheetBody.scrollHeight > sheetBody.clientHeight + 1) return true;

        // 2. Computed content bottom
        const contentH = this._getContentHeight(sheetBody);
        if (contentH > maxH - 1) return true;

        // 3. Collision with Footer element
        const lastChild = children[children.length - 1];
        const footer = sheetBody.parentElement?.querySelector('.sheet-footer');
        if (footer && lastChild) {
          const footerRect = footer.getBoundingClientRect();
          const lastRect = lastChild.getBoundingClientRect();
          if (footerRect.height > 0 && lastRect.height > 0) {
            if (lastRect.bottom > footerRect.top - 2) {
              return true;
            }
          }
        }

        // 4. Bounding box check against sheetBody bottom
        const bodyRect = sheetBody.getBoundingClientRect();
        if (bodyRect.height > 0 && lastChild) {
          const lastRect = lastChild.getBoundingClientRect();
          if (lastRect.bottom > bodyRect.bottom + 1) {
            return true;
          }
        }

        return false;
      }
    }

    paginate(rawHtml, activeChapter, chapterList = []) {
      this.zoomWrapper.innerHTML = '';
      this.sheets = [];

      if (!rawHtml || !rawHtml.trim()) {
        const emptyTitle = window.I18N ? window.I18N.t('empty_workspace.title') : 'No document loaded yet';
        const emptyDesc = window.I18N ? window.I18N.t('empty_workspace.desc') : 'Enter article URL or paste text for controlled layout and printing.';
        const emptyBtn = window.I18N ? window.I18N.t('empty_workspace.btn') : 'Import URL / Text';
        const emptyCard = document.createElement('div');
        emptyCard.className = 'empty-workspace-card';
        emptyCard.innerHTML = `
          <div class="empty-workspace-icon">🌐</div>
          <div class="empty-workspace-title">${emptyTitle}</div>
          <div class="empty-workspace-desc">${emptyDesc}</div>
          <button class="btn btn-primary" onclick="document.getElementById('modal-import').classList.add('open')">
            <span>${emptyBtn}</span>
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

      // Remove any stray <style>, <meta>, <link>, <title>, <script> tags that might have been stored in raw HTML
      sandbox.querySelectorAll('style, meta, link, title, script, head').forEach(el => el.remove());

      const wrappers = Array.from(sandbox.querySelectorAll('.doc-chapter-container, .doc-content, article, main, .mol-article-content, .entry-content'));
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

      // Automatically tag opening paragraph of each chapter for drop-caps and lead styling
      const seenChaptersForLead = new Set();
      Array.from(sandbox.children).forEach(el => {
        if (el.tagName === 'P' && !el.classList.contains('lead-paragraph') && el.textContent.trim().length > 20) {
          const chKey = el.getAttribute('data-chapter-id') || '__default__';
          if (!seenChaptersForLead.has(chKey)) {
            seenChaptersForLead.add(chKey);
            el.classList.add('first-chapter-p');
          }
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
          dummyTOC.classList.add('standalone-toc');
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
        } else if (this.config.tocPosition === 'standalone-page-end') {
          dummyTOC.classList.add('standalone-toc');
          dummyTOC.setAttribute('data-break-before', 'true');
          const breakBefore = document.createElement('div');
          breakBefore.className = 'doc-element doc-page-break';
          breakBefore.setAttribute('data-break-before', 'true');
          elements.push(breakBefore, dummyTOC);
        } else if (this.config.tocPosition === 'end-of-doc') {
          elements.push(dummyTOC);
        } else {
          // 'after-title'
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
      } else if (this.config.format === 'b5') {
        sheetWidthMm = this.config.orientation === 'portrait' ? 176 : 250;
        sheetHeightMm = this.config.orientation === 'portrait' ? 250 : 176;
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

      // Real header/footer footprint in mm: 7.5mm content height + 2.5mm margin
      const headerHeightMm = needHeader ? 10 : 0;
      const footerHeightMm = needFooter ? 10 : 0;
      // 2.0mm breathing margin above footer to guarantee zero overlap of descenders/margins into footer
      const safetyMarginMm = 2.0;
      const availableHeightMm = sheetHeightMm - (this.config.marginTop + this.config.marginBottom + headerHeightMm + footerHeightMm + safetyMarginMm);
      let availableHeightPx = Math.max(80, availableHeightMm * mmToPx);
      const isMultiCol = (this.config.columns || 1) > 1;

      const getRealBodyAvailableHeight = (sheet) => {
        if (!sheet) return availableHeightPx;
        const b = sheet.querySelector('.sheet-body');
        if (!b) return availableHeightPx;
        const inner = sheet.querySelector('.sheet-inner');
        if (inner && inner.clientHeight > 0) {
          const header = inner.querySelector('.sheet-header');
          const footer = inner.querySelector('.sheet-footer');
          const headerH = (header && header.offsetHeight > 0) ? (header.offsetHeight + parseFloat(window.getComputedStyle(header).marginBottom || 0)) : 0;
          const footerH = (footer && footer.offsetHeight > 0) ? (footer.offsetHeight + parseFloat(window.getComputedStyle(footer).marginTop || 0)) : 0;
          const innerStyle = window.getComputedStyle(inner);
          const innerPaddingTop = parseFloat(innerStyle.paddingTop || 0);
          const innerPaddingBottom = parseFloat(innerStyle.paddingBottom || 0);
          const computedAvailable = inner.clientHeight - innerPaddingTop - innerPaddingBottom - headerH - footerH - (safetyMarginMm * mmToPx);
          if (computedAvailable > 60) {
            return computedAvailable;
          }
        }
        if (b.clientHeight > 60) {
          return b.clientHeight - (safetyMarginMm * mmToPx);
        }
        return availableHeightPx;
      };

      const lockBodyHeight = (sheet) => {
        const b = sheet.querySelector('.sheet-body');
        if (!b) return;
        const realH = getRealBodyAvailableHeight(sheet);
        b.style.maxHeight = realH + 'px';
        if (isMultiCol) {
          b.style.height = realH + 'px';
          b.style.flex = `0 0 ${realH}px`;
        }
      };

      let pageCount = 1;
      let currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
      let currentSheetBody = currentSheet.querySelector('.sheet-body');
      this.zoomWrapper.appendChild(currentSheet);
      this.sheets.push(currentSheet);
      availableHeightPx = getRealBodyAvailableHeight(currentSheet);
      lockBodyHeight(currentSheet);

      const maxLoopIterations = Math.max(500, elements.length * 4);
      let iterationCount = 0;

      for (let i = 0; i < elements.length; i++) {
        iterationCount++;
        if (iterationCount > maxLoopIterations) {
          console.warn('Pagination loop exceeded safety iteration threshold.');
          break;
        }

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
          lockBodyHeight(currentSheet);
          if (el.classList.contains('doc-page-break')) continue;
        }

        currentSheetBody.appendChild(cloned);

        const exceeds = this._checkSheetOverflow(currentSheetBody, availableHeightPx, isMultiCol);

        // Heading orphan protection
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(cloned.tagName);
        let headingNearBottom = false;
        if (isHeading) {
          if (!isMultiCol) {
            headingNearBottom = this._getContentHeight(currentSheetBody) > (availableHeightPx - 50);
          } else {
            const bodyRect = currentSheetBody.getBoundingClientRect();
            const headingRect = cloned.getBoundingClientRect();
            if (bodyRect.width > 0 && bodyRect.height > 0) {
              const cols = this.config.columns || 2;
              const colWidth = bodyRect.width / cols;
              const inLastCol = headingRect.left >= bodyRect.left + colWidth * (cols - 1) - 10;
              headingNearBottom = inLastCol && (headingRect.bottom > bodyRect.bottom - 50);
            }
          }
        }

        if (exceeds || headingNearBottom) {
          const splitDepth = parseInt(el.getAttribute('data-split-depth') || '0', 10);

          // 1. List Item Splitting (<ul>, <ol>)
          if (exceeds && splitDepth < 4 && (cloned.tagName === 'UL' || cloned.tagName === 'OL')) {
            const continuationList = this._splitListAcrossPages(cloned, currentSheetBody, availableHeightPx, isMultiCol);
            if (continuationList) {
              continuationList.setAttribute('data-split-depth', (splitDepth + 1).toString());
              pageCount++;
              currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
              currentSheetBody = currentSheet.querySelector('.sheet-body');
              this.zoomWrapper.appendChild(currentSheet);
              this.sheets.push(currentSheet);
              lockBodyHeight(currentSheet);

              elements.splice(i + 1, 0, continuationList);
              continue;
            }
          }

          // 2. Paragraph Text Splitting
          if (exceeds && splitDepth < 4 && (cloned.tagName === 'P' || cloned.tagName === 'BLOCKQUOTE' || (cloned.tagName === 'DIV' && !cloned.classList.contains('doc-callout')))) {
            const continuationEl = this._splitParagraphAcrossPages(cloned, currentSheetBody, availableHeightPx, isMultiCol);
            if (continuationEl) {
              continuationEl.setAttribute('data-split-depth', (splitDepth + 1).toString());
              pageCount++;
              currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
              currentSheetBody = currentSheet.querySelector('.sheet-body');
              this.zoomWrapper.appendChild(currentSheet);
              this.sheets.push(currentSheet);
              lockBodyHeight(currentSheet);

              elements.splice(i + 1, 0, continuationEl);
              continue;
            }
          }

          if (currentSheetBody.children.length > 1) {
            cloned.remove();

            // Heading orphan protection: if removing cloned leaves a trailing heading alone at bottom, move it along
            let orphanedHeading = null;
            const prevChild = currentSheetBody.lastElementChild;
            if (prevChild && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(prevChild.tagName) && currentSheetBody.children.length > 1) {
              orphanedHeading = prevChild;
              orphanedHeading.remove();
            }

            pageCount++;
            currentSheet = this._createEmptySheet(pageCount, sheetWidthMm, sheetHeightMm, activeChapter, availableHeightPx, needHeader, needFooter);
            currentSheetBody = currentSheet.querySelector('.sheet-body');
            this.zoomWrapper.appendChild(currentSheet);
            this.sheets.push(currentSheet);
            lockBodyHeight(currentSheet);

            if (orphanedHeading) {
              currentSheetBody.appendChild(orphanedHeading);
            }
            currentSheetBody.appendChild(cloned);
          }
        }
      }

      document.body.removeChild(sandbox);
      this._updatePageHeadersAndFooters(pageCount, activeChapter);

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
      const originalHTML = pElement.innerHTML;
      const fullText = pElement.textContent.trim();
      const words = fullText.split(/\s+/);
      if (words.length < 12) return null;

      let low = 0;
      let high = words.length;
      let bestSplit = 0;
      let searchSteps = 0;

      while (low <= high && searchSteps < 15) {
        searchSteps++;
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
        pElement.innerHTML = originalHTML;
        return null;
      }

      pElement.textContent = words.slice(0, bestSplit).join(' ');
      const nextP = document.createElement(pElement.tagName.toLowerCase());
      nextP.className = pElement.className;
      nextP.classList.remove('first-chapter-p', 'lead-paragraph');
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
      sheet.setAttribute('data-hide-links', this.config.hideLinks ? 'true' : 'false');

      if (activeChapter) {
        sheet.setAttribute('data-chapter-id', activeChapter.id);
        const tok = activeChapter.styleTokens;
        if (tok) {
          if (tok.brandColor) sheet.style.setProperty('--web-extracted-primary', tok.brandColor);
          if (tok.paperBg) sheet.style.setProperty('--web-extracted-paper-bg', tok.paperBg);
          if (tok.lightBg) sheet.style.setProperty('--web-extracted-bg', tok.lightBg);
          if (tok.lightBorder) sheet.style.setProperty('--web-extracted-border', tok.lightBorder);
          if (tok.secondaryColor) sheet.style.setProperty('--web-extracted-secondary', tok.secondaryColor);
          if (tok.headingColor) sheet.style.setProperty('--web-extracted-heading', tok.headingColor);
          if (tok.h1Color) sheet.style.setProperty('--web-h1-color', tok.h1Color);
          if (tok.h2Color) sheet.style.setProperty('--web-h2-color', tok.h2Color);
          if (tok.h3Color) sheet.style.setProperty('--web-h3-color', tok.h3Color);
          if (tok.h4Color) sheet.style.setProperty('--web-h4-color', tok.h4Color);
          if (tok.h1Weight) sheet.style.setProperty('--web-h1-weight', tok.h1Weight);
          if (tok.h2Weight) sheet.style.setProperty('--web-h2-weight', tok.h2Weight);
          if (tok.pColor) sheet.style.setProperty('--web-p-color', tok.pColor);
          if (tok.bodyFont) {
            const fStack = tok.bodyFont.includes(',') ? tok.bodyFont : ContentExtractor._buildFontStack(tok.bodyFont);
            sheet.style.setProperty('--web-extracted-font', fStack);
          }
          if (tok.headingFont) {
            const hStack = tok.headingFont.includes(',') ? tok.headingFont : ContentExtractor._buildFontStack(tok.headingFont);
            sheet.style.setProperty('--web-extracted-heading-font', hStack);
          }
        }
      }

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
      if (availableHeightPx) {
        body.style.maxHeight = availableHeightPx + 'px';
        if ((this.config.columns || 1) > 1) {
          body.style.height = availableHeightPx + 'px';
          body.style.flex = `0 0 ${availableHeightPx}px`;
        }
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
        const chapterTitle = chapterContainer?.getAttribute('data-chapter-title') || activeChapter?.title || (window.I18N ? window.I18N.t('dialogs.untitled_doc') : 'Document');
        const chapterUrl = chapterContainer?.getAttribute('data-chapter-url') || activeChapter?.sourceUrl || '';

        let pageStr = `${pageNum}`;
        const isCs = window.I18N && window.I18N.currentLang === 'cs';
        if (this.config.pageNumFormat === 'prefix') pageStr = isCs ? `Strana ${pageNum} z ${totalPages}` : `Page ${pageNum} of ${totalPages}`;
        else if (this.config.pageNumFormat === 'short') pageStr = isCs ? `s. ${pageNum} / ${totalPages}` : `p. ${pageNum} / ${totalPages}`;
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
          } else if (pos === 'footer-left' && footerLeftEl) {
            footerLeftEl.innerHTML = pageSpan;
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
      const t = (k, def) => (window.I18N ? window.I18N.t(k) : def);
      this.panel.innerHTML = `
        <div class="inspector-header">
          <span>${t('inspector.header_empty', 'Block Properties')}</span>
        </div>
        <div class="inspector-body">
          <div style="text-align: center; padding: 40px 10px; color: var(--ui-text-muted);">
            <div style="font-size: 28px; margin-bottom: 8px;">👆</div>
            <div style="font-weight: 700; font-size: 13px; color: var(--ui-text-heading); margin-bottom: 4px;">${t('inspector.no_block_title', 'No block selected')}</div>
            <div style="font-size: 11px;">${t('inspector.no_block_desc', 'Click on any text, image or table on the page to display parameters.')}</div>
          </div>
        </div>
      `;
    }

    renderInspector(el) {
      const tag = el.tagName.toLowerCase();
      const isImg = tag === 'img' || tag === 'figure' || el.querySelector('img') !== null;
      const isText = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li', 'td', 'th', 'div'].includes(tag);

      const blockId = el.getAttribute('data-block-id') || '';
      this.currentInspectedId = blockId;

      const currentAlign = el.getAttribute('data-align') || el.style.textAlign || 'left';
      const hasBreakBefore = el.getAttribute('data-break-before') === 'true' || el.classList.contains('doc-page-break');

      let currentFontSize = parseInt(window.getComputedStyle(el).fontSize, 10) || 14;
      let currentScale = parseInt(el.getAttribute('data-scale') || '100', 10);

      const compStyle = window.getComputedStyle(el);
      const isBold = parseInt(compStyle.fontWeight, 10) >= 600 || compStyle.fontWeight === 'bold';
      const isItalic = compStyle.fontStyle === 'italic';
      const isUnderline = compStyle.textDecoration.includes('underline');

      const rgbToHex = (col) => {
        if (!col) return '#0f172a';
        if (col.startsWith('#')) return col;
        const rgb = col.match(/\d+/g);
        if (!rgb || rgb.length < 3) return '#0f172a';
        return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
      };

      const currentColorHex = rgbToHex(el.style.color || compStyle.color);

      const t = (k, p, def) => {
        if (typeof p === 'string' && def === undefined) {
          def = p;
          p = {};
        }
        return window.I18N ? window.I18N.t(k, p) : (def || k);
      };

      this.panel.innerHTML = `
        <div class="inspector-header">
          <span>${t('inspector.header_tag', { tag }, `Properties: &lt;${tag}&gt;`)}</span>
          <button id="btn-insp-close" class="chapter-btn-icon" title="${t('inspector.close_title', 'Close panel')}">&times;</button>
        </div>

        <div class="inspector-body">
          
          <div class="inspector-section-card">
            <div class="inspector-sec-title">${t('inspector.block_type', 'Text Block Type')}</div>
            <select id="insp-tag-select" class="control-select" ${!isText ? 'disabled' : ''}>
              <option value="h1" ${tag === 'h1' ? 'selected' : ''}>${t('inspector.tag_h1', 'H1 — Main Heading')}</option>
              <option value="h2" ${tag === 'h2' ? 'selected' : ''}>${t('inspector.tag_h2', 'H2 — Section Heading')}</option>
              <option value="h3" ${tag === 'h3' ? 'selected' : ''}>${t('inspector.tag_h3', 'H3 — Level 3 Subheading')}</option>
              <option value="h4" ${tag === 'h4' ? 'selected' : ''}>${t('inspector.tag_h4', 'H4 — Minor Subheading')}</option>
              <option value="p" ${tag === 'p' ? 'selected' : ''}>${t('inspector.tag_p', 'Paragraph')}</option>
              <option value="blockquote" ${tag === 'blockquote' ? 'selected' : ''}>${t('inspector.tag_blockquote', 'Blockquote (Quote)')}</option>
              <option value="pre" ${tag === 'pre' ? 'selected' : ''}>${t('inspector.tag_pre', 'Code / Monospace')}</option>
            </select>
          </div>

          <div class="inspector-section-card ${!isText ? 'inspector-control-disabled' : ''}">
            <div class="inspector-sec-title">${t('inspector.color_style', '🎨 Text Color & Style')}</div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <input type="color" id="insp-color-text" value="${currentColorHex}" style="width: 30px; height: 30px; padding: 0; border: none; border-radius: 4px; cursor: pointer;">
              <span id="insp-color-hex-label" style="font-size: 11px; font-family: monospace; color: var(--ui-text-muted);">${el.style.color ? el.style.color : t('inspector.color_original', '(Original from web)')}</span>
              <button class="btn btn-secondary" id="insp-btn-color-reset" style="font-size: 11px; margin-left: auto; padding: 4px 8px;">${t('inspector.color_reset', '↺ Reset')}</button>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary ${isBold ? 'active' : ''}" id="insp-btn-bold" style="flex: 1; font-weight: 700;">B</button>
              <button class="btn btn-secondary ${isItalic ? 'active' : ''}" id="insp-btn-italic" style="flex: 1; font-style: italic;">I</button>
              <button class="btn btn-secondary ${isUnderline ? 'active' : ''}" id="insp-btn-underline" style="flex: 1; text-decoration: underline;">U</button>
            </div>
          </div>

          <div class="inspector-section-card">
            <div class="inspector-sec-title">${t('inspector.alignment', 'Element Alignment')}</div>
            <div class="align-btn-group">
              <button class="align-btn ${currentAlign === 'left' ? 'active' : ''}" id="insp-align-left" title="${t('inspector.align_left', 'Align left')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'center' ? 'active' : ''}" id="insp-align-center" title="${t('inspector.align_center', 'Align center')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'right' ? 'active' : ''}" id="insp-align-right" title="${t('inspector.align_right', 'Align right')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
              </button>
              <button class="align-btn ${currentAlign === 'justify' ? 'active' : ''}" id="insp-align-justify" title="${t('inspector.align_justify', 'Justify text')}" ${!isText ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <div class="inspector-section-card ${!isText ? 'inspector-control-disabled' : ''}">
            <div class="inspector-sec-title">${t('inspector.font_size', 'Font Size (pt / px)')}</div>
            <div class="slider-num-pair">
              <input type="range" id="insp-range-fontsize" min="8" max="48" value="${currentFontSize}">
              <input type="number" id="insp-num-fontsize" min="8" max="48" value="${currentFontSize}">
            </div>
          </div>

          ${isImg ? `
          <div class="inspector-section-card" style="border-color: var(--pastel-blue-border); background: var(--pastel-blue-bg);">
            <div class="inspector-sec-title" style="color: var(--pastel-blue-text);">${t('inspector.img_adjust', '🖼️ Image Adjustments')}</div>
            
            <div class="control-group">
              <label class="control-sublabel">${t('inspector.img_size', 'Image Size (10% – 200%)')}</label>
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
              <button class="btn btn-secondary" id="insp-img-toggle-border" style="flex: 1; font-size: 11px;">${t('inspector.img_border', 'Border')}</button>
              <button class="btn btn-secondary" id="insp-img-toggle-shadow" style="flex: 1; font-size: 11px;">${t('inspector.img_shadow', 'Shadow')}</button>
            </div>
          </div>
          ` : ''}

          <div class="inspector-section-card">
            <label class="chk-label">
              <input type="checkbox" id="insp-toggle-break" ${hasBreakBefore ? 'checked' : ''}>
              <span>${t('inspector.break_before', 'Break page before this block')}</span>
            </label>
          </div>

          <div class="inspector-section-card">
            <div class="inspector-sec-title">${t('inspector.manipulation', 'Block Manipulation')}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button class="btn btn-secondary" id="insp-move-up">${t('inspector.move_up', '▲ Move Up')}</button>
              <button class="btn btn-secondary" id="insp-move-down">${t('inspector.move_down', '▼ Move Down')}</button>
              <button class="btn btn-secondary" id="insp-duplicate-btn">${t('inspector.duplicate', '📋 Duplicate')}</button>
              <button class="btn btn-secondary" id="insp-delete-btn" style="color: #dc2626;">${t('inspector.delete', '🗑️ Delete')}</button>
            </div>
          </div>

        </div>
      `;

      this._bindInspectorEvents(el, blockId);
    }

    _bindInspectorEvents(el, blockId) {
      document.getElementById('btn-insp-close')?.addEventListener('click', () => this.renderEmpty());

      // 0. Element Color & Typography Controls
      const colorInput = document.getElementById('insp-color-text');
      const colorLabel = document.getElementById('insp-color-hex-label');
      colorInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        if (colorLabel) colorLabel.textContent = val;
        if (this.selectedElement) this.selectedElement.style.color = val;
        this.onLiveUpdate((target) => { target.style.color = val; }, blockId);
      });
      colorInput?.addEventListener('change', (e) => {
        const val = e.target.value;
        this.onBlockModified((target) => { target.style.color = val; }, blockId);
      });

      document.getElementById('insp-btn-color-reset')?.addEventListener('click', () => {
        if (this.selectedElement) this.selectedElement.style.color = '';
        if (colorLabel) colorLabel.textContent = window.I18N ? window.I18N.t('inspector.color_default') : '(Default)';
        this.onBlockModified((target) => { target.style.color = ''; }, blockId);
      });

      document.getElementById('insp-btn-bold')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const willBeBold = !btn.classList.contains('active');
        btn.classList.toggle('active', willBeBold);
        this.onBlockModified((target) => {
          target.style.fontWeight = willBeBold ? 'bold' : 'normal';
        }, blockId);
      });

      document.getElementById('insp-btn-italic')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const willBeItalic = !btn.classList.contains('active');
        btn.classList.toggle('active', willBeItalic);
        this.onBlockModified((target) => {
          target.style.fontStyle = willBeItalic ? 'italic' : 'normal';
        }, blockId);
      });

      document.getElementById('insp-btn-underline')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const willBeUnderline = !btn.classList.contains('active');
        btn.classList.toggle('active', willBeUnderline);
        this.onBlockModified((target) => {
          target.style.textDecoration = willBeUnderline ? 'underline' : 'none';
        }, blockId);
      });

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
    static exportToDocx(htmlContent, title = 'Document', config = {}) {
      const defTitle = window.I18N ? window.I18N.t('dialogs.untitled_doc') : 'Document';
      const cleanTitle = (title || defTitle).replace(/[\\/:*?"<>|]/g, '_');
      const mTop = config.marginTop ?? 20;
      const mBottom = config.marginBottom ?? 20;
      const mLeft = config.marginLeft ?? 20;
      const mRight = config.marginRight ?? 20;

      const formatSizesPt = {
        a4: [595.3, 841.9],
        b5: [498.9, 708.7],
        a5: [419.5, 595.3],
        letter: [612.0, 792.0]
      };
      const basePt = formatSizesPt[config.format] || formatSizesPt.a4;
      const isLandscape = config.orientation === 'landscape';
      const pageW = isLandscape ? basePt[1] : basePt[0];
      const pageH = isLandscape ? basePt[0] : basePt[1];

      const computed = window.getComputedStyle(document.body);
      const primaryColor = (computed.getPropertyValue('--doc-primary') || '#0284c7').trim();
      const headingColor = (computed.getPropertyValue('--doc-headings') || '#0f172a').trim();
      const textColor = (computed.getPropertyValue('--doc-text') || '#1e293b').trim();
      const lightBg = (computed.getPropertyValue('--doc-primary-light') || '#f0f9ff').trim();
      const borderColor = (computed.getPropertyValue('--doc-primary-border') || '#cbd5e1').trim();

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
              size: ${pageW}pt ${pageH}pt;
              mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
              margin: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;
              mso-header-margin: 24pt;
              mso-footer-margin: 24pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.5; color: ${textColor}; }
            h1 { font-size: 22pt; font-weight: bold; color: ${headingColor}; margin-top: 18pt; margin-bottom: 6pt; page-break-after: avoid; }
            h2 { font-size: 16pt; font-weight: bold; color: ${primaryColor}; border-bottom: 1.5pt solid ${borderColor}; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 4pt; page-break-after: avoid; }
            h3 { font-size: 13pt; font-weight: bold; color: ${headingColor}; margin-top: 10pt; margin-bottom: 3pt; page-break-after: avoid; }
            p { margin-bottom: 6pt; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
            th { background-color: ${lightBg}; color: ${headingColor}; font-weight: bold; border: 1pt solid ${borderColor}; padding: 6pt; text-align: left; }
            td { border: 1pt solid ${borderColor}; padding: 6pt; vertical-align: middle; text-align: left; }
            img { max-width: 100%; height: auto; display: block; margin: 6pt auto; }
            blockquote { border-left: 3.5pt solid ${primaryColor}; background: ${lightBg}; padding: 6pt 10pt; font-style: italic; margin: 8pt 0; }
            .doc-callout { border-left: 4.5pt solid ${primaryColor}; background: ${lightBg}; padding: 8pt 10pt; margin: 8pt 0; }
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
     8.5. TEMPLATE MANAGER (Custom Templates, Import/Export & Persistence)
     ========================================================================== */
  class TemplateManager {
    static STORAGE_KEY = 'url_printer_custom_templates';

    static getCustomTemplates() {
      try {
        const raw = localStorage.getItem(TemplateManager.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    static saveCustomTemplate(template) {
      const list = TemplateManager.getCustomTemplates().filter(t => t.id !== template.id);
      list.push(template);
      localStorage.setItem(TemplateManager.STORAGE_KEY, JSON.stringify(list));
      return list;
    }

    static deleteCustomTemplate(id) {
      const list = TemplateManager.getCustomTemplates().filter(t => t.id !== id);
      localStorage.setItem(TemplateManager.STORAGE_KEY, JSON.stringify(list));
      return list;
    }

    static exportTemplatesJSON() {
      const templates = TemplateManager.getCustomTemplates();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "url-printer-templates.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    static importTemplatesJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) throw new Error("Neplatný formát šablon (očekáváno pole)");
        const existing = TemplateManager.getCustomTemplates();
        const existingIds = new Set(existing.map(t => t.id));
        parsed.forEach(item => {
          if (item && item.id && item.name) {
            if (existingIds.has(item.id)) {
              item.id = item.id + '_' + Date.now();
            }
            existing.push(item);
          }
        });
        localStorage.setItem(TemplateManager.STORAGE_KEY, JSON.stringify(existing));
        return existing;
      } catch (e) {
        throw new Error("Chyba při importu šablon: " + e.message);
      }
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
      this._initCustomTemplates();

      try {
        const savedHideLinks = localStorage.getItem('url_printer_hide_links');
        if (savedHideLinks !== null) {
          const hide = savedHideLinks === 'true';
          this.paginationEngine.config.hideLinks = hide;
          document.body.setAttribute('data-hide-links', hide ? 'true' : 'false');
        }
      } catch (e) {}

      this._syncUIFromConfig(this.paginationEngine.config);
      this._updateTemplateSpecCard(document.body.getAttribute('data-theme') || 'web-original');

      this.chapterManager.onChange((chapters, activeId) => {
        this._renderChapterTree(chapters, activeId);
        const activeChap = this.chapterManager.getActiveChapter();
        if (activeChap) {
          try {
            localStorage.setItem('urlprint_inspector_transfer', JSON.stringify({
              title: activeChap.title || '',
              sourceUrl: activeChap.sourceUrl || '',
              htmlContent: activeChap.htmlContent || '',
              styleTokens: activeChap.styleTokens || null,
              rawHtml: activeChap.rawHtml || activeChap.htmlContent || '',
              updatedAt: Date.now()
            }));
          } catch (e) {}
        }
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

      if (window.I18N) {
        window.I18N.onLanguageChange(() => {
          if (this.inspector) {
            if (this.inspector.selectedElement) {
              this.inspector.renderInspector(this.inspector.selectedElement);
            } else {
              this.inspector.renderEmpty();
            }
          }
          this._renderChapterTree(this.chapterManager.chapters, this.chapterManager.activeChapterId);
          const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
          this._updateTemplateSpecCard(activeTheme);
          const chkMirror = document.getElementById('chk-mirror-margins');
          const lblL = document.getElementById('lbl-margin-left');
          const lblR = document.getElementById('lbl-margin-right');
          if (chkMirror && lblL && lblR) {
            lblL.textContent = chkMirror.checked 
              ? window.I18N.t('layout.margin_inner') 
              : window.I18N.t('layout.margin_left');
            lblR.textContent = chkMirror.checked 
              ? window.I18N.t('layout.margin_outer') 
              : window.I18N.t('layout.margin_right');
          }
          this._syncWebStyleDropdowns();
          this.repaginate();
        });
      }

      this.repaginate();
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
        if (lblL) {
          lblL.textContent = chkMirror.checked 
            ? (window.I18N ? window.I18N.t('layout.margin_inner') : 'Inner Margin (Binding)') 
            : (window.I18N ? window.I18N.t('layout.margin_left') : 'Left Margin');
        }
        if (lblR) {
          lblR.textContent = chkMirror.checked 
            ? (window.I18N ? window.I18N.t('layout.margin_outer') : 'Outer Margin') 
            : (window.I18N ? window.I18N.t('layout.margin_right') : 'Right Margin');
        }
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

      // QR & Media Mode & Hyperlinks
      const chkHideLinks = document.getElementById('chk-hide-links');
      if (chkHideLinks && config.hideLinks !== undefined) chkHideLinks.checked = !!config.hideLinks;

      const chkHideLinksTab3 = document.getElementById('chk-hide-links-tab3');
      if (chkHideLinksTab3 && config.hideLinks !== undefined) chkHideLinksTab3.checked = !!config.hideLinks;

      if (config.hideLinks !== undefined) {
        document.body.setAttribute('data-hide-links', config.hideLinks ? 'true' : 'false');
      }

      const chkQR = document.getElementById('chk-enable-qr');
      if (chkQR && config.enableQRFootnotes !== undefined) chkQR.checked = !!config.enableQRFootnotes;

      const selMedia = document.getElementById('sel-media-mode');
      if (selMedia && config.mediaMode) {
        selMedia.value = config.mediaMode;
        document.body.setAttribute('data-media-mode', config.mediaMode);
      }

      // Themes & Typography
      if (config.theme) {
        document.body.setAttribute('data-theme', config.theme);
        const selTheme = document.getElementById('sel-preset-template');
        if (selTheme) selTheme.value = config.theme;
        this._syncMicrotypographyUI(config.theme, false);
      }
    }

    repaginate() {
      if (this._isRepaginating) return;
      this._isRepaginating = true;
      try {
        const activeChap = this.chapterManager.getActiveChapter();
        const rawHtml = activeChap ? this.chapterManager.compileFullDocument(this.paginationEngine.config) : '';
        
        const res = this.paginationEngine.paginate(rawHtml, activeChap, this.chapterManager.chapters);

        const countEl = document.getElementById('stat-sheet-count');
        if (countEl) {
          if (window.I18N && window.I18N.currentLang === 'cs') {
            countEl.textContent = `${res.sheetCount} ${res.sheetCount === 1 ? 'strana' : (res.sheetCount >= 2 && res.sheetCount <= 4 ? 'strany' : 'stran')}`;
          } else {
            countEl.textContent = `${res.sheetCount} ${res.sheetCount === 1 ? 'page' : 'pages'}`;
          }
        }

        const totalPagesEl = document.getElementById('stat-total-pages');
        if (totalPagesEl) totalPagesEl.textContent = `${res.sheetCount || 1}`;

        const jumpInput = document.getElementById('input-jump-page');
        if (jumpInput) jumpInput.max = res.sheetCount || 1;

        this._renderThumbnails(res.sheets);
        this._renderDrawerTOC();
      } finally {
        this._isRepaginating = false;
      }
    }

    _findChapterForBlock(targetBlockId, selectedElement) {
      if (selectedElement) {
        const chapId = selectedElement.getAttribute('data-chapter-id') || selectedElement.closest('[data-chapter-id]')?.getAttribute('data-chapter-id');
        if (chapId) {
          const found = this.chapterManager.chapters.find(c => c.id === chapId);
          if (found) return found;
        }
      }
      if (targetBlockId) {
        for (const chap of this.chapterManager.chapters) {
          if (chap.htmlContent && chap.htmlContent.includes(`data-block-id="${targetBlockId}"`)) {
            return chap;
          }
        }
      }
      return this.chapterManager.getActiveChapter();
    }

    _liveUpdateBlock(mutatorFn, targetBlockId) {
      const targetChap = this._findChapterForBlock(targetBlockId, this.inspector.selectedElement);
      if (!targetChap || !targetChap.htmlContent) return;

      targetChap.htmlContent = ChapterManager.ensureBlockIds(targetChap.htmlContent);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = targetChap.htmlContent;

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

      if (targetInMaster) {
        mutatorFn(targetInMaster, targetInMaster.parentElement || tempDiv);
        targetChap.htmlContent = tempDiv.innerHTML;
      }
    }

    _modifyBlock(mutatorFn, targetBlockId) {
      const targetChap = this._findChapterForBlock(targetBlockId, this.inspector.selectedElement);
      if (!targetChap || !targetChap.htmlContent) return;

      const viewport = document.getElementById('sheet-viewport');
      const savedScrollTop = viewport ? viewport.scrollTop : 0;

      targetChap.htmlContent = ChapterManager.ensureBlockIds(targetChap.htmlContent);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = targetChap.htmlContent;

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
        targetChap.htmlContent = tempDiv.innerHTML;
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
        const confirmMsg = window.I18N ? window.I18N.t('dialogs.confirm_new_project') : 'Create a new clean project? Unsaved changes will be discarded.';
        if (confirm(confirmMsg)) {
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

      document.getElementById('btn-open-inspector-top')?.addEventListener('click', () => {
        const activeChap = this.chapterManager.getActiveChapter();
        if (activeChap) {
          try {
            localStorage.setItem('urlprint_inspector_transfer', JSON.stringify({
              title: activeChap.title || '',
              sourceUrl: activeChap.sourceUrl || '',
              htmlContent: activeChap.htmlContent || '',
              styleTokens: activeChap.styleTokens || null,
              rawHtml: activeChap.rawHtml || activeChap.htmlContent || '',
              updatedAt: Date.now()
            }));
          } catch (e) {
            console.warn('Nelze uložit data pro inspektor:', e);
          }
        }
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

      const fitToWindow = () => {
        const viewport = document.getElementById('sheet-viewport');
        const firstSheet = document.querySelector('.paper-sheet');
        if (!viewport || !firstSheet) return;

        const isSpread = viewport.classList.contains('spread-mode');
        const availWidth = viewport.clientWidth - 40;
        const availHeight = viewport.clientHeight - 40;
        if (availWidth <= 0 || availHeight <= 0) return;

        const sheetWidth = firstSheet.offsetWidth || 794;
        const sheetHeight = firstSheet.offsetHeight || 1123;
        const totalWidth = isSpread ? (sheetWidth * 2 + 30) : sheetWidth;

        const scaleX = availWidth / totalWidth;
        const scaleY = availHeight / sheetHeight;
        const bestScale = Math.min(scaleX, scaleY);
        const calculatedZoom = Math.max(25, Math.min(300, Math.floor(bestScale * 100)));
        applyZoom(calculatedZoom);
      };

      document.getElementById('btn-zoom-out')?.addEventListener('click', () => applyZoom(this.currentZoom - 10));
      document.getElementById('btn-zoom-in')?.addEventListener('click', () => applyZoom(this.currentZoom + 10));
      document.getElementById('btn-zoom-fit')?.addEventListener('click', fitToWindow);
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
        const defDocTitle = window.I18N ? window.I18N.t('dialogs.untitled_doc') : 'Document';
        WordExporter.exportToDocx(html, activeChap ? activeChap.title : defDocTitle, this.paginationEngine.config);
        this._showToast(window.I18N ? window.I18N.t('toasts.docx_success') : 'Document was successfully exported to Word');
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
        if (lblL) {
          lblL.textContent = e.target.checked 
            ? (window.I18N ? window.I18N.t('layout.margin_inner') : 'Inner Margin (Binding)') 
            : (window.I18N ? window.I18N.t('layout.margin_left') : 'Left Margin');
        }
        if (lblR) {
          lblR.textContent = e.target.checked 
            ? (window.I18N ? window.I18N.t('layout.margin_outer') : 'Outer Margin') 
            : (window.I18N ? window.I18N.t('layout.margin_right') : 'Right Margin');
        }
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

      // Hyperlinks & QR Mode Controls
      const onHideLinksToggle = (checked) => {
        const c1 = document.getElementById('chk-hide-links');
        const c2 = document.getElementById('chk-hide-links-tab3');
        if (c1 && c1.checked !== checked) c1.checked = checked;
        if (c2 && c2.checked !== checked) c2.checked = checked;
        try {
          localStorage.setItem('url_printer_hide_links', checked ? 'true' : 'false');
        } catch (err) {}
        this.paginationEngine.updateConfig({ hideLinks: checked });
      };

      document.getElementById('chk-hide-links')?.addEventListener('change', (e) => {
        onHideLinksToggle(e.target.checked);
      });

      document.getElementById('chk-hide-links-tab3')?.addEventListener('change', (e) => {
        onHideLinksToggle(e.target.checked);
      });

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

      // Themes & Typography Controls
      const presetFontMap = {
        'vintage-broadsheet': ['Playfair Display', 'EB Garamond', 'Barlow Condensed'],
        'gazette-1920': ['Cinzel', 'Libre Baskerville', 'Cormorant Garamond'],
        'yellowed-press': ['Barlow Condensed', 'Newsreader', 'IBM Plex Mono'],
        'magazine-editorial': ['Playfair Display', 'Newsreader', 'Plus Jakarta Sans'],
        'magazine-fashion': ['Cormorant Garamond', 'Plus Jakarta Sans'],
        'magazine-tech': ['Space Grotesk', 'Inter', 'IBM Plex Mono'],
        'kids-comic': ['Fredoka', 'Nunito'],
        'kids-adventure': ['Fredoka', 'Nunito'],
        'kids-explorer': ['Fredoka', 'Plus Jakarta Sans'],
        'antique-manuscript': ['Cinzel', 'Cormorant Garamond'],
        'antique-victorian': ['Playfair Display', 'EB Garamond'],
        'antique-press': ['Libre Baskerville', 'EB Garamond'],
        'kids-storybook': ['Fredoka', 'Nunito'],
        'kids-easy-reader': ['Nunito', 'Plus Jakarta Sans'],
        'kids-fairytale': ['Cormorant Garamond', 'Nunito'],
        'book-modern-novel': ['Cormorant Garamond', 'Newsreader'],
        'book-nordic-minimal': ['Space Grotesk', 'Plus Jakarta Sans'],
        'book-paperback': ['Libre Baskerville', 'Lora'],
        'design-swiss-grid': ['Barlow Condensed', 'Inter', 'IBM Plex Mono'],
        'design-brutalist-tech': ['Space Grotesk', 'IBM Plex Mono'],
        'design-studio-annual': ['Space Grotesk', 'Plus Jakarta Sans'],
        'minimal-bauhaus': ['Space Grotesk', 'Inter'],
        'minimal-zen': ['Cormorant Garamond', 'Newsreader'],
        'minimal-grid': ['IBM Plex Mono', 'Inter'],
        'blog-ghost-clean': ['Newsreader', 'Plus Jakarta Sans'],
        'blog-dev-digest': ['Space Grotesk', 'Inter', 'IBM Plex Mono'],
        'blog-substack-editorial': ['Playfair Display', 'Lora'],
        'textbook-stem-script': ['Space Grotesk', 'Inter', 'IBM Plex Mono'],
        'textbook-university': ['Libre Baskerville', 'Merriweather'],
        'textbook-medical': ['Barlow Condensed', 'Plus Jakarta Sans'],
        'fun-textbook-science': ['Fredoka', 'Plus Jakarta Sans'],
        'fun-textbook-companion': ['Space Grotesk', 'Nunito'],
        'fun-textbook-workbook': ['Outfit', 'Plus Jakarta Sans'],
        'bulletin-executive-brief': ['Barlow Condensed', 'Inter'],
        'bulletin-market-dispatch': ['Playfair Display', 'Newsreader', 'IBM Plex Mono'],
        'bulletin-company-digest': ['Space Grotesk', 'Plus Jakarta Sans'],
        'toner-saver': ['Inter', 'IBM Plex Mono'],
        'modern-edu': ['Outfit', 'Plus Jakarta Sans'],
        'academic': ['Libre Baskerville', 'EB Garamond'],
        'stem-tech': ['Space Grotesk', 'Inter', 'IBM Plex Mono'],
        'warm-notebook': ['Outfit', 'Nunito'],
        'corporate-navy': ['Barlow Condensed', 'Plus Jakarta Sans'],
      };

      document.getElementById('sel-preset-template')?.addEventListener('change', (e) => {
        const val = e.target.value;
        const delBtn = document.getElementById('btn-delete-custom-template');
        if (delBtn) delBtn.style.display = val.startsWith('custom-') ? 'block' : 'none';

        if (presetFontMap[val]) {
          presetFontMap[val].forEach(f => ContentExtractor._ensureGoogleFontLoaded(f));
        }

        const shouldApplyLayout = document.getElementById('chk-template-apply-layout')?.checked ?? true;

        if (val.startsWith('web-chap-')) {
          const chapId = val.replace('web-chap-', '');
          const targetChap = this.chapterManager.chapters.find(c => c.id === chapId);
          if (targetChap && targetChap.styleTokens) {
            this._applyStyleTokens(targetChap.styleTokens);
          }
          this._syncMicrotypographyUI('web-original', shouldApplyLayout);
        } else if (val === 'web-original') {
          const activeChap = this.chapterManager.getActiveChapter();
          if (activeChap && activeChap.styleTokens) {
            this._applyStyleTokens(activeChap.styleTokens);
          } else {
            document.body.setAttribute('data-theme', 'web-original');
          }
          this._syncMicrotypographyUI('web-original', shouldApplyLayout);
        } else if (val.startsWith('custom-')) {
          document.body.removeAttribute('data-font');
          this._applyCustomTemplate(val, shouldApplyLayout);
        } else {
          this._clearInlineStyleOverrides();
          document.body.removeAttribute('data-font');
          document.body.setAttribute('data-theme', val);
          this._syncMicrotypographyUI(val, shouldApplyLayout);
        }
        this.repaginate();
      });

      document.getElementById('btn-reapply-template-layout')?.addEventListener('click', () => {
        const sel = document.getElementById('sel-preset-template');
        const val = sel?.value || document.body.getAttribute('data-theme') || 'web-original';
        if (val.startsWith('custom-')) {
          this._applyCustomTemplate(val, true);
        } else {
          const themeKey = val.startsWith('web-chap-') ? 'web-original' : val;
          this._syncMicrotypographyUI(themeKey, true);
        }
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.layout_applied') : 'Page layout, size and margins applied');
      });

      // Custom Template Actions
      document.getElementById('btn-save-custom-template')?.addEventListener('click', () => {
        this._saveCurrentStyleAsTemplate();
      });

      document.getElementById('btn-save-web-as-template')?.addEventListener('click', () => {
        this._saveWebStyleAsTemplate();
      });

      document.getElementById('btn-export-template')?.addEventListener('click', () => {
        TemplateManager.exportTemplatesJSON();
      });

      document.getElementById('btn-import-template-trigger')?.addEventListener('click', () => {
        document.getElementById('input-import-template')?.click();
      });

      document.getElementById('input-import-template')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            TemplateManager.importTemplatesJSON(evt.target.result);
            this._initCustomTemplates();
            this._showToast(window.I18N ? window.I18N.t('toasts.templates_imported') : 'Custom templates imported successfully');
          } catch (err) {
            alert(err.message);
          }
        };
        reader.readAsText(file);
      });

      document.getElementById('btn-delete-custom-template')?.addEventListener('click', () => {
        this._deleteCurrentCustomTemplate();
      });

      // 1. Font Size Base Slider & Reset
      const rSize = document.getElementById('range-font-size-base');
      const bSize = document.getElementById('badge-font-size-base');
      rSize?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (bSize) bSize.textContent = val + ' pt';
        document.documentElement.style.setProperty('--doc-font-size-base', val + 'pt');
        this.repaginate();
      });
      document.getElementById('btn-reset-font-size')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-font-size-base');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rSize) rSize.value = def.fontSize;
        if (bSize) bSize.textContent = def.fontSize + ' pt';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.font_size_reset') : 'Font size reset to default');
      });

      // 2. Line Height Slider & Reset
      const rLine = document.getElementById('range-line-height');
      const bLine = document.getElementById('badge-line-height');
      rLine?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        if (bLine) bLine.textContent = val;
        document.documentElement.style.setProperty('--doc-line-height', val);
        this.repaginate();
      });
      document.getElementById('btn-reset-line-height')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-line-height');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rLine) rLine.value = def.lineHeight;
        if (bLine) bLine.textContent = def.lineHeight.toFixed(2);
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.line_height_reset') : 'Line height reset to default');
      });

      // 3. Letter Spacing Slider & Reset
      const rSpace = document.getElementById('range-letter-spacing');
      const bSpace = document.getElementById('badge-letter-spacing');
      rSpace?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        if (bSpace) bSpace.textContent = (val >= 0 ? '+' : '') + val + ' px';
        document.documentElement.style.setProperty('--doc-letter-spacing', val + 'px');
        this.repaginate();
      });
      document.getElementById('btn-reset-letter-spacing')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-letter-spacing');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rSpace) rSpace.value = def.letterSpacing;
        if (bSpace) bSpace.textContent = (def.letterSpacing >= 0 ? '+' : '') + def.letterSpacing.toFixed(1) + ' px';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.letter_spacing_reset') : 'Letter spacing reset to default');
      });

      // 4. Heading Scale Slider & Reset
      const rScale = document.getElementById('range-heading-scale');
      const bScale = document.getElementById('badge-heading-scale');
      rScale?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        if (bScale) bScale.textContent = val + '×';
        document.documentElement.style.setProperty('--doc-heading-scale', val);
        this.repaginate();
      });
      document.getElementById('btn-reset-heading-scale')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-heading-scale');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rScale) rScale.value = def.headingScale;
        if (bScale) bScale.textContent = def.headingScale.toFixed(2) + '×';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.heading_scale_reset') : 'Heading scale reset to default');
      });

      // 5. Heading Margin Top Slider & Reset
      const rTop = document.getElementById('range-heading-margin-top');
      const bTop = document.getElementById('badge-heading-margin-top');
      rTop?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(1);
        if (bTop) bTop.textContent = val + ' em';
        document.documentElement.style.setProperty('--doc-heading-margin-top', val + 'em');
        this.repaginate();
      });
      document.getElementById('btn-reset-heading-margin-top')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-heading-margin-top');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rTop) rTop.value = def.marginTop;
        if (bTop) bTop.textContent = def.marginTop.toFixed(1) + ' em';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.heading_top_reset') : 'Heading top margin reset to default');
      });

      // 6. Heading Margin Bottom Slider & Reset
      const rBot = document.getElementById('range-heading-margin-bottom');
      const bBot = document.getElementById('badge-heading-margin-bottom');
      rBot?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        if (bBot) bBot.textContent = val + ' em';
        document.documentElement.style.setProperty('--doc-heading-margin-bottom', val + 'em');
        this.repaginate();
      });
      document.getElementById('btn-reset-heading-margin-bottom')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-heading-margin-bottom');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rBot) rBot.value = def.marginBot;
        if (bBot) bBot.textContent = def.marginBot.toFixed(2) + ' em';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.heading_bot_reset') : 'Heading bottom margin reset to default');
      });

      // 7. Paragraph Margin Slider & Reset
      const rP = document.getElementById('range-paragraph-margin');
      const bP = document.getElementById('badge-paragraph-margin');
      rP?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        if (bP) bP.textContent = val + ' em';
        document.documentElement.style.setProperty('--doc-paragraph-margin-bottom', val + 'em');
        this.repaginate();
      });
      document.getElementById('btn-reset-paragraph-margin')?.addEventListener('click', () => {
        document.documentElement.style.removeProperty('--doc-paragraph-margin-bottom');
        const activeTheme = document.body.getAttribute('data-theme') || 'web-original';
        const def = this._getThemeMicroDefaults(activeTheme);
        if (rP) rP.value = def.pMargin;
        if (bP) bP.textContent = def.pMargin.toFixed(2) + ' em';
        this.repaginate();
        this._showToast(window.I18N ? window.I18N.t('toasts.p_margin_reset') : 'Paragraph spacing reset to default');
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
        this._showToast(window.I18N ? window.I18N.t('toasts.separator_inserted') : 'Separator was inserted');
      });

      document.getElementById('insert-note-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const box = document.createElement('div');
          box.className = 'doc-callout doc-callout-task doc-element';
          box.setAttribute('data-block-type', 'callout');
          box.setAttribute('data-block-id', 'blk_' + Date.now());
          const isCs = window.I18N && window.I18N.currentLang === 'cs';
          const headerText = isCs ? '✏️ Úkol / Otázka k zamyšlení' : '✏️ Note / Discussion Prompt';
          const bodyText = isCs ? 'Zde napište zadání úlohy nebo poznámku k tématu...' : 'Write your task description or note on the topic here...';
          box.innerHTML = `
            <div class="doc-callout-header">${headerText}</div>
            <p>${bodyText}</p>
          `;
          parent.insertBefore(box, target.nextSibling);
        });
        this._showToast(window.I18N ? window.I18N.t('toasts.note_inserted') : 'Note box was inserted');
      });

      document.getElementById('insert-lines-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const lines = document.createElement('div');
          lines.className = 'doc-notes-area doc-element';
          lines.setAttribute('data-block-type', 'notes');
          lines.setAttribute('data-block-id', 'blk_' + Date.now());
          const isCs = window.I18N && window.I18N.currentLang === 'cs';
          const titleText = isCs ? 'Místo pro vlastní poznámky' : 'Notes Area';
          lines.innerHTML = `
            <div class="doc-notes-title"><span>${titleText}</span></div>
            <div class="doc-notes-lines"></div>
          `;
          parent.insertBefore(lines, target.nextSibling);
        });
        this._showToast(window.I18N ? window.I18N.t('toasts.lines_inserted') : 'Lined area was inserted');
      });

      document.getElementById('insert-dots-tile')?.addEventListener('click', () => {
        this._modifyBlock((target, parent) => {
          const dots = document.createElement('div');
          dots.className = 'doc-notes-area doc-element';
          dots.setAttribute('data-block-type', 'notes');
          dots.setAttribute('data-block-id', 'blk_' + Date.now());
          const isCs = window.I18N && window.I18N.currentLang === 'cs';
          const titleText = isCs ? 'Místo pro náčrtky a schémata (5 mm)' : 'Sketch & Diagram Grid (5 mm)';
          dots.innerHTML = `
            <div class="doc-notes-title"><span>${titleText}</span></div>
            <div class="doc-notes-dots"></div>
          `;
          parent.insertBefore(dots, target.nextSibling);
        });
        this._showToast(window.I18N ? window.I18N.t('toasts.dots_inserted') : 'Dotted grid was inserted');
      });
    }

    _applyStyleTokens(tokens) {
      if (!tokens) return;

      const setVar = (prop, val) => {
        if (!val) return;
        document.documentElement.style.setProperty(prop, val);
        document.body.style.setProperty(prop, val);
      };

      const brandColor = tokens.brandColor || '#0284c7';
      const headingColor = tokens.headingColor || brandColor;
      const h1Color = tokens.h1Color || headingColor || brandColor;
      const h2Color = tokens.h2Color || headingColor || brandColor;
      const h3Color = tokens.h3Color || headingColor || brandColor;
      const pColor = tokens.pColor || '#334155';

      setVar('--doc-primary', brandColor);
      setVar('--web-extracted-primary', brandColor);

      const brandInput = document.getElementById('input-brand-color');
      if (brandInput) brandInput.value = brandColor;

      if (tokens.paperBg) {
        setVar('--doc-paper-bg', tokens.paperBg);
        setVar('--web-extracted-paper-bg', tokens.paperBg);
      } else {
        setVar('--doc-paper-bg', '#ffffff');
        setVar('--web-extracted-paper-bg', '#ffffff');
      }
      if (tokens.lightBg) {
        setVar('--doc-primary-light', tokens.lightBg);
        setVar('--web-extracted-bg', tokens.lightBg);
      }
      if (tokens.lightBorder) {
        setVar('--doc-primary-border', tokens.lightBorder);
        setVar('--web-extracted-border', tokens.lightBorder);
      }
      if (tokens.secondaryColor) {
        setVar('--doc-secondary', tokens.secondaryColor);
        setVar('--web-extracted-secondary', tokens.secondaryColor);
      }
      
      setVar('--doc-headings', headingColor);
      setVar('--web-extracted-heading', headingColor);
      setVar('--web-h1-color', h1Color);
      setVar('--web-h2-color', h2Color);
      setVar('--web-h3-color', h3Color);
      const h4Color = tokens.h4Color || tokens.h1Color || headingColor || brandColor;
      setVar('--web-h4-color', h4Color);
      setVar('--web-h1-weight', tokens.h1Weight || '700');
      setVar('--web-h2-weight', tokens.h2Weight || '700');
      setVar('--web-p-color', pColor);

      const fontStack = tokens.bodyFont?.includes(',') 
        ? tokens.bodyFont 
        : ContentExtractor._buildFontStack(tokens.bodyFont);
      const headStack = tokens.headingFont?.includes(',') 
        ? tokens.headingFont 
        : ContentExtractor._buildFontStack(tokens.headingFont || tokens.bodyFont);
      const h4Stack = tokens.h4Font?.includes(',') 
        ? tokens.h4Font 
        : (tokens.h4Font ? ContentExtractor._buildFontStack(tokens.h4Font) : headStack);

      setVar('--web-extracted-font', fontStack);
      setVar('--doc-font-family', fontStack);
      setVar('--web-extracted-heading-font', headStack);
      setVar('--doc-font-heading', headStack);
      setVar('--web-extracted-h4-font', h4Stack);
      setVar('--doc-font-h4', h4Stack);

      const primaryBodyName = tokens.bodyFont ? tokens.bodyFont.split(',')[0].replace(/['"]/g, '').trim() : '';
      const primaryHeadName = tokens.headingFont ? tokens.headingFont.split(',')[0].replace(/['"]/g, '').trim() : '';
      if (primaryBodyName) ContentExtractor._ensureGoogleFontLoaded(primaryBodyName);
      if (primaryHeadName && primaryHeadName !== primaryBodyName) ContentExtractor._ensureGoogleFontLoaded(primaryHeadName);

      document.body.setAttribute('data-theme', 'web-original');
      document.body.setAttribute('data-font', 'web-original');
      document.body.setAttribute('data-web-dropcap', tokens.hasDropCap ? 'true' : 'false');

      const themeSelect = document.getElementById('sel-preset-template');
      if (themeSelect && !themeSelect.value.startsWith('web-chap-')) {
        themeSelect.value = 'web-original';
      }

      const fontSelect = document.getElementById('sel-font-family');
      if (fontSelect) fontSelect.value = 'web-original';
    }

    _initCustomTemplates() {
      const group = document.getElementById('optgroup-custom-templates');
      if (!group) return;
      group.innerHTML = '';
      const list = TemplateManager.getCustomTemplates();
      list.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `⭐ ${t.name}`;
        group.appendChild(opt);
      });
    }

    _applyCustomTemplate(templateId, applyLayout = true) {
      const template = TemplateManager.getCustomTemplates().find(t => t.id === templateId);
      if (!template || !template.cssVars) return;
      document.body.setAttribute('data-theme', templateId);
      Object.entries(template.cssVars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
        document.body.style.setProperty(k, v);
      });
      if (template.fonts) {
        template.fonts.forEach(f => ContentExtractor._ensureGoogleFontLoaded(f));
      }
      if (applyLayout && template.layout) {
        this.paginationEngine.updateConfig(template.layout);
        this._syncUIFromConfig(this.paginationEngine.config);
      }
      this._updateTemplateSpecCard(templateId, {
        name: `⭐ ${template.name}`,
        format: template.layout?.format || this.paginationEngine.config.format || 'a4',
        orientation: template.layout?.orientation || this.paginationEngine.config.orientation || 'portrait',
        columns: template.layout?.columns || this.paginationEngine.config.columns || 1,
        mTop: template.layout?.marginTop ?? 20,
        mBot: template.layout?.marginBottom ?? 20,
        mLeft: template.layout?.marginLeft ?? 20,
        mRight: template.layout?.marginRight ?? 20,
        mirrorMargins: !!template.layout?.mirrorMargins,
        fontSize: parseFloat(template.cssVars['--doc-font-size-base']) || 11,
        desc: 'Vlastní uložená uživatelská šablona včetně typografie a rozvržení strany.',
        colors: [
          template.cssVars['--doc-paper-bg'] || '#ffffff',
          template.cssVars['--doc-primary'] || '#0284c7',
          template.cssVars['--doc-headings'] || '#0f172a'
        ]
      });
    }

    _clearInlineStyleOverrides() {
      const varsToClear = [
        '--doc-primary', '--doc-primary-light', '--doc-primary-border',
        '--doc-secondary', '--doc-accent', '--doc-headings', '--doc-text',
        '--doc-text-muted', '--doc-bg', '--doc-paper-bg', '--doc-callout-bg',
        '--doc-border', '--doc-line-color', '--doc-font-family', '--doc-font-heading',
        '--doc-font-h4', '--doc-font-mono', '--doc-heading-scale', '--doc-letter-spacing',
        '--doc-line-height', '--doc-font-size-base', '--doc-heading-margin-top',
        '--doc-heading-margin-bottom', '--doc-paragraph-margin-bottom',
        '--web-extracted-primary', '--web-extracted-paper-bg', '--web-extracted-heading', '--web-extracted-font',
        '--web-extracted-heading-font', '--web-extracted-bg', '--web-extracted-border',
        '--web-extracted-secondary', '--web-extracted-text', '--web-h1-color',
        '--web-h2-color', '--web-h3-color', '--web-h4-color', '--web-h1-weight', '--web-h2-weight', '--web-p-color'
      ];
      varsToClear.forEach(v => {
        document.documentElement.style.removeProperty(v);
        document.body.style.removeProperty(v);
      });
    }

    _getThemeMicroDefaults(themeName) {
      const map = {
        'web-original': {
          name: '🌐 Původní styl z webu',
          desc: 'Zachovává extrahovanou barevnou paletu a typografii původního článku na standardním listu A4.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 20, mBot: 20, mLeft: 20, mRight: 20, mirrorMargins: false, ebookMode: false,
          fontSize: 11, lineHeight: 1.55, letterSpacing: 0, headingScale: 1.25, marginTop: 1.2, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'none', imgShadow: 'soft', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#0284c7', '#0f172a']
        },

        // 1. STARÉ NOVINY (3 šablony)
        'vintage-broadsheet': {
          name: '🗞️ Dobový deník (Broadsheet 1900)',
          desc: 'Hustá třísloupcová novinová sazba na A4 s úzkými 10mm okraji, dvojitými linkami, iniciálou a ostře oříznutými fotografiemi.',
          format: 'a4', orientation: 'portrait', columns: 3,
          mTop: 10, mBot: 10, mLeft: 10, mRight: 10, mirrorMargins: false, ebookMode: true,
          fontSize: 9.5, lineHeight: 1.42, letterSpacing: -0.2, headingScale: 1.45, marginTop: 1.0, marginBot: 0.35, pMargin: 0.55,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'short',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'grayscale',
          colors: ['#f4efe4', '#7f1d1d', '#18130f']
        },
        'gazette-1920': {
          name: '🎩 Prvorepubliková Gazeta (1920)',
          desc: 'Slavnostní třísloupcová gazeta A4 NA ŠÍŘKU s dekorativním dvojitým rámečkem, římským číslováním a patkovým písmem Cinzel.',
          format: 'a4', orientation: 'landscape', columns: 3,
          mTop: 14, mBot: 14, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: true,
          fontSize: 10, lineHeight: 1.48, letterSpacing: 0.2, headingScale: 1.42, marginTop: 1.15, marginBot: 0.4, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'roman',
          imgRadius: 'sharp', imgBorder: 'frame', imgShadow: 'none', imgBg: 'card', mediaMode: 'grayscale',
          colors: ['#f6f2e9', '#451a03', '#1c1917']
        },
        'yellowed-press': {
          name: '📜 Dobový Večerník / Tabloid',
          desc: 'Kompaktní večerník A5 s 2 sloupci, inverzními titulkovými pásky, razítkovými boxy a tučnou kondenzovanou typografií.',
          format: 'a5', orientation: 'portrait', columns: 2,
          mTop: 12, mBot: 12, mLeft: 10, mRight: 10, mirrorMargins: false, ebookMode: true,
          fontSize: 9.8, lineHeight: 1.44, letterSpacing: 0, headingScale: 1.48, marginTop: 1.0, marginBot: 0.35, pMargin: 0.6,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#efe5ce', '#991b1b', '#1c1610']
        },

        // 2. MODERNÍ ČASOPIS (3 šablony)
        'magazine-editorial': {
          name: '✨ New Yorker Editorial',
          desc: 'Vertikální magazínová sazba A4 (2 sloupce) se zrcadlovými okraji, výraznými citacemi a rubínovou akcentní linkou.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 22, mBot: 18, mLeft: 22, mRight: 16, mirrorMargins: true, ebookMode: true,
          fontSize: 10.5, lineHeight: 1.56, letterSpacing: 0, headingScale: 1.52, marginTop: 1.25, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'hard', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#e11d48', '#09090b']
        },
        'magazine-fashion': {
          name: '🥂 Vogue Lookbook',
          desc: 'Luxusní módní sazba A4 NA ŠÍŘKU (2 sloupce) s polaroidovými rámečky a vysokokontrastním písmem.',
          format: 'a4', orientation: 'landscape', columns: 2,
          mTop: 20, mBot: 18, mLeft: 24, mRight: 24, mirrorMargins: false, ebookMode: true,
          fontSize: 11.5, lineHeight: 1.72, letterSpacing: 0.2, headingScale: 1.55, marginTop: 1.5, marginBot: 0.5, pMargin: 0.95,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'roman',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#faf8f5', '#a16207', '#0c0a09']
        },
        'magazine-tech': {
          name: '⚡ Wired Tech Quarterly',
          desc: 'Americký časopisecký formát US Letter s dynamickou třísloupcovou mřížkou, zkosenými cyberpunkovými štítky H2 a neonovými akcenty.',
          format: 'letter', orientation: 'portrait', columns: 3,
          mTop: 14, mBot: 14, mLeft: 12, mRight: 12, mirrorMargins: false, ebookMode: false,
          fontSize: 9.5, lineHeight: 1.46, letterSpacing: -0.1, headingScale: 1.38, marginTop: 1.1, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'soft', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#4f46e5', '#06b6d4']
        },

        // 3. DĚTSKÝ ČASOPIS (3 šablony)
        'kids-comic': {
          name: '🎈 Veselý Komiks & Kvízy',
          desc: 'Hravý komiksový dvouměsíčník A4 NA ŠÍŘKU (2 sloupce) s tvrdými stíny, tečkovanými rámečky a zaoblenými bublinami.',
          format: 'a4', orientation: 'landscape', columns: 2,
          mTop: 15, mBot: 15, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 11.5, lineHeight: 1.6, letterSpacing: 0.2, headingScale: 1.4, marginTop: 1.15, marginBot: 0.45, pMargin: 0.85,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'rounded', imgBorder: 'comic', imgShadow: 'hard', imgBg: 'card', mediaMode: 'normal',
          colors: ['#fffef7', '#f97316', '#0284c7']
        },
        'kids-adventure': {
          name: '🦖 Dobrodružná Výprava',
          desc: 'Expediční atlas A4 (2 sloupce) s mapovou sazbou, expedičními cedulkami a zeleným rámováním listu.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 16, mBot: 16, mLeft: 16, mRight: 16, mirrorMargins: false, ebookMode: false,
          fontSize: 11.5, lineHeight: 1.62, letterSpacing: 0.1, headingScale: 1.36, marginTop: 1.2, marginBot: 0.45, pMargin: 0.85,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#f7fee7', '#15803d', '#b45309']
        },
        'kids-explorer': {
          name: '🚀 Kapesní Zápisník Badatele',
          desc: 'Příruční badatelský sešit A5 (1 sloupec) s terénními kartami a kroužkovanými vědeckými boxy.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 14, mBot: 14, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 11.5, lineHeight: 1.65, letterSpacing: 0, headingScale: 1.34, marginTop: 1.2, marginBot: 0.45, pMargin: 0.85,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#f8fafc', '#0284c7', '#7c3aed']
        },

        // 4. STARÁ KNIHA (3 šablony)
        'antique-manuscript': {
          name: '🕯️ Iluminovaný Středověký Kodex',
          desc: 'Rukopisný kodex A4 (2 sloupce) s monumentálními asymetrickými okraji pro glosy, dvojitým rámem a rubrikovou iniciálou.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 22, mBot: 26, mLeft: 22, mRight: 22, mirrorMargins: true, ebookMode: true,
          fontSize: 12, lineHeight: 1.68, letterSpacing: 0.1, headingScale: 1.38, marginTop: 1.4, marginBot: 0.5, pMargin: 0.55,
          diffOddEven: true, includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'roman',
          imgRadius: 'sharp', imgBorder: 'frame', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#f5ebd6', '#7f1d1d', '#92400e']
        },
        'antique-victorian': {
          name: '🏛️ Viktoriánský Román',
          desc: 'Klasický románový formát A5 (1 sloupec) se zrcadlovou knižní vazbou, centrovanými kapitolami a 1.5em odstavci.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 22, mLeft: 22, mRight: 14, mirrorMargins: true, ebookMode: true,
          fontSize: 11, lineHeight: 1.62, letterSpacing: 0, headingScale: 1.32, marginTop: 1.35, marginBot: 0.5, pMargin: 0.45,
          diffOddEven: true, includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'roman',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#f7f3eb', '#57534e', '#1c1917']
        },
        'antique-press': {
          name: '✒️ První Knižní Vydání',
          desc: 'Knižní formát B5 (176 × 250 mm) s čistou knihtiskovou sazbou Libre Baskerville bez rušivého záhlaví.',
          format: 'b5', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 22, mLeft: 24, mRight: 16, mirrorMargins: true, ebookMode: true,
          diffOddEven: true, includeHeader: false, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          fontSize: 10.5, lineHeight: 1.58, letterSpacing: 0, headingScale: 1.26, marginTop: 1.25, marginBot: 0.4, pMargin: 0.35,
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'grayscale',
          colors: ['#faf8f5', '#292524', '#0c0a09']
        },

        // 5. DĚTSKÁ KNIHA (3 šablony)
        'kids-storybook': {
          name: '🧸 Obrázková Pohádka',
          desc: 'Pohádkové album A5 NA ŠÍŘKU (1 sloupec) s hřejivým krémovým papírem, velkým písmem Nunito a dekorativním rámečkem.',
          format: 'a5', orientation: 'landscape', columns: 1,
          mTop: 16, mBot: 16, mLeft: 18, mRight: 18, mirrorMargins: false, ebookMode: true,
          fontSize: 12.5, lineHeight: 1.72, letterSpacing: 0.1, headingScale: 1.35, marginTop: 1.3, marginBot: 0.55, pMargin: 0.9,
          includeHeader: false, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#fffbeb', '#d97706', '#dc2626']
        },
        'kids-easy-reader': {
          name: '🔤 První Čtení / Slabikář',
          desc: 'Ergonomická sazba pro začínající čtenáře a dyslektiky: 14pt bezpatkové písmo, široké rozestupy, řádkování 1.88 a 26mm okraje.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 24, mBot: 24, mLeft: 26, mRight: 26, mirrorMargins: false, ebookMode: false,
          fontSize: 14, lineHeight: 1.88, letterSpacing: 0.4, headingScale: 1.28, marginTop: 1.3, marginBot: 0.6, pMargin: 1.05,
          includeHeader: false, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#059669', '#0f172a']
        },
        'kids-fairytale': {
          name: '🏰 Zlatá Kniha Pohádek',
          desc: 'Zlatá pohádková kniha formátu B5 (1 sloupec) s dvojitým zlatofialovým rámem kolem strany a velkým písmem.',
          format: 'b5', orientation: 'portrait', columns: 1,
          mTop: 22, mBot: 22, mLeft: 22, mRight: 22, mirrorMargins: false, ebookMode: true,
          fontSize: 11.5, lineHeight: 1.68, letterSpacing: 0.1, headingScale: 1.38, marginTop: 1.25, marginBot: 0.5, pMargin: 0.8,
          includeHeader: false, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'roman',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#fdf8f6', '#9333ea', '#ca8a04']
        },

        // 6. MODERNÍ KNIHA (3 šablony)
        'book-modern-novel': {
          name: '📖 Současný Román',
          desc: 'Autentická beletristická sazba A5 (1 sloupec) se zrcadlovým hřbetem Tschichold (22 mm vnitřní / 14 mm vnější), tichým záhlavím a knižní iniciálou.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 22, mLeft: 22, mRight: 14, mirrorMargins: true, ebookMode: true,
          fontSize: 11, lineHeight: 1.62, letterSpacing: 0, headingScale: 1.3, marginTop: 1.4, marginBot: 0.45, pMargin: 0.35,
          diffOddEven: true, includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#fdfcf9', '#b45309', '#18181b']
        },
        'book-nordic-minimal': {
          name: '❄️ Severská Monografie',
          desc: 'Vzdušná skandinávská knižní úprava na formátu B5 s asymetrickým 36mm vnějším okrajem pro poznámky a březově modrými akcenty.',
          format: 'b5', orientation: 'portrait', columns: 1,
          mTop: 24, mBot: 24, mLeft: 20, mRight: 36, mirrorMargins: true, ebookMode: false,
          fontSize: 10.5, lineHeight: 1.65, letterSpacing: -0.1, headingScale: 1.28, marginTop: 1.35, marginBot: 0.45, pMargin: 0.8,
          diffOddEven: true, includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#0284c7', '#0f172a']
        },
        'book-paperback': {
          name: '📕 Cestovní Paperback',
          desc: 'Úsporné kapesní vydání A5 (148 × 210 mm) s 11mm vnějším a 15mm vnitřním vazebním okrajem.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 13, mBot: 15, mLeft: 15, mRight: 11, mirrorMargins: true, ebookMode: true,
          fontSize: 9.8, lineHeight: 1.52, letterSpacing: 0, headingScale: 1.24, marginTop: 1.2, marginBot: 0.38, pMargin: 0.35,
          diffOddEven: true, includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#fafaf9', '#dc2626', '#1c1917']
        },

        // 7. DESIGNOVÝ DOKUMENT (3 šablony)
        'design-swiss-grid': {
          name: '🇨🇭 Švýcarský Grid Müller-Brockmann',
          desc: 'Mezinárodní typografický styl: dvousloupcový rastr s 26mm horním okrajem, červeným pruhem a černými konstrukčními linkami.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 26, mBot: 12, mLeft: 10, mRight: 10, mirrorMargins: false, ebookMode: false,
          fontSize: 10, lineHeight: 1.44, letterSpacing: -0.3, headingScale: 1.55, marginTop: 1.1, marginBot: 0.35, pMargin: 0.7,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#dc2626', '#000000']
        },
        'design-brutalist-tech': {
          name: '🧱 Architektonický Brutalismus',
          desc: 'Brutalistní dokument s černým rámem kolem strany, posunutými stíny, neony a neproporcionálním písmem.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 16, mBot: 16, mLeft: 16, mRight: 16, mirrorMargins: false, ebookMode: false,
          fontSize: 10, lineHeight: 1.52, letterSpacing: 0, headingScale: 1.32, marginTop: 1.2, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'brutalist', imgShadow: 'hard', imgBg: 'card', mediaMode: 'normal',
          colors: ['#f4f4f0', '#ff3e00', '#a3e635']
        },
        'design-studio-annual': {
          name: '🎨 Kreativní Portfolio & Report',
          desc: 'Prezentační portfolio A4 NA ŠÍŘKU (2 sloupce) s barevným levým pruhem a 26mm levým okrajem.',
          format: 'a4', orientation: 'landscape', columns: 2,
          mTop: 18, mBot: 18, mLeft: 26, mRight: 18, mirrorMargins: false, ebookMode: false,
          fontSize: 10.5, lineHeight: 1.55, letterSpacing: -0.1, headingScale: 1.42, marginTop: 1.2, marginBot: 0.4, pMargin: 0.75,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'none', imgShadow: 'soft', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#7c3aed', '#ec4899']
        },

        // 8. MINIMALISTICKÁ TYPOGRAFIE (3 šablony)
        'minimal-bauhaus': {
          name: '📐 Bauhaus Geometrie',
          desc: 'Konstruktivistická kompozice na A4 (1 sloupec) s 34mm levým okrajem, trikolórou a geometrickými štítky.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 22, mBot: 20, mLeft: 34, mRight: 16, mirrorMargins: false, ebookMode: false,
          fontSize: 10.8, lineHeight: 1.56, letterSpacing: -0.1, headingScale: 1.38, marginTop: 1.25, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#faf8f5', '#e11d48', '#1d4ed8']
        },
        'minimal-zen': {
          name: '🍵 Japonský Zen Wabi-Sabi',
          desc: 'Kontemplativní sazba A5 (1 sloupec) s 25mm vzdušnými okraji, bez rušivého záhlaví a s jemnou patkovou typografií.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 25, mBot: 25, mLeft: 25, mRight: 25, mirrorMargins: false, ebookMode: false,
          fontSize: 11.5, lineHeight: 1.8, letterSpacing: 0.2, headingScale: 1.22, marginTop: 1.6, marginBot: 0.55, pMargin: 1.0,
          includeHeader: false, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#fcfbf9', '#57534e', '#292524']
        },
        'minimal-grid': {
          name: '📏 Braun / Rams Mikromanuál',
          desc: 'Technický manuál A5 NA ŠÍŘKU (2 sloupce) s přesnými 12mm okraji a jemnou rýsovací mřížkou.',
          format: 'a5', orientation: 'landscape', columns: 2,
          mTop: 12, mBot: 12, mLeft: 12, mRight: 12, mirrorMargins: false, ebookMode: false,
          fontSize: 10, lineHeight: 1.5, letterSpacing: 0, headingScale: 1.26, marginTop: 1.15, marginBot: 0.4, pMargin: 0.7,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'prefix',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0284c7', '#0f172a']
        },

        // 9. WEBOVÝ BLOG (3 šablony)
        'blog-ghost-clean': {
          name: '👻 Clean Longform Essay',
          desc: 'Čistá esejistická sazba A4 (1 sloupec) s komfortní šířkou řádku a 28mm čtecími okraji.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 22, mBot: 22, mLeft: 28, mRight: 28, mirrorMargins: false, ebookMode: false,
          fontSize: 11.5, lineHeight: 1.65, letterSpacing: 0, headingScale: 1.36, marginTop: 1.3, marginBot: 0.45, pMargin: 0.85,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'none', imgShadow: 'soft', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#2563eb', '#18181b']
        },
        'blog-dev-digest': {
          name: '💻 Developer Docs & Markdown',
          desc: 'Vývojářská dokumentace A4 (1 sloupec) s Markdown ## prefixy a terminálovými bloky kódu.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 16, mBot: 16, mLeft: 18, mRight: 18, mirrorMargins: false, ebookMode: false,
          fontSize: 10.2, lineHeight: 1.54, letterSpacing: 0, headingScale: 1.3, marginTop: 1.2, marginBot: 0.4, pMargin: 0.75,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0969da', '#1f2328']
        },
        'blog-substack-editorial': {
          name: '✉️ Substack Newsletter',
          desc: 'Osobní komentářový newsletter US Letter (1 sloupec) s oranžovým perexem a výraznou iniciálou.',
          format: 'letter', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 18, mLeft: 20, mRight: 20, mirrorMargins: false, ebookMode: true,
          fontSize: 11.2, lineHeight: 1.62, letterSpacing: 0, headingScale: 1.38, marginTop: 1.3, marginBot: 0.45, pMargin: 0.85,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'simple',
          imgRadius: 'rounded', imgBorder: 'none', imgShadow: 'soft', imgBg: 'none', mediaMode: 'normal',
          colors: ['#fffdfa', '#ea580c', '#1c1917']
        },

        // 10. MODERNÍ UČEBNICE (3 šablony)
        'textbook-stem-script': {
          name: '🧮 Vysokoškolská STEM Skripta',
          desc: 'Dvousloupcová skripta A4 s 14mm okraji, modrými štítky kapitol a rámovanými definicemi.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 16, mBot: 16, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 10, lineHeight: 1.48, letterSpacing: 0, headingScale: 1.26, marginTop: 1.15, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right-odd-left-even', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0369a1', '#0f172a']
        },
        'textbook-university': {
          name: '🎓 Oxford / Tufte Kompendium',
          desc: 'Učebnicová sazba A4 (1 sloupec) s vytištěným 38mm pravým studijním okrajem pro poznámky.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 20, mBot: 20, mLeft: 18, mRight: 38, mirrorMargins: false, ebookMode: false,
          fontSize: 10.8, lineHeight: 1.58, letterSpacing: 0, headingScale: 1.32, marginTop: 1.25, marginBot: 0.45, pMargin: 0.78,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'prefix',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#1e3a8a', '#b45309']
        },
        'textbook-medical': {
          name: '🩺 Klinická & Lékařská Skripta',
          desc: 'Klinická skripta A4 (2 sloupce) s tyrkysovým záhlavím a strukturovanými tabulkami.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 15, mBot: 15, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 9.8, lineHeight: 1.46, letterSpacing: 0, headingScale: 1.28, marginTop: 1.1, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0d9488', '#e11d48']
        },

        // 11. ZÁBAVNÁ UČEBNICE (3 šablony)
        'fun-textbook-science': {
          name: '🧪 Hravá Věda & Laboratoř',
          desc: 'Laboratorní příručka A4 (2 sloupce) s odznaky nadpisů, tečkovanými kartami a boxy pro pokusy.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 18, mBot: 18, mLeft: 16, mRight: 16, mirrorMargins: false, ebookMode: false,
          fontSize: 10.5, lineHeight: 1.55, letterSpacing: 0, headingScale: 1.32, marginTop: 1.2, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#7c3aed', '#10b981']
        },
        'fun-textbook-companion': {
          name: '🧭 Třísloupcový Studijní Tahák',
          desc: 'Hustý studijní přehled A4 NA ŠÍŘKU se 3 sloupci a 12mm okraji pro přehled klíčových pojmů.',
          format: 'a4', orientation: 'landscape', columns: 3,
          mTop: 14, mBot: 14, mLeft: 12, mRight: 12, mirrorMargins: false, ebookMode: false,
          fontSize: 9.8, lineHeight: 1.48, letterSpacing: 0, headingScale: 1.24, marginTop: 1.1, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-center', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0284c7', '#f59e0b']
        },
        'fun-textbook-workbook': {
          name: '✏️ Cornellův Pracovní Sešit',
          desc: 'Pracovní list A4 (1 sloupec) se 45mm pravým linkovaným sloupkem Cornell Notes na každé straně.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 20, mLeft: 16, mRight: 45, mirrorMargins: false, ebookMode: false,
          fontSize: 10.8, lineHeight: 1.6, letterSpacing: 0, headingScale: 1.28, marginTop: 1.2, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-left', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#ea580c', '#0284c7']
        },

        // 12. STRHUJÍCÍ BULLETIN (3 šablony)
        'bulletin-executive-brief': {
          name: '📊 Krizový Flash Briefing',
          desc: 'Manažerský informační svod se 3 sloupci na A4, 10mm okraji a vysokou informační hustotou.',
          format: 'a4', orientation: 'portrait', columns: 3,
          mTop: 11, mBot: 11, mLeft: 10, mRight: 10, mirrorMargins: false, ebookMode: false,
          fontSize: 9.2, lineHeight: 1.42, letterSpacing: 0, headingScale: 1.3, marginTop: 1.0, marginBot: 0.35, pMargin: 0.55,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'prefix',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0f172a', '#0284c7']
        },
        'bulletin-market-dispatch': {
          name: '📈 Financial Times Tržní Svodka',
          desc: 'Tržní svodka A4 NA ŠÍŘKU (3 sloupce) na lososovém podkladu Financial Times s datovými tabulkami.',
          format: 'a4', orientation: 'landscape', columns: 3,
          mTop: 14, mBot: 14, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: true,
          fontSize: 10, lineHeight: 1.48, letterSpacing: 0, headingScale: 1.35, marginTop: 1.1, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#fff1e5', '#990f3d', '#1c1917']
        },
        'bulletin-company-digest': {
          name: '🏢 Firemní Magazín & Zpravodaj',
          desc: 'Dvousloupcový firemní zpravodaj A4 se smaragdovými akcenty a zaoblenými boxy.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 15, mBot: 15, mLeft: 15, mRight: 15, mirrorMargins: false, ebookMode: false,
          fontSize: 10, lineHeight: 1.5, letterSpacing: 0, headingScale: 1.32, marginTop: 1.1, marginBot: 0.38, pMargin: 0.65,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#059669', '#0f172a']
        },

        // 13. KLASICKÉ A ÚSPORNÉ ŠABLONY (6 šablon)
        'toner-saver': {
          name: '🌱 Eko B&W Minimum Papíru',
          desc: 'Extrémně úsporný tisk: 2 sloupce na A4, 8mm okraje, nulové barevné výplně a kompaktní písmo.',
          format: 'a4', orientation: 'portrait', columns: 2,
          mTop: 10, mBot: 10, mLeft: 8, mRight: 8, mirrorMargins: false, ebookMode: false,
          fontSize: 9.5, lineHeight: 1.38, letterSpacing: 0, headingScale: 1.18, marginTop: 0.9, marginBot: 0.3, pMargin: 0.5,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'none', mediaMode: 'toner-save',
          colors: ['#ffffff', '#222222', '#000000']
        },
        'modern-edu': {
          name: '🎓 Školní List do Šanonu',
          desc: 'Výukový list A4 s 24mm levým okrajem se značkami děrovačky pro založení do šanonu.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 18, mBot: 18, mLeft: 24, mRight: 16, mirrorMargins: false, ebookMode: false,
          fontSize: 11, lineHeight: 1.55, letterSpacing: 0, headingScale: 1.28, marginTop: 1.2, marginBot: 0.45, pMargin: 0.78,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'rounded', imgBorder: 'thin', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0284c7', '#0f172a']
        },
        'academic': {
          name: '🏛️ Diplomová & Akademická Práce',
          desc: 'Formální akademická sazba A4 s 30mm levým okrajem na pevnou vazbu a tabulkami LaTeX Booktabs.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 25, mBot: 25, mLeft: 30, mRight: 20, mirrorMargins: false, ebookMode: false,
          fontSize: 11, lineHeight: 1.65, letterSpacing: 0, headingScale: 1.28, marginTop: 1.35, marginBot: 0.45, pMargin: 0.75,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'none', imgShadow: 'none', imgBg: 'none', mediaMode: 'normal',
          colors: ['#ffffff', '#1e293b', '#0f172a']
        },
        'stem-tech': {
          name: '💻 Inženýrský Technický Arch',
          desc: 'Inženýrský arch A4 NA ŠÍŘKU se 2 sloupci, blokovým zarovnáním a technickými tabulkami.',
          format: 'a4', orientation: 'landscape', columns: 2,
          mTop: 14, mBot: 14, mLeft: 14, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 9.8, lineHeight: 1.45, letterSpacing: 0, headingScale: 1.22, marginTop: 1.1, marginBot: 0.35, pMargin: 0.6,
          includeHeader: true, includeFooter: true, pageNumPosition: 'header-right-odd-left-even', pageNumFormat: 'simple',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#0f766e', '#0f172a']
        },
        'warm-notebook': {
          name: '☕ Linkovaný Zápisník Moleskine',
          desc: 'Kapesní studijní zápisník A5 (1 sloupec) s krémovým linkovaným papírem a červenou linkou na marginálie.',
          format: 'a5', orientation: 'portrait', columns: 1,
          mTop: 16, mBot: 16, mLeft: 20, mRight: 14, mirrorMargins: false, ebookMode: false,
          fontSize: 11, lineHeight: 1.65, letterSpacing: 0, headingScale: 1.28, marginTop: 1.25, marginBot: 0.45, pMargin: 0.8,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'simple',
          imgRadius: 'rounded', imgBorder: 'frame', imgShadow: 'soft', imgBg: 'card', mediaMode: 'normal',
          colors: ['#fbf8f1', '#b45309', '#292524']
        },
        'corporate-navy': {
          name: '🏢 Manažerský Board Report',
          desc: 'Reprezentativní manažerská zpráva A4 (1 sloupec) s 25mm levým okrajem, tmavě modrým bannerem a tabulkami.',
          format: 'a4', orientation: 'portrait', columns: 1,
          mTop: 20, mBot: 18, mLeft: 25, mRight: 18, mirrorMargins: false, ebookMode: false,
          fontSize: 10.2, lineHeight: 1.5, letterSpacing: 0, headingScale: 1.34, marginTop: 1.15, marginBot: 0.4, pMargin: 0.7,
          includeHeader: true, includeFooter: true, pageNumPosition: 'footer-right', pageNumFormat: 'prefix',
          imgRadius: 'sharp', imgBorder: 'thin', imgShadow: 'none', imgBg: 'card', mediaMode: 'normal',
          colors: ['#ffffff', '#1e3a8a', '#b45309']
        }
      };
      return map[themeName] || map['web-original'];
    }

    _syncMicrotypographyUI(themeName, applyLayout = true) {
      const def = this._getThemeMicroDefaults(themeName);

      // Apply microtypography CSS variables directly so they take immediate effect
      document.documentElement.style.setProperty('--doc-font-size-base', def.fontSize + 'pt');
      document.documentElement.style.setProperty('--doc-line-height', def.lineHeight.toFixed(2));
      document.documentElement.style.setProperty('--doc-letter-spacing', def.letterSpacing.toFixed(1) + 'px');
      document.documentElement.style.setProperty('--doc-heading-scale', def.headingScale.toFixed(2));
      document.documentElement.style.setProperty('--doc-heading-margin-top', def.marginTop.toFixed(1) + 'em');
      document.documentElement.style.setProperty('--doc-heading-margin-bottom', def.marginBot.toFixed(2) + 'em');
      document.documentElement.style.setProperty('--doc-paragraph-margin-bottom', def.pMargin.toFixed(2) + 'em');

      document.body.classList.toggle('ebook-mode', !!def.ebookMode);

      if (def.imgRadius) document.body.setAttribute('data-img-radius', def.imgRadius);
      if (def.imgBorder) document.body.setAttribute('data-img-border', def.imgBorder);
      if (def.imgShadow) document.body.setAttribute('data-img-shadow', def.imgShadow);
      if (def.imgBg) document.body.setAttribute('data-img-bg', def.imgBg);

      if (applyLayout) {
        const format = def.format || 'a4';
        const orientation = def.orientation || 'portrait';
        const cols = def.columns || 1;
        const mTop = def.mTop ?? 20;
        const mBot = def.mBot ?? 20;
        const mLeft = def.mLeft ?? 20;
        const mRight = def.mRight ?? 20;
        const mirror = !!def.mirrorMargins;
        const diffOddEven = def.diffOddEven !== undefined ? !!def.diffOddEven : mirror;
        const includeHeader = def.includeHeader !== undefined ? !!def.includeHeader : true;
        const includeFooter = def.includeFooter !== undefined ? !!def.includeFooter : true;
        const pageNumPosition = def.pageNumPosition || 'footer-right';
        const pageNumFormat = def.pageNumFormat || 'prefix';
        const mediaMode = def.mediaMode || 'normal';

        this.paginationEngine.updateConfig({
          format,
          orientation,
          columns: cols,
          marginTop: mTop,
          marginBottom: mBot,
          marginLeft: mLeft,
          marginRight: mRight,
          mirrorMargins: mirror,
          diffOddEven,
          includeHeader,
          includeFooter,
          pageNumPosition,
          pageNumFormat,
          mediaMode
        });

        const selFormat = document.getElementById('sel-paper-format');
        if (selFormat) selFormat.value = format;

        const selOrient = document.getElementById('sel-orientation');
        if (selOrient) selOrient.value = orientation;

        const selCols = document.getElementById('sel-columns');
        if (selCols) selCols.value = String(cols);

        const syncMarginInput = (numId, rangeId, val) => {
          const n = document.getElementById(numId);
          const r = document.getElementById(rangeId);
          if (n) n.value = val;
          if (r) r.value = val;
        };
        syncMarginInput('num-margin-top', 'range-margin-top', mTop);
        syncMarginInput('num-margin-bottom', 'range-margin-bottom', mBot);
        syncMarginInput('num-margin-left', 'range-margin-left', mLeft);
        syncMarginInput('num-margin-right', 'range-margin-right', mRight);

        const chkMirror = document.getElementById('chk-mirror-margins');
        if (chkMirror) chkMirror.checked = mirror;
        const lblL = document.getElementById('lbl-margin-left');
        const lblR = document.getElementById('lbl-margin-right');
        if (lblL) lblL.textContent = mirror ? 'Vnitřní okraj (Vazba)' : 'Levý okraj';
        if (lblR) lblR.textContent = mirror ? 'Vnější okraj' : 'Pravý okraj';

        const chkH = document.getElementById('chk-enable-header');
        if (chkH) chkH.checked = includeHeader;
        const chkF = document.getElementById('chk-enable-footer');
        if (chkF) chkF.checked = includeFooter;

        const chkDiff = document.getElementById('chk-diff-odd-even');
        const simplePanel = document.getElementById('hf-simple-mode-panel');
        const advPanel = document.getElementById('hf-advanced-mode-panel');
        if (chkDiff) {
          chkDiff.checked = diffOddEven;
          if (simplePanel) simplePanel.style.display = diffOddEven ? 'none' : 'flex';
          if (advPanel) advPanel.style.display = diffOddEven ? 'flex' : 'none';
        }

        const selPos = document.getElementById('sel-page-num-position');
        if (selPos) selPos.value = pageNumPosition;

        const selFormatNum = document.getElementById('sel-page-num-format');
        if (selFormatNum) selFormatNum.value = pageNumFormat;

        const selMedia = document.getElementById('sel-media-mode');
        if (selMedia) selMedia.value = mediaMode;
        document.body.setAttribute('data-media-mode', mediaMode);
      }

      const rSize = document.getElementById('range-font-size-base');
      const bSize = document.getElementById('badge-font-size-base');
      if (rSize) rSize.value = def.fontSize;
      if (bSize) bSize.textContent = def.fontSize + ' pt';

      const rLine = document.getElementById('range-line-height');
      const bLine = document.getElementById('badge-line-height');
      if (rLine) rLine.value = def.lineHeight;
      if (bLine) bLine.textContent = def.lineHeight.toFixed(2);

      const rSpace = document.getElementById('range-letter-spacing');
      const bSpace = document.getElementById('badge-letter-spacing');
      if (rSpace) rSpace.value = def.letterSpacing;
      if (bSpace) bSpace.textContent = (def.letterSpacing >= 0 ? '+' : '') + def.letterSpacing.toFixed(1) + ' px';

      const rScale = document.getElementById('range-heading-scale');
      const bScale = document.getElementById('badge-heading-scale');
      if (rScale) rScale.value = def.headingScale;
      if (bScale) bScale.textContent = def.headingScale.toFixed(2) + '×';

      const rTop = document.getElementById('range-heading-margin-top');
      const bTop = document.getElementById('badge-heading-margin-top');
      if (rTop) rTop.value = def.marginTop;
      if (bTop) bTop.textContent = def.marginTop.toFixed(1) + ' em';

      const rBot = document.getElementById('range-heading-margin-bottom');
      const bBot = document.getElementById('badge-heading-margin-bottom');
      if (rBot) rBot.value = def.marginBot;
      if (bBot) bBot.textContent = def.marginBot.toFixed(2) + ' em';

      const rP = document.getElementById('range-paragraph-margin');
      const bP = document.getElementById('badge-paragraph-margin');
      if (rP) rP.value = def.pMargin;
      if (bP) bP.textContent = def.pMargin.toFixed(2) + ' em';

      this._updateTemplateSpecCard(themeName, def);
    }

    _updateTemplateSpecCard(themeName, defOverride = null) {
      const def = defOverride || this._getThemeMicroDefaults(themeName);
      if (!def) return;

      const nameEl = document.getElementById('tpl-spec-name');
      const formatEl = document.getElementById('tpl-spec-format');
      const descEl = document.getElementById('tpl-spec-desc');
      const pillsEl = document.getElementById('tpl-spec-pills');
      const swatchesEl = document.getElementById('tpl-spec-swatches');

      const formatLabels = {
        a4: 'A4 (210×297)',
        b5: 'B5 (176×250)',
        a5: 'A5 (148×210)',
        letter: 'US Letter'
      };
      const fmtStr = formatLabels[def.format || 'a4'] || 'A4';
      const orientStr = def.orientation === 'landscape' 
        ? (window.I18N ? window.I18N.t('spec.landscape') : 'Landscape ▭') 
        : (window.I18N ? window.I18N.t('spec.portrait') : 'Portrait ▯');

      let localizedName = def.name || themeName;
      let localizedDesc = def.desc || '';
      if (window.I18N && window.I18N.translations[window.I18N.currentLang]?.presets?.items?.[themeName]) {
        const itemTrans = window.I18N.translations[window.I18N.currentLang].presets.items[themeName];
        if (itemTrans.name) localizedName = itemTrans.name;
        if (itemTrans.desc) localizedDesc = itemTrans.desc;
      }

      if (nameEl) nameEl.textContent = localizedName;
      if (formatEl) formatEl.textContent = `${fmtStr} · ${orientStr}`;
      if (descEl) descEl.textContent = localizedDesc;

      if (pillsEl) {
        const colLabel = def.columns === 3 
          ? (window.I18N ? window.I18N.t('spec.col_3') : '3 columns') 
          : (def.columns === 2 
              ? (window.I18N ? window.I18N.t('spec.col_2') : '2 columns') 
              : (window.I18N ? window.I18N.t('spec.col_1') : '1 column'));
        const marginLabel = def.mirrorMargins
          ? (window.I18N ? window.I18N.t('spec.margins_mirror', { left: def.mLeft, right: def.mRight }) : `Mirror margins (${def.mLeft}/${def.mRight} mm)`)
          : (def.mLeft !== def.mRight
              ? (window.I18N ? window.I18N.t('spec.margins_asym', { left: def.mLeft, right: def.mRight }) : `Asymmetric margins (${def.mLeft} / ${def.mRight} mm)`)
              : (window.I18N ? window.I18N.t('spec.margins_sym', { top: def.mTop, left: def.mLeft }) : `Margins ${def.mTop}/${def.mLeft} mm`));
        const fontLabel = window.I18N ? window.I18N.t('spec.font', { size: def.fontSize }) : `Font ${def.fontSize} pt`;
        const extraPills = [];
        if (def.ebookMode) extraPills.push(window.I18N ? window.I18N.t('spec.dropcap') : '<span class="template-spec-pill highlight">✨ Drop Cap</span>');
        if (def.orientation === 'landscape') extraPills.push(window.I18N ? window.I18N.t('spec.widescreen') : '<span class="template-spec-pill highlight">▭ Widescreen Layout</span>');
        if (def.format === 'b5' || def.format === 'a5') extraPills.push(window.I18N ? window.I18N.t('spec.book_format', { format: def.format.toUpperCase() }) : `<span class="template-spec-pill highlight">📖 Book ${def.format.toUpperCase()}</span>`);

        pillsEl.innerHTML = `
          <span class="template-spec-pill">📰 ${colLabel}</span>
          <span class="template-spec-pill">📐 ${marginLabel}</span>
          <span class="template-spec-pill">🔤 ${fontLabel}</span>
          ${extraPills.join('')}
        `;
      }

      if (swatchesEl && Array.isArray(def.colors)) {
        swatchesEl.innerHTML = def.colors
          .map(c => `<span class="template-spec-swatch" style="background: ${c};" title="${c}"></span>`)
          .join('');
      }
    }

    _saveCurrentStyleAsTemplate() {
      const promptName = window.I18N ? window.I18N.t('dialogs.prompt_template_name') : 'Enter a name for the new template (e.g. My Modern Magazine):';
      const name = prompt(promptName);
      if (!name || !name.trim()) return;

      const rSize = document.getElementById('range-font-size-base');
      const rLine = document.getElementById('range-line-height');
      const rSpace = document.getElementById('range-letter-spacing');
      const rScale = document.getElementById('range-heading-scale');
      const rTop = document.getElementById('range-heading-margin-top');
      const rBot = document.getElementById('range-heading-margin-bottom');
      const rP = document.getElementById('range-paragraph-margin');

      const computed = window.getComputedStyle(document.body);
      const cssVars = {
        '--doc-primary': computed.getPropertyValue('--doc-primary') || '#0f766e',
        '--doc-primary-light': computed.getPropertyValue('--doc-primary-light') || '#f0fdf4',
        '--doc-primary-border': computed.getPropertyValue('--doc-primary-border') || '#bbf7d0',
        '--doc-secondary': computed.getPropertyValue('--doc-secondary') || '#0369a1',
        '--doc-headings': computed.getPropertyValue('--doc-headings') || '#0f172a',
        '--doc-text': computed.getPropertyValue('--doc-text') || '#1e293b',
        '--doc-paper-bg': computed.getPropertyValue('--doc-paper-bg') || '#ffffff',
        '--doc-font-family': computed.getPropertyValue('--doc-font-family') || 'Inter, sans-serif',
        '--doc-font-heading': computed.getPropertyValue('--doc-font-heading') || 'Outfit, sans-serif',
        '--doc-font-size-base': (rSize ? rSize.value + 'pt' : computed.getPropertyValue('--doc-font-size-base') || '11pt'),
        '--doc-line-height': (rLine ? rLine.value : computed.getPropertyValue('--doc-line-height') || '1.55'),
        '--doc-letter-spacing': (rSpace ? rSpace.value + 'px' : computed.getPropertyValue('--doc-letter-spacing') || '0px'),
        '--doc-heading-scale': (rScale ? rScale.value : computed.getPropertyValue('--doc-heading-scale') || '1.25'),
        '--doc-heading-margin-top': (rTop ? rTop.value + 'em' : computed.getPropertyValue('--doc-heading-margin-top') || '1.2em'),
        '--doc-heading-margin-bottom': (rBot ? rBot.value + 'em' : computed.getPropertyValue('--doc-heading-margin-bottom') || '0.45em'),
        '--doc-paragraph-margin-bottom': (rP ? rP.value + 'em' : computed.getPropertyValue('--doc-paragraph-margin-bottom') || '0.8em')
      };

      const cfg = this.paginationEngine.config;
      const layout = {
        format: cfg.format || 'a4',
        orientation: cfg.orientation || 'portrait',
        columns: cfg.columns || 1,
        marginTop: cfg.marginTop ?? 20,
        marginBottom: cfg.marginBottom ?? 20,
        marginLeft: cfg.marginLeft ?? 20,
        marginRight: cfg.marginRight ?? 20,
        mirrorMargins: !!cfg.mirrorMargins
      };

      const template = {
        id: 'custom-' + Date.now(),
        name: name.trim(),
        cssVars,
        layout
      };

      TemplateManager.saveCustomTemplate(template);
      this._initCustomTemplates();
      const sel = document.getElementById('sel-preset-template');
      if (sel) {
        sel.value = template.id;
        sel.dispatchEvent(new Event('change'));
      }
      this._showToast(window.I18N ? window.I18N.t('toasts.template_saved', { name: template.name }) : `Template "${template.name}" was saved with page layout`);
    }

    _saveWebStyleAsTemplate() {
      const activeChap = this.chapterManager.getActiveChapter();
      const tokens = activeChap?.styleTokens;
      const isCs = window.I18N && window.I18N.currentLang === 'cs';
      let defaultName = isCs ? 'Styl z webu' : 'Web Style';
      if (activeChap?.sourceUrl) {
        try {
          defaultName = (isCs ? 'Styl webu ' : 'Web Style ') + new URL(activeChap.sourceUrl).hostname.replace('www.', '');
        } catch (e) {}
      }
      const promptWeb = isCs ? 'Zadejte název šablony z webu:' : 'Enter name for web template:';
      const name = prompt(promptWeb, defaultName);
      if (!name || !name.trim()) return;

      const brandColor = tokens?.brandColor || '#0284c7';
      const headColor = tokens?.headingColor || brandColor;
      const pColor = tokens?.pColor || '#1e293b';
      const fontFam = tokens?.bodyFont ? ContentExtractor._buildFontStack(tokens.bodyFont) : 'Inter, sans-serif';
      const headFam = tokens?.headingFont ? ContentExtractor._buildFontStack(tokens.headingFont) : fontFam;

      const cssVars = {
        '--doc-primary': brandColor,
        '--doc-primary-light': tokens?.lightBg || '#f0f9ff',
        '--doc-primary-border': tokens?.lightBorder || '#bae6fd',
        '--doc-secondary': tokens?.secondaryColor || '#0369a1',
        '--doc-headings': headColor,
        '--doc-text': pColor,
        '--doc-font-family': fontFam,
        '--doc-font-heading': headFam,
        '--doc-font-size-base': '11pt',
        '--doc-line-height': '1.55',
        '--doc-letter-spacing': '0px',
        '--doc-heading-scale': '1.25',
        '--doc-heading-margin-top': '1.2em',
        '--doc-heading-margin-bottom': '0.45em',
        '--doc-paragraph-margin-bottom': '0.8em'
      };

      const cfg = this.paginationEngine.config;
      const template = {
        id: 'custom-' + Date.now(),
        name: name.trim(),
        cssVars,
        layout: {
          format: cfg.format || 'a4',
          orientation: cfg.orientation || 'portrait',
          columns: cfg.columns || 1,
          marginTop: cfg.marginTop ?? 20,
          marginBottom: cfg.marginBottom ?? 20,
          marginLeft: cfg.marginLeft ?? 20,
          marginRight: cfg.marginRight ?? 20,
          mirrorMargins: !!cfg.mirrorMargins
        },
        fonts: [tokens?.headingFont, tokens?.bodyFont].filter(Boolean)
      };

      TemplateManager.saveCustomTemplate(template);
      this._initCustomTemplates();
      const sel = document.getElementById('sel-preset-template');
      if (sel) {
        sel.value = template.id;
        sel.dispatchEvent(new Event('change'));
      }
      this._showToast(window.I18N ? window.I18N.t('toasts.web_template_saved', { name: template.name }) : `Web style template "${template.name}" was saved`);
    }

    _deleteCurrentCustomTemplate() {
      const sel = document.getElementById('sel-preset-template');
      const val = sel?.value;
      if (!val || !val.startsWith('custom-')) return;
      const confirmDelete = window.I18N ? window.I18N.t('dialogs.confirm_delete_template') : 'Are you sure you want to delete this custom template?';
      if (confirm(confirmDelete)) {
        TemplateManager.deleteCustomTemplate(val);
        this._initCustomTemplates();
        if (sel) {
          sel.value = 'modern-edu';
          sel.dispatchEvent(new Event('change'));
        }
        this._showToast(window.I18N ? window.I18N.t('toasts.template_deleted') : 'Template was deleted');
      }
    }

    _bindDrawerEvents() {
      const toggleBtn = document.getElementById('btn-toggle-drawer');
      const drawer = document.getElementById('canvas-drawer-panel');
      const closeBtn = document.getElementById('btn-close-drawer');

      const toggleDrawer = () => {
        const isOpen = drawer?.classList.toggle('open');
        toggleBtn?.classList.toggle('drawer-open', isOpen);
        if (isOpen && this._pendingThumbnailSheets) {
          this._renderThumbnails(this._pendingThumbnailSheets);
        }
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
        if (this._pendingThumbnailSheets) {
          this._renderThumbnails(this._pendingThumbnailSheets);
        }
      });

      tabTOC?.addEventListener('click', () => {
        tabTOC.classList.add('active');
        tabThumbs?.classList.remove('active');
        if (listThumbs) listThumbs.style.display = 'none';
        if (treeTOC) treeTOC.style.display = 'flex';
      });
    }

    _renderThumbnails(sheets) {
      const drawer = document.getElementById('canvas-drawer-panel');
      const thumbsList = document.getElementById('drawer-thumbs-list');
      if (!thumbsList) return;

      if (!drawer?.classList.contains('open')) {
        this._pendingThumbnailSheets = sheets;
        return;
      }
      this._pendingThumbnailSheets = null;
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
        footer.textContent = window.I18N ? window.I18N.t('drawer.page_label', { page: pageNum }) : `Page ${pageNum}`;

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

          const pageShort = window.I18N ? window.I18N.t('drawer.page_short', { page: pageNum }) : `p. ${pageNum}`;
          item.className = `drawer-toc-item level-${level}`;
          item.innerHTML = `
            <span>${this.chapterManager._escapeHTML(text)}</span>
            <span style="font-weight: 700; font-size: 10px; color: var(--ui-text-muted);">${this.chapterManager._escapeHTML(pageShort)}</span>
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
        const noHeadings = window.I18N ? window.I18N.t('drawer.no_headings') : 'No headings were found.';
        treeTOC.innerHTML = `<div style="font-size: 11px; color: var(--ui-text-muted); padding: 10px;">${this.chapterManager._escapeHTML(noHeadings)}</div>`;
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
            const targetChap = this._findChapterForBlock(blockId, target);
            if (targetChap && targetChap.htmlContent) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = targetChap.htmlContent;
              const targetInMaster = tempDiv.querySelector(`[data-block-id="${blockId}"]`);
              if (targetInMaster) {
                targetInMaster.innerHTML = target.innerHTML;
                targetChap.htmlContent = tempDiv.innerHTML;
              }
            }
          }
        }
      });
    }

    _syncWebStyleDropdowns() {
      const templateSelect = document.getElementById('sel-preset-template');
      const fontSelect = document.getElementById('sel-font-family');
      const webOptgroup = document.getElementById('optgroup-web-sources');

      const chaptersWithTokens = this.chapterManager.chapters.filter(ch => ch.styleTokens && (ch.styleTokens.brandColor || ch.styleTokens.bodyFont));

      if (webOptgroup) {
        webOptgroup.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'web-original';
        defaultOpt.textContent = window.I18N ? window.I18N.t('themes.opt_web_original') : '🌐 Original style from web (Active URL)';
        webOptgroup.appendChild(defaultOpt);

        chaptersWithTokens.forEach((ch) => {
          const opt = document.createElement('option');
          opt.value = `web-chap-${ch.id}`;
          const fName = ch.styleTokens.bodyFont ? ch.styleTokens.bodyFont.split(',')[0].replace(/['"]/g, '').trim() : 'Web Font';
          const cHex = ch.styleTokens.brandColor || '#0284c7';
          const stylePrefix = window.I18N && window.I18N.currentLang === 'cs' ? 'Styl' : 'Style';
          opt.textContent = `🌐 ${stylePrefix}: ${ch.title.substring(0, 24)}${ch.title.length > 24 ? '…' : ''} (${fName}, ${cHex})`;
          webOptgroup.appendChild(opt);
        });
      }

      if (fontSelect) {
        let originalOpt = fontSelect.querySelector('option[value="web-original"]');
        if (!originalOpt) {
          originalOpt = document.createElement('option');
          originalOpt.value = 'web-original';
          fontSelect.insertBefore(originalOpt, fontSelect.firstChild);
        }
        const activeChap = this.chapterManager.getActiveChapter();
        const activeFont = activeChap?.styleTokens?.bodyFont ? activeChap.styleTokens.bodyFont.split(',')[0].replace(/['"]/g, '').trim() : (window.I18N && window.I18N.currentLang === 'cs' ? 'Extrahované' : 'Extracted');
        originalOpt.textContent = window.I18N && window.I18N.currentLang === 'cs' 
          ? `🌐 Původní typografie webu (${activeFont})` 
          : `🌐 Original web typography (${activeFont})`;
      }
    }

    _bindModals() {
      const modal = document.getElementById('modal-import');
      const closeBtn = document.getElementById('modal-import-close');
      const btnExecuteImport = document.getElementById('btn-execute-import');

      closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });

      const selTestSite = document.getElementById('sel-import-test-site');
      if (selTestSite && typeof GlobalBenchmarkRegistry !== 'undefined') {
        const categories = GlobalBenchmarkRegistry.getCategories();
        const allBenchmarks = GlobalBenchmarkRegistry.getAll();
        categories.forEach(cat => {
          const group = document.createElement('optgroup');
          group.label = cat.name;
          const items = allBenchmarks.filter(b => b.category === cat.key);
          items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.styleTokens.sourceHost || item.id} — ${item.title.substring(0, 36)}...`;
            group.appendChild(opt);
          });
          selTestSite.appendChild(group);
        });

        const testSiteInfoBox = document.getElementById('test-site-info-box');
        const testSiteInfoTitle = document.getElementById('test-site-info-title');
        const testSiteInfoLink = document.getElementById('test-site-info-link');
        const btnLoadOfflineSample = document.getElementById('btn-load-offline-sample');
        const btnFetchLiveSample = document.getElementById('btn-fetch-live-sample');
        const linkDirectUrlExternal = document.getElementById('link-direct-url-external');

        selTestSite.addEventListener('change', () => {
          const sampleId = selTestSite.value;
          if (!sampleId) {
            if (testSiteInfoBox) testSiteInfoBox.style.display = 'none';
            return;
          }
          const sample = GlobalBenchmarkRegistry.find(sampleId) || ContentExtractor.getSampleArticles().find(s => s.id === sampleId);
          if (sample) {
            if (urlInputEl) {
              urlInputEl.value = sample.sourceUrl;
              urlInputEl.focus();
            }
            if (testSiteInfoTitle) testSiteInfoTitle.textContent = sample.title;
            if (testSiteInfoLink) {
              testSiteInfoLink.href = sample.sourceUrl;
              testSiteInfoLink.textContent = `🔗 ${sample.sourceUrl} ↗`;
            }
            if (testSiteInfoBox) testSiteInfoBox.style.display = 'block';
            if (linkDirectUrlExternal) {
              linkDirectUrlExternal.href = sample.sourceUrl;
              linkDirectUrlExternal.style.display = 'inline';
            }
          }
        });

        btnLoadOfflineSample?.addEventListener('click', () => {
          const sampleId = selTestSite.value;
          if (!sampleId) return;
          const sample = GlobalBenchmarkRegistry.find(sampleId) || ContentExtractor.getSampleArticles().find(s => s.id === sampleId);
          if (sample) {
            let cleanHtml = sample.htmlContent;
            if (!cleanHtml && sample.rawHtml) {
              const sanitized = ContentExtractor.sanitizeRawHTML(sample.rawHtml, sample.sourceUrl, true);
              cleanHtml = typeof sanitized === 'string' ? sanitized : (sanitized?.htmlContent || sample.rawHtml);
            }
            this.chapterManager.addChapter(sample.title, cleanHtml, sample.sourceUrl, {}, sample.styleTokens);
            if (sample.styleTokens) {
              this._applyStyleTokens(sample.styleTokens);
            }
            this._syncWebStyleDropdowns();
            this.repaginate();
            modal?.classList.remove('open');
            this._showToast(window.I18N ? window.I18N.t('toasts.sample_inserted', { title: sample.title }) : `Quick sample "${sample.title}" was inserted`);
          }
        });

        btnFetchLiveSample?.addEventListener('click', () => {
          btnExecuteImport?.click();
        });
      }

      const urlInputEl = document.getElementById('import-url-input');
      const textInputEl = document.getElementById('import-text-input');
      const linkDirectUrlExternal = document.getElementById('link-direct-url-external');

      urlInputEl?.addEventListener('input', () => {
        const u = urlInputEl.value.trim();
        if (linkDirectUrlExternal) {
          if (u.startsWith('http://') || u.startsWith('https://')) {
            linkDirectUrlExternal.href = u;
            linkDirectUrlExternal.style.display = 'inline';
          } else {
            linkDirectUrlExternal.style.display = 'none';
          }
        }
      });

      urlInputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnExecuteImport?.click();
        }
      });

      btnExecuteImport?.addEventListener('click', async () => {
        const preserveStyles = document.getElementById('chk-preserve-web-styles')?.checked ?? true;

        const urlInput = urlInputEl?.value.trim() || '';
        const textInput = textInputEl?.value.trim() || '';

        if (urlInput) {
          btnExecuteImport.textContent = window.I18N ? window.I18N.t('modal_import.loading') : '⏳ Downloading from web...';
          btnExecuteImport.disabled = true;
          try {
            const parsed = await ContentExtractor.fetchFromUrl(urlInput, preserveStyles);
            
            this.chapterManager.addChapter(parsed.title, parsed.htmlContent, urlInput, {}, parsed.styleTokens);
            if (parsed.styleTokens) {
              this._applyStyleTokens(parsed.styleTokens);
            }
            this._syncWebStyleDropdowns();
            modal?.classList.remove('open');
            if (urlInputEl) urlInputEl.value = '';
            this._showToast(window.I18N ? window.I18N.t('toasts.article_loaded') : 'Article was successfully loaded from the web');

            // 1. Initial immediate layout
            this.repaginate();

            // 2. Await web fonts ready
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(() => {
                setTimeout(() => {
                  if (!this._isRepaginating) this.repaginate();
                }, 120);
              });
            }

            // 3. Timed layout refinement passes
            setTimeout(() => {
              if (!this._isRepaginating) this.repaginate();
            }, 450);
            setTimeout(() => {
              if (!this._isRepaginating) this.repaginate();
            }, 1200);
          } catch (err) {
            alert(err.message);
          } finally {
            btnExecuteImport.textContent = window.I18N ? window.I18N.t('modal_import.execute') : 'Import and Typeset';
            btnExecuteImport.disabled = false;
          }
        } else if (textInput) {
          const parsed = ContentExtractor.parseMarkdownOrHTML(textInput, '', preserveStyles);
          this.chapterManager.addChapter(parsed.title, parsed.htmlContent, '');
          modal?.classList.remove('open');
          if (textInputEl) textInputEl.value = '';
          this._showToast(window.I18N ? window.I18N.t('toasts.text_inserted') : 'Text was inserted and typeset');
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
      this._syncWebStyleDropdowns();
      const treeList = document.getElementById('chapter-tree-list');
      if (!treeList) return;
      treeList.innerHTML = '';

      const countBadge = document.getElementById('stat-chapter-count');
      if (countBadge) {
        if (window.I18N) {
          countBadge.textContent = chapters.length === 1 
            ? window.I18N.t('chapters.count_singular', { n: 1 }) 
            : window.I18N.t('chapters.count_plural', { n: chapters.length });
        } else {
          countBadge.textContent = `${chapters.length} chapters`;
        }
      }

      chapters.forEach((ch, idx) => {
        const item = document.createElement('div');
        item.className = `chapter-item ${ch.id === activeId ? 'active' : ''}`;
        const moveUpTitle = window.I18N ? window.I18N.t('chapters.move_up') : 'Move up';
        const moveDownTitle = window.I18N ? window.I18N.t('chapters.move_down') : 'Move down';
        const deleteTitle = window.I18N ? window.I18N.t('chapters.delete') : 'Delete chapter';
        item.innerHTML = `
          <span class="chapter-handle">⠿</span>
          <span class="chapter-badge">#${idx + 1}</span>
          <span class="chapter-name">${this.chapterManager._escapeHTML(ch.title)}</span>
          <div class="chapter-actions">
            <button class="chapter-btn-icon btn-move-up" title="${moveUpTitle}">▲</button>
            <button class="chapter-btn-icon btn-move-down" title="${moveDownTitle}">▼</button>
            <button class="chapter-btn-icon btn-del-chap" title="${deleteTitle}">&times;</button>
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
          const isCs = window.I18N && window.I18N.currentLang === 'cs';
          const confirmMsg = isCs ? `Opravdu smazat kapitolu "${ch.title}"?` : `Are you sure you want to delete chapter "${ch.title}"?`;
          if (confirm(confirmMsg)) {
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

      this._showToast(window.I18N ? window.I18N.t('toasts.project_saved') : 'Project was saved to .urlprint file');
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
            this._showToast(window.I18N ? window.I18N.t('toasts.project_loaded', { title: data.title || file.name }) : `Project "${data.title || file.name}" was loaded successfully`);
          }
        } catch (err) {
          alert((window.I18N ? window.I18N.t('toasts.file_read_error') : 'Error reading file: ') + err.message);
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
        const emptyTitle = window.I18N ? window.I18N.t('modal_projects.empty_title') : 'No saved projects in history';
        const emptyDesc = window.I18N ? window.I18N.t('modal_projects.empty_desc') : 'Save the current project or upload a .urlprint file from your computer.';
        historyList.innerHTML = `
          <div class="empty-history-state">
            <div class="empty-history-icon">📁</div>
            <div style="font-weight: 700; font-size: 13px;">${this.chapterManager._escapeHTML(emptyTitle)}</div>
            <div style="font-size: 11px;">${this.chapterManager._escapeHTML(emptyDesc)}</div>
          </div>
        `;
        return;
      }

      history.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const dateStr = new Date(p.savedAt).toLocaleString(window.I18N && window.I18N.currentLang === 'cs' ? 'cs-CZ' : 'en-US');
        const chapCountStr = window.I18N ? window.I18N.t('modal_projects.chapters_count', { n: p.chapters?.length || 1 }) : `${p.chapters?.length || 1} chapters`;
        const openBtnText = window.I18N ? window.I18N.t('modal_projects.card_open') : 'Open';
        const deleteBtnTitle = window.I18N ? window.I18N.t('modal_projects.card_delete_title') : 'Delete from history';

        card.innerHTML = `
          <div class="project-card-info">
            <div class="project-card-title">${this.chapterManager._escapeHTML(p.title)}</div>
            <div class="project-card-meta">
              <span>📅 ${dateStr}</span>
              <span>📑 ${chapCountStr}</span>
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn-card-open">${openBtnText}</button>
            <button class="btn-card-delete" title="${deleteBtnTitle}">&times;</button>
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
          this._showToast(window.I18N ? window.I18N.t('toasts.project_opened', { title: p.title }) : `Project "${p.title}" was opened`);
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
        const confirmClear = window.I18N ? window.I18N.t('dialogs.confirm_clear_history') : 'Are you sure you want to clear the entire project history?';
        if (confirm(confirmClear)) {
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

  window.ContentExtractor = ContentExtractor;
  window.QRGenerator = QRGenerator;
  window.PaginationEngine = PaginationEngine;
  window.TOCGenerator = TOCGenerator;
  window.ChapterManager = ChapterManager;
  window.ProjectStorage = ProjectStorage;
  window.URLPrinterApp = URLPrinterApp;

  window.addEventListener('DOMContentLoaded', () => {
    if (window.APP_VERSION) {
      const badge = document.getElementById('app-version-badge');
      if (badge) badge.textContent = 'v' + window.APP_VERSION;
    }
    if (document.getElementById('app-main-layout')) {
      window.app = new URLPrinterApp();
    }
  });

})();


