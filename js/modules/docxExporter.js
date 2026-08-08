/* ==========================================================================
   URL PRINTER - DOCX / MICROSOFT WORD OPENXML EXPORTER
   Zero-dependency pure-JS OpenXML packager with semantic heading styles
   ========================================================================== */

export class DocxExporter {
  /**
   * Generates and downloads an editable .docx file from the document HTML
   */
  static exportToDocx(title, containerElement) {
    const safeTitle = (title || 'Dokument').replace(/[^a-zA-Z0-9_\u00C0-\u017F\s-]/g, '').trim() || 'URL_Printer_Export';
    
    // Parse DOM elements into Word XML Paragraphs & Tables
    const bodyXml = this._buildDocumentXml(containerElement);
    const stylesXml = this._buildStylesXml();
    const contentTypesXml = this._buildContentTypesXml();
    const relsXml = this._buildRelsXml();
    const docRelsXml = this._buildDocRelsXml();

    // Package into zip file
    const zip = new SimpleZip();
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', relsXml);
    zip.file('word/_rels/document.xml.rels', docRelsXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('word/document.xml', bodyXml);

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

  static _buildDocumentXml(container) {
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body>
    `;

    const elements = container.querySelectorAll('h1, h2, h3, p, ul, ol, blockquote, table, .doc-callout, .doc-notes-area');
    
    elements.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent.trim();
      if (!text && tag !== 'table') return;

      if (tag === 'h1' || el.classList.contains('doc-h1')) {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
            <w:r><w:t>${this._escapeXml(text)}</w:t></w:r>
          </w:p>
        `;
      } else if (tag === 'h2' || el.classList.contains('doc-h2')) {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
            <w:r><w:t>${this._escapeXml(text)}</w:t></w:r>
          </w:p>
        `;
      } else if (tag === 'h3' || el.classList.contains('doc-h3')) {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Heading3"/></w:pPr>
            <w:r><w:t>${this._escapeXml(text)}</w:t></w:r>
          </w:p>
        `;
      } else if (tag === 'blockquote') {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Quote"/></w:pPr>
            <w:r><w:rPr><w:i/></w:rPr><w:t>${this._escapeXml(text)}</w:t></w:r>
          </w:p>
        `;
      } else if (el.classList.contains('doc-callout')) {
        const header = el.querySelector('.doc-callout-header')?.textContent || 'Upozornění';
        const bodyText = el.querySelector('p')?.textContent || text;
        xml += `
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:left w:val="single" w:sz="24" w:space="12" w:color="0EA5E9"/>
              </w:pBdr>
              <w:shd w:val="clear" w:color="auto" w:fill="F0F9FF"/>
            </w:pPr>
            <w:r><w:rPr><w:b/><w:color w:val="0369A1"/></w:rPr><w:t>${this._escapeXml(header)}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:left w:val="single" w:sz="24" w:space="12" w:color="0EA5E9"/>
              </w:pBdr>
              <w:shd w:val="clear" w:color="auto" w:fill="F0F9FF"/>
            </w:pPr>
            <w:r><w:t>${this._escapeXml(bodyText)}</w:t></w:r>
          </w:p>
        `;
      } else if (el.classList.contains('doc-notes-area')) {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Normal"/></w:pPr>
            <w:r><w:rPr><w:i/><w:color w:val="64748B"/></w:rPr><w:t>[Prostor pro studentské zápisky a poznámky]</w:t></w:r>
          </w:p>
          <w:p><w:r><w:t>__________________________________________________________________</w:t></w:r></w:p>
          <w:p><w:r><w:t>__________________________________________________________________</w:t></w:r></w:p>
          <w:p><w:r><w:t>__________________________________________________________________</w:t></w:r></w:p>
        `;
      } else if (tag === 'p') {
        xml += `
          <w:p>
            <w:pPr><w:pStyle w:val="Normal"/></w:pPr>
            <w:r><w:t>${this._escapeXml(text)}</w:t></w:r>
          </w:p>
        `;
      }
    });

    xml += `
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
        </w:sectPr>
      </w:body>
    </w:document>
    `;
    return xml;
  }

  static _buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:docDefaults>
        <w:rPrDefault>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
            <w:sz w:val="22"/>
            <w:color w:val="1E293B"/>
          </w:rPr>
        </w:rPrDefault>
      </w:docDefaults>
      <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
        <w:name w:val="Normal"/>
        <w:pPr><w:spacing w:after="160" w:line="280" w:lineRule="auto"/></w:pPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:pPr><w:spacing w:before="360" w:after="160"/><w:keepNext/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="36"/>
          <w:color w:val="0F766E"/>
        </w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading2">
        <w:name w:val="heading 2"/>
        <w:pPr><w:spacing w:before="240" w:after="120"/><w:keepNext/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="28"/>
          <w:color w:val="0369A1"/>
        </w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Heading3">
        <w:name w:val="heading 3"/>
        <w:pPr><w:spacing w:before="180" w:after="100"/><w:keepNext/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="24"/>
          <w:color w:val="334155"/>
        </w:rPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Quote">
        <w:name w:val="Quote"/>
        <w:pPr><w:spacing w:before="160" w:after="160"/><w:ind w:left="400"/></w:pPr>
        <w:rPr><w:i/><w:color w:val="475569"/></w:rPr>
      </w:style>
    </w:styles>`;
  }

  static _buildContentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    </Types>`;
  }

  static _buildRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`;
  }

  static _buildDocRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>`;
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

/**
 * Lightweight in-browser ZIP File packager
 */
class SimpleZip {
  constructor() {
    this.files = {};
  }

  file(name, content) {
    this.files[name] = content;
  }

  generateBlob() {
    // Generate valid uncompressed standard ZIP archive
    const entries = [];
    let offset = 0;

    // Helper to string bytes
    const encoder = new TextEncoder();

    Object.keys(this.files).forEach(filename => {
      const data = encoder.encode(this.files[filename]);
      const nameBytes = encoder.encode(filename);

      // Local file header
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); // Local file header signature
      view.setUint16(4, 20, true);         // Version needed
      view.setUint16(6, 0, true);          // General purpose bit flag
      view.setUint16(8, 0, true);          // Compression method (0 = store)
      view.setUint16(10, 0, true);         // Mod time
      view.setUint16(12, 0, true);         // Mod date
      view.setUint32(14, this._crc32(data), true); // CRC-32
      view.setUint32(18, data.length, true);       // Compressed size
      view.setUint32(22, data.length, true);       // Uncompressed size
      view.setUint16(26, nameBytes.length, true);  // File name length
      view.setUint16(28, 0, true);                 // Extra field length
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

    // Central Directory
    const cdEntries = [];
    let cdSize = 0;
    entries.forEach(e => {
      const cd = new Uint8Array(46 + e.nameBytes.length);
      const view = new DataView(cd.buffer);
      view.setUint32(0, 0x02014b50, true); // Central directory signature
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

    // End of Central Directory Record
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

    // Merge parts into single Blob
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
