# Guide de Déploiement - mdFocus Electron

Ce document décrit comment déployer mdFocus en production.

## Prérequis

1. **Ollama installé** sur la machine cible
2. **Modèles téléchargés**:
   ```bash
   ollama pull nomic-embed-text
   ollama pull gemma2:2b
   ```

## Installation utilisateur

### Linux

**AppImage (recommandé):**
```bash
# Télécharger
wget https://github.com/your-org/mdfocus-electron/releases/latest/download/mdFocus-0.1.0.AppImage

# Rendre exécutable
chmod +x mdFocus-0.1.0.AppImage

# Lancer
./mdFocus-0.1.0.AppImage
```

**Debian/Ubuntu (.deb):**
```bash
sudo dpkg -i mdFocus-0.1.0.deb
sudo apt-get install -f  # Fix dependencies
mdfocus
```

### macOS

```bash
# Télécharger le DMG
# Double-cliquer pour monter
# Glisser mdFocus vers Applications
# Lancer depuis Launchpad
```

**Première ouverture (macOS):**
Si "app cannot be opened because it is from an unidentified developer":
```bash
xattr -cr /Applications/mdFocus.app
```

### Windows

```bash
# Télécharger mdFocus-Setup-0.1.0.exe
# Double-cliquer
# Suivre l'assistant d'installation
# Lancer depuis le menu Démarrer
```

## Configuration initiale

### 1. Vérifier Ollama

Au premier lancement, mdFocus vérifie la connexion Ollama.

**Si Ollama n'est pas détecté:**
1. Installer Ollama: https://ollama.ai/
2. Démarrer le service:
   ```bash
   # Linux/macOS
   ollama serve

   # Windows
   # Ollama démarre automatiquement
   ```

### 2. Télécharger les modèles

```bash
# Modèle d'embeddings (obligatoire)
ollama pull nomic-embed-text

# Modèle de chat (recommandé)
ollama pull gemma2:2b

# Alternative plus grosse (optionnel)
ollama pull mistral:7b-instruct
```

### 3. Configuration Zotero (optionnel)

Pour sync avec Zotero:

1. Obtenir API Key: https://www.zotero.org/settings/keys/new
   - Permissions: Read library, Write library
   - Copier la clé

2. Dans mdFocus:
   - Settings → Zotero Integration
   - User ID: votre user ID Zotero
   - API Key: coller la clé
   - Test Connection

3. Sync:
   - Sélectionner une collection
   - Click "Sync"
   - Attendre download PDFs + BibTeX

## Workflow utilisateur

### Créer un projet

1. Nouveau Projet
2. Type: Article / Livre / Présentation
3. Choisir dossier
4. Le projet est créé avec structure:
   ```
   mon-article/
   ├── .mdfocus/
   │   └── vectors.db
   ├── src/
   │   ├── images/
   │   └── pdfs/
   ├── bibliography.bib
   └── article.md
   ```

### Importer bibliographie

**Méthode 1: Fichier .bib**
1. Bibliographie → Import BibTeX
2. Sélectionner fichier .bib
3. Citations apparaissent

**Méthode 2: Sync Zotero**
1. Settings → Zotero
2. Configurer API
3. Sync collection

### Indexer PDFs

**Méthode 1: Depuis bibliographie**
1. Clic sur citation avec PDF
2. "Indexer PDF"
3. Attendre progression

**Méthode 2: Glisser-déposer**
1. Panel "Documents PDF"
2. Glisser PDFs
3. Indexation automatique

**Méthode 3: Sync Zotero avec PDFs**
1. Sync avec "Download PDFs" activé
2. Auto-index tous les PDFs

### Écrire avec RAG

1. Éditeur: écrire en markdown
2. Chat: poser questions sur docs indexés
3. Citations: insérer avec `[@key]`
4. Sources: click pour ouvrir PDF

### Exporter

1. File → Export → PDF ou DOCX
2. Choisir format
3. Fichier généré

## Maintenance

### Base de données vectorielle

Emplacement: `projet/.mdfocus/vectors.db`

**Nettoyage:**
```bash
# Dans mdFocus
Settings → Advanced → Clean orphaned chunks
```

