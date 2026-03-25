<#
One-command push for 3 repos:
1) Full project repo (main remote)
2) Frontend-only repo (subtree split from ./frontend)
3) Backend-only repo (subtree split from ./backend)

Usage:
  pwsh ./push-three-repos.ps1

Optional:
  pwsh ./push-three-repos.ps1 `
    -MainRemote origin `
    -FrontendRemote frontend `
    -BackendRemote backend `
    -MainRemoteUrl https://github.com/cyberhive54/SchoolOS-r-v1.git `
    -FrontendRemoteUrl https://github.com/cyberhive54/SchoolOS-r-frontend.git `
    -BackendRemoteUrl https://github.com/cyberhive54/SchoolOS-r-backend.git `
    -MainBranch main

First run:
- If a remote is missing, script auto-adds it using configured URLs below.
#>

[CmdletBinding()]
param(
  [string]$MainRemote = 'origin',
  [string]$FrontendRemote = 'frontend',
  [string]$BackendRemote = 'backend',
  [string]$MainRemoteUrl = 'https://github.com/cyberhive54/SchoolOS-r-v1.git',
  [string]$FrontendRemoteUrl = 'https://github.com/cyberhive54/SchoolOS-r-frontend.git',
  [string]$BackendRemoteUrl = 'https://github.com/cyberhive54/SchoolOS-r-backend.git',
  [string]$MainBranch,
  [string]$FrontendBranch,
  [string]$BackendBranch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Args -join ' ')"
  }
}

function Get-GitOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Args -join ' ')"
  }
  return ($output | Out-String).Trim()
}

function Test-GitCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  & git @Args *> $null
  return ($LASTEXITCODE -eq 0)
}

function Test-RemoteUrlLooksValid {
  param(
    [string]$Url
  )

  if (-not $Url) { return $false }
  $trimmed = $Url.Trim()

  # Supports HTTPS/SSH URL formats commonly used by Git remotes.
  if ($trimmed -match '^(https?|ssh)://') { return $true }
  if ($trimmed -match '^[^@\s]+@[^:\s]+:.+$') { return $true }

  return $false
}

function Get-ShortCommit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Commit
  )

  if ($Commit.Length -le 12) { return $Commit }
  return $Commit.Substring(0, 12)
}

function Ensure-Remote {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteName,
    [Parameter(Mandatory = $true)]
    [string]$FriendlyLabel,
    [string]$RemoteUrl
  )

  try {
    $existingUrl = Get-GitOutput -Args @('remote', 'get-url', $RemoteName)
    if ($existingUrl) {
      if (-not (Test-RemoteUrlLooksValid -Url $existingUrl)) {
        if ($RemoteUrl) {
          Write-Host "Remote '$RemoteName' exists but URL is invalid: $existingUrl"
          Write-Host "Resetting '$RemoteName' to configured URL."
          Invoke-Git -Args @('remote', 'set-url', $RemoteName, $RemoteUrl)
          $existingUrl = $RemoteUrl
        } else {
          throw "Remote '$RemoteName' has invalid URL: $existingUrl"
        }
      }
      Write-Host "Using existing remote '$RemoteName' ($existingUrl) for $FriendlyLabel."
      return
    }
  } catch {
    # Missing remote -> prompt and add.
  }

  Write-Host ""
  Write-Host "Remote '$RemoteName' for $FriendlyLabel is not configured."

  if ($RemoteUrl) {
    Invoke-Git -Args @('remote', 'add', $RemoteName, $RemoteUrl)
    Write-Host "Added remote '$RemoteName' with configured URL."
    return
  }

  $url = Read-Host "Enter git URL for remote '$RemoteName' (leave blank to cancel)"
  if (-not $url) {
    throw "Missing remote '$RemoteName'. Setup cancelled by user."
  }
  Invoke-Git -Args @('remote', 'add', $RemoteName, $url)
  Write-Host "Added remote '$RemoteName'."
}

