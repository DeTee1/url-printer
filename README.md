# URL Printer — Web-to-Print & PDF Studio

**URL Printer** is a web application designed for clean, controlled printing of web articles, blog posts, and online documentation, as well as generating publication-ready PDFs, workbooks, and e-books directly from web sources.

---

## ✨ Key Features

- **Clean Web Article & Blog Extraction**: Strip away ads, navigation bars, popups, and visual clutter to extract the core content from web URLs or pasted HTML/text.
- **Real-Time Print & PDF Layout Preview**: Live A4 and A5 page pagination preview with customizable margins, orientation, and header/footer controls.
- **Multi-Chapter Document Builder**: Combine multiple web articles or blog posts into a single structured PDF document, study guide, or e-book with an automatically generated Table of Contents (TOC).
- **Interactive Element Inspector**: Click to hide, remove, or restyle specific paragraphs, images, or blocks before printing or exporting.
- **Typography & Theme Presets**: Choose from tailored print themes (Eco-Print, Academic, Modern Editorial, E-Book) and font pairings (Inter, Playfair Display, Plus Jakarta Sans, Outfit, JetBrains Mono).
- **Smart QR Code Linker**: Automatically convert inline hyperlinks or source URLs into scannable QR codes for physical printouts.
- **Multiple Export Formats**: Print directly to a physical printer, save as a high-quality PDF, or export to `.docx` / standalone HTML.

---

## 🎯 Use Cases

- **Printing Web Articles & Blogs**: Turn long-form articles, tutorials, and essays into clean, ink-friendly paper prints.
- **Creating PDFs from Web Sources**: Compile multi-part blog series or online documentation into a cohesive, paginated PDF book.
- **Educational Workbooks & Study Guides**: Format online learning materials with custom spacing, notes sections, and QR references for students.
- **Offline Archiving**: Save clean, readable versions of web pages for offline reading.

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Modular vanilla CSS architecture ([`themes.css`](css/themes.css), [`print-engine.css`](css/print-engine.css), [`app.css`](css/app.css)) with `@media print` optimization.
- **Vanilla JavaScript (ES6 Modules)**: Zero-dependency client-side architecture located in [`js/`](js/):
  - [`extractor.js`](js/modules/extractor.js) — Content extraction & sanitization
  - [`paginationEngine.js`](js/modules/paginationEngine.js) — A4/A5 page layout & pagination
  - [`chapterManager.js`](js/modules/chapterManager.js) — Multi-article & chapter management
  - [`tocGenerator.js`](js/modules/tocGenerator.js) — Automatic Table of Contents generation
  - [`inspector.js`](js/modules/inspector.js) — Interactive DOM element editor
  - [`qrGenerator.js`](js/modules/qrGenerator.js) — QR code generation for print links
  - [`docxExporter.js`](js/modules/docxExporter.js) — Word document export

---

## 🚀 Getting Started

No build step or server installation is required.

```bash
# Clone the repository
git clone https://github.com/DeTee1/url-printer.git

# Open index.html in any modern browser
cd url-printer
start index.html
```

Or run with any static local server (e.g., VS Code Live Server or `python -m http.server`).

---

## 📄 License

Open source — feel free to use, modify, and share.
