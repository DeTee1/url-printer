# 📋 Seznam změn (Changelog) — URL Printer Studio

Tento soubor eviduje historii změn, oprav a novinek pro jednotlivé verze aplikace URL Printer Studio.

---

## [v0.1.13] — 20.10.2026

### 📝 Změny a úpravy
- Přidání souboru `CHANGELOG.md`, interaktivního dialogu historie změn přímo do horní lišty UI a automatického logování změn do GitHub Releases.
- Dotčené soubory: `css/app.css`, `css/print-engine.css`, `css/themes.css`, `index.html`, `js/app.js`, `js/i18n.js`, `scripts/backup.ps1`, `CHANGELOG.md`

---

## [v0.1.12] — 20.10.2026

### 🚀 Nové funkce & vylepšení
- **Zobrazení verze přímo v UI**: Přidán odznak verze (`v0.1.12`) do horní lišty vedle loga aplikace.
- **Automatické verzování (SemVer)**: Skript zálohování nyní automaticky inkrementuje verzi (`v0.1.11` ➔ `v0.1.12`) a synchronizuje číslo do `js/version.js` i HTML rozhraní.
- **Automatický GitHub Release**: Při každé záloze se na GitHubu automaticky vytvoří nový Release a Tag s přiloženým offline `.zip` balíčkem.
- **Vylepšený Reed-Solomon QR generátor**: Optimalizace podpory ISO/IEC 18004 pro offline generování QR kódů odkazů.

### 🐛 Opravy
- Opravena synchronizace Git cesty v prostředí PowerShellu.
- Vyřešena mezipaměť (cache busting) pro načítání stylů a skriptů.

---

## [v0.1.0] — 17.10.2026

### 🚀 První veřejná verze
- **Zveřejnění projektu na GitHubu**: Repozitář nastaven jako Public.
- **Spuštěn GitHub Pages**: Aplikace je přímo spustitelná v prohlížeči na adrese `https://detee1.github.io/url-printer/`.
- **Vícejazyčnost (i18n)**: Přidána podpora lokalizace rozhraní do samostatného modulu `i18n.js`.
- **Mozilla Readability integrace**: Čistá extrakce hlavního textu z webových článků a blogů bez reklam.
- **Správa projektů (.urlprint)**: Možnost ukládat rozpracované články a kapitoly a znovu je načítat přetažením myší.
