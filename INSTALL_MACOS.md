# Installation Guide - ClioDesk for macOS

This guide walks you through the complete installation of ClioDesk on macOS, from prerequisites to first launch.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installing Dependencies](#installing-dependencies)
- [Installing ClioDesk](#installing-cliodesk)
- [Initial Configuration](#initial-configuration)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)

## System Requirements

- **macOS**: 10.15 (Catalina) or higher
- **Architecture**: Intel (x64) or Apple Silicon (arm64)
- **Disk Space**: At least 5 GB free (for application and Ollama models)
- **Memory**: 8 GB RAM minimum, 16 GB recommended

## Installing Dependencies

### 1. Homebrew (Package Manager)

If Homebrew is not already installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the displayed instructions to add Homebrew to your PATH.

### 2. Node.js and npm

ClioDesk requires Node.js 20+ and npm 10+.

```bash
# Install Node.js via Homebrew
brew install node@20

# Verify versions
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

**Alternative: Using nvm (Node Version Manager)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal, then:
nvm install 20
nvm use 20
nvm alias default 20
```

### 3. Python 3

ClioDesk uses Python for certain services (topic modeling). Python 3.11+ is required.

```bash
# Check if Python 3 is installed
python3 --version

# If necessary, install via Homebrew
brew install python@3.11
```

**Note:** The Python virtual environment (venv) will be created automatically by ClioDesk on first launch.

### 4. Pandoc and LaTeX (for PDF Export)

ClioDesk requires Pandoc and XeLaTeX to export documents to PDF.

```bash
# Install Pandoc
brew install pandoc

# Install MacTeX (complete LaTeX distribution for macOS)
brew install --cask mactex

# Lighter alternative: BasicTeX (smaller but sufficient)
brew install --cask basictex
```

**If using BasicTeX**, install the additional required packages:

```bash
# Add tlmgr to PATH
eval "$(/usr/local/texlive/2024basic/bin/universal-darwin/tlmgr path add)"

# Install necessary packages
sudo tlmgr update --self
sudo tlmgr install xetex
sudo tlmgr install collection-fontsrecommended
sudo tlmgr install babel-french
```

**Verification:**

```bash
# Verify Pandoc
pandoc --version

# Verify XeLaTeX
xelatex --version
```

### 5. Ollama (Local LLM)

Ollama is required for local AI features (embeddings and chat).

```bash
# Install Ollama
brew install ollama

# Start Ollama service
brew services start ollama

# Alternative: Start manually
ollama serve
```

**Download required models:**

```bash
# Embedding model (required)
ollama pull nomic-embed-text

# Chat model (recommended)
ollama pull gemma2:2b
```

**Optional models:**

```bash
# Alternative chat model (more performant but heavier)
ollama pull mistral:7b-instruct

# Fallback embedding model
ollama pull mxbai-embed-large
```

**Verification:**

```bash
# List installed models
ollama list

# Should show at minimum:
# nomic-embed-text
# gemma2:2b
```

## Installing ClioDesk

### Option A: Installation from Binaries (User)

If a packaged version is available:

1. **Download the DMG**
   - Go to [GitHub Releases](https://github.com/your-org/cliodesk/releases)
   - Download `ClioDesk-0.1.0-mac.dmg` (or latest version)

2. **Install the application**
   ```bash
   # Double-click the downloaded DMG
   # Drag the ClioDesk icon to the Applications folder
   ```

3. **Authorize the application (first launch)**

   On first launch, macOS may block the application:
   ```bash
   # Method 1: Via interface
   # System → Privacy & Security → Open Anyway

   # Method 2: Via terminal
   xattr -cr /Applications/ClioDesk.app
   ```

4. **Launch ClioDesk**
   - From Launchpad
   - Or from Applications → ClioDesk

### Option B: Installation from Source (Developer)

To contribute to the project or run the development version:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/cliodesk.git
   cd cliodesk
   ```

2. **Install npm dependencies**
   ```bash
   npm install
   ```

3. **Compile native modules**
   ```bash
   npx electron-rebuild -f
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Launch in development mode**
   ```bash
   # Terminal 1: Compile in watch mode
   npm run dev

   # Terminal 2: Launch application
   npm start
   ```

   **Or in a single command:**
   ```bash
   npm run dev:full
   ```

6. **Build application for distribution**
   ```bash
   # Build for macOS
   npm run build:mac

   # DMG will be in: release/ClioDesk-0.1.0-mac.dmg
   ```

## Initial Configuration

On first ClioDesk launch:

### 1. Ollama Verification

ClioDesk automatically checks the connection to Ollama (http://localhost:11434).

**If connection fails:**
- Make sure Ollama is started: `brew services start ollama`
- Or launch manually: `ollama serve` in a separate terminal
- Verify port 11434 is not blocked

### 2. LLM Configuration

1. Open **Settings** → **LLM Configuration**
2. Verify settings:
   - **Backend**: Ollama (default)
   - **URL**: http://localhost:11434
   - **Embedding Model**: nomic-embed-text
   - **Chat Model**: gemma2:2b
3. Click **Test Connection** to validate

### 3. Create Your First Project

1. **New Project** → Choose a folder
2. ClioDesk creates the structure:
   ```
   my-project/
   ├── .cliodesk/
   │   └── vectors.db          # Vector database
   ├── src/
   │   ├── images/             # Project images
   │   └── pdfs/               # PDFs to index
   ├── bibliography.bib        # BibTeX bibliography
   └── article.md              # Main document
   ```

### 4. Zotero Configuration (optional)

If you use Zotero:

1. Get your API Key: [https://www.zotero.org/settings/keys/new](https://www.zotero.org/settings/keys/new)
   - Permissions: "Read library" and "Write library"
2. In ClioDesk: **Settings** → **Zotero Integration**
3. Enter your User ID and API Key
4. **Test Connection**

## Verifying Installation

### Complete Test

1. **Verify Ollama**
   ```bash
   curl http://localhost:11434/api/tags
   # Should return list of installed models
   ```

2. **Verify Node.js and npm**
   ```bash
   node --version  # v20.x.x or higher
   npm --version   # 10.x.x or higher
   ```

3. **Verify Python**
   ```bash
   python3 --version  # 3.11.x or higher
   ```

4. **Verify Pandoc and XeLaTeX**
   ```bash
   pandoc --version   # 2.x or higher
   xelatex --version  # TeX Live 2020+ or higher
   ```

5. **Test ClioDesk**
   - Create a new project
   - Import a PDF into `src/pdfs/`
   - Index the PDF via the interface
   - Verify corpus displays statistics

### Check Logs

In development mode, logs are displayed in console. In production:

```bash
# Application logs
tail -f ~/Library/Logs/ClioDesk/main.log
```

## Troubleshooting

### Problem: "App can't be opened because it is from an unidentified developer"

```bash
xattr -cr /Applications/ClioDesk.app
```

Then relaunch the application.

### Problem: Ollama doesn't respond

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart service
brew services restart ollama

# Or manually
pkill ollama
ollama serve
```

### Problem: "Module did not self-register" (better-sqlite3)

This means the native module wasn't compiled for your architecture.

```bash
cd /path/to/cliodesk
rm -rf node_modules/better-sqlite3/build
npx electron-rebuild -f -w better-sqlite3
npm start
```

### Problem: Python venv doesn't create

Verify Python 3 is properly installed:

```bash
python3 --version
which python3

# If necessary, install via Homebrew
brew install python@3.11
```

### Problem: Insufficient memory for models

Ollama models consume RAM:
- `nomic-embed-text`: ~1 GB
- `gemma2:2b`: ~2 GB
- `mistral:7b-instruct`: ~4 GB

**Solutions:**
- Close unused applications
- Use only `gemma2:2b` (avoid `mistral:7b-instruct`)
- Upgrade your Mac's RAM

### Problem: Port 11434 already in use

If another service uses port 11434:

```bash
# Identify process
lsof -i :11434

# Option 1: Stop other service
# Option 2: Configure Ollama on another port
OLLAMA_HOST=127.0.0.1:11435 ollama serve

# Then in ClioDesk Settings → LLM → URL: http://localhost:11435
```

### Getting Help

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/cliodesk/issues)
- **Logs**: `~/Library/Logs/ClioDesk/`

## Uninstallation

To completely uninstall ClioDesk:

```bash
# Remove application
rm -rf /Applications/ClioDesk.app

# Remove user data
rm -rf ~/Library/Application\ Support/cliodesk
rm -rf ~/.config/cliodesk

# Remove logs
rm -rf ~/Library/Logs/ClioDesk

# (Optional) Uninstall Ollama
brew uninstall ollama
rm -rf ~/.ollama
```

**Note:** Your ClioDesk projects (.md files, PDFs, .cliodesk/) are not automatically deleted.

## Next Steps

Once ClioDesk is installed:
1. See [README.md](README.md) to understand the architecture
2. Read [DEPLOYMENT.md](DEPLOYMENT.md) for user workflow
3. Explore [project examples](examples/) (if available)

---

**License:** MIT
**Support:** Open an issue on GitHub for any questions
