# Guide de Build et Déploiement - ClioDesk

Ce document explique comment compiler, packager et déployer ClioDesk pour différentes plateformes.

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Développement](#développement)
- [Build et Packaging](#build-et-packaging)
- [Installation Utilisateur](#installation-utilisateur)
- [Configuration Initiale](#configuration-initiale)
- [Problèmes Courants](#problèmes-courants)
- [Distribution et Releases](#distribution-et-releases)

---

## Prérequis

### Développement

- **Node.js** 18+ et npm
- **Python** 3.9+ (pour better-sqlite3 et services Python)
- **Ollama** installé localement pour les tests

### Plateformes spécifiques

**Linux:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools ou Visual Studio Community
- Python 3.9+ avec pip

---

## Installation

### Installation des dépendances

```bash
npm install
```

Cette commande installe toutes les dépendances Node.js et compile automatiquement les modules natifs (better-sqlite3, hnswlib-node, etc.).

### Installation des dépendances Python (Topic Modeling)

Les services Python sont utilisés pour le topic modeling. Pour l'environnement de développement:

```bash
cd backend/python-services/topic-modeling
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# Ou: .venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

---

## Développement

### Mode développement avec hot reload

```bash
npm run dev
```

Cette commande lance en parallèle:
- Main process TypeScript en mode watch
- Preload script en mode watch
- Renderer (React) avec Vite hot reload

### Démarrer l'application

Dans un autre terminal:

```bash
npm start
```

### Mode développement complet (tout-en-un)

```bash
npm run dev:full
```

Lance le build watch ET l'application automatiquement après 3 secondes.

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

### Linting et Type Checking

```bash
# Linter
npm run lint

# Type checking
npm run typecheck
```

---

## Build et Packaging

### Build sans packaging

```bash
npm run build
```

Compile:
- Main process TypeScript → `dist/src/main/`
- Preload script → `dist/src/preload/`
- Renderer React → `dist/src/renderer/`

### Build avec packaging

#### Toutes plateformes

```bash
npm run build:all
```

Crée les installeurs pour toutes les plateformes configurées dans `package.json`.

#### Plateformes spécifiques

```bash
# Linux (AppImage + deb)
npm run build:linux

# macOS (DMG pour Intel et Apple Silicon)
npm run build:mac

# Windows (NSIS installer)
npm run build:win
```

#### Build macOS par architecture

```bash
# Intel uniquement
npm run build:mac-intel

# Apple Silicon uniquement
npm run build:mac-arm

# Universal (Intel + Apple Silicon)
npm run build:mac-universal
```

#### Build sans installer (pour tests)

```bash
npm run build:dir
```

Crée un dossier exécutable non packagé dans `release/`.

### Structure de build

```
cliodesk/
├── dist/                    # Code compilé
│   ├── src/
│   │   ├── main/           # Main process JS
│   │   ├── preload/        # Preload script JS
│   │   └── renderer/       # React build
├── release/                # Installeurs
│   ├── ClioDesk-1.0.0.AppImage
│   ├── ClioDesk-1.0.0.dmg
│   ├── ClioDesk-1.0.0.deb
│   └── ClioDesk Setup 1.0.0.exe
└── build/                  # Assets pour packaging
    ├── icon.png
    ├── icon.icns
    └── icon.ico
```

### Packaging multi-plateforme

**Linux → tous OS:**
Possible avec Docker:

```bash
docker run --rm -v $(pwd):/project electronuserland/builder:wine \
  bash -c "cd /project && npm install && npm run build:all"
```

**macOS → macOS/Linux/Windows:**
macOS peut builder pour toutes les plateformes nativement.

**Windows → Windows uniquement:**
Windows ne peut builder que pour Windows.

---

## Installation Utilisateur

### Prérequis utilisateur

1. **Ollama installé** sur la machine
2. **Modèles téléchargés**:
   ```bash
   ollama pull nomic-embed-text
   ollama pull gemma2:2b
   ```

### Linux

**AppImage (recommandé):**
```bash
# Télécharger depuis GitHub Releases
wget https://github.com/inactinique/cliodesk/releases/latest/download/ClioDesk-1.0.0.AppImage

# Rendre exécutable
chmod +x ClioDesk-1.0.0.AppImage

# Lancer
./ClioDesk-1.0.0.AppImage
```

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i ClioDesk-1.0.0.deb
sudo apt-get install -f  # Corriger les dépendances si nécessaire
cliodesk
```

### macOS

1. Télécharger le fichier DMG depuis GitHub Releases
2. Double-cliquer pour monter l'image disque
3. Glisser ClioDesk vers le dossier Applications
4. Lancer depuis Launchpad ou Applications

**Première ouverture:**
Si macOS affiche "app cannot be opened because it is from an unidentified developer":
```bash
xattr -cr /Applications/ClioDesk.app
```

Ou: Clic droit → Ouvrir → Confirmer

### Windows

1. Télécharger `ClioDesk-Setup-1.0.0.exe` depuis GitHub Releases
2. Double-cliquer sur l'installeur
3. Suivre l'assistant d'installation
4. Lancer depuis le menu Démarrer ou le raccourci bureau

---

## Configuration Initiale

### 1. Vérifier Ollama

Au premier lancement, ClioDesk vérifie automatiquement la connexion Ollama.

**Si Ollama n'est pas détecté:**

1. Installer Ollama: https://ollama.ai/download
2. Démarrer le service:
   ```bash
   # Linux/macOS
   ollama serve

   # Windows: Ollama démarre automatiquement comme service
   ```

3. Vérifier que le service fonctionne:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### 2. Télécharger les modèles

```bash
# Modèle d'embeddings (OBLIGATOIRE)
ollama pull nomic-embed-text

# Modèle de chat (RECOMMANDÉ)
ollama pull gemma2:2b

# Alternatives pour le chat
ollama pull mistral:7b-instruct    # Plus précis mais plus lourd
ollama pull llama3.1:8b            # Très performant
```

### 3. Configuration Zotero (optionnel)

Pour synchroniser avec Zotero:

1. **Obtenir une clé API:**
   - Aller sur https://www.zotero.org/settings/keys/new
   - Permissions: Read library, Write library
   - Copier la clé générée

2. **Configurer dans ClioDesk:**
   - Settings → Zotero Integration
   - User ID: votre user ID Zotero (visible dans l'URL de votre bibliothèque)
   - API Key: coller la clé
   - Test Connection pour vérifier

3. **Synchroniser:**
   - Sélectionner une collection Zotero
   - Cliquer "Sync"
   - Attendre le téléchargement des PDFs et du fichier BibTeX

---

## Problèmes Courants

### Développement

#### Erreur "incompatible architecture" sur macOS

**Symptôme:**
```
mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64')
```

**Cause:** Les modules natifs (better-sqlite3, hnswlib-node) sont compilés pour la mauvaise architecture.

**Solution:**
```bash
# Reconstruire pour votre architecture
npm run rebuild:native

# Ou spécifiquement:
npm run rebuild:x64      # Intel
npm run rebuild:arm64    # Apple Silicon
```

Le script `scripts/after-pack.cjs` reconstruit automatiquement les modules natifs lors du packaging.

#### better-sqlite3 ne compile pas

```bash
npm rebuild better-sqlite3 --build-from-source
```

Si le problème persiste, vérifier que Python et les build tools sont installés.

#### hnswlib-node ne compile pas

```bash
# Installer les outils de build C++
# macOS:
xcode-select --install

# Linux:
sudo apt-get install build-essential

# Puis:
npm rebuild hnswlib-node --build-from-source
```

#### Service Python topic modeling ne démarre pas

**Port déjà utilisé:**
```bash
# Tuer le processus sur le port 8001
lsof -ti:8001 | xargs kill -9
```

**Dépendances Python manquantes:**
```bash
cd backend/python-services/topic-modeling
source .venv/bin/activate
pip install -r requirements.txt
```

### Production

#### Ollama ne démarre pas

**Linux:**
```bash
# Vérifier le statut
systemctl status ollama

# Démarrer manuellement
ollama serve
```

**macOS:**
```bash
# Vérifier si le processus tourne
ps aux | grep ollama

# Démarrer manuellement
ollama serve
```

**Windows:**
```bash
# Ouvrir services.msc
# Vérifier le service "Ollama"
```

#### Embeddings trop lents

1. **Utiliser la config CPU optimisée:**
   - Settings → RAG → Chunking: CPU Optimized

2. **Réduire topK:**
   - Settings → RAG → Top K: 5 (au lieu de 10)

3. **Utiliser un modèle plus léger:**
   ```bash
   ollama pull gemma2:2b  # Au lieu de mistral:7b
   ```

#### Chat ne répond pas

1. **Vérifier Ollama:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Vérifier que le modèle de chat est installé:**
   ```bash
   ollama list
   ```

3. **Changer le modèle:**
   - Settings → LLM → Chat Model
   - Sélectionner un modèle installé

#### PDFs mal indexés

**Texte extrait vide:**
- Le PDF est image-only (pas de texte sélectionnable)
- Solution: Utiliser un OCR externe puis réimporter

**Mauvaise qualité d'extraction:**
- Le PDF est mal formaté ou corrompu
- Vérifier le PDF dans un lecteur externe

#### Sync Zotero échoue

1. Vérifier que la clé API est valide
2. Vérifier que le User ID est correct
3. Vérifier la connexion internet
4. Consulter les logs pour plus de détails

### Logs de debug

**Emplacements:**

- Linux: `~/.config/ClioDesk/logs/`
- macOS: `~/Library/Logs/ClioDesk/`
- Windows: `%APPDATA%\ClioDesk\logs\`

**Consulter les logs:**
```bash
# Linux
cat ~/.config/ClioDesk/logs/main.log

# macOS
cat ~/Library/Logs/ClioDesk/main.log

# Windows
type %APPDATA%\ClioDesk\logs\main.log
```

---

## Distribution et Releases

### Signature de code (production)

#### macOS

1. Obtenir un certificat Apple Developer
2. Configurer dans `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

3. Builder avec signature:

```bash
CSC_NAME="Developer ID Application" npm run build:mac
```

#### Windows

1. Obtenir un certificat code signing
2. Configurer et builder:

```bash
set CSC_LINK=path/to/cert.pfx
set CSC_KEY_PASSWORD=your_password
npm run build:win
```

### GitHub Releases

1. **Créer un tag de version:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. **Builder et publier:**

```bash
GH_TOKEN=your_github_token npm run build:all
```

electron-builder peut publier automatiquement sur GitHub Releases si configuré.

3. **Configuration auto-update:**

Dans `package.json`:
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

### Variables d'environnement

**Build:**
- `CSC_LINK`: Chemin vers le certificat de signature
- `CSC_KEY_PASSWORD`: Mot de passe du certificat
- `GH_TOKEN`: Token GitHub pour les releases
- `DEBUG`: Activer les logs de debug d'electron-builder

**Runtime:**
- `NODE_ENV`: `development` ou `production`
- `OLLAMA_HOST`: URL Ollama (défaut: http://localhost:11434)

---

## Performance et Optimisation

### Configuration matérielle recommandée

**Minimum:**
- CPU: Dual-core
- RAM: 4 GB
- Disque: 5 GB libre

**Recommandé:**
- CPU: Quad-core
- RAM: 8 GB
- Disque: 10 GB libre

**Optimal:**
- CPU: 8+ cores
- RAM: 16 GB
- Disque: 20 GB libre (pour les modèles Ollama)

### Taille des installeurs

- **Linux AppImage**: ~150-200 MB
- **Linux deb**: ~150-200 MB
- **macOS DMG**: ~180-250 MB
- **Windows NSIS**: ~150-200 MB

### Espace disque par projet

- **App**: ~200 MB
- **Modèles Ollama**: ~500 MB - 5 GB (selon les modèles)
- **Base vectorielle**: 50-500 MB par projet (selon le nombre de PDFs)
- **Journal de recherche**: 1-5 MB par session, 50-200 MB pour un projet long

---

## Sécurité et Confidentialité

### Données locales

Toutes les données restent **locales**:
- PDFs et documents: stockés dans le dossier du projet
- Embeddings et index: SQLite local (`.cliodesk/vectors.db`)
- LLM et modèles: Ollama local

**Aucune donnée n'est envoyée à des serveurs externes** (sauf si Zotero API est configuré pour la synchronisation).

### Stockage des API Keys

**Zotero API Key:**
- Stockée dans electron-store (chiffrement fourni par l'OS)
- Linux: GNOME Keyring / KWallet
- macOS: Keychain
- Windows: Credential Manager

---

## Scripts Utiles

```bash
# Nettoyage complet
npm run clean

# Réinstaller toutes les dépendances
rm -rf node_modules package-lock.json
npm install

# Rebuild modules natifs
npm run rebuild:native

# Vérifier les types
npm run typecheck

# Linter
npm run lint

# Preview du build
npm run preview
```

---

## Ressources

- [Electron Builder Documentation](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)
- [Ollama Documentation](https://ollama.ai/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vitest Documentation](https://vitest.dev/)

---

**Note pour le développement quotidien:** Utilisez simplement `npm run dev` dans un terminal et `npm start` dans un autre.
