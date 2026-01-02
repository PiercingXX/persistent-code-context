# Persistent Code Context

> *A VSCode extension that remembers what you were working on—because you won't.*

Automatically maintains a running log of your work sessions, decisions, and context across workspaces. Stores everything locally as plain markdown. Uses AI to summarize what you're building, captures your conversations with AI agents, and auto-detects deployment context. No cloud required, no drama.

**Never lose track of what you (and your AI overlord) were working on again.**

## What Fresh Hell Is This?

Oh, you know, just another extension because your brain—and your AI assistant's context window—have the memory retention of a goldfish on vacation.

Ever found yourself:
- Re-explaining your entire tech stack to your AI for the 47th time this week?
- Switching VS Code workspaces and suddenly neither you nor your AI remembers where anything is?
- Coming back to a project after 3 months and spending the first hour just figuring out what the hell past-you was thinking?
- Wishing your AI could remember that one architectural decision you made at 2 AM that seemed brilliant at the time?
- Pasting the entire project context into chat every time a new AI agent joins the conversation?

Yeah. We've all been there. It sucks.

**Persistent Code Context** solves this by:
1. **Automatically maintaining** a running log of your work sessions, decisions, and shenanigans
2. **Using AI** to actually understand what you're building (not just dumb metadata)
3. **Capturing AI conversations** - your chat history with agents becomes context
4. **Auto-detecting deployment info** - just mention deployment details naturally in chat
5. Storing everything as **simple markdown files** you can actually read

## Why Should You Care?

- **AI-Powered Summaries:** Uses Ollama/Copilot/GitHub Models to understand what you're actually building (not just "files changed")
- **Chat Memory:** Captures your conversations with AI agents and includes them in context
- **One-Click Context Sharing:** "Teach AI Agent" command generates a full briefing for new agents
- **Auto-Detected Deployment:** Mention deployment details naturally—AI captures location, access method, environment, work mode
- **Resume Seamlessly:** Get prompted to continue your last session
- **Track Decisions:** Keep a log of architectural choices
- **Stay Organized:** Plain markdown files. No databases. No vendor lock-in. No oops-we-got-acquired scenarios

Think of it as a work journal that actually writes itself *and understands what you're doing*. Revolutionary concept, right?

## How It Works (The Non-Bullshit Version)

All context is stored in `~/.vscode-persistent-context/<workspace-name>-<hash>/` as plain markdown files:

- **No databases** - Just markdown. You know how to open markdown files, right?
- **No cloud** - Everything stays on your machine (until you set up the optional backup)
- **No lock-in** - Can't afford vendor lock-in when there's no vendor
- **AI-Powered, Not Required** - Works with or without AI, but AI summaries are where the magic happens

Each workspace gets its own directory with a unique hash, so you can have 47 projects all named "test" and the extension won't have an existential crisis.

## 🚀 Quick Start

**From GitHub Releases:**

```bash
# Download the latest release
wget https://github.com/PiercingXX/persistent-code-context/releases/latest/download/persistent-context-0.0.1.vsix

# Install it
code --install-extension persistent-context-0.0.1.vsix
```

