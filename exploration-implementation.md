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

### 🔲 3. Génération de Résumés

**Nouveau fichier :** `backend/core/analysis/DocumentSummarizer.ts`

**Stratégies :**

#### Option A : Résumé extractif (par défaut)
- [ ] Implémenter TextRank ou algorithme similaire
- [ ] Utiliser [compromise](https://github.com/spencermountain/compromise) pour NLP léger
- [ ] Extraire 3-5 phrases clés (~150-300 mots)

#### Option B : Résumé abstractif (optionnel)
- [ ] Intégration avec Ollama (modèle Phi-3-mini)
- [ ] Prompt structuré : "Résume en identifiant : question de recherche, méthodologie, résultats"
- [ ] Longueur configurable (150-300 mots)

**Interface :**
```typescript
export interface SummarizerConfig {
  enabled: boolean;
  method: 'extractive' | 'abstractive';
  maxLength: number;
  llmModel?: string; // Pour abstractif
}

export class DocumentSummarizer {
  constructor(config: SummarizerConfig, ollamaClient?: OllamaClient);

  async generateSummary(fullText: string, metadata: PDFMetadata): Promise<string>;
  async generateSummaryEmbedding(summary: string): Promise<Float32Array>;
}
```

**Dépendances :**
- [ ] Installer `compromise` pour extractif
- [ ] Réutiliser `OllamaClient` pour abstractif

**Configuration :**
- [ ] Ajouter `SummarizerConfig` dans [backend/types/config.ts](backend/types/config.ts)
- [ ] Ajouter section UI dans `RAGConfigSection.tsx`

**Tests :**
- [ ] Tester résumé extractif (FR + EN)
- [ ] Tester résumé abstractif avec Phi-3-mini
- [ ] Comparer temps d'exécution

**Performance estimée :**
- Extractif : ~0.5-1s/doc
- Abstractif : ~30-60s/doc (Core i5)

**Charge :** ~6-8 heures

---

### 🔲 4. Construction du Graphe de Connaissances

**Nouveau fichier :** `backend/core/analysis/KnowledgeGraphBuilder.ts`

**Fonctionnalités :**
- [ ] Créer graphe avec [graphology](https://graphology.github.io/)
- [ ] Ajouter nœuds :
  - Documents (avec métadonnées)
  - Auteurs (agrégés)

- [ ] Ajouter arêtes :
  - Citations directes (depuis `document_citations`)
  - Similarité sémantique (cosine > seuil entre résumés)
  - Co-citations (calcul dérivé)

- [ ] Calculs sur le graphe :
  - Centralité (PageRank ou degré)
  - Détection de communautés (Louvain)
  - Chemins entre documents

- [ ] Export pour visualisation :
  - Format JSON pour frontend
  - Positions avec force-directed layout

**Interface :**
```typescript
export interface GraphNode {
  id: string;
  type: 'document' | 'author';
  label: string;
  metadata: any;
  centrality?: number;
  community?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'citation' | 'similarity' | 'co-citation';
  weight: number;
}

export class KnowledgeGraphBuilder {
  constructor(vectorStore: VectorStore);

  async buildGraph(options?: {
    includeSimilarityEdges: boolean;
    similarityThreshold: number;
  }): Promise<Graph>;

  calculateCentrality(graph: Graph): Map<string, number>;
  detectCommunities(graph: Graph): Map<string, number>;
  exportForVisualization(graph: Graph): { nodes: GraphNode[], edges: GraphEdge[] };
}
```

**Dépendances :**
- [ ] Installer `graphology`
- [ ] Installer `graphology-layout-forceatlas2`
- [ ] Installer algorithmes : `graphology-communities-louvain`, `graphology-metrics`

**Tests :**
- [ ] Tester construction graphe avec 10 documents
- [ ] Tester calculs de centralité
- [ ] Tester détection de communautés
- [ ] Tester export JSON

**Performance estimée :** ~2-5s pour 100 documents

**Charge :** ~8-10 heures

---

### 🔲 5. Intégration dans PDFIndexer

**Fichier :** [backend/core/pdf/PDFIndexer.ts](backend/core/pdf/PDFIndexer.ts)

**Modifications :**
- [ ] Ajouter étape extraction citations après extraction texte
- [ ] Ajouter étape génération résumé (configurable)
- [ ] Sauvegarder données enrichies dans VectorStore
- [ ] Mettre à jour indicateur de progression

**Workflow d'indexation enrichi :**
```
1. Extraction PDF (existant)
2. Détection langue → CitationExtractor
3. Extraction citations → CitationExtractor.extractCitations()
4. Génération résumé → DocumentSummarizer.generateSummary()
5. Embedding résumé → OllamaClient.generateEmbedding()
6. Chunking + embeddings (existant)
7. Sauvegarde enrichie → VectorStore
```

**Tests :**
- [ ] Indexer un document complet avec toutes les étapes
- [ ] Vérifier données enrichies en base
- [ ] Mesurer temps total d'indexation

**Charge :** ~3-4 heures

---

## Phase 2 - Service Python BERTopic

### 🔲 1. Créer service Python

**Nouveau dossier :** `backend/python-services/topic-modeling/`

**Fichiers :**
- [ ] `requirements.txt` :
  ```
  bertopic==0.16.0
  fastapi==0.109.0
  uvicorn==0.27.0
  numpy==1.26.0
  ```

- [ ] `main.py` : API FastAPI avec endpoints :
  - `POST /analyze` : Recevoir embeddings + métadonnées, retourner topics
  - `GET /health` : Health check

- [ ] `topic_analyzer.py` : Logique BERTopic

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

### 🔲 2. Intégration avec Electron

**Nouveau fichier :** `backend/core/analysis/TopicModelingService.ts`

**Fonctionnalités :**
- [ ] Démarrer/arrêter service Python en subprocess
- [ ] Health check au démarrage
- [ ] Envoyer embeddings via HTTP
- [ ] Parser réponse et stocker topics

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
- [ ] Vérifier Python installé
- [ ] Gérer service non disponible (mode dégradé)
- [ ] Afficher message utilisateur si Python manquant

**Tests :**
- [ ] Tester start/stop service
- [ ] Tester analyse topics
- [ ] Tester gestion d'erreurs

**Charge :** ~4-5 heures

---

## Phase 3 - RAG Enrichi

### 🔲 1. Améliorer ChatService

**Fichier :** [src/main/services/chat-service.ts](src/main/services/chat-service.ts)

**Modifications :**
- [ ] Ajouter option `useGraphContext` dans options
- [ ] Si activé, récupérer documents connectés dans le graphe
- [ ] Inclure résumés dans le contexte
- [ ] Modifier prompt pour mentionner documents liés

**Nouveau retrieval hybride :**
```typescript
interface EnrichedRAGOptions {
  context: boolean;
  useGraphContext: boolean;
  includeSummaries: boolean;
  topK: number;
  additionalGraphDocs: number;
}
```

**Tests :**
- [ ] Tester RAG avec graphe
- [ ] Comparer qualité réponses (avec/sans graphe)

**Charge :** ~3-4 heures

---

## Phase 4 - Interface Frontend (après backend)

### 🔲 1. Vue "Corpus Explorer"

**Nouveau fichier :** `src/renderer/src/components/Corpus/CorpusExplorerPanel.tsx`

**Sections :**
- [ ] Statistiques globales (docs, topics, citations, langues)
- [ ] Graphe interactif ([react-force-graph](https://github.com/vasturiano/react-force-graph))
- [ ] Liste des topics
- [ ] Filtres (topic, année, auteur, langue)

**Charge :** ~10-12 heures

---

### 🔲 2. Enrichir configuration UI

**Fichier :** [src/renderer/src/components/Config/RAGConfigSection.tsx](src/renderer/src/components/Config/RAGConfigSection.tsx)

**Ajouts :**
- [ ] Toggle résumés (extractif/abstractif/désactivé)
- [ ] Toggle topic modeling
- [ ] Toggle graphe de citations
- [ ] Seuil de similarité pour graphe

**Charge :** ~2-3 heures

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

**Prochaines étapes :**
- 🔲 Phase 1.3 : Génération de Résumés (DocumentSummarizer)

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

### Problèmes rencontrés


### Solutions trouvées


---

**Dernière mise à jour :** 2025-12-23
