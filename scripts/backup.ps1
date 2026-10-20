param(
    [string]$Message = "",
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Ensure UTF-8 console output and encoding across environments
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Ensure Git is in PATH
$minGitPath = "$env:LOCALAPPDATA\MinGit\cmd"
if (Test-Path "$minGitPath\git.exe") {
    $env:PATH = "$minGitPath;$env:PATH"
}

# 1. Check version.js
$versionFile = Join-Path $projectRoot "js\version.js"
if (-not (Test-Path $versionFile)) {
    @'
// URL Printer Studio Version Configuration
window.APP_VERSION = "0.1.11";
'@ | Set-Content -Path $versionFile -Encoding UTF8
}

$content = Get-Content -Path $versionFile -Raw -Encoding UTF8
if ($content -match 'window\.APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"') {
    $major = $matches[1]
    $minor = $matches[2]
    $patch = [int]$matches[3] + 1
    $newVersion = "$major.$minor.$patch"
} else {
    $newVersion = "0.1.13"
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  URL Printer - Automaticka zaloha a verzovani" -ForegroundColor Cyan
Write-Host "  Nova verze aplikace: v$newVersion" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Dotaz na zprávu/popis změn pro Changelog (pokud nebyla předána parametrem)
if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Host "Zadejte popis provedenych zmen a oprav (nepovinne):" -ForegroundColor White
    Write-Host "(Stisknete Enter pro automaticky souhrn zmen)" -ForegroundColor DarkGray
    $userInput = Read-Host "Popis změn"
    if (-not [string]::IsNullOrWhiteSpace($userInput)) {
        $Message = $userInput.Trim()
    }
}

# 2. Automatické zjištění změněných souborů přes git status
$changedFilesSummary = @()
try {
    $statusLines = & git status --porcelain
    foreach ($line in $statusLines) {
        if ($line.Length -gt 3) {
            $f = $line.Substring(3).Trim()
            if ($f -notmatch 'version\.js') {
                $changedFilesSummary += $f
            }
        }
    }
} catch {}

if ([string]::IsNullOrWhiteSpace($Message)) {
    if ($changedFilesSummary.Count -gt 0) {
        $filesStr = ($changedFilesSummary | Select-Object -First 4) -join ", "
        if ($changedFilesSummary.Count -gt 4) { $filesStr += " a dalsi..." }
        $Message = "Upravy a optimalizace souboru: $filesStr"
    } else {
        $Message = "Pravidelna udrzba, optimalizace kodu a zaloha projektu"
    }
}

# 3. Aktualizace CHANGELOG.md
$changelogFile = Join-Path $projectRoot "CHANGELOG.md"
$currentDate = Get-Date -Format "dd.MM.yyyy"
$newChangelogEntry = @"
## [v$newVersion] — $currentDate

### 📝 Změny a úpravy
- $Message
$(if ($changedFilesSummary.Count -gt 0) {
    "- Dotcene soubory: " + (($changedFilesSummary | ForEach-Object { "``$_``" }) -join ", ")
})

---

"@

if (Test-Path $changelogFile) {
    $oldChangelog = Get-Content -Path $changelogFile -Raw -Encoding UTF8
    # Vložit nový záznam za hlavní nadpis
    if ($oldChangelog -match '(?s)(# [^\r\n]+\r?\n\r?\n[^\r\n]+\r?\n\r?\n---\r?\n\r?\n)(.*)') {
        $updatedChangelog = $matches[1] + $newChangelogEntry + $matches[2]
    } else {
        $updatedChangelog = $newChangelogEntry + $oldChangelog
    }
    [System.IO.File]::WriteAllText($changelogFile, $updatedChangelog, [System.Text.Encoding]::UTF8)
} else {
    $initialChangelog = "# Seznam zmen (Changelog) - URL Printer Studio`n`n" + $newChangelogEntry
    [System.IO.File]::WriteAllText($changelogFile, $initialChangelog, [System.Text.Encoding]::UTF8)
}

# 4. Update version.js
$newContent = @"
// URL Printer Studio Version Configuration
window.APP_VERSION = "$newVersion";
"@
[System.IO.File]::WriteAllText($versionFile, $newContent, [System.Text.Encoding]::UTF8)

# 5. Update index.html badge
$indexFile = Join-Path $projectRoot "index.html"
if (Test-Path $indexFile) {
    $indexHtml = Get-Content -Path $indexFile -Raw -Encoding UTF8
    $updatedHtml = [System.Text.RegularExpressions.Regex]::Replace(
        $indexHtml,
        '<span class="brand-version-badge" id="app-version-badge"[^>]*>.*?</span>',
        '<span class="brand-version-badge" id="app-version-badge" title="Kliknutím zobrazíte historii verzí a změn (Changelog)">v' + $newVersion + '</span>'
    )
    if ($updatedHtml -ne $indexHtml) {
        [System.IO.File]::WriteAllText($indexFile, $updatedHtml, [System.Text.Encoding]::UTF8)
    }
}

# 6. Git add and commit
Write-Host "[1/4] Priprava souboru (git add)..." -ForegroundColor Gray
& git add .

$timestamp = Get-Date -Format "dd.MM.yyyy HH:mm:ss"
$commitMsg = "Release v${newVersion}: $Message ($timestamp)"

Write-Host "[2/4] Ukladani verze (commit: v$newVersion)..." -ForegroundColor Gray
& git commit -m "$commitMsg"

# 7. Git push
Write-Host "[3/4] Odesilani do repozitare (git push origin main)..." -ForegroundColor Gray
& git push origin main

# 8. GitHub Release & Tag v0.1.xx (if GitHub CLI is available)
$ghCli = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $ghCli)) {
    $ghCommand = Get-Command "gh" -ErrorAction SilentlyContinue
    if ($ghCommand) { $ghCli = $ghCommand.Source }
}

if (Test-Path $ghCli) {
    Write-Host "[4/4] Vytvareni verze v$newVersion na GitHubu (Release & Tag)..." -ForegroundColor Gray
    try {
        $tempZip = Join-Path $env:TEMP "url-printer-v$newVersion-standalone.zip"
        if (Test-Path $tempZip) { Remove-Item $tempZip -Force }
        Compress-Archive -Path "index.html", "inspector.html", "CHANGELOG.md", "css", "js", "README.md" -DestinationPath $tempZip -Force

        $releaseNotes = @"
### 🚀 URL Printer v$newVersion
- **Co se změnilo:** $Message
- **Spustitelná online verze:** https://detee1.github.io/url-printer/
- **Historie změn:** Kompletní changelog je k dispozici v [CHANGELOG.md](https://github.com/DeTee1/url-printer/blob/main/CHANGELOG.md)
- **Offline verze ke stažení:** ``url-printer-v$newVersion-standalone.zip``
"@

        & $ghCli release create "v$newVersion" $tempZip --title "URL Printer v$newVersion" --notes "$releaseNotes"
        Write-Host "  -> GitHub Release v$newVersion byl uspesne vytvoren!" -ForegroundColor Green
    } catch {
        Write-Host "  -> GitHub Release se nepodarilo vytvorit automaticky: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[4/4] GitHub CLI nenalezen, tagovan commit v$newVersion..." -ForegroundColor Gray
    & git tag "v$newVersion"
    & git push origin "v$newVersion"
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Hotovo! Verze v$newVersion s protokolem zmen byla zalohovana." -ForegroundColor Green
Write-Host "  Online aplikace: https://detee1.github.io/url-printer/" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Green
Start-Sleep -Seconds 4
