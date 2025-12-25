# Plan d'Implémentation - Approche 2 : Pipeline Enrichi avec Graphe de Connaissances

**Date de création :** 2025-12-23
**Branche :** `exploration`
**Objectif :** Améliorer la fonctionnalité "Discutez avec vos PDFs" avec graphe de citations, résumés et topic modeling

---

## Contraintes et Objectifs

### Contraintes techniques
- **Hardware cible :** MacBook Pro 6 ans, Intel Core i5, 16GB RAM, pas de GPU
- **Volume typique :** 50-100 documents par projet
- **Langues :** Français + Anglais (+ autres langues si possible)
- **Métadonnées Zotero :** Souvent incomplètes

### Objectifs principaux
1. **Graphe de citations** : Visualiser les liens entre articles (priorité #1)
2. **Résumés** : Extractif par défaut + option abstractif
3. **Topic modeling** : Vue globale avec BERTopic
4. **RAG enrichi** : Contexte amélioré avec graphe et résumés

---

## Architecture Projet

### Stockage par projet

**Décision importante :** Toutes les données enrichies (citations, résumés, graphe) sont **stockées par projet** dans un dossier `.mdfocus/` au sein de chaque projet.

#### Structure d'un projet

```
mon-projet-ia-education/           # Dossier du projet
├── project.json                   # Métadonnées du projet
├── document.md                    # Document principal
├── abstract.md                    # Résumé (article/book)
├── sources/                       # PDFs et autres sources
│   ├── papert1980.pdf
│   ├── resnick2017.pdf
│   └── ...
└── .mdfocus/                      # Données mdFocus (caché)
    ├── vectors.db                 # Base de données enrichie
    ├── config.json                # Config spécifique au projet
    └── graph-cache.json           # Cache du graphe (optionnel)
```

#### Contenu de `.mdfocus/vectors.db`

La base de données SQLite contient :
- Table `documents` : métadonnées + résumés + langue
- Table `chunks` : chunks de texte + embeddings
- Table `document_citations` : graphe de citations
- Table `document_similarities` : similarités pré-calculées

#### Types de projets

mdFocus supporte plusieurs types de projets :
- **`article`** : Article académique (défaut)
- **`book`** : Livre ou thèse
- **`presentation`** : Présentation Beamer
- **`notes`** : Dossier de notes simples (⚠️ **pas de système enrichi**)

Le système de citations/résumés/graphe s'applique **uniquement aux projets non-notes**.

#### Avantages de l'approche par projet

✅ **Isolation** : Chaque projet a son propre corpus et graphe
✅ **Cohérence** : Le graphe de citations n'a de sens que dans un corpus donné
✅ **Portabilité** : Copier le dossier du projet = tout vient avec
✅ **Backup simple** : Sauvegarder le dossier = sauvegarder toutes les données
✅ **Performance** : Bases plus petites (50-100 docs) vs base globale (1000+)
✅ **Partage** : Envoyer le projet à un collègue avec toutes les analyses

---

## Architecture Globale

```
PHASE D'INGESTION (par document)
├── 1. Extraction PDF + Métadonnées Zotero
├── 2. Extraction de Citations (pattern matching)
├── 3. Résumé Multi-niveaux (extractif/abstractif)
├── 4. Chunking + Embeddings (existant)
└── 5. Stockage en base enrichie

BASE DE DONNÉES ENRICHIE (SQLite)
├── documents (+ summary, citations_extracted, language)
├── chunks + embeddings (existant)
├── document_citations (nouvelle)
└── document_similarities (optionnel)

PHASE D'ANALYSE (sur demande)
├── 1. Construction du graphe (graphology)
├── 2. Topic modeling (BERTopic via service Python)
├── 3. Clustering de documents
└── 4. Calculs de centralité

INTERFACE UTILISATEUR
├── Vue "Corpus Explorer" (graphe + stats)
├── Chat RAG enrichi (+ contexte graphe)
└── Filtrage par topics/clusters
```

---

## Phase 1 - MVP Backend (Priorité)

### ✅ Tâches préliminaires
- [x] Créer branche git `exploration`
- [x] Créer ce fichier de plan

### ✅ 1. Enrichissement de la base de données

**Fichier :** [backend/core/vector-store/VectorStore.ts](backend/core/vector-store/VectorStore.ts)

**Modifications :**
- [x] Ajouter colonnes à `documents` :
  - `summary TEXT` (résumé généré)
  - `summary_embedding BLOB` (embedding du résumé)
  - `citations_extracted TEXT` (JSON array)
  - `language TEXT` (fr/en/etc.)

- [x] Créer table `document_citations` :
  ```sql
  CREATE TABLE document_citations (
    id TEXT PRIMARY KEY,
    source_doc_id TEXT NOT NULL,
    target_citation TEXT NOT NULL,
    target_doc_id TEXT,
    context TEXT,
    page_number INTEGER,
    FOREIGN KEY (source_doc_id) REFERENCES documents(id) ON DELETE CASCADE
  );
  ```

- [x] Créer table `document_similarities` (optionnel) :
  ```sql
  CREATE TABLE document_similarities (
    doc_id_1 TEXT NOT NULL,
    doc_id_2 TEXT NOT NULL,
    similarity REAL NOT NULL,
    PRIMARY KEY (doc_id_1, doc_id_2)
  );
  ```

- [x] Ajouter méthodes CRUD pour citations
  - `saveCitation()`
  - `getCitationsForDocument()`
  - `getDocumentsCitedBy()`
  - `getDocumentsCiting()`
  - `deleteCitationsForDocument()`

- [x] Ajouter méthodes pour similarités
  - `saveSimilarity()`
  - `getSimilarDocuments()`
  - `deleteSimilaritiesForDocument()`

- [x] Ajouter migration pour bases existantes
  - Migration automatique des colonnes manquantes

- [x] Mettre à jour les types TypeScript
  - Ajout interfaces `Citation`, `DocumentCitation`, `DocumentSimilarity`
  - Enrichissement de `PDFDocument`

**Tests :**
- [ ] Créer tests pour nouvelles tables
- [ ] Vérifier intégrité référentielle (CASCADE)

**Charge :** ~2-3 heures → **Terminé le 2025-12-23**

---

### ✅ 2. Extraction de Citations

**Nouveau fichier :** `backend/core/analysis/CitationExtractor.ts`

**Fonctionnalités :**
- [x] Détection de patterns de citations :
  - `(Auteur, YYYY)` et `(Auteur YYYY)`
  - `Auteur (YYYY)` et `Auteur, YYYY`
  - `Auteur et Auteur (YYYY)`
  - `Auteur et al. (YYYY)` / `Auteur et collaborateurs (YYYY)`
  - Regex multilingues (français/anglais) avec accents

- [x] Extraction de bibliographies (fin de document) :
  - Détection de section "Références" / "Bibliography" / "Bibliographie"
  - Parser entrées avec regex custom (pas de dépendance externe)
  - Support multi-formats (numérotées, à puces, etc.)

- [x] Matching avec documents existants :
  - Comparaison citations extraites avec métadonnées Zotero (auteur + année)
  - Normalisation des noms d'auteurs (accents, casse)
  - Algorithme de similarité pour matching fuzzy

- [x] Extraction du contexte :
  - Récupération du paragraphe contenant la citation
  - Limite de 300 caractères par contexte
  - Détection du numéro de page si disponible

- [x] Fonctionnalités additionnelles :
  - Détection de langue (heuristique FR/EN)
  - Statistiques sur les citations extraites
  - Déduplication automatique

**Méthodes principales :**
```typescript
export class CitationExtractor {
  extractCitations(fullText: string, pages?: Array<{...}>): Citation[];
  matchCitationsWithDocuments(citations: Citation[], documents: PDFDocument[]): Map<string, string>;
  detectLanguage(text: string): string;
  getCitationStatistics(citations: Citation[]): {...};
}
```

**Dépendances :**
- [x] Pas de dépendances externes (regex custom)
- [x] Détection de langue intégrée (pas besoin de `franc`)

**Tests :**
- [ ] Tester détection citations français
- [ ] Tester détection citations anglais
- [ ] Tester matching avec documents
- [ ] Tester extraction bibliographie

**Performance estimée :** ~1-2s par document (CPU)

**Charge :** ~4-6 heures → **Terminé le 2025-12-23**

---

### ✅ 3. Génération de Résumés

**Nouveau fichier :** [backend/core/analysis/DocumentSummarizer.ts](backend/core/analysis/DocumentSummarizer.ts)

**Stratégies implémentées :**

#### ✅ Option A : Résumé extractif (par défaut)
- [x] Algorithme de scoring personnalisé (TF-IDF simplifié + position + mots-clés)
- [x] **Aucune dépendance externe** (comme CitationExtractor)
- [x] Extraction de phrases clés avec scoring multi-critères :
  - Fréquence des termes (TF)
  - Position dans le document (début/fin prioritaires)
  - Présence de mots-clés académiques (FR/EN)
  - Longueur de phrase (ni trop courte ni trop longue)
  - Présence de chiffres (résultats)
- [x] Longueur configurable via `maxLength`

#### ✅ Option B : Résumé abstractif (optionnel)
- [x] Intégration avec OllamaClient existant
- [x] Prompt structuré identifiant : question de recherche, méthodologie, résultats, conclusion
- [x] Longueur configurable (150-300 mots)
- [x] Fallback automatique sur extractif en cas d'erreur LLM
- [x] Troncature du texte à 4000 chars pour contexte LLM

**Interface :**
```typescript
export interface SummarizerConfig {
  enabled: boolean;
  method: 'extractive' | 'abstractive';
  maxLength: number; // En nombre de mots
  llmModel?: string; // Pour abstractif
}

export class DocumentSummarizer {
  constructor(config: SummarizerConfig, ollamaClient?: OllamaClient);

  async generateSummary(fullText: string, metadata?: PDFMetadata): Promise<string>;
  async generateSummaryEmbedding(summary: string): Promise<Float32Array>;
}
```

**Fonctionnalités clés :**
- [x] Support multilingue (FR/EN) pour extractif
- [x] Stop words (FR/EN) pour améliorer le scoring
- [x] Mots-clés académiques (research, méthodologie, results, etc.)
- [x] Découpage intelligent en phrases (gestion abréviations)
- [x] Normalisation Unicode (accents)
- [x] Tri par position originale pour cohérence narrative

**Dépendances :**
- [x] ~~Installer `compromise` pour extractif~~ → **Aucune dépendance externe**
- [x] Réutiliser `OllamaClient` pour abstractif ✅

**Configuration :**
- [x] Ajouter `SummarizerConfig` dans [backend/types/config.ts](backend/types/config.ts) ✅
- [x] Ajouter à `RAGConfig.summarizer` ✅
- [x] Valeurs par défaut : extractif, 250 mots ✅
- [ ] Ajouter section UI dans `RAGConfigSection.tsx` (TODO frontend)

**Tests :**
- [ ] Tester résumé extractif (FR + EN)
- [ ] Tester résumé abstractif avec gemma2:2b
- [ ] Comparer temps d'exécution
- [ ] Tester avec différents maxLength

**Performance estimée :**
- Extractif : ~0.5-1s/doc (CPU uniquement)
- Abstractif : ~30-60s/doc (Core i5, dépend du modèle)

**Charge :** ~6-8 heures → **Terminé le 2025-12-24**

---

### ✅ 4. Construction du Graphe de Connaissances

**Nouveau fichier :** [backend/core/analysis/KnowledgeGraphBuilder.ts](backend/core/analysis/KnowledgeGraphBuilder.ts)

**Fonctionnalités implémentées :**
- [x] Créer graphe avec [graphology](https://graphology.github.io/) ✅
- [x] Ajouter nœuds :
  - Documents (avec métadonnées : titre, auteur, année, résumé, langue)
  - Auteurs (agrégés, optionnel)

- [x] Ajouter arêtes :
  - **Citations directes** (orientées, depuis `document_citations`)
  - **Similarité sémantique** (non-orientées, depuis `document_similarities`)
  - **Co-citations** (non-orientées, calculées : deux docs cités par le même doc)

- [x] Calculs sur le graphe :
  - **Centralité** : degré (in + out) de chaque nœud
  - **Détection de communautés** : algorithme Louvain
  - Positions pour visualisation : ForceAtlas2

- [x] Export pour visualisation :
  - Format JSON pour frontend
  - Positions calculées avec force-directed layout

**Interface :**
```typescript
export interface GraphNode {
  id: string;
  type: 'document' | 'author';
  label: string;
  metadata: { title, author, year, summary, language, pageCount };
  centrality?: number;
  community?: number;
  x?: number; // Position
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'citation' | 'similarity' | 'co-citation';
  weight: number;
  metadata?: { context, pageNumber };
}

export interface GraphBuildOptions {
  includeSimilarityEdges?: boolean;
  similarityThreshold?: number;
  includeAuthorNodes?: boolean;
  computeLayout?: boolean;
}

export class KnowledgeGraphBuilder {
  constructor(vectorStore: VectorStore);

  async buildGraph(options?: GraphBuildOptions): Promise<Graph>;
  calculateCentrality(graph: Graph): Map<string, number>;
  detectCommunities(graph: Graph): Map<string, number>;
  exportForVisualization(graph: Graph): { nodes: GraphNode[], edges: GraphEdge[] };
  getStatistics(graph: Graph): GraphStatistics;
}
```

**Méthodes implémentées :**
- [x] `buildGraph()` - Construction complète du graphe
- [x] `calculateCentrality()` - Calcul degré de chaque nœud
- [x] `detectCommunities()` - Détection avec Louvain
- [x] `exportForVisualization()` - Export JSON
- [x] `getStatistics()` - Statistiques sur le graphe

**Fonctionnalités clés :**
- [x] Graphe orienté pour citations (source → target)
- [x] Arêtes non-orientées pour similarité et co-citations
- [x] Gestion automatique des doublons
- [x] Layout ForceAtlas2 pour visualisation
- [x] Filtrage par seuil de similarité
- [x] Statistiques complètes (densité, degré moyen, communautés)

**Dépendances :**
- [x] Installer `graphology` ✅
- [x] Installer `graphology-layout-forceatlas2` ✅
- [x] Installer `graphology-communities-louvain` ✅
- [x] ~~Installer `graphology-metrics`~~ → **Degré calculé manuellement**

**Tests :**
- [ ] Tester construction graphe avec 10 documents
- [ ] Tester calculs de centralité
- [ ] Tester détection de communautés
- [ ] Tester export JSON
- [ ] Tester avec différents seuils de similarité

**Performance estimée :** ~2-5s pour 100 documents

**Charge :** ~8-10 heures → **Terminé le 2025-12-24**

---

### ✅ 5. Intégration dans PDFIndexer

**Fichier :** [backend/core/pdf/PDFIndexer.ts](backend/core/pdf/PDFIndexer.ts)

**Modifications :**
- [x] Ajouter étape extraction citations après extraction texte
- [x] Ajouter étape génération résumé (configurable)
- [x] Sauvegarder données enrichies dans VectorStore
- [x] Mettre à jour indicateur de progression

**Workflow d'indexation enrichi :**
```
1. Extraction PDF (existant)
2. Extraction auteur et année (existant)
3. Extraction texte complet pour analyse
4. Détection langue → CitationExtractor.detectLanguage()
5. Extraction citations → CitationExtractor.extractCitations()
6. Génération résumé → DocumentSummarizer.generateSummary() (optionnel)
7. Embedding résumé → DocumentSummarizer.generateSummaryEmbedding() (optionnel)
8. Création document avec champs enrichis (language, citations, summary, summaryEmbedding)
9. Sauvegarde document → VectorStore.saveDocument()
10. Matching citations avec documents existants → CitationExtractor.matchCitationsWithDocuments()
11. Sauvegarde citations → VectorStore.saveCitation() (boucle)
12. Chunking (existant)
13. Génération embeddings + sauvegarde (existant)
```

**Tests :**
- [x] Build vérifié et fonctionnel
- [ ] Indexer un document complet avec toutes les étapes
- [ ] Vérifier données enrichies en base
- [ ] Mesurer temps total d'indexation

**Charge :** ~3-4 heures

---

## Phase 2 - Service Python BERTopic

### ✅ 1. Créer service Python

**Nouveau dossier :** `backend/python-services/topic-modeling/`

**Fichiers :**
- [x] `requirements.txt` :
  ```
  bertopic==0.16.0
  fastapi==0.109.0
  uvicorn==0.27.0
  numpy==1.26.0
  scikit-learn==1.4.0
  pydantic==2.5.0
  ```

- [x] `main.py` : API FastAPI avec endpoints :
  - `POST /analyze` : Recevoir embeddings + métadonnées, retourner topics
  - `GET /health` : Health check

- [x] `topic_analyzer.py` : Logique BERTopic

- [x] `README.md` : Documentation complète du service

**Interface API :**
```python
# POST /analyze
{
  "embeddings": [[0.1, 0.2, ...], ...],  # N x 768
  "document_ids": ["doc1", "doc2", ...],
  "min_topic_size": 5,
  "language": "multilingual"
}

# Response
{
  "topics": [
    {
      "id": 0,
      "label": "Constructionnisme et apprentissage",
      "keywords": ["constructivisme", "Papert", "apprentissage"],
      "documents": ["doc1", "doc3", ...]
    },
    ...
  ]
}
```

**Tests :**
- [ ] Tester avec 50 documents simulés
- [ ] Vérifier performance (~10-20s)

**Charge :** ~4-6 heures

---

### ✅ 2. Intégration avec Electron

**Nouveau fichier :** `backend/core/analysis/TopicModelingService.ts`

**Fonctionnalités :**
- [x] Démarrer/arrêter service Python en subprocess
- [x] Health check au démarrage
- [x] Envoyer embeddings via HTTP
- [x] Parser réponse et stocker topics

**Interface :**
```typescript
export class TopicModelingService {
  private pythonProcess?: ChildProcess;
  private serviceURL: string = 'http://localhost:8001';

  async start(): Promise<void>;
  async stop(): Promise<void>;
  async isHealthy(): Promise<boolean>;
  async analyzeTopic(embeddings: Float32Array[], documentIds: string[]): Promise<Topic[]>;
}
```

**Gestion d'erreurs :**
- [x] Vérifier Python installé
- [x] Gérer service non disponible (mode dégradé)
- [x] Afficher message utilisateur si Python manquant

**Tests :**
- [x] Build vérifié et fonctionnel
- [ ] Tester start/stop service avec Python réel
- [ ] Tester analyse topics avec données réelles
- [ ] Tester gestion d'erreurs

**Charge :** ~4-5 heures

---

## Phase 3 - RAG Enrichi

### ✅ 1. Améliorer ChatService

**Fichier :** [src/main/services/chat-service.ts](src/main/services/chat-service.ts)

**Modifications :**
- [x] Ajouter option `useGraphContext` dans options
- [x] Si activé, récupérer documents connectés dans le graphe
- [x] Inclure résumés dans le contexte
- [x] Modifier prompt pour mentionner documents liés

**Nouveau retrieval hybride :**
```typescript
interface EnrichedRAGOptions {
  context?: boolean;
  useGraphContext?: boolean;
  includeSummaries?: boolean;
  topK?: number;
  additionalGraphDocs?: number;
  window?: BrowserWindow;
}
```

**Fonctionnalités implémentées :**
- [x] Méthode `convertChunksToSummaries()` : convertit les résultats de recherche pour utiliser résumés au lieu de chunks
- [x] Méthode `getRelatedDocumentsFromGraph()` : récupère documents liés via citations et similarité
- [x] Intégration dans `sendMessage()` : enrichissement automatique du contexte si options activées
- [x] Support des documents liés du graphe avec score de similarité

**Tests :**
- [ ] Tester RAG avec graphe
- [ ] Comparer qualité réponses (avec/sans graphe)

**Charge :** ~3-4 heures → **Terminé le 2025-12-24**

---

## Phase 4 - Interface Frontend (après backend)

### ✅ 1. Enrichir configuration UI

**Fichiers :**
- [src/renderer/src/components/Config/ConfigPanel.tsx](src/renderer/src/components/Config/ConfigPanel.tsx)
- [src/renderer/src/components/Config/RAGConfigSection.tsx](src/renderer/src/components/Config/RAGConfigSection.tsx)

**Modifications interface RAGConfig :**
- [x] Ajout champs pour génération de résumés :
  - `summaryGeneration: 'extractive' | 'abstractive' | 'disabled'`
  - `summaryMaxLength: number`
- [x] Ajout champs pour graphe de connaissances :
  - `useGraphContext: boolean`
  - `graphSimilarityThreshold: number`
  - `additionalGraphDocs: number`
- [x] Ajout champs pour RAG enrichi :
  - `includeSummaries: boolean`
- [x] Ajout champ pour topic modeling :
  - `enableTopicModeling: boolean`

**Ajouts UI dans RAGConfigSection :**
- [x] Select "Génération de résumés" (désactivé/extractif/abstractif)
- [x] Slider "Longueur maximale des résumés" (100-1000 mots, affiché conditionnellement)
- [x] Checkbox "Utiliser le graphe de connaissances"
- [x] Slider "Documents liés à inclure" (1-10, affiché si graphe activé)
- [x] Slider "Seuil de similarité pour le graphe" (0.5-1.0, affiché si graphe activé)
- [x] Checkbox "Utiliser résumés dans le RAG"
- [x] Checkbox "Modélisation de topics"

**Fonctionnalités :**
- [x] Affichage conditionnel des options (résumés max length, options graphe)
- [x] Valeurs par défaut cohérentes
- [x] Sauvegarde/chargement de la configuration
- [x] Reset vers valeurs par défaut
- [x] Build vérifié et fonctionnel

**Charge :** ~2-3 heures → **Terminé le 2025-12-24**

---

### ✅ 2. Vue "Corpus Explorer"

**Fichiers créés :**
- `src/renderer/src/components/Corpus/CorpusExplorerPanel.tsx` (370+ lignes)
- `src/renderer/src/components/Corpus/CorpusExplorerPanel.css` (300+ lignes)

**Fonctionnalités implémentées :**
- [x] Statistiques globales (documents, citations, auteurs, langues)
- [x] Graphe interactif avec react-force-graph
  - Nœuds colorés par communauté
  - Taille basée sur la centralité
  - Liens colorés par type (citation, similarité, co-citation)
  - Flèches directionnelles pour les citations
  - Zoom et pan interactifs
  - Drag & drop des nœuds
- [x] Panel de détails du nœud sélectionné
- [x] Légende du graphe
- [x] États de chargement et d'erreur
- [ ] Liste des topics (futur)
- [ ] Filtres (topic, année, auteur, langue) (futur)

**Backend ajouté :**
- [x] Handlers IPC `corpus:get-graph` et `corpus:get-statistics`
- [x] Méthodes dans pdf-service.ts : `buildKnowledgeGraph()`, `getCorpusStatistics()`, `getVectorStore()`
- [x] Types dans preload.ts pour `window.electron.corpus`

**Dépendances installées :**
- [x] react-force-graph
- [x] recharts

**Charge :** ~10-12 heures → **Terminé le 2025-12-24**

---

## Dépendances à installer

### NPM (backend)
```bash
npm install graphology graphology-layout-forceatlas2 graphology-communities-louvain graphology-metrics
npm install compromise franc citation-js
npm install @types/compromise --save-dev
```

### NPM (frontend)
```bash
npm install react-force-graph recharts
```

### Python (service topic modeling)
```bash
cd backend/python-services/topic-modeling
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Tests et Validation

### Tests unitaires
- [ ] CitationExtractor (patterns FR/EN)
- [ ] DocumentSummarizer (extractif/abstractif)
- [ ] KnowledgeGraphBuilder (graphe, centralité)
- [ ] TopicModelingService (communication Python)
- [ ] VectorStore (nouvelles tables)

### Tests d'intégration
- [ ] Indexation complète d'un document
- [ ] Construction graphe avec 50 documents
- [ ] Topic modeling avec 50 documents
- [ ] RAG enrichi (requête utilisateur)

### Tests de performance
- [ ] Temps indexation par document (extractif vs abstractif)
- [ ] Temps construction graphe (50, 100 docs)
- [ ] Temps topic modeling (50, 100 docs)
- [ ] Mémoire utilisée (Core i5, 16GB)

**Objectifs :**
- Indexation extractif : < 10s/doc
- Indexation abstractif : < 60s/doc
- Graphe (100 docs) : < 5s
- Topic modeling (100 docs) : < 20s
- Mémoire totale : < 4GB

---

## Limites Connues

### Techniques
- ❌ **Citations** : détection par regex imparfaite (faux positifs/négatifs)
- ❌ **Résumés extractifs** : qualité inférieure aux abstractifs
- ⚠️ **Topic modeling** : nécessite minimum ~30 documents
- ⚠️ **Graphe** : peu dense si métadonnées Zotero incomplètes
- ❌ **Multilingue** : topics peuvent mélanger FR/EN

### Expérience utilisateur
- ⚠️ **Indexation longue** : avec abstractif, 50 docs = ~30-50 min
- ❌ **Python requis** : pour topic modeling (BERTopic)
- ⚠️ **Graphe complexe** : difficile à lire au-delà de 150 docs

---

## Prochaines Étapes (après Phase 1-4)

### Futures améliorations
- [ ] Extraction d'entités nommées (NER) pour concepts
- [ ] Analyse temporelle (évolution des topics dans le temps)
- [ ] Workflow "Génération état de l'art"
- [ ] Export graphe (PDF, PNG, GraphML)
- [ ] Intégration Tropy (sources primaires)
- [ ] Support d'autres langues (allemand, espagnol, etc.)

---

## Historique des Modifications

### 2025-12-23

**Session 1 - Setup initial**
- ✅ Création de la branche `exploration`
- ✅ Rédaction du plan initial

**Session 2 - Phase 1.1 : Enrichissement base de données**
- ✅ Ajout de 4 nouvelles colonnes à la table `documents` :
  - `summary`, `summary_embedding`, `citations_extracted`, `language`
- ✅ Création de la table `document_citations` avec clés étrangères
- ✅ Création de la table `document_similarities`
- ✅ Ajout de 6 index pour optimiser les requêtes
- ✅ Implémentation de la migration automatique pour bases existantes
- ✅ Ajout de 8 méthodes CRUD pour gérer citations et similarités :
  - Citations : `saveCitation`, `getCitationsForDocument`, `getDocumentsCitedBy`, `getDocumentsCiting`, `deleteCitationsForDocument`
  - Similarités : `saveSimilarity`, `getSimilarDocuments`, `deleteSimilaritiesForDocument`
- ✅ Mise à jour des types TypeScript :
  - Nouvelles interfaces : `Citation`, `DocumentCitation`, `DocumentSimilarity`
  - Enrichissement de `PDFDocument` avec les nouveaux champs optionnels

**Session 3 - Phase 1.2 : Extraction de Citations**
- ✅ Création du fichier `CitationExtractor.ts` (420 lignes)
- ✅ Implémentation de 4 patterns regex pour citations in-text :
  - Format parenthèses : `(Auteur, YYYY)`, `(Auteur YYYY)`
  - Format inline : `Auteur (YYYY)`, `Auteur, YYYY`
  - Multi-auteurs : `Auteur et Auteur (YYYY)`
  - Et al. : `Auteur et al. (YYYY)`, `Auteur et collaborateurs (YYYY)`
- ✅ Support complet des accents français (À, É, È, etc.)
- ✅ Extraction de bibliographies :
  - Détection de sections avec 6 mots-clés multilingues
  - Parser intelligent d'entrées (bullets, numéros, etc.)
  - Extraction auteur + année depuis entrées
- ✅ Matching avec documents existants :
  - Normalisation des noms (accents, casse)
  - Algorithme de similarité fuzzy
  - Gestion des suffixes d'année (2020a, 2020b)
- ✅ Extraction de contexte (paragraphe, max 300 chars)
- ✅ Détection de langue (heuristique FR/EN basée sur mots communs)
- ✅ Statistiques : total citations, auteurs uniques, range d'années
- ✅ **Aucune dépendance externe** - regex custom uniquement

**Session 4 - Architecture Projet (Mode projet forcé)**
- ✅ **Décision majeure** : Forcer le mode projet (stockage dans `projet/.mdfocus/`)
- ✅ Modification `VectorStore.ts` :
  - `projectPath` devenu **obligatoire** (plus de mode global)
  - Suppression du fallback sur `userData`
  - Validation stricte du projectPath
  - Ajout propriété `readonly projectPath`
- ✅ Modification `pdf-service.ts` :
  - Méthode `init(projectPath)` avec projectPath obligatoire
  - Gestion du changement de projet (fermeture base précédente)
  - Méthode `ensureInitialized()` pour validation
  - Méthode `getCurrentProjectPath()` pour introspection
- ✅ Modification `handlers.ts` (IPC) :
  - Ajout `projectPath` comme premier paramètre de tous les handlers PDF
  - Handlers mis à jour : `pdf:index`, `pdf:search`, `pdf:delete`, `pdf:get-all`, `pdf:get-statistics`
  - Handler `chat:send` mis à jour pour initialiser PDF service si RAG activé
  - Appel automatique à `pdfService.init(projectPath)` dans chaque handler
- ✅ Documentation complète de la structure projet dans `exploration-implementation.md`
- ✅ Correction `index.ts` :
  - Suppression de l'initialisation `pdfService.init()` au démarrage de l'app
  - Service maintenant initialisé uniquement à la demande (via handlers IPC)
  - Build vérifié et fonctionnel

**Prochaines étapes :**
- ✅ Phase 1.3 : Génération de Résumés (DocumentSummarizer) → **Terminé**
- ⚠️ **Note** : Le frontend devra être mis à jour pour passer `projectPath` aux handlers PDF/Chat

### 2025-12-24

**Session 5 - Phase 1.3 : Génération de Résumés**
- ✅ Création du fichier `DocumentSummarizer.ts` (400+ lignes)
- ✅ Implémentation résumé extractif :
  - Algorithme de scoring personnalisé sans dépendances externes
  - TF-IDF simplifié + position + mots-clés académiques
  - Support multilingue (FR/EN) avec stop words et normalisation Unicode
  - Découpage intelligent en phrases (gestion abréviations)
  - Tri par score puis repositionnement par ordre original pour cohérence
- ✅ Implémentation résumé abstractif :
  - Intégration avec OllamaClient existant
  - Prompt structuré pour articles académiques (question, méthodo, résultats, conclusion)
  - Fallback automatique sur extractif en cas d'erreur LLM
  - Troncature du texte à 4000 chars pour contexte
- ✅ Méthode `generateSummaryEmbedding()` pour encoder les résumés
- ✅ Mise à jour `backend/types/config.ts` :
  - Ajout interface `SummarizerConfig`
  - Intégration dans `RAGConfig.summarizer`
  - Valeurs par défaut : extractif, 250 mots, gemma2:2b pour abstractif
- ✅ Documentation complète dans `exploration-implementation.md`

**Prochaines étapes :**
- ✅ Phase 1.4 : Construction du Graphe de Connaissances (KnowledgeGraphBuilder) → **Terminé**
- 🔲 Phase 1.5 : Intégration dans PDFIndexer
- ⚠️ **Note** : Le frontend devra être mis à jour pour passer `projectPath` aux handlers PDF/Chat

**Session 6 - Phase 1.4 : Construction du Graphe de Connaissances**
- ✅ Installation de graphology et dépendances :
  - `graphology` (bibliothèque de graphes)
  - `graphology-communities-louvain` (détection de communautés)
  - `graphology-layout-forceatlas2` (layout pour visualisation)
- ✅ Création du fichier `KnowledgeGraphBuilder.ts` (540+ lignes)
- ✅ Implémentation construction du graphe :
  - Nœuds de documents avec métadonnées complètes
  - Nœuds d'auteurs (agrégés, optionnel)
  - Arêtes de citations directes (orientées, depuis BDD)
  - Arêtes de similarité sémantique (non-orientées, depuis BDD)
  - Arêtes de co-citations (calculées automatiquement)
- ✅ Implémentation des calculs :
  - Centralité par degré (in + out)
  - Détection de communautés avec algorithme Louvain
  - Layout ForceAtlas2 pour positions de visualisation
- ✅ Export et statistiques :
  - Export JSON (nodes + edges) pour frontend
  - Statistiques complètes (densité, degré moyen, communautés)
- ✅ Interfaces TypeScript : `GraphNode`, `GraphEdge`, `GraphBuildOptions`, `GraphStatistics`
- ✅ Build vérifié et fonctionnel

**Prochaines étapes :**
- ✅ Phase 1.5 : Intégration dans PDFIndexer (extraction + résumés + sauvegarder en BDD) → **Terminé**
- ⚠️ **Note** : Le frontend devra être mis à jour pour passer `projectPath` aux handlers PDF/Chat

**Session 7 - Phase 1.5 : Intégration dans PDFIndexer**
- ✅ Modification du fichier `PDFIndexer.ts` (362 lignes)
- ✅ Ajout des imports nécessaires :
  - `CitationExtractor` depuis `../analysis/CitationExtractor`
  - `DocumentSummarizer` et `SummarizerConfig` depuis `../analysis/DocumentSummarizer`
  - Type `Citation` depuis `../../types/pdf-document`
- ✅ Extension de l'interface `IndexingProgress` :
  - Ajout de 3 nouvelles étapes : `'analyzing'`, `'citations'`, `'summarizing'`
- ✅ Modification du constructeur de `PDFIndexer` :
  - Ajout du paramètre optionnel `summarizerConfig?: SummarizerConfig`
  - Initialisation de `CitationExtractor` (toujours actif)
  - Initialisation conditionnelle de `DocumentSummarizer` (selon config)
- ✅ Enrichissement du workflow `indexPDF()` :
  1. **Étape 4** : Détection de la langue du document avec `CitationExtractor.detectLanguage()`
  2. **Étape 5** : Extraction des citations avec `CitationExtractor.extractCitations()` + statistiques
  3. **Étape 6** : Génération du résumé (optionnel, selon `summarizerConfig.enabled`)
  4. **Étape 7** : Création du document avec champs enrichis (`language`, `citationsExtracted`, `summary`, `summaryEmbedding`)
  5. **Étape 8** : Sauvegarde du document dans VectorStore
  6. **Étape 9** : Matching des citations avec documents existants + sauvegarde en BDD
  7. **Étapes 10-11** : Chunking et embedding (existants, renumérotés)
- ✅ Mise à jour des indicateurs de progression :
  - `analyzing` à 27%
  - `citations` à 30%
  - `summarizing` à 33%
  - `chunking` à 40%
  - `embedding` à 50%-95%
  - `completed` à 100%
- ✅ Logs console détaillés :
  - Langue détectée
  - Nombre de citations extraites
  - Statistiques de citations (total, auteurs uniques, range années)
  - Nombre de mots du résumé
  - Nombre de citations matchées avec documents existants
- ✅ Build vérifié et fonctionnel
- ✅ Mise à jour de `pdf-service.ts` :
  - Ajout du paramètre `ragConfig.summarizer` au constructeur de `PDFIndexer`
  - Le service passe maintenant la configuration complète du résumé à l'indexeur
- ✅ Build final vérifié et fonctionnel

**Prochaines étapes :**
- ✅ Phase 2.1 : Service Python pour BERTopic → **Terminé**
- [ ] Tester le workflow enrichi avec de vrais documents
- ⚠️ **Note** : Le frontend devra être mis à jour pour passer `projectPath` aux handlers PDF/Chat

**Session 8 - Phase 2.1 : Service Python pour BERTopic**
- ✅ Création du dossier `backend/python-services/topic-modeling/`
- ✅ Création de `requirements.txt` avec dépendances :
  - bertopic==0.16.0
  - fastapi==0.109.0, uvicorn==0.27.0
  - numpy==1.26.0, scikit-learn==1.4.0
  - pydantic==2.5.0
- ✅ Création de `topic_analyzer.py` (280+ lignes) :
  - Classe `TopicAnalyzer` avec initialisation BERTopic
  - Méthode `analyze_topics()` : analyse à partir d'embeddings pré-calculés
  - Support stop words multilingues (FR/EN)
  - Gestion n-grammes configurables (1-3 par défaut)
  - Méthode `get_topic_info()` : détails d'un topic
  - Méthode `reduce_topics()` : fusion de topics similaires
- ✅ Création de `main.py` (180+ lignes) :
  - Application FastAPI avec CORS
  - Endpoint `GET /health` : health check
  - Endpoint `POST /analyze` : analyse de topics
  - Modèles Pydantic pour validation :
    - `AnalyzeRequest` : validation embeddings, documents, IDs
    - `AnalyzeResponse` : topics, assignments, outliers, stats
  - Gestion d'erreurs avec codes HTTP appropriés
- ✅ Création de `README.md` : documentation complète
  - Installation et utilisation
  - Description de l'architecture BERTopic
  - Exemples de requêtes/réponses
  - Performance estimée (10-20s pour 50 docs)
  - Guide d'intégration avec Electron

**Architecture BERTopic :**
1. Embeddings pré-calculés (depuis Ollama, 768 dim)
2. UMAP : réduction dimensionnelle (768 → 5)
3. HDBSCAN : clustering
4. c-TF-IDF : extraction mots-clés

**Configuration :**
- Port : 8001
- Host : 127.0.0.1
- min_topic_size : 5 (défaut)
- language : multilingual (FR+EN)
- n_gram_range : (1, 3)

**Prochaines étapes :**
- ✅ Phase 2.2 : Intégration avec Electron (TopicModelingService.ts) → **Terminé**
- [ ] Tester le service Python avec données réelles
- [ ] Créer handlers IPC pour topic modeling

**Session 9 - Phase 2.2 : Intégration avec Electron**
- ✅ Création du fichier `TopicModelingService.ts` (360+ lignes)
- ✅ Interfaces TypeScript :
  - `Topic` : représentation d'un topic (id, label, keywords, documents, size)
  - `TopicAnalysisResult` : résultat complet de l'analyse
  - `TopicAnalysisOptions` : options configurables (minTopicSize, language, nGramRange)
  - `HealthResponse` : réponse du health check
  - `AnalyzeResponse` : réponse brute de l'API Python
- ✅ Classe `TopicModelingService` :
  - Gestion du cycle de vie du subprocess Python
  - Variables d'état : isRunning, isStarting
  - Configuration : serviceURL (http://127.0.0.1:8001), timeout (30s)
- ✅ Méthode `start()` :
  - Vérification que Python est disponible via `checkPythonAvailable()`
  - Démarrage du subprocess avec `spawn('python', ['main.py'])`
  - Capture des logs stdout/stderr
  - Gestion de l'événement 'exit' du processus
  - Attente que le service soit prêt via `waitForServiceReady()`
- ✅ Méthode `stop()` :
  - Envoi de SIGTERM au processus Python
  - Fallback SIGKILL après 5s si nécessaire
  - Nettoyage des ressources
- ✅ Méthode `checkPythonAvailable()` :
  - Exécute `python --version` pour vérifier présence
  - Retourne erreur claire si Python manquant
- ✅ Méthode `waitForServiceReady()` :
  - Boucle de health checks toutes les 1s
  - Timeout de 30s
  - Retourne erreur si service ne démarre pas à temps
- ✅ Méthode `isHealthy()` :
  - Requête GET vers `/health`
  - Vérification du status "healthy"
- ✅ Méthode `analyzeTopics()` :
  - Validation des paramètres (longueurs, minimum de documents)
  - Conversion Float32Array → Array pour JSON
  - Requête POST vers `/analyze`
  - Conversion snake_case → camelCase pour TypeScript
  - Gestion d'erreurs HTTP avec messages clairs
- ✅ Méthode `getStatus()` :
  - Retourne l'état actuel du service (isRunning, isStarting, serviceURL)
- ✅ Gestion d'erreurs robuste :
  - Vérification Python installé
  - Timeout de démarrage
  - Messages d'erreur clairs pour l'utilisateur
  - Nettoyage automatique en cas d'échec
- ✅ Build vérifié et fonctionnel

**Architecture :**
```
Electron (TypeScript)
    ↓ spawn()
Python Service (FastAPI)
    ↓ HTTP POST /analyze
BERTopic Analysis
    ↓ Response JSON
TopicAnalysisResult
```

**Prochaines étapes :**
- ✅ Phase 3 : RAG Enrichi → **Terminé**
- ✅ Phase 4.1 : Enrichir configuration UI → **Terminé**
- [ ] Phase 4.2 : Vue "Corpus Explorer"
- [ ] Créer handlers IPC pour topic modeling
- [ ] Tester le service complet avec données réelles

**Session 10 - Phase 3 : RAG Enrichi**
- ✅ Modification du fichier `chat-service.ts` (192 lignes)
- ✅ Création interface `EnrichedRAGOptions` :
  - `context?: boolean` : Activer le RAG
  - `useGraphContext?: boolean` : Utiliser le graphe de connaissances
  - `includeSummaries?: boolean` : Utiliser résumés au lieu de chunks
  - `topK?: number` : Nombre de résultats de recherche
  - `additionalGraphDocs?: number` : Nombre de documents liés à inclure
  - `window?: BrowserWindow` : Fenêtre pour streaming
- ✅ Méthode `convertChunksToSummaries()` (47 lignes) :
  - Convertit les résultats de recherche en utilisant résumés
  - Évite les doublons (un résumé par document)
  - Préserve les métadonnées de similarité
- ✅ Méthode `getRelatedDocumentsFromGraph()` (30 lignes) :
  - Récupère documents cités par les documents trouvés
  - Récupère documents qui citent les documents trouvés
  - Récupère documents similaires selon seuil de similarité
  - Retourne Set de document IDs (sans doublons)
- ✅ Intégration dans `sendMessage()` :
  - Si `useGraphContext` activé, récupère documents liés via graphe
  - Si `includeSummaries` activé, remplace chunks par résumés
  - Ajoute résumés des documents liés au contexte
  - Logs détaillés pour débogage
- ✅ Build vérifié et fonctionnel

**Session 11 - Phase 4.1 : Enrichir configuration UI**
- ✅ Modification de `ConfigPanel.tsx` :
  - Extension interface `RAGConfig` avec 8 nouveaux champs
  - Mise à jour des valeurs par défaut dans `useState`
  - Mise à jour du handler `handleResetConfig`
- ✅ Modification de `RAGConfigSection.tsx` (366 lignes) :
  - Ajout de 8 handlers pour les nouveaux champs
  - Ajout select "Génération de résumés" (3 options)
  - Ajout slider "Longueur maximale des résumés" (100-1000 mots)
  - Ajout checkbox "Utiliser le graphe de connaissances"
  - Ajout slider "Documents liés à inclure" (1-10)
  - Ajout slider "Seuil de similarité pour le graphe" (0.5-1.0)
  - Ajout checkbox "Utiliser résumés dans le RAG"
  - Ajout checkbox "Modélisation de topics"
- ✅ Fonctionnalités avancées :
  - Affichage conditionnel du slider de longueur (si génération activée)
  - Affichage conditionnel des options graphe (si graphe activé)
  - Descriptions et aide pour chaque option
  - Build vérifié et fonctionnel

**Prochaines étapes :**
- ✅ Phase 4.2 : Vue "Corpus Explorer" → **Terminé**
- [ ] Créer handlers IPC pour topic modeling
- [ ] Ajouter liste des topics dans Corpus Explorer
- [ ] Ajouter filtres dans Corpus Explorer
- [ ] Tester le système enrichi avec données réelles

**Session 12 - Phase 4.2 : Vue "Corpus Explorer"**
- ✅ Installation dépendances : react-force-graph, recharts (141 packages)
- ✅ Ajout handlers IPC dans `handlers.ts` (45 lignes) :
  - `corpus:get-graph` : Construction et export du graphe
  - `corpus:get-statistics` : Statistiques du corpus
- ✅ Extension de `pdf-service.ts` (70 lignes) :
  - Import de `KnowledgeGraphBuilder`
  - Méthode `getVectorStore()` : Retourne le VectorStore
  - Méthode `buildKnowledgeGraph()` : Construit le graphe avec options
  - Méthode `getCorpusStatistics()` : Calcule stats complètes (docs, citations, langues, années, auteurs)
- ✅ Extension de `preload.ts` :
  - Ajout section `corpus` dans l'API IPC
  - Types pour `getGraph()` et `getStatistics()`
- ✅ Création de `CorpusExplorerPanel.tsx` (370+ lignes) :
  - Interfaces TypeScript : `GraphNode`, `GraphEdge`, `GraphData`, `CorpusStatistics`
  - Hook `useEffect` pour chargement automatique des données
  - Section statistiques : 4 cartes colorées (documents, citations, auteurs, langues)
  - Info supplémentaires : période, langues
  - Visualisation graphe avec ForceGraph2D :
    - Nœuds colorés par communauté (5 couleurs)
    - Taille basée sur centralité (4-12px)
    - Liens colorés par type (rouge=citation, vert=similarité, violet=co-citation)
    - Flèches directionnelles pour citations
    - Zoom, pan, drag interactifs
  - Panel détails nœud : titre, auteur, année, centralité, communauté
  - Légende du graphe (3 types de liens)
  - Info graphe : nombre de nœuds et liens
  - États : loading spinner, error, empty state
- ✅ Création de `CorpusExplorerPanel.css` (300+ lignes) :
  - Styles pour statistiques (cartes avec gradients)
  - Styles pour graphe (container, légende, visualisation)
  - Styles pour panel détails nœud
  - Responsive design
  - Support dark mode
- ✅ Build vérifié et fonctionnel

**Prochaines étapes :**
- [ ] Tester le Corpus Explorer avec des données réelles
- [ ] Créer handlers IPC pour topic modeling
- [ ] Ajouter liste des topics dans Corpus Explorer
- [ ] Ajouter filtres dans Corpus Explorer

---

## Notes de Développement

*Cette section sera utilisée pour noter des décisions techniques, problèmes rencontrés, solutions trouvées, etc.*

### Décisions techniques

**Migration de base de données (2025-12-23)**
- Choix d'utiliser `ALTER TABLE` avec vérification via `PRAGMA table_info()` pour éviter les erreurs sur bases existantes
- Les nouvelles colonnes sont ajoutées avec `DEFAULT NULL` pour compatibilité
- Utilisation de `FOREIGN KEY ... ON DELETE CASCADE` pour les citations (suppression automatique)
- Utilisation de `ON DELETE SET NULL` pour `target_doc_id` (si document cible supprimé, la citation reste mais sans lien)

**Stockage des similarités (2025-12-23)**
- Choix de toujours stocker `(doc_id_1, doc_id_2)` avec `doc_id_1 < doc_id_2` pour éviter les doublons `(A,B)` vs `(B,A)`
- La requête `getSimilarDocuments()` utilise un `CASE` pour récupérer l'autre document quelle que soit la position

**CitationExtractor - Pas de dépendances externes (2025-12-23)**
- Choix de ne pas utiliser `citation-js` pour éviter une dépendance lourde
- Regex custom suffisants pour les formats académiques standards
- Détection de langue avec heuristique simple (mots communs FR/EN) au lieu de `franc` (économie de 2.5MB)
- Support complet Unicode pour les accents français (regex avec `ÀÂÄÆÇÉÈÊËÏÎÔŒÙÛÜ`)

**CitationExtractor - Algorithme de matching (2025-12-23)**
- Normalisation des noms : conversion en minuscules + suppression accents (NFD) + caractères spéciaux
- Matching flexible : auteur peut être un sous-ensemble (ex: "Papert" match "Seymour Papert")
- Gestion des suffixes d'année (2020a, 2020b) pour publications multiples la même année
- Priorité au matching exact sur l'année + nom de famille (premier mot)

**Architecture Projet - Mode projet forcé (2025-12-23)**
- **Pourquoi forcer le mode projet ?**
  1. **Cohérence conceptuelle** : Un graphe de citations n'a de sens que dans un corpus défini
  2. **Workflow des historiens** : Travail par projet de recherche (article, livre, thèse)
  3. **Portabilité** : Tout dans `projet/.mdfocus/` → facile à sauvegarder/partager
  4. **Performance** : Bases plus petites (50-100 docs vs 1000+)
  5. **Isolation** : Pas de mélange entre projets différents

- **Implémentation** :
  - VectorStore : `projectPath` obligatoire, erreur si non fourni
  - PDFService : appelle `init(projectPath)` avant chaque opération
  - Handlers IPC : reçoivent `projectPath` comme premier paramètre
  - Changement de projet : fermeture automatique de la base précédente

- **Exception** : Les projets de type `notes` n'utilisent PAS le système enrichi

**DocumentSummarizer - Résumé sans dépendances (2025-12-24)**
- **Pourquoi pas de dépendances externes ?**
  1. **Cohérence** : Même approche que CitationExtractor (autonomie maximale)
  2. **Taille** : Éviter `compromise` (~3MB) ou autres libs NLP lourdes
  3. **Performance** : Algorithmes simples suffisants pour le cas d'usage
  4. **Maintenance** : Moins de dépendances = moins de problèmes

- **Algorithme extractif - Scoring multi-critères** :
  1. **TF (Term Frequency)** : Moyenne de fréquence des mots de la phrase
  2. **Position** : Bonus +2.0 pour introduction (<10%), +1.5 pour conclusion (>90%)
  3. **Mots-clés académiques** : +0.5 par mot-clé (research, méthodologie, results, etc.)
  4. **Longueur** : Pénalité -1.0 si <10 mots, -0.5 si >50 mots
  5. **Chiffres** : Bonus +0.3 si présence de chiffres (souvent dans résultats)

- **Stratégie extractive** :
  - Stop words (FR/EN) pour ignorer mots fonctionnels dans TF
  - Normalisation Unicode (NFD) pour supprimer accents dans scoring
  - Tri par score décroissant, puis sélection jusqu'à `maxLength`
  - Retri par position originale pour préserver cohérence narrative

- **Stratégie abstractive** :
  - Prompt structuré pour articles académiques (4 sections)
  - Troncature à 4000 chars (~3000 tokens) pour éviter dépassement contexte
  - Fallback automatique sur extractif si erreur LLM
  - Modèle par défaut : gemma2:2b (rapide, bon pour français)

### Problèmes rencontrés

**Erreur de compilation après migration vers mode projet (2025-12-24)**
- **Symptôme** : Erreur TypeScript à la compilation
  ```
  src/main/index.ts:57:20 - error TS2554: Expected 1 arguments, but got 0.
  57   await pdfService.init();
  ```
- **Cause** : Après avoir rendu `projectPath` obligatoire dans `pdfService.init()`, l'initialisation au démarrage de l'app (dans `app.whenReady()`) tentait toujours d'appeler `init()` sans argument.
- **Impact** : Build échouait, application ne pouvait pas compiler.

### Solutions trouvées

**Suppression de l'initialisation au démarrage (2025-12-24)**
- **Solution** : Supprimer complètement l'initialisation de `pdfService` au démarrage de l'app
- **Rationale** : Avec l'architecture projet-scoped, `pdfService` ne doit être initialisé que lorsqu'un projet est chargé, pas au démarrage global de l'app
- **Implémentation** :
  - Suppression des lignes 55-58 dans `src/main/index.ts`
  - Ajout d'un commentaire explicatif : "pdfService is now project-scoped and initialized on-demand via IPC handlers when a project is loaded"
- **Validation** : Build réussit, aucune régression fonctionnelle (le service est correctement initialisé via les handlers IPC)


---

**Dernière mise à jour :** 2025-12-24
