param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [switch]$SkipRss
)

# Function to handle git operations with error checking
function Invoke-GitCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "$Description..." -ForegroundColor Yellow
    
    try {
        Invoke-Expression "git $Command"
        if ($LASTEXITCODE -ne 0) {
            throw "Git command failed with exit code $LASTEXITCODE"
        }
        Write-Host "$Description completed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error during $Description`: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Function to generate RSS feed
function Update-RssFeed {
    Write-Host "📡 Checking if RSS feed needs updating..." -ForegroundColor Cyan
    
    # Check if articles.json exists
    if (-not (Test-Path "assets\json\articles.json")) {
        Write-Host "articles.json not found, skipping RSS generation" -ForegroundColor Yellow
        return
    }
    
    # Check if RSS generation script exists
    if (-not (Test-Path "scripts\generate-rss.ps1")) {
        Write-Host "RSS generation script not found, skipping RSS generation" -ForegroundColor Yellow
        return
    }
    
    try {
        Write-Host "Generating RSS feed from articles.json..." -ForegroundColor Yellow
        & "scripts\generate-rss.ps1"
        Write-Host "RSS feed updated successfully" -ForegroundColor Green
        
        # Check if RSS files were modified
        $rssStatus = git status --porcelain "rss/"
        if ($rssStatus) {
            Write-Host "RSS files were updated and will be included in commit" -ForegroundColor White
        } else {
            Write-Host "RSS files were up to date" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "Warning: RSS generation failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    Continuing with commit anyway..." -ForegroundColor Gray
    }
}

# Main script execution
Write-Host "Starting automated git commit process..." -ForegroundColor Cyan
Write-Host "Commit message: '$Message'" -ForegroundColor White

# Step 1: Pull from main
Invoke-GitCommand "pull origin main" "Pulling latest changes from main"

# Step 2: Generate RSS feed (unless skipped)
if (-not $SkipRss) {
    Update-RssFeed
} else {
    Write-Host "Skipping RSS generation (SkipRss flag set)" -ForegroundColor Gray
}

# Step 3: Add all changes
Invoke-GitCommand "add ." "Adding all changes to staging"

# Step 4: Check if there are actually changes to commit
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit. Everything is up to date." -ForegroundColor Gray
    exit 0
}

Write-Host "Files to be committed:" -ForegroundColor White
git status --short
Write-Host ""

# Step 5: Commit with message
$escapedMessage = $Message -replace '"', '\"'
Invoke-GitCommand "commit -m `"$escapedMessage`"" "Committing changes"

# Step 6: Push to main
Invoke-GitCommand "push origin main" "Pushing changes to main"

Write-Host "Git commit automation completed successfully!" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor White
Write-Host "   - Pulled latest changes from main" -ForegroundColor Gray
if (-not $SkipRss) {
    Write-Host "   - Generated/updated RSS feed" -ForegroundColor Gray
}
Write-Host "   - Added all changes to staging" -ForegroundColor Gray
Write-Host "   - Committed with message: '$Message'" -ForegroundColor Gray
Write-Host "   - Pushed changes to main branch" -ForegroundColor Gray