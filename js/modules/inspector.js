/* ==========================================================================
   URL PRINTER - BLOCK INSPECTOR & LIVE ELEMENT CONTROLLER
   Right-sidebar property controls for selected canvas blocks & inline actions
   ========================================================================== */

export class BlockInspector {
  constructor(panelContainer, onBlockModified) {
    this.container = panelContainer;
    this.onBlockModified = onBlockModified || (() => {});
    this.selectedElement = null;
    this._initUI();
  }

  _initUI() {
    this.container.innerHTML = `
      <div class="inspector-header">
        <span>🔍 Inspektor vybraného bloku</span>
        <span id="inspector-badge" class="brand-badge">PLÁTNO</span>
      </div>
      <div class="inspector-body">
        <div id="inspector-empty" style="color: #64748b; font-size: 11px; text-align: center; padding: 20px 0;">
          Klikněte na jakýkoliv text, nadpis, box či obrázek na plátně pro okamžitou úpravu parametrů.
        </div>

        <div id="inspector-controls" style="display: none; flex-direction: column; gap: 14px;">
          <!-- Block Type Selector -->
          <div class="control-group">
            <label class="control-label">Typ elementu</label>
            <select id="insp-tag-select" class="control-select">
              <option value="p">Odstavec textu (p)</option>
              <option value="h1">Hlavní nadpis (H1)</option>
              <option value="h2">Podnadpis sekce (H2)</option>
              <option value="h3">Menší podnadpis (H3)</option>
              <option value="blockquote">Citace / Blok textu</option>
              <option value="callout-task">✏️ Výukový úkol</option>
              <option value="callout-def">💡 Definice pojmu</option>
              <option value="callout-solution">🔍 Vzorové řešení</option>
              <option value="callout-formula">📐 Matematický vzorec</option>
              <option value="callout-warn">⚠️ Upozornění</option>
              <option value="notes-lines">📝 Linkovaný sešit (7mm)</option>
              <option value="notes-dots">⊞ Tečkovaná mřížka (5mm)</option>
            </select>
          </div>

          <!-- Alignment & Formatting -->
          <div class="control-group">
            <label class="control-label">Zarovnání textu</label>
            <div class="control-grid-3">
              <button class="btn btn-secondary" id="insp-align-left" title="Doleva">⬅️ Vlevo</button>
              <button class="btn btn-secondary" id="insp-align-center" title="Na střed">↔️ Střed</button>
              <button class="btn btn-secondary" id="insp-align-justify" title="Do bloku">📄 Blok</button>
            </div>
          </div>

          <!-- Page Break Before Toggle -->
          <div class="control-group">
            <label class="control-label">Zalomení strany (Page Break)</label>
            <button class="btn btn-secondary" id="insp-toggle-break" style="width: 100%; justify-content: flex-start;">
              <span>✂️ Tvrzené zalomení před blokem</span>
            </button>
          </div>

          <!-- Block Actions: Duplicate & Delete -->
          <div class="control-group" style="margin-top: 10px;">
            <div class="control-grid-2">
              <button class="btn btn-secondary" id="insp-duplicate-btn">📋 Duplikovat</button>
              <button class="btn btn-secondary" id="insp-delete-btn" style="color: #f87171; border-color: #7f1d1d;">🗑️ Odstranit</button>
            </div>
          </div>
        </div>

        <!-- Quick Educational Injectors -->
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
    const tagSelect = this.container.querySelector('#insp-tag-select');
    tagSelect.addEventListener('change', () => {
      if (!this.selectedElement) return;
      this._transformBlockType(this.selectedElement, tagSelect.value);
      this.onBlockModified();
    });

    this.container.querySelector('#insp-align-left').addEventListener('click', () => {
      if (this.selectedElement) {
        this.selectedElement.style.textAlign = 'left';
        this.onBlockModified();
      }
    });

    this.container.querySelector('#insp-align-center').addEventListener('click', () => {
      if (this.selectedElement) {
        this.selectedElement.style.textAlign = 'center';
        this.onBlockModified();
      }
    });

    this.container.querySelector('#insp-align-justify').addEventListener('click', () => {
      if (this.selectedElement) {
        this.selectedElement.style.textAlign = 'justify';
        this.onBlockModified();
      }
    });

    this.container.querySelector('#insp-toggle-break').addEventListener('click', () => {
      if (this.selectedElement) {
        const current = this.selectedElement.getAttribute('data-break-before') === 'true';
        this.selectedElement.setAttribute('data-break-before', (!current).toString());
        this.selectedElement.style.breakBefore = !current ? 'page' : 'auto';
        this.onBlockModified();
      }
    });

    this.container.querySelector('#insp-duplicate-btn').addEventListener('click', () => {
      if (this.selectedElement && this.selectedElement.parentNode) {
        const clone = this.selectedElement.cloneNode(true);
        this.selectedElement.parentNode.insertBefore(clone, this.selectedElement.nextSibling);
        this.selectElement(clone);
        this.onBlockModified();
      }
    });

    this.container.querySelector('#insp-delete-btn').addEventListener('click', () => {
      if (this.selectedElement && this.selectedElement.parentNode) {
        this.selectedElement.remove();
        this.deselect();
        this.onBlockModified();
      }
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

    this.selectedElement = el;
    this.selectedElement.classList.add('active-selected');

    const emptyMsg = this.container.querySelector('#inspector-empty');
    const controls = this.container.querySelector('#inspector-controls');
    const badge = this.container.querySelector('#inspector-badge');

    emptyMsg.style.display = 'none';
    controls.style.display = 'flex';

    // Update tag selection
    const tag = el.tagName.toLowerCase();
    const tagSelect = this.container.querySelector('#insp-tag-select');
    badge.textContent = tag.toUpperCase();

    if (el.classList.contains('doc-callout-task')) tagSelect.value = 'callout-task';
    else if (el.classList.contains('doc-callout-def')) tagSelect.value = 'callout-def';
    else if (el.classList.contains('doc-callout-solution')) tagSelect.value = 'callout-solution';
    else if (el.classList.contains('doc-callout-formula')) tagSelect.value = 'callout-formula';
    else if (el.classList.contains('doc-callout-warn')) tagSelect.value = 'callout-warn';
    else if (el.querySelector('.doc-notes-lines')) tagSelect.value = 'notes-lines';
    else if (el.querySelector('.doc-notes-dots')) tagSelect.value = 'notes-dots';
    else tagSelect.value = tag;
  }

  deselect() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('active-selected');
      this.selectedElement = null;
    }
    this.container.querySelector('#inspector-empty').style.display = 'block';
    this.container.querySelector('#inspector-controls').style.display = 'none';
    this.container.querySelector('#inspector-badge').textContent = 'PLÁTNO';
  }

  _transformBlockType(el, targetType) {
    const text = el.textContent.trim() || 'Text bloku';

    if (targetType.startsWith('callout-')) {
      const type = targetType.replace('callout-', '');
      const icons = { task: '✏️ Úkol', def: '💡 Definice', solution: '🔍 Řešení', formula: '📐 Vzorec', warn: '⚠️ Upozornění' };
      el.className = `doc-callout doc-callout-${type} doc-element`;
      el.setAttribute('data-block-type', 'callout');
      el.innerHTML = `<div class="doc-callout-header">${icons[type] || 'Poznámka'}</div><p>${text}</p>`;
    } else if (targetType === 'notes-lines') {
      el.className = 'doc-notes-area doc-element';
      el.setAttribute('data-block-type', 'notes');
      el.innerHTML = `<div class="doc-notes-title"><span>Linkované řádky pro zápisky (7mm)</span><span>Zápisník</span></div><div class="doc-notes-lines"></div>`;
    } else if (targetType === 'notes-dots') {
      el.className = 'doc-notes-area doc-element';
      el.setAttribute('data-block-type', 'notes');
      el.innerHTML = `<div class="doc-notes-title"><span>Tečkovaná plocha pro schémata (5mm)</span><span>Nákresník</span></div><div class="doc-notes-dots"></div>`;
    } else {
      const newEl = document.createElement(targetType);
      newEl.className = `doc-element doc-${targetType}`;
      newEl.setAttribute('contenteditable', 'true');
      newEl.innerHTML = text;
      el.replaceWith(newEl);
      this.selectElement(newEl);
    }
  }
}
