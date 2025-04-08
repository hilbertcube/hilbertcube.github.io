@echo off

:: Check if a commit message argument is provided
if "%~1"=="" (
    echo No commit message provided. Usage: script.bat "your commit message"
    exit /b
)

:: Use the provided commit message as the argument
set commit_message=%~1

:: Check if the directory is a git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo This is not a git repository. Make sure you're in a git repository folder.
    exit /b
)

:: Add all changes to the staging area
git add .

:: Commit the changes with the user-provided message
git commit -m "%commit_message%"
if errorlevel 1 (
    echo Commit failed. Check if there are any changes to commit.
    exit /b
)

:: Optionally, push the changes to the repository (uncomment if needed)
git push origin main
if errorlevel 1 (
    echo Push failed. Check if the repository is up to date or if you need to authenticate.
    exit /b
)

:: End of script
pause

:: usage (powershell): ./git.bat "updates"
