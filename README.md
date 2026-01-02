# Persistent Code Context

> *A VSCode extension that remembers what you were working on—because you won't.*

Automatically maintains a running log of your work sessions, decisions, and context across workspaces. Stored locally as plain markdown. No cloud (unless you want it), no databases, no drama.

**Never lose track of what you (and your AI overlord) were working on again.**

## What Fresh Hell Is This?

Oh, you know, just another extension because your brain—and your AI assistant's context window—have the memory retention of a goldfish on vacation.

Ever found yourself:
- Re-explaining your entire tech stack to your AI for the 47th time this week?
- Switching VS Code workspaces and suddenly neither you nor your AI remembers where anything is?
- Coming back to a project after 3 months and spending the first hour just figuring out what the hell past-you was thinking?
- Wishing your AI could remember that one architectural decision you made at 2 AM that seemed brilliant at the time?

Yeah. We've all been there. It sucks.

**Persistent Code Context** solves this by automatically maintaining a running log of your work sessions, decisions, and general shenanigans—all stored as simple markdown files. You know, files you can actually *read* without a PhD in database archaeology.

## Why Should You Care?

- **Remember your work:** Automatically tracks what you're working on, what files are open, and recent commits (you know, like a journal you'll never have to write yourself)
- **Resume seamlessly:** Get prompted to continue your last session when you reopen VS Code (shocking, I know)
- **Track decisions:** Keep a log of why you made certain architectural choices (for when future-you inevitably questions past-you's sanity)
- **Merge sessions:** Combine multiple work sessions because apparently you can't finish anything in one sitting
- **Stay organized:** Plain markdown files. No databases, no cloud, no "oops we got acquired and your data is gone" nonsense

Think of it as a work journal that actually writes itself. Revolutionary concept, right?

## How It Works (The Non-Bullshit Version)

All context is stored in `~/.vscode-persistent-context/<workspace-name>-<hash>/` as plain markdown files:

- **No databases** - Just markdown. You know how to open markdown files, right?
- **No cloud** - Everything stays on your machine (until you set up the optional backup)
- **No lock-in** - Can't afford vendor lock-in when there's no vendor
- **No AI Required** - Works with or without your favorite AI assistant (but let's be honest, that's why you're here)

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

### Session Management
• Start/End sessions with custom names  
• Resume previous sessions on startup  
• Merge multiple sessions when your ADHD kicked in  
• Auto-prompt when unfinished business is detected

### Persistent Storage
Each workspace gets its own directory with markdown files:

• `activeContext.md` – What you're doing right now  
• `progress.md` – The trail of productivity (or lack thereof)  
• `changes.md` – Every time you breathe near a file  
• `decisionLog.md` – For documenting genius (or future regrets)  
• `.workspace-info` – Boring metadata stuff

### Commands (via Command Palette)
All prefixed with `Persistent Code Context:`

• `Start Session` – Begin productive procrastination  
• `End Session` – Admit defeat and save your work  
• `View Session` – Review what you thought you were doing  
• `View History` – Browse your trail of tears  
• `View Decisions` – Question past decisions  
• `Add Note` – Quick notes when inspiration strikes  
• `Copy Context` – Copy everything for your AI  
• `View Context` – See what the extension thinks you're doing  
• `Settings` – Tweak the defaults

### Configuration

• **`persistentContext.storageDirectory`** – Where to store context (default: `~/.vscode-persistent-context`)  
• **`persistentContext.autosaveInterval`** – Seconds between autosaves (default: 60)  
• **`persistentContext.enableAutosave`** – Enable/disable autosave (default: true)  
• **`persistentContext.enableChangeLogging`** – Log file/git changes (default: true)

---

## 4be Sync (DIY)

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

---

## ⚠️ Known Limitations

• Git integration requires git CLI installed  
• FileSystemWatcher may lag on slow systems  
• Won't make you a better programmer (you're on your own there)

---

## 🚧 Future Plans (Phase 2+)

*Assuming I don't abandon this like my other 47 side projects:*

• Optional cloud sync with encryption  
• Integration with issue trackers  
• Enhanced decision capture UI with tagging  
• Time-travel diffs (Doctor Who cosplay optional)  
• AI-generated summaries of your work sessions

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

