# Guide de Build et Packaging - mdFocus Electron

Ce document explique comment compiler et packager mdFocus pour différentes plateformes.

## Prérequis

- **Node.js** 18+ et npm
- **Python** (pour better-sqlite3)
- **Ollama** installé localement pour les tests

### Plateformes spécifiques

**Linux:**
```bash
sudo apt-get install build-essential
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools ou Visual Studio Community

## Installation

```bash
npm install
```

## Développement

### Mode dev avec hot reload

```bash
npm run dev

```

Cette commande lance:
- Main process TypeScript en mode watch
- Renderer (React) avec Vite hot reload

### Démarrer l'application

```bash
npm start
```

### Mode production local

```bash
npm run start:prod
```

Compile tout puis lance Electron.

## Tests

### Tests unitaires

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

### Linter

```bash
npm run lint
```

### Type checking

```bash
npm run typecheck
```

## Build

### Build sans packaging

```bash
npm run build
```

Compile:
- Main process TypeScript → `dist/main/`
- Renderer React → `dist/renderer/`

### Build avec packaging (toutes plateformes)

```bash
npm run build:all
```

Crée les installeurs pour toutes les plateformes configurées.

### Build plateforme spécifique

```bash
# Linux (AppImage + deb)
npm run build:linux

# macOS (DMG, Intel + Apple Silicon)
npm run build:mac

# Windows (NSIS installer)
npm run build:win
```

### Build sans installer (pour tests)

```bash
npm run build:dir
```

Crée un dossier exécutable sans packaging dans `release/`.

## Structure de build

```
mdfocus-electron/
├── dist/                    # Code compilé
│   ├── main/               # Main process JS
│   └── renderer/           # React build
├── release/                # Installeurs
│   ├── mdFocus-0.1.0.AppImage
│   ├── mdFocus-0.1.0.dmg
│   └── mdFocus Setup 0.1.0.exe
└── build/                  # Assets pour packaging
    ├── icon.png
    ├── icon.icns
    └── icon.ico
```

## Configuration electron-builder

Voir `package.json` section `"build"`:

```json
{
  "build": {
    "appId": "com.mdfocus.app",
    "productName": "mdFocus",
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    },
    "mac": {
      "target": ["dmg"],
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": ["nsis"]
    }
  }
}
```

## Packaging multi-plateforme

### Linux → tous OS

Possible avec Docker:

```bash
docker run --rm -v $(pwd):/project electronuserland/builder:wine \
  bash -c "cd /project && npm install && npm run build:all"
```

### macOS → macOS/Linux/Windows

macOS peut builder pour toutes les plateformes:

```bash
npm run build:linux
npm run build:mac
npm run build:win
```

### Windows → Windows

Windows ne peut builder que pour Windows:

```bash
npm run build:win
```

## Signature de code (production)

### macOS

1. Obtenir certificat Apple Developer
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

3. Build:

```bash
CSC_NAME="Developer ID Application" npm run build:mac
```

### Windows

1. Obtenir certificat code signing
2. Configurer:

```bash
set CSC_LINK=path/to/cert.pfx
set CSC_KEY_PASSWORD=your_password
npm run build:win
```

## Variables d'environnement

### Build

- `CSC_LINK`: Chemin vers certificat
- `CSC_KEY_PASSWORD`: Mot de passe certificat
- `GH_TOKEN`: Token GitHub pour releases

### Runtime

- `NODE_ENV`: `development` ou `production`
- `OLLAMA_HOST`: URL Ollama (défaut: http://localhost:11434)

## Problèmes courants

### better-sqlite3 ne compile pas

```bash
npm rebuild better-sqlite3 --build-from-source
```

### Puppeteer trop lourd

Puppeteer est inclus pour export PDF. Pour réduire la taille:

```json
{
  "build": {
    "asarUnpack": ["node_modules/puppeteer/.local-chromium/**/*"]
  }
}
```

### Erreur: Module not found

Vérifier que `dist/` est bien créé:

```bash
npm run build
ls -la dist/
```

## Distribution

### GitHub Releases

1. Tag version:

```bash
git tag v0.1.0
git push --tags
```

2. Build et upload:

```bash
GH_TOKEN=xxx npm run build:all
```

electron-builder peut publier automatiquement sur GitHub Releases.

### Auto-update

Configurer dans `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "mdfocus-electron"
    }
  }
}
```

## Performance

### Optimisations build

1. **Vite build optimizations** (vite.config.ts):
   - Tree shaking
   - Code splitting
   - Minification

2. **Electron builder compressions**:
   - ASAR (par défaut)
   - Compression des assets

3. **SQLite native**:
   - better-sqlite3 est compilé en natif
   - Pas de dépendances runtime

### Taille des installeurs

- **Linux AppImage**: ~150-200 MB
- **macOS DMG**: ~180-250 MB
- **Windows NSIS**: ~150-200 MB

## Scripts de nettoyage

```bash
# Supprimer build artifacts
npm run clean

# Réinstaller dépendances
rm -rf node_modules package-lock.json
npm install
```

## Ressources

- [Electron Builder](https://www.electron.build/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)

---

**Note**: Pour le développement quotidien, utilisez simplement `npm run dev`.
