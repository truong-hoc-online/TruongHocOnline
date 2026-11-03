# Run the whole test suite: fuzz + unit + E2E at 3 sizes (1280x720, 390x844, iPhone emulation).
# Windows PowerShell 5.1. Usage (from anywhere):  powershell -ExecutionPolicy Bypass -File tests\run-all.ps1
# Output (screenshots, results.json): tests\out\<size>\  (gitignored). Exit code 0 = all passed.
param(
  [string]$Python = 'C:\Python314\python.exe',
  [int]$Port = 8081,
  [switch]$SkipE2E
)

$ErrorActionPreference = 'Stop'
$tests = $PSScriptRoot
$repo = Split-Path -Parent $tests
$out = Join-Path $tests 'out'
New-Item -ItemType Directory -Force $out | Out-Null

if (-not (Test-Path $Python)) { $Python = (Get-Command python -ErrorAction SilentlyContinue).Source }
if (-not $Python) { Write-Host 'Python not found'; exit 2 }

$failed = @()
$server = $null
try {
  Write-Host '== fuzz-questions =='
  & node (Join-Path $tests 'fuzz-questions.mjs')
  if ($LASTEXITCODE -ne 0) { $failed += 'fuzz' }

  Write-Host '== unit =='
  & node (Join-Path $tests 'unit.mjs') $repo
  if ($LASTEXITCODE -ne 0) { $failed += 'unit' }

  if (-not $SkipE2E) {
    $busy = $null
    try { $busy = Invoke-WebRequest "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 2 } catch { }
    if ($busy) { throw "Port $Port is already in use: stop the other server first." }

    Write-Host "== starting python http.server on port $Port =="
    $server = Start-Process -FilePath $Python -ArgumentList '-m', 'http.server', "$Port" `
      -WorkingDirectory $repo -WindowStyle Hidden -PassThru
    $up = $false
    for ($i = 0; $i -lt 50 -and -not $up; $i++) {
      Start-Sleep -Milliseconds 200
      try { $up = (Invoke-WebRequest "http://localhost:$Port/sw.js" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { }
    }
    if (-not $up) { throw 'http.server did not start' }

    $runs = @(
      @{ name = '1280x720'; args = @('1280', '720') },
      @{ name = '390x844'; args = @('390', '844') },
      @{ name = 'iphone'; args = @('390', '844', 'iphone') }
    )
    foreach ($r in $runs) {
      Write-Host "== e2e $($r.name) =="
      & node (Join-Path $tests 'e2e.mjs') (Join-Path $out $r.name) @($r.args)
      if ($LASTEXITCODE -ne 0) { $failed += "e2e $($r.name)" }
    }
  }
}
catch {
  Write-Host "ERROR: $_"
  $failed += 'runner'
}
finally {
  if ($server) {
    try { Stop-Process -Id $server.Id -Force -ErrorAction Stop } catch { }
    Write-Host '== http.server stopped =='
  }
}

if ($failed.Count) {
  Write-Host "FAILED: $($failed -join ', ')"
  exit 1
}
Write-Host 'ALL TESTS PASSED'
exit 0
