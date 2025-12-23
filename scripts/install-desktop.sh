#!/bin/bash

# Script pour installer mdFocus dans le menu d'applications Linux
# Usage: ./scripts/install-desktop.sh [chemin-vers-AppImage]

set -e

# Déterminer le chemin de l'AppImage
if [ -n "$1" ]; then
    APPIMAGE_PATH="$1"
else
    # Chercher l'AppImage dans le dossier release
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    APPIMAGE_PATH=$(find "$PROJECT_DIR/release" -name "mdFocus-*.AppImage" -type f | head -1)
fi

if [ ! -f "$APPIMAGE_PATH" ]; then
    echo "❌ AppImage non trouvé: $APPIMAGE_PATH"
    echo "Usage: $0 [chemin-vers-AppImage]"
    exit 1
fi

APPIMAGE_PATH=$(realpath "$APPIMAGE_PATH")
echo "📦 AppImage trouvé: $APPIMAGE_PATH"

# Déterminer le dossier du projet
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
echo "📁 Dossier du projet: $PROJECT_DIR"

# Créer les dossiers nécessaires
mkdir -p ~/.local/share/applications
mkdir -p ~/.local/share/icons/hicolor/{16x16,32x32,48x48,64x64,128x128,256x256,512x512}/apps

# Copier les icônes
ICON_SOURCE="$PROJECT_DIR/build/icons"
if [ -d "$ICON_SOURCE" ]; then
    echo "🎨 Installation des icônes..."
    for size in 16 32 48 64 128 256 512; do
        if [ -f "$ICON_SOURCE/${size}x${size}/icon.png" ]; then
            cp "$ICON_SOURCE/${size}x${size}/icon.png" ~/.local/share/icons/hicolor/${size}x${size}/apps/mdfocus-electron.png
            echo "  ✓ Icône ${size}x${size} installée"
        fi
    done
else
    echo "⚠️  Dossier d'icônes non trouvé, utilisation de l'icône par défaut"
    if [ -f "$PROJECT_DIR/build/icon.png" ]; then
        cp "$PROJECT_DIR/build/icon.png" ~/.local/share/icons/hicolor/512x512/apps/mdfocus-electron.png
        echo "  ✓ Icône 512x512 installée"
    fi
fi

# Créer le fichier .desktop
echo "📝 Création du fichier .desktop..."
cat > ~/.local/share/applications/mdfocus-electron.desktop <<EOF
[Desktop Entry]
Name=mdFocus
Comment=Assistant d'écriture pour historiens avec RAG et intégration Zotero/Tropy
Exec=$APPIMAGE_PATH --no-sandbox %U
Icon=mdfocus-electron
Terminal=false
Type=Application
Categories=Office;TextEditor;
StartupWMClass=mdFocus
MimeType=text/markdown;
EOF

chmod +x ~/.local/share/applications/mdfocus-electron.desktop

# Mettre à jour les caches
echo "🔄 Mise à jour des caches..."
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
gtk-update-icon-cache ~/.local/share/icons/hicolor/ 2>/dev/null || xdg-icon-resource forceupdate 2>/dev/null || true

echo "✅ Installation terminée!"
echo "   mdFocus devrait maintenant apparaître dans votre menu d'applications"
echo "   avec l'icône correcte."
