# Build and Deployment Guide - ClioDesk

This document explains how to compile, package, and deploy ClioDesk for different platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Build and Packaging](#build-and-packaging)
- [User Installation](#user-installation)
- [Initial Configuration](#initial-configuration)
- [Common Issues](#common-issues)
- [Distribution and Releases](#distribution-and-releases)

---

## Prerequisites

### Development

- **Node.js** 18+ and npm
- **Python** 3.9+ (for better-sqlite3 and Python services)
- **Ollama** installed locally for testing

### Platform-Specific

**Linux:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools or Visual Studio Community
- Python 3.9+ with pip

---

## Installation

### Installing Dependencies

```bash
npm install
```

This command installs all Node.js dependencies and automatically compiles native modules (better-sqlite3, hnswlib-node, etc.).

### Installing Python Dependencies (Topic Modeling)

Python services are used for topic modeling. For the development environment:

```bash
cd backend/python-services/topic-modeling
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# Or: .venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

---

## Development

### Development Mode with Hot Reload

```bash
npm run dev
```

This command launches in parallel:
- Main process TypeScript in watch mode
- Preload script in watch mode
- Renderer (React) with Vite hot reload

### Start the Application

In another terminal:

```bash
npm start
```

### Full Development Mode (All-in-One)

```bash
npm run dev:full
```

Launches build watch AND the application automatically after 3 seconds.

### Tests

```bash
# Run once
npm test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

### Linting and Type Checking

```bash
# Linter
npm run lint

# Type checking
npm run typecheck
```

---

## Build and Packaging

### Build Without Packaging

```bash
npm run build
```

Compiles:
- Main process TypeScript → `dist/src/main/`
- Preload script → `dist/src/preload/`
- Renderer React → `dist/src/renderer/`

### Build with Packaging

#### All Platforms

```bash
npm run build:all
```

Creates installers for all platforms configured in `package.json`.

#### Specific Platforms

```bash
# Linux (AppImage + deb)
npm run build:linux

# macOS (DMG for Intel and Apple Silicon)
npm run build:mac

# Windows (NSIS installer)
npm run build:win
```

#### macOS Build by Architecture

```bash
# Intel only
npm run build:mac-intel

# Apple Silicon only
npm run build:mac-arm

# Universal (Intel + Apple Silicon)
npm run build:mac-universal
```

#### Build Without Installer (for Testing)

```bash
npm run build:dir
```

Creates an unpackaged executable folder in `release/`.

### Build Structure

```
cliodesk/
├── dist/                    # Compiled code
│   ├── src/
│   │   ├── main/           # Main process JS
│   │   ├── preload/        # Preload script JS
│   │   └── renderer/       # React build
├── release/                # Installers
│   ├── ClioDesk-1.0.0.AppImage
│   ├── ClioDesk-1.0.0.dmg
│   ├── ClioDesk-1.0.0.deb
│   └── ClioDesk Setup 1.0.0.exe
└── build/                  # Packaging assets
    ├── icon.png
    ├── icon.icns
    └── icon.ico
```

### Cross-Platform Packaging

**Linux → all OS:**
Possible with Docker:

```bash
docker run --rm -v $(pwd):/project electronuserland/builder:wine \
  bash -c "cd /project && npm install && npm run build:all"
```

**macOS → macOS/Linux/Windows:**
macOS can build for all platforms natively.

**Windows → Windows only:**
Windows can only build for Windows.

---

## User Installation

### User Prerequisites

1. **Ollama installed** on the machine
2. **Models downloaded**:
   ```bash
   ollama pull nomic-embed-text
   ollama pull gemma2:2b
   ```

### Linux

**AppImage (recommended):**
```bash
# Download from GitHub Releases
wget https://github.com/inactinique/cliodesk/releases/latest/download/ClioDesk-1.0.0.AppImage

# Make executable
chmod +x ClioDesk-1.0.0.AppImage

# Launch
./ClioDesk-1.0.0.AppImage
```

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i ClioDesk-1.0.0.deb
sudo apt-get install -f  # Fix dependencies if necessary
cliodesk
```

### macOS

1. Download the DMG file from GitHub Releases
2. Double-click to mount the disk image
3. Drag ClioDesk to the Applications folder
4. Launch from Launchpad or Applications

**First launch:**
If macOS displays "app cannot be opened because it is from an unidentified developer":
```bash
xattr -cr /Applications/ClioDesk.app
```

Or: Right-click → Open → Confirm

### Windows

1. Download `ClioDesk-Setup-1.0.0.exe` from GitHub Releases
2. Double-click the installer
3. Follow the installation wizard
4. Launch from Start menu or desktop shortcut

---

## Initial Configuration

### 1. Verify Ollama

On first launch, ClioDesk automatically checks the Ollama connection.

**If Ollama is not detected:**

1. Install Ollama: https://ollama.ai/download
2. Start the service:
   ```bash
   # Linux/macOS
   ollama serve

   # Windows: Ollama starts automatically as a service
   ```

3. Verify the service is working:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### 2. Download Models

```bash
# Embedding model (REQUIRED)
ollama pull nomic-embed-text

# Chat model (RECOMMENDED)
ollama pull gemma2:2b

# Chat alternatives
ollama pull mistral:7b-instruct    # More accurate but heavier
ollama pull llama3.1:8b            # Very performant
```

### 3. Zotero Configuration (optional)

To sync with Zotero:

1. **Get an API key:**
   - Go to https://www.zotero.org/settings/keys/new
   - Permissions: Read library, Write library
   - Copy the generated key

2. **Configure in ClioDesk:**
   - Settings → Zotero Integration
   - User ID: your Zotero user ID (visible in your library URL)
   - API Key: paste the key
   - Test Connection to verify

3. **Sync:**
   - Select a Zotero collection
   - Click "Sync"
   - Wait for PDFs and BibTeX file download

---

## Common Issues

### Development

#### "Incompatible architecture" error on macOS

**Symptom:**
```
mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64')
```

**Cause:** Native modules (better-sqlite3, hnswlib-node) are compiled for the wrong architecture.

**Solution:**
```bash
# Rebuild for your architecture
npm run rebuild:native

# Or specifically:
npm run rebuild:x64      # Intel
npm run rebuild:arm64    # Apple Silicon
```

The script `scripts/after-pack.cjs` automatically rebuilds native modules during packaging.

#### better-sqlite3 doesn't compile

```bash
npm rebuild better-sqlite3 --build-from-source
```

If the issue persists, verify that Python and build tools are installed.

#### hnswlib-node doesn't compile

```bash
# Install C++ build tools
# macOS:
xcode-select --install

# Linux:
sudo apt-get install build-essential

# Then:
npm rebuild hnswlib-node --build-from-source
```

#### Python topic modeling service doesn't start

**Port already in use:**
```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9
```

**Missing Python dependencies:**
```bash
cd backend/python-services/topic-modeling
source .venv/bin/activate
pip install -r requirements.txt
```

### Production

#### Ollama doesn't start

**Linux:**
```bash
# Check status
systemctl status ollama

# Start manually
ollama serve
```

**macOS:**
```bash
# Check if process is running
ps aux | grep ollama

# Start manually
ollama serve
```

**Windows:**
```bash
# Open services.msc
# Check "Ollama" service
```

#### Slow embeddings

1. **Use CPU optimized config:**
   - Settings → RAG → Chunking: CPU Optimized

2. **Reduce topK:**
   - Settings → RAG → Top K: 5 (instead of 10)

3. **Use a lighter model:**
   ```bash
   ollama pull gemma2:2b  # Instead of mistral:7b
   ```

#### Chat doesn't respond

1. **Check Ollama:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Verify chat model is installed:**
   ```bash
   ollama list
   ```

3. **Change model:**
   - Settings → LLM → Chat Model
   - Select an installed model

#### Poorly indexed PDFs

**Empty extracted text:**
- The PDF is image-only (no selectable text)
- Solution: Use external OCR then reimport

**Poor extraction quality:**
- The PDF is poorly formatted or corrupted
- Check the PDF in an external reader

#### Zotero sync fails

1. Verify API key is valid
2. Verify User ID is correct
3. Check internet connection
4. Check logs for more details

### Debug Logs

**Locations:**

- Linux: `~/.config/ClioDesk/logs/`
- macOS: `~/Library/Logs/ClioDesk/`
- Windows: `%APPDATA%\ClioDesk\logs\`

**View logs:**
```bash
# Linux
cat ~/.config/ClioDesk/logs/main.log

# macOS
cat ~/Library/Logs/ClioDesk/main.log

# Windows
type %APPDATA%\ClioDesk\logs\main.log
```

---

## Distribution and Releases

### Code Signing (Production)

#### macOS

1. Get an Apple Developer certificate
2. Configure in `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

3. Build with signing:

```bash
CSC_NAME="Developer ID Application" npm run build:mac
```

#### Windows

1. Get a code signing certificate
2. Configure and build:

```bash
set CSC_LINK=path/to/cert.pfx
set CSC_KEY_PASSWORD=your_password
npm run build:win
```

### GitHub Releases

1. **Create a version tag:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. **Build and publish:**

```bash
GH_TOKEN=your_github_token npm run build:all
```

electron-builder can automatically publish to GitHub Releases if configured.

3. **Auto-update configuration:**

In `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "cliodesk"
    }
  }
}
```

### Environment Variables

**Build:**
- `CSC_LINK`: Path to signing certificate
- `CSC_KEY_PASSWORD`: Certificate password
- `GH_TOKEN`: GitHub token for releases
- `DEBUG`: Enable electron-builder debug logs

**Runtime:**
- `NODE_ENV`: `development` or `production`
- `OLLAMA_HOST`: Ollama URL (default: http://localhost:11434)

---

## Performance and Optimization

### Recommended Hardware Configuration

**Minimum:**
- CPU: Dual-core
- RAM: 4 GB
- Disk: 5 GB free

**Recommended:**
- CPU: Quad-core
- RAM: 8 GB
- Disk: 10 GB free

**Optimal:**
- CPU: 8+ cores
- RAM: 16 GB
- Disk: 20 GB free (for Ollama models)

### Installer Sizes

- **Linux AppImage**: ~150-200 MB
- **Linux deb**: ~150-200 MB
- **macOS DMG**: ~180-250 MB
- **Windows NSIS**: ~150-200 MB

### Disk Space per Project

- **App**: ~200 MB
- **Ollama models**: ~500 MB - 5 GB (depending on models)
- **Vector database**: 50-500 MB per project (depending on PDF count)
- **Research journal**: 1-5 MB per session, 50-200 MB for a long project

---

## Security and Privacy

### Local Data

All data remains **local**:
- PDFs and documents: stored in project folder
- Embeddings and indexes: local SQLite (`.cliodesk/vectors.db`)
- LLM and models: local Ollama

**No data is sent to external servers** (except if Zotero API is configured for sync).

### API Key Storage

**Zotero API Key:**
- Stored in electron-store (OS-provided encryption)
- Linux: GNOME Keyring / KWallet
- macOS: Keychain
- Windows: Credential Manager

---

## Useful Scripts

```bash
# Full cleanup
npm run clean

# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm run rebuild:native

# Check types
npm run typecheck

# Linter
npm run lint

# Build preview
npm run preview
```

---

## Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)
- [Ollama Documentation](https://ollama.ai/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vitest Documentation](https://vitest.dev/)

---

**Note for daily development:** Simply use `npm run dev` in one terminal and `npm start` in another.
