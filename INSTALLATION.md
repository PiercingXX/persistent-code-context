# Installation Guide

## Quick Install

```bash
# Download latest release
wget https://github.com/PiercingXX/persistent-code-context/releases/latest/download/persistent-context-0.0.1.vsix

# Install the extension
code --install-extension persistent-context-0.0.1.vsix
```

## Manual Download

1. Go to https://github.com/PiercingXX/persistent-code-context/releases
2. Download the latest `.vsix` file
3. In VS Code: `Extensions` → `...` → `Install from VSIX`
4. Select the downloaded file

## Update to New Version

```bash
# Download new release
wget https://github.com/PiercingXX/persistent-code-context/releases/download/v0.0.2/persistent-context-0.0.2.vsix

# Install (overwrites old version)
code --install-extension persistent-context-0.0.2.vsix
```

## Verify Installation

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Persistent Code Context"
4. You should see commands like "Start Session", "End Session", etc.

## Uninstall

```bash
code --uninstall-extension undefined_publisher.persistent-context
```

Or via VS Code Extensions panel → Right-click → Uninstall
