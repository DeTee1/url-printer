# URL Printer — Web-to-Print & PDF Studio

[![Launch Live App](https://img.shields.io/badge/%F0%9F%9A%80_Launch_Live_App-Run_in_Browser-2ea44f?style=for-the-badge)](https://detee1.github.io/url-printer/)
[![GitHub Release](https://img.shields.io/github/v/release/DeTee1/url-printer?style=for-the-badge&label=Download%20Offline%20App)](https://github.com/DeTee1/url-printer/releases/latest)

**URL Printer** is a browser-based studio designed for clean, controlled printing of web articles, blog posts, and online documentation, as well as generating publication-ready PDFs, workbooks, and e-books directly from web sources.

👉 **[Launch URL Printer Online (GitHub Pages)](https://detee1.github.io/url-printer/)**

---

## ✨ Key Features

- **Clean Web Article & Blog Extraction**: Powered by Mozilla's Readability engine and custom heuristic filters to strip away ads, navigation bars, popups, and visual clutter from web URLs or pasted HTML.
- **Real-Time Print & PDF Layout Preview**: Live A4 and A5 page pagination preview with customizable margins, mirror margins for bookbinding, and separate odd/even page headers and footers.
- **Multi-Chapter Document Builder**: Combine multiple web articles or blog posts into a single structured PDF document, study guide, or e-book with an automatically generated Table of Contents (TOC).
- **Interactive Element Inspector**: Click to hide, remove, or restyle specific paragraphs, images, or blocks before printing or exporting.
- **Typography & Theme Presets**: Choose from tailored print themes (Web Original, Eco-Print, Academic, Modern Editorial, E-Book) and font pairings (Inter, Playfair Display, Plus Jakarta Sans, Outfit, JetBrains Mono).
- **Smart QR Code Linker**: Automatically convert inline hyperlinks or source URLs into scannable QR codes for physical printouts.
- **Project Persistence (`.urlprint`)**: Save and reload complete multi-chapter projects via local browser storage or drag-and-drop `.urlprint` / `.json` project files.
- **Multiple Export Formats**: Print directly to a physical printer, save as a high-quality paginated PDF, or export to `.docx` / standalone HTML.

---

## 🎯 Use Cases

- **Printing Web Articles & Blogs**: Turn long-form articles, tutorials, and essays into clean, ink-friendly paper prints.
- **Creating PDFs from Web Sources**: Compile multi-part blog series or online documentation into a cohesive, paginated PDF book.
- **Educational Workbooks & Study Guides**: Format online learning materials with custom spacing, notes sections, and QR references for students.
- **Offline Archiving**: Save clean, readable versions of web pages for offline reading.

---

## 🚀 How to Run

### 1. Run Directly in Browser (No Installation)
Open the live web application hosted on GitHub Pages:
👉 **[https://detee1.github.io/url-printer/](https://detee1.github.io/url-printer/)**

### 2. Run Offline on Your Computer
Download the latest standalone `.zip` archive from **[GitHub Releases](https://github.com/DeTee1/url-printer/releases/latest)**, extract it, and double-click `index.html` — no server or installation required.

```bash
# Or clone via Git
git clone https://github.com/DeTee1/url-printer.git
cd url-printer
start index.html
```

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Modular vanilla CSS architecture ([`themes.css`](css/themes.css), [`print-engine.css`](css/print-engine.css), [`app.css`](css/app.css)) with `@media print` optimization.
- **Vanilla JavaScript**: Zero-dependency client-side bundle ([`js/app.js`](js/app.js), [`js/readability.js`](js/readability.js)) and modular architecture in [`js/modules/`](js/modules/):
  - [`extractor.js`](js/modules/extractor.js) — Content extraction & sanitization
  - [`paginationEngine.js`](js/modules/paginationEngine.js) — A4/A5 page layout & pagination
  - [`chapterManager.js`](js/modules/chapterManager.js) — Multi-article & chapter management
  - [`tocGenerator.js`](js/modules/tocGenerator.js) — Automatic Table of Contents generation
  - [`inspector.js`](js/modules/inspector.js) — Interactive DOM element editor
  - [`qrGenerator.js`](js/modules/qrGenerator.js) — QR code generation for print links
  - [`docxExporter.js`](js/modules/docxExporter.js) — Word document export

---

## 📄 License

Open source — feel free to use, modify, and share.
