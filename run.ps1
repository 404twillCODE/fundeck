# FunDeck — run everything (frontend + blackjack server)
# From repo root: .\run.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "FunDeck: installing dependencies..." -ForegroundColor Cyan
Set-Location $root
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location "$root\blackjack-server"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $root
Write-Host "FunDeck: starting Next.js + blackjack server (Ctrl+C to stop)..." -ForegroundColor Green
npm run dev:all
