# Installation Guide - ClioDesk for Linux

This guide walks you through the complete installation of ClioDesk on Linux, from prerequisites to first launch.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installing Dependencies](#installing-dependencies)
- [Installing ClioDesk](#installing-cliodesk)
- [Initial Configuration](#initial-configuration)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)

## System Requirements

- **Distribution**: Ubuntu 20.04+, Debian 11+, Fedora 35+, Arch Linux, or compatible
- **Architecture**: x86_64 (AMD64)
- **Disk Space**: At least 5 GB free (for application and Ollama models)
- **Memory**: 8 GB RAM minimum, 16 GB recommended
- **System Libraries**: libgtk-3, libnotify, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0

## Installing Dependencies

### 1. Basic System Dependencies

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  libgtk-3-0 \
  libnotify4 \
  libnss3 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libatspi2.0-0 \
  libsecret-1-0 \
  libgbm1 \
  pandoc \
  texlive-xetex \
  texlive-fonts-recommended \
  texlive-lang-french
```

**Note:** Pandoc and XeLaTeX are required for PDF export from ClioDesk.

#### Fedora/RHEL/CentOS

```bash
sudo dnf install -y \
  curl \
  wget \
  git \
  gcc-c++ \
  make \
  gtk3 \
  libnotify \
  nss \
  libXScrnSaver \
  libXtst \
  xdg-utils \
  at-spi2-core \
  libsecret \
  mesa-libgbm \
  pandoc \
  texlive-xetex \
  texlive-collection-fontsrecommended \
  texlive-babel-french
```

#### Arch Linux

```bash
sudo pacman -Syu --needed \
  curl \
  wget \
  git \
  base-devel \
  gtk3 \
  libnotify \
  nss \
  libxss \
  libxtst \
  xdg-utils \
  at-spi2-core \
  libsecret \
  mesa \
  pandoc \
  texlive-core \
  texlive-fontsrecommended \
  texlive-lang
```

### 2. Node.js and npm

ClioDesk requires Node.js 20+ and npm 10+.

#### Method 1: Via NodeSource (recommended)

**Ubuntu/Debian:**
```bash
# Install NodeSource repository for Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify versions
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

**Fedora/RHEL/CentOS:**
```bash
# Install NodeSource repository for Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js and npm
sudo dnf install -y nodejs

# Verify versions
node --version
npm --version
```

**Arch Linux:**
```bash
# Node.js 20+ is available in official repositories
sudo pacman -S nodejs npm

# Verify versions
node --version
npm --version
```

#### Method 2: Via nvm (Node Version Manager)

Useful for managing multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell
source ~/.bashrc  # or ~/.zshrc if using zsh

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
npm --version
```

### 3. Python 3

ClioDesk uses Python for certain services (topic modeling). Python 3.11+ is required.

#### Ubuntu/Debian

```bash
# Check if Python 3.11+ is installed
python3 --version

# If necessary (Ubuntu 22.04+, Debian 12+)
sudo apt install -y python3 python3-pip python3-venv

# For Ubuntu 20.04/Debian 11, install from deadsnakes PPA
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

#### Fedora/RHEL/CentOS

```bash
# Python 3.11+ should be available
sudo dnf install -y python3 python3-pip python3-devel

# Verify
python3 --version
```

#### Arch Linux

```bash
# Python 3.12+ is in repositories
sudo pacman -S python python-pip

# Verify
python --version
```

**Note:** The Python virtual environment (venv) will be created automatically by ClioDesk on first launch.

### 4. Ollama (Local LLM)

Ollama is required for local AI features (embeddings and chat).

#### Automatic Installation (all distributions)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

This script:
- Downloads and installs Ollama in `/usr/local/bin/`
- Creates a systemd service `ollama.service`
- Automatically starts the service

#### Manual Installation

**Ubuntu/Debian/Fedora/RHEL:**
```bash
# Download binary
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

# Create ollama user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Start service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

**Arch Linux:**
```bash
# Via AUR
yay -S ollama

# Or from source
git clone https://aur.archlinux.org/ollama.git
cd ollama
makepkg -si

# Start service
sudo systemctl enable --now ollama
```

#### Verify Ollama Service

```bash
# Check status
systemctl status ollama

# Verify server responds
curl http://localhost:11434/api/tags
```

#### Download Required Models

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

#### AppImage (recommended - works on all distributions)

```bash
# Download AppImage
wget https://github.com/your-org/cliodesk/releases/latest/download/ClioDesk-0.1.0.AppImage

# Make executable
chmod +x ClioDesk-0.1.0.AppImage

# Launch
./ClioDesk-0.1.0.AppImage
```

**System integration (optional):**

```bash
# Move to standard location
mkdir -p ~/.local/bin
mv ClioDesk-0.1.0.AppImage ~/.local/bin/cliodesk

# Create desktop menu entry
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/cliodesk.desktop <<EOF
[Desktop Entry]
Name=ClioDesk
Comment=Writing assistant for historians
Exec=$HOME/.local/bin/cliodesk %U
Icon=cliodesk
Terminal=false
Type=Application
Categories=Office;TextEditor;
MimeType=text/markdown;
EOF

# Update applications cache
update-desktop-database ~/.local/share/applications
```

#### .deb Package (Ubuntu/Debian)

```bash
# Download package
wget https://github.com/your-org/cliodesk/releases/latest/download/ClioDesk-0.1.0.deb

# Install
sudo dpkg -i ClioDesk-0.1.0.deb

# Resolve missing dependencies (if necessary)
sudo apt-get install -f

# Launch
cliodesk
```

#### .rpm Package (Fedora/RHEL/CentOS)

If available:

```bash
# Download package
wget https://github.com/your-org/cliodesk/releases/latest/download/ClioDesk-0.1.0.rpm

# Install
sudo dnf install ./ClioDesk-0.1.0.rpm

# Or with rpm
sudo rpm -i ClioDesk-0.1.0.rpm

# Launch
cliodesk
```

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

   This step is crucial for `better-sqlite3` to work with Electron:
   ```bash
   npx electron-rebuild -f
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Launch in development mode**
   ```bash
   # Method 1: All in one
   npm run dev:full

   # Method 2: Separate (for development)
   # Terminal 1: Compile in watch mode
   npm run dev

   # Terminal 2: Launch application
   npm start
   ```

6. **Build application for distribution**

   ```bash
   # Build for Linux (AppImage + deb)
   npm run build:linux

   # Files will be in: release/
   # - ClioDesk-0.1.0.AppImage
   # - ClioDesk-0.1.0.deb
   ```

## Initial Configuration

On first ClioDesk launch:

### 1. Ollama Verification

ClioDesk automatically checks the connection to Ollama (http://localhost:11434).

**If connection fails:**
```bash
# Check service status
systemctl status ollama

# Restart if necessary
sudo systemctl restart ollama

# Verify port 11434 is open
curl http://localhost:11434/api/tags
```

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
   # Check service
   systemctl status ollama

   # Test API
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
journalctl --user -u cliodesk -f

# Or for AppImages
tail -f ~/.config/cliodesk/logs/main.log
```

## Troubleshooting

### Problem: Ollama doesn't respond

```bash
# Check if Ollama is running
systemctl status ollama

# Restart service
sudo systemctl restart ollama

# Check logs
sudo journalctl -u ollama -n 50

# Test manually
ollama serve
```

### Problem: "Module did not self-register" (better-sqlite3)

This means the native module wasn't compiled for Electron.

```bash
cd /path/to/cliodesk

# Remove existing build
rm -rf node_modules/better-sqlite3/build

# Recompile for Electron
npx electron-rebuild -f -w better-sqlite3

# Relaunch
npm start
```

### Problem: AppImage doesn't launch

```bash
# Check FUSE dependencies
# Ubuntu/Debian
sudo apt install libfuse2

# Fedora/RHEL
sudo dnf install fuse-libs

# Arch Linux
sudo pacman -S fuse2

# Make AppImage executable
chmod +x ClioDesk-0.1.0.AppImage

# Launch with --no-sandbox if necessary
./ClioDesk-0.1.0.AppImage --no-sandbox
```

### Problem: Python venv doesn't create

Verify Python 3 and venv are properly installed:

```bash
python3 --version
python3 -m venv --help

# Ubuntu/Debian: Install python3-venv if missing
sudo apt install python3-venv

# Fedora/RHEL
sudo dnf install python3-devel

# Arch Linux
sudo pacman -S python
```

### Problem: "cannot open shared object file" error

System libraries are probably missing:

```bash
# Check missing dependencies
ldd /path/to/cliodesk

# Ubuntu/Debian: Reinstall dependencies
sudo apt install --reinstall \
  libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libsecret-1-0 libgbm1

# Fedora/RHEL
sudo dnf reinstall \
  gtk3 libnotify nss libXScrnSaver \
  libXtst xdg-utils at-spi2-core libsecret mesa-libgbm
```

### Problem: Insufficient memory for models

Ollama models consume RAM:
- `nomic-embed-text`: ~1 GB
- `gemma2:2b`: ~2 GB
- `mistral:7b-instruct`: ~4 GB

**Solutions:**
- Close unused applications
- Use only `gemma2:2b` (avoid `mistral:7b-instruct`)
- Add swap:
  ```bash
  # Create 4GB swap file
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # Make permanent
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

### Problem: Port 11434 already in use

If another service uses port 11434:

```bash
# Identify process
sudo lsof -i :11434

# Option 1: Stop other service

# Option 2: Configure Ollama on another port
sudo systemctl edit ollama

# Add:
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11435"

# Restart
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Then in ClioDesk Settings → LLM → URL: http://localhost:11435
```

### Problem: Electron Sandbox (Wayland)

On some distributions with Wayland:

```bash
# Launch with --no-sandbox
./ClioDesk-0.1.0.AppImage --no-sandbox

# Or set environment variable
export ELECTRON_NO_SANDBOX=1
./ClioDesk-0.1.0.AppImage
```

### Getting Help

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/cliodesk/issues)
- **Logs**: `~/.config/cliodesk/logs/`

## Uninstallation

To completely uninstall ClioDesk:

### AppImage

```bash
# Remove AppImage
rm ~/.local/bin/cliodesk

# Remove menu entry
rm ~/.local/share/applications/cliodesk.desktop
update-desktop-database ~/.local/share/applications

# Remove user data
rm -rf ~/.config/cliodesk
rm -rf ~/.local/share/cliodesk
```

### .deb Package

```bash
# Uninstall
sudo apt remove cliodesk

# Remove data
rm -rf ~/.config/cliodesk
```

### .rpm Package

```bash
# Uninstall
sudo dnf remove cliodesk

# Remove data
rm -rf ~/.config/cliodesk
```

### From Source

```bash
# Remove cloned repository
rm -rf /path/to/cliodesk

# Remove user data
rm -rf ~/.config/cliodesk
```

### Uninstall Ollama (optional)

```bash
# Stop service
sudo systemctl stop ollama
sudo systemctl disable ollama

# Remove binary
sudo rm /usr/local/bin/ollama

# Remove systemd service
sudo rm /etc/systemd/system/ollama.service
sudo systemctl daemon-reload

# Remove data
sudo rm -rf /usr/share/ollama
sudo rm -rf ~/.ollama

# Remove user
sudo userdel ollama
```

**Note:** Your ClioDesk projects (.md files, PDFs, .cliodesk/) are not automatically deleted.

## Next Steps

Once ClioDesk is installed:
1. See [README.md](README.md) to understand the architecture
2. Read [DEPLOYMENT.md](DEPLOYMENT.md) for user workflow
3. Explore [project examples](examples/) (if available)

## Distribution-Specific Notes

### Ubuntu 20.04 LTS

- Use deadsnakes PPA for Python 3.11+
- Node.js 20 via NodeSource
- Ollama via automatic installation script

### Fedora 38+

- Python 3.11+ available by default
- Node.js 20 via NodeSource or dnf
- Ollama via automatic installation script

### Arch Linux

- All dependencies in official repositories
- Ollama via AUR (yay -S ollama)
- Continuous updates (rolling release)

### WSL2 (Windows Subsystem for Linux)

ClioDesk can work on WSL2, but with limitations:
- No GPU acceleration for Ollama
- GUI requires X server (VcXsrv, WSLg)
- Reduced performance compared to native Linux

```bash
# Enable systemd on WSL2 (Ubuntu 22.04+)
echo "[boot]" | sudo tee -a /etc/wsl.conf
echo "systemd=true" | sudo tee -a /etc/wsl.conf

# Restart WSL from PowerShell
wsl --shutdown
```

---

**License:** MIT
**Support:** Open an issue on GitHub for any questions
