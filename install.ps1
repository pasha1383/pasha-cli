<#
.SYNOPSIS
    Installs the pasha CLI on Windows.

.DESCRIPTION
    PowerShell counterpart to install.sh (Linux/macOS). Checks for Node 18+
    and git, clones pasha-cli into the current user's profile, installs
    production dependencies, and puts a `pasha` shim on the current user's
    PATH — no administrator rights required.

.EXAMPLE
    irm https://raw.githubusercontent.com/pasha1383/pasha-cli/main/install.ps1 | iex

    If PowerShell's execution policy blocks the pipeline above, download the
    file first and run it with an explicit bypass instead of lowering the
    policy machine-wide:
        powershell -ExecutionPolicy Bypass -File install.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$RepoUrl     = 'https://github.com/pasha1383/pasha-cli.git'
$InstallRoot = Join-Path $env:USERPROFILE '.pasha-cli'
# %LOCALAPPDATA%\pasha-cli\bin is per-user and needs no admin rights to
# create or to add to the user's PATH — unlike Program Files/System PATH.
$ShimDir     = Join-Path $env:LOCALAPPDATA 'pasha-cli\bin'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host $msg -ForegroundColor Green }
function Write-Err($msg)  { Write-Host $msg -ForegroundColor Red }

function Exit-WithError($msg) {
    Write-Err "X $msg"
    exit 1
}

Write-Step 'Installing pasha CLI...'

# --- Prerequisite checks -----------------------------------------------

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Exit-WithError 'Node.js not found! Install Node.js 18+ first: https://nodejs.org (or `winget install OpenJS.NodeJS.LTS`)'
}

$nodeVersionRaw = (& node -v).Trim()          # e.g. "v18.19.0"
$nodeMajor = [int]($nodeVersionRaw.TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) {
    Exit-WithError "Node.js 18+ is required. Current version: $nodeVersionRaw"
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Exit-WithError 'git not found! Install git first: https://git-scm.com (or `winget install Git.Git`)'
}

Write-Ok "Found Node.js $nodeVersionRaw and git"

# --- Clone + install ------------------------------------------------------

Write-Step 'Downloading pasha-cli...'
if (Test-Path $InstallRoot) {
    Remove-Item -Recurse -Force $InstallRoot
}
& git clone --depth 1 $RepoUrl $InstallRoot --quiet
if ($LASTEXITCODE -ne 0) {
    Exit-WithError 'git clone failed.'
}

Write-Step 'Installing dependencies...'
Push-Location $InstallRoot
try {
    & npm install --production --silent
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError 'npm install failed.'
    }
} finally {
    Pop-Location
}

# --- Shim + PATH setup ------------------------------------------------

if (-not (Test-Path $ShimDir)) {
    New-Item -ItemType Directory -Path $ShimDir -Force | Out-Null
}

$pashaEntry = Join-Path $InstallRoot 'bin\pasha.js'

# cmd.exe shim — resolved by both Command Prompt and (via PATHEXT) PowerShell.
$cmdShimPath = Join-Path $ShimDir 'pasha.cmd'
@"
@echo off
node "$pashaEntry" %*
"@ | Set-Content -Path $cmdShimPath -Encoding ASCII

# PowerShell shim, for callers that prefer it explicitly / non-PATHEXT hosts.
$ps1ShimPath = Join-Path $ShimDir 'pasha.ps1'
@"
#!/usr/bin/env pwsh
& node "$pashaEntry" @args
exit `$LASTEXITCODE
"@ | Set-Content -Path $ps1ShimPath -Encoding UTF8

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
$pathEntries = $userPath -split ';' | Where-Object { $_ -ne '' }
if ($pathEntries -notcontains $ShimDir) {
    $newUserPath = if ($userPath.EndsWith(';') -or $userPath -eq '') { "$userPath$ShimDir" } else { "$userPath;$ShimDir" }
    [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
    # Make it usable immediately in *this* session too, without waiting for
    # a new terminal to pick up the persisted user PATH.
    $env:Path = "$env:Path;$ShimDir"
    Write-Ok "Added $ShimDir to your user PATH."
} else {
    Write-Ok "$ShimDir is already on your user PATH."
}

Write-Host ''
Write-Ok 'pasha CLI installed!'
Write-Host 'Open a new terminal (so the updated PATH is picked up), then run: pasha --help'
