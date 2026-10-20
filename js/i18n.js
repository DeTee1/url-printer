/* ==========================================================================
   URL PRINTER STUDIO - INTERNATIONALIZATION (i18n) ENGINE
   Supports English (en) [Default] and Czech (cs) with live language switching.
   ========================================================================== */

(function () {
  'use strict';

  const translations = {
    en: {
      meta: {
        title: "URL Printer Studio — Professional Typesetting, Workbooks & Web-to-Print",
        description: "Controlled printing, editing and offline archiving of any web pages. Creation of workbooks, study notes, e-books with real A4/A5 layout and QR linker."
      },
      topbar: {
        brand: "URL Printer",
        brand_badge: "Studio",
        btn_new: "New",
        btn_new_title: "Start new clean project (Reset)",
        btn_open: "Open",
        btn_open_title: "Open saved project or history (*.urlprint)",
        btn_save: "Save",
        btn_save_title: "Save project to file (*.urlprint)",
        btn_inspector: "Inspector",
        btn_inspector_title: "Open interactive style, HTML and typography inspector",
        btn_tests: "Tests",
        btn_tests_title: "Open automated test and diagnostic routine",
        btn_undo_title: "Undo (Ctrl+Z)",
        btn_redo_title: "Redo (Ctrl+Y)",
        zoom_out_title: "Zoom out document view",
        zoom_in_title: "Zoom in document view",
        zoom_fit_title: "Fit preview to window (Fit to Window)",
        page_prev_title: "Previous page",
        page_next_title: "Next page",
        page_label: "Page",
        page_of: "of",
        page_jump_title: "Enter page number and press Enter for instant jump",
        view_spread_title: "Toggle two-page book spread side-by-side",
        view_spread_tooltip: "Two-page spread",
        view_fullscreen_title: "Fullscreen mode (Zen)",
        view_fullscreen_tooltip: "Fullscreen",
        btn_import: "Import",
        btn_import_title: "Load web page from URL or paste text",
        btn_word: "Word (.docx)",
        btn_word_title: "Export document to Microsoft Word (.docx) preserving headings and images",
        btn_print: "Print / PDF",
        btn_print_title: "Open print dialog and export to PDF",
        left_toggle_title: "Show / hide left control panel",
        right_toggle_title: "Show / hide right properties panel",
        lang_switcher_title: "Language / Jazyk"
      },
      tabs: {
        chapters: "Chapters & Elements",
        layout: "Layout & Margins",
        themes: "Themes & Colors"
      },
      chapters: {
        tree_title: "Document Chapter Tree",
        count_zero: "0 chapters",
        count_singular: "{n} chapter",
        count_plural: "{n} chapters",
        btn_add: "Add new chapter / URL",
        move_up: "Move up",
        move_down: "Move down",
        delete: "Delete chapter",
        default_title: "New Chapter",
        default_content: "Content of the new chapter..."
      },
      insert: {
        title: "Insert Element",
        separator_name: "Separator",
        separator_desc: "Line, space or ornament",
        separator_title: "Insert adjustable separator (space, line, ornament)",
        note_name: "Note / Callout Box",
        note_desc: "Task, definition or summary",
        note_title: "Insert formatted note box (Task, Definition, Warning)",
        lines_name: "Lined Rows",
        lines_desc: "Lines for notes (7 mm)",
        lines_title: "Insert lined area for handwritten notes",
        dots_name: "Dotted Grid",
        dots_desc: "Grid for sketches (5 mm)",
        dots_title: "Insert dotted grid for sketching"
      },
      layout: {
        title: "Page Format & Parameters",
        paper_format: "Paper Format",
        format_a4: "A4 (210 × 297 mm — Standard Sheet)",
        format_b5: "B5 (176 × 250 mm — Book / Script)",
        format_a5: "A5 (148 × 210 mm — Pocket Book / Workbook)",
        format_letter: "US Letter (216 × 279 mm — Magazine)",
        orientation: "Orientation",
        orient_portrait: "Portrait (Vertical)",
        orient_landscape: "Landscape (Horizontal)",
        columns: "Number of Columns",
        col_1: "1 column (Reader / Workbook)",
        col_2: "2 columns (Compact Script / Magazine)",
        col_3: "3 columns (Newspaper / Bulletin / Cheat Sheet)",
        margins_title: "Page Margins (mm)",
        mirror_margins: "Mirror margins for book binding (even / odd)",
        margin_top: "Top Margin",
        margin_bottom: "Bottom Margin",
        margin_left: "Left Margin",
        margin_right: "Right Margin",
        margin_inner: "Inner Margin (Binding)",
        margin_outer: "Outer Margin",
        hf_title: "Headers & Footers",
        hf_diff_odd_even: "Different headers and footers for odd and even pages",
        header_enable: "Top Header",
        header_left_ph: "Left (e.g. {chapter_title})",
        header_right_ph: "Right",
        footer_enable: "Bottom Footer",
        footer_left_ph: "Left",
        footer_right_ph: "Right (e.g. {url})",
        footer_default_left: "Created with URL Printer Studio",
        odd_pages: "Odd pages (Right):",
        even_pages: "Even pages (Left):",
        hf_header_label: "Header (Left / Right):",
        hf_footer_label: "Footer (Left / Right):",
        page_num_title: "Page Numbering",
        page_num_pos: "Page Number Position",
        pos_footer_outer: "Footer: Outer margin (Odd right, Even left)",
        pos_footer_center: "Footer: Center",
        pos_footer_right: "Footer: Always right",
        pos_footer_left: "Footer: Always left (for right note column)",
        pos_header_outer: "Header: Outer margin (Odd right, Even left)",
        pos_header_center: "Header: Center",
        pos_none: "No page numbers",
        page_num_fmt: "Numbering Format",
        fmt_prefix: "Page X of Y",
        fmt_short: "p. X / Y",
        fmt_simple: "Number only (1, 2, 3...)",
        fmt_roman: "Roman numerals (I, II, III...)",
        toc_title: "Table of Contents (TOC)",
        toc_enable: "Generate automatic Table of Contents",
        toc_pos_after_title: "Position: After main heading (Intro)",
        toc_pos_standalone: "Position: Standalone opening page",
        toc_pos_end: "Position: At document end (Conclusion)",
        toc_pos_standalone_end: "Position: Standalone closing page",
        links_qr_title: "Hyperlinks & QR Codes",
        hide_links: "Hide hyperlinks (style as plain text)",
        enable_qr: "Generate offline SVG QR codes for audio & links",
        qr_size_label: "QR Code Box Size",
        qr_size_full: "Full (page width)",
        qr_size_medium: "Medium (column width)",
        qr_size_small: "Small (space-saving)",
        qr_size_minimal: "Minimal (QR only)",
        media_mode: "Media print mode",
        media_normal: "Full Color Print",
        media_grayscale: "Grayscale Images",
        media_toner: "Toner Saver Mode (B&W)",
        media_hide: "Hide Images for Maximum Savings"
      },
      themes: {
        title: "Templates & Print Styles",
        select_label: "Select typographic and layout template",
        group_web: "🌐 Extracted Web Styles",
        opt_web_original: "🌐 Original style from web (Active URL)",
        group_custom: "⭐ My Custom Templates",
        chk_apply_layout: "When selecting template, also apply page size, orientation and margins",
        reapply_btn: "📐 Restore Layout",
        reapply_btn_title: "Re-apply recommended paper size, orientation, columns and margins of this template",
        custom_title: "Custom Templates Management",
        btn_save_custom: "💾 Save current settings as template...",
        btn_save_web: "⭐ Save web style as permanent template",
        btn_export: "📤 Export (JSON)",
        btn_export_title: "Export custom templates to JSON file",
        btn_import: "📥 Import (JSON)",
        btn_import_title: "Import templates from JSON file",
        btn_delete: "🗑️ Delete selected custom template",
        typo_title: "Global Typography Parameters",
        font_size_label: "Base Font Size",
        line_height_label: "Line Height (Line-height)",
        letter_spacing_label: "Letter Spacing (Letter-spacing)",
        heading_scale_label: "Heading Scale (Heading Scale)",
        heading_margin_top_label: "Heading Top Margin",
        heading_margin_bot_label: "Heading Bottom Margin",
        p_margin_label: "Paragraph Spacing",
        reset_param_title: "Reset to template default value"
      },
      spec: {
        portrait: "Portrait ▯",
        landscape: "Landscape ▭",
        col_1: "1 column",
        col_2: "2 columns",
        col_3: "3 columns",
        margins_mirror: "Mirror margins ({left}/{right} mm)",
        margins_asym: "Asymmetric margins ({left} / {right} mm)",
        margins_sym: "Margins {top}/{left} mm",
        font: "Font {size} pt",
        dropcap: '<span class="template-spec-pill highlight">✨ Drop Cap</span>',
        widescreen: '<span class="template-spec-pill highlight">▭ Widescreen Layout</span>',
        book_format: '<span class="template-spec-pill highlight">📖 Book {format}</span>'
      },
      drawer: {
        toggle_title: "Open page thumbnails and table of contents",
        tab_thumbs: "Page Thumbnails",
        tab_toc: "Table of Contents (TOC)",
        close_title: "Close panel",
        page_label: "Page {page}",
        page_short: "p. {page}",
        no_headings: "No headings were found."
      },
      empty_workspace: {
        title: "No document loaded yet",
        desc: "Enter an article URL or paste text for controlled layout and printing.",
        btn: "➕ Import URL / Text"
      },
      inspector: {
        header_empty: "Block Properties",
        no_block_title: "No block selected",
        no_block_desc: "Click on any text, image or table on the page to display parameters.",
        header_tag: "Properties: <{tag}>",
        close_title: "Close panel",
        block_type: "Text Block Type",
        tag_h1: "H1 — Main Heading",
        tag_h2: "H2 — Section Heading",
        tag_h3: "H3 — Level 3 Subheading",
        tag_h4: "H4 — Minor Subheading",
        tag_p: "Paragraph",
        tag_blockquote: "Blockquote (Quote)",
        tag_pre: "Code / Monospace",
        color_style: "🎨 Text Color & Style",
        color_original: "(Original from web)",
        color_default: "(Default)",
        color_reset: "↺ Reset",
        alignment: "Element Alignment",
        align_left: "Align left",
        align_center: "Align center",
        align_right: "Align right",
        align_justify: "Justify text",
        font_size: "Font Size (pt / px)",
        img_adjust: "🖼️ Image Adjustments",
        img_size: "Image Size (10% – 200%)",
        img_border: "Border",
        img_shadow: "Shadow",
        qr_adjust: "📱 QR Code Box Settings",
        qr_box_variant: "Box Display Variant",
        qr_var_full: "↔️ Full (Page Width)",
        qr_var_medium: "▤ Medium (Column Width)",
        qr_var_small: "▫ Small (Space-Saving)",
        qr_var_minimal: "▪ Minimal (QR Only)",
        qr_scale: "QR Code Scale (50% – 200%)",
        qr_apply_all: "🔄 Apply this variant to all QR codes",
        break_before: "Break page before this block",
        manipulation: "Block Manipulation",
        move_up: "▲ Move Up",
        move_down: "▼ Move Down",
        duplicate: "📋 Duplicate",
        delete: "🗑️ Delete"
      },
      modal_import: {
        title: "Load Web Page or Text",
        tested_sites: "🧪 Verified Test Sites (100% functional live sites):",
        tested_sites_hint: "Select to insert URL",
        tested_sites_placeholder: "-- Select verified test site --",
        open_original: "🔗 Open original site in new window ↗",
        quick_sample: "⚡ Quick Sample",
        fetch_live: "🌐 Fetch Live from URL",
        url_label: "Enter article URL (Press Enter to import):",
        url_open_link: "Open entered URL ↗",
        url_placeholder: "e.g. https://en.wikipedia.org/wiki/Typography",
        text_label: "Or paste text / HTML / Markdown directly:",
        text_placeholder: "# Chapter title\n\nPaste text, tables, images or paragraphs...",
        run_tests: "🧪 Run automated test routine",
        cancel: "Cancel",
        execute: "Import and Typeset",
        loading: "⏳ Downloading from web..."
      },
      modal_projects: {
        title: "Project Management & History",
        load_file: "Load from file (*.urlprint)",
        save_current: "Save current project",
        clear_history: "Clear history",
        clear_history_title: "Delete all saved projects from history",
        recent_title: "Recently created and saved projects:",
        close: "Close",
        empty_title: "No saved projects in history",
        empty_desc: "Save the current project or upload a .urlprint file from your computer.",
        card_open: "Open",
        card_delete_title: "Delete from history",
        chapters_count: "{n} chapters"
      },
      drop_overlay: {
        title: "Drop .urlprint file here to load project immediately",
        desc: "Supported files: *.urlprint and *.json"
      },
      doc_toc: {
        title: "Table of Contents",
        empty: "Document does not contain any subheadings yet."
      },
      toasts: {
        docx_success: "📄 Document was successfully exported to Word",
        layout_applied: "📐 Page layout, size and margins applied",
        templates_imported: "📥 Custom templates imported successfully",
        font_size_reset: "↺ Font size reset to default",
        line_height_reset: "↺ Line height reset to default",
        letter_spacing_reset: "↺ Letter spacing reset to default",
        heading_scale_reset: "↺ Heading scale reset to default",
        heading_top_reset: "↺ Heading top margin reset to default",
        heading_bot_reset: "↺ Heading bottom margin reset to default",
        p_margin_reset: "↺ Paragraph spacing reset to default",
        separator_inserted: "✨ Separator was inserted",
        note_inserted: "✨ Note box was inserted",
        lines_inserted: "✨ Lined area was inserted",
        dots_inserted: "✨ Dotted grid was inserted",
        template_saved: '💾 Template "{name}" was saved with page layout',
        web_template_saved: '⭐ Web style template "{name}" was saved',
        template_deleted: "🗑️ Template was deleted",
        sample_inserted: '⚡ Quick sample "{title}" was inserted',
        article_loaded: "✅ Article was successfully loaded from the web",
        text_inserted: "✅ Text was inserted and typeset",
        project_saved: "💾 Project was saved to .urlprint file",
        project_loaded: '📂 Project "{title}" was loaded successfully',
        project_opened: '📂 Project "{title}" was opened',
        file_read_error: "Error reading file: "
      },
      dialogs: {
        confirm_new_project: "Create a new clean project? Unsaved changes will be discarded.",
        prompt_template_name: "Enter a name for the new template (e.g. My Modern Magazine):",
        confirm_delete_template: "Are you sure you want to delete this custom template?",
        confirm_clear_history: "Are you sure you want to clear the entire project history?"
      },
      presets: {
        groups: {
          newspaper: "📰 1. Vintage Newspaper",
          magazine: "✨ 2. Modern Magazine",
          kids_magazine: "🎈 3. Kids Magazine",
          antique_book: "📜 4. Antique Book",
          kids_book: "🧸 5. Kids Book",
          modern_book: "📖 6. Modern Book",
          design: "📐 7. Design Document",
          minimal: "⚪ 8. Minimalist Typography",
          blog: "💻 9. Web Blog",
          textbook: "🎓 10. Modern Textbook",
          fun_textbook: "🔬 11. Fun Textbook & Workbook",
          bulletin: "⚡ 12. Dynamic Bulletin",
          practical: "🌱 13. Practical & Eco Templates"
        },
        items: {
          'vintage-broadsheet': {
            name: "🗞️ Classic Broadsheet 1900",
            option: "Classic Broadsheet 1900 (A4 ↓ • 3 cols • 10 mm margins)",
            desc: "Dense 3-column newspaper layout on A4 with narrow 10mm margins, double lines, drop cap and sharply cropped photos."
          },
          'gazette-1920': {
            name: "🎩 Interwar Gazette (1920)",
            option: "Interwar Gazette (A4 ↔ Landscape • 3 cols • Art Deco frame)",
            desc: "Festive 3-column gazette on A4 LANDSCAPE with decorative double border, Roman numerals and serif Cinzel typeface."
          },
          'yellowed-press': {
            name: "📜 Period Evening Tabloid",
            option: "Period Evening Tabloid (A5 ↓ • 2 cols • inverted banner)",
            desc: "Compact A5 evening tabloid with 2 columns, inverted headline ribbons, stamp boxes and bold condensed typography."
          },
          'magazine-editorial': {
            name: "✨ New Yorker Editorial",
            option: "New Yorker Editorial (A4 ↓ • 2 cols • mirrored margins)",
            desc: "Vertical magazine layout on A4 (2 columns) with mirrored margins, prominent quotes and ruby accent lines."
          },
          'magazine-fashion': {
            name: "💎 Vogue Lookbook",
            option: "Vogue Lookbook (A4 ↔ Landscape • 2 cols • polaroid photos)",
            desc: "Fashion lookbook on A4 LANDSCAPE with airy 2-column layout, luxury high-contrast serif Playfair Display and polaroid photos."
          },
          'magazine-tech': {
            name: "⚡ Wired Tech Quarterly",
            option: "Wired Tech Quarterly (Letter ↓ • 3 cols • cyber-grid)",
            desc: "US Letter format with 3 columns, neon lime accents on dark navy background, monospace tags and data tables."
          },
          'kids-comic': {
            name: "🎈 Fun Comic & Quizzes",
            option: "Fun Comic & Quizzes (A4 ↔ Landscape • 2 cols • comic speech bubbles)",
            desc: "Children's comic album on A4 LANDSCAPE with rounded bubble frames, colorful headings and hand-drawn styling."
          },
          'kids-adventure': {
            name: "🧭 Adventure Expedition",
            option: "Adventure Expedition (A4 ↓ • 2 cols • map layout)",
            desc: "Children's adventure magazine on A4 with safari tones, explorer cards, dotted dividers and compass icons."
          },
          'kids-explorer': {
            name: "🔍 Pocket Naturalist Notebook",
            option: "Pocket Naturalist Notebook (A5 ↓ • 1 col • field cards)",
            desc: "Field diary on A5 with 1 column, ruled borders, botanical green accents and observation checklist boxes."
          },
          'antique-manuscript': {
            name: "👑 Illuminated Medieval Codex",
            option: "Illuminated Medieval Codex (A4 ↓ • 2 cols • parchment & border)",
            desc: "Medieval illuminated manuscript on A4 with aged parchment tint, Gothic ornaments, ornate drop caps and classic proportions."
          },
          'antique-victorian': {
            name: "🕯️ Victorian Novel",
            option: "Victorian Novel (A5 ↓ • 1 col • mirrored book binding)",
            desc: "Victorian novel layout on A5 with 1 column, generous inner gutter for binding, Cormorant Garamond typography and asterisks."
          },
          'antique-press': {
            name: "🪶 First Printed Edition",
            option: "First Printed Edition (B5 ↓ • 1 col • clean letterpress)",
            desc: "Noble B5 book format with 1 column, pure letterpress typesetting without headers, classic margins and warm paper hue."
          },
          'kids-storybook': {
            name: "🧸 Illustrated Fairy Tale",
            option: "Illustrated Fairy Tale (A5 ↔ Landscape • 1 col • pastel album)",
            desc: "Bedtime fairy tale album on A5 LANDSCAPE with pastel borders, large friendly font and warm peach tones."
          },
          'kids-easy-reader': {
            name: "📚 First Reader / Dyslexia-Friendly",
            option: "First Reader / Dyslexia-Friendly (A4 ↓ • 14pt • left aligned)",
            desc: "Spacious typography on A4 with 14pt base size, 1.85 line-height, left alignment and high contrast for young learners."
          },
          'kids-fairytale': {
            name: "✨ Golden Book of Fairy Tales",
            option: "Golden Book of Fairy Tales (B5 ↓ • 1 col • gold decorative frame)",
            desc: "Premium fairy tale treasury on B5 with decorative gold filigree border, royal purple accents and elegant classic serif."
          },
          'book-modern-novel': {
            name: "📖 Contemporary Novel",
            option: "Contemporary Novel (A5 ↓ • 1 col • Tschichold margin canon)",
            desc: "Standard A5 book format designed according to Jan Tschichold's golden canon: 1 column, 22mm outer margin and elegant Newsreader serif."
          },
          'book-nordic-minimal': {
            name: "❄️ Nordic Monograph",
            option: "Nordic Monograph (B5 ↓ • 1 col • 36mm outer margin)",
            desc: "Scandinavian architectural monograph on B5 with wide 36mm outer margins for margin notes, subtle gray text and crisp Inter sans."
          },
          'book-paperback': {
            name: "🧳 Pocket Paperback",
            option: "Pocket Paperback (A5 ↓ • 1 col • compact 11–15 mm margins)",
            desc: "Space-saving travel paperback on A5 with 11-15mm margins, tight line-height and maximum words per page."
          },
          'design-swiss-grid': {
            name: "📐 Swiss Grid (Müller-Brockmann)",
            option: "Swiss Grid Müller-Brockmann (A4 ↓ • 2 cols • top 26 mm)",
            desc: "Rigorous modernist Swiss typography on A4: 2 columns, asymmetric top margin, bright red accents and Helvetica/Inter geometry."
          },
          'design-brutalist-tech': {
            name: "⬛ Architectural Brutalism",
            option: "Architectural Brutalism (A4 ↓ • 1 col • black frame & Mono)",
            desc: "High-contrast architectural layout on A4 with thick black borders, stark monospace typography and raw brutalist structure."
          },
          'design-studio-annual': {
            name: "🎨 Creative Portfolio & Annual Report",
            option: "Creative Portfolio & Report (A4 ↔ Landscape • 2 cols • banner)",
            desc: "Landscape portfolio on A4 with dark header strip, 2 balanced columns, saturated violet accents and gallery photo borders."
          },
          'minimal-bauhaus': {
            name: "🟡 Bauhaus Geometry",
            option: "Bauhaus Geometry (A4 ↓ • 1 col • 34mm left margin with tricolor)",
            desc: "Geometric layout inspired by Dessau: 34mm wide left margin, primary tricolor (red/blue/yellow) and sans-serif typography."
          },
          'minimal-zen': {
            name: "🍵 Japanese Zen Wabi-Sabi",
            option: "Japanese Zen Wabi-Sabi (A5 ↓ • 1 col • 25mm airy margins)",
            desc: "Calm contemplative A5 layout with wide 25mm margins, soft warm gray tones, ample whitespace and delicate serif typography."
          },
          'minimal-grid': {
            name: "📻 Braun / Dieter Rams Micromanual",
            option: "Braun / Rams Micromanual (A5 ↔ Landscape • 2 cols • 12 mm)",
            desc: "Compact functionalist user manual on A5 LANDSCAPE with 2 columns, precise 12mm margins and technical typography."
          },
          'blog-ghost-clean': {
            name: "✍️ Clean Longform Essay",
            option: "Clean Longform Essay (A4 ↓ • 1 col • 28mm reading margins)",
            desc: "Modern digital essay layout on A4 with centered single column, wide 28mm margins, balanced line length and Lora serif."
          },
          'blog-dev-digest': {
            name: "💻 Developer Docs & Markdown",
            option: "Developer Docs & Markdown (A4 ↓ • 1 col • ## headings & code)",
            desc: "Technical developer documentation on A4 with JetBrains Mono code blocks, syntax highlight borders and hash ## heading prefixes."
          },
          'blog-substack-editorial': {
            name: "📬 Substack Newsletter",
            option: "Substack Newsletter (Letter ↓ • 1 col • orange lede)",
            desc: "Author newsletter layout on US Letter with warm orange lede summary, serif body, rounded author card and clean dividers."
          },
          'textbook-stem-script': {
            name: "📐 University STEM Course Notes",
            option: "University STEM Course Notes (A4 ↓ • 2 cols • theorems & proofs)",
            desc: "Higher education university script on A4: 2 columns, blue theorem/definition callout boxes, formulas and monospace notes."
          },
          'textbook-university': {
            name: "🏛️ Oxford / Tufte Compendium",
            option: "Oxford / Tufte Compendium (A4 ↓ • 1 col • 38mm margin for glosses)",
            desc: "Edward Tufte inspired academic compendium on A4 with 38mm wide outer margin for marginal glosses, citations and small diagrams."
          },
          'textbook-medical': {
            name: "🩺 Clinical & Medical Script",
            option: "Clinical & Medical Script (A4 ↓ • 2 cols • teal blocks)",
            desc: "Clear medical study textbook on A4 with 2 columns, teal clinical warning boxes, diagnosis tables and legible sans typography."
          },
          'fun-textbook-science': {
            name: "🔬 Playful Science & Lab Guide",
            option: "Playful Science & Lab Guide (A4 ↓ • 2 cols • dotted cards)",
            desc: "Interactive workbook on A4: 2 columns, dotted experiment cards, exercise boxes and friendly colorful headings."
          },
          'fun-textbook-companion': {
            name: "⚡ Three-Column Study Cheat Sheet",
            option: "Three-Column Study Cheat Sheet (A4 ↔ Landscape • 3 cols • cards)",
            desc: "Ultra-compact 3-column study overview on A4 LANDSCAPE with modular cards, summary tables and quick-review badges."
          },
          'fun-textbook-workbook': {
            name: "📝 Cornell Method Workbook",
            option: "Cornell Method Workbook (A4 ↓ • 45mm ruled right margin!)",
            desc: "Cornell note-taking workbook on A4 with extra-wide 45mm ruled right margin specifically designed for student notes."
          },
          'bulletin-executive-brief': {
            name: "🚨 Crisis Flash Briefing",
            option: "Crisis Flash Briefing (A4 ↓ • 3 cols • 10mm ultra-compact)",
            desc: "High-density 3-column executive flash briefing on A4 with red warning banner, 10mm margins and maximum information throughput."
          },
          'bulletin-market-dispatch': {
            name: "📈 Financial Times Market Dispatch",
            option: "Financial Times Market Dispatch (A4 ↔ Landscape • 3 cols • salmon)",
            desc: "Financial market dispatch on A4 LANDSCAPE with distinctive salmon-tinted paper, 3 columns and sharp serif numbers."
          },
          'bulletin-company-digest': {
            name: "🏢 Corporate Magazine & Digest",
            option: "Corporate Magazine & Digest (A4 ↓ • 2 cols • duotone)",
            desc: "Modern corporate internal magazine on A4 with 2 balanced columns, professional duotone blue palette and clean cards."
          },
          'toner-saver': {
            name: "🌱 Eco B&W Minimum Paper",
            option: "🌱 Eco B&W Minimum Paper (A4 ↓ • 2 cols • 8mm micro-margins!)",
            desc: "Environmentally friendly high-density 2-column layout on A4 with 8mm micro-margins, toner-saving fonts and zero ink waste."
          },
          'modern-edu': {
            name: "🎓 School Binder Worksheet",
            option: "🎓 School Binder Worksheet (A4 ↓ • 1 col • 24mm margin for hole-punch)",
            desc: "Standard school worksheet on A4 with 24mm left margin optimized for 2-hole/4-hole punching, note boxes and clean font."
          },
          'academic': {
            name: "🏛️ Thesis & Academic Dissertation",
            option: "🏛️ Thesis & Dissertation (A4 ↓ • 1 col • 30mm binding margin)",
            desc: "Formal thesis template on A4 with 30mm inner binding margin, Times New Roman / Merriweather serif, 1.5 line spacing and formal footnotes."
          },
          'stem-tech': {
            name: "💻 Engineering Technical Sheet",
            option: "💻 Engineering Technical Sheet (A4 ↔ Landscape • 2 cols • tables)",
            desc: "Engineering documentation sheet on A4 LANDSCAPE with 2 columns, dense code blocks, technical tables and sharp borders."
          },
          'warm-notebook': {
            name: "☕ Ruled Notebook Moleskine",
            option: "☕ Ruled Notebook Moleskine (A5 ↓ • 1 col • lines on paper)",
            desc: "Warm cream pocket notebook on A5 with authentic notebook ruling, soft brown inks and rounded photo corners."
          },
          'corporate-navy': {
            name: "🏢 Executive Board Report",
            option: "🏢 Executive Board Report (A4 ↓ • 1 col • 25mm left margin)",
            desc: "Executive board report on A4 with navy accents, bold condensed titles, structured KPI summary cards and clean typography."
          }
        }
      }
    },

    cs: {
      meta: {
        title: "URL Printer Studio — Profesionální sazba, pracovní sešity a tisk webu",
        description: "Kontrolovaný tisk, úprava a offline archivace jakýchkoliv webových stránek. Tvorba pracovních sešitů, skript, e-booků s reálnou sazbou A4/A5 a QR odkazovačem."
      },
      topbar: {
        brand: "URL Printer",
        brand_badge: "Studio",
        btn_new: "Nový",
        btn_new_title: "Založit nový čistý projekt (Reset)",
        btn_open: "Otevřít",
        btn_open_title: "Otevřít uložený projekt nebo historii (*.urlprint)",
        btn_save: "Uložit",
        btn_save_title: "Uložit projekt do souboru (*.urlprint)",
        btn_inspector: "Inspektor",
        btn_inspector_title: "Otevřít interaktivní inspektor stylů, HTML a typografie",
        btn_tests: "Testy",
        btn_tests_title: "Otevřít automatickou testovací a diagnostickou rutinu",
        btn_undo_title: "Zpět (Ctrl+Z)",
        btn_redo_title: "Vpřed (Ctrl+Y)",
        zoom_out_title: "Zmenšit zobrazení dokumentu",
        zoom_in_title: "Zvětšit zobrazení dokumentu",
        zoom_fit_title: "Přizpůsobit velikost náhledu oknu (Fit to Window)",
        page_prev_title: "Předchozí strana",
        page_next_title: "Následující strana",
        page_label: "Strana",
        page_of: "z",
        page_jump_title: "Zadejte číslo strany a stiskněte Enter pro okamžitý přeskok",
        view_spread_title: "Přepnout knižní dvoustranu vedle sebe",
        view_spread_tooltip: "Dvoustrana",
        view_fullscreen_title: "Režim na celou obrazovku (Zen)",
        view_fullscreen_tooltip: "Celá obrazovka",
        btn_import: "Importovat",
        btn_import_title: "Načíst webovou stránku z URL nebo vložit text",
        btn_word: "Word (.docx)",
        btn_word_title: "Exportovat dokument do Microsoft Word (.docx) se zachováním nadpisů a obrázků",
        btn_print: "Tisk / PDF",
        btn_print_title: "Otevřít tiskový dialog a exportovat do PDF",
        left_toggle_title: "Zobrazit / skrýt levý ovládací panel",
        right_toggle_title: "Zobrazit / skrýt pravý panel vlastností",
        lang_switcher_title: "Language / Jazyk"
      },
      tabs: {
        chapters: "Kapitoly & Prvky",
        layout: "Sazba & Okraje",
        themes: "Šablony & Barvy"
      },
      chapters: {
        tree_title: "Strom kapitol dokumentu",
        count_zero: "0 kapitol",
        count_singular: "{n} kapitola",
        count_plural: "{n} kapitol",
        btn_add: "Přidat novou kapitolu / URL",
        move_up: "Posunout nahoru",
        move_down: "Posunout dolů",
        delete: "Smazat kapitolu",
        default_title: "Nová kapitola",
        default_content: "Obsah nové kapitoly..."
      },
      insert: {
        title: "Vložit prvek",
        separator_name: "Oddělovač",
        separator_desc: "Linka, mezera nebo ornament",
        separator_title: "Vložit nastavitelný oddělovač (mezera, linka, ornament)",
        note_name: "Poznámka / Box",
        note_desc: "Úkol, definice nebo shrnutí",
        note_title: "Vložit formátovaný box poznámky (Úkol, Definice, Varování)",
        lines_name: "Linkované řádky",
        lines_desc: "Linky pro poznámky (7 mm)",
        lines_title: "Vložit linkovanou plochu pro ruční psaní",
        dots_name: "Tečkovaná síť",
        dots_desc: "Mřížka pro skici (5 mm)",
        dots_title: "Vložit tečkovanou mřížku pro skicování"
      },
      layout: {
        title: "Formát a parametry strany",
        paper_format: "Formát papíru",
        format_a4: "A4 (210 × 297 mm — Standardní arch)",
        format_b5: "B5 (176 × 250 mm — Kniha / Skripta)",
        format_a5: "A5 (148 × 210 mm — Kapesní kniha / Sešit)",
        format_letter: "US Letter (216 × 279 mm — Magazín)",
        orientation: "Orientace",
        orient_portrait: "Na výšku (Portrait)",
        orient_landscape: "Na šířku (Landscape)",
        columns: "Počet sloupců",
        col_1: "1 sloupec (Čítanka / Sešit)",
        col_2: "2 sloupce (Kompaktní skripta / Časopis)",
        col_3: "3 sloupce (Noviny / Bulletin / Tahák)",
        margins_title: "Okraje strany (mm)",
        mirror_margins: "Zrcadlové okraje pro knižní vazbu (sudé / liché)",
        margin_top: "Horní okraj (Top)",
        margin_bottom: "Dolní okraj (Bottom)",
        margin_left: "Levý okraj",
        margin_right: "Pravý okraj",
        margin_inner: "Vnitřní okraj (Vazba)",
        margin_outer: "Vnější okraj",
        hf_title: "Záhlaví a zápatí",
        hf_diff_odd_even: "Rozdílné záhlaví a zápatí pro liché a sudé stránky",
        header_enable: "Horní záhlaví (Header)",
        header_left_ph: "Vlevo (např. {chapter_title})",
        header_right_ph: "Vpravo",
        footer_enable: "Dolní zápatí (Footer)",
        footer_left_ph: "Vlevo",
        footer_right_ph: "Vpravo (např. {url})",
        footer_default_left: "Vytvořeno v URL Printer Studio",
        odd_pages: "Liché stránky (Pravé):",
        even_pages: "Sudé stránky (Levé):",
        hf_header_label: "Záhlaví (Vlevo / Vpravo):",
        hf_footer_label: "Zápatí (Vlevo / Vpravo):",
        page_num_title: "Číslování stránek",
        page_num_pos: "Umístění čísla stránky",
        pos_footer_outer: "Zápatí: Vnější okraj (Lichá vpravo, Sudá vlevo)",
        pos_footer_center: "Zápatí: Uprostřed",
        pos_footer_right: "Zápatí: Vždy vpravo",
        pos_footer_left: "Zápatí: Vždy vlevo (pro pravý sloupec poznámek)",
        pos_header_outer: "Záhlaví: Vnější okraj (Lichá vpravo, Sudá vlevo)",
        pos_header_center: "Záhlaví: Uprostřed",
        pos_none: "Bez čísel stran",
        page_num_fmt: "Formát číslování",
        fmt_prefix: "Strana X z Y",
        fmt_short: "s. X / Y",
        fmt_simple: "Pouze číslo (1, 2, 3...)",
        fmt_roman: "Římské číslice (I, II, III...)",
        toc_title: "Obsah dokumentu (TOC)",
        toc_enable: "Vygenerovat automatický obsah dokumentu",
        toc_pos_after_title: "Umístění: Za hlavním nadpisem (Úvod)",
        toc_pos_standalone: "Umístění: Samostatná úvodní strana",
        toc_pos_end: "Umístění: Na konci dokumentu (Závěr)",
        toc_pos_standalone_end: "Umístění: Samostatná závěrečná strana",
        links_qr_title: "Hypertextové odkazy a QR kódy",
        hide_links: "Skrýt hypertextové odkazy (jako běžný text)",
        enable_qr: "Generovat offline SVG QR kódy pro nahrávky a odkazy",
        qr_size_label: "Velikost boxu s QR kódem",
        qr_size_full: "Plná (na šířku strany)",
        qr_size_medium: "Střední (šířka sloupce)",
        qr_size_small: "Malá (úsporná velikost)",
        qr_size_minimal: "Minimální (pouze QR)",
        media_mode: "Režim tisku médií",
        media_normal: "Plnobarevný tisk",
        media_grayscale: "Černobílé obrázky (Stupně šedi)",
        media_toner: "Úsporný režim toneru (B&W)",
        media_hide: "Skrýt obrázky pro maximální úsporu"
      },
      themes: {
        title: "Šablony a tiskové styly",
        select_label: "Výběr typografické a sazební šablony",
        group_web: "🌐 Extrahované styly z webu",
        opt_web_original: "🌐 Původní styl z webu (Aktivní URL)",
        group_custom: "⭐ Moje vlastní šablony",
        chk_apply_layout: "Při výběru šablony nastavit i rozměr strany, orientaci a okraje",
        reapply_btn: "📐 Obnovit rozvržení",
        reapply_btn_title: "Znovu aplikovat doporučený formát papíru, orientaci, sloupce a okraje této šablony",
        custom_title: "Správa vlastních šablon",
        btn_save_custom: "💾 Uložit aktuální nastavení jako šablonu...",
        btn_save_web: "⭐ Uložit styl z webu jako trvalou šablonu",
        btn_export: "📤 Export (JSON)",
        btn_export_title: "Exportovat vlastní šablony do souboru JSON",
        btn_import: "📥 Import (JSON)",
        btn_import_title: "Importovat šablony ze souboru JSON",
        btn_delete: "🗑️ Smazat vybranou vlastní šablonu",
        typo_title: "Globální parametry typografie",
        font_size_label: "Velikost základního písma",
        line_height_label: "Řádkování (Line-height)",
        letter_spacing_label: "Prostrkání písma (Letter-spacing)",
        heading_scale_label: "Měřítko nadpisů (Heading Scale)",
        heading_margin_top_label: "Horní odsazení nadpisů",
        heading_margin_bot_label: "Spodní odsazení nadpisů",
        p_margin_label: "Odsazení mezi odstavci",
        reset_param_title: "Vrátit na výchozí hodnotu šablony"
      },
      spec: {
        portrait: "Na výšku ▯",
        landscape: "Na šířku ▭",
        col_1: "1 sloupec",
        col_2: "2 sloupce",
        col_3: "3 sloupce",
        margins_mirror: "Zrcadlové okraje ({left}/{right} mm)",
        margins_asym: "Asymetrické okraje ({left} / {right} mm)",
        margins_sym: "Okraje {top}/{left} mm",
        font: "Písmo {size} pt",
        dropcap: '<span class="template-spec-pill highlight">✨ Iniciála</span>',
        widescreen: '<span class="template-spec-pill highlight">▭ Širokoúhlá sazba</span>',
        book_format: '<span class="template-spec-pill highlight">📖 Knižní {format}</span>'
      },
      drawer: {
        toggle_title: "Otevřít miniatury stran a obsah dokumentu",
        tab_thumbs: "Miniatury stran",
        tab_toc: "Obsah (TOC)",
        close_title: "Zavřít panel",
        page_label: "Strana {page}",
        page_short: "s. {page}",
        no_headings: "Žádné nadpisy nebyly nalezeny."
      },
      empty_workspace: {
        title: "Žádný dokument zatím není načten",
        desc: "Zadejte URL adresu článku nebo vložte text pro kontrolovanou sazbu a tisk.",
        btn: "➕ Importovat URL / Text"
      },
      inspector: {
        header_empty: "Vlastnosti bloku",
        no_block_title: "Žádný blok není vybrán",
        no_block_desc: "Klikněte na libovolný text, obrázek či tabulku na stránce pro zobrazení parametrů.",
        header_tag: "Vlastnosti: <{tag}>",
        close_title: "Zavřít panel",
        block_type: "Typ textového bloku",
        tag_h1: "H1 — Hlavní nadpis",
        tag_h2: "H2 — Sekční nadpis",
        tag_h3: "H3 — Podnadpis 3. úrovně",
        tag_h4: "H4 — Menší podnadpis",
        tag_p: "Odstavec textu",
        tag_blockquote: "Citace (Quote)",
        tag_pre: "Kód / Monospace",
        color_style: "🎨 Barva a styl textu",
        color_original: "(Původní z webu)",
        color_default: "(Výchozí)",
        color_reset: "↺ Obnovit",
        alignment: "Zarovnání prvku",
        align_left: "Zarovnat vlevo",
        align_center: "Zarovnat na střed",
        align_right: "Zarovnat vpravo",
        align_justify: "Zarovnat do bloku",
        font_size: "Velikost písma (pt / px)",
        img_adjust: "🖼️ Přizpůsobení obrázku",
        img_size: "Velikost obrázku (10 % – 200 %)",
        img_border: "Rámeček",
        img_shadow: "Stín",
        qr_adjust: "📱 Nastavení boxu s QR kódem",
        qr_box_variant: "Varianta zobrazení boxu",
        qr_var_full: "↔️ Plná (na šířku strany)",
        qr_var_medium: "▤ Střední (šířka sloupce)",
        qr_var_small: "▫ Malá (úsporná velikost)",
        qr_var_minimal: "▪ Minimální (pouze QR)",
        qr_scale: "Měřítko QR kódu (50 % – 200 %)",
        qr_apply_all: "🔄 Použít tuto velikost na všechny QR kódy",
        break_before: "Zalomit stránku před tímto blokem",
        manipulation: "Manipulace s blokem",
        move_up: "▲ Posunout výše",
        move_down: "▼ Posunout níže",
        duplicate: "📋 Duplikovat",
        delete: "🗑️ Odstranit"
      },
      modal_import: {
        title: "Načíst webovou stránku nebo text",
        tested_sites: "🧪 Ověřené testovací stránky (100% funkční živé weby):",
        tested_sites_hint: "Vyberte pro vložení URL",
        tested_sites_placeholder: "-- Vyberte ověřenou testovací stránku --",
        open_original: "🔗 Otevřít původní web v novém okně ↗",
        quick_sample: "⚡ Rychlá ukázka",
        fetch_live: "🌐 Stáhnout živě z URL",
        url_label: "Zadejte URL adresu článku (Stiskněte Enter pro import):",
        url_open_link: "Otevřít zadanou URL ↗",
        url_placeholder: "např. https://www.saxoskola.cz/vse-okolo-saxofonu/rozsirene-techniky-na-saxofon/",
        text_label: "Nebo vložte text / HTML / Markdown přímo:",
        text_placeholder: "# Nadpis kapitoly\n\nVložte text, tabulky, obrázky nebo odstavce...",
        run_tests: "🧪 Spustit automatickou testovací rutinu",
        cancel: "Zrušit",
        execute: "Importovat a vysázet",
        loading: "⏳ Stahuji z webu..."
      },
      modal_projects: {
        title: "Správa projektů a historie",
        load_file: "Načíst ze souboru (*.urlprint)",
        save_current: "Uložit aktuální projekt",
        clear_history: "Vymazat historii",
        clear_history_title: "Smazat všechny uložené projekty z historie",
        recent_title: "Nedávno vytvořené a uložené projekty:",
        close: "Zavřít",
        empty_title: "Žádné uložené projekty v historii",
        empty_desc: "Uložte aktuální projekt nebo nahrajte soubor .urlprint ze svého počítače.",
        card_open: "Otevřít",
        card_delete_title: "Smazat z historie",
        chapters_count: "{n} kapitol"
      },
      drop_overlay: {
        title: "Přetáhněte soubor .urlprint sem pro okamžité načtení projektu",
        desc: "Podporovány jsou soubory *.urlprint a *.json"
      },
      doc_toc: {
        title: "Obsah dokumentu",
        empty: "Dokument zatím neobsahuje žádné podnadpisy."
      },
      toasts: {
        docx_success: "📄 Dokument byl úspěšně exportován do Wordu",
        layout_applied: "📐 Rozvržení strany, formát a okraje šablony byly aplikovány",
        templates_imported: "📥 Vlastní šablony byly úspěšně importovány",
        font_size_reset: "↺ Velikost písma obnovena na výchozí",
        line_height_reset: "↺ Řádkování obnoveno na výchozí",
        letter_spacing_reset: "↺ Prostrkání písma obnoveno na výchozí",
        heading_scale_reset: "↺ Měřítko nadpisů obnoveno na výchozí",
        heading_top_reset: "↺ Horní odsazení nadpisů obnoveno na výchozí",
        heading_bot_reset: "↺ Spodní odsazení nadpisů obnoveno na výchozí",
        p_margin_reset: "↺ Odsazení odstavců obnoveno na výchozí",
        separator_inserted: "✨ Oddělovač byl vložen",
        note_inserted: "✨ Box poznámky byl vložen",
        lines_inserted: "✨ Linkovaná plocha byla vložena",
        dots_inserted: "✨ Tečkovaná mřížka byla vložena",
        template_saved: '💾 Šablona "{name}" byla uložena včetně rozvržení strany',
        web_template_saved: '⭐ Šablona z webu "{name}" byla uložena',
        template_deleted: "🗑️ Šablona byla smazána",
        sample_inserted: '⚡ Rychlá ukázka "{title}" byla vložena',
        article_loaded: "✅ Článek byl úspěšně načten z webu",
        text_inserted: "✅ Text byl vložen a vysázen",
        project_saved: "💾 Projekt byl úspěšně uložen do souboru .urlprint",
        project_loaded: '📂 Projekt "{title}" byl úspěšně načten',
        project_opened: '📂 Projekt "{title}" byl otevřen',
        file_read_error: "Chyba při čtení souboru: "
      },
      dialogs: {
        confirm_new_project: "Chcete založit nový čistý projekt? Neuložené změny budou smazány.",
        prompt_template_name: "Zadejte název nové šablony (např. Můj moderní magazín):",
        confirm_delete_template: "Opravdu chcete smazat tuto vlastní šablonu?",
        confirm_clear_history: "Opravdu chcete vymazat celou historii projektů?"
      },
      presets: {
        groups: {
          newspaper: "📰 1. Staré noviny (Vintage Newspaper)",
          magazine: "✨ 2. Moderní časopis (Modern Magazine)",
          kids_magazine: "🎈 3. Dětský časopis (Kids Magazine)",
          antique_book: "📜 4. Stará kniha (Antique Book)",
          kids_book: "🧸 5. Dětská kniha (Kids Book)",
          modern_book: "📖 6. Moderní kniha (Modern Book)",
          design: "📐 7. Designový dokument (Design Document)",
          minimal: "⚪ 8. Minimalistická typografie (Minimalist)",
          blog: "💻 9. Webový blog (Web Blog)",
          textbook: "🎓 10. Moderní učebnice (Modern Textbook)",
          fun_textbook: "🔬 11. Zábavná učebnice & Pracovní sešit",
          bulletin: "⚡ 12. Strhující bulletin (Dynamic Bulletin)",
          practical: "🌱 13. Praktické a úsporné šablony"
        },
        items: {
          'vintage-broadsheet': {
            name: "🗞️ Dobový deník (Broadsheet 1900)",
            option: "Klasický Broadsheet 1900 (A4 ↓ • 3 sl. • okraje 10 mm)",
            desc: "Hustá třísloupcová novinová sazba na A4 s úzkými 10mm okraji, dvojitými linkami, iniciálou a ostře oříznutými fotografiemi."
          },
          'gazette-1920': {
            name: "🎩 Prvorepubliková Gazeta (1920)",
            option: "Prvorepubliková Gazeta (A4 ↔ Na šířku • 3 sl. • Art Deco rám)",
            desc: "Slavnostní třísloupcová gazeta A4 NA ŠÍŘKU s dekorativním dvojitým rámečkem, římským číslováním a patkovým písmem Cinzel."
          },
          'yellowed-press': {
            name: "📜 Dobový Večerník / Tabloid",
            option: "Dobový Večerník / Tabloid (A5 ↓ • 2 sl. • inverzní titulek)",
            desc: "Kompaktní večerník A5 s 2 sloupci, inverzními titulkovými pásky, razítkovými boxy a tučnou kondenzovanou typografií."
          },
          'magazine-editorial': {
            name: "✨ New Yorker Editorial",
            option: "New Yorker Editorial (A4 ↓ • 2 sl. • zrcadlové okraje)",
            desc: "Vertikální magazínová sazba A4 (2 sloupce) se zrcadlovými okraji, výraznými citacemi a rubínovou akcentní linkou."
          },
          'magazine-fashion': {
            name: "💎 Vogue Lookbook",
            option: "Vogue Lookbook (A4 ↔ Na šířku • 2 sl. • polaroid fotky)",
            desc: "Módní lookbook na A4 NA ŠÍŘKU se vzdušnou 2sloupcovou sazbou, luxusním kontrastním patkovým písmem Playfair Display a polaroidovými rámy fotek."
          },
          'magazine-tech': {
            name: "⚡ Wired Tech Quarterly",
            option: "Wired Tech Quarterly (Letter ↓ • 3 sl. • kyber-grid)",
            desc: "Formát US Letter se 3 sloupci, neonově limetkovým akcentem na tmavě modrém pozadí, monospace štítky a datovými tabulkami."
          },
          'kids-comic': {
            name: "🎈 Veselý Komiks & Kvízy",
            option: "Veselý Komiks & Kvízy (A4 ↔ Na šířku • 2 sl. • komiksové bubliny)",
            desc: "Dětské komiksové album na A4 NA ŠÍŘKU se zaoblenými bublinovými rámečky, barevnými nadpisy a hravým písmem Fredoka."
          },
          'kids-adventure': {
            name: "🧭 Dobrodružná Výprava",
            option: "Dobrodružná Výprava (A4 ↓ • 2 sl. • mapová sazba)",
            desc: "Dobrodružný dětský magazín na A4 v safari tónech s badatelskými kartami, tečkovanými oddělovači a kompasovými prvky."
          },
          'kids-explorer': {
            name: "🔍 Kapesní Zápisník Badatele",
            option: "Kapesní Zápisník Badatele (A5 ↓ • 1 sl. • terénní karty)",
            desc: "Terénní deník A5 s 1 sloupcem, linkovanými rámečky, botanicky zelenými akcenty a pozorovacími boxy pro zaškrtávání."
          },
          'antique-manuscript': {
            name: "👑 Iluminovaný Středověký Kodex",
            option: "Iluminovaný Středověký Kodex (A4 ↓ • 2 sl. • pergamen & rám)",
            desc: "Středověký rukopis na A4 s tónovaným pergamenovým podkladem, gotickým ornamentálním rámem, iluminovanou iniciálou a klasickou dvoustranou."
          },
          'antique-victorian': {
            name: "🕯️ Viktoriánský Román",
            option: "Viktoriánský Román (A5 ↓ • 1 sl. • knižní zrcadlová vazba)",
            desc: "Viktoriánská knižní sazba na A5 s 1 sloupcem, velkorysým vnitřním okrajem pro vazbu, patkovým písmem Cormorant Garamond a hvězdičkami."
          },
          'antique-press': {
            name: "🪶 První Knižní Vydání",
            option: "První Knižní Vydání (B5 ↓ • 1 sl. • čistý knihtisk bez záhlaví)",
            desc: "Ušlechtilý formát B5 s 1 sloupcem, čistou knihtiskovou sazbou bez záhlaví, klasickými okraji a teplým tónem papíru."
          },
          'kids-storybook': {
            name: "🧸 Obrázková Pohádka",
            option: "Obrázková Pohádka (A5 ↔ Na šířku • 1 sl. • pastelové album)",
            desc: "Pohádkové album na A5 NA ŠÍŘKU s pastelovými rámečky, velkým čitelným písmem a teplým broskvovým nádechem."
          },
          'kids-easy-reader': {
            name: "📚 První Čtení / Slabikář",
            option: "První Čtení / Slabikář (A4 ↓ • 14pt • vlevo • pro dyslektiky)",
            desc: "Vzdušná sazba na A4 se základní velikostí 14pt, řádkováním 1.85, zarovnáním vlevo a vysokým kontrastem pro začínající čtenáře i dyslektiky."
          },
          'kids-fairytale': {
            name: "✨ Zlatá Kniha Pohádek",
            option: "Zlatá Kniha Pohádek (B5 ↓ • 1 sl. • zlatý ozdobný rám)",
            desc: "Reprezentativní pohádková kniha na B5 se zlatým ornamentálním rámečkem, královskou fialovou a vznešeným patkovým písmem."
          },
          'book-modern-novel': {
            name: "📖 Současný Román",
            option: "Současný Román (A5 ↓ • 1 sl. • kánon okrajů Tschichold)",
            desc: "Klasická románová sazba A5 podle kánonu Jana Tschicholda: 1 sloupec, 22mm vnější okraj, elegantní patkové písmo Newsreader."
          },
          'book-nordic-minimal': {
            name: "❄️ Severská Monografie",
            option: "Severská Monografie (B5 ↓ • 1 sl. • 36mm vnější okraj)",
            desc: "Skandinávská architektonická monografie na B5 se širokým 36mm vnějším okrajem pro glosy, šedým textem a čistým písmem Inter."
          },
          'book-paperback': {
            name: "🧳 Cestovní Paperback",
            option: "Cestovní Paperback (A5 ↓ • 1 sl. • úsporné okraje 11–15 mm)",
            desc: "Kompaktní paperback A5 na cesty s úzkými okraji 11–15 mm, úsporným řádkováním a maximem slov na stránku."
          },
          'design-swiss-grid': {
            name: "📐 Švýcarský Grid (Müller-Brockmann)",
            option: "Švýcarský Grid Müller-Brockmann (A4 ↓ • 2 sl. • horní 26 mm)",
            desc: "Přísná modernistická švýcarská typografie na A4: 2 sloupce, asymetrický horní okraj, červený akcent a geometrický grotesk."
          },
          'design-brutalist-tech': {
            name: "⬛ Architektonický Brutalismus",
            option: "Architektonický Brutalismus (A4 ↓ • 1 sl. • černý rám & Mono)",
            desc: "Vysoce kontrastní architektonická sazba na A4 s tlustým černým rámem, nekompromisním monospace písmem a surovou strukturou."
          },
          'design-studio-annual': {
            name: "🎨 Kreativní Portfolio & Report",
            option: "Kreativní Portfolio & Report (A4 ↔ Na šířku • 2 sl. • pruh)",
            desc: "Širokoúhlé portfolio A4 s tmavým proužkem záhlaví, 2 vyváženými sloupci, fialovým akcentem a galerijním rámováním fotek."
          },
          'minimal-bauhaus': {
            name: "🟡 Bauhaus Geometrie",
            option: "Bauhaus Geometrie (A4 ↓ • 1 sl. • 34mm levý okraj s trikolórou)",
            desc: "Geometrická sazba inspirovaná Dessau: 34mm široký levý okraj s primární trikolórou (červená/modrá/žlutá) a bezpatkovým písmem."
          },
          'minimal-zen': {
            name: "🍵 Japonský Zen Wabi-Sabi",
            option: "Japonský Zen Wabi-Sabi (A5 ↓ • 1 sl. • 25mm vzdušné okraje)",
            desc: "Meditativní klidná sazba na A5 s velkorysými 25mm okraji, jemně šedým písmem, dostatkem prázdného prostoru a patkovým písmem."
          },
          'minimal-grid': {
            name: "📻 Braun / Dieter Rams Mikromanuál",
            option: "Braun / Rams Mikromanuál (A5 ↔ Na šířku • 2 sl. • 12 mm)",
            desc: "Kompaktní funkční manuál na A5 NA ŠÍŘKU se 2 sloupci, přesnými 12mm okraji a precizní technickou typografií."
          },
          'blog-ghost-clean': {
            name: "✍️ Clean Longform Essay",
            option: "Clean Longform Essay (A4 ↓ • 1 sl. • 28mm čtecí okraje)",
            desc: "Moderní digitální esej na A4 se středovým sloupcem, širokými 28mm okraji, příjemnou délkou řádku a patkovým písmem Lora."
          },
          'blog-dev-digest': {
            name: "💻 Developer Docs & Markdown",
            option: "Developer Docs & Markdown (A4 ↓ • 1 sl. • ## nadpisy & kód)",
            desc: "Technická vývojářská dokumentace na A4 s bloky kódu v JetBrains Mono, syntax borderem a mřížkovými ## značkami u nadpisů."
          },
          'blog-substack-editorial': {
            name: "📬 Substack Newsletter",
            option: "Substack Newsletter (Letter ↓ • 1 sl. • oranžový perex)",
            desc: "Autorský newsletter na formátu US Letter s oranžovým shrnujícím perexem, patkovým tělem, medailonkem autora a čistými linkami."
          },
          'textbook-stem-script': {
            name: "📐 Vysokoškolská STEM Skripta",
            option: "Vysokoškolská STEM Skripta (A4 ↓ • 2 sl. • věty a definice)",
            desc: "Univerzitní učební text na A4: 2 sloupce, modré rámečky pro věty a definice, matematické vzorce a monospace poznámky."
          },
          'textbook-university': {
            name: "🏛️ Oxford / Tufte Kompendium",
            option: "Oxford / Tufte Kompendium (A4 ↓ • 1 sl. • 38mm okraj na glosy)",
            desc: "Akademické kompendium na A4 s 38mm širokým vnějším okrajem pro glosy, citace a miniaturní schémata ve stylu Edwarda Tufteho."
          },
          'textbook-medical': {
            name: "🩺 Klinická & Lékařská Skripta",
            option: "Klinická & Lékařská Skripta (A4 ↓ • 2 sl. • tyrkysové bloky)",
            desc: "Přehledná lékařská skripta na A4 se 2 sloupci, tyrkysovými rámečky pro klinické poznámky, diferenciální diagnózy a tabulky."
          },
          'fun-textbook-science': {
            name: "🔬 Hravá Věda & Laboratoř",
            option: "Hravá Věda & Laboratoř (A4 ↓ • 2 sl. • tečkované karty)",
            desc: "Zábavný pracovní sešit na A4: 2 sloupce, tečkované karty pokusů, rámečky pro odpovědi a pestré přátelské nadpisy."
          },
          'fun-textbook-companion': {
            name: "⚡ Třísloupcový Studijní Tahák",
            option: "Třísloupcový Studijní Tahák (A4 ↔ Na šířku • 3 sl. • karty)",
            desc: "Ultrakompaktní třísloupcový přehled učiva na A4 NA ŠÍŘKU s modulárními kartami, tabulkami a barevnými štítky k zapamatování."
          },
          'fun-textbook-workbook': {
            name: "📝 Cornellův Pracovní Sešit",
            option: "Cornellův Pracovní Sešit (A4 ↓ • 45mm linkovaný pravý okraj!)",
            desc: "Pracovní sešit podle Cornellovy metody na A4 s extra širokým 45mm linkovaným pravým okrajem určeným pro vlastní poznámky studenta."
          },
          'bulletin-executive-brief': {
            name: "🚨 Krizový Flash Briefing",
            option: "Krizový Flash Briefing (A4 ↓ • 3 sl. • 10mm ultra-kompakt)",
            desc: "Hustý 3sloupcový exekutivní briefing na A4 s červeným varovným pruhem v záhlaví, 10mm okraji a maximálním využitím plochy."
          },
          'bulletin-market-dispatch': {
            name: "📈 Financial Times Tržní Svodka",
            option: "Financial Times Tržní Svodka (A4 ↔ Na šířku • 3 sl. • lososová)",
            desc: "Ranní finanční svodka na A4 NA ŠÍŘKU na charakteristickém lososovém papíře, 3 sloupce a ostrá patková čísla."
          },
          'bulletin-company-digest': {
            name: "🏢 Firemní Magazín & Zpravodaj",
            option: "Firemní Magazín & Zpravodaj (A4 ↓ • 2 sl. • dvoubarevný)",
            desc: "Moderní firemní zpravodaj na A4 se 2 sloupci, profesionální modrou duotónovou paletou a čistými kartami informací."
          },
          'toner-saver': {
            name: "🌱 Eko B&W Minimum Papíru",
            option: "🌱 Eko B&W Minimum Papíru (A4 ↓ • 2 sl. • 8mm mikro-okraje!)",
            desc: "Ekologická ultrakompaktní 2sloupcová sazba na A4 s 8mm mikro-okraji, úsporným písmem a nulovým plýtváním tonerem."
          },
          'modern-edu': {
            name: "🎓 Školní List do Šanonu",
            option: "🎓 Školní List do Šanonu (A4 ↓ • 1 sl. • 24mm okraj s děrováním)",
            desc: "Standardní školní list A4 s 24mm levým okrajem upraveným pro zakládání do šanonu, rámečky pro poznámky a čistým písmem."
          },
          'academic': {
            name: "🏛️ Diplomová & Akademická Práce",
            option: "🏛️ Diplomová & Akademická Práce (A4 ↓ • 1 sl. • 30mm vazba)",
            desc: "Formální univerzitní šablona na A4 s 30mm vazebním okrajem, patkovým písmem Times New Roman / Merriweather a řádkováním 1.5."
          },
          'stem-tech': {
            name: "💻 Inženýrský Technický Arch",
            option: "💻 Inženýrský Technický Arch (A4 ↔ Na šířku • 2 sl. • tabulky)",
            desc: "Technická dokumentace na A4 NA ŠÍŘKU se 2 sloupci, hustými bloky kódu, datovými tabulkami a technickým písmem."
          },
          'warm-notebook': {
            name: "☕ Linkovaný Zápisník Moleskine",
            option: "☕ Linkovaný Zápisník Moleskine (A5 ↓ • 1 sl. • linky na papíře)",
            desc: "Kapesní zápisník A5 s teplým linkovaným papírem, hnědým písmem a oblými rohy ilustrací pro přirozený pocit z četby."
          },
          'corporate-navy': {
            name: "🏢 Manažerský Board Report",
            option: "🏢 Manažerský Board Report (A4 ↓ • 1 sl. • 25mm levý okraj)",
            desc: "Manažerský report A4 v barvách Corporate Navy s kondenzovanými titulky, strukturovanými KPI kartami a čistým písmem."
          }
        }
      }
    }
  };

  class I18nManager {
    constructor() {
      this.translations = translations;
      this.listeners = [];
      this.currentLang = this._detectLanguage();
    }

    _detectLanguage() {
      // 1. URL search param ?lang=en or ?lang=cs
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qLang = urlParams.get('lang');
        if (qLang && (qLang === 'en' || qLang === 'cs')) {
          return qLang;
        }
      } catch (e) {}

      // 2. LocalStorage preference
      try {
        const saved = localStorage.getItem('urlprinter_lang');
        if (saved && (saved === 'en' || saved === 'cs')) {
          return saved;
        }
      } catch (e) {}

      // 3. Default to English (English mutation of the app)
      return 'en';
    }

    t(keyPath, params = {}) {
      const keys = keyPath.split('.');
      let val = this.translations[this.currentLang];
      for (const k of keys) {
        if (val && typeof val === 'object' && k in val) {
          val = val[k];
        } else {
          // Fallback to English
          let fallback = this.translations['en'];
          for (const fbK of keys) {
            if (fallback && typeof fallback === 'object' && fbK in fallback) {
              fallback = fallback[fbK];
            } else {
              fallback = null;
              break;
            }
          }
          val = fallback !== null ? fallback : keyPath;
          break;
        }
      }

      if (typeof val !== 'string') {
        return keyPath;
      }

      let res = val;
      for (const [pKey, pVal] of Object.entries(params)) {
        res = res.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
      }
      return res;
    }

    setLanguage(lang) {
      if (lang !== 'en' && lang !== 'cs') return;
      this.currentLang = lang;
      try {
        localStorage.setItem('urlprinter_lang', lang);
      } catch (e) {}

      document.documentElement.lang = lang;
      this.updateDOM();
      this.notify(lang);
    }

    onLanguageChange(callback) {
      this.listeners.push(callback);
    }

    notify(lang) {
      this.listeners.forEach(cb => {
        try {
          cb(lang);
        } catch (e) {
          console.error('[I18N] listener error:', e);
        }
      });
    }

    updateDOM() {
      const lang = this.currentLang;
      document.documentElement.lang = lang;

      // Update document title & meta description
      document.title = this.t('meta.title');
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', this.t('meta.description'));

      // Update textContent for elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
          el.textContent = this.t(key);
        }
      });

      // Update innerHTML for elements with data-i18n-html
      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
          el.innerHTML = this.t(key);
        }
      });

      // Update title attribute for elements with data-i18n-title
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
          el.setAttribute('title', this.t(key));
        }
      });

      // Update placeholder attribute for elements with data-i18n-placeholder
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
          el.setAttribute('placeholder', this.t(key));
        }
      });

      // Update language switcher buttons active state
      document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        btn.classList.toggle('active', btnLang === lang);
      });

      // Update Preset Template options in dropdown
      this._updatePresetDropdownOptions();
    }

    _updatePresetDropdownOptions() {
      const sel = document.getElementById('sel-preset-template');
      if (!sel) return;

      // Update Web original option
      const webOpt = sel.querySelector('option[value="web-original"]');
      if (webOpt) webOpt.textContent = this.t('themes.opt_web_original');

      // Update Optgroup labels
      const groups = {
        'newspaper': this.t('presets.groups.newspaper'),
        'magazine': this.t('presets.groups.magazine'),
        'kids_magazine': this.t('presets.groups.kids_magazine'),
        'antique_book': this.t('presets.groups.antique_book'),
        'kids_book': this.t('presets.groups.kids_book'),
        'modern_book': this.t('presets.groups.modern_book'),
        'design': this.t('presets.groups.design'),
        'minimal': this.t('presets.groups.minimal'),
        'blog': this.t('presets.groups.blog'),
        'textbook': this.t('presets.groups.textbook'),
        'fun_textbook': this.t('presets.groups.fun_textbook'),
        'bulletin': this.t('presets.groups.bulletin'),
        'practical': this.t('presets.groups.practical')
      };

      sel.querySelectorAll('optgroup[data-i18n-group]').forEach(og => {
        const gKey = og.getAttribute('data-i18n-group');
        if (groups[gKey]) {
          og.label = groups[gKey];
        }
      });

      const webOg = document.getElementById('optgroup-web-sources');
      if (webOg) webOg.label = this.t('themes.group_web');
      const customOg = document.getElementById('optgroup-custom-templates');
      if (customOg) customOg.label = this.t('themes.group_custom');

      // Update individual template option texts
      const presetItems = this.translations[this.currentLang]?.presets?.items || {};
      sel.querySelectorAll('option[value]').forEach(opt => {
        const val = opt.value;
        if (presetItems[val] && presetItems[val].option) {
          opt.textContent = presetItems[val].option;
        }
      });
    }
  }

  // Expose singleton to window
  window.I18N = new I18nManager();

  // Initialize language switcher on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.I18N.updateDOM();

    // Bind click events on language switcher buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLang = btn.getAttribute('data-lang');
        if (targetLang) {
          window.I18N.setLanguage(targetLang);
        }
      });
    });
  });

})();
