<#
.SYNOPSIS
    Builds Bolt Local Electron app for Windows with full admin privileges.

.DESCRIPTION
    Runs the full electron:build:win pipeline:
      1. Clears electron-builder code-sign cache
      2. Builds renderer (Remix Vite)
      3. Builds main + preload (Vite)
      4. Packages Windows .exe via electron-builder

    Must be run as Administrator to allow symlink creation during
    code-signing tool extraction.

.NOTES
    Run: Right-click -> Run as Administrator
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# ── Ensure admin ──────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(`
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n[!] Restarting as Administrator..." -ForegroundColor Yellow
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process pwsh -Verb RunAs -ArgumentList $args
    exit
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Bolt Local — Windows .EXE Builder" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Locate project root (script lives in project root) ───────
$projectRoot = Split-Path -Parent $PSCommandPath
Set-Location $projectRoot
Write-Host "[1/4] Project root: $projectRoot" -ForegroundColor DarkGray

# ── Check pnpm ────────────────────────────────────────────────
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[!] pnpm not found. Install it: npm i -g pnpm" -ForegroundColor Red
    pause
    exit 1
}

# ── Step 1: Clear corrupted cache ─────────────────────────────
Write-Host "`n[2/4] Clearing electron-builder code-sign cache..." -ForegroundColor Yellow
$winCodeSignCache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign"
if (Test-Path $winCodeSignCache) {
    Remove-Item -Recurse -Force $winCodeSignCache -ErrorAction SilentlyContinue
    Write-Host "       Cache cleared." -ForegroundColor DarkGray
} else {
    Write-Host "       Cache already clean." -ForegroundColor DarkGray
}

# ── Step 2: Build renderer ────────────────────────────────────
Write-Host "`n[3/4] Building renderer (Remix Vite)..." -ForegroundColor Yellow
Write-Host "       This takes ~2-3 minutes..." -ForegroundColor DarkGray
& pnpm run electron:build:renderer 2>&1 | ForEach-Object {
    $line = $_
    if ($line -match "✓ built") {
        Write-Host "       $line" -ForegroundColor Green
    } elseif ($line -match "error|Error|ELIFECYCLE") {
        Write-Host "       $line" -ForegroundColor Red
    } else {
        Write-Host "       $line" -ForegroundColor DarkGray
    }
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] Renderer build FAILED." -ForegroundColor Red
    pause
    exit 1
}

# ── Step 3: Build main + preload ──────────────────────────────
Write-Host "`n[4/4] Building main process + preload + packaging .exe..." -ForegroundColor Yellow
Write-Host "       This takes ~2-3 minutes..." -ForegroundColor DarkGray
& pnpm run electron:build:win 2>&1 | ForEach-Object {
    $line = $_
    if ($line -match "✓ built") {
        Write-Host "       $line" -ForegroundColor Green
    } elseif ($line -match "error|Error|ELIFECYCLE|failed") {
        Write-Host "       $line" -ForegroundColor Red
    } elseif ($line -match "packaging|downloaded|electron-builder") {
        Write-Host "       $line" -ForegroundColor Cyan
    } else {
        Write-Host "       $line" -ForegroundColor DarkGray
    }
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] Build FAILED." -ForegroundColor Red
    pause
    exit 1
}

# ── Done ──────────────────────────────────────────────────────
$distDir = Join-Path $projectRoot "dist"
$exeFiles = Get-ChildItem -Path $distDir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($exeFiles) {
    foreach ($f in $exeFiles) {
        $sizeMB = [math]::Round($f.Length / 1MB, 1)
        Write-Host "`n  EXE: $($f.FullName)" -ForegroundColor White
        Write-Host "  Size: ${sizeMB} MB" -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n  Check the dist\ folder for your .exe" -ForegroundColor Yellow
}

Write-Host "`n  Output: $distDir" -ForegroundColor DarkGray
Write-Host "`nPress any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
