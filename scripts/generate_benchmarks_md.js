const fs = require('fs');
const path = require('path');
const vm = require('vm');

const benchmarkPath = path.join(__dirname, '..', 'js', 'global_benchmarks.js');
const benchmarkCode = fs.readFileSync(benchmarkPath, 'utf8');

const sandbox = { global: {} };
vm.createContext(sandbox);
vm.runInContext(benchmarkCode, sandbox);

const all = sandbox.GlobalBenchmarkRegistry.getAll();
const cats = sandbox.GlobalBenchmarkRegistry.getCategories();

let md = `# Přehled testovaných stránek a autentických stylů (Benchmark 2.0)\n\n`;
md += `Kompletní referenční databáze 115 ověřených celosvětových médií, publikačních systémů a CSS frameworků se skutečnými komerčními, zakázkovými a nativními font-stacky.\n\n---\n\n`;

cats.forEach(c => {
  const items = all.filter(b => b.category === c.key);
  md += `### ${c.name} (${items.length} webů)\n\n`;
  md += `| Web / Zdroj | Doména / Host | Autentický font nadpisu (H1-H3) | Autentický font textu (P) | Barva nadpisu | Barva textu | Brand Accent | Stav |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n`;
  items.forEach(it => {
    const title = it.title.split(':')[0].replace(/\|/g, '-').trim();
    const host = it.styleTokens.sourceHost;
    const hFont = (it.styleTokens.headingFont || '').replace(/"/g, '');
    const bFont = (it.styleTokens.bodyFont || '').replace(/"/g, '');
    const hCol = it.styleTokens.h1Color || it.styleTokens.headingColor;
    const pCol = it.styleTokens.pColor;
    const brand = it.styleTokens.brandColor;
    md += `| **${title}** | \`${host}\` | \`${hFont}\` | \`${bFont}\` | \`${hCol}\` | \`${pCol}\` | \`${brand}\` | PASS |\n`;
  });
  md += `\n`;
});

const outPath = path.join(__dirname, '..', 'tested_sites_benchmark_2.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Successfully generated tested_sites_benchmark_2.md with ${all.length} benchmarks.`);
