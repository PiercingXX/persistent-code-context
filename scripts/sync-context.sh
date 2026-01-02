#!/bin/bash

# Script to sync persistent context to GitHub
# Can be run manually or set up as a cron job

CONTEXT_DIR="${HOME}/.vscode-persistent-context"

cd "$CONTEXT_DIR" || exit 1

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    echo "No changes to sync"
    exit 0
fi

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
git commit -m "Auto-sync: $TIMESTAMP"

# Push to origin
if git push origin main; then
    echo "✅ Context synced successfully at $TIMESTAMP"
else
    echo "❌ Failed to sync context"
    exit 1
fi
