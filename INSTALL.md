# ClioDesk Installation

## Quick Installation (Linux)

### Via AppImage

1. Download the `.AppImage` file from releases
2. Make it executable:
   ```bash
   chmod +x ClioDesk-*.AppImage
   ```
3. To install it in the applications menu with the icon:
   ```bash
   ./scripts/install-desktop.sh /path/to/ClioDesk-*.AppImage
   ```
4. Launch the application from your menu or by double-clicking the AppImage

### Via .deb (Debian/Ubuntu)

```bash
sudo dpkg -i cliodesk_*.deb
sudo apt-get install -f  # Install missing dependencies if necessary
```

The icon and launcher will be automatically installed.

## Uninstallation

### AppImage
To remove ClioDesk from the applications menu:
```bash
rm ~/.local/share/applications/cliodesk.desktop
rm -rf ~/.local/share/icons/hicolor/*/apps/cliodesk.png
update-desktop-database ~/.local/share/applications/
```

### .deb
```bash
sudo apt remove cliodesk
```

## Known Issues

### Icon doesn't appear
If the icon doesn't appear in your taskbar or menu:
1. Re-run the installation script: `./scripts/install-desktop.sh`
2. Log out and log back in
3. Or restart your window manager

### Required Dependencies

ClioDesk requires:
- **Pandoc** (for PDF export): `sudo apt install pandoc`
- **XeLaTeX** (for PDF export): `sudo apt install texlive-xetex texlive-fonts-recommended texlive-lang-french`

## Build from Source

```bash
# Install dependencies
npm install

# Full build
npm run build

# Generate packages
npm run build:linux   # Linux (AppImage + .deb)
npm run build:mac     # macOS (.dmg)
npm run build:win     # Windows (installer)

# Install launcher and icon
./scripts/install-desktop.sh
```
