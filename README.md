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

VS Code extension that maintains persistent project code context across sessions using local markdown files.

## Overview

Persistent Code Context helps developers keep important project code context accessible across VS Code sessions. It stores short notes, decisions, and session progress in markdown files within the workspace so context survives restarts and machine reboots.

**Storage:** Local `.vscode-context/` folder in your workspace — readable/editable by you.

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
