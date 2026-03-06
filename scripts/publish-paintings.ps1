param(
    [Parameter(Mandatory = $true)]
    [string]$ItemsFile,

    [Parameter(Mandatory = $true)]
    [string]$RepoPath,

    [Parameter(Mandatory = $true)]
    [string]$Branch,

    [Parameter(Mandatory = $true)]
    [string]$BuildCommand,

    [Parameter(Mandatory = $true)]
    [string]$CommitMessage,

    [bool]$AutoPush = $true
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $RepoPath)) {
    throw "Portfolio repo not found: $RepoPath"
}

if (-not (Test-Path -LiteralPath $ItemsFile)) {
    throw "Items file not found: $ItemsFile"
}

$items = Get-Content -LiteralPath $ItemsFile -Raw | ConvertFrom-Json
$items = @($items)

if ($items.Count -eq 0) {
    Write-Output "No painting items to publish."
    exit 0
}

$statusArgs = @('-C', $RepoPath, 'status', '--porcelain', '--untracked-files=all')
$statusLines = @(& git @statusArgs)
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read git status for $RepoPath"
}
if ($statusLines.Count -gt 0) {
    throw "Portfolio repo has uncommitted changes. Resolve them before auto-publishing."
}

$branchArgs = @('-C', $RepoPath, 'branch', '--show-current')
$currentBranch = (& git @branchArgs).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Unable to determine current git branch for $RepoPath"
}
if ($currentBranch -ne $Branch) {
    throw "Portfolio repo must be on '$Branch' but is on '$currentBranch'."
}

$stagedPaths = New-Object System.Collections.Generic.List[string]

foreach ($item in $items) {
    $sourceFullPath = [string]$item.sourceFullPath
    $repoRelativePath = [string]$item.repoRelativePath

    if ([string]::IsNullOrWhiteSpace($sourceFullPath) -or -not (Test-Path -LiteralPath $sourceFullPath)) {
        throw "Source image is missing: $sourceFullPath"
    }

    if ([string]::IsNullOrWhiteSpace($repoRelativePath)) {
        throw "Missing repoRelativePath in sync item."
    }

    $destinationFullPath = Join-Path $RepoPath $repoRelativePath
    $destinationDir = Split-Path -Parent $destinationFullPath
    if (-not (Test-Path -LiteralPath $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }

    Copy-Item -LiteralPath $sourceFullPath -Destination $destinationFullPath -Force
    [void]$stagedPaths.Add($repoRelativePath)
    Write-Output "Copied $sourceFullPath -> $repoRelativePath"
}

Push-Location $RepoPath
try {
    cmd.exe /c $BuildCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Build command failed: $BuildCommand"
    }
} finally {
    Pop-Location
}

[void]$stagedPaths.Add('paintings.json')
[void]$stagedPaths.Add('public/paintings.json')

$uniquePaths = @($stagedPaths | Select-Object -Unique)
$addArgs = @('-C', $RepoPath, 'add', '--') + $uniquePaths
& git @addArgs
if ($LASTEXITCODE -ne 0) {
    throw "git add failed for portfolio assets."
}

$diffArgs = @('-C', $RepoPath, 'diff', '--cached', '--quiet', '--exit-code')
& git @diffArgs
if ($LASTEXITCODE -eq 0) {
    Write-Output "No portfolio changes to commit."
    exit 0
}
if ($LASTEXITCODE -ne 1) {
    throw "Unable to inspect staged portfolio changes."
}

$commitArgs = @('-C', $RepoPath, 'commit', '-m', $CommitMessage)
& git @commitArgs
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed for portfolio publish."
}

if ($AutoPush) {
    $pushArgs = @('-C', $RepoPath, 'push', 'origin', $Branch)
    & git @pushArgs
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed for portfolio publish."
    }
}

Write-Output "Portfolio publish completed successfully."
