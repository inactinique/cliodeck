# Guide d'installation - mdFocus pour Linux

Ce guide vous accompagne dans l'installation complète de mdFocus sur Linux, depuis les prérequis jusqu'au premier lancement.

## Table des matières

- [Prérequis système](#prérequis-système)
- [Installation des dépendances](#installation-des-dépendances)
- [Installation de mdFocus](#installation-de-mdfocus)
- [Configuration initiale](#configuration-initiale)
- [Vérification de l'installation](#vérification-de-linstallation)
- [Dépannage](#dépannage)

## Prérequis système

- **Distribution** : Ubuntu 20.04+, Debian 11+, Fedora 35+, Arch Linux, ou compatible
- **Architecture** : x86_64 (AMD64)
- **Espace disque** : Au moins 5 GB libres (pour l'application et les modèles Ollama)
- **Mémoire** : 8 GB RAM minimum, 16 GB recommandé
- **Bibliothèques système** : libgtk-3, libnotify, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0

## Installation des dépendances

### 1. Dépendances système de base

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
  libgbm1
```

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
  mesa-libgbm
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
  mesa
```

### 2. Node.js et npm

mdFocus nécessite Node.js 20+ et npm 10+.

#### Méthode 1 : Via NodeSource (recommandé)

**Ubuntu/Debian :**
```bash
# Installer le dépôt NodeSource pour Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js et npm
sudo apt install -y nodejs

# Vérifier les versions
node --version  # Devrait afficher v20.x.x ou supérieur
npm --version   # Devrait afficher 10.x.x ou supérieur
```

**Fedora/RHEL/CentOS :**
```bash
# Installer le dépôt NodeSource pour Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Installer Node.js et npm
sudo dnf install -y nodejs

# Vérifier les versions
node --version
npm --version
```

**Arch Linux :**
```bash
# Node.js 20+ est disponible dans les dépôts officiels
sudo pacman -S nodejs npm

# Vérifier les versions
node --version
npm --version
```

#### Méthode 2 : Via nvm (Node Version Manager)

Utile pour gérer plusieurs versions de Node.js :

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recharger votre shell
source ~/.bashrc  # ou ~/.zshrc si vous utilisez zsh

# Installer Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Vérifier
node --version
npm --version
```

### 3. Python 3

mdFocus utilise Python pour certains services (topic modeling). Python 3.11+ est requis.

#### Ubuntu/Debian

```bash
# Vérifier si Python 3.11+ est installé
python3 --version

# Si nécessaire (Ubuntu 22.04+, Debian 12+)
sudo apt install -y python3 python3-pip python3-venv

# Pour Ubuntu 20.04/Debian 11, installer depuis le PPA deadsnakes
sudo apt install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

#### Fedora/RHEL/CentOS

```bash
# Python 3.11+ devrait être disponible
sudo dnf install -y python3 python3-pip python3-devel

# Vérifier
python3 --version
```

#### Arch Linux

```bash
# Python 3.12+ est dans les dépôts
sudo pacman -S python python-pip

# Vérifier
python --version
```

**Note :** L'environnement virtuel Python (venv) sera créé automatiquement par mdFocus au premier lancement.

### 4. Ollama (LLM local)

Ollama est nécessaire pour les fonctionnalités d'IA locales (embeddings et chat).

#### Installation automatique (toutes distributions)

```bash
# Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

Ce script :
- Télécharge et installe Ollama dans `/usr/local/bin/`
- Crée un service systemd `ollama.service`
- Démarre automatiquement le service

#### Installation manuelle

**Ubuntu/Debian/Fedora/RHEL :**
```bash
# Télécharger le binaire
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/

# Créer un service systemd
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

# Créer l'utilisateur ollama
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

**Arch Linux :**
```bash
# Via AUR
yay -S ollama

# Ou depuis les sources
git clone https://aur.archlinux.org/ollama.git
cd ollama
makepkg -si

# Démarrer le service
sudo systemctl enable --now ollama
```

#### Vérifier le service Ollama

```bash
# Vérifier le statut
systemctl status ollama

# Vérifier que le serveur répond
curl http://localhost:11434/api/tags
```

#### Télécharger les modèles requis

```bash
# Modèle d'embeddings (obligatoire)
ollama pull nomic-embed-text

# Modèle de chat (recommandé)
ollama pull gemma2:2b
```

**Modèles optionnels :**

```bash
# Modèle de chat alternatif (plus performant mais plus lourd)
ollama pull mistral:7b-instruct

# Modèle d'embedding de secours
ollama pull mxbai-embed-large
```

**Vérification :**

```bash
# Lister les modèles installés
ollama list

# Devrait afficher au minimum :
# nomic-embed-text
# gemma2:2b
```

## Installation de mdFocus

### Option A : Installation depuis les binaires (utilisateur)

Si une version packagée est disponible :

#### AppImage (recommandé - fonctionne sur toutes les distributions)

```bash
# Télécharger l'AppImage
wget https://github.com/votre-org/mdfocus-electron/releases/latest/download/mdFocus-0.1.0.AppImage

# Rendre exécutable
chmod +x mdFocus-0.1.0.AppImage

# Lancer
./mdFocus-0.1.0.AppImage
```

**Intégration au système (optionnel) :**

```bash
# Déplacer vers un emplacement standard
mkdir -p ~/.local/bin
mv mdFocus-0.1.0.AppImage ~/.local/bin/mdfocus

# Créer une entrée de menu desktop
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/mdfocus.desktop <<EOF
[Desktop Entry]
Name=mdFocus
Comment=Assistant d'écriture pour historiens
Exec=$HOME/.local/bin/mdfocus %U
Icon=mdfocus
Terminal=false
Type=Application
Categories=Office;TextEditor;
MimeType=text/markdown;
EOF

# Mettre à jour le cache des applications
update-desktop-database ~/.local/share/applications
```

#### Package .deb (Ubuntu/Debian)

```bash
# Télécharger le package
wget https://github.com/votre-org/mdfocus-electron/releases/latest/download/mdFocus-0.1.0.deb

# Installer
sudo dpkg -i mdFocus-0.1.0.deb

# Résoudre les dépendances manquantes (si nécessaire)
sudo apt-get install -f

# Lancer
mdfocus-electron
```

#### Package .rpm (Fedora/RHEL/CentOS)

Si disponible :

```bash
# Télécharger le package
wget https://github.com/votre-org/mdfocus-electron/releases/latest/download/mdFocus-0.1.0.rpm

# Installer
sudo dnf install ./mdFocus-0.1.0.rpm

# Ou avec rpm
sudo rpm -i mdFocus-0.1.0.rpm

# Lancer
mdfocus-electron
```

### Option B : Installation depuis les sources (développeur)

Pour contribuer au projet ou exécuter la version de développement :

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-org/mdfocus-electron.git
   cd mdfocus-electron
   ```

2. **Installer les dépendances npm**
   ```bash
   npm install
   ```

3. **Compiler les modules natifs**

   Cette étape est cruciale pour que `better-sqlite3` fonctionne avec Electron :
   ```bash
   npx electron-rebuild -f
   ```

4. **Compiler le projet**
   ```bash
   npm run build
   ```

5. **Lancer en mode développement**
   ```bash
   # Méthode 1 : Tout en un
   npm run dev:full

   # Méthode 2 : Séparé (pour le développement)
   # Terminal 1 : Compiler en mode watch
   npm run dev

   # Terminal 2 : Lancer l'application
   npm start
   ```

6. **Construire l'application pour distribution**

   ```bash
   # Build pour Linux (AppImage + deb)
   npm run build:linux

   # Les fichiers seront dans : release/
   # - mdFocus-0.1.0.AppImage
   # - mdFocus-0.1.0.deb
   ```

## Configuration initiale

Au premier lancement de mdFocus :

### 1. Vérification d'Ollama

mdFocus vérifie automatiquement la connexion à Ollama (http://localhost:11434).

**Si la connexion échoue :**
```bash
# Vérifier le statut du service
systemctl status ollama

# Redémarrer si nécessaire
sudo systemctl restart ollama

# Vérifier que le port 11434 est ouvert
curl http://localhost:11434/api/tags
```

### 2. Configuration du LLM

1. Ouvrir **Settings** → **LLM Configuration**
2. Vérifier les paramètres :
   - **Backend** : Ollama (par défaut)
   - **URL** : http://localhost:11434
   - **Embedding Model** : nomic-embed-text
   - **Chat Model** : gemma2:2b
3. Cliquer sur **Test Connection** pour valider

### 3. Créer votre premier projet

1. **Nouveau Projet** → Choisir un dossier
2. mdFocus crée la structure :
   ```
   mon-projet/
   ├── .mdfocus/
   │   └── vectors.db          # Base de données vectorielle
   ├── src/
   │   ├── images/             # Images du projet
   │   └── pdfs/               # PDFs à indexer
   ├── bibliography.bib        # Bibliographie BibTeX
   └── article.md              # Document principal
   ```

### 4. Configuration Zotero (optionnel)

Si vous utilisez Zotero :

1. Obtenir votre API Key : [https://www.zotero.org/settings/keys/new](https://www.zotero.org/settings/keys/new)
   - Permissions : "Read library" et "Write library"
2. Dans mdFocus : **Settings** → **Zotero Integration**
3. Entrer votre User ID et API Key
4. **Test Connection**

## Vérification de l'installation

### Test complet

1. **Vérifier Ollama**
   ```bash
   # Vérifier le service
   systemctl status ollama

   # Tester l'API
   curl http://localhost:11434/api/tags
   # Devrait retourner la liste des modèles installés
   ```

2. **Vérifier Node.js et npm**
   ```bash
   node --version  # v20.x.x ou supérieur
   npm --version   # 10.x.x ou supérieur
   ```

3. **Vérifier Python**
   ```bash
   python3 --version  # 3.11.x ou supérieur
   ```

4. **Tester mdFocus**
   - Créer un nouveau projet
   - Importer un PDF dans `src/pdfs/`
   - Indexer le PDF via l'interface
   - Vérifier que le corpus affiche les statistiques

### Vérifier les logs

En mode développement, les logs sont affichés dans la console. En production :

```bash
# Logs de l'application
journalctl --user -u mdfocus -f

# Ou pour les AppImages
tail -f ~/.config/mdfocus-electron/logs/main.log
```

## Dépannage

### Problème : Ollama ne répond pas

```bash
# Vérifier si Ollama tourne
systemctl status ollama

# Redémarrer le service
sudo systemctl restart ollama

# Vérifier les logs
sudo journalctl -u ollama -n 50

# Tester manuellement
ollama serve
```

### Problème : "Module did not self-register" (better-sqlite3)

Cela signifie que le module natif n'a pas été compilé pour Electron.

```bash
cd /path/to/mdfocus-electron

# Supprimer le build existant
rm -rf node_modules/better-sqlite3/build

# Recompiler pour Electron
npx electron-rebuild -f -w better-sqlite3

# Relancer
npm start
```

### Problème : AppImage ne se lance pas

```bash
# Vérifier les dépendances FUSE
# Ubuntu/Debian
sudo apt install libfuse2

# Fedora/RHEL
sudo dnf install fuse-libs

# Arch Linux
sudo pacman -S fuse2

# Rendre l'AppImage exécutable
chmod +x mdFocus-0.1.0.AppImage

# Lancer avec --no-sandbox si nécessaire
./mdFocus-0.1.0.AppImage --no-sandbox
```

### Problème : Python venv ne se crée pas

Vérifiez que Python 3 et venv sont bien installés :

```bash
python3 --version
python3 -m venv --help

# Ubuntu/Debian : Installer python3-venv si manquant
sudo apt install python3-venv

# Fedora/RHEL
sudo dnf install python3-devel

# Arch Linux
sudo pacman -S python
```

### Problème : Erreur "cannot open shared object file"

Il manque probablement des bibliothèques système :

```bash
# Vérifier les dépendances manquantes
ldd /path/to/mdfocus-electron

# Ubuntu/Debian : Réinstaller les dépendances
sudo apt install --reinstall \
  libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libsecret-1-0 libgbm1

# Fedora/RHEL
sudo dnf reinstall \
  gtk3 libnotify nss libXScrnSaver \
  libXtst xdg-utils at-spi2-core libsecret mesa-libgbm
```

### Problème : Mémoire insuffisante pour les modèles

Les modèles Ollama consomment de la RAM :
- `nomic-embed-text` : ~1 GB
- `gemma2:2b` : ~2 GB
- `mistral:7b-instruct` : ~4 GB

**Solutions :**
- Fermer les applications inutilisées
- Utiliser uniquement `gemma2:2b` (éviter `mistral:7b-instruct`)
- Ajouter de la swap :
  ```bash
  # Créer un fichier swap de 4GB
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # Rendre permanent
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

### Problème : Port 11434 déjà utilisé

Si un autre service utilise le port 11434 :

```bash
# Identifier le processus
sudo lsof -i :11434

# Option 1 : Arrêter l'autre service

# Option 2 : Configurer Ollama sur un autre port
sudo systemctl edit ollama

# Ajouter :
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11435"

# Redémarrer
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Puis dans mdFocus Settings → LLM → URL : http://localhost:11435
```

### Problème : Sandbox Electron (Wayland)

Sur certaines distributions avec Wayland :

```bash
# Lancer avec --no-sandbox
./mdFocus-0.1.0.AppImage --no-sandbox

# Ou définir la variable d'environnement
export ELECTRON_NO_SANDBOX=1
./mdFocus-0.1.0.AppImage
```

### Obtenir de l'aide

- **Documentation** : [README.md](README.md)
- **Issues** : [GitHub Issues](https://github.com/votre-org/mdfocus-electron/issues)
- **Logs** : `~/.config/mdfocus-electron/logs/`

## Désinstallation

Pour désinstaller complètement mdFocus :

### AppImage

```bash
# Supprimer l'AppImage
rm ~/.local/bin/mdfocus

# Supprimer l'entrée de menu
rm ~/.local/share/applications/mdfocus.desktop
update-desktop-database ~/.local/share/applications

# Supprimer les données utilisateur
rm -rf ~/.config/mdfocus-electron
rm -rf ~/.local/share/mdfocus-electron
```

### Package .deb

```bash
# Désinstaller
sudo apt remove mdfocus-electron

# Supprimer les données
rm -rf ~/.config/mdfocus-electron
```

### Package .rpm

```bash
# Désinstaller
sudo dnf remove mdfocus-electron

# Supprimer les données
rm -rf ~/.config/mdfocus-electron
```

### Depuis les sources

```bash
# Supprimer le dépôt cloné
rm -rf /path/to/mdfocus-electron

# Supprimer les données utilisateur
rm -rf ~/.config/mdfocus-electron
```

### Désinstaller Ollama (optionnel)

```bash
# Arrêter le service
sudo systemctl stop ollama
sudo systemctl disable ollama

# Supprimer le binaire
sudo rm /usr/local/bin/ollama

# Supprimer le service systemd
sudo rm /etc/systemd/system/ollama.service
sudo systemctl daemon-reload

# Supprimer les données
sudo rm -rf /usr/share/ollama
sudo rm -rf ~/.ollama

# Supprimer l'utilisateur
sudo userdel ollama
```

**Note :** Vos projets mdFocus (fichiers .md, PDFs, .mdfocus/) ne sont pas supprimés automatiquement.

## Prochaines étapes

Une fois mdFocus installé :
1. Consultez le [README.md](README.md) pour comprendre l'architecture
2. Lisez le [DEPLOYMENT.md](DEPLOYMENT.md) pour le workflow utilisateur
3. Explorez les [exemples de projets](examples/) (si disponibles)

## Notes spécifiques aux distributions

### Ubuntu 20.04 LTS

- Utilisez le PPA deadsnakes pour Python 3.11+
- Node.js 20 via NodeSource
- Ollama via script d'installation automatique

### Fedora 38+

- Python 3.11+ disponible par défaut
- Node.js 20 via NodeSource ou dnf
- Ollama via script d'installation automatique

### Arch Linux

- Toutes les dépendances dans les dépôts officiels
- Ollama via AUR (yay -S ollama)
- Mises à jour continues (rolling release)

### WSL2 (Windows Subsystem for Linux)

mdFocus peut fonctionner sur WSL2, mais avec limitations :
- Pas d'accélération GPU pour Ollama
- Interface graphique nécessite un serveur X (VcXsrv, WSLg)
- Performances réduites par rapport à Linux natif

```bash
# Activer systemd sur WSL2 (Ubuntu 22.04+)
echo "[boot]" | sudo tee -a /etc/wsl.conf
echo "systemd=true" | sudo tee -a /etc/wsl.conf

# Redémarrer WSL depuis PowerShell
wsl --shutdown
```

---

**Licence :** MIT
**Support :** Ouvrez une issue sur GitHub pour toute question
