#!/bin/bash

# Parse command line arguments
MESSAGE=""
SKIP_RSS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --message|-m)
            MESSAGE="$2"
            shift 2
            ;;
        --skip-rss)
            SKIP_RSS=true
            shift
            ;;
        *)
            if [ -z "$MESSAGE" ]; then
                MESSAGE="$1"
            fi
            shift
            ;;
    esac
done

# Check if message is provided
if [ -z "$MESSAGE" ]; then
    echo -e "\033[0;31mError: Commit message is required\033[0m"
    echo "Usage: $0 --message \"Your commit message\" [--skip-rss]"
    echo "   or: $0 \"Your commit message\" [--skip-rss]"
    exit 1
fi

# Function to handle git operations with error checking
invoke_git_command() {
    local command="$1"
    local description="$2"
    
    echo -e "\033[0;33m${description}...\033[0m"
    
    if git $command; then
        echo -e "\033[0;32m${description} completed successfully\033[0m"
    else
        echo -e "\033[0;31mError during ${description}\033[0m"
        exit 1
    fi
}

# Function to generate RSS feed
update_rss_feed() {
    echo -e "\033[0;36mChecking if RSS feed needs updating...\033[0m"
    
    # Check if articles.json exists
    if [ ! -f "assets/json/articles.json" ]; then
        echo -e "\033[0;33marticles.json not found, skipping RSS generation\033[0m"
        return
    fi
    
    # Check if RSS generation script exists
    if [ ! -f "scripts/generate-rss.sh" ]; then
        echo -e "\033[0;33mRSS generation script not found, skipping RSS generation\033[0m"
        return
    fi
    
    echo -e "\033[0;33mGenerating RSS feed from articles.json...\033[0m"
    
    if bash "scripts/generate-rss.sh"; then
        echo -e "\033[0;32mRSS feed updated successfully\033[0m"
        
        # Check if RSS files were modified
        if [ -n "$(git status --porcelain rss/)" ]; then
            echo -e "\033[0;37mRSS files were updated and will be included in commit\033[0m"
        else
            echo -e "\033[0;90mRSS files were up to date\033[0m"
        fi
    else
        echo -e "\033[0;33mWarning: RSS generation failed\033[0m"
        echo -e "\033[0;90m    Continuing with commit anyway...\033[0m"
    fi
}

# Main script execution
echo -e "\033[0;36mStarting automated git commit process...\033[0m"
echo -e "\033[0;37mCommit message: '$MESSAGE'\033[0m"

# Step 1: Pull from main
invoke_git_command "pull origin main" "Pulling latest changes from main"

# Step 2: Generate RSS feed (unless skipped)
if [ "$SKIP_RSS" = false ]; then
    update_rss_feed
else
    echo -e "\033[0;90mSkipping RSS generation (skip-rss flag set)\033[0m"
fi

# Step 3: Add all changes
invoke_git_command "add ." "Adding all changes to staging"

# Step 4: Check if there are actually changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "\033[0;90mNo changes to commit. Everything is up to date.\033[0m"
    exit 0
fi

echo -e "\033[0;37mFiles to be committed:\033[0m"
git status --short
echo ""

# Step 5: Commit with message
invoke_git_command "commit -m \"$MESSAGE\"" "Committing changes"

# Step 6: Push to main
invoke_git_command "push origin main" "Pushing changes to main"

echo -e "\033[0;32mGit commit automation completed successfully!\033[0m"
echo -e "\033[0;37mSummary:\033[0m"
echo -e "\033[0;90m   - Pulled latest changes from main\033[0m"
if [ "$SKIP_RSS" = false ]; then
    echo -e "\033[0;90m   - Generated/updated RSS feed\033[0m"
fi
echo -e "\033[0;90m   - Added all changes to staging\033[0m"
echo -e "\033[0;90m   - Committed with message: '$MESSAGE'\033[0m"
echo -e "\033[0;90m   - Pushed changes to main branch\033[0m"
