param(
    [Parameter(Mandatory=$true)]
    [string]$Message
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

# Main script execution
Write-Host "Starting automated git commit process..." -ForegroundColor Cyan
Write-Host "Commit message: '$Message'" -ForegroundColor White

# Step 1: Pull from main
Invoke-GitCommand "pull origin main" "Pulling latest changes from main"

# Step 2: Add all changes
Invoke-GitCommand "add ." "Adding all changes to staging"

# Step 3: Commit with message
$escapedMessage = $Message -replace '"', '\"'
Invoke-GitCommand "commit -m `"$escapedMessage`"" "Committing changes"

# Step 4: Push to main
Invoke-GitCommand "push origin main" "Pushing changes to main"

Write-Host "Git commit automation completed successfully!" -ForegroundColor Green
Write-Host "ummary:" -ForegroundColor White
Write-Host "   - Pulled latest changes from main" -ForegroundColor Gray
Write-Host "   - Added all changes to staging" -ForegroundColor Gray
Write-Host "   - Committed with message: '$Message'" -ForegroundColor Gray
Write-Host "   - Pushed changes to main branch" -ForegroundColor Gray