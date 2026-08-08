/* ==========================================================================
   URL PRINTER - CHAPTER TREE MANAGER
   Multi-URL batch management, chapter reordering, merging, covers and hierarchy
   ========================================================================== */

export class ChapterManager {
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
    const id = 'chap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const chapter = {
      id: id,
      title: title || 'Nová kapitola',
      subtitle: metadata.subtitle || '',
      sourceUrl: sourceUrl || '',
      htmlContent: htmlContent || '<p class="doc-element">Obsah nové kapitoly...</p>',
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

    // Update order values
    this.chapters.forEach((c, i) => c.order = i + 1);
    this._notify();
  }

  updateChapter(id, updates) {
    const ch = this.chapters.find(c => c.id === id);
    if (ch) {
      Object.assign(ch, updates);
      this._notify();
    }
  }

  mergeWithNext(id) {
    const idx = this.chapters.findIndex(c => c.id === id);
    if (idx === -1 || idx >= this.chapters.length - 1) return;

    const current = this.chapters[idx];
    const next = this.chapters[idx + 1];

    current.htmlContent += `\n<h2 class="doc-element doc-h2">${next.title}</h2>\n` + next.htmlContent;
    this.chapters.splice(idx + 1, 1);
    this._notify();
  }

  getActiveChapter() {
    return this.chapters.find(c => c.id === this.activeChapterId) || this.chapters[0] || null;
  }

  setActiveChapter(id) {
    this.activeChapterId = id;
    this._notify();
  }

  getFullMergedHTML(options = {}) {
    let fullHtml = '';

    this.chapters.forEach((ch, idx) => {
      // Optional Chapter Title Banner / Cover
      if (ch.hasCover || (options.includeChapterCovers && idx > 0)) {
        fullHtml += `
          <div class="chapter-cover-block doc-element" data-block-type="chapter-cover">
            <div class="chapter-cover-number">KAPITOLA ${idx + 1}</div>
            <h1 class="chapter-cover-title">${ch.title}</h1>
            ${ch.sourceUrl ? `<div class="chapter-cover-meta">Zdroj: ${ch.sourceUrl}</div>` : ''}
          </div>
        `;
      } else if (idx > 0 && ch.breakBefore) {
        fullHtml += `<div class="doc-page-break doc-element" data-block-type="page-break"><span>✂️ Zlom stránky — Nová kapitola</span></div>`;
      }

      fullHtml += ch.htmlContent;
    });

    return fullHtml;
  }
}
