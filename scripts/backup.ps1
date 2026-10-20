param(
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

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
    $newVersion = "0.1.11"
}

# Update version.js
$newContent = @"
// URL Printer Studio Version Configuration
window.APP_VERSION = "$newVersion";
"@
[System.IO.File]::WriteAllText($versionFile, $newContent, [System.Text.Encoding]::UTF8)

# Update index.html badge if present
$indexFile = Join-Path $projectRoot "index.html"
if (Test-Path $indexFile) {
    $indexHtml = Get-Content -Path $indexFile -Raw -Encoding UTF8
    $updatedHtml = [System.Text.RegularExpressions.Regex]::Replace(
        $indexHtml,
        '<span class="brand-version-badge" id="app-version-badge"[^>]*>.*?</span>',
        '<span class="brand-version-badge" id="app-version-badge" title="Verze aplikace">v' + $newVersion + '</span>'
    )
    if ($updatedHtml -ne $indexHtml) {
        [System.IO.File]::WriteAllText($indexFile, $updatedHtml, [System.Text.Encoding]::UTF8)
    }
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  URL Printer - Automaticka zaloha a verzovani" -ForegroundColor Cyan
Write-Host "  Nova verze aplikace: v$newVersion" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 2. Git add and commit
Write-Host "[1/4] Priprava souboru (git add)..." -ForegroundColor Gray
& git add .

$timestamp = Get-Date -Format "dd.MM.yyyy HH:mm:ss"
$commitMsg = "Release v${newVersion} - Automaticka zaloha ($timestamp)"

Write-Host "[2/4] Ukladani verze (commit: v$newVersion)..." -ForegroundColor Gray
& git commit -m "$commitMsg"

# 3. Git push
Write-Host "[3/4] Odesilani do repozitare (git push origin main)..." -ForegroundColor Gray
& git push origin main

# 4. GitHub Release & Tag v0.1.xx (if GitHub CLI is available)
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
        Compress-Archive -Path "index.html", "inspector.html", "css", "js", "README.md" -DestinationPath $tempZip -Force

        & $ghCli release create "v$newVersion" $tempZip --title "URL Printer v$newVersion" --notes "### 🚀 URL Printer v$newVersion
- Automaticky publikovana verze v$newVersion
- Spustitelna online verze: https://detee1.github.io/url-printer/
- Offline verze v priloze: url-printer-v$newVersion-standalone.zip"
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
Write-Host "  Hotovo! Verze v$newVersion je zalohovana na GitHubu." -ForegroundColor Green
Write-Host "  Online aplikace: https://detee1.github.io/url-printer/" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Green
Start-Sleep -Seconds 4
