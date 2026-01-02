#!/bin/bash

# Setup script for backing up persistent context to private GitHub repository
# This creates a private repository and sets up automatic syncing

set -e

CONTEXT_DIR="${HOME}/.vscode-persistent-context"
REPO_NAME="vscode-persistent-context-backup"
GITHUB_USER="${1:-PiercingXX}"

echo "🔧 Setting up persistent context backup..."
echo "Context directory: $CONTEXT_DIR"
echo "GitHub user: $GITHUB_USER"
echo ""

# Create context directory if it doesn't exist
if [ ! -d "$CONTEXT_DIR" ]; then
    echo "📁 Creating context directory..."
    mkdir -p "$CONTEXT_DIR"
fi

cd "$CONTEXT_DIR"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "🎯 Initializing git repository..."
    git init
    
    # Create a README
    cat > README.md << 'EOF'
# VSCode Persistent Context Backup

This repository contains the persistent context data from your VSCode workspaces.

**⚠️ This repository should be PRIVATE** - it may contain sensitive information about your projects.

## Structure

Each workspace gets its own directory: `<workspace-name>-<hash>/`

Files in each workspace directory:
- `activeContext.md` - Current session state
- `progress.md` - Session history
- `changes.md` - Change log
- `decisionLog.md` - Decision tracking
- `.workspace-info` - Workspace metadata

## Syncing

To manually sync:
```bash
cd ~/.vscode-persistent-context
git add .
git commit -m "Update context $(date +%Y-%m-%d)"
git push
```

## Automated Syncing

You can set up a cron job to automatically sync:

```bash
# Add to crontab (crontab -e):
0 */4 * * * cd ~/.vscode-persistent-context && git add . && git commit -m "Auto-sync $(date +%Y-%m-%d-%H:%M)" && git push origin main 2>&1 | logger -t vscode-context-sync
```

Or use the provided sync script in the extension repository.
EOF

    # Create .gitignore
    cat > .gitignore << 'EOF'
*.log
.DS_Store
*.tmp
EOF

    git add README.md .gitignore
    git commit -m "Initial commit: Setup persistent context backup"
    
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo ""
    echo "⚠️  GitHub CLI (gh) not found. Please install it to create the repository automatically:"
    echo "   https://cli.github.com/"
    echo ""
    echo "Manual setup:"
    echo "1. Create a private repository named '$REPO_NAME' on GitHub"
    echo "2. Add remote: git remote add origin git@github.com:$GITHUB_USER/$REPO_NAME.git"
    echo "3. Push: git push -u origin main"
    exit 1
fi

# Check if remote already exists
if git remote | grep -q "^origin$"; then
    echo "✅ Remote 'origin' already exists"
    REMOTE_URL=$(git remote get-url origin)
    echo "   URL: $REMOTE_URL"
else
    echo "🚀 Creating private GitHub repository..."
    
    # Create private repository
    gh repo create "$REPO_NAME" --private --source=. --remote=origin --description="Private backup of VSCode persistent context data"
    
    echo "✅ Repository created successfully"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Context directory: $CONTEXT_DIR"
echo "📍 GitHub repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "💡 To sync on other machines:"
echo "   cd ~"
echo "   git clone git@github.com:$GITHUB_USER/$REPO_NAME.git .vscode-persistent-context"
echo ""
echo "💡 To set up automatic syncing, see scripts/sync-context.sh"
