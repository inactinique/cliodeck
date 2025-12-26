# Guide d'installation - mdFocus pour macOS

Ce guide vous accompagne dans l'installation complète de mdFocus sur macOS, depuis les prérequis jusqu'au premier lancement.

## Table des matières

- [Prérequis système](#prérequis-système)
- [Installation des dépendances](#installation-des-dépendances)
- [Installation de mdFocus](#installation-de-mdfocus)
- [Configuration initiale](#configuration-initiale)
- [Vérification de l'installation](#vérification-de-linstallation)
- [Dépannage](#dépannage)

## Prérequis système

- **macOS** : 10.15 (Catalina) ou supérieur
- **Architecture** : Intel (x64) ou Apple Silicon (arm64)
- **Espace disque** : Au moins 5 GB libres (pour l'application et les modèles Ollama)
- **Mémoire** : 8 GB RAM minimum, 16 GB recommandé

## Installation des dépendances

### 1. Homebrew (gestionnaire de paquets)

Si Homebrew n'est pas encore installé :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Suivez les instructions affichées pour ajouter Homebrew à votre PATH.

### 2. Node.js et npm

mdFocus nécessite Node.js 20+ et npm 10+.

```bash
# Installer Node.js via Homebrew
brew install node@20

# Vérifier les versions
node --version  # Devrait afficher v20.x.x ou supérieur
npm --version   # Devrait afficher 10.x.x ou supérieur
```

**Alternative : Utiliser nvm (Node Version Manager)**

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Redémarrer votre terminal, puis :
nvm install 20
nvm use 20
nvm alias default 20
```

### 3. Python 3

mdFocus utilise Python pour certains services (topic modeling). Python 3.11+ est requis.

```bash
# Vérifier si Python 3 est installé
python3 --version

# Si nécessaire, installer via Homebrew
brew install python@3.11
```

**Note :** L'environnement virtuel Python (venv) sera créé automatiquement par mdFocus au premier lancement.

### 4. Ollama (LLM local)

Ollama est nécessaire pour les fonctionnalités d'IA locales (embeddings et chat).

```bash
# Installer Ollama
brew install ollama

# Démarrer le service Ollama
brew services start ollama

# Alternative : Démarrer manuellement
ollama serve
```

**Télécharger les modèles requis :**

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

1. **Télécharger le DMG**
   - Rendez-vous sur [GitHub Releases](https://github.com/votre-org/mdfocus-electron/releases)
   - Téléchargez `mdFocus-0.1.0-mac.dmg` (ou la dernière version)

2. **Installer l'application**
   ```bash
   # Double-cliquer sur le DMG téléchargé
   # Glisser l'icône mdFocus vers le dossier Applications
   ```

3. **Autoriser l'application (première ouverture)**

   Au premier lancement, macOS peut bloquer l'application :
   ```bash
   # Méthode 1 : Via l'interface
   # Système → Confidentialité et sécurité → Ouvrir quand même

   # Méthode 2 : Via le terminal
   xattr -cr /Applications/mdFocus.app
   ```

4. **Lancer mdFocus**
   - Depuis Launchpad
   - Ou depuis Applications → mdFocus

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
   ```bash
   npx electron-rebuild -f
   ```

4. **Compiler le projet**
   ```bash
   npm run build
   ```

5. **Lancer en mode développement**
   ```bash
   # Terminal 1 : Compiler en mode watch
   npm run dev

   # Terminal 2 : Lancer l'application
   npm start
   ```

   **Ou en une seule commande :**
   ```bash
   npm run dev:full
   ```

6. **Construire l'application pour distribution**
   ```bash
   # Build pour macOS
   npm run build:mac

   # Le DMG sera dans : release/mdFocus-0.1.0-mac.dmg
   ```

## Configuration initiale

Au premier lancement de mdFocus :

### 1. Vérification d'Ollama

mdFocus vérifie automatiquement la connexion à Ollama (http://localhost:11434).

**Si la connexion échoue :**
- Assurez-vous qu'Ollama est démarré : `brew services start ollama`
- Ou lancez manuellement : `ollama serve` dans un terminal séparé
- Vérifiez que le port 11434 n'est pas bloqué

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
tail -f ~/Library/Logs/mdFocus/main.log
```

## Dépannage

### Problème : "App can't be opened because it is from an unidentified developer"

```bash
xattr -cr /Applications/mdFocus.app
```

Puis relancez l'application.

### Problème : Ollama ne répond pas

```bash
# Vérifier si Ollama tourne
ps aux | grep ollama

# Redémarrer le service
brew services restart ollama

# Ou manuellement
pkill ollama
ollama serve
```

### Problème : "Module did not self-register" (better-sqlite3)

Cela signifie que le module natif n'a pas été compilé pour votre architecture.

```bash
cd /path/to/mdfocus-electron
rm -rf node_modules/better-sqlite3/build
npx electron-rebuild -f -w better-sqlite3
npm start
```

### Problème : Python venv ne se crée pas

Vérifiez que Python 3 est bien installé :

```bash
python3 --version
which python3

# Si nécessaire, installer via Homebrew
brew install python@3.11
```

### Problème : Mémoire insuffisante pour les modèles

Les modèles Ollama consomment de la RAM :
- `nomic-embed-text` : ~1 GB
- `gemma2:2b` : ~2 GB
- `mistral:7b-instruct` : ~4 GB

**Solutions :**
- Fermer les applications inutilisées
- Utiliser uniquement `gemma2:2b` (éviter `mistral:7b-instruct`)
- Augmenter la RAM de votre Mac

### Problème : Port 11434 déjà utilisé

Si un autre service utilise le port 11434 :

```bash
# Identifier le processus
lsof -i :11434

# Option 1 : Arrêter l'autre service
# Option 2 : Configurer Ollama sur un autre port
OLLAMA_HOST=127.0.0.1:11435 ollama serve

# Puis dans mdFocus Settings → LLM → URL : http://localhost:11435
```

### Obtenir de l'aide

- **Documentation** : [README.md](README.md)
- **Issues** : [GitHub Issues](https://github.com/votre-org/mdfocus-electron/issues)
- **Logs** : `~/Library/Logs/mdFocus/`

## Désinstallation

Pour désinstaller complètement mdFocus :

```bash
# Supprimer l'application
rm -rf /Applications/mdFocus.app

# Supprimer les données utilisateur
rm -rf ~/Library/Application\ Support/mdfocus-electron
rm -rf ~/.config/mdfocus-electron

# Supprimer les logs
rm -rf ~/Library/Logs/mdFocus

# (Optionnel) Désinstaller Ollama
brew uninstall ollama
rm -rf ~/.ollama
```

**Note :** Vos projets mdFocus (fichiers .md, PDFs, .mdfocus/) ne sont pas supprimés automatiquement.

## Prochaines étapes

Une fois mdFocus installé :
1. Consultez le [README.md](README.md) pour comprendre l'architecture
2. Lisez le [DEPLOYMENT.md](DEPLOYMENT.md) pour le workflow utilisateur
3. Explorez les [exemples de projets](examples/) (si disponibles)

---

**Licence :** MIT
**Support :** Ouvrez une issue sur GitHub pour toute question
