# Persistent Code Context

> *A VSCode extension that remembers what you were working on—because you won't.*


Maintains a running log of your work sessions across workspaces as local markdown files. AI-powered summaries (via Ollama or GitHub Models). Auto-captures chat instructions and deployment context. **Autonomous iteration loop: let AI improve your code, create PRs, and merge them automatically.**

**Never lose track of what you (and your AI overlord) were working on again. Better yet: let the AI do the work for you.**

## What This Solves

**Problem 1: Memory Loss**  
You're in a project for an hour, switch workspaces, come back 3 months later, and have zero context. Your AI has it worse—16k token context window gone.

**Problem 2: Repetitive Context Setup**  
Every time you work with a new AI, you paste the same project overview. Every. Single. Time.

**Problem 3: Decision Amnesia**  
Why did past-you make that architectural choice? You'll never know. But future-you will wonder.

**Problem 4: Context Window Waste**  
You spend 3 tokens describing your deployment setup every chat. That's inefficient as hell.

**Problem 5: One-Shot AI Limitations**  
AI can improve code, but only in one go. You have to prompt it again and again for iterative improvements.

This extension solves all of them:
- **Persistent memory** - Automatically tracks what you're building across all sessions
- **AI-powered summaries** - Understands your project with Ollama or GitHub Models (not just grep)
- **Decision logging** - Tracks "why" as well as "what"
- **One-click briefing** - "Teach AI Agent" copies full context to clipboard
- **Autonomous loops** - AI iterates automatically: code → commit → PR → merge → repeat

## How It Works

All context is stored locally in `~/.vscode-persistent-context/<workspace>-<hash>/` as plain markdown files:

- **No databases** - Just plain text markdown  
- **No cloud** - Everything stays on your machine  
- **No lock-in** - Can migrate anytime  
- **AI-optional** - Works great with or without AI summaries  
- **Auto-detecting** - Captures deployment info from natural chat mentions


## Installation

```bash
# Option 1: From releases
wget https://github.com/PiercingXX/persistent-code-context/releases/latest/download/persistent-context-0.0.1.vsix
code --install-extension persistent-context-0.0.1.vsix

# Option 2: Build from source
npm install && npm run compile && npx vsce package
code --install-extension persistent-context-0.0.1.vsix
```

## 🚀 Quick Start


1. `Ctrl+Shift+P` → "Persistent Context: Start Session"
2. Name your session, work normally
3. Extension auto-saves context every 60 seconds

**Try Autonomous Loop:** `Ctrl+Shift+P` → "Start Continuous Loop" → Enter task & iterations

## 🌟 Features

**Phase 1: Context Tracking**
- Auto-manages sessions across workspaces
- AI-powered summaries (Ollama/GitHub Models)
- Chat context capture & deployment detection
- Decision logging, one-click briefing for new AI

**Phase 2: Autonomous Iteration**
- Continuous loop: branch → AI → commit → PR → merge
- Each iteration injects previous context
- Real-time progress in output panel
- Full GitHub PR automation

## Commands

`Start Session` • `End Session` • `View Session` • `View History` • `View Decisions` • `Add Note` • `Teach AI Agent` • `Copy Context` • `View Context` • `Settings` • `Start Continuous Loop`

## Configuration

**Storage:**
- `persistentContext.storageDirectory` - Where to store (default: `~/.vscode-persistent-context`)  
- `persistentContext.autosaveInterval` - Autosave interval in seconds (default: 60)  
- `persistentContext.enableAutosave` - Enable autosave (default: true)  
- `persistentContext.enableChangeLogging` - Log file changes (default: true)

**AI Service:**
- `persistentContext.aiProvider` - Which AI: `auto | ollama | copilot | github-models` (default: `auto`)  
- `persistentContext.ollamaEndpoint` - Ollama server (default: `http://localhost:11434`)  
- `persistentContext.ollamaModel` - Model name (default: `mistral`)  
- `persistentContext.githubToken` - GitHub token (or use `GITHUB_TOKEN` env var)

**Continuous Loop:**
- `persistentContext.prCheckTimeout` - PR check polling timeout in seconds (default: 1800)

## Setup AI Service

**Ollama (Recommended - Free, Local, No API Keys):**
```bash
ollama pull mistral && ollama serve
```

**GitHub Models:**
```bash
# Set in VS Code settings or env var GITHUB_TOKEN
"persistentContext.githubToken": "github_pat_..."
```

**GitHub CLI (for Phase 2):**
```bash
gh auth login
gh auth status          # Verify: "Logged in to github.com as <username>"
```

## Storage

Context stored in `~/.vscode-persistent-context/<workspace>-<hash>/`:
- `activeContext.md` - AI summary + deployment
- `progress.md` - Session history & decisions
- `changes.md` - File/git changes + chat
- `decisionLog.md` - Decisions
- `SHARED_TASK_NOTES.md` - Iteration history

## Development

```bash
npm install && npm run compile && npm test
code --extensionDevelopmentPath="$PWD" --disable-extensions
npx vsce package
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Ollama not found | `ollama serve` in another terminal |
| gh not authenticated | `gh auth login && gh auth status` |
| Loop hangs on PR checks | Check GitHub Actions • Increase timeout in settings |

## License

Apache © PiercingXX - See [LICENSE](LICENSE)

## Support

Found a bug or have a feature idea? Open an issue on GitHub!

---

*Made with ☕ and existential dread about context loss—plus the dream that open-source AI can actually improve your code.*

