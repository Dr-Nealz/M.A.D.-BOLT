$ErrorActionPreference = "Stop"
$projectRoot = "C:\Users\Dr.Neal\Downloads\bolt.diy-main"
Set-Location $projectRoot

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:CSC_ENABLE_CODE_SIGNING = "0"
$env:npm_config_unsafe_perm = "true"

Write-Host "=== Bolt Local - Windows EXE Builder ===" -ForegroundColor Cyan
Write-Host "    User: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)`n" -ForegroundColor DarkGray

# Clean
Write-Host "[Prep] Cleaning old build artifacts..." -ForegroundColor Yellow
& node scripts/clean-build.mjs

# Step 1: Renderer
Write-Host "`n[1/3] Building renderer (Remix Vite)..." -ForegroundColor Yellow
$out = & pnpm exec remix vite:build --config vite-electron.config.js 2>&1
$out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) { Write-Host "RENDERER BUILD FAILED" -ForegroundColor Red; exit 1 }
Write-Host "  Renderer: done" -ForegroundColor Green

# Step 2: Main + preload
Write-Host "`n[2/3] Building main + preload..." -ForegroundColor Yellow
$out = & pnpm run electron:build:deps 2>&1
$out | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) { Write-Host "MAIN/PRELOAD BUILD FAILED" -ForegroundColor Red; exit 1 }
Write-Host "  Main + preload: done" -ForegroundColor Green

# Step 3: Package exe
Write-Host "`n[3/3] Packaging .exe (Electron + NSIS)..." -ForegroundColor Yellow
$out = & pnpm exec electron-builder --win 2>&1
$out | ForEach-Object {
    if ($_ -match "error|Error|failed|ELIFECYCLE") { Write-Host "  $_" -ForegroundColor Red }
    else { Write-Host "  $_" -ForegroundColor DarkGray }
}
if ($LASTEXITCODE -ne 0) { Write-Host "`nPACKAGING FAILED" -ForegroundColor Red; exit 1 }

# Done
Write-Host "`n=== BUILD SUCCESSFUL ===" -ForegroundColor Green
Get-ChildItem "$projectRoot\dist" -Recurse -Filter "*.exe" | ForEach-Object {
    $mb = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name) (${mb} MB)" -ForegroundColor White
}
Write-Host ""
pause
