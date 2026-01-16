# ClioDesk Installation

Quick installation guide for ClioDesk across different platforms.

## Platform Support

ClioDesk's architecture is designed to be cross-platform and supports:
- **Linux** - Fully tested and supported
- **macOS** - Fully tested and supported (Intel and Apple Silicon)
- **Windows** - Architecturally supported but **not yet tested in production**

**Note:** While the codebase is designed to run on Windows, it has not been extensively tested on that platform. Windows users may encounter issues. Contributions and testing reports are welcome!

---

## Detailed Installation Guides

For complete platform-specific installation instructions, see:

- **[INSTALL_LINUX.md](INSTALL_LINUX.md)** - Complete Linux installation guide
  - Ubuntu, Debian, Fedora, Arch Linux
  - AppImage and .deb packages
  - System dependencies and troubleshooting

- **[INSTALL_MACOS.md](INSTALL_MACOS.md)** - Complete macOS installation guide
  - Intel and Apple Silicon support
  - Homebrew dependencies
  - DMG installation and security settings

---

## Prerequisites

Before installing ClioDesk, ensure you have:

- **Node.js** 20+ and npm 10+
- **Python** 3.11+ (for topic modeling services)
- **Pandoc** + **XeLaTeX** (for PDF export)
- **Ollama** with models:
  - `nomic-embed-text` (embeddings - required)
  - `gemma2:2b` (chat - recommended)

---

## Quick Installation

### Linux (AppImage)

```bash
# Download the AppImage from releases
chmod +x ClioDesk-*.AppImage

# Optional: Install to applications menu
./scripts/install-desktop.sh ClioDesk-*.AppImage

# Launch
./ClioDesk-*.AppImage
```

### Linux (Debian/Ubuntu .deb)

```bash
sudo dpkg -i cliodesk_*.deb
sudo apt-get install -f  # Install missing dependencies
```

### macOS (DMG)

```bash
# Download DMG from releases
open ClioDesk-*.dmg

# Drag ClioDesk to Applications folder
# First launch: System Preferences → Security & Privacy → Open Anyway
```

### Windows (Experimental)

```bash
# Download the NSIS installer from releases
# Run ClioDesk-Setup-*.exe

# Note: Windows support is experimental and untested
```

---

## Installing Ollama and Models

### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull nomic-embed-text
ollama pull gemma2:2b
```

### macOS

```bash
brew install ollama
brew services start ollama
ollama pull nomic-embed-text
ollama pull gemma2:2b
```

### Windows

Download Ollama from [ollama.ai](https://ollama.ai/) and install, then:

```bash
ollama pull nomic-embed-text
ollama pull gemma2:2b
```

---

## Building from Source

For developers or if pre-built packages are not available:

```bash
# Clone repository
git clone https://github.com/your-org/cliodesk.git
cd cliodesk

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild -f

# Build the application
npm run build

# Launch in development mode
npm start

# Or build packages for distribution
npm run build:linux    # AppImage + .deb
npm run build:mac      # DMG (x64 + arm64)
npm run build:win      # NSIS installer (untested)
```

See [BUILD_AND_DEPLOYMENT.md](BUILD_AND_DEPLOYMENT.md) for complete build instructions.

---

## First Launch Configuration

On first launch, ClioDesk will:

1. Check Ollama connection (http://localhost:11434)
2. Create project structure in your chosen folder
3. Initialize vector database (`.cliodesk/vectors.db`)

Configure in **Settings**:
- LLM backend (Ollama URL and models)
- RAG parameters (topK, similarity threshold)
- Zotero integration (optional)

---

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama manually if needed
ollama serve
```

### Native module errors (better-sqlite3, hnswlib-node)

```bash
# Rebuild native modules for your platform
cd /path/to/cliodesk
npx electron-rebuild -f
```

### Missing Pandoc or XeLaTeX

PDF export requires both Pandoc and XeLaTeX. See platform-specific guides for installation instructions.

---

## Getting Help

- **Installation Issues:** See platform-specific guides ([INSTALL_LINUX.md](INSTALL_LINUX.md), [INSTALL_MACOS.md](INSTALL_MACOS.md))
- **Build Issues:** See [BUILD_AND_DEPLOYMENT.md](BUILD_AND_DEPLOYMENT.md)
- **General Questions:** Open an issue on [GitHub](https://github.com/your-org/cliodesk/issues)
- **Architecture Documentation:** See [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Uninstallation

### Linux (AppImage)

```bash
rm ~/.local/share/applications/cliodesk.desktop
rm -rf ~/.local/share/icons/hicolor/*/apps/cliodesk.png
update-desktop-database ~/.local/share/applications/
```

### Linux (.deb)

```bash
sudo apt remove cliodesk
```

### macOS

```bash
rm -rf /Applications/ClioDesk.app
rm -rf ~/Library/Application\ Support/cliodesk
rm -rf ~/Library/Logs/ClioDesk
```

### Windows

Use "Add or Remove Programs" in Windows Settings.

---

**Note:** Your project data (`.md` files, PDFs, `.cliodesk/` folders) is stored in your project directories and is not automatically deleted during uninstallation.
