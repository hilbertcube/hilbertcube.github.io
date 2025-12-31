#!/bin/bash

# Parse command line arguments
MESSAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --message|-m)
            MESSAGE="$2"
            shift 2
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
    echo "Usage: $0 --message \"Your commit message\""
    echo "   or: $0 \"Your commit message\""
    exit 1
fi

# Function to handle git operations with error checking
invoke_git_command() {
    local command="$1"
    local description="$2"
    
    echo -e "\033[0;33m${description}...\033[0m"
    
    if eval "git $command"; then
        echo -e "\033[0;32m${description} completed successfully\033[0m"
    else
        echo -e "\033[0;31mError during ${description}\033[0m"
        exit 1
    fi
}

# Main script execution
echo -e "\033[0;36mStarting automated git commit process...\033[0m"
echo -e "\033[0;37mCommit message: '$MESSAGE'\033[0m"

# Step 1: Pull from main
invoke_git_command "pull origin main" "Pulling latest changes from main"

# Step 2: Add all changes
invoke_git_command "add ." "Adding all changes to staging"

# Step 3: Commit with message
invoke_git_command "commit -m \"$MESSAGE\"" "Committing changes"

# Step 4: Push to main
invoke_git_command "push origin main" "Pushing changes to main"

echo -e "\033[0;32mGit commit automation completed successfully!\033[0m"
echo -e "\033[0;37mSummary:\033[0m"
echo -e "\033[0;90m   - Pulled latest changes from main\033[0m"
echo -e "\033[0;90m   - Added all changes to staging\033[0m"
echo -e "\033[0;90m   - Committed with message: '$MESSAGE'\033[0m"
echo -e "\033[0;90m   - Pushed changes to main branch\033[0m"