# Ensure script runs from repo root or any subdir inside repo.
if (-not (Test-GitCommand -Args @('rev-parse', '--show-toplevel'))) {
  throw @"
Current folder is not a Git repository.
Run these once, then run this script again:

  git init -b main
  git add .
  git commit -m "Initial commit"

Or clone/open the existing repository that already has .git.
"@
}

$repoRoot = Get-GitOutput -Args @('rev-parse', '--show-toplevel')
Set-Location $repoRoot

if (-not (Test-GitCommand -Args @('rev-parse', '--verify', 'HEAD'))) {
  throw @"
This Git repository has no commits yet.
Create the first commit, then run this script:

  git add .
  git commit -m "Initial commit"
"@
}

# Fail fast on uncommitted changes to avoid pushing inconsistent state.
$status = Get-GitOutput -Args @('status', '--porcelain')
if ($status) {
  throw "Working tree is not clean. Commit/stash changes before running this script."
}

$currentBranch = Get-GitOutput -Args @('rev-parse', '--abbrev-ref', 'HEAD')
if (-not $MainBranch) { $MainBranch = $currentBranch }
if (-not $FrontendBranch) { $FrontendBranch = $MainBranch }
if (-not $BackendBranch) { $BackendBranch = $MainBranch }

Ensure-Remote -RemoteName $MainRemote -FriendlyLabel 'whole project repository' -RemoteUrl $MainRemoteUrl
Ensure-Remote -RemoteName $FrontendRemote -FriendlyLabel 'frontend-only repository' -RemoteUrl $FrontendRemoteUrl
Ensure-Remote -RemoteName $BackendRemote -FriendlyLabel 'backend-only repository' -RemoteUrl $BackendRemoteUrl

if (-not (Test-Path (Join-Path $repoRoot 'frontend'))) {
  throw "Missing folder: frontend"
}

if (-not (Test-Path (Join-Path $repoRoot 'backend'))) {
  throw "Missing folder: backend"
}

Write-Host "Pushing full repository to '$MainRemote' ($MainBranch)..."
Invoke-Git -Args @('push', $MainRemote, "HEAD:refs/heads/$MainBranch")
$mainPushedCommit = Get-GitOutput -Args @('rev-parse', 'HEAD')

Write-Host "Creating frontend subtree split..."
$frontendSplit = Get-GitOutput -Args @('subtree', 'split', '--prefix=frontend', 'HEAD')
if (-not $frontendSplit) {
  throw 'Failed to compute frontend subtree split commit.'
}

Write-Host "Pushing frontend split to '$FrontendRemote' ($FrontendBranch)..."
Invoke-Git -Args @('push', $FrontendRemote, "${frontendSplit}:refs/heads/$FrontendBranch")

Write-Host "Creating backend subtree split..."
$backendSplit = Get-GitOutput -Args @('subtree', 'split', '--prefix=backend', 'HEAD')
if (-not $backendSplit) {
  throw 'Failed to compute backend subtree split commit.'
}

Write-Host "Pushing backend split to '$BackendRemote' ($BackendBranch)..."
Invoke-Git -Args @('push', $BackendRemote, "${backendSplit}:refs/heads/$BackendBranch")

Write-Host ''
Write-Host 'All pushes completed successfully.'
Write-Host "Main:     $MainRemote -> $MainBranch"
Write-Host "Frontend: $FrontendRemote -> $FrontendBranch"
Write-Host "Backend:  $BackendRemote -> $BackendBranch"
Write-Host ''
Write-Host 'Pushed commit hashes:'
Write-Host "Main:     $(Get-ShortCommit $mainPushedCommit) ($mainPushedCommit)"
Write-Host "Frontend: $(Get-ShortCommit $frontendSplit) ($frontendSplit)"
Write-Host "Backend:  $(Get-ShortCommit $backendSplit) ($backendSplit)"