**Backup:**
```bash
cp projet/.mdfocus/vectors.db projet/.mdfocus/vectors.db.backup
```

### Réindexer documents

Si problème avec recherche:
1. Panel PDFs
2. Clic sur document
3. "Ré-indexer"

### Logs

**Linux:**
```bash
~/.config/mdFocus/logs/
```

**macOS:**
```bash
~/Library/Logs/mdFocus/
```

**Windows:**
```bash
%APPDATA%\mdFocus\logs\
```

## Problèmes courants

### Ollama ne démarre pas

**Linux/macOS:**
```bash
# Vérifier statut
systemctl status ollama  # Linux
ps aux | grep ollama     # macOS

# Démarrer manuellement
ollama serve
```

**Windows:**
```bash
# Vérifier services
services.msc → Ollama
```

### Embeddings trop lents

1. Utiliser config "cpuOptimized":
   - Settings → RAG → Chunking: CPU Optimized

2. Réduire topK:
   - Settings → RAG → Top K: 5 (au lieu de 10)

3. Modèle plus petit:
   ```bash
   # Au lieu de mistral:7b, utiliser:
   ollama pull gemma2:2b
   ```

### Chat ne répond pas

1. Vérifier Ollama:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Vérifier modèle chat installé:
   ```bash
   ollama list
   ```

3. Changer modèle:
   - Settings → LLM → Chat Model

### PDFs mal indexés

**Texte extrait vide:**
- PDF est image-only (pas de texte)
- Solution: OCR externe puis ré-upload

**Mauvaise qualité:**
- PDF mal formaté
- Solution: essayer extraction alternative

### Sync Zotero échoue

1. Vérifier API Key valide
2. Vérifier User ID correct
3. Vérifier connexion internet
4. Logs pour détails

## Performance

### RAM recommandée

- **Minimum**: 4 GB
- **Recommandé**: 8 GB
- **Optimal**: 16 GB (pour gros PDFs)

### Espace disque

- **App**: ~200 MB
- **Ollama models**: ~500 MB - 5 GB
- **Vectors DB**: 50-500 MB par projet (selon PDFs)

### CPU

- **Minimum**: Dual-core
- **Recommandé**: Quad-core
- **Optimal**: 8+ cores (chunking + embeddings)

## Sécurité

### Données locales

Toutes les données restent **locales**:
- PDFs: dans projet
- Embeddings: SQLite local
- LLM: Ollama local

**Aucune donnée envoyée à des serveurs externes** (sauf Zotero API si configuré).

### API Keys

**Zotero API Key:**
- Stocké dans electron-store (encrypté par OS)
- Linux: GNOME Keyring / KWallet
- macOS: Keychain
- Windows: Credential Manager

## Mise à jour

### Auto-update

mdFocus vérifie automatiquement les updates:
1. Notification disponible
2. Click "Download"
3. Install et restart

### Manuel

1. Télécharger nouvelle version
2. Installer par-dessus l'ancienne
3. Projets et config préservés

## Support

### Logs de debug

Pour rapporter un bug, inclure:

```bash
# Linux
cat ~/.config/mdFocus/logs/main.log

# macOS
cat ~/Library/Logs/mdFocus/main.log

# Windows
type %APPDATA%\mdFocus\logs\main.log
```

### Informations système

```bash
# Version mdFocus
Help → About

# Version Ollama
ollama --version

# Modèles installés
ollama list
```

## Désinstallation

### Linux

```bash
# AppImage
rm mdFocus-0.1.0.AppImage

# deb
sudo apt-get remove mdfocus
```

### macOS

```bash
# Glisser vers Corbeille
rm -rf /Applications/mdFocus.app

# Config (optionnel)
rm -rf ~/Library/Application\ Support/mdFocus
```

### Windows

```bash
# Panneau de configuration → Programmes
# Ou: Désinstaller depuis menu Démarrer
```

**Supprimer config (optionnel):**
```bash
rmdir /s %APPDATA%\mdFocus
```

---

**Note**: Pour aide installation Ollama, voir https://ollama.ai/download
