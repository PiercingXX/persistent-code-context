# Persistent Context - Build Directory

This is the development directory for Phase 1 of the Persistent Context VSCode extension.

## Project Structure

```
src/
├── extension.ts           (Main entry point)
├── services/
│   ├── contextManager.ts  (Core context management)
│   ├── fileService.ts     (File I/O operations)
│   └── gitService.ts      (Git integration)
├── ui/
# Persistent Code Context

**Never lose track of what you were working on again.**

## What is it?

Ever closed VS Code and forgot what you were doing? Returned to a project after a week and couldn't remember where you left off? Spent 20 minutes trying to recall that important decision you made yesterday?

Persistent Code Context solves this by automatically maintaining a running log of your work sessions, decisions, and notes - all stored as simple markdown files in your project.

## Why use it?

- **Remember your work:** Automatically tracks what you're working on, what files are open, recent commits
- **Resume seamlessly:** Get prompted to continue your last session when you reopen VS Code
- **Track decisions:** Keep a log of why you made certain architectural or implementation choices
- **Merge sessions:** Combine multiple work sessions into a cohesive history
- **Stay organized:** Everything is saved in plain markdown files you can read, edit, and version control

Think of it as a work journal that writes itself.

## How it works

All context is stored in a `.vscode-context/` folder in your workspace as plain markdown files - no databases, no cloud, no lock-in. You own your data.

## Features

### Session Management
- Start/End sessions with custom names
- Resume previous sessions on startup
- Merge multiple sessions into consolidated entries
- Auto-prompt when multiple sessions detected

### Persistent Storage
- `.vscode-context/activeContext.md` - current session state
- `.vscode-context/progress.md` - session history
- `.vscode-context/changes.md` - change log
- `.vscode-context/decisionLog.md` - decision tracking

### Commands (via Command Palette)
- `Persistent Code Context: Start Session` - Begin new work session
- `Persistent Code Context: End Session` - Save and close session
- `Persistent Code Context: View Session` - Browse session history
- `Persistent Code Context: View History` - Open progress.md
- `Persistent Code Context: View Decisions` - Open decision log
- `Persistent Code Context: Add Note` - Quick note capture
- `Persistent Code Context: Copy Context` - Copy to clipboard
- `Persistent Code Context: View Context` - View active context
- `Persistent Code Context: Settings` - Open settings

### Configuration
- `persistentContext.autosaveInterval` - Seconds between autosaves (default: 60)
- `persistentContext.enableAutosave` - Enable/disable autosave (default: true)
- `persistentContext.enableChangeLogging` - Log file/git changes (default: true)

### Status Bar Integration
- Shows active session name
- Click to view context

## Installation

**From GitHub Releases:**

```bash
# Download the latest release
wget https://github.com/PiercingXX/persistent-code-context/releases/latest/download/persistent-context-0.0.1.vsix

# Install
code --install-extension persistent-context-0.0.1.vsix
```

**Or download manually from:** https://github.com/PiercingXX/persistent-code-context/releases

## Development

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

## Technical Details

- TypeScript 4.7+
- VS Code Engine: ^1.70.0
- Node.js 16+
- Dependencies: None (runtime)
- Dev Dependencies: Mocha, Chai, ts-node, @vscode/vsce

## Known Limitations

- Git integration requires git CLI installed
- FileSystemWatcher may have slight delay on some systems
- No remote sync (planned for Phase 2)

## Future Plans (Phase 2+)

- Optional cloud sync / cloud backup encrypted per user
- Integration with issue trackers to link decisions
- Enhanced decision capture UI and tagging
- Time-travel diffs for project context

## Contributing

Issues and pull requests welcome! Releases are automated via GitHub Actions on version tags.

## License

Apache-2.0 License - See LICENSE file

## Author

PiercingXX