**Manual:** Download from [releases page](https://github.com/PiercingXX/persistent-code-context/releases)

---

## 🌟 Features

### AI-Powered Context Summarization
**Automatic project understanding using AI:**
- Understands what you're building, not just file names
- Supports multiple AI providers:
  - **Ollama** (local models, default: neural-chat)
  - **GitHub Copilot** (via VS Code LM API)
  - **GitHub Models** (gpt-4o via Azure Inference)
  - *(OpenAI and Anthropic coming soon)*
- Gracefully falls back to basic logging if AI unavailable
- Summarizes every 60 seconds (or on manual save)

### Chat Context Capture
**Captures your AI agent conversations:**
- Monitors VS Code chat windows automatically
- Extracts user instructions and requirements
- Shows recent chat in `activeContext.md`
- Full chat history in `changes.md`
- Immediate context update when chat activity detected
- Zero configuration needed

### Automatic Deployment Detection
**No configuration needed—just mention deployment details naturally in chat:**
- Detects **Location** - "deployed to server.example.com"
- Captures **Access Method** - "via SSH", "Docker", "Kubernetes", "HTTP"
- Recognizes **Deployment Method** - "git pull", "CI/CD", "Docker rebuild", "Direct file edit"
- Identifies **Environment** - "production" vs "development" or "staging"
- Extracts **Work Mode** - "feature development", "bug fixes", "testing", "refactoring", "maintenance"

All extracted automatically—no manual settings needed!

### Session Management
• Start/End sessions with custom names  
• Resume previous sessions on startup  
• Merge multiple sessions when your ADHD kicked in  
• Auto-prompt when unfinished business is detected

### Persistent Storage
Each workspace gets its own directory with markdown files:

• `activeContext.md` – AI-generated project summary + deployment context  
• `progress.md` – Session history and decisions  
• `changes.md` – File/git changes + chat instructions  
• `decisionLog.md` – Architectural decisions  
• `.workspace-info` – Workspace metadata

### Commands (via Command Palette)
All prefixed with `Persistent Code Context:`

• `Start Session` – Begin productive procrastination  
• `End Session` – Admit defeat and save your work  
• `View Session` – Review what you thought you were doing  
• `View History` – Browse your trail of tears  
• `View Decisions` – Question past decisions  
• `Add Note` – Quick notes when inspiration strikes  
• `Teach AI Agent / Share Project Knowledge` – Generate briefing for new AI agents (copies to clipboard)  
• `Copy Context` – Copy everything for your AI  
• `View Context` – See what the extension thinks you're doing  
• `Settings` – Tweak the defaults

### Configuration

**Storage & Behavior:**
• **`persistentContext.storageDirectory`** – Where to store context (default: `~/.vscode-persistent-context`)  
• **`persistentContext.autosaveInterval`** – Seconds between autosaves (default: 60)  
• **`persistentContext.enableAutosave`** – Enable/disable autosave (default: true)  
• **`persistentContext.enableChangeLogging`** – Log file/git changes (default: true)

**AI Configuration:**
• **`persistentContext.aiProvider`** – Which AI to use: `auto` | `ollama` | `copilot` | `github-models` | `openai` | `anthropic` (default: `auto`)  
• **`persistentContext.ollamaEndpoint`** – Local Ollama endpoint (default: `http://localhost:11434`)  
• **`persistentContext.githubToken`** – Token for GitHub Models API (or use `GITHUB_TOKEN` env var)  
• **`persistentContext.openaiApiKey`** – OpenAI API key (when implemented)  
• **`persistentContext.anthropicApiKey`** – Anthropic API key (when implemented)

---

## 📖 Usage Guide

### Starting Your First Session

1. Open a workspace in VS Code
2. `Ctrl+Shift+P` → "Start Session"
3. Give it a name (e.g., "Feature: Auth System")
4. Extension auto-saves every 60 seconds with AI summaries

### Teaching a New AI Agent

The **Teach AI Agent** command generates a comprehensive briefing including:
- Full project structure and architecture
- Recent commits and changes
- Current work session
- Chat history with instructions
- Detected deployment context
- Decision log

**Steps:**
1. `Ctrl+Shift+P` → "Teach AI Agent / Share Project Knowledge"
2. Full briefing opens in a new markdown document
3. It automatically copies to your clipboard
4. Paste into your AI chat—boom, full context

### Capturing Deployment Info

Just mention these naturally in chat with your AI:
- "Deploy to production via SSH"
- "We're doing feature development on the staging server"
- "Access through Docker on localhost:3000"
- "CI/CD pipeline runs our tests before deployment"

AI extracts and stores it automatically—no need to update settings!

### Setting Up AI

**Ollama (Recommended for local development):**
```bash
# Install Ollama from ollama.ai
# Pull a model
ollama pull neural-chat

# Extension will auto-detect at http://localhost:11434
```

**GitHub Copilot:**
- Install GitHub Copilot extension
- Sign in to GitHub
- Extension auto-detects

**GitHub Models:**
- Set `persistentContext.githubToken` in settings
- Or set `GITHUB_TOKEN` environment variable
- Uses gpt-4o via Azure Inference API

---

## 🔄 Sync (DIY)

The extension writes to `persistentContext.storageDirectory` (default: `~/.vscode-persistent-context`). It never auto-syncs.

If you want Git backup:
• `cd ~/.vscode-persistent-context && git init`  
• Add your private remote and push on your own schedule  
• Automate however you like (cron, systemd timers, custom scripts)

Sample scripts exist in `scripts/` (`setup-backup.sh`, `sync-context.sh`) but they are **manual** and off by default. Use or ignore as you prefer.

---

## 🛠️ Development

**Setup:**

```bash
npm install
npm run compile
```

**Run in dev mode:**

```bash
code --extensionDevelopmentPath="$PWD" --disable-extensions
```

**Run tests:**

```bash
npm test
```

**Package:**

```bash
npx vsce package --allow-missing-repository
```

---

## 🔧 Technical Details

• TypeScript 4.7+  
• VS Code Engine: ^1.70.0  
• Node.js 16+  
• Runtime Dependencies: None (zilch, nada)  
• Dev Dependencies: Mocha, Chai, ts-node, @vscode/vsce

**Architecture:**
- ContextSnapshotCollector – Gathers workspace metadata, project structure, git info, open editors
- AIService – Pluggable LLM provider abstraction with auto-detection
- ChatContextWatcher – Monitors VS Code chat and extracts instructions
- FileService – Handles context storage with automatic directory creation
- GitService – Git integration for tracking changes

---

## ⚠️ Known Limitations

• Git integration requires git CLI installed  
• FileSystemWatcher may lag on slow systems  
• Chat monitoring works with VS Code's built-in chat (other chat extensions may not be detected)
• Won't make you a better programmer (you're on your own there)

---

## 🚧 Future Plans (Phase 2+)

*Assuming I don't abandon this like my other 47 side projects:*

• Optional cloud sync with encryption  
• Integration with issue trackers  
• Enhanced decision capture UI with tagging  
• Time-travel diffs (Doctor Who cosplay optional)  
• OpenAI provider implementation  
• Anthropic provider implementation  
• Custom AI prompts configuration  
• Context diff visualizations

---

## 🤝 Contributing

Found a bug? Have a feature idea? Fork, branch, and PR welcome. Keep code POSIX-friendly and avoid hard-coded paths when possible.

Releases are automated via GitHub Actions.

---

## 📄 License

Apache © PiercingXX  
See the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

```
Email: Don't

Open an issue in the relevant repo instead. If it's a rant, make it entertaining.
```

---

*Made with ☕ and existential dread about forgetting what I was working on.*

