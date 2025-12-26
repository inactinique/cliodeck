# mdFocus Electron - Assistant d'écriture pour historiens

Application desktop multi-plateforme (Electron + React + TypeScript) pour assister les historiens dans l'écriture d'articles et de livres, avec RAG (Retrieval-Augmented Generation) et intégrations Zotero/Tropy.

## 🎯 Objectif

Créer un assistant d'écriture qui permet aux historiens de :
- Rechercher efficacement dans leurs données bibliographiques
- Interroger leurs sources numérisées (PDFs) via RAG
- Intégrer Zotero pour la bibliographie
- Intégrer Tropy pour les sources d'archives
- Éditer en markdown avec assistant IA contextuel

## 📋 État d'avancement

### ✅ Phase 1 : Infrastructure (COMPLÉTÉ)
- [x] Projet Electron + React + TypeScript initialisé
- [x] Structure de dossiers créée (src/, backend/)
- [x] Dépendances installées (better-sqlite3, electron-store, Monaco, pdfjs-dist, etc.)
- [x] IPC handlers configurés (preload bridge)
- [x] ConfigManager avec electron-store
- [x] **VectorStore.ts** porté depuis Swift (586 lignes)
  - Base SQLite avec better-sqlite3
  - Gestion documents et chunks
  - Embeddings en BLOB
  - Recherche par similarité cosinus
  - CASCADE delete
  - Statistics et integrity checks

### 🚧 En cours : Modules backend core
- [ ] DocumentChunker.ts
- [ ] BibTeXParser.ts
- [ ] PDFExtractor.ts (pdfjs-dist)
- [ ] OllamaClient.ts
- [ ] PDFIndexer.ts (orchestration)

### 📅 À venir
- [ ] Interface React (Monaco Editor, Chat RAG, Bibliography)
- [ ] Intégrations Zotero/Tropy
- [ ] Exports (PDF, DOCX, reveal.js)

## 🏗️ Architecture

```
mdfocus-electron/
├── src/
│   ├── main/              # Electron Main Process
│   │   ├── index.ts       # Entry point
│   │   ├── ipc/
│   │   │   └── handlers.ts # IPC handlers
│   │   └── services/
│   │       └── config-manager.ts # Configuration
│   ├── preload/
│   │   └── index.ts       # IPC bridge sécurisé
│   └── renderer/          # React Frontend
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── components/
│
├── backend/               # Modules Node.js
│   ├── core/
│   │   ├── vector-store/
│   │   │   └── VectorStore.ts ✅
│   │   ├── chunking/
│   │   ├── pdf/
│   │   ├── llm/
│   │   └── bibliography/
│   ├── integrations/
│   │   ├── zotero/
│   │   └── tropy/
│   └── types/
│       ├── config.ts ✅
│       └── pdf-document.ts ✅
│
└── package.json
```

## 🔧 Stack technique

### Frontend
- **Electron 28** - Desktop multi-plateforme
- **React 18** - UI components
- **TypeScript 5** - Type safety
- **Monaco Editor** - Éditeur markdown
- **Zustand** - State management
- **Vite** - Build tool

### Backend
- **Node.js 20+** - Runtime JavaScript
- **better-sqlite3** - Base SQLite (vector store)
- **pdfjs-dist** - Extraction PDF
- **electron-store** - Persistance config
- **Python 3.11+** - Services d'analyse (topic modeling)

### LLM & IA
- **Ollama** - Modèles locaux (nomic-embed-text, gemma2:2b)
  - Modèle d'embeddings : `nomic-embed-text` (768 dimensions)
  - Modèle de chat : `gemma2:2b` (rapide, multilingue)
- **BERTopic** - Topic modeling et clustering (Python)
- **Claude API** - Option cloud (Anthropic)
- **OpenAI API** - Option cloud alternative

## 🚀 Installation

### Guides détaillés par plateforme

Pour des instructions complètes d'installation avec gestion des dépendances système, configuration d'Ollama, et dépannage :

