# Installation de mdFocus

## Installation rapide (Linux)

### Via AppImage

1. Téléchargez le fichier `.AppImage` depuis les releases
2. Rendez-le exécutable:
   ```bash
   chmod +x mdFocus-*.AppImage
   ```
3. Pour l'installer dans le menu d'applications avec l'icône:
   ```bash
   ./scripts/install-desktop.sh /chemin/vers/mdFocus-*.AppImage
   ```
4. Lancez l'application depuis votre menu ou en double-cliquant sur l'AppImage

### Via .deb (Debian/Ubuntu)

```bash
sudo dpkg -i mdfocus-electron_*.deb
sudo apt-get install -f  # Installer les dépendances manquantes si nécessaire
```

L'icône et le lanceur seront automatiquement installés.

## Désinstallation

### AppImage
Pour retirer mdFocus du menu d'applications:
```bash
rm ~/.local/share/applications/mdfocus-electron.desktop
rm -rf ~/.local/share/icons/hicolor/*/apps/mdfocus-electron.png
update-desktop-database ~/.local/share/applications/
```

### .deb
```bash
sudo apt remove mdfocus-electron
```

## Problèmes connus

### L'icône n'apparaît pas
Si l'icône n'apparaît pas dans votre barre des tâches ou menu:
1. Réexécutez le script d'installation: `./scripts/install-desktop.sh`
2. Déconnectez-vous et reconnectez-vous
3. Ou redémarrez votre gestionnaire de fenêtres

### Dépendances requises

mdFocus nécessite:
- **Pandoc** (pour l'export PDF): `sudo apt install pandoc`
- **XeLaTeX** (pour l'export PDF): `sudo apt install texlive-xetex texlive-fonts-recommended texlive-lang-french`

## Build depuis les sources

```bash
# Installer les dépendances
npm install

# Build complet
npm run build

# Générer les packages
npm run build:linux   # Linux (AppImage + .deb)
npm run build:mac     # macOS (.dmg)
npm run build:win     # Windows (installateur)

# Installer le lanceur et l'icône
./scripts/install-desktop.sh
```
