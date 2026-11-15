param(
  [string]$Python = 'python',
  [switch]$SkipPython,
  [switch]$SkipIntegrations,
  [switch]$Smoke
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
function Run-Checked {
  param([string]$Program,[string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}
Push-Location -LiteralPath $repoRoot
try {
  $nodeVersion = (& node --version).Trim()
  if ([int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 24) { throw 'Install Node 24 or newer; the reference machine uses Node 24.19.0.' }
  if ((& pnpm --version).Trim() -ne '11.25.0') { throw 'Use pnpm 11.25.0 from package.json; do not regenerate the lockfile.' }
  Run-Checked -Program 'pnpm' -Arguments @('install','--frozen-lockfile')
  Run-Checked -Program 'pnpm' -Arguments @('exec','playwright','install','chromium')
  Run-Checked -Program 'npm' -Arguments @('ci','--prefix','integrations/remotion','--ignore-scripts','--no-fund','--no-audit')
  Run-Checked -Program 'node' -Arguments @('scripts/video-runtime.mjs','install-browser')
  if (-not $SkipIntegrations) { Run-Checked -Program 'pnpm' -Arguments @('director:setup') }
  if (-not $SkipPython) {
    Run-Checked -Program $Python -Arguments @('-c','import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"')
    $venvPython = Join-Path $repoRoot '.venv-video/Scripts/python.exe'
    if (-not (Test-Path -LiteralPath $venvPython)) { Run-Checked -Program $Python -Arguments @('-m','venv','.venv-video') }
    Run-Checked -Program $venvPython -Arguments @('-m','pip','install','--disable-pip-version-check','-r','requirements-video.txt')
    $doctorArguments = @('scripts/video.mjs','doctor')
    if ($SkipIntegrations) { $doctorArguments += '--core-only' }
    Run-Checked -Program 'node' -Arguments $doctorArguments
  } else { Run-Checked -Program 'node' -Arguments @('scripts/video-runtime.mjs','doctor','--core-only') }
  if ($Smoke) {
    Run-Checked -Program 'node' -Arguments @('scripts/video-smoke.mjs')
    if (-not $SkipIntegrations) { Run-Checked -Program 'node' -Arguments @('scripts/video-integration-smoke.mjs') }
  }
  Write-Output 'Setup completed. No secrets copied, no AI planning/TTS calls, and no ASR model downloaded. Read docs/NEW_MACHINE_SETUP.md before production.'
} finally { Pop-Location }
