# Architecture Technique - ClioDesk

Ce document décrit l'architecture et le fonctionnement du système RAG (Retrieval-Augmented Generation) de ClioDesk, un assistant d'écriture académique pour historiens et chercheurs en sciences humaines.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture globale](#architecture-globale)
- [Pipeline d'indexation](#pipeline-dindexation)
- [Système de recherche](#système-de-recherche)
- [Génération assistée (RAG)](#génération-assistée-rag)
- [Intégrations externes](#intégrations-externes)
- [Performances et optimisations](#performances-et-optimisations)

---

## Vue d'ensemble

ClioDesk est une application Electron qui combine :
- **Frontend** : Interface React/TypeScript avec Monaco Editor
- **Backend** : Services Node.js/TypeScript pour l'indexation et la recherche
- **Services Python** : Topic modeling et analyse textométrique
- **LLM local** : Ollama pour embeddings et génération de texte
- **Stockage** : SQLite pour données et indexes vectoriels

### Objectifs de conception

1. **Local-first** : Toutes les données restent sur la machine de l'utilisateur
2. **Performance** : Optimisé pour machines modestes (8-16 GB RAM, CPU only)
3. **Académique** : Traçabilité complète et citations vérifiables
4. **Interopérabilité** : Intégration avec Zotero, BibTeX, Markdown, PDF

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                    ClioDesk Electron App                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │   Services   │      │
│  │  React/Vite  │◄─┤  TypeScript  │◄─┤    Python    │      │
│  │              │  │              │  │              │      │
│  │ • Editor     │  │ • PDF Index  │  │ • Topic      │      │
│  │ • Chat UI    │  │ • Vector DB  │  │   Modeling   │      │
│  │ • Config     │  │ • Search     │  │ • BERTopic   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                            │                │                │
│                            ▼                ▼                │
│                    ┌──────────────┐  ┌──────────────┐      │
│                    │   Ollama     │  │   SQLite     │      │
│                    │   (Local)    │  │ + HNSW Index │      │
│                    └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technologies clés

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **UI Framework** | React 18 + TypeScript | Interface utilisateur |
| **Editor** | Monaco Editor | Édition Markdown |
| **Build Tool** | Vite | Bundling et hot reload |
| **Desktop** | Electron 28 | Application desktop multi-plateforme |
| **Database** | better-sqlite3 | Stockage local synchrone |
| **Vector Index** | hnswlib-node | Recherche vectorielle rapide |
| **Sparse Index** | natural (BM25) | Recherche par mots-clés |
| **LLM** | Ollama | Embeddings + génération locale |
| **PDF Processing** | pdfjs-dist | Extraction de texte |
| **Bibliography** | BibTeX parsing | Gestion des références |
| **Topic Modeling** | Python + BERTopic | Analyse thématique |

---

## Pipeline d'indexation

Le pipeline d'indexation transforme les PDFs en chunks vectoriels interrogeables.

### Étape 1: Extraction PDF

**Fichier** : `backend/core/pdf/PDFIndexer.ts`

```typescript
// 1. Charger le PDF avec pdfjs
const pdf = await pdfjs.getDocument(pdfPath).promise;

// 2. Extraire le texte page par page
const pages = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const text = textContent.items.map(item => item.str).join(' ');
  pages.push({ pageNumber: i, content: text });
}

// 3. Extraire les métadonnées
const metadata = await pdf.getMetadata();
const title = metadata.info.Title || path.basename(pdfPath);
```

**Sortie** : Array de pages avec texte brut + métadonnées du document

---

### Étape 2: Chunking adaptatif

**Fichiers** :
- `backend/core/chunking/AdaptiveChunker.ts` (recommandé)
- `backend/core/chunking/DocumentChunker.ts` (fallback)

#### Détection de structure

Le chunker adaptatif détecte automatiquement la structure du document :

```typescript
// Détection de headers
const patterns = {
  markdown: /^#{1,6}\s+(.+)/,           // # Title, ## Subtitle
  numbered: /^\d+(\.\d+)*\s+(.+)/,      // 1. Introduction, 1.1 Context
  uppercase: /^[A-Z\s]{3,}$/,           // INTRODUCTION, METHODOLOGY
  roman: /^[IVX]+\.\s+(.+)/             // I. Introduction, II. Methods
};

// Classification automatique
const sectionTypes = {
  abstract: /abstract|résumé/i,
  introduction: /introduction/i,
  methodology: /method|méthodologie/i,
  results: /results|résultats/i,
  discussion: /discussion/i,
  conclusion: /conclusion/i,
  references: /references|bibliographie/i
};
```

#### Création de chunks

**Principes** :

1. **Respect des limites de phrases** : Les chunks se terminent toujours par `.`, `!`, `?` ou `;`
2. **Contexte du document** : Chaque chunk inclut titre et section en préfixe
3. **Skip des références** : La section bibliographique n'est pas indexée
4. **Overlap intelligent** : Les overlaps se font sur des phrases complètes

**Exemple de chunk généré** :

```
[Doc: Active Learning Strategies in Higher Education | Section: Methodology]

The intervention consisted of three phases: pre-assessment, active learning
activities using Bloom's taxonomy, and post-assessment. Students were divided
into control and experimental groups. The control group followed traditional
lecture-based instruction, while the experimental group participated in
collaborative problem-solving activities.
```

**Configuration** :

```typescript
interface ChunkingConfig {
  chunkSize: number;        // Taille cible en mots (300-500)
  overlap: number;          // Overlap en mots (50-100)
  maxTokens: number;        // Limite stricte en tokens (8192 pour nomic-embed-text)
}

const CHUNKING_CONFIGS = {
  cpuOptimized: { chunkSize: 300, overlap: 50, maxTokens: 8192 },
  standard: { chunkSize: 400, overlap: 75, maxTokens: 8192 },
  large: { chunkSize: 500, overlap: 100, maxTokens: 8192 }
};
```

**Sortie** : Array de chunks avec métadonnées

```typescript
interface DocumentChunk {
  id: string;                 // UUID
  documentId: string;         // Référence au document
  content: string;            // Texte du chunk (avec contexte)
  pageNumber: number;         // Page source
  chunkIndex: number;         // Position dans le document
  embedding?: number[];       // Vecteur (768 dimensions)
  metadata?: {
    sectionTitle?: string;    // "Methodology", "Results"
    sectionType?: string;     // "methodology", "results"
    sectionLevel?: number;    // 1, 2, 3...
  };
}
```

---

### Étape 3: Génération d'embeddings

**Fichier** : `backend/core/llm/OllamaClient.ts`

```typescript
// 1. Connexion à Ollama
const response = await fetch('http://localhost:11434/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({
    model: 'nomic-embed-text',  // 768 dimensions
    prompt: chunkContent
  })
});

// 2. Récupération du vecteur
const { embedding } = await response.json();
// embedding: number[] (768 dimensions)

// 3. Normalisation (si nécessaire)
const normalized = normalize(embedding);
```

**Modèle utilisé** : `nomic-embed-text`
- Dimensions : 768
- Contexte max : 8192 tokens
- Taille : ~274 MB
- Performance : ~100 embeddings/seconde sur CPU moyen

**Chunking d'urgence** : Si un chunk dépasse 8192 tokens, il est subdivisé intelligemment :

```typescript
private chunkText(text: string, maxLength: number): string[] {
  // Chercher une fin de phrase dans les 200 derniers caractères
  const sentenceEndings = /[.!?;](?=\s|$)/g;
  // ... découper au dernier point trouvé
}
```

---

### Étape 4: Indexation multi-stratégie

**Fichier** : `backend/core/vector-store/EnhancedVectorStore.ts`

Trois index sont créés simultanément :

#### Index 1: SQLite (base de données)

```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER,
  embedding BLOB,           -- Vector serialized
  metadata TEXT,            -- JSON
  created_at INTEGER
);

CREATE INDEX idx_document ON chunks(document_id);
CREATE INDEX idx_page ON chunks(page_number);
```

**Rôle** : Stockage persistant + fallback pour recherche linéaire

#### Index 2: HNSW (recherche vectorielle rapide)

**Fichier** : `backend/core/vector-store/HNSWVectorStore.ts`

```typescript
import { HierarchicalNSW } from 'hnswlib-node';

const index = new HierarchicalNSW('cosine', 768); // 768 dimensions
index.initIndex(maxElements, M=16, efConstruction=100);

// Indexation
for (const chunk of chunks) {
  index.addPoint(chunk.embedding, chunk.id);
}

// Sauvegarde sur disque
index.writeIndexSync(indexPath);
```

**Paramètres** :
- `M=16` : Connexions par node (trade-off vitesse/précision)
- `efConstruction=100` : Effort de construction
- `efSearch=50` : Effort de recherche

**Complexité** :
- Construction : O(n log n)
- Recherche : O(log n)

**Empreinte mémoire** : ~500 MB pour 50k chunks (768 dims)

#### Index 3: BM25 (recherche par mots-clés)

**Fichier** : `backend/core/search/BM25Index.ts`

```typescript
import natural from 'natural';

// 1. Tokenization
const tokens = tokenizer.tokenize(chunk.content.toLowerCase());

// 2. Build inverted index
for (const token of tokens) {
  invertedIndex[token] = invertedIndex[token] || [];
  invertedIndex[token].push(chunkId);
}

// 3. Calculate IDF
const idf = Math.log((totalDocs - docFreq + 0.5) / (docFreq + 0.5));

// 4. BM25 scoring
const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength))));
```

**Paramètres** :
- `k1=1.5` : Saturation de la fréquence des termes
- `b=0.75` : Normalisation de la longueur du document

**Empreinte mémoire** : ~100 MB pour 50k chunks

---

## Système de recherche

### Recherche hybride (Dense + Sparse)

**Fichier** : `backend/core/search/HybridSearch.ts`

La recherche hybride combine les avantages de deux approches complémentaires :

```
Query: "méthodologie bloom taxonomy"
        │
        ├────────────────────┬────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  Dense   │        │  Sparse  │        │  Fusion  │
  │  (HNSW)  │        │  (BM25)  │        │  (RRF)   │
  └──────────┘        └──────────┘        └──────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   Top-50 results       Top-50 results       Top-10 final
   (sémantique)         (keywords)           (best of both)
```

#### Étape 1: Recherche dense (HNSW)

```typescript
// 1. Générer embedding de la query
const queryEmbedding = await ollamaClient.generateEmbedding(query);

// 2. Recherche HNSW
const denseResults = await hnswStore.search(queryEmbedding, 50);
// Returns: [{ id, score }, ...]
```

**Avantage** : Comprend le sens sémantique ("active learning" ≈ "apprentissage actif")

#### Étape 2: Recherche sparse (BM25)

```typescript
// 1. Tokenization de la query
const queryTokens = tokenizer.tokenize(query.toLowerCase());

// 2. BM25 scoring
const sparseResults = bm25Index.search(queryTokens, 50);
// Returns: [{ id, score }, ...]
```

**Avantage** : Excellent pour termes rares, noms propres, acronymes ("BERTopic", "Piaget")

#### Étape 3: Fusion RRF (Reciprocal Rank Fusion)

```typescript
function reciprocalRankFusion(
  denseResults: SearchResult[],
  sparseResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  const scores = new Map<string, number>();

  // Contribution de la recherche dense (60%)
  for (let i = 0; i < denseResults.length; i++) {
    const chunkId = denseResults[i].id;
    const rrfScore = 0.6 / (k + i + 1);
    scores.set(chunkId, (scores.get(chunkId) || 0) + rrfScore);
  }

  // Contribution de la recherche sparse (40%)
  for (let i = 0; i < sparseResults.length; i++) {
    const chunkId = sparseResults[i].id;
    const rrfScore = 0.4 / (k + i + 1);
    scores.set(chunkId, (scores.get(chunkId) || 0) + rrfScore);
  }

  // Trier par score final
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, score]) => ({ id, score }));
}
```

**Poids** : 60% dense / 40% sparse (configurable)

**Formule RRF** : `RRF(d) = Σ weight_i / (k + rank_i(d))`

### Performance

| Métrique | Linear Search | HNSW Only | Hybrid (HNSW+BM25) |
|----------|--------------|-----------|-------------------|
| **Temps** | 500ms | 15ms | 30ms |
| **Precision@10** | 65% | 75% | 80% |
| **Recall@10** | 45% | 55% | 60% |

---

## Génération assistée (RAG)

### Pipeline complet

```
User Query
    │
    ├─► 1. Generate embedding
    │       │
    │       ▼
    ├─► 2. Hybrid search (HNSW + BM25)
    │       │
    │       ▼
    ├─► 3. Retrieve top-K chunks (K=10)
    │       │
    │       ▼
    ├─► 4. Optional: Graph expansion
    │       │
    │       ▼
    ├─► 5. Build context
    │       │
    │       ▼
    └─► 6. Generate with LLM
            │
            ▼
        Response with citations
```

### Étape 1-3: Recherche (voir section précédente)

### Étape 4: Expansion par graphe (optionnel)

**Fichier** : `backend/core/analysis/TopicModelingService.ts`

Si activé (`useGraphContext: true`), les chunks similaires sont également récupérés :

```typescript
// 1. Pour chaque chunk récupéré, trouver ses voisins dans le graphe
const neighbors = graph.neighbors(chunkId);

// 2. Calculer similarité cosine
for (const neighbor of neighbors) {
  const similarity = cosineSimilarity(
    chunk.embedding,
    neighbor.embedding
  );

  if (similarity > graphSimilarityThreshold) {
    additionalChunks.push(neighbor);
  }
}

// 3. Ajouter top-N voisins
const topNeighbors = additionalChunks
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, additionalGraphDocs);
```

**Configuration** :
- `useGraphContext: boolean` (default: false)
- `graphSimilarityThreshold: number` (default: 0.7)
- `additionalGraphDocs: number` (default: 3)

### Étape 5: Construction du contexte

```typescript
function buildRAGContext(chunks: DocumentChunk[]): string {
  let context = "# Contexte (sources)\n\n";

  for (const chunk of chunks) {
    context += `## [${chunk.documentTitle}, p.${chunk.pageNumber}]\n`;
    context += `${chunk.content}\n\n`;
  }

  return context;
}
```

**Exemple de contexte généré** :

```markdown
# Contexte (sources)

## [Active Learning in Higher Education, p.12]
[Doc: Active Learning in Higher Education | Section: Methodology]

The intervention consisted of three phases: pre-assessment, active learning
activities using Bloom's taxonomy, and post-assessment...

## [Bloom's Taxonomy Revised, p.34]
[Doc: Bloom's Taxonomy Revised | Section: Cognitive Processes]

The revised taxonomy introduces six levels of cognitive complexity: Remember,
Understand, Apply, Analyze, Evaluate, and Create...
```

### Étape 6: Génération LLM

**Fichier** : `src/main/services/chat-service.ts`

```typescript
const prompt = `Tu es un assistant de recherche pour historiens.

${ragContext}

Question de l'utilisateur :
${userQuery}

Instructions :
- Réponds en te basant UNIQUEMENT sur les sources ci-dessus
- Cite toujours les sources avec [Document, p.X]
- Si l'information n'est pas dans les sources, dis-le clairement
- Réponds en français de manière claire et académique

Réponse :`;

const response = await ollama.generate({
  model: 'gemma2:2b',
  prompt: prompt,
  stream: true
});
```

**Streaming** : La réponse est envoyée token par token pour meilleure UX

---

## Intégrations externes

### Zotero

**Fichier** : `src/main/services/zotero-service.ts`

```typescript
// 1. Authentification
const headers = {
  'Zotero-API-Key': apiKey,
  'Zotero-API-Version': '3'
};

// 2. Récupérer collections
const collections = await fetch(
  `https://api.zotero.org/users/${userId}/collections`,
  { headers }
);

// 3. Récupérer items d'une collection
const items = await fetch(
  `https://api.zotero.org/users/${userId}/collections/${collectionId}/items`,
  { headers }
);

// 4. Export BibTeX
const bibtex = await fetch(
  `https://api.zotero.org/users/${userId}/collections/${collectionId}/items?format=bibtex`,
  { headers }
);

// 5. Télécharger PDFs
for (const item of items) {
  if (item.data.linkMode === 'linked_file') {
    const pdf = await downloadAttachment(item.key);
    await savePDF(pdf, projectPath);
  }
}
```

### BibTeX

**Parsing** : Utilise un parser custom pour les fichiers `.bib`

```typescript
function parseBibTeX(bibContent: string): BibEntry[] {
  const entries = [];
  const entryRegex = /@(\w+)\{([^,]+),\s*([\s\S]*?)\n\}/g;

  let match;
  while ((match = entryRegex.exec(bibContent)) !== null) {
    const [_, type, key, fields] = match;

    const entry = {
      type: type.toLowerCase(),
      key: key.trim(),
      fields: parseFields(fields)
    };

    entries.push(entry);
  }

  return entries;
}
```

### Topic Modeling (Python)

**Service** : `backend/python-services/topic-modeling/main.py`

```python
from bertopic import BERTopic
from fastapi import FastAPI

app = FastAPI()

@app.post("/analyze")
async def analyze_corpus(documents: List[str]):
    # 1. Embeddings avec sentence-transformers
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(documents)

    # 2. Topic modeling avec BERTopic
    topic_model = BERTopic()
    topics, probs = topic_model.fit_transform(documents, embeddings)

    # 3. Extraction des topics
    topic_info = topic_model.get_topic_info()

    return {
        "topics": topics,
        "topic_info": topic_info.to_dict(),
        "probabilities": probs.tolist()
    }
```

**Communication** : Le backend TypeScript communique via HTTP (port 8001)

```typescript
const response = await fetch('http://localhost:8001/analyze', {
  method: 'POST',
  body: JSON.stringify({ documents: chunks })
});

const { topics, topic_info } = await response.json();
```

---

## Performances et optimisations

### Empreinte mémoire (50k chunks typiques)

| Composant | RAM | Description |
|-----------|-----|-------------|
| Electron | 1.5 GB | App + Chromium |
| HNSW index | 500 MB | 50k × 768 dims × 3x overhead |
| BM25 index | 100 MB | Index inversé + vocabulaire |
| SQLite | 300 MB | Chunks + metadata |
| Ollama (nomic) | 500 MB | Modèle d'embeddings en RAM |
| **Total** | **~3 GB** | Pour un projet moyen |

### Configuration recommandée

| Taille Corpus | RAM min | CPU | Temps indexation |
|--------------|---------|-----|------------------|
| 10-50 PDFs | 4 GB | Dual-core | 5-10 min |
| 50-200 PDFs | 8 GB | Quad-core | 20-40 min |
| 200-500 PDFs | 16 GB | 8+ cores | 1-2 heures |

### Optimisations CPU

**1. Chunking parallèle** :
```typescript
// Traiter les documents en parallèle (max 4 simultanés)
const batches = chunk(documents, 4);
for (const batch of batches) {
  await Promise.all(batch.map(doc => indexDocument(doc)));
}
```

**2. Batch embeddings** :
```typescript
// Générer embeddings par batch de 32
for (let i = 0; i < chunks.length; i += 32) {
  const batch = chunks.slice(i, i + 32);
  const embeddings = await ollama.batchEmbed(batch);
}
```

**3. Index build en arrière-plan** :
```typescript
// Construire HNSW index de manière asynchrone
setTimeout(() => {
  hnswStore.rebuild();
}, 5000);
```

### Configurations de chunking

```typescript
const CHUNKING_CONFIGS = {
  // Pour machines modestes (8 GB RAM)
  cpuOptimized: {
    chunkSize: 300,    // Petits chunks = moins de tokens
    overlap: 50,       // Overlap minimal
    maxTokens: 8192
  },

  // Balance performance/précision
  standard: {
    chunkSize: 400,
    overlap: 75,
    maxTokens: 8192
  },

  // Pour précision maximale (16+ GB RAM)
  large: {
    chunkSize: 500,
    overlap: 100,
    maxTokens: 8192
  }
};
```

---

## Fichiers clés de l'architecture

```
backend/
├── core/
│   ├── analysis/
│   │   └── TopicModelingService.ts      # Analyse thématique + graphe
│   ├── chunking/
│   │   ├── AdaptiveChunker.ts           # Chunking structure-aware
│   │   └── DocumentChunker.ts           # Chunking simple (fallback)
│   ├── history/
│   │   └── HistoryManager.ts            # Journal de recherche
│   ├── llm/
│   │   └── OllamaClient.ts              # Client Ollama (embeddings + chat)
│   ├── pdf/
│   │   └── PDFIndexer.ts                # Extraction + indexation PDFs
│   ├── search/
│   │   ├── BM25Index.ts                 # Index sparse (keywords)
│   │   └── HybridSearch.ts              # Fusion dense + sparse
│   └── vector-store/
│       ├── VectorStore.ts               # SQLite base store
│       ├── HNSWVectorStore.ts           # Index HNSW rapide
│       └── EnhancedVectorStore.ts       # Wrapper unifié
│
├── python-services/
│   └── topic-modeling/
│       ├── main.py                      # FastAPI service
│       ├── topic_analyzer.py            # BERTopic logic
│       └── requirements.txt             # Dépendances Python
│
├── types/
│   ├── config.ts                        # Types de configuration
│   └── pdf-document.ts                  # Types documents/chunks
│
src/
├── main/
│   ├── services/
│   │   ├── chat-service.ts              # Service RAG
│   │   ├── pdf-service.ts               # Gestion PDFs
│   │   ├── project-manager.ts           # Gestion projets
│   │   └── topic-modeling-service.ts    # Proxy Python service
│   └── ipc/
│       └── handlers/                    # IPC Electron
│
└── renderer/
    ├── components/
    │   ├── Chat/                        # Interface chat
    │   ├── Config/                      # Paramètres
    │   ├── Editor/                      # Éditeur Markdown
    │   ├── PDFIndex/                    # Gestion PDFs
    │   └── Journal/                     # Journal de recherche
    └── stores/
        └── editorStore.ts               # State Zustand
```

---

## Références techniques

### Papers

- **HNSW** : [Efficient and robust approximate nearest neighbor search](https://arxiv.org/abs/1603.09320) (Malkov & Yashunin, 2016)
- **BM25** : [The Probabilistic Relevance Framework: BM25 and Beyond](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf) (Robertson & Zaragoza, 2009)
- **RRF** : [Reciprocal rank fusion outperforms condorcet](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) (Cormack et al., 2009)
- **RAG** : [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) (Lewis et al., 2020)

### Outils et bibliothèques

- [Ollama](https://ollama.ai/) - LLMs locaux
- [hnswlib](https://github.com/nmslib/hnswlib) - HNSW implementation
- [natural](https://github.com/NaturalNode/natural) - NLP pour Node.js
- [BERTopic](https://maartengr.github.io/BERTopic/) - Topic modeling
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) - PDF rendering
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite synchrone

---

**Version** : 1.0.0
**Dernière mise à jour** : 2026-01-11
**Statut** : ✅ Production-ready