- 📘 **[Guide d'installation macOS](INSTALL_MACOS.md)** - Installation complète sur macOS (Intel et Apple Silicon)
- 📗 **[Guide d'installation Linux](INSTALL_LINUX.md)** - Installation sur Ubuntu, Debian, Fedora, Arch Linux, etc.

### Installation rapide (développeurs)

**Prérequis :**
- Node.js 20+ et npm 10+
- Python 3.11+ (avec venv)
- Ollama avec les modèles :
  - `nomic-embed-text` (obligatoire pour embeddings)
  - `gemma2:2b` (recommandé pour chat)

**Installation :**

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/mdfocus-electron.git
cd mdfocus-electron

# Installer les dépendances npm
npm install

# Compiler les modules natifs pour Electron
npx electron-rebuild -f

# Compiler le projet
npm run build

# Lancer l'application
npm start
```

**Installation d'Ollama et des modèles :**

```bash
# macOS
brew install ollama
brew services start ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Télécharger les modèles
ollama pull nomic-embed-text
ollama pull gemma2:2b
```

## 📦 Scripts disponibles

```bash
# Développement (compile en mode watch + lance l'app)
npm run dev:full

# Développement (compile uniquement en mode watch)
npm run dev

# Build production
npm run build

# Lancer l'application
npm start

# Build pour distribution
npm run build:linux    # AppImage + .deb
npm run build:mac      # DMG (x64 + arm64)
npm run build:win      # NSIS installer

# Tests
npm test
npm run test:watch
npm run test:coverage

# Type checking
npm run typecheck

# Lint
npm run lint

# Nettoyage
npm run clean
```

## 📚 Composants principaux

### VectorStore (✅ Complété)

**Fichier:** `backend/core/vector-store/VectorStore.ts`

Gestion de la base de données SQLite pour les embeddings vectoriels.

**Fonctionnalités:**
- Stockage documents PDF avec métadonnées
- Stockage chunks de texte avec embeddings (Float32Array → Buffer)
- Recherche par similarité cosinus
- Statistics (documents, chunks, embeddings)
- Integrity checks (orphaned chunks)
- CASCADE delete automatique

**Schéma SQLite:**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  year TEXT,
  bibtex_key TEXT,
  page_count INTEGER,
  created_at TEXT,
  indexed_at TEXT,
  last_accessed_at TEXT,
  metadata TEXT
);

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER,
  start_position INTEGER,
  end_position INTEGER,
  embedding BLOB,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

**Usage:**
```typescript
import { VectorStore } from './backend/core/vector-store/VectorStore';

const vectorStore = new VectorStore();

// Sauvegarder document
vectorStore.saveDocument(pdfDoc);

// Sauvegarder chunk avec embedding
vectorStore.saveChunk(chunk, embedding);

// Recherche sémantique
const results = vectorStore.search(queryEmbedding, 10);

// Stats
const stats = vectorStore.getStatistics();
console.log(stats.documentCount, stats.embeddingCount);
```

### ConfigManager (✅ Complété)

**Fichier:** `src/main/services/config-manager.ts`

Gestion de la configuration avec electron-store.

**Configuration:**
```typescript
{
  llm: {
    backend: 'ollama',
    ollamaURL: 'http://localhost:11434',
    ollamaEmbeddingModel: 'nomic-embed-text',
    ollamaChatModel: 'gemma2:2b'
  },
  rag: {
    topK: 10,
    similarityThreshold: 0.2,
    chunkingConfig: 'cpuOptimized'
  },
  editor: {
    fontSize: 14,
    theme: 'dark',
    wordWrap: true
  },
  recentProjects: []
}
```

## 📝 Port depuis Swift

Le projet réécrit mdFocus (Swift/macOS) en Electron multi-plateforme.

**Fichiers portés:**
- ✅ `VectorStore.swift` (586 lignes) → `VectorStore.ts`
  - Logique 100% portable
  - SQLite3 → better-sqlite3
  - Similarité cosinus identique
  - Gestion embeddings optimisée

**À porter:**
- `DocumentChunker.swift` → `DocumentChunker.ts`
- `BibTeXParser.swift` → `BibTeXParser.ts`
- `OllamaBackend.swift` → `OllamaClient.ts`
- `PDFTextExtractor.swift` → `PDFExtractor.ts` (PDFKit → pdfjs-dist)

## 🎯 Prochaines étapes

1. **Finaliser backend core** (2-3 jours)
   - Porter DocumentChunker
   - Porter BibTeXParser
   - Implémenter PDFExtractor avec pdfjs-dist
   - Porter OllamaClient

2. **Scripts de build** (1 jour)
   - Configurer Vite pour Electron
   - Build main + renderer séparés
   - TypeScript compilation

3. **Test bout-en-bout** (1 jour)
   - Tester VectorStore
   - Tester indexation PDF
   - Tester recherche sémantique

4. **Interface React** (1 semaine)
   - Layout 3-panel
   - Monaco Editor
   - Chat RAG interface
   - Bibliography panel

## 📖 Documentation

### Guides d'installation
- [INSTALL_MACOS.md](INSTALL_MACOS.md) - Guide complet pour macOS (Intel & Apple Silicon)
- [INSTALL_LINUX.md](INSTALL_LINUX.md) - Guide complet pour Linux (Ubuntu, Debian, Fedora, Arch)
- [DEPLOYMENT.md](DEPLOYMENT.md) - Déploiement en production et workflow utilisateur

### Documentation technique
- [VectorStore API](#vectorstore-complété) - Documentation VectorStore
- [Configuration](#configmanager-complété) - Options de configuration
- [Architecture](#architecture) - Structure du projet

## 🔗 Liens

- **Dépôt original:** `/home/inactinique/GitHub/mdFocus` (Swift)
- **Nouveau dépôt:** `/home/inactinique/GitHub/mdfocus-electron` (Electron)
- **Zotero API:** https://www.zotero.org/support/dev/web_api/v3/basics
- **Tropy:** https://tropy.org/
- **Ollama:** https://ollama.ai/

## 📄 Licence

MIT

---

**Note:** Ce projet est en développement actif. La Phase 1 (infrastructure) est complétée. Le backend core est en cours de portage depuis la version Swift.
